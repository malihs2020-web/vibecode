import { useEffect, useState } from 'react';
import { Loader2, Plus, Sparkles, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { autoFillNutrition, groqKey } from '@/lib/groq';
import type { Food, FoodPortion } from '@/lib/types';

export type FoodDraft = Omit<Food, 'id'>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  food: Food | null;
  onSave: (draft: FoodDraft, id: string | null) => void;
}

const EMPTY = { name: '', cal: '', protein: '', fat: '', carbs: '' };

export function FoodDialog({ open, onOpenChange, food, onSave }: Props) {
  const hasGroq = Boolean(groqKey());
  const [form, setForm] = useState(EMPTY);
  const [portions, setPortions] = useState<FoodPortion[]>([]);
  const [newLabel, setNewLabel] = useState('');
  const [newGrams, setNewGrams] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm(
        food
          ? {
              name: food.name,
              cal: String(food.cal),
              protein: String(food.protein),
              fat: String(food.fat),
              carbs: String(food.carbs),
            }
          : EMPTY,
      );
      setPortions(food?.portions ? [...food.portions] : []);
      setNewLabel('');
      setNewGrams('');
      setAiError(null);
    }
  }, [open, food]);

  async function handleAutoFill() {
    const name = form.name.trim();
    if (!name) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const n = await autoFillNutrition(name);
      setForm((f) => ({
        ...f,
        cal: String(Math.round(n.cal)),
        protein: String(n.protein),
        fat: String(n.fat),
        carbs: String(n.carbs),
      }));
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Ошибка запроса');
    } finally {
      setAiLoading(false);
    }
  }

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function addPortion() {
    const label = newLabel.trim();
    const grams = parseFloat(newGrams);
    if (!label || !grams) return;
    setPortions((p) => [...p, { label, grams }]);
    setNewLabel('');
    setNewGrams('');
  }

  function removePortion(idx: number) {
    setPortions((p) => p.filter((_, i) => i !== idx));
  }

  function save() {
    const name = form.name.trim();
    const cal = parseFloat(form.cal);
    if (!name || isNaN(cal)) return;
    onSave(
      {
        name,
        cal,
        protein: parseFloat(form.protein) || 0,
        fat: parseFloat(form.fat) || 0,
        carbs: parseFloat(form.carbs) || 0,
        portions: portions.length > 0 ? portions : undefined,
      },
      food?.id ?? null,
    );
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{food ? 'Редактировать продукт' : 'Новый продукт'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fm-name">Название</Label>
            <div className="flex gap-2">
              <Input
                id="fm-name"
                autoFocus
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
              />
              {hasGroq && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  title="Заполнить нутриенты автоматически"
                  disabled={aiLoading || !form.name.trim()}
                  onClick={handleAutoFill}
                >
                  {aiLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
            {aiError && (
              <p className="text-xs text-destructive">{aiError}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumField id="fm-cal" label="Калории (на 100г)" value={form.cal} onChange={(v) => set('cal', v)} />
            <NumField id="fm-protein" label="Белки (г)" value={form.protein} onChange={(v) => set('protein', v)} />
            <NumField id="fm-fat" label="Жиры (г)" value={form.fat} onChange={(v) => set('fat', v)} />
            <NumField id="fm-carbs" label="Углеводы (г)" value={form.carbs} onChange={(v) => set('carbs', v)} />
          </div>

          <div className="space-y-2">
            <Label>Быстрые порции (необязательно)</Label>
            {portions.map((p, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="flex-1">{p.label}</span>
                <span className="text-muted-foreground">{p.grams}г</span>
                <button
                  type="button"
                  onClick={() => removePortion(i)}
                  className="text-destructive opacity-60 hover:opacity-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            <div className="flex gap-2">
              <Input
                placeholder="Название (напр. 1 шт)"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && addPortion()}
              />
              <Input
                placeholder="г"
                type="number"
                min={1}
                value={newGrams}
                onChange={(e) => setNewGrams(e.target.value)}
                className="w-20"
                onKeyDown={(e) => e.key === 'Enter' && addPortion()}
              />
              <Button type="button" variant="outline" size="icon" onClick={addPortion}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={save}>Сохранить</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NumField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min={0}
        step="0.1"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
