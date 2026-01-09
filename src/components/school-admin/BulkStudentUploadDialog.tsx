/**
 * Bulk Student Upload Dialog
 * Allows CSV file upload or paste for importing multiple students
 */

import { useState, useCallback, useRef } from "react";
import { Upload, FileText, Download, AlertCircle, CheckCircle2, AlertTriangle, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { parseStudentCSV, generateCSVTemplate, ParseResult, ParsedStudent } from "@/lib/csv-student-parser";
import { useBulkImportStudents, useExistingStudentIds } from "@/hooks/useBulkStudents";
import { cn } from "@/lib/utils";

interface BulkStudentUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  classes: { id: string; name: string; grade: string | null }[];
}

type FilterType = 'all' | 'valid' | 'errors';

export function BulkStudentUploadDialog({
  open,
  onOpenChange,
  schoolId,
  classes,
}: BulkStudentUploadDialogProps) {
  const [csvText, setCsvText] = useState('');
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [progress, setProgress] = useState(0);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: existingIds = [] } = useExistingStudentIds(schoolId);
  const bulkImport = useBulkImportStudents();

  const handleParse = useCallback((text: string) => {
    setCsvText(text);
    if (text.trim()) {
      const result = parseStudentCSV(text, classes, existingIds);
      setParseResult(result);
    } else {
      setParseResult(null);
    }
  }, [classes, existingIds]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        handleParse(text);
      };
      reader.readAsText(file);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        handleParse(text);
      };
      reader.readAsText(file);
    }
  }, [handleParse]);

  const handleDownloadTemplate = () => {
    const template = generateCSVTemplate();
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'student_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async () => {
    if (!parseResult) return;

    setIsImporting(true);
    setProgress(0);

    try {
      await bulkImport.mutateAsync({
        students: parseResult.students,
        schoolId,
        onProgress: setProgress,
      });
      
      // Reset and close on success
      setCsvText('');
      setParseResult(null);
      onOpenChange(false);
    } finally {
      setIsImporting(false);
      setProgress(0);
    }
  };

  const handleReset = () => {
    setCsvText('');
    setParseResult(null);
    setFilter('all');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const filteredStudents = parseResult?.students.filter(s => {
    if (filter === 'valid') return s.errors.length === 0;
    if (filter === 'errors') return s.errors.length > 0;
    return true;
  }) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Bulk Student Upload
          </DialogTitle>
          <DialogDescription>
            Import multiple students at once via CSV file or paste
          </DialogDescription>
        </DialogHeader>

        {!parseResult ? (
          <div className="space-y-4">
            <Tabs defaultValue="upload">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload">Upload File</TabsTrigger>
                <TabsTrigger value="paste">Paste CSV</TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="space-y-4">
                <div
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Drag and drop a CSV file here, or click to browse
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              </TabsContent>

              <TabsContent value="paste" className="space-y-4">
                <Textarea
                  placeholder="Paste CSV data here...&#10;Name,Student ID,Grade,Class Name&#10;John Doe,STU001,Grade 5,5A"
                  value={csvText}
                  onChange={(e) => handleParse(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                />
              </TabsContent>
            </Tabs>

            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                <Download className="h-4 w-4 mr-2" />
                Download Template
              </Button>
              <p className="text-xs text-muted-foreground">
                Format: Name, Student ID, Grade, Class Name
              </p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col min-h-0 space-y-4">
            {/* Summary Stats */}
            <div className="flex items-center gap-4 flex-wrap">
              <Badge variant="outline" className="gap-1">
                Total: {parseResult.totalRows}
              </Badge>
              <Badge variant="default" className="gap-1 bg-green-600">
                <CheckCircle2 className="h-3 w-3" />
                Valid: {parseResult.validCount}
              </Badge>
              {parseResult.errorCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Errors: {parseResult.errorCount}
                </Badge>
              )}
              {parseResult.warningCount > 0 && (
                <Badge variant="secondary" className="gap-1 bg-yellow-500/20 text-yellow-700">
                  <AlertTriangle className="h-3 w-3" />
                  Warnings: {parseResult.warningCount}
                </Badge>
              )}
            </div>

            {/* Filter Buttons */}
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                All
              </Button>
              <Button
                variant={filter === 'valid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('valid')}
              >
                Valid Only
              </Button>
              <Button
                variant={filter === 'errors' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('errors')}
              >
                Errors Only
              </Button>
            </div>

            {/* Preview Table */}
            <ScrollArea className="flex-1 border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Row</TableHead>
                    <TableHead className="w-12">Status</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Issues</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <StudentPreviewRow key={student.rowNumber} student={student} />
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            {/* Progress Bar */}
            {isImporting && (
              <div className="space-y-2">
                <Progress value={progress} />
                <p className="text-xs text-muted-foreground text-center">
                  Importing... {progress}%
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Button variant="ghost" onClick={handleReset}>
                <X className="h-4 w-4 mr-2" />
                Start Over
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={parseResult.validCount === 0 || isImporting}
                >
                  {isImporting ? 'Importing...' : `Import ${parseResult.validCount} Students`}
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StudentPreviewRow({ student }: { student: ParsedStudent }) {
  const hasErrors = student.errors.length > 0;
  const hasWarnings = student.warnings.length > 0;

  return (
    <TableRow className={cn(hasErrors && 'bg-destructive/5')}>
      <TableCell className="text-muted-foreground text-xs">{student.rowNumber}</TableCell>
      <TableCell>
        {hasErrors ? (
          <AlertCircle className="h-4 w-4 text-destructive" />
        ) : hasWarnings ? (
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
        ) : (
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        )}
      </TableCell>
      <TableCell className="font-medium">{student.name || '—'}</TableCell>
      <TableCell>
        <code className="text-xs bg-muted px-1 py-0.5 rounded">
          {student.studentId}
        </code>
      </TableCell>
      <TableCell>{student.grade || '—'}</TableCell>
      <TableCell>
        {student.classId ? (
          <Badge variant="secondary">{student.className}</Badge>
        ) : student.className ? (
          <span className="text-yellow-600 text-sm">{student.className}</span>
        ) : (
          '—'
        )}
      </TableCell>
      <TableCell>
        {hasErrors && (
          <span className="text-xs text-destructive">{student.errors.join(', ')}</span>
        )}
        {hasWarnings && !hasErrors && (
          <span className="text-xs text-yellow-600">{student.warnings.join(', ')}</span>
        )}
      </TableCell>
    </TableRow>
  );
}
