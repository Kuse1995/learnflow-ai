import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  Users, 
  Phone, 
  Printer, 
  MessageCircle, 
  Send,
  Eye,
  FileText,
  Loader2 
} from 'lucide-react';
import {
  useReminderTemplates,
  useCreateReminder,
  parseTemplateMessage,
  formatBalance,
  getTermLabel,
  DELIVERY_METHODS,
  TONE_CONFIG,
  ReminderTemplate,
} from '@/hooks/useFeeReminders';
import { Database } from '@/integrations/supabase/types';

type DeliveryMethod = Database['public']['Enums']['reminder_delivery_method'];

interface StudentForReminder {
  id: string;
  name: string;
  balance: number;
  classId?: string;
}

interface SendReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  students: StudentForReminder[];
  schoolId: string;
  academicYear: number;
  term?: number;
  currency?: string;
}

const DeliveryIcon = ({ method }: { method: string }) => {
  switch (method) {
    case 'in_person': return <Users className="h-4 w-4" />;
    case 'phone_call': return <Phone className="h-4 w-4" />;
    case 'printed_notice': return <Printer className="h-4 w-4" />;
    case 'whatsapp_manual': return <MessageCircle className="h-4 w-4" />;
    default: return null;
  }
};

export function SendReminderDialog({
  open,
  onOpenChange,
  students,
  schoolId,
  academicYear,
  term,
  currency = 'ZMW',
}: SendReminderDialogProps) {
  const [messageType, setMessageType] = useState<'template' | 'custom'>('template');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [customMessage, setCustomMessage] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>('in_person');
  const [previewStudent, setPreviewStudent] = useState<StudentForReminder | null>(null);

  const { data: templates = [], isLoading: templatesLoading } = useReminderTemplates(schoolId);
  const createReminder = useCreateReminder();

  const selectedTemplate = useMemo(() => 
    templates.find(t => t.id === selectedTemplateId),
    [templates, selectedTemplateId]
  );

  // Generate preview message for a student
  const getPreviewMessage = (student: StudentForReminder): string => {
    const variables = {
      studentName: student.name,
      term: getTermLabel(term, academicYear),
      balance: formatBalance(student.balance, currency),
    };

    if (messageType === 'template' && selectedTemplate) {
      return parseTemplateMessage(selectedTemplate.message_body, variables);
    } else if (messageType === 'custom' && customMessage) {
      return parseTemplateMessage(customMessage, variables);
    }
    return '';
  };

  const canSend = useMemo(() => {
    if (students.length === 0) return false;
    if (messageType === 'template' && !selectedTemplateId) return false;
    if (messageType === 'custom' && !customMessage.trim()) return false;
    return true;
  }, [students.length, messageType, selectedTemplateId, customMessage]);

  const handleSend = async () => {
    if (!canSend) return;

    try {
      // Log reminders for all selected students
      for (const student of students) {
        const finalMessage = getPreviewMessage(student);
        
        await createReminder.mutateAsync({
          school_id: schoolId,
          student_id: student.id,
          class_id: student.classId,
          ledger_balance_snapshot: student.balance,
          template_id: messageType === 'template' ? selectedTemplateId || undefined : undefined,
          custom_message: messageType === 'custom' ? customMessage : undefined,
          final_message: finalMessage,
          sent_via: deliveryMethod,
          academic_year: academicYear,
          term,
          student_name_snapshot: student.name,
        });
      }

      toast.success(
        `Reminder logged for ${students.length} student${students.length > 1 ? 's' : ''}`,
        { description: `Delivery method: ${DELIVERY_METHODS.find(m => m.value === deliveryMethod)?.label}` }
      );
      
      onOpenChange(false);
      // Reset state
      setSelectedTemplateId(null);
      setCustomMessage('');
      setPreviewStudent(null);
    } catch (error) {
      toast.error('Failed to log reminder');
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Send Fee Reminder
          </DialogTitle>
          <DialogDescription>
            Log a manual reminder for {students.length} student{students.length > 1 ? 's' : ''}.
            This records the reminder — it does not automatically send messages.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Selected Students */}
            <div>
              <Label className="text-sm font-medium">Selected Students</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {students.slice(0, 5).map(student => (
                  <Badge key={student.id} variant="secondary">
                    {student.name} • {formatBalance(student.balance, currency)}
                  </Badge>
                ))}
                {students.length > 5 && (
                  <Badge variant="outline">+{students.length - 5} more</Badge>
                )}
              </div>
            </div>

            <Separator />

            {/* Message Type Selection */}
            <Tabs value={messageType} onValueChange={(v) => setMessageType(v as 'template' | 'custom')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="template" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Use Template
                </TabsTrigger>
                <TabsTrigger value="custom" className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Custom Message
                </TabsTrigger>
              </TabsList>

              <TabsContent value="template" className="mt-4 space-y-3">
                {templatesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : templates.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No templates available. Create templates in the admin settings.
                  </p>
                ) : (
                  <RadioGroup 
                    value={selectedTemplateId || ''} 
                    onValueChange={setSelectedTemplateId}
                  >
                    {templates.map((template) => (
                      <div
                        key={template.id}
                        className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedTemplateId === template.id 
                            ? 'border-primary bg-primary/5' 
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => setSelectedTemplateId(template.id)}
                      >
                        <RadioGroupItem value={template.id} id={template.id} />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <Label htmlFor={template.id} className="font-medium cursor-pointer">
                              {template.title}
                            </Label>
                            <Badge className={TONE_CONFIG[template.tone].color} variant="secondary">
                              {TONE_CONFIG[template.tone].label}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {template.message_body.slice(0, 120)}...
                          </p>
                        </div>
                      </div>
                    ))}
                  </RadioGroup>
                )}
              </TabsContent>

              <TabsContent value="custom" className="mt-4 space-y-3">
                <div>
                  <Label htmlFor="custom-message">Custom Message</Label>
                  <Textarea
                    id="custom-message"
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    placeholder={`Dear Parent/Guardian,

This is a gentle reminder regarding school fees for {term}...

Use {student_name}, {term}, and {balance} as placeholders.`}
                    className="mt-1.5 min-h-[150px]"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Available variables: {'{student_name}'}, {'{term}'}, {'{balance}'}
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            <Separator />

            {/* Delivery Method */}
            <div>
              <Label className="text-sm font-medium">How was/will this be delivered?</Label>
              <RadioGroup
                value={deliveryMethod}
                onValueChange={(v) => setDeliveryMethod(v as DeliveryMethod)}
                className="mt-2 grid grid-cols-2 gap-2"
              >
                {DELIVERY_METHODS.map((method) => (
                  <div
                    key={method.value}
                    className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      deliveryMethod === method.value 
                        ? 'border-primary bg-primary/5' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setDeliveryMethod(method.value)}
                  >
                    <RadioGroupItem value={method.value} id={method.value} />
                    <DeliveryIcon method={method.value} />
                    <Label htmlFor={method.value} className="cursor-pointer">
                      {method.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <Separator />

            {/* Preview */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Message Preview
                </Label>
                {students.length > 1 && (
                  <select
                    className="text-xs border rounded px-2 py-1"
                    value={previewStudent?.id || students[0]?.id || ''}
                    onChange={(e) => setPreviewStudent(students.find(s => s.id === e.target.value) || null)}
                  >
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                )}
              </div>
              <Card>
                <CardContent className="p-4">
                  {canSend ? (
                    <pre className="whitespace-pre-wrap text-sm font-sans">
                      {getPreviewMessage(previewStudent || students[0])}
                    </pre>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      Select a template or write a custom message to preview
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSend} 
            disabled={!canSend || createReminder.isPending}
          >
            {createReminder.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Logging...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Log Reminder{students.length > 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
