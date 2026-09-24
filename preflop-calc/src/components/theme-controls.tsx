import { Moon, Sun } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTheme, type Accent } from '@/components/theme-provider';

const ACCENTS: { id: Accent; label: string; swatch: string }[] = [
  { id: 'blue', label: 'Синий акцент', swatch: 'bg-[hsl(221_83%_53%)]' },
  { id: 'green', label: 'Зелёный акцент', swatch: 'bg-[hsl(142_71%_40%)]' },
];

export function ThemeControls() {
  const { theme, accent, toggleTheme, setAccent } = useTheme();

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-1 rounded-full border bg-card p-1">
        {ACCENTS.map((a) => (
          <button
            key={a.id}
            type="button"
            aria-label={a.label}
            aria-pressed={accent === a.id}
            title={a.label}
            onClick={() => setAccent(a.id)}
            className={cn(
              'h-6 w-6 rounded-full ring-offset-2 ring-offset-card transition-all',
              a.swatch,
              accent === a.id ? 'ring-2 ring-foreground' : 'opacity-70 hover:opacity-100',
            )}
          />
        ))}
      </div>
      <Button
        variant="outline"
        size="icon"
        onClick={toggleTheme}
        aria-label="Переключить тему"
        title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
      >
        {theme === 'dark' ? <Sun /> : <Moon />}
      </Button>
    </div>
  );
}
