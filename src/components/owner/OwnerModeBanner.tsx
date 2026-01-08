import { usePlatformOwner } from '@/hooks/usePlatformOwner';
import { useSystemMode, useToggleSystemMode } from '@/hooks/useOwnerControls';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Crown, Zap } from 'lucide-react';

export function OwnerModeBanner() {
  const { isPlatformOwner, email } = usePlatformOwner();
  const { data: systemMode, isLoading } = useSystemMode();
  const toggleMode = useToggleSystemMode();

  if (!isPlatformOwner) return null;

  const isDemoMode = systemMode === 'demo';

  return (
    <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white px-4 py-3">
      <div className="container mx-auto flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
            <Crown className="h-3 w-3 mr-1" />
            PLATFORM OWNER
          </Badge>
          <span className="text-sm font-medium">
            FULL SYSTEM CONTROL — {email}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/10 rounded-full px-3 py-1.5">
            <Zap className={`h-4 w-4 ${isDemoMode ? 'text-amber-300' : 'text-green-300'}`} />
            <span className="text-sm font-medium">
              {isDemoMode ? 'Demo Mode' : 'Production Mode'}
            </span>
            <Switch
              checked={!isDemoMode}
              onCheckedChange={(checked) => {
                toggleMode.mutate(checked ? 'production' : 'demo');
              }}
              disabled={isLoading || toggleMode.isPending}
              className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-amber-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
