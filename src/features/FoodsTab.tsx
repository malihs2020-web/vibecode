import { useMemo, useState } from 'react';
import { Pencil, Plus, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { Food } from '@/lib/types';
import { FoodDialog, type FoodDraft } from './FoodDialog';

interface Props {
  foods: Food[];
  onSave: (draft: FoodDraft, id: string | null) => void;
  onDelete: (id: string) => void;
}

export function FoodsTab({ foods, onSave, onDelete }: Props) {
  const [query, setQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Food | null>(null);

  const filtered = useMemo(
    () => foods.filter((f) => f.name.toLowerCase().includes(query.toLowerCase())),
    [foods, query],
  );

  function openNew() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(food: Food) {
    setEditing(food);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Поиск продукта..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button className="shrink-0" onClick={openNew}>
          <Plus /> <span className="hidden sm:inline">Новый продукт</span>
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">Продукты не найдены</div>
          ) : (
            filtered.map((f) => (
              <div
                key={f.id}
                className="flex items-center gap-3 border-b px-4 py-3 text-sm last:border-b-0"
              >
                <div className="flex-1">
                  <div className="font-medium">{f.name}</div>
                  <div className="text-xs text-muted-foreground">
                    Б{f.protein} · Ж{f.fat} · У{f.carbs}
                  </div>
                </div>
                <div className="min-w-14 text-right font-bold">{f.cal} ккал</div>
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => openEdit(f)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 border-destructive text-destructive hover:bg-destructive/10"
                  onClick={() => onDelete(f.id)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <FoodDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        food={editing}
        onSave={onSave}
      />
    </div>
  );
}
