export type Gender = 'male' | 'female';

export type GoalDirection = 'lose' | 'maintain' | 'gain';
export type GoalRate = 'slow' | 'moderate' | 'fast';

export type MealType =
  | 'breakfast'
  | 'breakfast2'
  | 'lunch'
  | 'afternoon'
  | 'dinner'
  | 'dinner2'
  | 'snack';

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
  breakfast2: Entry[];
  lunch: Entry[];
  afternoon: Entry[];
  dinner: Entry[];
  dinner2: Entry[];
  snack: Entry[];
  water: number;
}

export type Diary = Record<string, DiaryDay>;

export type ReminderKey = MealType | 'water';

export interface ReminderSetting {
  enabled: boolean;
  time: string; // 'HH:MM', локальное время пользователя
}

export interface WaterReminderSettings {
  enabled: boolean;
  wakeStart: string;  // 'HH:MM'
  wakeEnd: string;    // 'HH:MM'
  maxPerDay: number;
}

export interface AppSettings {
  activeMeals: MealType[];
  glassML: number;
  waterGoal: number;
  waterGoalOverride?: number;  // задана вручную; undefined = авторасчёт
  waterReminder?: WaterReminderSettings;
  telegramReminders?: Partial<Record<ReminderKey, ReminderSetting>>;
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
