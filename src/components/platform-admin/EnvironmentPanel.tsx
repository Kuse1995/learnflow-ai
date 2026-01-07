import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { useSystemEnvironment, useUpdateEnvironment, useCurrentAppVersion, useAppVersions } from "@/hooks/useFeatureFlags";
import { Server, Code, Rocket, Bug, Clock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

export function EnvironmentPanel() {
  const { data: environment, isLoading: envLoading } = useSystemEnvironment();
  const { data: currentVersion, isLoading: versionLoading } = useCurrentAppVersion();
  const { data: allVersions } = useAppVersions();
  const updateEnv = useUpdateEnvironment();

  if (envLoading || versionLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Environment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const envConfig = {
    development: {
      icon: Code,
      color: "bg-amber-100 text-amber-800 border-amber-300",
      description: "Development environment with debug tools enabled",
    },
    staging: {
      icon: Server,
      color: "bg-blue-100 text-blue-800 border-blue-300",
      description: "Staging environment for testing before production",
    },
    production: {
      icon: Rocket,
      color: "bg-green-100 text-green-800 border-green-300",
      description: "Live production environment",
    },
  };

  const config = environment ? envConfig[environment.environment] : envConfig.development;
  const Icon = config.icon;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            Environment Configuration
          </CardTitle>
          <CardDescription>
            Current deployment environment and settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div>
              <div className="flex items-center gap-2">
                <Badge className={config.color}>
                  {environment?.environment.toUpperCase()}
                </Badge>
                {environment?.is_production && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    PRODUCTION
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {config.description}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Last Deployed
              </div>
              <p className="font-medium mt-1">
                {environment?.deployed_at
                  ? format(new Date(environment.deployed_at), "PPp")
                  : "Unknown"}
              </p>
            </div>

            <div className="p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Rocket className="h-4 w-4" />
                Version
              </div>
              <p className="font-medium mt-1">
                {environment?.version_tag || currentVersion?.version || "1.0.0"}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <Bug className="h-5 w-5 text-purple-600" />
              <div>
                <p className="font-medium">Debug Mode</p>
                <p className="text-sm text-muted-foreground">
                  Enable developer tools and verbose logging
                </p>
              </div>
            </div>
            <Switch
              checked={environment?.debug_mode_enabled || false}
              onCheckedChange={(checked) =>
                updateEnv.mutate({ debug_mode_enabled: checked })
              }
              disabled={updateEnv.isPending || environment?.is_production}
            />
          </div>

          {environment?.is_production && (
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              Debug mode cannot be enabled in production
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Version History</CardTitle>
          <CardDescription>
            Recent platform releases
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {allVersions?.slice(0, 5).map((version) => (
              <div
                key={version.id}
                className={`p-3 rounded-lg border ${
                  version.is_current ? "bg-primary/5 border-primary/20" : "bg-muted/30"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium">v{version.version}</span>
                    {version.is_current && (
                      <Badge variant="default" className="text-xs">Current</Badge>
                    )}
                    {version.breaking_change && (
                      <Badge variant="destructive" className="text-xs">Breaking</Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(version.released_at), "PP")}
                  </span>
                </div>
                {version.notes && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {version.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
