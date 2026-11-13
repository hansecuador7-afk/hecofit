-- HECOFIT · Esquema inicial para Supabase
-- Ejecutar en el SQL Editor del proyecto o con `supabase db push`.
-- Después de la migración, ejecutar `supabase/seed.sql` para el catálogo global.

begin;

create extension if not exists pgcrypto;

/* -------------------------------------------------------------------------- */
/* Utilidades                                                                  */
/* -------------------------------------------------------------------------- */

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

/* -------------------------------------------------------------------------- */
/* Perfil y ajustes                                                            */
/* -------------------------------------------------------------------------- */

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Atleta' check (char_length(display_name) between 1 and 60),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  weight_unit text not null default 'kg' check (weight_unit in ('kg', 'lb')),
  theme text not null default 'dark' check (theme in ('dark', 'light')),
  rest_seconds integer not null default 90 check (rest_seconds between 0 and 900),
  sound_enabled boolean not null default true,
  auto_rest boolean not null default true,
  date_format text not null default 'dd/MM/yyyy'
    check (date_format in ('dd/MM/yyyy', 'yyyy-MM-dd', 'MM/dd/yyyy')),
  notifications_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

/* -------------------------------------------------------------------------- */
/* Catálogo global de ejercicios                                               */
/* -------------------------------------------------------------------------- */

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  description text not null default '',
  primary_muscle text not null check (
    primary_muscle in (
      'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
      'abs', 'quads', 'hamstrings', 'glutes', 'calves', 'full_body'
    )
  ),
  secondary_muscles text[] not null default '{}' check (
    secondary_muscles <@ array[
      'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
      'abs', 'quads', 'hamstrings', 'glutes', 'calves', 'full_body'
    ]::text[]
  ),
  equipment text not null check (
    equipment in ('barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'kettlebell', 'band', 'other')
  ),
  instructions text not null default '',
  image_url text,
  difficulty text check (difficulty in ('beginner', 'intermediate', 'advanced')),
  created_at timestamptz not null default now()
);

create index exercises_name_idx on public.exercises (name);
create index exercises_primary_muscle_idx on public.exercises (primary_muscle);

/* -------------------------------------------------------------------------- */
/* Ejercicios propios                                                          */
/* -------------------------------------------------------------------------- */

create table public.user_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 120),
  description text not null default '',
  primary_muscle text not null check (
    primary_muscle in (
      'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
      'abs', 'quads', 'hamstrings', 'glutes', 'calves', 'full_body'
    )
  ),
  secondary_muscles text[] not null default '{}' check (
    secondary_muscles <@ array[
      'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
      'abs', 'quads', 'hamstrings', 'glutes', 'calves', 'full_body'
    ]::text[]
  ),
  equipment text not null check (
    equipment in ('barbell', 'dumbbell', 'machine', 'cable', 'bodyweight', 'kettlebell', 'band', 'other')
  ),
  instructions text not null default '',
  image_url text,
  difficulty text check (difficulty in ('beginner', 'intermediate', 'advanced')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index user_exercises_user_id_idx on public.user_exercises (user_id);

/* -------------------------------------------------------------------------- */
/* Rutinas                                                                     */
/* -------------------------------------------------------------------------- */

create table public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 2 and 80),
  description text not null default '',
  is_active boolean not null default false,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index workout_plans_user_id_idx on public.workout_plans (user_id);

