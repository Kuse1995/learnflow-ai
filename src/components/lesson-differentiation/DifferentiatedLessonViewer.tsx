import { format } from "date-fns";
import { FileText, Video, Link2, Presentation, Printer, Copy, Check, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useLessonSuggestion,
  useLessonResources,
  useMarkLessonReviewed,
  useAddLessonResource,
  useDeleteLessonResource,
  useDuplicateLessonSuggestion,
  type LessonResource,
} from "@/hooks/useLessonDifferentiation";

interface DifferentiatedLessonViewerProps {
  lessonId: string;
  classId: string;
  onClose?: () => void;
}

export function DifferentiatedLessonViewer({
  lessonId,
  classId,
  onClose,
}: DifferentiatedLessonViewerProps) {
  const { data: lesson, isLoading } = useLessonSuggestion(lessonId);
  const { data: resources = [] } = useLessonResources(lessonId);
  const { mutateAsync: markReviewed, isPending: isMarking } = useMarkLessonReviewed();
  const { mutateAsync: duplicateLesson, isPending: isDuplicating } = useDuplicateLessonSuggestion();

  const handleMarkReviewed = async () => {
    try {
      await markReviewed({ lessonId, classId });
      toast.success("Lesson marked as reviewed");
    } catch (error) {
      toast.error("Failed to mark lesson as reviewed");
    }
  };

  const handleDuplicate = async () => {
    if (!lesson) return;
    try {
      await duplicateLesson(lesson);
      toast.success("Lesson duplicated successfully");
    } catch (error) {
      toast.error("Failed to duplicate lesson");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-6 w-48 bg-muted animate-pulse rounded" />
        <div className="h-4 w-full bg-muted animate-pulse rounded" />
        <div className="h-32 w-full bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Lesson not found
      </div>
    );
  }

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Lesson Context Header */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">{lesson.lesson_topic}</h2>
            <p className="text-sm text-muted-foreground">{lesson.lesson_objective}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              AI-assisted (teacher-reviewed)
            </Badge>
            {lesson.teacher_accepted && (
              <Badge variant="outline" className="text-xs text-primary border-primary">
                <Check className="h-3 w-3 mr-1" />
                Reviewed
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>Generated {format(new Date(lesson.created_at), "MMM d, yyyy 'at' h:mm a")}</span>
          {lesson.lesson_duration_minutes && (
            <span>• {lesson.lesson_duration_minutes} minutes</span>
          )}
        </div>
      </div>

      <Separator />

      {/* Core Lesson Flow */}
      <section className="space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs">1</span>
          Core Lesson Flow
        </h3>
        <Card>
          <CardContent className="p-4">
            <ol className="list-decimal list-inside space-y-2 text-sm">
              {lesson.core_lesson_flow.map((step, index) => (
                <li key={index} className="leading-relaxed">{step}</li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </section>

      {/* Optional Variations */}
      {lesson.optional_variations.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs">2</span>
            Optional Variations
            <Badge variant="outline" className="text-xs font-normal">Optional</Badge>
          </h3>
          <div className="space-y-2">
            {lesson.optional_variations.map((variation, index) => (
              <Collapsible key={index}>
                <Card>
                  <CollapsibleTrigger className="w-full">
                    <CardContent className="p-4 text-left hover:bg-muted/50 transition-colors">
                      <p className="text-sm font-medium">Variation {index + 1}</p>
                      <p className="text-sm text-muted-foreground line-clamp-1">{variation}</p>
                    </CardContent>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 pb-4 px-4">
                      <p className="text-sm">{variation}</p>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        </section>
      )}

      {/* Support Strategies */}
      {lesson.support_strategies.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs">3</span>
            Support Strategies
          </h3>
          <Card>
            <CardContent className="p-4">
              <ul className="list-disc list-inside space-y-2 text-sm">
                {lesson.support_strategies.map((strategy, index) => (
                  <li key={index} className="leading-relaxed">{strategy}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Extension Opportunities */}
      {lesson.extension_opportunities.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs">4</span>
            Extension Opportunities
            <Badge variant="outline" className="text-xs font-normal">For learners ready to explore further</Badge>
          </h3>
          <Card>
            <CardContent className="p-4">
              <ul className="list-disc list-inside space-y-2 text-sm">
                {lesson.extension_opportunities.map((opportunity, index) => (
                  <li key={index} className="leading-relaxed">{opportunity}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Materials Needed */}
      {lesson.materials_needed && lesson.materials_needed.length > 0 && (
        <section className="space-y-3">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <span className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs">5</span>
            Materials Needed
          </h3>
          <Card>
            <CardContent className="p-4">
              <ul className="list-disc list-inside space-y-1 text-sm">
                {lesson.materials_needed.map((material, index) => (
                  <li key={index}>{material}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </section>
      )}

      {/* Attached Resources */}
      <section className="space-y-3 print:hidden">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm">Attached Resources</h3>
          <AddResourceDialog lessonId={lessonId} />
        </div>
        {resources.length === 0 ? (
          <Card>
            <CardContent className="py-6 text-center text-muted-foreground text-sm">
              No resources attached yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {resources.map((resource) => (
              <ResourceCard key={resource.id} resource={resource} lessonId={lessonId} />
            ))}
          </div>
        )}
      </section>

      {/* Disclaimer */}
      <Card className="bg-muted/50 border-dashed print:hidden">
        <CardContent className="p-4 text-center">
          <p className="text-xs text-muted-foreground">
            This lesson guidance is optional and intended to support professional judgment.
          </p>
        </CardContent>
      </Card>

      {/* Teacher Controls */}
      <div className="flex items-center gap-2 flex-wrap print:hidden">
        {!lesson.teacher_accepted && (
          <Button onClick={handleMarkReviewed} disabled={isMarking}>
            <Check className="h-4 w-4 mr-2" />
            {isMarking ? "Marking..." : "Mark as Reviewed"}
          </Button>
        )}
        <Button variant="outline" onClick={handleDuplicate} disabled={isDuplicating}>
          <Copy className="h-4 w-4 mr-2" />
          {isDuplicating ? "Duplicating..." : "Duplicate & Edit"}
        </Button>
        <Button variant="outline" onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Print / Export PDF
        </Button>
      </div>
    </div>
  );
}

function ResourceCard({ resource, lessonId }: { resource: LessonResource; lessonId: string }) {
  const { mutateAsync: deleteResource, isPending } = useDeleteLessonResource();

  const getIcon = () => {
    switch (resource.type) {
      case "youtube":
        return <Video className="h-4 w-4" />;
      case "pdf":
        return <FileText className="h-4 w-4" />;
      case "slides":
        return <Presentation className="h-4 w-4" />;
      default:
        return <Link2 className="h-4 w-4" />;
    }
  };

  const handleDelete = async () => {
    try {
      await deleteResource({ resourceId: resource.id, lessonId });
      toast.success("Resource removed");
    } catch (error) {
      toast.error("Failed to remove resource");
    }
  };

  return (
    <Card>
      <CardContent className="p-3 flex items-center gap-3">
        <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{resource.title || resource.url}</p>
          <p className="text-xs text-muted-foreground capitalize">{resource.type}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            asChild
          >
            <a href={resource.url} target="_blank" rel="noopener noreferrer">
              <Link2 className="h-4 w-4" />
            </a>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={isPending}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function AddResourceDialog({ lessonId }: { lessonId: string }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"youtube" | "pdf" | "slides" | "link">("link");
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const { mutateAsync: addResource, isPending } = useAddLessonResource();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    try {
      await addResource({ lessonId, type, url, title: title || undefined });
      toast.success("Resource added");
      setOpen(false);
      setUrl("");
      setTitle("");
      setType("link");
    } catch (error) {
      toast.error("Failed to add resource");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Attach Resource
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Attach Resource</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">Resource Type</Label>
            <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="youtube">YouTube Video</SelectItem>
                <SelectItem value="pdf">PDF Document</SelectItem>
                <SelectItem value="slides">Presentation (Slides)</SelectItem>
                <SelectItem value="link">Other Link</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="url">URL</Label>
            <Input
              id="url"
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Title (optional)</Label>
            <Input
              id="title"
              placeholder="Resource title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Adding..." : "Add Resource"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
