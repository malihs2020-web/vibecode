import type { Gender } from './types';

export interface CalcInput {
  gender: Gender;
  age: number;
  weight: number;
  height: number;
  activity: number;
  goal: number;
}

export interface CalcResult {
  bmr: number;
  tdee: number;
  protein: number;
  fat: number;
  carbs: number;
  bmi: number;
  bmiLabel: string;
}

/** Базальный обмен по формуле Mifflin-St Jeor. */
export function calcBMR({ gender, weight, height, age }: CalcInput): number {
  return gender === 'male'
    ? 10 * weight + 6.25 * height - 5 * age + 5
    : 10 * weight + 6.25 * height - 5 * age - 161;
}

/** Индекс массы тела. */
export function calcBMI(weight: number, height: number): number {
  return weight / (height / 100) ** 2;
}

/** Категория ИМТ. */
export function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return 'Недовес';
  if (bmi < 25) return 'Норма';
  if (bmi < 30) return 'Избыток';
  return 'Ожирение';
}

export function calculate(input: CalcInput): CalcResult {
  const bmr = calcBMR(input);
  const tdee = Math.round(bmr * input.activity + input.goal);

  const protein = Math.round(input.weight * 2.0);
  const fat = Math.round((tdee * 0.25) / 9);
  const carbs = Math.max(0, Math.round((tdee - protein * 4 - fat * 9) / 4));

  const bmi = calcBMI(input.weight, input.height);

  return {
    bmr: Math.round(bmr),
    tdee,
    protein,
    fat,
    carbs,
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

export const GOAL_OPTIONS = [
  { value: '-500', label: 'Похудение (−500 ккал)' },
  { value: '-250', label: 'Лёгкое похудение (−250 ккал)' },
  { value: '0', label: 'Поддержание веса' },
  { value: '250', label: 'Лёгкий набор массы (+250 ккал)' },
  { value: '500', label: 'Набор массы (+500 ккал)' },
];
