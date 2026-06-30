import type { Gender, GoalDirection, GoalRate, MacroGoals } from './types';

// Защитные минимумы ккал/день
export const SAFETY_FLOOR: Record<Gender, number> = { male: 1500, female: 1200 };

// Максимальный профицит
export const SURPLUS_CAP = 750;

// Дельта калорий для каждого темпа
export const RATE_DELTA: Record<GoalRate, number> = {
  slow: 250,
  moderate: 500,
  fast: 750,
};

// Белок г/кг по цели: выше при похудении и наборе, ниже при поддержании
const PROTEIN_PER_KG: Record<GoalDirection, number> = {
  lose: 2.0,
  maintain: 1.6,
  gain: 2.2,
};

// Жир г/кг (базовый авто-расчёт)
const FAT_PER_KG = 1.0;

export interface CalcInput {
  gender: Gender;
  age: number;
  weight: number;
  height: number;
  activity: number;
  direction: GoalDirection;
  rate: GoalRate;
}

export interface CalcResult {
  bmr: number;
  tdeeBase: number;
  tdee: number;
  clamped: boolean;
  warning: string | null;
  macros: MacroGoals;
  bmi: number;
  bmiLabel: string;
}

export function calcBMR({ gender, weight, height, age }: CalcInput): number {
  return gender === 'male'
    ? 10 * weight + 6.25 * height - 5 * age + 5
    : 10 * weight + 6.25 * height - 5 * age - 161;
}

export function calcBMI(weight: number, height: number): number {
  return weight / (height / 100) ** 2;
}

export function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return 'Недовес';
  if (bmi < 25) return 'Норма';
  if (bmi < 30) return 'Избыток';
  return 'Ожирение';
}

export function calcAutoMacros(weight: number, tdee: number, direction: GoalDirection): MacroGoals {
  const protein = Math.round(weight * PROTEIN_PER_KG[direction]);
  const fat = Math.round(weight * FAT_PER_KG);
  const carbs = Math.max(0, Math.round((tdee - protein * 4 - fat * 9) / 4));
  return { protein, fat, carbs };
}

export function calculate(input: CalcInput): CalcResult {
  const bmr = calcBMR(input);
  const tdeeBase = Math.round(bmr * input.activity);

  const delta =
    input.direction === 'maintain'
      ? 0
      : input.direction === 'lose'
        ? -RATE_DELTA[input.rate]
        : Math.min(RATE_DELTA[input.rate], SURPLUS_CAP);

  let tdee = tdeeBase + delta;
  let clamped = false;
  let warning: string | null = null;

  const floor = SAFETY_FLOOR[input.gender];
  if (tdee < floor) {
    clamped = true;
    tdee = floor;
    warning =
      `Целевое потребление ограничено до ${floor} ккал — это минимальный безопасный уровень. ` +
      `Для более быстрого похудения проконсультируйся с врачом или диетологом.`;
  }

  const macros = calcAutoMacros(input.weight, tdee, input.direction);
  const bmi = calcBMI(input.weight, input.height);

  return {
    bmr: Math.round(bmr),
    tdeeBase,
    tdee,
    clamped,
    warning,
    macros,
    bmi,
    bmiLabel: bmiCategory(bmi),
  };
}

export const ACTIVITY_OPTIONS = [
  { value: '1.2', label: 'Сидячий образ жизни (нет тренировок)' },
  { value: '1.375', label: 'Лёгкая активность (1–3 тренировки в неделю)' },
  { value: '1.55', label: 'Умеренная активность (3–5 тренировок)' },
  { value: '1.725', label: 'Высокая активность (6–7 тренировок)' },
  { value: '1.9', label: 'Очень высокая (спортсмены, тяжёлый труд)' },
];

export const GOAL_DIRECTION_OPTIONS: { value: GoalDirection; label: string }[] = [
  { value: 'lose', label: 'Похудение' },
  { value: 'maintain', label: 'Поддержание веса' },
  { value: 'gain', label: 'Набор массы' },
];

export const GOAL_RATE_OPTIONS: { value: GoalRate; label: string; desc: string }[] = [
  { value: 'slow', label: 'Медленно', desc: '−250 ккал/день · ≈0.25 кг/нед' },
  { value: 'moderate', label: 'Умеренно', desc: '−500 ккал/день · ≈0.5 кг/нед' },
  { value: 'fast', label: 'Быстро', desc: '−750 ккал/день · ≈0.75 кг/нед' },
];
