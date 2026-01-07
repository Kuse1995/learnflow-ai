import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLegalDocuments } from "@/hooks/useLaunchMode";
import { FileText, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function LegalDocument() {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const { data: documents, isLoading } = useLegalDocuments();
  
  const document = documents?.find(d => d.document_type === type);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-3xl mx-auto">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Document Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The requested legal document could not be found.
            </p>
            <Button onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container py-4 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </header>
      
      <main className="container py-8 max-w-3xl">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl">{document.title}</CardTitle>
              <Badge variant="outline">
                Version {document.version}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Effective: {new Date(document.effective_date).toLocaleDateString()}
            </p>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none">
              {document.content.split('\n\n').map((paragraph, index) => (
                <p key={index} className="mb-4 text-foreground">
                  {paragraph}
                </p>
              ))}
            </div>
            
            <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>Note:</strong> This is a placeholder document for demonstration purposes. 
                Please consult with legal counsel before deploying to production.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
