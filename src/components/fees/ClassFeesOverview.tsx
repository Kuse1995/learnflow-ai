import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users, TrendingUp, AlertCircle } from 'lucide-react';
import {
  useClassFeesSummary,
  useClassStudentBalances,
  useFormatBalance,
} from '@/hooks/useStudentFees';

interface ClassFeesOverviewProps {
  classId: string;
  onStudentClick?: (studentId: string) => void;
}

/**
 * Class Fees Overview Component
 * 
 * Shows aggregated fee status for a class and lists individual student balances.
 * Uses neutral, professional language - no shaming.
 */
export function ClassFeesOverview({ classId, onStudentClick }: ClassFeesOverviewProps) {
  const currentYear = new Date().getFullYear();
  const [academicYear, setAcademicYear] = useState(currentYear);
  const [term, setTerm] = useState<number | undefined>(undefined);

  const { data: summary, isLoading: isLoadingSummary } = useClassFeesSummary(
    classId,
    academicYear,
    term
  );
  const { data: studentBalances, isLoading: isLoadingStudents } = useClassStudentBalances(
    classId,
    academicYear,
    term
  );
  const { formatAmount, getStatusLabel, getStatusColor } = useFormatBalance();

  const years = [currentYear, currentYear - 1, currentYear - 2];

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex gap-4">
        <div>
          <Select
            value={academicYear.toString()}
            onValueChange={(v) => setAcademicYear(parseInt(v))}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Year" />
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
          <Select
            value={term?.toString() || 'all'}
            onValueChange={(v) => setTerm(v === 'all' ? undefined : parseInt(v))}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Term" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Terms</SelectItem>
              <SelectItem value="1">Term 1</SelectItem>
              <SelectItem value="2">Term 2</SelectItem>
              <SelectItem value="3">Term 3</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      {isLoadingSummary ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-28" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Users className="h-4 w-4" />
                <span className="text-sm">Students</span>
              </div>
              <p className="text-2xl font-bold">{summary.studentCount}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground mb-1">Expected Total</p>
              <p className="text-2xl font-bold">{formatAmount(summary.expectedTotal)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-emerald-600 mb-1">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm">Collected</span>
              </div>
              <p className="text-2xl font-bold text-emerald-600">
                {formatAmount(summary.collectedTotal)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2 text-amber-600 mb-1">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">Outstanding</span>
              </div>
              <p className="text-2xl font-bold text-amber-600">
                {formatAmount(summary.outstandingTotal)}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Status Breakdown */}
      {summary && summary.studentCount > 0 && (
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Badge className="bg-emerald-100 text-emerald-800">
              {summary.paidCount} Paid
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-amber-100 text-amber-800">
              {summary.partialCount} Partial
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="bg-red-100 text-red-800">
              {summary.unpaidCount} Outstanding
            </Badge>
          </div>
        </div>
      )}

      {/* Student List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Student Balances</CardTitle>
          <CardDescription>
            Individual fee status for each student
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingStudents ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : studentBalances && studentBalances.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead className="text-right">Total Fees</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {studentBalances.map((student) => (
                  <TableRow key={student.studentId}>
                    <TableCell className="font-medium">
                      {student.studentName}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatAmount(student.totalCharges)}
                    </TableCell>
                    <TableCell className="text-right text-emerald-600">
                      {formatAmount(student.totalPayments)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatAmount(student.currentBalance)}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(student.status)}>
                        {getStatusLabel(student.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {onStudentClick && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onStudentClick(student.studentId)}
                        >
                          View
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <p>No students found in this class.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
