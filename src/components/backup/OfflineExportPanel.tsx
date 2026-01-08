import { useState } from "react";
import { format } from "date-fns";
import { 
  Download, 
  FileText, 
  Table as TableIcon, 
  Printer,
  FileJson,
  Users,
  Calendar,
  BookOpen
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { generateCSV, generateJSON, printSummary } from "@/hooks/useOfflineMode";
import { useToast } from "@/hooks/use-toast";
import { useTerminologyConfig } from "@/hooks/useClassLevelTerminology";

interface ExportOption {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  table: string;
}

const EXPORT_OPTIONS: ExportOption[] = [
  {
    id: 'students',
    label: 'Students',
    description: 'Student names and IDs',
    icon: <Users className="h-4 w-4" />,
    table: 'students',
  },
  {
    id: 'classes',
    label: 'Classes',
    description: 'Class information and structure',
    icon: <BookOpen className="h-4 w-4" />,
    table: 'classes',
  },
  {
    id: 'attendance',
    label: 'Attendance Records',
    description: 'Daily attendance data',
    icon: <Calendar className="h-4 w-4" />,
    table: 'attendance_records',
  },
];

interface OfflineExportPanelProps {
  schoolId?: string;
  classId?: string;
}

export function OfflineExportPanel({ schoolId, classId }: OfflineExportPanelProps) {
  const { toast } = useToast();
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'json'>('csv');
  const terminology = useTerminologyConfig(); // Uses default terminology

  const toggleOption = (optionId: string) => {
    setSelectedOptions(prev => 
      prev.includes(optionId) 
        ? prev.filter(id => id !== optionId)
        : [...prev, optionId]
    );
  };

  const handleExport = async () => {
    if (selectedOptions.length === 0) {
      toast({
        title: "No data selected",
        description: "Please select at least one type of data to export.",
        variant: "destructive",
      });
      return;
    }

    setIsExporting(true);
    const dateStr = format(new Date(), 'yyyy-MM-dd');

    try {
      for (const optionId of selectedOptions) {
        const option = EXPORT_OPTIONS.find(o => o.id === optionId);
        if (!option) continue;

        let data: Record<string, unknown>[] = [];
        
        if (option.table === 'students') {
          const result = await supabase.from('students').select('*');
          data = (result.data || []) as Record<string, unknown>[];
        } else if (option.table === 'classes') {
          const result = await supabase.from('classes').select('*');
          data = (result.data || []) as Record<string, unknown>[];
        } else if (option.table === 'attendance_records') {
          let query = supabase.from('attendance_records').select('*');
          if (classId) query = query.eq('class_id', classId);
          const result = await query;
          data = (result.data || []) as Record<string, unknown>[];
        }

        const filename = `${option.id}-export-${dateStr}`;
        
        if (exportFormat === 'csv') {
          generateCSV(data || [], `${filename}.csv`);
        } else {
          generateJSON(data, `${filename}.json`);
        }
      }

      toast({
        title: "Export complete",
        description: `${selectedOptions.length} file(s) downloaded successfully.`,
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "There was a problem exporting your data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrintSummary = async () => {
    try {
      // Fetch some summary data
      const { data: students } = await supabase
        .from('students')
        .select('name, student_id')
        .limit(100);

      const { data: classes } = await supabase
        .from('classes')
        .select('name, grade')
        .limit(50);

      printSummary('School Data Summary', [
        {
          heading: 'Students',
          content: students?.map(s => `${s.name} (${s.student_id})`) || ['No students found'],
        },
        {
          heading: 'Classes',
          content: classes?.map(c => `${c.name} - ${terminology.singular} ${c.grade || 'N/A'}`) || ['No classes found'],
        },
      ]);
    } catch {
      toast({
        title: "Print failed",
        description: "Unable to generate the print summary.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Offline Export
        </CardTitle>
        <CardDescription>
          Download your data for offline access, USB transfer, or printing
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Export Options */}
        <div className="space-y-3">
          <Label className="text-base">Select data to export:</Label>
          {EXPORT_OPTIONS.map((option) => (
            <div 
              key={option.id}
              className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <Checkbox
                id={option.id}
                checked={selectedOptions.includes(option.id)}
                onCheckedChange={() => toggleOption(option.id)}
              />
              <div className="flex items-center gap-3 flex-1">
                <div className="p-2 bg-muted rounded-md">
                  {option.icon}
                </div>
                <div>
                  <Label htmlFor={option.id} className="cursor-pointer font-medium">
                    {option.label}
                  </Label>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Format Selection */}
        <div className="space-y-3">
          <Label className="text-base">Export format:</Label>
          <div className="flex gap-3">
            <Button
              variant={exportFormat === 'csv' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setExportFormat('csv')}
            >
              <TableIcon className="h-4 w-4 mr-2" />
              CSV (Spreadsheet)
            </Button>
            <Button
              variant={exportFormat === 'json' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setExportFormat('json')}
            >
              <FileJson className="h-4 w-4 mr-2" />
              JSON (Technical)
            </Button>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <Button
            onClick={handleExport}
            disabled={isExporting || selectedOptions.length === 0}
            className="flex-1"
          >
            {isExporting ? (
              "Exporting..."
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download Selected
              </>
            )}
          </Button>
          
          <Button variant="outline" onClick={handlePrintSummary}>
            <Printer className="h-4 w-4 mr-2" />
            Print Summary
          </Button>
        </div>
        
        {/* Help Text */}
        <div className="p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium text-sm mb-2">Offline Use Tips</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• CSV files can be opened in Excel, Google Sheets, or any spreadsheet app</li>
            <li>• Downloaded files can be copied to USB drives for physical backup</li>
            <li>• Print summaries for paper records or school inspections</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
