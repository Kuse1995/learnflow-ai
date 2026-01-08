import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CheckCircle, XCircle, Clock, MessageSquare, User } from "lucide-react";
import {
  usePendingApprovalMessages,
  useApproveMessage,
  useRejectMessage,
  CATEGORY_LABELS,
  type ParentMessage,
} from "@/hooks/useParentCommunication";
import { formatDistanceToNow } from "date-fns";

interface MessageApprovalQueueProps {
  schoolId: string;
}

export function MessageApprovalQueue({ schoolId }: MessageApprovalQueueProps) {
  const { data: pendingMessages, isLoading } = usePendingApprovalMessages(schoolId);
  const approveMessage = useApproveMessage();
  const rejectMessage = useRejectMessage();

  const [rejectingMessage, setRejectingMessage] = useState<ParentMessage | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const handleApprove = (messageId: string) => {
    approveMessage.mutate(messageId);
  };

  const handleReject = () => {
    if (!rejectingMessage || !rejectionReason.trim()) return;
    rejectMessage.mutate(
      { messageId: rejectingMessage.id, reason: rejectionReason.trim() },
      {
        onSuccess: () => {
          setRejectingMessage(null);
          setRejectionReason("");
        },
      }
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Approvals
          </CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Pending Approvals
          </CardTitle>
          <CardDescription>
            Messages awaiting review before sending to parents
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingMessages && pendingMessages.length > 0 ? (
            <div className="space-y-4">
              {pendingMessages.map((message) => (
                <div
                  key={message.id}
                  className="p-4 border rounded-lg space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <Badge variant="outline">
                        {CATEGORY_LABELS[message.category]}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>

                  <div className="bg-muted/50 p-3 rounded-md">
                    <p className="text-sm whitespace-pre-wrap">{message.message_body}</p>
                  </div>

                  {message.subject && (
                    <p className="text-sm text-muted-foreground">
                      Subject: {message.subject}
                    </p>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setRejectingMessage(message)}
                      disabled={rejectMessage.isPending}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Decline
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(message.id)}
                      disabled={approveMessage.isPending}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve & Send
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No messages pending approval</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rejection dialog */}
      <Dialog open={!!rejectingMessage} onOpenChange={() => setRejectingMessage(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Message</DialogTitle>
            <DialogDescription>
              Please provide a reason for declining this message. This is for internal records only.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {rejectingMessage && (
              <div className="bg-muted/50 p-3 rounded-md">
                <p className="text-sm whitespace-pre-wrap">{rejectingMessage.message_body}</p>
              </div>
            )}

            <Textarea
              placeholder="Reason for declining..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectingMessage(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason.trim() || rejectMessage.isPending}
            >
              Decline Message
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