create table public.plan_days (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.workout_plans (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  position integer not null default 0 check (position >= 0),
  notes text not null default ''
);

create index plan_days_plan_id_idx on public.plan_days (plan_id);

create table public.plan_exercises (
  id uuid primary key default gen_random_uuid(),
  plan_day_id uuid not null references public.plan_days (id) on delete cascade,
  exercise_id uuid references public.exercises (id) on delete set null,
  user_exercise_id uuid references public.user_exercises (id) on delete set null,
  name_snapshot text not null check (char_length(name_snapshot) between 1 and 120),
  primary_muscle text not null check (
    primary_muscle in (
      'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
      'abs', 'quads', 'hamstrings', 'glutes', 'calves', 'full_body'
    )
  ),
  position integer not null default 0 check (position >= 0),
  target_sets integer not null default 3 check (target_sets between 0 and 50),
  target_reps text not null default '8-12',
  rest_seconds integer not null default 90 check (rest_seconds between 0 and 900),
  notes text not null default '',
  constraint plan_exercises_single_source check (
    exercise_id is null or user_exercise_id is null
  )
);

create index plan_exercises_plan_day_id_idx on public.plan_exercises (plan_day_id);
create index plan_exercises_exercise_id_idx on public.plan_exercises (exercise_id);
create index plan_exercises_user_exercise_id_idx on public.plan_exercises (user_exercise_id);

/* -------------------------------------------------------------------------- */
/* Entrenamientos                                                              */
/* -------------------------------------------------------------------------- */

create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_id uuid references public.workout_plans (id) on delete set null,
  plan_day_id uuid references public.plan_days (id) on delete set null,
  name text not null check (char_length(name) between 1 and 80),
  status text not null default 'scheduled'
    check (status in ('scheduled', 'in_progress', 'paused', 'finished', 'cancelled')),
  scheduled_at timestamptz,
  started_at timestamptz,
  finished_at timestamptz,
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index workouts_user_id_idx on public.workouts (user_id);
create index workouts_started_at_idx on public.workouts (started_at desc);
create index workouts_scheduled_at_idx on public.workouts (scheduled_at);
create index workouts_status_idx on public.workouts (status);

create table public.workout_exercises (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts (id) on delete cascade,
  exercise_id uuid references public.exercises (id) on delete set null,
  user_exercise_id uuid references public.user_exercises (id) on delete set null,
  name_snapshot text not null check (char_length(name_snapshot) between 1 and 120),
  primary_muscle text not null check (
    primary_muscle in (
      'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
      'abs', 'quads', 'hamstrings', 'glutes', 'calves', 'full_body'
    )
  ),
  position integer not null default 0 check (position >= 0),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workout_exercises_single_source check (
    exercise_id is null or user_exercise_id is null
  )
);

create index workout_exercises_workout_id_idx on public.workout_exercises (workout_id);
create index workout_exercises_exercise_id_idx on public.workout_exercises (exercise_id);
create index workout_exercises_user_exercise_id_idx on public.workout_exercises (user_exercise_id);

create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_exercise_id uuid not null references public.workout_exercises (id) on delete cascade,
  set_number integer not null check (set_number >= 1),
  weight numeric(10, 3) not null default 0 check (weight >= 0),
  reps integer not null default 0 check (reps >= 0),
  weight_unit text not null default 'kg' check (weight_unit in ('kg', 'lb')),
  set_type text not null default 'effective'
    check (set_type in ('warmup', 'effective', 'approximation', 'drop', 'failure', 'custom')),
  rest_seconds integer not null default 90 check (rest_seconds between 0 and 3600),
  is_completed boolean not null default false,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workout_exercise_id, set_number)
);

create index workout_sets_workout_exercise_id_idx on public.workout_sets (workout_exercise_id);

/* -------------------------------------------------------------------------- */
/* Favoritos, notas y descansos                                                */
/* -------------------------------------------------------------------------- */

create table public.exercise_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  exercise_id uuid references public.exercises (id) on delete cascade,
  user_exercise_id uuid references public.user_exercises (id) on delete cascade,
  exercise_name text not null check (char_length(exercise_name) between 1 and 120),
  created_at timestamptz not null default now(),
  constraint exercise_favorites_single_source check (
    (exercise_id is not null)::int + (user_exercise_id is not null)::int = 1
  )
);

create unique index exercise_favorites_user_global_idx
  on public.exercise_favorites (user_id, exercise_id)
  where exercise_id is not null;
create unique index exercise_favorites_user_custom_idx
  on public.exercise_favorites (user_id, user_exercise_id)
  where user_exercise_id is not null;
create index exercise_favorites_user_id_idx on public.exercise_favorites (user_id);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 100),
  body text not null default '',
  note_type text not null default 'general'
    check (note_type in ('general', 'workout', 'routine', 'exercise')),
  workout_id uuid references public.workouts (id) on delete set null,
  plan_id uuid references public.workout_plans (id) on delete set null,
  exercise_id uuid references public.exercises (id) on delete set null,
  user_exercise_id uuid references public.user_exercises (id) on delete set null,
  pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index notes_user_id_idx on public.notes (user_id);
create index notes_updated_at_idx on public.notes (updated_at desc);
create index notes_workout_id_idx on public.notes (workout_id);
create index notes_plan_id_idx on public.notes (plan_id);

create table public.rest_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  notes text not null default '',
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

