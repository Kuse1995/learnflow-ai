import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  useCreateSchool, 
  useCreateClass, 
  useCreateUserAccount,
  useBulkCreateStudents,
  parseStudentCSV 
} from "@/hooks/useOnboarding";
import { 
  Building2, 
  Users, 
  GraduationCap, 
  UserPlus,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Upload
} from "lucide-react";

type Step = 'school' | 'classes' | 'teachers' | 'students' | 'complete';

interface SchoolData {
  id?: string;
  name: string;
}

interface ClassData {
  id?: string;
  name: string;
  grade: string;
}

interface TeacherData {
  name: string;
  email: string;
}

export function SchoolOnboardingWizard() {
  const [currentStep, setCurrentStep] = useState<Step>('school');
  const [schoolData, setSchoolData] = useState<SchoolData>({ name: '' });
  const [classes, setClasses] = useState<ClassData[]>([{ name: '', grade: '' }]);
  const [teachers, setTeachers] = useState<TeacherData[]>([{ name: '', email: '' }]);
  const [studentsCsv, setStudentsCsv] = useState('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  const createSchool = useCreateSchool();
  const createClass = useCreateClass();
  const createUserAccount = useCreateUserAccount();
  const bulkCreateStudents = useBulkCreateStudents();

  const steps: { key: Step; label: string; icon: typeof Building2 }[] = [
    { key: 'school', label: 'School', icon: Building2 },
    { key: 'classes', label: 'Classes', icon: GraduationCap },
    { key: 'teachers', label: 'Teachers', icon: Users },
    { key: 'students', label: 'Students', icon: UserPlus },
    { key: 'complete', label: 'Complete', icon: CheckCircle },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const handleCreateSchool = async () => {
    const result = await createSchool.mutateAsync({ name: schoolData.name });
    setSchoolData({ ...schoolData, id: result.id });
    setCurrentStep('classes');
  };

  const handleCreateClasses = async () => {
    if (!schoolData.id) return;
    
    for (const cls of classes.filter(c => c.name)) {
      const result = await createClass.mutateAsync({
        name: cls.name,
        grade: cls.grade,
        school_id: schoolData.id,
      });
      cls.id = result.id;
    }
    setSelectedClassId(classes[0]?.id || '');
    setCurrentStep('teachers');
  };

  const handleCreateTeachers = async () => {
    if (!schoolData.id) return;
    
    for (const teacher of teachers.filter(t => t.email)) {
      await createUserAccount.mutateAsync({
        name: teacher.name,
        email: teacher.email,
        role: 'teacher',
        school_id: schoolData.id,
      });
    }
    setCurrentStep('students');
  };

  const handleCreateStudents = async () => {
    if (!selectedClassId || !studentsCsv) {
      setCurrentStep('complete');
      return;
    }
    
    const students = parseStudentCSV(studentsCsv, selectedClassId);
    if (students.length > 0) {
      await bulkCreateStudents.mutateAsync(students);
    }
    setCurrentStep('complete');
  };

  const addClass = () => {
    setClasses([...classes, { name: '', grade: '' }]);
  };

  const addTeacher = () => {
    setTeachers([...teachers, { name: '', email: '' }]);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = step.key === currentStep;
            const isComplete = index < currentStepIndex;
            
            return (
              <div
                key={step.key}
                className={`flex flex-col items-center gap-1 ${
                  isActive ? 'text-primary' : isComplete ? 'text-green-600' : 'text-muted-foreground'
                }`}
              >
                <div className={`p-2 rounded-full ${
                  isActive ? 'bg-primary/10' : isComplete ? 'bg-green-100' : 'bg-muted'
                }`}>
                  {isComplete ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <span className="text-xs font-medium">{step.label}</span>
              </div>
            );
          })}
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Step Content */}
      <Card>
        <CardHeader>
          <CardTitle>
            {currentStep === 'school' && 'Create School'}
            {currentStep === 'classes' && 'Add Classes'}
            {currentStep === 'teachers' && 'Add Teachers'}
            {currentStep === 'students' && 'Add Students'}
            {currentStep === 'complete' && 'Setup Complete!'}
          </CardTitle>
          <CardDescription>
            {currentStep === 'school' && 'Enter the school name to get started'}
            {currentStep === 'classes' && 'Create classes for this school'}
            {currentStep === 'teachers' && 'Add teacher accounts (they will receive invites)'}
            {currentStep === 'students' && 'Bulk import students via CSV or add later'}
            {currentStep === 'complete' && 'The school is ready to use'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentStep === 'school' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="school-name">School Name</Label>
                <Input
                  id="school-name"
                  value={schoolData.name}
                  onChange={(e) => setSchoolData({ ...schoolData, name: e.target.value })}
                  placeholder="e.g., Lusaka Primary School"
                />
              </div>
              <Button
                onClick={handleCreateSchool}
                disabled={!schoolData.name || createSchool.isPending}
              >
                Create School
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </>
          )}

          {currentStep === 'classes' && (
            <>
              <div className="space-y-3">
                {classes.map((cls, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={cls.name}
                      onChange={(e) => {
                        const updated = [...classes];
                        updated[index].name = e.target.value;
                        setClasses(updated);
                      }}
                      placeholder="Class name (e.g., Grade 5A)"
                    />
                    <Input
                      value={cls.grade}
                      onChange={(e) => {
                        const updated = [...classes];
                        updated[index].grade = e.target.value;
                        setClasses(updated);
                      }}
                      placeholder="Grade"
                      className="w-24"
                    />
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={addClass}>
                + Add Another Class
              </Button>
              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setCurrentStep('school')}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  onClick={handleCreateClasses}
                  disabled={!classes.some(c => c.name) || createClass.isPending}
                >
                  Create Classes
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </>
          )}

          {currentStep === 'teachers' && (
            <>
              <div className="space-y-3">
                {teachers.map((teacher, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={teacher.name}
                      onChange={(e) => {
                        const updated = [...teachers];
                        updated[index].name = e.target.value;
                        setTeachers(updated);
                      }}
                      placeholder="Teacher name"
                    />
                    <Input
                      type="email"
                      value={teacher.email}
                      onChange={(e) => {
                        const updated = [...teachers];
                        updated[index].email = e.target.value;
                        setTeachers(updated);
                      }}
                      placeholder="Email address"
                    />
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" onClick={addTeacher}>
                + Add Another Teacher
              </Button>
              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setCurrentStep('classes')}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  onClick={handleCreateTeachers}
                  disabled={createUserAccount.isPending}
                >
                  {teachers.some(t => t.email) ? 'Create Teachers' : 'Skip'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </>
          )}

          {currentStep === 'students' && (
            <>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Class</Label>
                  <div className="flex gap-2 flex-wrap">
                    {classes.filter(c => c.id).map((cls) => (
                      <Badge
                        key={cls.id}
                        variant={selectedClassId === cls.id ? 'default' : 'outline'}
                        className="cursor-pointer"
                        onClick={() => setSelectedClassId(cls.id!)}
                      >
                        {cls.name}
                      </Badge>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="students-csv">
                    Paste Student List (CSV format: Name, StudentID)
                  </Label>
                  <Textarea
                    id="students-csv"
                    value={studentsCsv}
                    onChange={(e) => setStudentsCsv(e.target.value)}
                    placeholder="John Doe, STU001&#10;Jane Smith, STU002&#10;..."
                    rows={8}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    One student per line. Format: Name, Student ID
                  </p>
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setCurrentStep('teachers')}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <Button
                  onClick={handleCreateStudents}
                  disabled={bulkCreateStudents.isPending}
                >
                  {studentsCsv ? 'Import Students' : 'Skip & Complete'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </>
          )}

          {currentStep === 'complete' && (
            <div className="text-center py-6 space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">{schoolData.name} is ready!</h3>
                <p className="text-muted-foreground">
                  The school has been set up with {classes.filter(c => c.id).length} class(es)
                  and {teachers.filter(t => t.email).length} teacher invite(s).
                </p>
              </div>
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Add Another School
                </Button>
                <Button onClick={() => window.location.href = '/platform-admin/schools'}>
                  View All Schools
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
