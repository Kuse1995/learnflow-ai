import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Eye, FileText, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useClassPracticeAwareness,
  formatPracticeLevel,
  formatPlanStatus,
  formatGentleNudge,
  type StudentPracticeAwareness,
} from "@/hooks/usePracticeAwareness";
import { AdaptiveSupportGenerator } from "@/components/adaptive-support";

interface PracticeAwarenessTableProps {
  classId: string;
}

export function PracticeAwarenessTable({ classId }: PracticeAwarenessTableProps) {
  const navigate = useNavigate();
  const { data: awarenessData = [], isLoading } = useClassPracticeAwareness(classId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (awarenessData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Eye className="h-4 w-4 text-muted-foreground" />
            Practice Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-6">
            No students in this class yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="space-y-3">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Eye className="h-4 w-4 text-muted-foreground" />
          Practice Overview
        </CardTitle>
        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground leading-relaxed">
          This overview is intended to support professional judgment.
          Practice activity is optional and self-paced.
        </p>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="font-medium">Student</TableHead>
                <TableHead className="font-medium">Recent Practice</TableHead>
                <TableHead className="font-medium">Support Plan</TableHead>
                <TableHead className="font-medium">Note</TableHead>
                <TableHead className="w-[100px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {awarenessData.map((student) => (
                <PracticeAwarenessRow
                  key={student.studentId}
                  student={student}
                  classId={classId}
                  onViewProfile={() =>
                    navigate(`/teacher/classes/${classId}/students/${student.studentId}`)
                  }
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

interface PracticeAwarenessRowProps {
  student: StudentPracticeAwareness;
  classId: string;
  onViewProfile: () => void;
}

function PracticeAwarenessRow({
  student,
  classId,
  onViewProfile,
}: PracticeAwarenessRowProps) {
  return (
    <TableRow className="hover:bg-muted/30">
      <TableCell>
        <button
          onClick={onViewProfile}
          className="text-left hover:underline"
        >
          <p className="font-medium text-sm">{student.studentName}</p>
          {student.lastPracticeDate && (
            <p className="text-xs text-muted-foreground">
              Last: {format(new Date(student.lastPracticeDate), "MMM d")}
            </p>
          )}
        </button>
      </TableCell>
      <TableCell>
        <span className="text-sm text-muted-foreground">
          {formatPracticeLevel(student.recentPracticeLevel)}
        </span>
      </TableCell>
      <TableCell>
        <span className="text-sm text-muted-foreground">
          {formatPlanStatus(student.supportPlanStatus)}
        </span>
      </TableCell>
      <TableCell>
        <span className="text-sm text-muted-foreground italic">
          {formatGentleNudge(student.gentleNudge)}
        </span>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          {student.supportPlanStatus !== "none" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onViewProfile}
              title="View Support Plan"
            >
              <FileText className="h-4 w-4" />
            </Button>
          )}
          {student.supportPlanStatus === "none" && (
            <AdaptiveSupportGenerator
              classId={classId}
              students={[{ id: student.studentId, name: student.studentName }]}
              trigger={
                <Button variant="ghost" size="sm" title="Generate Support Plan">
                  <PenLine className="h-4 w-4" />
                </Button>
              }
            />
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}
