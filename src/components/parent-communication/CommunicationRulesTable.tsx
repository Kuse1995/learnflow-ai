import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, Shield, MessageSquare } from "lucide-react";
import { CATEGORY_LABELS, PRIORITY_LABELS, type CommunicationRule } from "@/hooks/useParentCommunication";

interface CommunicationRulesTableProps {
  rules: CommunicationRule[];
  isLoading?: boolean;
}

export function CommunicationRulesTable({ rules, isLoading }: CommunicationRulesTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Communication Guidelines
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
          <Shield className="h-5 w-5 text-primary" />
          Communication Guidelines
        </CardTitle>
        <CardDescription>
          These guidelines ensure respectful, non-pressuring communication with parents
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Message Type</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Approval Required</TableHead>
              <TableHead>Weekly Limit</TableHead>
              <TableHead>Send Hours</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.map((rule) => (
              <TableRow key={rule.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    {CATEGORY_LABELS[rule.category]}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={rule.priority_level >= 3 ? "default" : "secondary"}>
                    {PRIORITY_LABELS[rule.priority_level] || "Normal"}
                  </Badge>
                </TableCell>
                <TableCell>
                  {rule.requires_approval ? (
                    <div className="flex items-center gap-1 text-amber-600">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm">Yes</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">No</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <span className="text-sm">{rule.max_messages_per_week ?? "Unlimited"}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span className="text-sm">
                      {rule.allowed_send_hours_start ?? 8}:00 - {rule.allowed_send_hours_end ?? 18}:00
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {rules.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No communication rules configured yet
          </div>
        )}

        {/* Philosophy reminder */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium text-sm mb-2">Communication Principles</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Messages are short, respectful, and non-judgmental</li>
            <li>• No automated reminders that pressure parents</li>
            <li>• No financial shaming language</li>
            <li>• Sensitive messages require teacher approval</li>
            <li>• Delivery failures are handled gracefully (no aggressive retries)</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
