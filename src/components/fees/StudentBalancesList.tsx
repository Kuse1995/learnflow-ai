import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, ChevronRight, Bell } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
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
import { useSchoolStudentBalances } from '@/hooks/useSchoolStudentBalances';
import { useFormatBalance } from '@/hooks/useStudentFees';
import { useClasses } from '@/hooks/useClasses';
import { SendReminderDialog } from './SendReminderDialog';

interface StudentBalancesListProps {
  schoolId: string;
  academicYear?: number;
  term?: number;
}

/**
 * Student Balances List
 * 
 * Searchable, filterable list of all students with their fee balances.
 * Click a row to navigate to the student's fee detail page.
 */
export function StudentBalancesList({
  schoolId,
  academicYear = new Date().getFullYear(),
  term,
}: StudentBalancesListProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false);

  const { data: balances, isLoading } = useSchoolStudentBalances(schoolId, academicYear, term);
  const { data: allClasses } = useClasses();
  const { formatAmount, getStatusLabel, getStatusColor } = useFormatBalance();

  // Filter classes by school
  const classes = useMemo(() => {
    if (!allClasses || !schoolId) return [];
    return allClasses.filter(cls => cls.school_id === schoolId);
  }, [allClasses, schoolId]);

  // Filter and search
  const filteredBalances = useMemo(() => {
    if (!balances) return [];

    return balances.filter(student => {
      // Search filter
      const matchesSearch = searchQuery === '' || 
        student.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (student.className && student.className.toLowerCase().includes(searchQuery.toLowerCase()));

      // Status filter
      const matchesStatus = statusFilter === 'all' || student.status === statusFilter;

      // Class filter
      const matchesClass = classFilter === 'all' || student.classId === classFilter;

      return matchesSearch && matchesStatus && matchesClass;
    });
  }, [balances, searchQuery, statusFilter, classFilter]);

  // Toggle student selection
  const toggleStudent = (studentId: string) => {
    const newSelection = new Set(selectedStudents);
    if (newSelection.has(studentId)) {
      newSelection.delete(studentId);
    } else {
      newSelection.add(studentId);
    }
    setSelectedStudents(newSelection);
  };

  // Toggle all visible students
  const toggleAll = () => {
    if (selectedStudents.size === filteredBalances.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(filteredBalances.map(s => s.studentId)));
    }
  };

  // Get selected students with balances for reminder
  const selectedForReminder = useMemo(() => {
    return filteredBalances
      .filter(s => selectedStudents.has(s.studentId) && s.currentBalance > 0)
      .map(s => ({
        id: s.studentId,
        name: s.studentName,
        balance: s.currentBalance,
        classId: s.classId,
      }));
  }, [filteredBalances, selectedStudents]);

  if (isLoading) {
    return <BalancesListSkeleton />;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="text-lg">Student Balances</CardTitle>
            <CardDescription>
              {filteredBalances.length} students • Click a row to view details
            </CardDescription>
          </div>
          {selectedForReminder.length > 0 && (
            <Button onClick={() => setIsReminderDialogOpen(true)}>
              <Bell className="h-4 w-4 mr-2" />
              Send Reminder ({selectedForReminder.length})
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by student or class name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="paid">Fully Paid</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
              <SelectItem value="unpaid">No Payment</SelectItem>
            </SelectContent>
          </Select>
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classes?.map(cls => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {filteredBalances.length > 0 ? (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedStudents.size === filteredBalances.length && filteredBalances.length > 0}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead className="text-right">Total Fees</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBalances.map((student) => (
                  <TableRow 
                    key={student.studentId}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/admin/students/${student.studentId}/fees`)}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedStudents.has(student.studentId)}
                        onCheckedChange={() => toggleStudent(student.studentId)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{student.studentName}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {student.className || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatAmount(student.totalCharges)}
                    </TableCell>
                    <TableCell className="text-right text-emerald-600">
                      {formatAmount(student.totalPayments)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-amber-600">
                      {formatAmount(student.currentBalance)}
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(student.status)}>
                        {getStatusLabel(student.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="py-12 text-center text-muted-foreground">
            <p>No students found matching your filters.</p>
          </div>
        )}
      </CardContent>

      {/* Reminder Dialog */}
      <SendReminderDialog
        open={isReminderDialogOpen}
        onOpenChange={setIsReminderDialogOpen}
        students={selectedForReminder}
        schoolId={schoolId}
        academicYear={academicYear}
        term={term}
      />
    </Card>
  );
}

function BalancesListSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 mb-4">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
