import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ThemeControls } from '@/components/theme-controls';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useAutoBackup } from '@/hooks/useAutoBackup';
import { defaultFoods, uid } from '@/lib/foods';
import type { Diary, DiaryDay, Entry, Food, MacroGoals, MealType } from '@/lib/types';
import { CalculatorTab } from '@/features/CalculatorTab';
import { DiaryTab } from '@/features/DiaryTab';
import { StatsTab } from '@/features/StatsTab';
import { FoodsTab } from '@/features/FoodsTab';
import type { FoodDraft } from '@/features/FoodDialog';

const EMPTY_DAY: DiaryDay = {
  breakfast: [],
  lunch: [],
  dinner: [],
  snack: [],
  water: 0,
};

function ensureDay(day?: DiaryDay): DiaryDay {
  return day ? { ...day, water: day.water ?? 0 } : { ...EMPTY_DAY };
}

export default function App() {
  const [foods, setFoods] = useLocalStorage<Food[]>('foods', defaultFoods);
  const [diary, setDiary] = useLocalStorage<Diary>('diary', {});
  const [goalCal, setGoalCal] = useLocalStorage<number | null>('goalCal', null);
  const [macroGoals, setMacroGoals] = useLocalStorage<MacroGoals | null>('macroGoals', null);

  useAutoBackup(foods, diary, goalCal);

  function handleGoalChange(tdee: number, macros: MacroGoals) {
    setGoalCal(tdee);
    setMacroGoals(macros);
  }

  function addEntry(date: string, meal: MealType, entry: Entry) {
    setDiary((prev) => {
      const day = ensureDay(prev[date]);
      return { ...prev, [date]: { ...day, [meal]: [...day[meal], entry] } };
    });
  }

  function removeEntry(date: string, meal: MealType, idx: number) {
    setDiary((prev) => {
      const day = ensureDay(prev[date]);
      return { ...prev, [date]: { ...day, [meal]: day[meal].filter((_, i) => i !== idx) } };
    });
  }

  function changeWater(date: string, delta: number) {
    setDiary((prev) => {
      const day = ensureDay(prev[date]);
      return { ...prev, [date]: { ...day, water: Math.max(0, day.water + delta) } };
    });
  }

  function saveFood(draft: FoodDraft, id: string | null) {
    if (id) {
      setFoods((prev) => prev.map((f) => (f.id === id ? { ...f, ...draft } : f)));
    } else {
      setFoods((prev) => [...prev, { id: uid(), ...draft }]);
    }
  }

  function deleteFood(id: string) {
    setFoods((prev) => prev.filter((f) => f.id !== id));
  }

  function importData(data: { foods?: Food[]; diary?: Diary; goalCal?: number | null }) {
    if (Array.isArray(data.foods)) setFoods(data.foods);
    if (data.diary && typeof data.diary === 'object') setDiary(data.diary);
    if ('goalCal' in data) setGoalCal(data.goalCal ?? null);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-5">
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            🥗 Калькулятор калорий
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Рассчитайте суточную норму и отслеживайте питание
          </p>
        </div>
        <ThemeControls />
      </header>

      <Tabs defaultValue="calculator">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="calculator">Норма</TabsTrigger>
          <TabsTrigger value="diary">Дневник</TabsTrigger>
          <TabsTrigger value="stats">Статистика</TabsTrigger>
          <TabsTrigger value="foods">Продукты</TabsTrigger>
        </TabsList>

        <TabsContent value="calculator">
          <CalculatorTab onGoalChange={handleGoalChange} />
        </TabsContent>
        <TabsContent value="diary">
          <DiaryTab
            diary={diary}
            goalCal={goalCal}
            macroGoals={macroGoals}
            foods={foods}
            onAddEntry={addEntry}
            onRemoveEntry={removeEntry}
            onChangeWater={changeWater}
          />
        </TabsContent>
        <TabsContent value="stats">
          <StatsTab diary={diary} goalCal={goalCal} foods={foods} onImport={importData} />
        </TabsContent>
        <TabsContent value="foods">
          <FoodsTab foods={foods} onSave={saveFood} onDelete={deleteFood} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
