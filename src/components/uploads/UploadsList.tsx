import { format } from "date-fns";
import { FileText, Image, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Upload } from "@/hooks/useUploads";

interface UploadsListProps {
  uploads: Upload[];
  classes: { id: string; name: string }[];
}

export function UploadsList({ uploads, classes }: UploadsListProps) {
  const getClassName = (classId: string) => {
    const cls = classes.find((c) => c.id === classId);
    return cls?.name || "Unknown Class";
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "test":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "homework":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "worksheet":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "";
    }
  };

  const isImage = (type: string) => type.startsWith("image/");

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (uploads.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {uploads.map((upload) => (
        <Card key={upload.id}>
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-muted">
                {isImage(upload.file_type) ? (
                  <Image className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <FileText className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-medium truncate">{upload.topic}</h4>
                  <Badge variant="secondary" className={getTypeColor(upload.upload_type)}>
                    {upload.upload_type}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {upload.subject} • {getClassName(upload.class_id)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(upload.date), "MMM d, yyyy")} •{" "}
                  {formatFileSize(upload.file_size)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                asChild
              >
                <a
                  href={upload.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
