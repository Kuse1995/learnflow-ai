import { Badge } from "@/components/ui/badge";
import { useSystemEnvironment, useCurrentAppVersion } from "@/hooks/useFeatureFlags";
import { AlertTriangle, Code, Server, Rocket } from "lucide-react";

export function EnvironmentBadge() {
  const { data: environment } = useSystemEnvironment();
  const { data: version } = useCurrentAppVersion();

  if (!environment) return null;

  // Only show badge in non-production environments
  if (environment.is_production) {
    return null;
  }

  const envConfig = {
    development: {
      label: "Development",
      icon: Code,
      className: "bg-amber-100 text-amber-800 border-amber-300",
    },
    staging: {
      label: "Staging",
      icon: Server,
      className: "bg-blue-100 text-blue-800 border-blue-300",
    },
    production: {
      label: "Production",
      icon: Rocket,
      className: "bg-green-100 text-green-800 border-green-300",
    },
  };

  const config = envConfig[environment.environment];
  const Icon = config.icon;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2">
      <Badge variant="outline" className={`${config.className} py-1 px-3`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
      {version && (
        <Badge variant="secondary" className="py-1 px-2 text-xs">
          v{version.version}
        </Badge>
      )}
      {environment.debug_mode_enabled && (
        <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300 py-1 px-2 text-xs">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Debug
        </Badge>
      )}
    </div>
  );
}
