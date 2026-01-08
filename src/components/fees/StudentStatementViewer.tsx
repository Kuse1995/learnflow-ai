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
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FileText, Download } from 'lucide-react';
import { useStudentStatement } from '@/hooks/useFeeReceipts';
import { useFormatBalance } from '@/hooks/useStudentFees';
import { downloadStatementPDF } from '@/lib/receipt-utils';

interface StudentStatementViewerProps {
  studentId: string;
  studentName: string;
  schoolName: string;
}

/**
 * Student Statement Viewer
 * 
 * Displays a fee statement for a student with filtering options.
 * Neutral language, no overdue labels.
 */
export function StudentStatementViewer({
  studentId,
  studentName,
  schoolName,
}: StudentStatementViewerProps) {
  const currentYear = new Date().getFullYear();
  const [academicYear, setAcademicYear] = useState(currentYear);
  const [term, setTerm] = useState<number | undefined>(undefined);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { data: statement, isLoading } = useStudentStatement(
    studentId,
    academicYear,
    term,
    startDate || undefined,
    endDate || undefined
  );
  const { formatAmount } = useFormatBalance();

  const years = [currentYear, currentYear - 1, currentYear - 2];

  const handleDownload = () => {
    if (statement) {
      downloadStatementPDF(statement, schoolName);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Fee Statement
            </CardTitle>
            <CardDescription>
              Account summary for {studentName}
            </CardDescription>
          </div>
          {statement && (
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Year</Label>
            <Select
              value={academicYear.toString()}
              onValueChange={(v) => setAcademicYear(parseInt(v))}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Term</Label>
            <Select
              value={term?.toString() || 'all'}
              onValueChange={(v) => setTerm(v === 'all' ? undefined : parseInt(v))}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Terms</SelectItem>
                <SelectItem value="1">Term 1</SelectItem>
                <SelectItem value="2">Term 2</SelectItem>
                <SelectItem value="3">Term 3</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">From</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-[140px]"
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">To</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-[140px]"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
            <Skeleton className="h-40" />
          </div>
        ) : statement ? (
          <>
            {/* Summary Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Opening Balance</p>
                <p className="text-lg font-semibold">{formatAmount(statement.openingBalance)}</p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Total Charges</p>
                <p className="text-lg font-semibold text-red-600">
                  {formatAmount(statement.totalCharges)}
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Total Payments</p>
                <p className="text-lg font-semibold text-emerald-600">
                  {formatAmount(statement.totalPayments)}
                </p>
              </div>
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Closing Balance</p>
                <p className="text-lg font-semibold">{formatAmount(statement.closingBalance)}</p>
              </div>
            </div>

            {/* Transaction Table */}
            {statement.entries.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Debit</TableHead>
                    <TableHead className="text-right">Credit</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statement.entries.map((entry, index) => (
                    <TableRow key={index}>
                      <TableCell className="text-sm">
                        {format(new Date(entry.date), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell>{entry.description}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {entry.reference || '-'}
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        {entry.debit > 0 ? formatAmount(entry.debit) : '-'}
                      </TableCell>
                      <TableCell className="text-right text-emerald-600">
                        {entry.credit > 0 ? formatAmount(entry.credit) : '-'}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatAmount(entry.balance)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <p>No transactions found for the selected period.</p>
              </div>
            )}
          </>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            <p>Unable to load statement.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
