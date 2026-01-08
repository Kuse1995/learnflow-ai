import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRecordStudentPayment, useFormatBalance } from '@/hooks/useStudentFees';
import { PAYMENT_METHOD_CONFIG } from '@/lib/school-fees-system';

interface RecordPaymentFormProps {
  studentId: string;
  studentName: string;
  schoolId: string;
  academicYear: number;
  term: number | null;
  currentBalance: number;
  onSuccess: () => void;
  onCancel: () => void;
}

type PaymentMethodKey = 'cash' | 'bank_deposit' | 'mobile_money' | 'cheque' | 'other';

export function RecordPaymentForm({
  studentId,
  studentName,
  schoolId,
  academicYear,
  term,
  currentBalance,
  onSuccess,
  onCancel,
}: RecordPaymentFormProps) {
  const { formatAmount } = useFormatBalance();
  const recordPayment = useRecordStudentPayment();

  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodKey>('cash');
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [referenceNumber, setReferenceNumber] = useState('');
  const [payerName, setPayerName] = useState('');
  const [notes, setNotes] = useState('');

  const methodConfig = PAYMENT_METHOD_CONFIG[paymentMethod];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return;
    }

    await recordPayment.mutateAsync({
      schoolId,
      studentId,
      academicYear,
      term,
      amount: parsedAmount,
      paymentMethod,
      paymentDate: format(paymentDate, 'yyyy-MM-dd'),
      referenceNumber: referenceNumber || undefined,
      payerName: payerName || undefined,
      notes: notes || undefined,
      recordedBy: 'current-user', // TODO: Get from auth context
      recordedByRole: 'staff',
    });

    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Current Balance Display */}
      <div className="p-3 bg-muted rounded-lg">
        <p className="text-sm text-muted-foreground">
          Current outstanding balance for {studentName}:
        </p>
        <p className="text-lg font-semibold">
          {formatAmount(currentBalance)}
        </p>
      </div>

      {/* Amount */}
      <div className="space-y-2">
        <Label htmlFor="amount">Amount Received (ZMW) *</Label>
        <Input
          id="amount"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />
      </div>

      {/* Payment Method */}
      <div className="space-y-2">
        <Label htmlFor="paymentMethod">Payment Method *</Label>
        <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethodKey)}>
          <SelectTrigger>
            <SelectValue placeholder="Select method" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(PAYMENT_METHOD_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Payment Date */}
      <div className="space-y-2">
        <Label>Payment Date *</Label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full justify-start text-left font-normal',
                !paymentDate && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {paymentDate ? format(paymentDate, 'PPP') : 'Pick a date'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={paymentDate}
              onSelect={(date) => date && setPaymentDate(date)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Auto-generated Receipt Number Notice */}
      <div className="p-3 bg-muted/50 rounded-lg border border-dashed">
        <p className="text-sm text-muted-foreground">
          📄 A receipt number will be <strong>auto-generated</strong> when this payment is recorded.
        </p>
      </div>

      {/* Reference Number (conditional) */}
      {methodConfig.requiresReference && (
        <div className="space-y-2">
          <Label htmlFor="referenceNumber">{methodConfig.referenceLabel} *</Label>
          <Input
            id="referenceNumber"
            placeholder={`Enter ${methodConfig.referenceLabel.toLowerCase()}`}
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            required
          />
        </div>
      )}

      {/* Payer Name */}
      <div className="space-y-2">
        <Label htmlFor="payerName">Payer Name</Label>
        <Input
          id="payerName"
          placeholder="Name of person making payment"
          value={payerName}
          onChange={(e) => setPayerName(e.target.value)}
        />
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          placeholder="Additional notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={recordPayment.isPending}>
          {recordPayment.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Record Payment
        </Button>
      </div>
    </form>
  );
}
