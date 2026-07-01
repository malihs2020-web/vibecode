import { useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ThemeControls } from '@/components/theme-controls';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useAutoBackup } from '@/hooks/useAutoBackup';
import { defaultFoods, uid } from '@/lib/foods';
import { calcAdaptiveTdee, shouldRunAdaptive } from '@/lib/adaptive';
import { todayKey } from '@/lib/date';
import type { AdaptiveState, AppSettings, Diary, DiaryDay, Entry, Food, MacroGoals, MealType, WeightEntry } from '@/lib/types';

const DEFAULT_SETTINGS: AppSettings = {
  activeMeals: ['breakfast', 'lunch', 'dinner', 'snack'] as AppSettings['activeMeals'],
  glassML: 250,
  waterGoal: 8,
};
import { CalculatorTab } from '@/features/CalculatorTab';
import { DiaryTab } from '@/features/DiaryTab';
import { StatsTab } from '@/features/StatsTab';
import { FoodsTab } from '@/features/FoodsTab';
import { FeedTab } from '@/features/FeedTab';
import type { FoodDraft } from '@/features/FoodDialog';

const EMPTY_DAY: DiaryDay = {
  breakfast: [], breakfast2: [], lunch: [], afternoon: [],
  dinner: [], dinner2: [], snack: [], water: 0,
};

function ensureDay(day?: DiaryDay): DiaryDay {
  return day ? { ...EMPTY_DAY, ...day, water: day.water ?? 0 } : { ...EMPTY_DAY };
}

export default function App() {
  const [foods, setFoods] = useLocalStorage<Food[]>('foods', defaultFoods);
  const [diary, setDiary] = useLocalStorage<Diary>('diary', {});
  const [goalCal, setGoalCal] = useLocalStorage<number | null>('goalCal', null);
  const [macroGoals, setMacroGoals] = useLocalStorage<MacroGoals | null>('macroGoals', null);
  const [weightLog, setWeightLog] = useLocalStorage<WeightEntry[]>('weightLog', []);
  const [adaptiveState, setAdaptiveState] = useLocalStorage<AdaptiveState | null>('adaptiveState', null);
  const [settings, setSettings] = useLocalStorage<AppSettings>('settings', DEFAULT_SETTINGS);

  useAutoBackup(foods, diary, goalCal);

  // Логируем сессию для DAU/MAU
  useEffect(() => {
    const initData = window.Telegram?.WebApp?.initData;
    if (initData) {
      fetch('/api/feed/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData }),
      }).catch(() => {});
    }
  }, []);

  // Еженедельная адаптивная корректировка TDEE
  useEffect(() => {
    if (!goalCal) return;
    if (!shouldRunAdaptive(adaptiveState?.lastDate ?? null)) return;
    if (weightLog.length < 2) return;

    const baseTdee = adaptiveState?.baseTdee ?? goalCal;
    const currentTdee = adaptiveState?.tdee ?? goalCal;

    const result = calcAdaptiveTdee(weightLog, diary, currentTdee, baseTdee);
    if (!result) return;

    setAdaptiveState({
      tdee: result.newTdee,
      baseTdee,
      lastDate: todayKey(),
      lastCorrection: result.correctionKcal,
      lastTrendDelta: result.trendDelta,
      lastExpectedDelta: result.expectedDelta,
      lastAvgCal: result.avgCalories,
    });
    setGoalCal(result.newTdee);
  }, [weightLog, diary]);

  function handleGoalChange(tdee: number, macros: MacroGoals) {
    setGoalCal(tdee);
    setMacroGoals(macros);
    // Сброс базы при ручном пересчёте
    setAdaptiveState((prev) =>
      prev ? { ...prev, baseTdee: tdee, tdee } : null
    );
  }

  function addWeightEntry(date: string, weight: number) {
    setWeightLog((prev) => {
      const filtered = prev.filter((e) => e.date !== date);
      return [...filtered, { date, weight }].sort((a, b) => a.date.localeCompare(b.date));
    });
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
        <TabsList className="grid w-full grid-cols-5 text-xs">
          <TabsTrigger value="calculator" className="px-1">Норма</TabsTrigger>
          <TabsTrigger value="diary" className="px-1">Дневник</TabsTrigger>
          <TabsTrigger value="stats" className="px-1">График</TabsTrigger>
          <TabsTrigger value="foods" className="px-1">Продукты</TabsTrigger>
          <TabsTrigger value="feed" className="px-1">Лента</TabsTrigger>
        </TabsList>

        <TabsContent value="calculator">
          <CalculatorTab
            onGoalChange={handleGoalChange}
            adaptiveState={adaptiveState}
          />
        </TabsContent>
        <TabsContent value="diary">
          <DiaryTab
            diary={diary}
            goalCal={goalCal}
            macroGoals={macroGoals}
            foods={foods}
            weightLog={weightLog}
            settings={settings}
            onAddEntry={addEntry}
            onRemoveEntry={removeEntry}
            onChangeWater={changeWater}
            onAddWeight={addWeightEntry}
            onSettingsChange={setSettings}
          />
        </TabsContent>
        <TabsContent value="stats">
          <StatsTab diary={diary} goalCal={goalCal} foods={foods} onImport={importData} />
        </TabsContent>
        <TabsContent value="foods">
          <FoodsTab foods={foods} onSave={saveFood} onDelete={deleteFood} />
        </TabsContent>
        <TabsContent value="feed">
          <FeedTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
