import { useState, useMemo } from 'react';
import { format, addDays, addWeeks } from 'date-fns';
import { Calendar, Plus, Minus, User } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useSchoolStudentBalances } from '@/hooks/useSchoolStudentBalances';
import { useFormatBalance } from '@/hooks/useStudentFees';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { 
  generateEqualInstallments, 
  createPaymentPlan,
  type InstallmentInput,
  type ParentAgreementMethod,
} from '@/lib/payment-plan-system';
import { usePaymentPlanTemplates, generateInstallmentsFromTemplate, PaymentPlanTemplate } from '@/hooks/usePaymentPlanTemplates';

interface CreatePaymentPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  academicYear?: number;
  term?: number;
}

export function CreatePaymentPlanDialog({
  open,
  onOpenChange,
  schoolId,
  academicYear = new Date().getFullYear(),
  term,
}: CreatePaymentPlanDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { formatAmount } = useFormatBalance();

  // Form state
  const [studentId, setStudentId] = useState<string>('');
  const [studentName, setStudentName] = useState<string>('');
  const [studentBalance, setStudentBalance] = useState<number>(0);
  const [totalAmount, setTotalAmount] = useState<string>('');
  const [installmentCount, setInstallmentCount] = useState<number>(3);
  const [frequency, setFrequency] = useState<'weekly' | 'biweekly' | 'monthly'>('monthly');
  const [startDate, setStartDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [agreementMethod, setAgreementMethod] = useState<ParentAgreementMethod>('in_person');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [studentSearchOpen, setStudentSearchOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('custom');

  // Get students with balances
  const { data: studentBalances } = useSchoolStudentBalances(schoolId, academicYear, term);
  
  // Get payment plan templates
  const { data: templates } = usePaymentPlanTemplates(schoolId);

  // Filter students with outstanding balances
  const studentsWithBalance = useMemo(() => {
    return (studentBalances || []).filter(s => s.currentBalance > 0);
  }, [studentBalances]);

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (templateId === 'custom') return;
    
    const template = templates?.find(t => t.id === templateId);
    if (template) {
      setInstallmentCount(template.installment_count);
      // Map template frequency to form frequency
      if (template.frequency === 'weekly') setFrequency('weekly');
      else if (template.frequency === 'bi-weekly') setFrequency('biweekly');
      else setFrequency('monthly');
    }
  };

  // Calculate installments preview
  const installmentsPreview = useMemo(() => {
    const amount = parseFloat(totalAmount) || studentBalance;
    if (amount <= 0 || installmentCount <= 0) return [];

    // Check if using a template with custom splits
    const template = templates?.find(t => t.id === selectedTemplateId);
    if (template && template.split_percentages && template.split_percentages.length > 0) {
      const templateInstallments = generateInstallmentsFromTemplate(template, amount, new Date(startDate));
      // Convert to InstallmentInput format (dueDate as string)
      return templateInstallments.map(inst => ({
        amount: inst.amount,
        dueDate: format(inst.dueDate, 'yyyy-MM-dd'),
      }));
    }

    const intervalDays = frequency === 'weekly' ? 7 : frequency === 'biweekly' ? 14 : 30;
    return generateEqualInstallments(amount, installmentCount, new Date(startDate), intervalDays);
  }, [totalAmount, studentBalance, installmentCount, frequency, startDate, selectedTemplateId, templates]);

  // Handle student selection
  const handleSelectStudent = (student: typeof studentsWithBalance[0]) => {
    setStudentId(student.studentId);
    setStudentName(student.studentName);
    setStudentBalance(student.currentBalance);
    setTotalAmount(student.currentBalance.toString());
    setStudentSearchOpen(false);
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!studentId || !totalAmount || installmentsPreview.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please select a student and configure the payment plan.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createPaymentPlan({
        schoolId,
        studentId,
        academicYear,
        term: term || 1,
        totalAmount: parseFloat(totalAmount),
        balanceAtCreation: studentBalance,
        startDate,
        installments: installmentsPreview,
        notes,
        parentAgreementMethod: agreementMethod,
        parentAgreementDate: new Date().toISOString(),
      });

      if (result) {
        toast({
          title: 'Payment Plan Created',
          description: `Payment plan for ${studentName} has been created as a draft.`,
        });
        queryClient.invalidateQueries({ queryKey: ['school-payment-plans'] });
        onOpenChange(false);
        resetForm();
      } else {
        throw new Error('Failed to create payment plan');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create payment plan. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setStudentId('');
    setStudentName('');
    setStudentBalance(0);
    setTotalAmount('');
    setInstallmentCount(3);
    setFrequency('monthly');
    setStartDate(format(new Date(), 'yyyy-MM-dd'));
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Payment Plan</DialogTitle>
          <DialogDescription>
            Set up an installment plan for a student with an outstanding balance.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Student Selection */}
          <div className="space-y-2">
            <Label>Student</Label>
            <Popover open={studentSearchOpen} onOpenChange={setStudentSearchOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between"
                >
                  {studentName || 'Select a student...'}
                  <User className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search students..." />
                  <CommandList>
                    <CommandEmpty>No students with outstanding balance.</CommandEmpty>
                    <CommandGroup>
                      {studentsWithBalance.map((student) => (
                        <CommandItem
                          key={student.studentId}
                          value={student.studentName}
                          onSelect={() => handleSelectStudent(student)}
                        >
                          <div className="flex justify-between w-full">
                            <span>{student.studentName}</span>
                            <span className="text-muted-foreground">
                              {formatAmount(student.currentBalance)}
                            </span>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
            {studentBalance > 0 && (
              <p className="text-sm text-muted-foreground">
                Current balance: {formatAmount(studentBalance)}
              </p>
            )}
          </div>

          {/* Template Selection */}
          {templates && templates.length > 0 && (
            <div className="space-y-2">
              <Label>Payment Plan Template</Label>
              <Select value={selectedTemplateId} onValueChange={handleTemplateSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Select template or custom" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom Configuration</SelectItem>
                  {templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                      {template.is_default && ' (Default)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Plan Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Plan Amount (ZMW)</Label>
            <Input
              id="amount"
              type="number"
              min="0"
              step="0.01"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              placeholder="Enter amount"
            />
          </div>

          {/* Installment Configuration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Number of Installments</Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setInstallmentCount(Math.max(1, installmentCount - 1))}
                  disabled={installmentCount <= 1}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center font-medium">{installmentCount}</span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setInstallmentCount(Math.min(12, installmentCount + 1))}
                  disabled={installmentCount >= 12}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as typeof frequency)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <Label htmlFor="startDate">First Installment Date</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          {/* Parent Agreement */}
          <div className="space-y-2">
            <Label>Parent Agreement Method</Label>
            <Select value={agreementMethod} onValueChange={(v) => setAgreementMethod(v as ParentAgreementMethod)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in_person">In Person</SelectItem>
                <SelectItem value="phone">Phone Call</SelectItem>
                <SelectItem value="written">Written Agreement</SelectItem>
                <SelectItem value="sms">SMS Confirmation</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes about this payment plan..."
              rows={2}
            />
          </div>

          {/* Installments Preview */}
          {installmentsPreview.length > 0 && (
            <div className="space-y-2">
              <Label>Installment Schedule</Label>
              <div className="rounded-md border p-3 space-y-2 bg-muted/30">
                {installmentsPreview.map((inst, idx) => (
                  <div key={idx} className="flex justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      Installment {idx + 1}: {format(new Date(inst.dueDate), 'dd MMM yyyy')}
                    </span>
                    <span className="font-medium">{formatAmount(inst.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !studentId}>
            {isSubmitting ? 'Creating...' : 'Create Draft Plan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
