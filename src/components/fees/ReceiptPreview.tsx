import { FeeReceipt } from '@/hooks/useFeeReceipts';
import { useFormatBalance } from '@/hooks/useStudentFees';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, Printer, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { downloadReceiptPDF, printReceipt } from '@/lib/receipt-utils';

interface ReceiptPreviewProps {
  receipt: FeeReceipt;
  onMarkIssued?: () => void;
  showMarkIssued?: boolean;
}

/**
 * Receipt Preview Component
 * 
 * Shows a formatted receipt preview with download/print actions.
 */
export function ReceiptPreview({
  receipt,
  onMarkIssued,
  showMarkIssued = false,
}: ReceiptPreviewProps) {
  const { formatAmount } = useFormatBalance();

  return (
    <Card className="max-w-md mx-auto border-2">
      <CardContent className="p-6">
        {/* Header */}
        <div className="text-center border-b pb-4 mb-4">
          <h2 className="font-bold text-lg">{receipt.schoolNameSnapshot}</h2>
          <p className="text-sm text-muted-foreground">OFFICIAL RECEIPT</p>
          {receipt.voided && (
            <Badge variant="destructive" className="mt-2">VOIDED</Badge>
          )}
        </div>

        {/* Receipt Info */}
        <div className="flex justify-between text-sm mb-4">
          <div>
            <span className="text-muted-foreground">Receipt No:</span>
            <span className="font-mono ml-2">{receipt.receiptNumber}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Date:</span>
            <span className="ml-2">{format(new Date(receipt.issuedAt), 'dd/MM/yyyy')}</span>
          </div>
        </div>

        {/* Student Info */}
        <div className="bg-muted/50 rounded-lg p-3 mb-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Student:</span>
              <p className="font-medium">{receipt.studentNameSnapshot}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Class:</span>
              <p className="font-medium">{receipt.classNameSnapshot || 'N/A'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Year:</span>
              <p className="font-medium">{receipt.academicYear}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Term:</span>
              <p className="font-medium">
                {receipt.term ? `Term ${receipt.term}` : 'Annual'}
              </p>
            </div>
          </div>
        </div>

        {/* Payment Details */}
        <div className="border-t border-b py-4 mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-muted-foreground">Amount Paid:</span>
            <span className="text-xl font-bold">{formatAmount(receipt.amount)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Method:</span>
            <span>{receipt.paymentMethod}</span>
          </div>
          {receipt.referenceNumber && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Reference:</span>
              <span className="font-mono">{receipt.referenceNumber}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Payment Date:</span>
            <span>{format(new Date(receipt.paymentDate), 'dd/MM/yyyy')}</span>
          </div>
        </div>

        {/* Void Info */}
        {receipt.voided && receipt.voidReason && (
          <div className="bg-destructive/10 text-destructive rounded-lg p-3 mb-4">
            <p className="font-medium text-sm">Receipt Voided</p>
            <p className="text-xs mt-1">{receipt.voidReason}</p>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          Thank you for your payment.
        </p>

        {/* Actions */}
        <div className="flex gap-2 mt-4 pt-4 border-t">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => downloadReceiptPDF(receipt)}
          >
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => printReceipt(receipt)}
          >
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          {showMarkIssued && onMarkIssued && (
            <Button
              size="sm"
              className="flex-1"
              onClick={onMarkIssued}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Done
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
