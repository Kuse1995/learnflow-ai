import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Gift, Percent, FileText, Loader2, AlertCircle } from 'lucide-react';
import {
  useCreateAdjustment,
  ADJUSTMENT_TYPE_CONFIG,
  CreateAdjustmentInput,
} from '@/hooks/useFeeAdjustments';
import { Database } from '@/integrations/supabase/types';

type AdjustmentType = Database['public']['Enums']['fee_adjustment_type'];

interface AddAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
  schoolId: string;
  classId?: string;
  currentBalance: number;
  academicYear?: number;
  term?: number;
  currency?: string;
}

const TypeIcon = ({ type }: { type: AdjustmentType }) => {
  switch (type) {
    case 'waiver': return <Gift className="h-4 w-4" />;
    case 'discount': return <Percent className="h-4 w-4" />;
    case 'arrangement_note': return <FileText className="h-4 w-4" />;
  }
};

export function AddAdjustmentDialog({
  open,
  onOpenChange,
  studentId,
  studentName,
  schoolId,
  classId,
  currentBalance,
  academicYear = new Date().getFullYear(),
  term,
  currency = 'ZMW',
}: AddAdjustmentDialogProps) {
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>('discount');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [parentVisibleReason, setParentVisibleReason] = useState('');
  const [approverName, setApproverName] = useState('');
  const [selectedTerm, setSelectedTerm] = useState<string>(term?.toString() || '');

  const createAdjustment = useCreateAdjustment();

  const config = ADJUSTMENT_TYPE_CONFIG[adjustmentType];
  const requiresAmount = config.requiresAmount;
  const amountValue = parseFloat(amount) || 0;

  const canSubmit = 
    reason.trim() &&
    approverName.trim() &&
    (!requiresAmount || amountValue > 0);

  const handleSubmit = async () => {
    if (!canSubmit) return;

    try {
      await createAdjustment.mutateAsync({
        school_id: schoolId,
        student_id: studentId,
        class_id: classId,
        adjustment_type: adjustmentType,
        amount: requiresAmount ? amountValue : undefined,
        reason: reason.trim(),
        approved_by_name: approverName.trim(),
        academic_year: academicYear,
        applies_to_term: selectedTerm ? parseInt(selectedTerm) : undefined,
        parent_visible_reason: parentVisibleReason.trim() || undefined,
      });

      toast.success('Adjustment recorded', {
        description: `${config.label} applied successfully`,
      });

      onOpenChange(false);
      // Reset form
      setAmount('');
      setReason('');
      setParentVisibleReason('');
    } catch (error) {
      toast.error('Failed to record adjustment');
      console.error(error);
    }
  };

  const formatCurrency = (value: number) => 
    `${currency} ${value.toLocaleString('en-ZM', { minimumFractionDigits: 2 })}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Fee Adjustment</DialogTitle>
          <DialogDescription>
            Record an approved adjustment for {studentName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Current Balance Info */}
          <Card className="bg-muted/50">
            <CardContent className="py-3">
              <div className="flex items-center justify-between text-sm">
                <span>Current Balance</span>
                <span className="font-semibold">{formatCurrency(currentBalance)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Adjustment Type */}
          <div>
            <Label className="text-sm font-medium">Adjustment Type</Label>
            <RadioGroup
              value={adjustmentType}
              onValueChange={(v) => setAdjustmentType(v as AdjustmentType)}
              className="mt-2 space-y-2"
            >
              {(Object.keys(ADJUSTMENT_TYPE_CONFIG) as AdjustmentType[]).map((type) => {
                const typeConfig = ADJUSTMENT_TYPE_CONFIG[type];
                return (
                  <div
                    key={type}
                    className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      adjustmentType === type
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setAdjustmentType(type)}
                  >
                    <RadioGroupItem value={type} id={type} className="mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <TypeIcon type={type} />
                        <Label htmlFor={type} className="font-medium cursor-pointer">
                          {typeConfig.label}
                        </Label>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {typeConfig.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </RadioGroup>
          </div>

          {/* Amount (if required) */}
          {requiresAmount && (
            <div>
              <Label htmlFor="amount">Amount ({currency})</Label>
              <Input
                id="amount"
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="mt-1.5"
              />
              {amountValue > currentBalance && (
                <div className="flex items-center gap-1 text-amber-600 text-xs mt-1">
                  <AlertCircle className="h-3 w-3" />
                  Amount exceeds current balance
                </div>
              )}
              {amountValue > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  New balance after adjustment: {formatCurrency(Math.max(0, currentBalance - amountValue))}
                </p>
              )}
            </div>
          )}

          {/* Term Selection */}
          <div>
            <Label htmlFor="term">Applies to Term</Label>
            <Select value={selectedTerm} onValueChange={setSelectedTerm}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Select term (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Terms / General</SelectItem>
                <SelectItem value="1">Term 1</SelectItem>
                <SelectItem value="2">Term 2</SelectItem>
                <SelectItem value="3">Term 3</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reason (Internal) */}
          <div>
            <Label htmlFor="reason">Reason (Internal Record)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe why this adjustment was approved..."
              className="mt-1.5 min-h-[80px]"
            />
          </div>

          {/* Parent Visible Reason (Optional) */}
          <div>
            <Label htmlFor="parent-reason">Parent-Visible Note (Optional)</Label>
            <Input
              id="parent-reason"
              value={parentVisibleReason}
              onChange={(e) => setParentVisibleReason(e.target.value)}
              placeholder="e.g., Fee consideration applied"
              className="mt-1.5"
            />
            <p className="text-xs text-muted-foreground mt-1">
              If left blank, a default neutral message will be shown to parents.
            </p>
          </div>

          {/* Approver Name */}
          <div>
            <Label htmlFor="approver">Approved By</Label>
            <Input
              id="approver"
              value={approverName}
              onChange={(e) => setApproverName(e.target.value)}
              placeholder="Name of person who approved this"
              className="mt-1.5"
            />
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || createAdjustment.isPending}
          >
            {createAdjustment.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Recording...
              </>
            ) : (
              'Record Adjustment'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
