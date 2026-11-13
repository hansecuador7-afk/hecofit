import { Download, LogOut, Settings, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/features/auth/AuthProvider';
import { cn, initials } from '@/lib/utils';

export function UserMenu({ compact = false }: { compact?: boolean }) {
  const { user, profile, mode, signOut } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;

  const displayName = profile?.displayName || user.displayName;
  const avatarUrl = profile?.avatarUrl || user.avatarUrl;

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Sesión cerrada correctamente');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'No se pudo cerrar la sesión');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex items-center gap-2.5 rounded-xl p-1.5 text-left transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50',
            !compact && 'w-full',
          )}
          aria-label="Menú de usuario"
        >
          <Avatar className="h-8 w-8 border border-border">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
            <AvatarFallback>{initials(displayName)}</AvatarFallback>
          </Avatar>
          {!compact && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold leading-tight">{displayName}</p>
              <p className="truncate text-[11px] text-muted">
                {mode === 'cloud' ? user.email : 'Cuenta local'}
              </p>
            </div>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>
          <span className="block truncate text-sm font-semibold normal-case tracking-normal text-foreground">
            {displayName}
          </span>
          <span className="mt-0.5 block truncate text-[11px] font-normal normal-case tracking-normal text-muted">
            {user.email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => navigate('/profile')}>
          <UserRound className="h-4 w-4" /> Mi perfil
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate('/profile?tab=datos')}>
          <Download className="h-4 w-4" /> Exportar datos
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate('/profile?tab=preferencias')}>
          <Settings className="h-4 w-4" /> Preferencias
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onSelect={() => void handleSignOut()}>
          <LogOut className="h-4 w-4" /> Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
