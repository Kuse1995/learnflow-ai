import { TeacherLayout } from "@/components/navigation";
import { EmptyState } from "@/components/empty-states";

export default function TeacherUploads() {
  return (
    <TeacherLayout schoolName="Stitch Academy">
      <div className="flex flex-col min-h-full pb-24 md:pb-8">
        <header className="px-4 pt-6 pb-4 border-b">
          <h1 className="text-xl font-bold">Uploads</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload tests, homework, and learning materials
          </p>
        </header>

        <div className="flex-1 flex items-center justify-center p-4">
          <EmptyState
            variant="upload-first"
            title="No uploads yet"
            description="Upload your first test or homework assignment to get started."
            actionLabel="Upload File"
            onAction={() => {
              // TODO: Implement file upload
              console.log("Upload clicked");
            }}
          />
        </div>
      </div>
    </TeacherLayout>
  );
}
