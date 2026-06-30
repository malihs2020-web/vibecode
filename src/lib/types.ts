export type Gender = 'male' | 'female';

export type GoalDirection = 'lose' | 'maintain' | 'gain';
export type GoalRate = 'slow' | 'moderate' | 'fast';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MacroGoals {
  protein: number;
  fat: number;
  carbs: number;
}

export interface Food {
  id: string;
  name: string;
  cal: number;
  protein: number;
  fat: number;
  carbs: number;
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
