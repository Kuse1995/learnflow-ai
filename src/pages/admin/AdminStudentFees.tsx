import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminLayout } from '@/components/navigation/AdminNav';
import { useSchoolAdminSchool } from '@/hooks/useSchoolAdmin';
import { StudentFeesTab, ReceiptHistory, StudentStatementViewer } from '@/components/fees';
import { useStudentPaymentPlan } from '@/hooks/usePaymentPlans';
import { PaymentPlanDetails } from '@/components/fees/PaymentPlanDetails';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Admin Student Fees Page
 * 
 * Full-page view of an individual student's fee account.
 * Includes ledger, payment plan (if any), and receipt history.
 */
export default function AdminStudentFees() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const { data: school, isLoading: isLoadingSchool } = useSchoolAdminSchool();
  
  const currentYear = new Date().getFullYear();

  // Fetch student details
  const { data: student, isLoading: isLoadingStudent } = useQuery({
    queryKey: ['student', studentId],
    queryFn: async () => {
      if (!studentId) return null;
      
      const { data, error } = await supabase
        .from('students')
        .select(`
          id,
          name,
          student_id,
          class_id,
          classes (
            id,
            name,
            grade
          )
        `)
        .eq('id', studentId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!studentId,
  });

  // Fetch active payment plan
  const { data: paymentPlan } = useStudentPaymentPlan(studentId, currentYear);

  const isLoading = isLoadingSchool || isLoadingStudent;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!student) {
    return (
      <AdminLayout schoolName={school?.name}>
        <div className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground mb-4">Student not found</p>
          <Button onClick={() => navigate('/admin/fees')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Fees
          </Button>
        </div>
      </AdminLayout>
    );
  }

  // Handle classes as array or single object
  const classInfo = Array.isArray(student.classes) 
    ? student.classes[0] 
    : student.classes;

  return (
    <AdminLayout schoolName={school?.name}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/fees')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <User className="h-6 w-6" />
              {student.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {classInfo?.name || 'No class assigned'}
              {student.student_id && ` • ID: ${student.student_id}`}
            </p>
          </div>
        </div>

        {/* Active Payment Plan */}
        {paymentPlan && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Active Payment Plan</CardTitle>
              <CardDescription>
                This student has an active installment plan
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PaymentPlanDetails 
                planId={paymentPlan.id} 
                onClose={() => {}} 
              />
            </CardContent>
          </Card>
        )}

        {/* Student Fees Tab */}
        <StudentFeesTab
          studentId={student.id}
          studentName={student.name}
          schoolId={school?.id || ''}
          classId={student.class_id || undefined}
          academicYear={currentYear}
          canRecordPayment={true}
          canSendReminder={true}
          canAddAdjustment={true}
        />

        {/* Receipt History */}
        <ReceiptHistory studentId={student.id} />

        {/* Statement Viewer */}
        <StudentStatementViewer
          studentId={student.id}
          studentName={student.name}
          schoolName={school?.name || ''}
        />
      </div>
    </AdminLayout>
  );
}
