import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useFeatureFlags, useToggleFeatureFlag, useSystemEnvironment } from "@/hooks/useFeatureFlags";
import { Flag, AlertTriangle, Check } from "lucide-react";

const featureCategories: Record<string, string[]> = {
  "AI Features": [
    "ai_enabled",
    "parent_insights_enabled",
    "adaptive_support_enabled",
    "lesson_differentiation_enabled",
    "learning_paths_enabled",
    "practice_sessions_enabled",
    "bulk_generation_enabled",
  ],
  "Platform": [
    "billing_enabled",
    "maintenance_banner_enabled",
    "debug_tools_enabled",
  ],
};

export function FeatureFlagsPanel() {
  const { data: flags, isLoading } = useFeatureFlags();
  const { data: environment } = useSystemEnvironment();
  const toggleFlag = useToggleFeatureFlag();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5" />
            Feature Flags
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const getFlagByKey = (key: string) => flags?.find((f) => f.key === key);

  const isActiveForEnvironment = (flag: ReturnType<typeof getFlagByKey>) => {
    if (!flag || !environment) return false;
    return flag.environment.includes(environment.environment);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flag className="h-5 w-5" />
          Feature Flags
        </CardTitle>
        <CardDescription>
          Toggle features without redeployment. Changes take effect immediately.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {Object.entries(featureCategories).map(([category, keys]) => (
          <div key={category}>
            <h4 className="font-medium text-sm text-muted-foreground mb-3">
              {category}
            </h4>
            <div className="space-y-3">
              {keys.map((key) => {
                const flag = getFlagByKey(key);
                if (!flag) return null;

                const activeForEnv = isActiveForEnvironment(flag);

                return (
                  <div
                    key={key}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {flag.key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                        </span>
                        {!activeForEnv && (
                          <Badge variant="outline" className="text-xs">
                            Not in {environment?.environment}
                          </Badge>
                        )}
                      </div>
                      {flag.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {flag.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {flag.enabled ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      )}
                      <Switch
                        checked={flag.enabled}
                        onCheckedChange={(checked) =>
                          toggleFlag.mutate({ flagId: flag.id, enabled: checked })
                        }
                        disabled={toggleFlag.isPending}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            <strong>Note:</strong> Disabling a feature will immediately prevent its use. 
            Users may see a "feature unavailable" message.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
