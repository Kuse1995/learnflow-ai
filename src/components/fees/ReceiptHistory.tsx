import { useState } from 'react';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FileText, Download, Printer, Ban, Loader2 } from 'lucide-react';
import {
  useStudentReceipts,
  useVoidReceipt,
  FeeReceipt,
} from '@/hooks/useFeeReceipts';
import { useFormatBalance } from '@/hooks/useStudentFees';
import { downloadReceiptPDF, printReceipt } from '@/lib/receipt-utils';

interface ReceiptHistoryProps {
  studentId: string;
  canVoid?: boolean;
}

/**
 * Receipt History Component
 * 
 * Shows all receipts for a student with download/print/void options.
 */
export function ReceiptHistory({ studentId, canVoid = false }: ReceiptHistoryProps) {
  const { data: receipts, isLoading } = useStudentReceipts(studentId);
  const { formatAmount } = useFormatBalance();

  const [selectedReceipt, setSelectedReceipt] = useState<FeeReceipt | null>(null);
  const [showVoidDialog, setShowVoidDialog] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const voidReceipt = useVoidReceipt();

  const handleVoid = async () => {
    if (!selectedReceipt || !voidReason.trim()) return;

    await voidReceipt.mutateAsync({
      receiptId: selectedReceipt.id,
      voidedBy: 'current-user', // TODO: Get from auth
      voidReason: voidReason.trim(),
    });

    setShowVoidDialog(false);
    setSelectedReceipt(null);
    setVoidReason('');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Receipts
          </CardTitle>
          <CardDescription>
            Payment receipts issued for this student
          </CardDescription>
        </CardHeader>
        <CardContent>
          {receipts && receipts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Receipt No.</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receipts.map((receipt) => (
                  <TableRow key={receipt.id}>
                    <TableCell className="font-mono text-sm">
                      {receipt.receiptNumber}
                    </TableCell>
                    <TableCell>
                      {format(new Date(receipt.issuedAt), 'dd MMM yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatAmount(receipt.amount)}
                    </TableCell>
                    <TableCell>
                      {receipt.voided ? (
                        <Badge variant="destructive">Voided</Badge>
                      ) : (
                        <Badge className="bg-emerald-100 text-emerald-800">Issued</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadReceiptPDF(receipt)}
                          title="Download PDF"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => printReceipt(receipt)}
                          title="Print"
                        >
                          <Printer className="h-4 w-4" />
                        </Button>
                        {canVoid && !receipt.voided && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              setSelectedReceipt(receipt);
                              setShowVoidDialog(true);
                            }}
                            title="Void Receipt"
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>No receipts issued yet.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Void Confirmation Dialog */}
      <AlertDialog open={showVoidDialog} onOpenChange={setShowVoidDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void Receipt</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                You are about to void receipt <strong>{selectedReceipt?.receiptNumber}</strong>.
              </p>
              <p className="text-amber-600 font-medium">
                ⚠️ Voiding a receipt does not remove the payment from the ledger.
                A reversal entry must be recorded separately if the payment needs to be undone.
              </p>
              <div className="pt-2">
                <Label htmlFor="voidReason">Reason for voiding *</Label>
                <Textarea
                  id="voidReason"
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="Enter the reason for voiding this receipt..."
                  className="mt-2"
                  rows={3}
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setVoidReason('');
              setSelectedReceipt(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleVoid}
              disabled={!voidReason.trim() || voidReceipt.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {voidReceipt.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Void Receipt
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
