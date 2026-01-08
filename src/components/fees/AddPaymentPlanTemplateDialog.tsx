import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useCreatePaymentPlanTemplate, useUpdatePaymentPlanTemplate, PaymentPlanTemplate } from '@/hooks/usePaymentPlanTemplates';
import { Card, CardContent } from '@/components/ui/card';
import { useFormatBalance } from '@/hooks/useStudentFees';

interface AddPaymentPlanTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  editingTemplate?: PaymentPlanTemplate;
}

type Frequency = 'weekly' | 'bi-weekly' | 'monthly' | 'custom';

export function AddPaymentPlanTemplateDialog({
  open,
  onOpenChange,
  schoolId,
  editingTemplate,
}: AddPaymentPlanTemplateDialogProps) {
  const { formatAmount } = useFormatBalance();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [installmentCount, setInstallmentCount] = useState(3);
  const [frequency, setFrequency] = useState<Frequency>('monthly');
  const [frequencyDays, setFrequencyDays] = useState(30);
  const [useCustomSplit, setUseCustomSplit] = useState(false);
  const [splitPercentages, setSplitPercentages] = useState<number[]>([]);
  const [isDefault, setIsDefault] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createTemplate = useCreatePaymentPlanTemplate();
  const updateTemplate = useUpdatePaymentPlanTemplate();

  // Reset form when dialog opens/closes or editing changes
  useEffect(() => {
    if (open) {
      if (editingTemplate) {
        setName(editingTemplate.name);
        setDescription(editingTemplate.description || '');
        setInstallmentCount(editingTemplate.installment_count);
        setFrequency(editingTemplate.frequency);
        setFrequencyDays(editingTemplate.frequency_days || 30);
        setIsDefault(editingTemplate.is_default);
        if (editingTemplate.split_percentages && editingTemplate.split_percentages.length > 0) {
          setUseCustomSplit(true);
          setSplitPercentages(editingTemplate.split_percentages);
        } else {
          setUseCustomSplit(false);
          setSplitPercentages([]);
        }
      } else {
        resetForm();
      }
    }
  }, [open, editingTemplate]);

  // Update split percentages when installment count changes
  useEffect(() => {
    if (useCustomSplit) {
      const equalPct = Math.floor(100 / installmentCount);
      const remainder = 100 - (equalPct * installmentCount);
      const newSplits = Array(installmentCount).fill(equalPct);
      newSplits[newSplits.length - 1] += remainder;
      setSplitPercentages(newSplits);
    }
  }, [installmentCount, useCustomSplit]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setInstallmentCount(3);
    setFrequency('monthly');
    setFrequencyDays(30);
    setUseCustomSplit(false);
    setSplitPercentages([]);
    setIsDefault(false);
  };

  const handleSplitChange = (index: number, value: number) => {
    const newSplits = [...splitPercentages];
    newSplits[index] = value;
    setSplitPercentages(newSplits);
  };

  const totalPercentage = splitPercentages.reduce((sum, pct) => sum + pct, 0);
  const isValidSplit = !useCustomSplit || totalPercentage === 100;

  const handleSubmit = async () => {
    if (!name.trim() || !isValidSplit) return;

    setIsSubmitting(true);
    try {
      if (editingTemplate) {
        await updateTemplate.mutateAsync({
          id: editingTemplate.id,
          schoolId,
          name: name.trim(),
          description: description.trim() || null,
          installment_count: installmentCount,
          frequency,
          frequency_days: frequency === 'custom' ? frequencyDays : null,
          split_percentages: useCustomSplit ? splitPercentages : null,
          is_default: isDefault,
        });
      } else {
        await createTemplate.mutateAsync({
          school_id: schoolId,
          name: name.trim(),
          description: description.trim() || undefined,
          installment_count: installmentCount,
          frequency,
          frequency_days: frequency === 'custom' ? frequencyDays : undefined,
          split_percentages: useCustomSplit ? splitPercentages : undefined,
          is_default: isDefault,
        });
      }
      onOpenChange(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Preview calculation for K5,000 example
  const previewAmount = 5000;
  const previewInstallments = useCustomSplit
    ? splitPercentages.map((pct) => (previewAmount * pct) / 100)
    : Array(installmentCount).fill(previewAmount / installmentCount);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingTemplate ? 'Edit Template' : 'Add Payment Plan Template'}
          </DialogTitle>
          <DialogDescription>
            Create a standard payment arrangement that can be applied to students.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Template Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., 3 Monthly Installments"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this payment arrangement"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="installments">Installments</Label>
              <Select
                value={installmentCount.toString()}
                onValueChange={(v) => setInstallmentCount(parseInt(v))}
              >
                <SelectTrigger id="installments">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                    <SelectItem key={n} value={n.toString()}>
                      {n} {n === 1 ? 'payment' : 'payments'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="frequency">Frequency</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as Frequency)}>
                <SelectTrigger id="frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {frequency === 'custom' && (
            <div className="space-y-2">
              <Label htmlFor="frequencyDays">Days Between Payments</Label>
              <Input
                id="frequencyDays"
                type="number"
                min={1}
                max={365}
                value={frequencyDays}
                onChange={(e) => setFrequencyDays(parseInt(e.target.value) || 30)}
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="customSplit">Custom Split</Label>
              <p className="text-xs text-muted-foreground">
                Define custom percentages for each installment
              </p>
            </div>
            <Switch
              id="customSplit"
              checked={useCustomSplit}
              onCheckedChange={setUseCustomSplit}
            />
          </div>

          {useCustomSplit && (
            <div className="space-y-2">
              <Label>Percentage Split</Label>
              <div className="grid grid-cols-4 gap-2">
                {splitPercentages.map((pct, index) => (
                  <div key={index} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">#{index + 1}</Label>
                    <div className="flex items-center">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={pct}
                        onChange={(e) => handleSplitChange(index, parseInt(e.target.value) || 0)}
                        className="text-center"
                      />
                      <span className="ml-1 text-sm text-muted-foreground">%</span>
                    </div>
                  </div>
                ))}
              </div>
              {!isValidSplit && (
                <p className="text-xs text-destructive">
                  Percentages must add up to 100% (currently {totalPercentage}%)
                </p>
              )}
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="isDefault">Set as Default</Label>
              <p className="text-xs text-muted-foreground">
                Pre-select this template when creating plans
              </p>
            </div>
            <Switch
              id="isDefault"
              checked={isDefault}
              onCheckedChange={setIsDefault}
            />
          </div>

          {/* Preview */}
          <Card className="bg-muted/50">
            <CardContent className="pt-4">
              <p className="text-sm font-medium mb-2">Preview (for K5,000 balance)</p>
              <div className="space-y-1">
                {previewInstallments.map((amount, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Payment {index + 1}</span>
                    <span>{formatAmount(amount)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || !isValidSplit || isSubmitting}
          >
            {isSubmitting ? 'Saving...' : editingTemplate ? 'Update' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
