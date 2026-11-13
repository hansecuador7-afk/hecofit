import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Copy,
  Dumbbell,
  Layers,
  MoreVertical,
  Pencil,
  Play,
  Plus,
  Power,
  Target,
  Timer,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { EmptyState } from '@/components/shared/empty-state';
import { PageLoader } from '@/components/shared/loading-screen';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { ExercisePickerDialog } from '@/features/exercises/ExercisePickerDialog';
import {
  addPlanDay,
  addPlanExercise,
  deletePlanDay,
  deletePlanExercise,
  duplicatePlan,
  loadPlanDetail,
  movePlanDay,
  movePlanExercise,
  renamePlanDay,
  setPlanActive,
  updatePlanExercise,
  updatePlanInfo,
} from '@/features/routines/routineService';
import { usePlanDetail } from '@/hooks/useHecoData';
import { MUSCLE_LABELS } from '@/lib/constants';
import { getErrorMessage } from '@/lib/errors';
import { deletePlan } from '@/services/sync';
import type { PlanExerciseWithExercise } from '@/types/models';

export default function RoutineEditorPage() {
  const { routineId } = useParams<{ routineId: string }>();
  const plan = usePlanDetail(routineId);
  const navigate = useNavigate();

  const [pickerDayId, setPickerDayId] = useState<string | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [dayDialog, setDayDialog] = useState<
    { mode: 'create' } | { mode: 'rename'; dayId: string } | null
  >(null);
  const [dayName, setDayName] = useState('');
  const [targetItem, setTargetItem] = useState<PlanExerciseWithExercise | null>(null);
  const [targetSets, setTargetSets] = useState(3);
  const [targetReps, setTargetReps] = useState('8-12');
  const [targetRest, setTargetRest] = useState(90);
  const [targetNotes, setTargetNotes] = useState('');
  const [deleteDayTarget, setDeleteDayTarget] = useState<string | null>(null);
  const [deletePlanOpen, setDeletePlanOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (plan === undefined) return <PageLoader />;

  if (plan === null) {
    return (
      <EmptyState
        icon={Layers}
        title="Rutina no encontrada"
        description="Puede que se haya eliminado o pertenezca a otra cuenta."
        action={
          <Button asChild>
            <Link to="/routines">Volver a rutinas</Link>
          </Button>
        }
      />
    );
  }

  const totalExercises = plan.days.reduce((total, day) => total + day.exercises.length, 0);
  const totalSets = plan.days.reduce(
    (total, day) => total + day.exercises.reduce((sum, item) => sum + item.targetSets, 0),
    0,
  );

  const run = async (action: () => Promise<void>, success?: string) => {
    setBusy(true);
    setFormError(null);
    try {
      await action();
      if (success) toast.success(success);
    } catch (error) {
      const message = getErrorMessage(error);
      setFormError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const openInfo = () => {
    setNameDraft(plan.name);
    setDescriptionDraft(plan.description);
    setFormError(null);
    setInfoOpen(true);
  };

  const saveInfo = async () => {
    if (nameDraft.trim().length < 2) {
      setFormError('El nombre debe tener al menos 2 caracteres.');
      return;
    }
    await run(async () => {
      await updatePlanInfo(plan.id, { name: nameDraft, description: descriptionDraft });
      setInfoOpen(false);
    }, 'Rutina actualizada');
  };

  const openCreateDay = () => {
    setDayName(`Día ${plan.days.length + 1}`);
    setFormError(null);
    setDayDialog({ mode: 'create' });
  };

  const openRenameDay = (dayId: string, name: string) => {
    setDayName(name);
    setFormError(null);
    setDayDialog({ mode: 'rename', dayId });
  };

  const saveDay = async () => {
    if (dayName.trim().length < 2) {
      setFormError('El nombre del día debe tener al menos 2 caracteres.');
      return;
    }
    await run(async () => {
      if (!dayDialog) return;
      if (dayDialog.mode === 'create') {
        await addPlanDay(plan.id, dayName);
      } else {
        await renamePlanDay(plan.id, dayDialog.dayId, dayName);
      }
      setDayDialog(null);
    }, dayDialog?.mode === 'create' ? 'Día añadido' : 'Día renombrado');
  };

  const openTarget = (item: PlanExerciseWithExercise) => {
    setTargetItem(item);
    setTargetSets(item.targetSets);
    setTargetReps(item.targetReps);
    setTargetRest(item.restSeconds);
    setTargetNotes(item.notes);
    setFormError(null);
  };

  const saveTarget = async () => {
    if (!targetItem) return;
    if (!Number.isFinite(targetSets) || targetSets < 1 || targetSets > 20) {
      setFormError('Las series objetivo deben estar entre 1 y 20.');
      return;
    }
    if (!targetReps.trim()) {
      setFormError('Indica las repeticiones objetivo.');
      return;
    }
    if (!Number.isFinite(targetRest) || targetRest < 0 || targetRest > 900) {
      setFormError('El descanso debe estar entre 0 y 900 segundos.');
      return;
    }
    await run(async () => {
      await updatePlanExercise(plan.id, targetItem.id, {
        targetSets: Math.round(targetSets),
        targetReps: targetReps.trim(),
        restSeconds: Math.round(targetRest),
        notes: targetNotes.trim(),
      });
      setTargetItem(null);
    }, 'Objetivos guardados');
  };

  const duplicate = async () => {
    await run(async () => {
      const copy = await duplicatePlan(plan.id);
      navigate(`/routines/${copy.id}`);
      toast.success('Rutina duplicada');
    });
  };

  const removePlan = async () => {
    await run(async () => {
      await deletePlan(plan.id);
      toast.success('Rutina eliminada');
      navigate('/routines');
    });
  };

  return (
    <div className="space-y-5 pb-20 lg:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/routines">
            <ArrowLeft className="h-4 w-4" /> Rutinas
          </Link>
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={plan.isActive ? 'secondary' : 'outline'}
            onClick={() =>
              void run(
                () => setPlanActive(plan.isActive ? null : plan.id),
                plan.isActive ? 'Rutina desactivada' : 'Rutina activada',
              )
            }
            loading={busy}
          >
            <Power className="h-4 w-4" />
            {plan.isActive ? 'Desactivar' : 'Activar'}
          </Button>
          {plan.days[0] && (
            <Button asChild>
              <Link to={`/workouts/new?plan=${plan.id}&day=${plan.days[0].id}`}>
                <Play className="h-4 w-4" /> Empezar día 1
              </Link>
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label="Más acciones">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => void duplicate()}>
                <Copy className="h-4 w-4" /> Duplicar rutina
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive onSelect={() => setDeletePlanOpen(true)}>
                <Trash2 className="h-4 w-4" /> Eliminar rutina
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-panel p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Rutina</Badge>
              {plan.isActive && <Badge variant="success">Activa</Badge>}
            </div>
            <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
              {plan.name}
            </h1>
            {plan.description ? (
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{plan.description}</p>
            ) : (
              <p className="mt-1 text-xs text-muted">Sin descripción</p>
            )}
          </div>
          <Button variant="secondary" size="sm" onClick={openInfo}>
            <Pencil className="h-3.5 w-3.5" /> Editar información
          </Button>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            { label: 'Días', value: plan.days.length },
            { label: 'Ejercicios', value: totalExercises },
            { label: 'Series objetivo', value: totalSets },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-border/70 bg-surface/40 px-3 py-2.5 text-center"
            >
              <p className="tabular text-lg font-semibold">{stat.value}</p>
              <p className="text-[10px] text-muted">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {formError && !infoOpen && !dayDialog && !targetItem && (
        <div className="rounded-xl border border-danger/25 bg-danger/10 px-3.5 py-2.5 text-xs text-danger">
          {formError}
        </div>
      )}

      <div className="space-y-4">
        {plan.days.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="Esta rutina no tiene días"
            description="Crea días como «Pecho y tríceps» o «Piernas». Después añade ejercicios con sus series objetivo."
            action={
              <Button onClick={openCreateDay}>
                <Plus className="h-4 w-4" /> Añadir primer día
              </Button>
            }
          />
        ) : (
          plan.days.map((day, dayIndex) => (
            <Card key={day.id}>
              <CardHeader className="flex-row items-start justify-between gap-2 pb-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-[11px] font-bold text-accent">
                      DÍA {dayIndex + 1}
                    </span>
                    <CardTitle className="text-base">{day.name}</CardTitle>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted">
                    {day.exercises.length} ejercicios ·{' '}
                    {day.exercises.reduce((total, item) => total + item.targetSets, 0)} series
                  </p>
                </div>
                <div className="flex items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Subir día"
                    disabled={dayIndex === 0}
                    onClick={() => void run(() => movePlanDay(plan.id, day.id, -1))}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Bajar día"
                    disabled={dayIndex === plan.days.length - 1}
                    onClick={() => void run(() => movePlanDay(plan.id, day.id, 1))}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" aria-label="Acciones del día">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => openRenameDay(day.id, day.name)}>
                        <Pencil className="h-4 w-4" /> Renombrar día
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => setPickerDayId(day.id)}>
                        <Plus className="h-4 w-4" /> Añadir ejercicio
                      </DropdownMenuItem>
                      {day.id === plan.days[0]?.id && (
                        <DropdownMenuItem
                          onSelect={() => navigate(`/workouts/new?plan=${plan.id}&day=${day.id}`)}
                        >
                          <Play className="h-4 w-4" /> Empezar este día
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem destructive onSelect={() => setDeleteDayTarget(day.id)}>
                        <Trash2 className="h-4 w-4" /> Eliminar día
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="pt-1">
                {day.exercises.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center">
                    <Dumbbell className="mx-auto h-5 w-5 text-muted/50" />
                    <p className="mt-2 text-xs text-muted">Sin ejercicios en este día.</p>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="mt-3"
                      onClick={() => setPickerDayId(day.id)}
                    >
                      <Plus className="h-3.5 w-3.5" /> Añadir ejercicio
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {day.exercises.map((item, itemIndex) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 rounded-xl border border-border/60 bg-surface/25 px-2.5 py-2"
                      >
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface text-[10px] font-bold text-muted">
                          {itemIndex + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold">{item.nameSnapshot}</p>
                          <p className="text-[10px] text-muted">
                            {MUSCLE_LABELS[item.primaryMuscle]} ·{' '}
                            <span className="tabular">
                              {item.targetSets} × {item.targetReps}
                            </span>{' '}
                            · <Timer className="inline h-2.5 w-2.5" /> {item.restSeconds}s
                          </p>
                          {item.notes && (
                            <p className="mt-0.5 truncate text-[10px] italic text-muted/80">
                              {item.notes}
                            </p>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Editar objetivos"
                            onClick={() => openTarget(item)}
                          >
                            <Target className="h-3.5 w-3.5" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Acciones del ejercicio"
                              >
                                <MoreVertical className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                disabled={itemIndex === 0}
                                onSelect={() =>
                                  void run(() => movePlanExercise(plan.id, item.id, -1))
                                }
                              >
                                <ArrowUp className="h-4 w-4" /> Subir
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={itemIndex === day.exercises.length - 1}
                                onSelect={() =>
                                  void run(() => movePlanExercise(plan.id, item.id, 1))
                                }
                              >
                                <ArrowDown className="h-4 w-4" /> Bajar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                destructive
                                onSelect={() =>
                                  void run(async () => {
                                    await deletePlanExercise(plan.id, item.id);
                                    toast.success('Ejercicio eliminado del día');
                                  })
                                }
                              >
                                <Trash2 className="h-4 w-4" /> Quitar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {day.exercises.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2 w-full border border-dashed border-border"
                    onClick={() => setPickerDayId(day.id)}
                  >
                    <Plus className="h-3.5 w-3.5" /> Añadir ejercicio
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {plan.days.length > 0 && (
        <Button variant="secondary" className="w-full" onClick={openCreateDay}>
          <Plus className="h-4 w-4" /> Añadir día de entrenamiento
        </Button>
      )}

      <ExercisePickerDialog
        open={Boolean(pickerDayId)}
        onOpenChange={(open) => {
          if (!open) setPickerDayId(null);
        }}
        title="Añadir ejercicio al día"
        onSelect={async (exercise) => {
          if (!pickerDayId) return;
          await addPlanExercise(plan.id, pickerDayId, exercise);
          toast.success(`${exercise.name} añadido al día`);
        }}
      />

      <Dialog open={infoOpen} onOpenChange={setInfoOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Información de la rutina</DialogTitle>
            <DialogDescription>Nombre y descripción visibles en tu planificación.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-plan-name">Nombre *</Label>
              <Input
                id="edit-plan-name"
                value={nameDraft}
                onChange={(event) => setNameDraft(event.target.value)}
                maxLength={80}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-plan-description">Descripción</Label>
              <Textarea
                id="edit-plan-description"
                rows={3}
                value={descriptionDraft}
                onChange={(event) => setDescriptionDraft(event.target.value)}
                maxLength={1000}
              />
            </div>
            <FieldError>{formError}</FieldError>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setInfoOpen(false)}>
              Cancelar
            </Button>
            <Button loading={busy} onClick={() => void saveInfo()}>
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(dayDialog)}
        onOpenChange={(open) => !open && setDayDialog(null)}
      >
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>
              {dayDialog?.mode === 'create' ? 'Nuevo día de entrenamiento' : 'Renombrar día'}
            </DialogTitle>
            <DialogDescription>
              {dayDialog?.mode === 'create'
                ? 'Puedes usar el grupo muscular o el objetivo del día.'
                : 'El nuevo nombre se mostrará en la rutina y en el calendario.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="day-name">Nombre del día *</Label>
            <Input
              id="day-name"
              value={dayName}
              onChange={(event) => setDayName(event.target.value)}
              placeholder="Ej. Pecho y tríceps"
              maxLength={60}
              autoFocus
            />
            <FieldError>{formError}</FieldError>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDayDialog(null)}>
              Cancelar
            </Button>
            <Button loading={busy} onClick={() => void saveDay()}>
              {dayDialog?.mode === 'create' ? 'Añadir día' : 'Guardar nombre'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(targetItem)}
        onOpenChange={(open) => !open && setTargetItem(null)}
      >
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Objetivos del ejercicio</DialogTitle>
            <DialogDescription>{targetItem?.nameSnapshot}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="target-sets">Series objetivo</Label>
                <Input
                  id="target-sets"
                  type="number"
                  min={1}
                  max={20}
                  value={targetSets}
                  onChange={(event) => setTargetSets(Number(event.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="target-rest">Descanso (segundos)</Label>
                <Input
                  id="target-rest"
                  type="number"
                  min={0}
                  max={900}
                  step={15}
                  value={targetRest}
                  onChange={(event) => setTargetRest(Number(event.target.value))}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="target-reps">Repeticiones objetivo</Label>
              <Input
                id="target-reps"
                value={targetReps}
                onChange={(event) => setTargetReps(event.target.value)}
                placeholder="Ej. 8-12 o 10"
                maxLength={20}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="target-notes">Notas</Label>
              <Textarea
                id="target-notes"
                rows={2}
                value={targetNotes}
                onChange={(event) => setTargetNotes(event.target.value)}
                placeholder="Técnica, tempo, indicaciones…"
                maxLength={500}
              />
            </div>
            <FieldError>{formError}</FieldError>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setTargetItem(null)}>
              Cancelar
            </Button>
            <Button loading={busy} onClick={() => void saveTarget()}>
              Guardar objetivos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleteDayTarget)}
        onOpenChange={(open) => !open && setDeleteDayTarget(null)}
        title="Eliminar día"
        description="Se eliminarán el día y todos sus ejercicios planificados. Las sesiones realizadas no se modifican."
        confirmLabel="Eliminar día"
        destructive
        loading={busy}
        onConfirm={() => {
          if (!deleteDayTarget) return;
          void run(async () => {
            await deletePlanDay(plan.id, deleteDayTarget);
            setDeleteDayTarget(null);
          }, 'Día eliminado');
        }}
      />

      <ConfirmDialog
        open={deletePlanOpen}
        onOpenChange={setDeletePlanOpen}
        title="Eliminar rutina"
        description="Se eliminarán la rutina, sus días y sus ejercicios planificados. El historial de entrenamientos se conserva."
        confirmLabel="Eliminar rutina"
        destructive
        loading={busy}
        onConfirm={removePlan}
      />
    </div>
  );
}
