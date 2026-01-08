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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Plus, Loader2 } from 'lucide-react';
import {
  useFeeStructures,
  useFeeCategories,
  useCreateFeeStructure,
  useFormatBalance,
} from '@/hooks/useStudentFees';

interface FeeStructureManagerProps {
  schoolId: string;
}

/**
 * Fee Structure Manager Component
 * 
 * Admin interface for setting up fee structures by term/year/grade.
 */
export function FeeStructureManager({ schoolId }: FeeStructureManagerProps) {
  const currentYear = new Date().getFullYear();
  const [filterYear, setFilterYear] = useState(currentYear);
  const [filterTerm, setFilterTerm] = useState<number | undefined>(undefined);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: structures, isLoading: isLoadingStructures } = useFeeStructures(
    schoolId,
    filterYear,
    filterTerm
  );
  const { data: categories } = useFeeCategories(schoolId);
  const { formatAmount } = useFormatBalance();

  const years = [currentYear + 1, currentYear, currentYear - 1];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Fee Structures</h2>
          <p className="text-sm text-muted-foreground">
            Define fee items for each academic year and term
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Fee
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Fee Structure</DialogTitle>
              <DialogDescription>
                Create a new fee item for students
              </DialogDescription>
            </DialogHeader>
            <AddFeeStructureForm
              schoolId={schoolId}
              categories={categories || []}
              onSuccess={() => setIsDialogOpen(false)}
              onCancel={() => setIsDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <Select
          value={filterYear.toString()}
          onValueChange={(v) => setFilterYear(parseInt(v))}
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

        <Select
          value={filterTerm?.toString() || 'all'}
          onValueChange={(v) => setFilterTerm(v === 'all' ? undefined : parseInt(v))}
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

      {/* Fee Structures Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Active Fee Items</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingStructures ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : structures && structures.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Term</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {structures.map((structure) => (
                  <TableRow key={structure.id}>
                    <TableCell className="font-medium">
                      {(structure.fee_categories as { name: string } | null)?.name || 'Unknown'}
                    </TableCell>
                    <TableCell>{structure.academic_year}</TableCell>
                    <TableCell>
                      {structure.term ? `Term ${structure.term}` : 'Annual'}
                    </TableCell>
                    <TableCell>
                      {structure.grade || 'All'}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatAmount(Number(structure.amount))}
                    </TableCell>
                    <TableCell>
                      {structure.due_date
                        ? format(new Date(structure.due_date), 'dd MMM yyyy')
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <p>No fee structures defined yet.</p>
              <p className="text-sm">Click "Add Fee" to create one.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================================================
// ADD FEE STRUCTURE FORM
// =============================================================================

interface AddFeeStructureFormProps {
  schoolId: string;
  categories: Array<{ id: string; name: string; code: string }>;
  onSuccess: () => void;
  onCancel: () => void;
}

function AddFeeStructureForm({
  schoolId,
  categories,
  onSuccess,
  onCancel,
}: AddFeeStructureFormProps) {
  const currentYear = new Date().getFullYear();
  const createStructure = useCreateFeeStructure();

  const [categoryId, setCategoryId] = useState('');
  const [academicYear, setAcademicYear] = useState(currentYear);
  const [term, setTerm] = useState<string>('1');
  const [grade, setGrade] = useState<string>('all');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  const grades = ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 
                  'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10',
                  'Grade 11', 'Grade 12'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!categoryId || !amount) return;

    await createStructure.mutateAsync({
      schoolId,
      categoryId,
      academicYear,
      term: term === 'annual' ? null : parseInt(term),
      grade: grade === 'all' ? null : grade,
      amount: parseFloat(amount),
      dueDate: dueDate || undefined,
      notes: notes || undefined,
    });

    onSuccess();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Category */}
      <div className="space-y-2">
        <Label htmlFor="category">Fee Category *</Label>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Year & Term */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="year">Academic Year *</Label>
          <Select
            value={academicYear.toString()}
            onValueChange={(v) => setAcademicYear(parseInt(v))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={(currentYear + 1).toString()}>{currentYear + 1}</SelectItem>
              <SelectItem value={currentYear.toString()}>{currentYear}</SelectItem>
              <SelectItem value={(currentYear - 1).toString()}>{currentYear - 1}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="term">Term</Label>
          <Select value={term} onValueChange={setTerm}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Term 1</SelectItem>
              <SelectItem value="2">Term 2</SelectItem>
              <SelectItem value="3">Term 3</SelectItem>
              <SelectItem value="annual">Annual</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grade */}
      <div className="space-y-2">
        <Label htmlFor="grade">Applicable Grade</Label>
        <Select value={grade} onValueChange={setGrade}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Grades</SelectItem>
            {grades.map((g) => (
              <SelectItem key={g} value={g}>{g}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Amount */}
      <div className="space-y-2">
        <Label htmlFor="amount">Amount (ZMW) *</Label>
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

      {/* Due Date */}
      <div className="space-y-2">
        <Label htmlFor="dueDate">Due Date</Label>
        <Input
          id="dueDate"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
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
        <Button type="submit" disabled={createStructure.isPending}>
          {createStructure.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Create Fee
        </Button>
      </div>
    </form>
  );
}
