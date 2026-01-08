import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Send, CheckCircle, Clock, AlertCircle, Phone, Mail, Info } from "lucide-react";
import {
  useParentMessages,
  CATEGORY_LABELS,
  STATUS_LABELS,
  type ParentMessage,
} from "@/hooks/useParentCommunication";
import { formatDistanceToNow } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type DeliveryStatus = Database["public"]["Enums"]["delivery_status"];

interface DeliveryStatusTrackerProps {
  studentId: string;
}

const STATUS_ICONS: Record<DeliveryStatus, React.ReactNode> = {
  pending: <Clock className="h-4 w-4 text-muted-foreground" />,
  queued: <Clock className="h-4 w-4 text-blue-500" />,
  sent: <Send className="h-4 w-4 text-blue-500" />,
  delivered: <CheckCircle className="h-4 w-4 text-green-500" />,
  failed: <AlertCircle className="h-4 w-4 text-amber-500" />,
  no_channel: <AlertCircle className="h-4 w-4 text-muted-foreground" />,
};

const STATUS_VARIANTS: Record<DeliveryStatus, "default" | "secondary" | "outline" | "destructive"> = {
  pending: "outline",
  queued: "secondary",
  sent: "secondary",
  delivered: "default",
  failed: "outline",
  no_channel: "outline",
};

const CHANNEL_ICONS = {
  whatsapp: <Phone className="h-3 w-3" />,
  sms: <Phone className="h-3 w-3" />,
  email: <Mail className="h-3 w-3" />,
};

export function DeliveryStatusTracker({ studentId }: DeliveryStatusTrackerProps) {
  const { data: messages, isLoading } = useParentMessages(studentId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Message History
          </CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5 text-primary" />
          Message History
        </CardTitle>
        <CardDescription>
          Recent communications with parents (delivery status is internal only)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {messages && messages.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Channel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {messages.map((message) => (
                <TableRow key={message.id}>
                  <TableCell>
                    <Badge variant="outline" className="font-normal">
                      {CATEGORY_LABELS[message.category]}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p className="truncate text-sm">{message.message_body}</p>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[300px]">
                          <p className="whitespace-pre-wrap">{message.message_body}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell>
                    {message.attempted_channel ? (
                      <div className="flex items-center gap-1 capitalize">
                        {CHANNEL_ICONS[message.attempted_channel]}
                        <span className="text-sm">{message.attempted_channel}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {STATUS_ICONS[message.delivery_status]}
                      <Badge variant={STATUS_VARIANTS[message.delivery_status]} className="font-normal">
                        {STATUS_LABELS[message.delivery_status]}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Send className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No messages sent yet</p>
          </div>
        )}

        {/* Offline-aware notice */}
        <div className="mt-4 p-3 bg-muted/50 rounded-lg flex items-start gap-2">
          <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium">Offline-Aware Delivery</p>
            <p>
              If WhatsApp fails, the system will try SMS. If SMS fails, the message is marked as pending.
              We do not retry aggressively or notify parents of failed deliveries.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
