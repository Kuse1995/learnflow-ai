import { useState } from "react";
import { toast } from "sonner";
import { Plus, List } from "lucide-react";
import { TeacherLayout } from "@/components/navigation";
import { UploadForm, UploadsList } from "@/components/uploads";
import { useClasses } from "@/hooks/useClasses";
import { useUploads, useUploadFile } from "@/hooks/useUploads";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-states";

export default function TeacherUploads() {
  const [activeTab, setActiveTab] = useState("upload");
  const { data: classes, isLoading: classesLoading } = useClasses();
  const { data: uploads, isLoading: uploadsLoading } = useUploads();
  const { mutateAsync: uploadFile, uploadProgress, isPending } = useUploadFile();

  const handleUpload = async (data: Parameters<typeof uploadFile>[0]) => {
    try {
      await uploadFile(data);
      toast.success("File uploaded successfully!");
      setActiveTab("history");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload file. Please try again.");
    }
  };

  const classOptions = classes?.map((c) => ({ id: c.id, name: c.name })) || [];

  return (
    <TeacherLayout schoolName="Omanut Academy">
      <div className="flex flex-col min-h-full pb-24 md:pb-8">
        <header className="px-4 pt-6 pb-4 border-b">
          <h1 className="text-xl font-bold">Uploads</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload tests, homework, and learning materials
          </p>
        </header>

        <div className="flex-1 p-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="upload" className="gap-2">
                <Plus className="h-4 w-4" />
                Upload
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-2">
                <List className="h-4 w-4" />
                History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upload">
              {classesLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : classOptions.length === 0 ? (
                <EmptyState
                  variant="no-classes"
                  title="No classes available"
                  description="Create a class first before uploading materials."
                  actionLabel="Go to Classes"
                  onAction={() => (window.location.href = "/teacher/classes")}
                />
              ) : (
                <UploadForm
                  classes={classOptions}
                  onSubmit={handleUpload}
                  uploadProgress={uploadProgress}
                  isUploading={isPending}
                />
              )}
            </TabsContent>

            <TabsContent value="history">
              {uploadsLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : !uploads || uploads.length === 0 ? (
                <EmptyState
                  variant="upload-first"
                  title="No uploads yet"
                  description="Upload your first test or homework to see it here."
                  actionLabel="Upload Now"
                  onAction={() => setActiveTab("upload")}
                />
              ) : (
                <UploadsList uploads={uploads} classes={classOptions} />
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </TeacherLayout>
  );
}