create index rest_days_user_date_idx on public.rest_days (user_id, date desc);

/* -------------------------------------------------------------------------- */
/* Triggers de updated_at                                                      */
/* -------------------------------------------------------------------------- */

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger user_settings_set_updated_at before update on public.user_settings
  for each row execute function public.set_updated_at();
create trigger user_exercises_set_updated_at before update on public.user_exercises
  for each row execute function public.set_updated_at();
create trigger workout_plans_set_updated_at before update on public.workout_plans
  for each row execute function public.set_updated_at();
create trigger workouts_set_updated_at before update on public.workouts
  for each row execute function public.set_updated_at();
create trigger workout_exercises_set_updated_at before update on public.workout_exercises
  for each row execute function public.set_updated_at();
create trigger workout_sets_set_updated_at before update on public.workout_sets
  for each row execute function public.set_updated_at();
create trigger notes_set_updated_at before update on public.notes
  for each row execute function public.set_updated_at();

/* -------------------------------------------------------------------------- */
/* Validación de vínculos entre entidades del mismo propietario                */
/* -------------------------------------------------------------------------- */

create or replace function public.validate_note_links()
returns trigger
language plpgsql
as $$
begin
  if new.workout_id is not null and not exists (
    select 1 from public.workouts w where w.id = new.workout_id and w.user_id = new.user_id
  ) then
    raise exception 'La nota no puede vincularse a un entrenamiento de otra cuenta.'
      using errcode = '42501';
  end if;
  if new.plan_id is not null and not exists (
    select 1 from public.workout_plans p where p.id = new.plan_id and p.user_id = new.user_id
  ) then
    raise exception 'La nota no puede vincularse a una rutina de otra cuenta.'
      using errcode = '42501';
  end if;
  if new.user_exercise_id is not null and not exists (
    select 1 from public.user_exercises e
    where e.id = new.user_exercise_id and e.user_id = new.user_id
  ) then
    raise exception 'La nota no puede vincularse a un ejercicio de otra cuenta.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger notes_validate_links before insert or update on public.notes
  for each row execute function public.validate_note_links();

create or replace function public.validate_favorite_links()
returns trigger
language plpgsql
as $$
begin
  if new.user_exercise_id is not null and not exists (
    select 1 from public.user_exercises e
    where e.id = new.user_exercise_id and e.user_id = new.user_id
  ) then
    raise exception 'El favorito no puede apuntar a un ejercicio de otra cuenta.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger exercise_favorites_validate_links before insert or update on public.exercise_favorites
  for each row execute function public.validate_favorite_links();

create or replace function public.validate_workout_exercise_links()
returns trigger
language plpgsql
as $$
declare
  owner_id uuid;
begin
  select user_id into owner_id from public.workouts where id = new.workout_id;
  if owner_id is null then
    raise exception 'El entrenamiento no existe.' using errcode = '23503';
  end if;
  if new.user_exercise_id is not null and not exists (
    select 1 from public.user_exercises e
    where e.id = new.user_exercise_id and e.user_id = owner_id
  ) then
    raise exception 'El ejercicio personalizado no pertenece al propietario de la sesión.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger workout_exercises_validate_links
  before insert or update on public.workout_exercises
  for each row execute function public.validate_workout_exercise_links();

create or replace function public.validate_plan_exercise_links()
returns trigger
language plpgsql
as $$
declare
  owner_id uuid;
begin
  select p.user_id into owner_id
  from public.plan_days d
  join public.workout_plans p on p.id = d.plan_id
  where d.id = new.plan_day_id;
  if owner_id is null then
    raise exception 'El día de rutina no existe.' using errcode = '23503';
  end if;
  if new.user_exercise_id is not null and not exists (
    select 1 from public.user_exercises e
    where e.id = new.user_exercise_id and e.user_id = owner_id
  ) then
    raise exception 'El ejercicio personalizado no pertenece al propietario de la rutina.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger plan_exercises_validate_links
  before insert or update on public.plan_exercises
  for each row execute function public.validate_plan_exercise_links();

/* -------------------------------------------------------------------------- */
/* Perfil y ajustes automáticos al crear la cuenta                             */
/* -------------------------------------------------------------------------- */

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  display_name text;
begin
  display_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    split_part(coalesce(new.email, 'atleta@hecofit.app'), '@', 1),
    'Atleta'
  );

  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, left(display_name, 60), new.raw_user_meta_data ->> 'avatar_url')
  on conflict (id) do nothing;

  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

