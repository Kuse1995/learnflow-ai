import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowDown, Phone, Mail, CheckCircle, Clock, AlertCircle } from "lucide-react";

export function DeliveryFallbackDiagram() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowDown className="h-5 w-5 text-primary" />
          Delivery Fallback Logic
        </CardTitle>
        <CardDescription>
          How messages are delivered with graceful offline handling
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Step 1: WhatsApp */}
          <div className="flex items-start gap-4 p-4 border rounded-lg bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 font-medium">
              1
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Phone className="h-4 w-4 text-green-600" />
                <span className="font-medium">WhatsApp (Primary)</span>
                <Badge variant="secondary" className="text-xs">Preferred</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Most parents in Zambia use WhatsApp. Messages are delivered instantly when online.
              </p>
              <div className="mt-2 flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>If delivered → Complete</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <Clock className="h-4 w-4" />
                <span>If fails → Queue for SMS</span>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <ArrowDown className="h-6 w-6 text-muted-foreground" />
          </div>

          {/* Step 2: SMS */}
          <div className="flex items-start gap-4 p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-medium">
              2
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Phone className="h-4 w-4 text-blue-600" />
                <span className="font-medium">SMS (Secondary)</span>
                <Badge variant="outline" className="text-xs">Fallback</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Works on basic phones without data. Good for rural areas with limited connectivity.
              </p>
              <div className="mt-2 flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>If delivered → Complete</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <Clock className="h-4 w-4" />
                <span>If fails → Mark as pending</span>
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <ArrowDown className="h-6 w-6 text-muted-foreground" />
          </div>

          {/* Step 3: Email (optional) */}
          <div className="flex items-start gap-4 p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground font-medium">
              3
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Email (Optional)</span>
                <Badge variant="outline" className="text-xs">If available</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Only attempted if parent has email and other channels failed.
              </p>
            </div>
          </div>

          <div className="flex justify-center">
            <ArrowDown className="h-6 w-6 text-muted-foreground" />
          </div>

          {/* Final state */}
          <div className="flex items-start gap-4 p-4 border rounded-lg border-dashed">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium text-muted-foreground">No Channel Available</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Message marked as "Not Delivered" internally. <strong>Parents are never notified of failed delivery.</strong>
              </p>
            </div>
          </div>

          {/* Key principles */}
          <div className="mt-6 p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium text-sm mb-2">Key Principles</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• <strong>No aggressive retries</strong> — Maximum 2 attempts per channel</li>
              <li>• <strong>24-hour wait</strong> — Between retry attempts</li>
              <li>• <strong>Silent failures</strong> — Parents never see "message failed" notices</li>
              <li>• <strong>Respect send hours</strong> — Messages only sent 8 AM - 6 PM</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
