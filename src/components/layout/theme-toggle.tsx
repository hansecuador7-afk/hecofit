import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/AuthProvider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function ThemeToggle() {
  const { settings, updateSettings } = useAuth();
  const isLight = settings?.theme === 'light';
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={isLight ? 'Activar tema oscuro' : 'Activar tema claro'}
          onClick={() => {
            void updateSettings({ theme: isLight ? 'dark' : 'light' });
          }}
        >
          {isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{isLight ? 'Tema oscuro' : 'Tema claro'}</TooltipContent>
    </Tooltip>
  );
}
