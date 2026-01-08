import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Edit, FileText, Loader2 } from 'lucide-react';
import {
  useAllReminderTemplates,
  useManageTemplate,
  useToggleTemplateActive,
  TONE_CONFIG,
  ReminderTemplate,
} from '@/hooks/useFeeReminders';
import { Database } from '@/integrations/supabase/types';

type ReminderTone = Database['public']['Enums']['reminder_tone'];

interface ReminderTemplateManagerProps {
  schoolId: string;
}

interface TemplateFormData {
  title: string;
  message_body: string;
  tone: ReminderTone;
}

const defaultTemplate: TemplateFormData = {
  title: '',
  message_body: `Dear Parent/Guardian,

This is a gentle reminder regarding school fees for {term}. Our records show that {student_name} has an outstanding balance of {balance}.

Please feel free to contact the school office if you have any questions.

Thank you.`,
  tone: 'gentle',
};

export function ReminderTemplateManager({ schoolId }: ReminderTemplateManagerProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ReminderTemplate | null>(null);
  const [formData, setFormData] = useState<TemplateFormData>(defaultTemplate);

  const { data: templates = [], isLoading } = useAllReminderTemplates(schoolId);
  const manageTemplate = useManageTemplate();
  const toggleActive = useToggleTemplateActive();

  const openCreateDialog = () => {
    setEditingTemplate(null);
    setFormData(defaultTemplate);
    setDialogOpen(true);
  };

  const openEditDialog = (template: ReminderTemplate) => {
    setEditingTemplate(template);
    setFormData({
      title: template.title,
      message_body: template.message_body,
      tone: template.tone,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.message_body.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await manageTemplate.mutateAsync({
        id: editingTemplate?.id,
        school_id: schoolId,
        title: formData.title,
        message_body: formData.message_body,
        tone: formData.tone,
      });

      toast.success(editingTemplate ? 'Template updated' : 'Template created');
      setDialogOpen(false);
    } catch (error) {
      toast.error('Failed to save template');
    }
  };

  const handleToggleActive = async (template: ReminderTemplate) => {
    try {
      await toggleActive.mutateAsync({
        id: template.id,
        is_active: !template.is_active,
        school_id: schoolId,
      });
      toast.success(`Template ${template.is_active ? 'deactivated' : 'activated'}`);
    } catch (error) {
      toast.error('Failed to update template');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reminder Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Reminder Templates
              </CardTitle>
              <CardDescription>
                Create and manage message templates for fee reminders
              </CardDescription>
            </div>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              New Template
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No templates yet. Create your first reminder template.
            </p>
          ) : (
            <div className="space-y-3">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className={`border rounded-lg p-4 transition-opacity ${
                    !template.is_active ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{template.title}</h4>
                        <Badge 
                          className={TONE_CONFIG[template.tone].color} 
                          variant="secondary"
                        >
                          {TONE_CONFIG[template.tone].label}
                        </Badge>
                        {!template.is_active && (
                          <Badge variant="outline">Inactive</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {template.message_body.slice(0, 150)}...
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`active-${template.id}`} className="text-xs">
                          Active
                        </Label>
                        <Switch
                          id={`active-${template.id}`}
                          checked={template.is_active}
                          onCheckedChange={() => handleToggleActive(template)}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(template)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Edit Template' : 'Create Template'}
            </DialogTitle>
            <DialogDescription>
              Templates help ensure consistent, professional messaging.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Template Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Gentle Term Reminder"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="tone">Tone</Label>
              <Select
                value={formData.tone}
                onValueChange={(v) => setFormData({ ...formData, tone: v as ReminderTone })}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gentle">Gentle</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                  <SelectItem value="informative">Informative</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="message">Message Body</Label>
              <Textarea
                id="message"
                value={formData.message_body}
                onChange={(e) => setFormData({ ...formData, message_body: e.target.value })}
                className="mt-1.5 min-h-[200px] font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use these placeholders: {'{student_name}'}, {'{term}'}, {'{balance}'}
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={manageTemplate.isPending}>
              {manageTemplate.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Template'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
