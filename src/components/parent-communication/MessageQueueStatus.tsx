/**
 * Message Queue Status Component
 * 
 * Displays message status with role-appropriate labels:
 * - Teachers see "Pending Delivery" for failures
 * - Admins see "Requires Attention"
 * - Platform admins see full details
 */

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Clock, RefreshCw, XCircle, CheckCircle2, AlertCircle, Send } from "lucide-react";
import { useMessagesRequiringAttention, useManualResend, useCancelMessage, useQueueStats } from "@/hooks/useMessageQueue";
import { 
  MessageState, 
  UserRole, 
  getStatusLabel, 
  STATUS_BADGE_VARIANTS,
  getAdminVisibility,
} from "@/lib/message-queue-system";
import { CATEGORY_LABELS } from "@/hooks/useParentCommunication";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type MessageCategory = Database["public"]["Enums"]["message_category"];

interface MessageQueueStatusProps {
  schoolId: string;
  role: UserRole;
}

// State icons
const STATE_ICONS: Record<MessageState, React.ReactNode> = {
  draft: <Clock className="h-4 w-4" />,
  pending: <Clock className="h-4 w-4" />,
  approved: <CheckCircle2 className="h-4 w-4" />,
  queued: <Send className="h-4 w-4" />,
  sending: <Send className="h-4 w-4 animate-pulse" />,
  sent: <CheckCircle2 className="h-4 w-4" />,
  delivered: <CheckCircle2 className="h-4 w-4" />,
  failed: <AlertCircle className="h-4 w-4" />, // Only visible to admins
};

export function MessageQueueStatus({ schoolId, role }: MessageQueueStatusProps) {
  const { data: messages, isLoading } = useMessagesRequiringAttention(schoolId, role);
  const { data: stats } = useQueueStats(schoolId);
  const resendMutation = useManualResend();
  const cancelMutation = useCancelMessage();

  const visibility = getAdminVisibility(role, "failed");

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Message Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Message Queue</span>
          {stats && (
            <div className="flex gap-2 text-sm font-normal">
              <Badge variant="secondary">{stats.pending} awaiting approval</Badge>
              <Badge variant="secondary">{stats.queued} in queue</Badge>
              {visibility.canSeeFailureReason && stats.requiresAttention > 0 && (
                <Badge variant="outline">{stats.requiresAttention} require attention</Badge>
              )}
            </div>
          )}
        </CardTitle>
        <CardDescription>
          {role === "teacher" 
            ? "Messages pending delivery to parents"
            : "Manage message delivery queue and resolve issues"
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!messages || messages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>All messages delivered successfully</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Type</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                {visibility.canManualResend && <TableHead>Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {messages.map((msg) => (
                <TableRow key={msg.id}>
                  <TableCell>
                    <Badge variant="outline">
                      {CATEGORY_LABELS[msg.category as MessageCategory]}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px]">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="truncate block">
                            {msg.message_body.substring(0, 50)}...
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>{msg.message_body}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell>
                    <Badge variant={msg.badgeVariant} className="flex items-center gap-1 w-fit">
                      {STATE_ICONS[msg.state]}
                      {msg.label}
                    </Badge>
                    {/* Only show attempt info to admins */}
                    {role !== "teacher" && msg.retry_count !== null && msg.retry_count > 0 && (
                      <span className="text-xs text-muted-foreground block mt-1">
                        {msg.retry_count} attempt(s)
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(msg.created_at), "MMM d, h:mm a")}
                  </TableCell>
                  {visibility.canManualResend && (
                    <TableCell>
                      <div className="flex gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => resendMutation.mutate({ messageId: msg.id, role })}
                                disabled={resendMutation.isPending}
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Retry delivery</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => cancelMutation.mutate({ messageId: msg.id, role })}
                                disabled={cancelMutation.isPending}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Cancel message</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
