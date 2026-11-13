#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const seedPath = path.join(projectRoot, 'src', 'data', 'exercises.seed.json');
const outputDir = path.join(projectRoot, 'supabase');
const outputPath = path.join(outputDir, 'seed.sql');

const EXPECTED_COUNT = 42;
const MUSCLES = new Set([
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'abs',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'full_body',
]);
const EQUIPMENT = new Set([
  'barbell',
  'dumbbell',
  'machine',
  'cable',
  'bodyweight',
  'kettlebell',
  'band',
  'other',
]);
const DIFFICULTIES = new Set(['beginner', 'intermediate', 'advanced']);
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function fail(message) {
  throw new Error(`Seed inválida: ${message}`);
}

let raw;
try {
  raw = readFileSync(seedPath, 'utf8');
} catch (error) {
  throw new Error(`No se pudo leer ${seedPath}: ${error.message}`);
}

let exercises;
try {
  exercises = JSON.parse(raw);
} catch (error) {
  throw new Error(`No se pudo parsear ${seedPath}: ${error.message}`);
}

if (!Array.isArray(exercises)) {
  fail('el JSON debe contener un array de ejercicios.');
}

if (exercises.length !== EXPECTED_COUNT) {
  fail(`se esperaban ${EXPECTED_COUNT} ejercicios y hay ${exercises.length}.`);
}

const ids = new Set();

exercises.forEach((exercise, index) => {
  const position = index + 1;
  const label = `ejercicio ${position}`;
  const expectedId = `00000000-0000-4000-8000-${String(position).padStart(12, '0')}`;

  if (!exercise || typeof exercise !== 'object' || Array.isArray(exercise)) {
    fail(`${label}: debe ser un objeto.`);
  }

  if (exercise.id !== expectedId) {
    fail(`${label}: el id debe ser ${expectedId}.`);
  }

  if (!UUID_V4.test(exercise.id)) {
    fail(`${label}: el id no es un UUID v4 válido con variante 8.`);
  }

  if (ids.has(exercise.id)) {
    fail(`${label}: id duplicado ${exercise.id}.`);
  }
  ids.add(exercise.id);

  if (typeof exercise.name !== 'string' || exercise.name.trim() === '') {
    fail(`${label}: el nombre es obligatorio.`);
  }

  if (typeof exercise.description !== 'string' || exercise.description.trim() === '') {
    fail(`${label}: la descripción es obligatoria.`);
  }

  if (!MUSCLES.has(exercise.primary_muscle)) {
    fail(`${label}: primary_muscle no permitido (${exercise.primary_muscle}).`);
  }

  if (!Array.isArray(exercise.secondary_muscles)) {
    fail(`${label}: secondary_muscles debe ser un array.`);
  }

  if (new Set(exercise.secondary_muscles).size !== exercise.secondary_muscles.length) {
    fail(`${label}: secondary_muscles contiene valores duplicados.`);
  }

  for (const muscle of exercise.secondary_muscles) {
    if (!MUSCLES.has(muscle)) {
      fail(`${label}: secondary_muscles contiene un valor no permitido (${muscle}).`);
    }
  }

  if (exercise.secondary_muscles.includes(exercise.primary_muscle)) {
    fail(`${label}: el músculo principal no puede repetirse en secondary_muscles.`);
  }

  if (!EQUIPMENT.has(exercise.equipment)) {
    fail(`${label}: equipment no permitido (${exercise.equipment}).`);
  }

  if (typeof exercise.instructions !== 'string') {
    fail(`${label}: instructions debe ser texto.`);
  }

  const steps = exercise.instructions
    .split('\n')
    .map((step) => step.trim())
    .filter(Boolean);

  if (steps.length < 2 || steps.length > 4) {
    fail(`${label}: instructions debe tener entre 2 y 4 pasos separados por saltos de línea.`);
  }

  if (exercise.image_url !== null && typeof exercise.image_url !== 'string') {
    fail(`${label}: image_url debe ser null o una cadena.`);
  }

  if (exercise.difficulty !== null && !DIFFICULTIES.has(exercise.difficulty)) {
    fail(`${label}: difficulty no permitida (${exercise.difficulty}).`);
  }
});

const quote = (value) => `'${String(value).replace(/'/g, "''")}'`;
const sqlValue = (value) => (value === null ? 'null' : quote(value));
const sqlArray = (values) =>
  values.length === 0 ? 'array[]::text[]' : `array[${values.map(quote).join(', ')}]::text[]`;

const rows = exercises
  .map((exercise) => {
    const values = [
      sqlValue(exercise.id),
      sqlValue(exercise.name),
      sqlValue(exercise.description),
      sqlValue(exercise.primary_muscle),
      sqlArray(exercise.secondary_muscles),
      sqlValue(exercise.equipment),
      sqlValue(exercise.instructions),
      sqlValue(exercise.image_url),
      sqlValue(exercise.difficulty),
    ];

    return `  (${values.join(', ')})`;
  })
  .join(',\n');

const generatedAt = new Date().toISOString();
const sql = `-- Archivo generado automáticamente por scripts/generate-seed.mjs.
-- No editar a mano: los cambios se sobrescribirán al regenerar el seed.
-- Ejercicios incluidos: ${exercises.length}
-- Fecha de generación: ${generatedAt}

insert into public.exercises (id, name, description, primary_muscle, secondary_muscles, equipment, instructions, image_url, difficulty) values
${rows}
on conflict (id) do update set name = excluded.name, description = excluded.description, primary_muscle = excluded.primary_muscle, secondary_muscles = excluded.secondary_muscles, equipment = excluded.equipment, instructions = excluded.instructions, difficulty = excluded.difficulty;
`;

mkdirSync(outputDir, { recursive: true });
writeFileSync(outputPath, sql, 'utf8');

console.log(`Seed generado: ${path.relative(projectRoot, outputPath)}`);
console.log(`Validación correcta: JSON parseado y ${exercises.length} registros.`);
