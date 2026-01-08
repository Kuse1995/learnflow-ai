import { useNavigate } from "react-router-dom";
import { TeacherLayout } from "@/components/navigation";
import { useClasses } from "@/hooks/useClasses";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-states";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Users, ChevronRight } from "lucide-react";

export default function TeacherClasses() {
  const navigate = useNavigate();
  const { data: classes = [], isLoading } = useClasses();

  return (
    <TeacherLayout schoolName="Omanut Academy">
      <div className="flex flex-col min-h-full pb-24 md:pb-8">
        <header className="px-4 pt-6 pb-4 border-b">
          <h1 className="text-xl font-bold">My Classes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your classes and view student lists
          </p>
        </header>

        <div className="flex-1 p-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : classes.length === 0 ? (
            <EmptyState
              variant="no-data"
              title="No classes assigned"
              description="Your classes will appear here once assigned by an administrator."
            />
          ) : (
            <div className="space-y-3">
              {classes.map((cls) => (
                <Card 
                  key={cls.id} 
                  className="overflow-hidden hover:border-primary/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/teacher/classes/${cls.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <BookOpen className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold">{cls.name}</h3>
                        {cls.grade && cls.section && (
                          <p className="text-sm text-muted-foreground">
                            Grade {cls.grade} - Section {cls.section}
                          </p>
                        )}
                        <div className="flex items-center gap-1 text-muted-foreground mt-2">
                          <Users className="h-4 w-4" />
                          <span className="text-xs">View students</span>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 self-center" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </TeacherLayout>
  );
}
