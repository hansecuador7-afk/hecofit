import {
  CalendarDays,
  Dumbbell,
  History,
  LayoutDashboard,
  Layers,
  Library,
  Settings,
  StickyNote,
  TrendingUp,
  Trophy,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  shortLabel?: string;
  icon: LucideIcon;
  end?: boolean;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    label: 'Entrenamiento',
    items: [
      { to: '/', label: 'Dashboard', shortLabel: 'Inicio', icon: LayoutDashboard, end: true },
      { to: '/workouts', label: 'Entrenar', icon: Dumbbell },
      { to: '/routines', label: 'Rutinas', icon: Layers },
      { to: '/exercises', label: 'Ejercicios', icon: Library },
    ],
  },
  {
    label: 'Análisis',
    items: [
      { to: '/calendar', label: 'Calendario', icon: CalendarDays },
      { to: '/history', label: 'Historial', icon: History },
      { to: '/progress', label: 'Progreso', icon: TrendingUp },
      { to: '/records', label: 'Récords', icon: Trophy },
    ],
  },
  {
    label: 'Personal',
    items: [
      { to: '/notes', label: 'Notas', icon: StickyNote },
      { to: '/profile', label: 'Perfil y ajustes', shortLabel: 'Ajustes', icon: Settings },
    ],
  },
];

export const ALL_NAV_ITEMS = NAV_SECTIONS.flatMap((section) => section.items);

export const MOBILE_NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Inicio', icon: LayoutDashboard, end: true },
  { to: '/workouts', label: 'Entrenar', icon: Dumbbell },
  { to: '/routines', label: 'Rutinas', icon: Layers },
  { to: '/progress', label: 'Progreso', icon: TrendingUp },
];

export function getPageTitle(pathname: string): string {
  const exact = ALL_NAV_ITEMS.find((item) =>
    item.end ? pathname === item.to : pathname.startsWith(item.to),
  );
  if (exact) return exact.label;
  if (pathname.startsWith('/history')) return 'Historial';
  return 'HECOFIT';
}
