import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Send, MessageSquare, Phone, Mail, AlertCircle, CheckCircle } from "lucide-react";
import {
  useSendParentMessage,
  useMessageTemplates,
  useCommunicationRules,
  CATEGORY_LABELS,
  getAvailableChannel,
  canReceiveCategory,
  fillTemplate,
  type ParentContact,
} from "@/hooks/useParentCommunication";
import type { Database } from "@/integrations/supabase/types";

type MessageCategory = Database["public"]["Enums"]["message_category"];

interface MessageComposerProps {
  schoolId: string;
  studentId: string;
  studentName: string;
  contact: ParentContact;
  onClose?: () => void;
}

const CHANNEL_ICONS = {
  whatsapp: Phone,
  sms: Phone,
  email: Mail,
};

const MAX_MESSAGE_LENGTH = 160; // SMS-friendly length

export function MessageComposer({ schoolId, studentId, studentName, contact, onClose }: MessageComposerProps) {
  const [category, setCategory] = useState<MessageCategory>("learning_update");
  const [messageBody, setMessageBody] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  const { data: templates } = useMessageTemplates(schoolId, category);
  const { data: rules } = useCommunicationRules(schoolId);
  const sendMessage = useSendParentMessage();

  const currentRule = rules?.find((r) => r.category === category);
  const availableChannel = getAvailableChannel(contact);
  const canReceive = canReceiveCategory(contact, category);
  const requiresApproval = currentRule?.requires_approval ?? false;

  const ChannelIcon = availableChannel ? CHANNEL_ICONS[availableChannel] : AlertCircle;

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates?.find((t) => t.id === templateId);
    if (template) {
      const filled = fillTemplate(template.template_body, {
        student_name: studentName,
      });
      setMessageBody(filled);
    }
  };

  const handleSend = () => {
    if (!messageBody.trim() || !availableChannel) return;

    sendMessage.mutate(
      {
        school_id: schoolId,
        parent_contact_id: contact.id,
        student_id: studentId,
        category,
        message_body: messageBody.trim(),
        priority_level: currentRule?.priority_level ?? 2,
        requires_approval: requiresApproval,
      },
      {
        onSuccess: () => {
          setMessageBody("");
          setSelectedTemplateId("");
          onClose?.();
        },
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Send Message to {contact.parent_name}
        </CardTitle>
        <CardDescription>
          {contact.relationship && `${contact.relationship} of `}{studentName}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Channel indicator */}
        <div className="flex items-center gap-2">
          <ChannelIcon className="h-4 w-4" />
          {availableChannel ? (
            <span className="text-sm">
              Will send via <span className="font-medium capitalize">{availableChannel}</span>
              {availableChannel === "whatsapp" && contact.whatsapp_number && (
                <span className="text-muted-foreground"> ({contact.whatsapp_number})</span>
              )}
            </span>
          ) : (
            <span className="text-sm text-destructive">No contact channel available</span>
          )}
        </div>

        {/* Category preference check */}
        {!canReceive && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This parent has opted out of receiving {CATEGORY_LABELS[category].toLowerCase()} messages
            </AlertDescription>
          </Alert>
        )}

        {/* Message category */}
        <div className="space-y-2">
          <Label>Message Type</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as MessageCategory)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(CATEGORY_LABELS) as [MessageCategory, string][]).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Template selector */}
        {templates && templates.length > 0 && (
          <div className="space-y-2">
            <Label>Use Template (optional)</Label>
            <Select value={selectedTemplateId} onValueChange={handleTemplateSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select a template..." />
              </SelectTrigger>
              <SelectContent>
                {templates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.template_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Message body */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Message</Label>
            <span className={`text-xs ${messageBody.length > MAX_MESSAGE_LENGTH ? "text-amber-600" : "text-muted-foreground"}`}>
              {messageBody.length}/{MAX_MESSAGE_LENGTH}
            </span>
          </div>
          <Textarea
            value={messageBody}
            onChange={(e) => setMessageBody(e.target.value)}
            placeholder="Write a short, respectful message..."
            rows={4}
            className="resize-none"
          />
          {messageBody.length > MAX_MESSAGE_LENGTH && (
            <p className="text-xs text-amber-600">
              Messages over {MAX_MESSAGE_LENGTH} characters may be split into multiple SMS
            </p>
          )}
        </div>

        {/* Approval notice */}
        {requiresApproval && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              This message type requires approval before sending
            </AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2">
          <div className="flex gap-2">
            {currentRule && (
              <Badge variant="outline">
                Max {currentRule.max_messages_per_week}/week
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            {onClose && (
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
            )}
            <Button
              onClick={handleSend}
              disabled={!messageBody.trim() || !availableChannel || !canReceive || sendMessage.isPending}
            >
              <Send className="h-4 w-4 mr-2" />
              {requiresApproval ? "Submit for Approval" : "Send Message"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
