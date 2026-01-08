import { useNavigate } from 'react-router-dom';
import { useDemoMode } from '@/contexts/DemoModeContext';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

export function DemoExitButton() {
  const navigate = useNavigate();
  const { isDemoMode, exitDemoMode, demoRole } = useDemoMode();

  if (!isDemoMode) return null;

  const handleExit = () => {
    exitDemoMode();
    navigate('/demo/enter');
  };

  const roleLabel = demoRole === 'school_admin' ? 'Admin' : 
                    demoRole === 'teacher' ? 'Teacher' : 
                    demoRole === 'parent' ? 'Parent' : 'Demo';

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExit}
      className="gap-2 border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/50"
    >
      <LogOut className="h-3.5 w-3.5" />
      Exit Demo ({roleLabel})
    </Button>
  );
}