/* -------------------------------------------------------------------------- */
/* Eliminación de la propia cuenta                                             */
/* -------------------------------------------------------------------------- */

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'No hay una sesión autenticada.' using errcode = '28000';
  end if;
  delete from auth.users where id = current_user_id;
end;
$$;

revoke all on function public.delete_own_account() from public;
revoke all on function public.delete_own_account() from anon;
grant execute on function public.delete_own_account() to authenticated;

/* -------------------------------------------------------------------------- */
/* Row Level Security                                                          */
/* -------------------------------------------------------------------------- */

alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.exercises enable row level security;
alter table public.user_exercises enable row level security;
alter table public.workout_plans enable row level security;
alter table public.plan_days enable row level security;
alter table public.plan_exercises enable row level security;
alter table public.workouts enable row level security;
alter table public.workout_exercises enable row level security;
alter table public.workout_sets enable row level security;
alter table public.exercise_favorites enable row level security;
alter table public.notes enable row level security;
alter table public.rest_days enable row level security;

-- Perfil: solo el propietario.
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy profiles_insert_own on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
create policy profiles_delete_own on public.profiles
  for delete to authenticated using (id = (select auth.uid()));

-- Ajustes: solo el propietario.
create policy user_settings_all_own on public.user_settings
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Catálogo global: lectura para usuarios autenticados. Sin escritura cliente.
create policy exercises_select_authenticated on public.exercises
  for select to authenticated using (true);

-- Ejercicios propios.
create policy user_exercises_all_own on public.user_exercises
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Rutinas.
create policy workout_plans_all_own on public.workout_plans
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy plan_days_all_own on public.plan_days
  for all to authenticated
  using (
    exists (
      select 1 from public.workout_plans p
      where p.id = plan_days.plan_id and p.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.workout_plans p
      where p.id = plan_days.plan_id and p.user_id = (select auth.uid())
    )
  );

create policy plan_exercises_all_own on public.plan_exercises
  for all to authenticated
  using (
    exists (
      select 1
      from public.plan_days d
      join public.workout_plans p on p.id = d.plan_id
      where d.id = plan_exercises.plan_day_id and p.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.plan_days d
      join public.workout_plans p on p.id = d.plan_id
      where d.id = plan_exercises.plan_day_id and p.user_id = (select auth.uid())
    )
  );

-- Entrenamientos y sus hijos.
create policy workouts_all_own on public.workouts
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy workout_exercises_all_own on public.workout_exercises
  for all to authenticated
  using (
    exists (
      select 1 from public.workouts w
      where w.id = workout_exercises.workout_id and w.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.workouts w
      where w.id = workout_exercises.workout_id and w.user_id = (select auth.uid())
    )
  );

create policy workout_sets_all_own on public.workout_sets
  for all to authenticated
  using (
    exists (
      select 1
      from public.workout_exercises e
      join public.workouts w on w.id = e.workout_id
      where e.id = workout_sets.workout_exercise_id and w.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.workout_exercises e
      join public.workouts w on w.id = e.workout_id
      where e.id = workout_sets.workout_exercise_id and w.user_id = (select auth.uid())
    )
  );

-- Favoritos, notas y descansos.
create policy exercise_favorites_all_own on public.exercise_favorites
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy notes_all_own on public.notes
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy rest_days_all_own on public.rest_days
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

/* -------------------------------------------------------------------------- */
/* Permisos                                                                   */
/* -------------------------------------------------------------------------- */

grant usage on schema public to anon, authenticated;

grant select on public.exercises to authenticated;

grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.user_settings to authenticated;
grant select, insert, update, delete on public.user_exercises to authenticated;
grant select, insert, update, delete on public.workout_plans to authenticated;
grant select, insert, update, delete on public.plan_days to authenticated;
grant select, insert, update, delete on public.plan_exercises to authenticated;
grant select, insert, update, delete on public.workouts to authenticated;
grant select, insert, update, delete on public.workout_exercises to authenticated;
grant select, insert, update, delete on public.workout_sets to authenticated;
grant select, insert, update, delete on public.exercise_favorites to authenticated;
grant select, insert, update, delete on public.notes to authenticated;
grant select, insert, update, delete on public.rest_days to authenticated;

commit;
