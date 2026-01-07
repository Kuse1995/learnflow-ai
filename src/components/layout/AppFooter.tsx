import { useCurrentAppVersion } from "@/hooks/useFeatureFlags";

export function AppFooter() {
  const { data: version } = useCurrentAppVersion();

  return (
    <footer className="border-t bg-muted/30 py-3 px-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>© {new Date().getFullYear()} Stitch Learning Platform</span>
        {version && (
          <span className="font-mono">v{version.version}</span>
        )}
      </div>
    </footer>
  );
}
