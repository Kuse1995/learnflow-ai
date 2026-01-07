import { format } from "date-fns";
import { History, Bot, CheckCircle, XCircle, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuditLogs, useAiActionTraces, useUpdateAiTraceResponse } from "@/hooks/useAuditLogs";
import { useToast } from "@/hooks/use-toast";

interface TeacherActivityLogProps {
  classId?: string;
}

export function TeacherActivityLog({ classId }: TeacherActivityLogProps) {
  const { toast } = useToast();
  const { data: aiTraces, isLoading: tracesLoading } = useAiActionTraces(classId);
  const updateResponse = useUpdateAiTraceResponse();

  const handleResponse = async (traceId: string, response: 'approved' | 'ignored') => {
    try {
      await updateResponse.mutateAsync({ id: traceId, teacher_response: response });
      toast({
        title: response === 'approved' ? "Approved" : "Noted",
        description: response === 'approved' 
          ? "This AI suggestion has been approved for use"
          : "This AI suggestion has been marked as not used",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to record your response",
        variant: "destructive",
      });
    }
  };

  const pendingTraces = aiTraces?.filter(t => t.teacher_response === 'pending') || [];
  const respondedTraces = aiTraces?.filter(t => t.teacher_response !== 'pending') || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          AI Suggestions for Your Class
        </CardTitle>
        <CardDescription>
          Review AI-generated suggestions and mark whether you used them
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {tracesLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : (
          <>
            {pendingTraces.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Awaiting Your Response
                </h3>
                <div className="space-y-3">
                  {pendingTraces.map((trace) => (
                    <div 
                      key={trace.id} 
                      className="p-4 border rounded-lg bg-amber-50/50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30">
                          <Bot className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{trace.agent_name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {trace.purpose}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Generated {format(new Date(trace.created_at), "MMM d, yyyy 'at' h:mm a")}
                          </p>
                          {trace.data_sources.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Based on: {trace.data_sources.join(', ')}
                            </p>
                          )}
                          <div className="flex gap-2 mt-3">
                            <Button 
                              size="sm" 
                              onClick={() => handleResponse(trace.id, 'approved')}
                              disabled={updateResponse.isPending}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              I used this
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleResponse(trace.id, 'ignored')}
                              disabled={updateResponse.isPending}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Not used
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {respondedTraces.length > 0 && (
              <div>
                <h3 className="text-sm font-medium mb-3">Previous Suggestions</h3>
                <div className="space-y-2">
                  {respondedTraces.slice(0, 10).map((trace) => (
                    <div 
                      key={trace.id} 
                      className="p-3 border rounded-lg flex items-center gap-3"
                    >
                      <Bot className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <span className="text-sm">{trace.agent_name} - {trace.purpose}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {format(new Date(trace.created_at), "MMM d")}
                        </span>
                      </div>
                      <Badge 
                        variant={trace.teacher_response === 'approved' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {trace.teacher_response === 'approved' ? 'Used' : 'Not used'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {aiTraces?.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Bot className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No AI suggestions yet</p>
                <p className="text-sm mt-1">When AI generates suggestions for your class, they'll appear here</p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
