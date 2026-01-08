import { usePlatformOwner } from '@/hooks/usePlatformOwner';
import { Badge } from '@/components/ui/badge';
import { Crown } from 'lucide-react';

export function PlatformOwnerBanner() {
  const { isPlatformOwner, email } = usePlatformOwner();
  
  if (!isPlatformOwner) return null;
  
  return (
    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-2">
      <div className="container mx-auto flex items-center gap-3">
        <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
          <Crown className="h-3 w-3 mr-1" />
          PLATFORM OWNER
        </Badge>
        <span className="text-sm">
          Unrestricted access — {email}
        </span>
      </div>
    </div>
  );
}
