import { zodResolver } from '@hookform/resolvers/zod';
import {
  ArrowLeft,
  CalendarClock,
  Dumbbell,
  Layers,
  Play,
  Zap,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { PageHeader } from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FieldError, Input, Label, Select, Textarea } from '@/components/ui/input';
import { useAuth } from '@/features/auth/AuthProvider';
import { usePlanDetail, usePlans } from '@/hooks/useHecoData';
import { formatDateTime, fromLocalInputValue, toLocalInputValue } from '@/lib/dates';
import { getErrorMessage } from '@/lib/errors';
import { createWorkout, createWorkoutFromPlan } from '@/features/workouts/workoutService';

const schema = z
  .object({
    name: z.string().min(2, 'Ponle un nombre de al menos 2 caracteres.').max(80),
    notes: z.string().max(1500, 'Las notas son demasiado largas.'),
    when: z.enum(['now', 'scheduled']),
    scheduledAt: z.string(),
    planId: z.string(),
    planDayId: z.string(),
  })
  .superRefine((values, context) => {
    if (values.when === 'scheduled' && !values.scheduledAt) {
      context.addIssue({
        code: 'custom',
        path: ['scheduledAt'],
        message: 'Indica la fecha y hora del entrenamiento.',
      });
    }
    if (values.planId && !values.planDayId) {
      context.addIssue({
        code: 'custom',
        path: ['planDayId'],
        message: 'Selecciona el día de la rutina que quieres entrenar.',
      });
    }
  });

type FormValues = z.infer<typeof schema>;

