/**
 * School Reports Page
 * Term-based, non-punitive, trust-preserving reporting system
 */

import { useState } from "react";
import { 
  TermReportViewer, 
  TermReportList, 
  CreateTermReportDialog,
  downloadReportCSV,
  printReportAsPDF,
} from "@/components/reports";
import {
  useTermReports,
  useCreateTermReport,
  useUpdateTermReport,
  useFinalizeTermReport,
  useRecordExport,
  TermReport,
} from "@/hooks/useTermReports";
import { useSchoolAdminSchool, useIsSchoolAdmin } from "@/hooks/useSchoolAdmin";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, ArrowLeft, FileText } from "lucide-react";
import { AdminLayout } from "@/components/navigation/AdminNav";

export default function SchoolReports() {
  const [selectedReport, setSelectedReport] = useState<TermReport | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data: isAdmin, isLoading: isAdminLoading } = useIsSchoolAdmin();
  const { data: school, isLoading: isSchoolLoading } = useSchoolAdminSchool();
  const { data: reports, isLoading: isReportsLoading } = useTermReports(school?.id);
  
  const createReport = useCreateTermReport();
  const updateReport = useUpdateTermReport();
  const finalizeReport = useFinalizeTermReport();
  const recordExport = useRecordExport();

  const isLoading = isAdminLoading || isSchoolLoading;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Denied</AlertTitle>
          <AlertDescription>
            You don't have school administrator access.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No School Assigned</AlertTitle>
          <AlertDescription>
            Your account is not yet linked to a school.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const handleCreateReport = async (data: {
    term_name: string;
    academic_year: string;
    term_number: number;
    start_date: string;
    end_date: string;
  }) => {
    await createReport.mutateAsync({
      school_id: school.id,
      ...data,
    });
    setShowCreateDialog(false);
  };

  const handleUpdateNotes = async (notes: string) => {
    if (!selectedReport) return;
    await updateReport.mutateAsync({
      reportId: selectedReport.id,
      updates: { admin_notes: notes },
    });
    // Update local state
    setSelectedReport({ ...selectedReport, admin_notes: notes });
  };

  const handleFinalize = async () => {
    if (!selectedReport) return;
    await finalizeReport.mutateAsync(selectedReport.id);
    setSelectedReport({ ...selectedReport, status: "finalized" });
  };

  const handleExportPDF = () => {
    if (!selectedReport) return;
    printReportAsPDF(selectedReport, school.name);
    recordExport.mutate({ reportId: selectedReport.id, format: "pdf" });
  };

  const handleExportCSV = () => {
    if (!selectedReport) return;
    downloadReportCSV(selectedReport);
    recordExport.mutate({ reportId: selectedReport.id, format: "csv" });
  };

  return (
    <AdminLayout schoolName={school.name}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          {selectedReport ? (
            <Button 
              variant="ghost" 
              className="mb-2 -ml-2" 
              onClick={() => setSelectedReport(null)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Reports
            </Button>
          ) : (
            <>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <FileText className="h-6 w-6" />
                Term Reports
              </h1>
              <p className="text-muted-foreground mt-1">
                System activity overviews for planning and coordination. 
                All data is aggregated — no individual performance metrics.
              </p>
            </>
          )}
        </div>

        {/* Trust Banner */}
        {!selectedReport && (
          <div className="bg-muted/50 rounded-lg px-4 py-3 text-sm text-muted-foreground">
            <p>
              📊 These reports show <strong>system usage patterns</strong>, not teacher performance. 
              Teachers are trusted professionals who manage their own classrooms.
            </p>
          </div>
        )}

        {/* Content */}
        {selectedReport ? (
          <TermReportViewer
            report={selectedReport}
            onUpdateNotes={handleUpdateNotes}
            onFinalize={handleFinalize}
            onExportPDF={handleExportPDF}
            onExportCSV={handleExportCSV}
            isUpdating={updateReport.isPending || finalizeReport.isPending}
          />
        ) : (
          <TermReportList
            reports={reports || []}
            onSelectReport={setSelectedReport}
            onCreateReport={() => setShowCreateDialog(true)}
            isLoading={isReportsLoading}
          />
        )}

        {/* Create Dialog */}
        <CreateTermReportDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onSubmit={handleCreateReport}
          isSubmitting={createReport.isPending}
        />
      </div>
    </AdminLayout>
  );
}
