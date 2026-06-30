import { useEffect, useState } from 'react';

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
import type { Food } from '@/lib/types';

export type FoodDraft = Omit<Food, 'id'>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  food: Food | null;
  onSave: (draft: FoodDraft, id: string | null) => void;
}

const EMPTY = { name: '', cal: '', protein: '', fat: '', carbs: '' };

export function FoodDialog({ open, onOpenChange, food, onSave }: Props) {
  const [form, setForm] = useState(EMPTY);

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
    }
  }, [open, food]);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
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
      },
      food?.id ?? null,
    );
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{food ? 'Редактировать продукт' : 'Новый продукт'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="fm-name">Название</Label>
            <Input
              id="fm-name"
              autoFocus
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumField id="fm-cal" label="Калории (на 100г)" value={form.cal} onChange={(v) => set('cal', v)} />
            <NumField id="fm-protein" label="Белки (г)" value={form.protein} onChange={(v) => set('protein', v)} />
            <NumField id="fm-fat" label="Жиры (г)" value={form.fat} onChange={(v) => set('fat', v)} />
            <NumField id="fm-carbs" label="Углеводы (г)" value={form.carbs} onChange={(v) => set('carbs', v)} />
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