export default function NewWorkoutPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { settings } = useAuth();
  const plans = usePlans();
  const [formError, setFormError] = useState<string | null>(null);
  const initialPlanId = searchParams.get('plan') ?? '';
  const initialDayId = searchParams.get('day') ?? '';
  const dateParam = searchParams.get('date') ?? '';
  const initialDate = /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : '';
  const initialScheduledAt = toLocalInputValue(
    initialDate ? new Date(`${initialDate}T09:00:00`) : new Date(),
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: 'Entrenamiento libre',
      notes: '',
      when: initialDate ? 'scheduled' : 'now',
      scheduledAt: initialScheduledAt,
      planId: initialPlanId,
      planDayId: initialDayId,
    },
  });

  const planId = watch('planId');
  const planDayId = watch('planDayId');
  const when = watch('when');
  const name = watch('name');
  const planDetail = usePlanDetail(planId || undefined);

  const selectedDay = useMemo(
    () => planDetail?.days.find((day) => day.id === planDayId) ?? null,
    [planDetail, planDayId],
  );

  useEffect(() => {
    if (!planDetail) return;
    if (planDayId && planDetail.days.every((day) => day.id !== planDayId)) {
      setValue('planDayId', '');
    }
    if (!planId) return;
    const day = planDetail.days.find((item) => item.id === planDayId);
    if (day) setValue('name', day.name);
    else if (!planDayId && planDetail.days[0]) {
      setValue('planDayId', planDetail.days[0].id);
      setValue('name', planDetail.days[0].name);
    }
  }, [planDetail, planId, planDayId, setValue]);

  const onSubmit = async (values: FormValues) => {
    setFormError(null);
    try {
      const startNow = values.when === 'now';
      const scheduledAt = values.when === 'scheduled' ? fromLocalInputValue(values.scheduledAt) : null;
      let workoutId: string;
      if (values.planId && values.planDayId && planDetail) {
        const workout = await createWorkoutFromPlan(planDetail, values.planDayId, {
          startNow,
          scheduledAt,
          unit: settings?.weightUnit ?? 'kg',
        });
        workoutId = workout.id;
        toast.success(startNow ? 'Entrenamiento iniciado' : 'Entrenamiento programado');
      } else {
        const workout = await createWorkout({
          name: values.name,
          notes: values.notes,
          startNow,
          scheduledAt,
        });
        workoutId = workout.id;
        toast.success(startNow ? 'Entrenamiento iniciado' : 'Entrenamiento programado');
      }
      navigate(`/workouts/${workoutId}`);
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  };

  const applyTemplate = (nextPlanId: string, dayId: string) => {
    setValue('planId', nextPlanId);
    setValue('planDayId', dayId);
    const day = plans.find((plan) => plan.id === nextPlanId);
    if (day) setValue('name', day.name);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader
        eyebrow="Nueva sesión"
        title="Empieza a entrenar"
        description="Crea una sesión libre o parte de un día de tu rutina. Después podrás añadir, editar y completar series."
        actions={
          <Button asChild variant="ghost">
            <Link to="/workouts">
              <ArrowLeft className="h-4 w-4" /> Volver
            </Link>
          </Button>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 lg:grid-cols-[1.35fr_1fr]" noValidate>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Dumbbell className="h-4 w-4 text-accent" /> Datos de la sesión
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Nombre del entrenamiento *</Label>
                <Input id="name" placeholder="Ej. Pecho y tríceps" {...register('name')} />
                <FieldError>{errors.name?.message}</FieldError>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes">Notas (opcional)</Label>
                <Textarea
                  id="notes"
                  rows={3}
                  placeholder="Sensaciones, objetivo de la sesión, molestias…"
                  {...register('notes')}
                />
                <FieldError>{errors.notes?.message}</FieldError>
              </div>

              <div className="space-y-2">
                <Label>¿Cuándo?</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setValue('when', 'now')}
                    className={`rounded-xl border p-3 text-left transition-colors ${
                      when === 'now'
                        ? 'border-accent/40 bg-accent/10'
                        : 'border-border bg-surface/40 hover:border-border-strong'
                    }`}
                  >
                    <Zap className="h-4 w-4 text-accent" />
                    <p className="mt-1.5 text-sm font-semibold">Ahora</p>
                    <p className="text-[11px] text-muted">Inicia el cronómetro ya</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setValue('when', 'scheduled')}
                    className={`rounded-xl border p-3 text-left transition-colors ${
                      when === 'scheduled'
                        ? 'border-accent/40 bg-accent/10'
                        : 'border-border bg-surface/40 hover:border-border-strong'
                    }`}
                  >
                    <CalendarClock className="h-4 w-4 text-accent" />
                    <p className="mt-1.5 text-sm font-semibold">Programar</p>
                    <p className="text-[11px] text-muted">Elige fecha y hora</p>
                  </button>
                </div>
              </div>

              {when === 'scheduled' && (
                <div className="space-y-1.5">
                  <Label htmlFor="scheduledAt">Fecha y hora *</Label>
                  <Input id="scheduledAt" type="datetime-local" {...register('scheduledAt')} />
                  <FieldError>{errors.scheduledAt?.message}</FieldError>
                </div>
              )}

              {formError && (
                <div className="rounded-xl border border-danger/25 bg-danger/10 px-3.5 py-2.5 text-xs font-medium leading-relaxed text-danger">
                  {formError}
                </div>
              )}

              <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
                <Play className="h-4 w-4" />
                {when === 'now' ? 'Iniciar entrenamiento' : 'Programar entrenamiento'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-accent" /> Basado en una rutina
              </CardTitle>
              <p className="text-xs text-muted">
                Opcional. Se copiarán los ejercicios y las series objetivo; la rutina original no cambia.
              </p>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="planId">Rutina</Label>
                <Select id="planId" {...register('planId')}>
                  <option value="">Entrenamiento libre</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name}
                      {plan.isActive ? ' (activa)' : ''}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="planDayId">Día</Label>
                <Select id="planDayId" disabled={!planId} {...register('planDayId')}>
                  <option value="">{planId ? 'Selecciona un día' : 'Elige una rutina'}</option>
                  {planDetail?.days.map((day) => (
                    <option key={day.id} value={day.id}>
                      {day.name} · {day.exercises.length} ejercicios
                    </option>
                  ))}
                </Select>
                <FieldError>{errors.planDayId?.message}</FieldError>
              </div>
              {selectedDay && (
                <div className="sm:col-span-2 rounded-xl border border-accent/20 bg-accent/[0.05] p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold">{selectedDay.name}</p>
                    <Badge variant="secondary">{selectedDay.exercises.length} ejercicios</Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {selectedDay.exercises.slice(0, 6).map((exercise) => (
                      <span
                        key={exercise.id}
                        className="rounded-full border border-border bg-panel px-2 py-0.5 text-[10px] text-muted"
                      >
                        {exercise.nameSnapshot}
                      </span>
                    ))}
                    {selectedDay.exercises.length > 6 && (
                      <span className="text-[10px] text-muted">
                        +{selectedDay.exercises.length - 6} más
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-[10px] text-muted">
                    Nombre actual: <strong className="text-foreground">{name}</strong>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Inicio rápido</CardTitle>
            <p className="text-xs text-muted">Pulsa un día de rutina para cargarlo en el formulario.</p>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {plans.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border p-4 text-center">
                <Layers className="mx-auto h-6 w-6 text-muted/60" />
                <p className="mt-2 text-xs font-medium">No tienes rutinas todavía</p>
                <Button asChild size="sm" variant="secondary" className="mt-3">
                  <Link to="/routines">Crear mi primera rutina</Link>
                </Button>
              </div>
            ) : (
              plans.map((plan) => (
                <div key={plan.id} className="rounded-xl border border-border bg-surface/30 p-2.5">
                  <div className="flex items-center gap-2 px-1">
                    <Layers className="h-3.5 w-3.5 text-accent" />
                    <p className="flex-1 truncate text-xs font-semibold">{plan.name}</p>
                    {plan.isActive && <Badge variant="success">Activa</Badge>}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {plan.isActive ? (
                      <PlanDayButtons planId={plan.id} onPick={applyTemplate} activeDayId={planDayId} />
                    ) : (
                      <span className="px-1 text-[11px] text-muted">
                        Actívala o elige sus días al editarla.
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
            {planId && !planDayId && planDetail && (
              <div className="flex flex-wrap gap-1.5 rounded-xl border border-border bg-surface/30 p-2.5">
                {planDetail.days.map((day) => (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => {
                      setValue('planDayId', day.id);
                      setValue('name', day.name);
                    }}
                    className="rounded-full border border-border bg-panel px-2.5 py-1 text-[11px] font-medium text-muted transition-colors hover:border-accent/30 hover:text-foreground"
                  >
                    {day.name}
                  </button>
                ))}
              </div>
            )}
            {selectedDay && (
              <p className="px-1 text-[10px] text-muted">
                Si empiezas ahora, el cronómetro arrancará al abrir la sesión.
              </p>
            )}
            {when === 'scheduled' && (
              <p className="px-1 text-[10px] text-muted">
                Programado para {formatDateTime(fromLocalInputValue(watch('scheduledAt')))}
              </p>
            )}
          </CardContent>
        </Card>
      </form>
    </div>
  );
}

function PlanDayButtons({
  planId,
  onPick,
  activeDayId,
}: {
  planId: string;
  onPick: (planId: string, dayId: string) => void;
  activeDayId: string;
}) {
  const detail = usePlanDetail(planId);
  if (!detail) {
    return <span className="px-1 text-[11px] text-muted">Cargando días…</span>;
  }
  if (detail.days.length === 0) {
    return <span className="px-1 text-[11px] text-muted">Sin días configurados</span>;
  }
  return (
    <>
      {detail.days.map((day) => (
        <button
          key={day.id}
          type="button"
          onClick={() => onPick(planId, day.id)}
          className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
            activeDayId === day.id
              ? 'border-accent/40 bg-accent/10 text-accent'
              : 'border-border bg-panel text-muted hover:border-accent/30 hover:text-foreground'
          }`}
        >
          {day.name}
        </button>
      ))}
    </>
  );
}
