import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Star, StarOff, Archive, Pencil } from 'lucide-react';
import { usePaymentPlanTemplates, useUpdatePaymentPlanTemplate, useDeletePaymentPlanTemplate, PaymentPlanTemplate } from '@/hooks/usePaymentPlanTemplates';
import { AddPaymentPlanTemplateDialog } from './AddPaymentPlanTemplateDialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface PaymentPlanTemplateManagerProps {
  schoolId: string;
}

const FREQUENCY_LABELS: Record<string, string> = {
  weekly: 'Weekly',
  'bi-weekly': 'Bi-weekly',
  monthly: 'Monthly',
  custom: 'Custom',
};

export function PaymentPlanTemplateManager({ schoolId }: PaymentPlanTemplateManagerProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PaymentPlanTemplate | null>(null);
  const [archivingTemplate, setArchivingTemplate] = useState<PaymentPlanTemplate | null>(null);
  
  const { data: templates, isLoading } = usePaymentPlanTemplates(schoolId);
  const updateTemplate = useUpdatePaymentPlanTemplate();
  const deleteTemplate = useDeletePaymentPlanTemplate();

  const handleSetDefault = (template: PaymentPlanTemplate) => {
    updateTemplate.mutate({
      id: template.id,
      schoolId,
      is_default: true,
    });
  };

  const handleRemoveDefault = (template: PaymentPlanTemplate) => {
    updateTemplate.mutate({
      id: template.id,
      schoolId,
      is_default: false,
    });
  };

  const handleArchive = () => {
    if (archivingTemplate) {
      deleteTemplate.mutate({ id: archivingTemplate.id, schoolId });
      setArchivingTemplate(null);
    }
  };

  const formatSplitPercentages = (template: PaymentPlanTemplate) => {
    if (template.split_percentages && template.split_percentages.length > 0) {
      return template.split_percentages.map(p => `${p}%`).join(' / ');
    }
    const equalPct = Math.round(100 / template.installment_count);
    return Array(template.installment_count).fill(`${equalPct}%`).join(' / ');
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Payment Plan Templates</CardTitle>
            <CardDescription>
              Standard payment arrangements offered to parents
            </CardDescription>
          </div>
          <Button onClick={() => setShowAddDialog(true)} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Template
          </Button>
        </CardHeader>
        <CardContent>
          {templates && templates.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Installments</TableHead>
                  <TableHead>Frequency</TableHead>
                  <TableHead>Split</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {template.name}
                        {template.is_default && (
                          <Badge variant="secondary" className="text-xs">
                            <Star className="h-3 w-3 mr-1 fill-current" />
                            Default
                          </Badge>
                        )}
                      </div>
                      {template.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {template.description}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>{template.installment_count}</TableCell>
                    <TableCell>
                      {FREQUENCY_LABELS[template.frequency]}
                      {template.frequency === 'custom' && template.frequency_days && (
                        <span className="text-muted-foreground text-xs ml-1">
                          ({template.frequency_days} days)
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatSplitPercentages(template)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setEditingTemplate(template)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          {template.is_default ? (
                            <DropdownMenuItem onClick={() => handleRemoveDefault(template)}>
                              <StarOff className="h-4 w-4 mr-2" />
                              Remove Default
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={() => handleSetDefault(template)}>
                              <Star className="h-4 w-4 mr-2" />
                              Set as Default
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => setArchivingTemplate(template)}
                            className="text-destructive"
                          >
                            <Archive className="h-4 w-4 mr-2" />
                            Archive
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>No payment plan templates yet.</p>
              <p className="text-sm">Create templates to standardize payment arrangements.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <AddPaymentPlanTemplateDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        schoolId={schoolId}
      />

      {editingTemplate && (
        <AddPaymentPlanTemplateDialog
          open={!!editingTemplate}
          onOpenChange={(open) => !open && setEditingTemplate(null)}
          schoolId={schoolId}
          editingTemplate={editingTemplate}
        />
      )}

      <AlertDialog open={!!archivingTemplate} onOpenChange={(open) => !open && setArchivingTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to archive "{archivingTemplate?.name}"? 
              This won't affect existing payment plans using this template.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive}>Archive</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
