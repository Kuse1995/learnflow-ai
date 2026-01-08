import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { HelpCircle, X } from "lucide-react";
import { useHelpDismissals, useDismissHelp } from "@/hooks/useTeacherTraining";

interface ContextualHelpProps {
  helpKey: string;
  title: string;
  content: string;
  children?: React.ReactNode;
}

export function ContextualHelp({ helpKey, title, content, children }: ContextualHelpProps) {
  const [open, setOpen] = useState(false);
  const [neverShow, setNeverShow] = useState(false);
  const { data: dismissals } = useHelpDismissals();
  const dismissHelp = useDismissHelp();

  // Check if this help has been permanently dismissed
  const isPermanentlyDismissed = dismissals?.some(
    (d) => d.help_key === helpKey && d.never_show_again
  );

  if (isPermanentlyDismissed) {
    return children || null;
  }

  const handleDismiss = async () => {
    await dismissHelp.mutateAsync({ helpKey, neverShowAgain: neverShow });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children || (
          <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-foreground">
            <HelpCircle className="h-4 w-4" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-3">
          <div className="flex items-start justify-between">
            <h4 className="font-medium">{title}</h4>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setOpen(false)}>
              <X className="h-3 w-3" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">{content}</p>
          <div className="flex items-center justify-between border-t pt-3">
            <div className="flex items-center gap-2">
              <Checkbox
                id={`never-show-${helpKey}`}
                checked={neverShow}
                onCheckedChange={(checked) => setNeverShow(checked === true)}
              />
              <label
                htmlFor={`never-show-${helpKey}`}
                className="text-xs text-muted-foreground"
              >
                Don't show again
              </label>
            </div>
            <Button size="sm" variant="outline" onClick={handleDismiss}>
              Got it
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
