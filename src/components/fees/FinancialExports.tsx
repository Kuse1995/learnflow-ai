import { useState } from 'react';
import { format } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import {
  usePaymentsExport,
  useOutstandingBalancesExport,
} from '@/hooks/useFeeReceipts';
import {
  generatePaymentsCSV,
  generateOutstandingBalancesCSV,
  downloadCSV,
} from '@/lib/receipt-utils';

interface FinancialExportsProps {
  schoolId: string;
}

type ExportType = 'payments' | 'outstanding';

/**
 * Financial Exports Component
 * 
 * Admin interface for exporting financial data to CSV.
 * - Payments by date range
 * - Outstanding balances
 */
export function FinancialExports({ schoolId }: FinancialExportsProps) {
  const [exportType, setExportType] = useState<ExportType>('payments');
  const [startDate, setStartDate] = useState(
    format(new Date(new Date().getFullYear(), 0, 1), 'yyyy-MM-dd')
  );
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isExporting, setIsExporting] = useState(false);

  const { data: payments, isLoading: isLoadingPayments, refetch: refetchPayments } = usePaymentsExport(
    exportType === 'payments' ? schoolId : undefined,
    startDate,
    endDate
  );

  const { data: balances, isLoading: isLoadingBalances, refetch: refetchBalances } = useOutstandingBalancesExport(
    exportType === 'outstanding' ? schoolId : undefined
  );

  const handleExport = async () => {
    setIsExporting(true);

    try {
      if (exportType === 'payments') {
        await refetchPayments();
        if (payments && payments.length > 0) {
          const csv = generatePaymentsCSV(payments);
          const filename = `payments-${startDate}-to-${endDate}.csv`;
          downloadCSV(csv, filename);
        }
      } else {
        await refetchBalances();
        if (balances && balances.length > 0) {
          const csv = generateOutstandingBalancesCSV(balances);
          const filename = `outstanding-balances-${format(new Date(), 'yyyy-MM-dd')}.csv`;
          downloadCSV(csv, filename);
        }
      }
    } finally {
      setIsExporting(false);
    }
  };

  const isLoading = exportType === 'payments' ? isLoadingPayments : isLoadingBalances;
  const recordCount = exportType === 'payments' 
    ? (payments?.length || 0)
    : (balances?.length || 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Financial Exports
        </CardTitle>
        <CardDescription>
          Export financial data for accounting and auditing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Export Type Selection */}
        <div className="space-y-2">
          <Label>Export Type</Label>
          <Select value={exportType} onValueChange={(v) => setExportType(v as ExportType)}>
            <SelectTrigger className="w-[250px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="payments">Payments (by date range)</SelectItem>
              <SelectItem value="outstanding">Outstanding Balances</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Date Range (for payments only) */}
        {exportType === 'payments' && (
          <div className="flex gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-[160px]"
              />
            </div>
          </div>
        )}

        {/* Export Preview */}
        <div className="bg-muted/50 rounded-lg p-4">
          <p className="text-sm text-muted-foreground mb-2">Export Preview</p>
          {isLoading ? (
            <Skeleton className="h-6 w-32" />
          ) : (
            <p className="font-medium">
              {recordCount} records ready for export
            </p>
          )}
          {exportType === 'payments' && (
            <p className="text-xs text-muted-foreground mt-1">
              Includes: Date, Student Name, Amount, Description, Reference
            </p>
          )}
          {exportType === 'outstanding' && (
            <p className="text-xs text-muted-foreground mt-1">
              Includes: Student Name, Class, Grade, Total Charges, Total Payments, Outstanding Balance
            </p>
          )}
        </div>

        {/* Export Button */}
        <Button
          onClick={handleExport}
          disabled={isExporting || isLoading || recordCount === 0}
          className="w-full sm:w-auto"
        >
          {isExporting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Export to CSV
        </Button>

        {recordCount === 0 && !isLoading && (
          <p className="text-sm text-muted-foreground">
            No records found for the selected criteria.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
