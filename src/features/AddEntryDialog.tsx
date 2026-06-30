import { useEffect, useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { Entry, Food } from '@/lib/types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  foods: Food[];
  onAdd: (entry: Entry) => void;
}

export function AddEntryDialog({ open, onOpenChange, foods, onAdd }: Props) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Food | null>(null);
  const [amount, setAmount] = useState('100');

  useEffect(() => {
    if (open) {
      setQuery('');
      setSelected(null);
      setAmount('100');
    }
  }, [open]);

  const results = useMemo(
    () => foods.filter((f) => f.name.toLowerCase().includes(query.toLowerCase())),
    [foods, query],
  );

  const k = (+amount || 0) / 100;

  function confirm() {
    if (!selected || !+amount) return;
    onAdd({
      foodId: selected.id,
      name: selected.name,
      amount: +amount,
      cal: selected.cal * k,
      protein: selected.protein * k,
      fat: selected.fat * k,
      carbs: selected.carbs * k,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Добавить продукт</DialogTitle>
        </DialogHeader>

        <Input
          autoFocus
          placeholder="Поиск..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <div className="max-h-56 overflow-y-auto rounded-md border">
          {results.length === 0 ? (
            <div className="p-3 text-sm text-muted-foreground">Ничего не найдено</div>
          ) : (
            results.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSelected(f)}
                className={cn(
                  'flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent',
                  selected?.id === f.id && 'bg-accent',
                )}
              >
                <span>{f.name}</span>
                <span className="text-xs text-muted-foreground">{f.cal} ккал</span>
              </button>
            ))
          )}
        </div>

        {selected && (
          <div className="space-y-2">
            <Label htmlFor="entry-amount">Количество (г / мл)</Label>
            <Input
              id="entry-amount"
              type="number"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              ≈ {Math.round(selected.cal * k)} ккал · Б{(selected.protein * k).toFixed(1)}г · Ж
              {(selected.fat * k).toFixed(1)}г · У{(selected.carbs * k).toFixed(1)}г
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => onOpenChange(false)}>
                Отмена
              </Button>
              <Button onClick={confirm}>Добавить</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
