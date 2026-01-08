import { useState, useMemo } from 'react';
import { CreditCard, LayoutDashboard, List, Users, FileText, Calendar, Lock } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminLayout } from '@/components/navigation/AdminNav';
import { useSchoolAdminSchool } from '@/hooks/useSchoolAdmin';
import { Skeleton } from '@/components/ui/skeleton';
import { FeeStructureManager, TermClosureControl, FinancialExports } from '@/components/fees';
import { FeesOverviewCards } from '@/components/fees/FeesOverviewCards';
import { StudentBalancesList } from '@/components/fees/StudentBalancesList';
import { PaymentPlanManager } from '@/components/fees/PaymentPlanManager';

/**
 * Admin Fees Dashboard
 * 
 * Comprehensive fee management for school administrators:
 * - Overview: Key metrics and summary
 * - Fee Structure: Define fees by academic year/term/grade
 * - Student Balances: View/manage individual student accounts
 * - Payment Plans: Create and track installment plans
 * - Reports: Export financial data
 * - Term Management: Close terms to lock financial data
 */
export default function AdminFees() {
  const { data: school, isLoading } = useSchoolAdminSchool();
  const [activeTab, setActiveTab] = useState('overview');
  
  // Academic year and term state for term management
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedTerm, setSelectedTerm] = useState(1);
  
  // Generate year options (current year ± 2 years)
  const yearOptions = useMemo(() => {
    return [currentYear - 2, currentYear - 1, currentYear, currentYear + 1].filter(y => y > 2020);
  }, [currentYear]);

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <AdminLayout schoolName={school?.name}>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="h-6 w-6" />
            Fee Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage student fees, payments, and financial records
          </p>
        </div>

        {/* Tabbed Interface */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <LayoutDashboard className="h-4 w-4" />
              <span className="hidden sm:inline">Overview</span>
            </TabsTrigger>
            <TabsTrigger value="structure" className="flex items-center gap-2">
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Fee Structure</span>
            </TabsTrigger>
            <TabsTrigger value="students" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Student Balances</span>
            </TabsTrigger>
            <TabsTrigger value="plans" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span className="hidden sm:inline">Payment Plans</span>
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Reports</span>
            </TabsTrigger>
            <TabsTrigger value="terms" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              <span className="hidden sm:inline">Term Management</span>
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <FeesOverviewCards schoolId={school?.id || ''} />
          </TabsContent>

          {/* Fee Structure Tab */}
          <TabsContent value="structure" className="space-y-4">
            <FeeStructureManager schoolId={school?.id || ''} />
          </TabsContent>

          {/* Student Balances Tab */}
          <TabsContent value="students" className="space-y-4">
            <StudentBalancesList schoolId={school?.id || ''} />
          </TabsContent>

          {/* Payment Plans Tab */}
          <TabsContent value="plans" className="space-y-4">
            <PaymentPlanManager schoolId={school?.id || ''} />
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-4">
            <FinancialExports schoolId={school?.id || ''} />
          </TabsContent>

          {/* Term Management Tab */}
          <TabsContent value="terms" className="space-y-4">
            {/* Year/Term Selectors */}
            <div className="flex gap-4 items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Year:</span>
                <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map(year => (
                      <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Term:</span>
                <Select value={String(selectedTerm)} onValueChange={(v) => setSelectedTerm(Number(v))}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Term 1</SelectItem>
                    <SelectItem value="2">Term 2</SelectItem>
                    <SelectItem value="3">Term 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <TermClosureControl 
              schoolId={school?.id || ''} 
              academicYear={selectedYear}
              term={selectedTerm}
              canCloseTerm={true}
            />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
