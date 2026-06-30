export type Gender = 'male' | 'female';

export type GoalDirection = 'lose' | 'maintain' | 'gain';
export type GoalRate = 'slow' | 'moderate' | 'fast';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MacroGoals {
  protein: number;
  fat: number;
  carbs: number;
}

export interface FoodPortion {
  label: string;
  grams: number;
}

export interface Food {
  id: string;
  name: string;
  cal: number;
  protein: number;
  fat: number;
  carbs: number;
  portions?: FoodPortion[];
}

export interface Entry {
  foodId: string;
  name: string;
  amount: number;
  cal: number;
  protein: number;
  fat: number;
  carbs: number;
}

export interface DiaryDay {
  breakfast: Entry[];
  lunch: Entry[];
  dinner: Entry[];
  snack: Entry[];
  water: number;
}

export type Diary = Record<string, DiaryDay>;

export interface AppSettings {
  activeMeals: MealType[];
  glassML: number;
  waterGoal: number;
}

export interface WeightEntry {
  date: string;
  weight: number;
}

export interface AdaptiveState {
  tdee: number;            // скорректированная TDEE
  baseTdee: number;        // исходная TDEE по Mifflin (для зажима)
  lastDate: string;        // дата последней корректировки
  lastCorrection: number;  // ккал/день последней корректировки
  lastTrendDelta: number;  // фактическое изменение тренда (кг)
  lastExpectedDelta: number;
  lastAvgCal: number;
}
