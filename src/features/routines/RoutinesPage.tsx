import {
  CheckCircle2,
  Copy,
  Layers,
  MoreVertical,
  Pencil,
  Play,
  Plus,
  Power,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { EmptyState } from '@/components/shared/empty-state';
import { PageHeader } from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FieldError, Input, Label, Textarea } from '@/components/ui/input';
import { usePlanOverviews } from '@/hooks/useHecoData';
import { getErrorMessage } from '@/lib/errors';
import { formatDate } from '@/lib/dates';
import {
  createPlan,
  duplicatePlan,
  setPlanActive,
} from '@/features/routines/routineService';
import { deletePlan } from '@/services/sync';

export default function RoutinesPage() {
  const overviews = usePlanOverviews();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const resetForm = () => {
    setName('');
    setDescription('');
    setFormError(null);
  };

  const handleCreate = async () => {
    if (name.trim().length < 2) {
      setFormError('El nombre debe tener al menos 2 caracteres.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      const plan = await createPlan({ name, description });
      toast.success('Rutina creada. Añade tus días y ejercicios.');
      setCreateOpen(false);
      resetForm();
      navigate(`/routines/${plan.id}`);
    } catch (error) {
      setFormError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async (id: string) => {
    setBusyId(id);
    try {
      const copy = await duplicatePlan(id);
      toast.success('Rutina duplicada');
      navigate(`/routines/${copy.id}`);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusyId(null);
    }
  };

  const handleActivate = async (id: string, active: boolean) => {
    setBusyId(id);
    try {
      await setPlanActive(active ? null : id);
      toast.success(active ? 'Rutina desactivada' : 'Rutina activa');
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletePlan(deleteTarget);
      toast.success('Rutina eliminada');
      setDeleteTarget(null);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Planificación"
        title="Rutinas"
        description="Organiza tus entrenamientos por días, define series y repeticiones objetivo y activa tu plan actual."
        actions={
          <Button
            onClick={() => {
              resetForm();
              setCreateOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Nueva rutina
          </Button>
        }
      />

      {overviews.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="Diseña tu primera rutina"
          description="Crea una rutina, añade días como «Pecho y tríceps» y asigna ejercicios con sus series objetivo. Después podrás iniciar cualquier día en un clic."
          action={
            <Button
              onClick={() => {
                resetForm();
                setCreateOpen(true);
              }}
            >
              <Plus className="h-4 w-4" /> Crear rutina
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {overviews.map(({ plan, days }) => {
            const totalExercises = days.reduce((total, day) => total + day.exerciseCount, 0);
            return (
              <Card key={plan.id} className="flex flex-col">
                <CardContent className="flex flex-1 flex-col p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                        <Layers className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="font-display text-lg font-semibold leading-tight">
                            {plan.name}
                          </h2>
                          {plan.isActive && (
                            <Badge variant="success">
                              <CheckCircle2 className="h-3 w-3" /> Activa
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-[11px] text-muted">
                          {days.length} días · {totalExercises} ejercicios · Actualizada{' '}
                          {formatDate(plan.updatedAt)}
                        </p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Acciones de la rutina"
                          disabled={busyId === plan.id}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => navigate(`/routines/${plan.id}`)}>
                          <Pencil className="h-4 w-4" /> Editar rutina
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => void handleDuplicate(plan.id)}>
                          <Copy className="h-4 w-4" /> Duplicar
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => void handleActivate(plan.id, plan.isActive)}>
                          <Power className="h-4 w-4" />
                          {plan.isActive ? 'Desactivar' : 'Activar rutina'}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem destructive onSelect={() => setDeleteTarget(plan.id)}>
                          <Trash2 className="h-4 w-4" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {plan.description && (
                    <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted">
                      {plan.description}
                    </p>
                  )}

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {days.length === 0 ? (
                      <span className="rounded-full border border-dashed border-border px-2.5 py-1 text-[11px] text-muted">
                        Sin días todavía
                      </span>
                    ) : (
                      days.map((day) => (
                        <Link
                          key={day.id}
                          to={`/workouts/new?plan=${plan.id}&day=${day.id}`}
                          className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/50 px-2.5 py-1 text-[11px] font-medium text-muted transition-colors hover:border-accent/40 hover:text-foreground"
                        >
                          <Play className="h-2.5 w-2.5 text-accent opacity-70 group-hover:opacity-100" />
                          {day.name}
                          <span className="text-[9px] text-muted/70">{day.exerciseCount}</span>
                        </Link>
                      ))
                    )}
                  </div>

                  <div className="mt-auto flex items-center gap-2 pt-4">
                    <Button asChild variant="secondary" size="sm" className="flex-1">
                      <Link to={`/routines/${plan.id}`}>
                        <Pencil className="h-3.5 w-3.5" /> Editar rutina
                      </Link>
                    </Button>
                    {days[0] && (
                      <Button asChild size="sm" className="flex-1">
                        <Link to={`/workouts/new?plan=${plan.id}&day=${days[0].id}`}>
                          <Play className="h-3.5 w-3.5" /> Empezar
                        </Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Nueva rutina</DialogTitle>
            <DialogDescription>
              Ponle un nombre claro. Después añadirás los días y ejercicios.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="routine-name">Nombre *</Label>
              <Input
                id="routine-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Ej. Hipertrofia 4 días"
                autoFocus
                maxLength={80}
              />
              <FieldError>{formError && formError.toLowerCase().includes('nombre') ? formError : undefined}</FieldError>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="routine-description">Descripción</Label>
              <Textarea
                id="routine-description"
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Objetivo, frecuencia semanal, notas…"
                maxLength={1000}
              />
            </div>
            {formError && !formError.toLowerCase().includes('nombre') && (
              <div className="rounded-xl border border-danger/25 bg-danger/10 px-3 py-2 text-xs text-danger">
                {formError}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button loading={saving} onClick={() => void handleCreate()}>
              <Plus className="h-4 w-4" /> Crear rutina
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Eliminar rutina"
        description="Se eliminarán la rutina, sus días y sus ejercicios planificados. Las sesiones ya realizadas se conservan en el historial."
        confirmLabel="Eliminar rutina"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
      />
    </div>
  );
}
