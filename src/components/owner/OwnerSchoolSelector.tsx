import { usePlatformOwner } from '@/hooks/usePlatformOwner';
import { useOwnerSchool } from '@/contexts/OwnerSchoolContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export function OwnerSchoolSelector() {
  const { isPlatformOwner } = usePlatformOwner();
  const { selectedSchoolId, setSelectedSchoolId, allSchools, isLoading } = useOwnerSchool();

  // Only show for platform owner
  if (!isPlatformOwner) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="px-4 py-2">
        <div className="h-9 bg-sidebar-accent/50 rounded-md animate-pulse" />
      </div>
    );
  }

  if (allSchools.length === 0) {
    return null;
  }

  return (
    <div className="px-4 py-2 border-b border-sidebar-border">
      <Select value={selectedSchoolId || ''} onValueChange={setSelectedSchoolId}>
        <SelectTrigger className="w-full bg-sidebar-accent/50 border-sidebar-border">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-sidebar-foreground/70" />
            <SelectValue placeholder="Select school..." />
          </div>
        </SelectTrigger>
        <SelectContent>
          {allSchools.map((school) => (
            <SelectItem key={school.id} value={school.id}>
              <div className="flex items-center gap-2">
                <span className="truncate">{school.name}</span>
                {school.is_demo && (
                  <Badge variant="secondary" className="text-xs px-1 py-0">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Demo
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
