import { useState } from "react";
import { Lightbulb, BookOpen, MessageSquare, Sparkles, Clock, Loader2, AlertCircle } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { DataReadinessIndicator } from "@/components/ui/data-readiness-indicator";
import { useTeachingSuggestions, type TeachingSuggestion, type TeachingSuggestionsResult } from "@/hooks/useTeachingSuggestions";
import { useClassDataReadiness } from "@/hooks/useDataReadiness";
import { toast } from "sonner";

interface TeachingSuggestionsViewerProps {
  classId: string;
  className: string;
  uploadId?: string;
  trigger?: React.ReactNode;
}

const categoryConfig: Record<TeachingSuggestion["category"], { label: string; icon: typeof Lightbulb; color: string }> = {
  concept_clarification: {
    label: "Concept Clarification",
    icon: Lightbulb,
    color: "text-amber-600 bg-amber-50 border-amber-200",
  },
  practice_reinforcement: {
    label: "Practice Reinforcement",
    icon: BookOpen,
    color: "text-blue-600 bg-blue-50 border-blue-200",
  },
  language_support: {
    label: "Language & Comprehension",
    icon: MessageSquare,
    color: "text-purple-600 bg-purple-50 border-purple-200",
  },
  engagement_strategies: {
    label: "Engagement Strategies",
    icon: Sparkles,
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
  },
};

export function TeachingSuggestionsViewer({ classId, className, uploadId, trigger }: TeachingSuggestionsViewerProps) {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<TeachingSuggestionsResult | null>(null);
  const { mutate: getSuggestions, isPending } = useTeachingSuggestions();
  const { data: readiness, isLoading: isLoadingReadiness } = useClassDataReadiness(classId);

  const handleGetSuggestions = () => {
    setOpen(true);
    setResults(null);

    getSuggestions(
      { classId, uploadId },
      {
        onSuccess: (data) => {
          setResults(data);
        },
        onError: (error) => {
          console.error("Teaching suggestions error:", error);
          toast.error(error.message || "Failed to generate teaching suggestions");
        },
      }
    );
  };

  const groupedSuggestions = results?.suggestions.reduce(
    (acc, suggestion) => {
      if (!acc[suggestion.category]) {
        acc[suggestion.category] = [];
      }
      acc[suggestion.category].push(suggestion);
      return acc;
    },
    {} as Record<string, TeachingSuggestion[]>
  );

  return (
    <>
      {trigger ? (
        <div onClick={handleGetSuggestions}>{trigger}</div>
      ) : (
        <Button onClick={handleGetSuggestions} variant="outline" className="gap-2">
          <Lightbulb className="h-4 w-4" />
          Get Teaching Suggestions
        </Button>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col">
          <SheetHeader className="px-6 py-4 border-b shrink-0">
            <SheetTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />
              Teaching Suggestions
            </SheetTitle>
            <p className="text-sm text-muted-foreground">{className}</p>
          </SheetHeader>

          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              {isPending && (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <div className="text-center">
                    <p className="font-medium">Analyzing class patterns...</p>
                    <p className="text-sm text-muted-foreground">
                      Generating personalized teaching strategies
                    </p>
                  </div>
                </div>
              )}

              {!isPending && !results && (
                <div className="flex flex-col items-center justify-center py-12 gap-4 text-center">
                  <AlertCircle className="h-8 w-8 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    Unable to generate suggestions. Please try again.
                  </p>
                  <Button onClick={handleGetSuggestions} variant="outline" size="sm">
                    Retry
                  </Button>
                </div>
              )}

              {results && (
                <>
                  {/* Data Readiness Indicator */}
                  <DataReadinessIndicator 
                    readiness={readiness} 
                    isLoading={isLoadingReadiness} 
                  />

                  {/* Context Header */}
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {results.subject && (
                        <Badge variant="secondary">{results.subject}</Badge>
                      )}
                      {results.topics?.map((topic) => (
                        <Badge key={topic} variant="outline">
                          {topic}
                        </Badge>
                      ))}
                    </div>
                    {results.suggestions.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No specific suggestions at this time. The class appears to be progressing well.
                      </p>
                    )}
                  </div>

                  {/* Grouped Suggestions */}
                  {groupedSuggestions && Object.entries(groupedSuggestions).map(([category, suggestions]) => {
                    const config = categoryConfig[category as TeachingSuggestion["category"]];
                    const Icon = config.icon;

                    return (
                      <div key={category} className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-md ${config.color}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <h3 className="font-semibold">{config.label}</h3>
                        </div>

                        <div className="space-y-3 pl-8">
                          {suggestions.map((suggestion, idx) => (
                            <Card key={idx} className="border-l-4" style={{ borderLeftColor: `var(--${category === 'concept_clarification' ? 'amber' : category === 'practice_reinforcement' ? 'blue' : category === 'language_support' ? 'purple' : 'emerald'}-500, hsl(var(--primary)))` }}>
                              <CardHeader className="pb-2">
                                <CardTitle className="text-base">{suggestion.title}</CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-3">
                                <p className="text-sm text-muted-foreground">
                                  {suggestion.description}
                                </p>
                                <ul className="space-y-1.5">
                                  {suggestion.strategies.map((strategy, sIdx) => (
                                    <li key={sIdx} className="text-sm flex items-start gap-2">
                                      <span className="text-primary mt-1.5">•</span>
                                      <span>{strategy}</span>
                                    </li>
                                  ))}
                                </ul>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    );
                  })}

                  {/* Pacing Notes */}
                  {results.pacing_notes && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <h3 className="font-semibold text-sm">Pacing & Sequencing Notes</h3>
                        </div>
                        <p className="text-sm text-muted-foreground pl-6">
                          {results.pacing_notes}
                        </p>
                      </div>
                    </>
                  )}

                  {/* Disclaimer */}
                  <div className="bg-muted/50 rounded-lg p-4 text-xs text-muted-foreground">
                    <p>
                      These suggestions are optional recommendations based on observed patterns.
                      Adapt them as you see fit for your classroom context.
                    </p>
                  </div>
                </>
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  );
}
