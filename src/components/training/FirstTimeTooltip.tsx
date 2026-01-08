import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { X } from "lucide-react";
import { useHelpDismissals, useDismissHelp } from "@/hooks/useTeacherTraining";

interface FirstTimeTooltipProps {
  helpKey: string;
  title: string;
  content: string;
  position?: "top" | "bottom" | "left" | "right";
  children: React.ReactNode;
}

export function FirstTimeTooltip({
  helpKey,
  title,
  content,
  position = "bottom",
  children,
}: FirstTimeTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const { data: dismissals, isLoading } = useHelpDismissals();
  const dismissHelp = useDismissHelp();

  useEffect(() => {
    if (!isLoading && dismissals) {
      const isDismissed = dismissals.some((d) => d.help_key === helpKey);
      setIsVisible(!isDismissed);
    }
  }, [dismissals, isLoading, helpKey]);

  const handleDismiss = async (neverShowAgain = false) => {
    await dismissHelp.mutateAsync({ helpKey, neverShowAgain });
    setIsVisible(false);
  };

  const positionClasses = {
    top: "bottom-full mb-2 left-1/2 -translate-x-1/2",
    bottom: "top-full mt-2 left-1/2 -translate-x-1/2",
    left: "right-full mr-2 top-1/2 -translate-y-1/2",
    right: "left-full ml-2 top-1/2 -translate-y-1/2",
  };

  return (
    <div className="relative inline-block">
      {children}
      {isVisible && (
        <Card className={`absolute z-50 w-64 shadow-lg ${positionClasses[position]}`}>
          <CardContent className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="mb-1 text-sm font-medium">{title}</h4>
                <p className="text-xs text-muted-foreground">{content}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => handleDismiss(true)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <div className="mt-2 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-7 flex-1 text-xs"
                onClick={() => handleDismiss(true)}
              >
                Don't show again
              </Button>
              <Button
                size="sm"
                className="h-7 flex-1 text-xs"
                onClick={() => handleDismiss(false)}
              >
                Got it
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
