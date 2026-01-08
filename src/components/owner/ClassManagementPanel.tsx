import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { GraduationCap, Trash2 } from 'lucide-react';
import { useAllClasses, useDeleteClass } from '@/hooks/useOwnerControls';
import { CreateClassDialog } from './CreateClassDialog';
import { format } from 'date-fns';

export function ClassManagementPanel() {
  const { data: classes, isLoading } = useAllClasses();
  const deleteClass = useDeleteClass();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Class Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5" />
          Class Management
        </CardTitle>
        <CreateClassDialog />
      </CardHeader>
      <CardContent>
        <div className="rounded-md border max-h-[300px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class</TableHead>
                <TableHead>School</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classes?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    No classes found.
                  </TableCell>
                </TableRow>
              )}
              {classes?.slice(0, 20).map((cls) => (
                <TableRow key={cls.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{cls.name}</span>
                      {cls.is_demo && (
                        <Badge variant="outline" className="w-fit text-xs mt-1">Demo</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {cls.school?.name || 'Unknown'}
                  </TableCell>
                  <TableCell>
                    {cls.grade ? (
                      <Badge variant="secondary">
                        {cls.grade}{cls.section ? ` ${cls.section}` : ''}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(cls.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteClass.mutate(cls.id)}
                      disabled={deleteClass.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
