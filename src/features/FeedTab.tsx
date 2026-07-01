import { useEffect, useRef, useState } from 'react';
import { Flag, Plus, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { isTelegram } from '@/hooks/useTelegram';

interface Post {
  id: string;
  text: string;
  goal_tag: 'lose' | 'gain' | 'universal';
  author_name: string;
  created_at: string;
  is_generated: boolean;
  reactions: Record<string, number>;
}

const GOAL_LABEL: Record<Post['goal_tag'], string> = {
  lose: 'Похудение',
  gain: 'Набор',
  universal: 'Здоровье',
};
const GOAL_CLASS: Record<Post['goal_tag'], string> = {
  lose: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  gain: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  universal: 'bg-secondary text-secondary-foreground',
};
const EMOJIS = ['❤️', '👏', '💪'] as const;

function getInitData() {
  return window.Telegram?.WebApp?.initData ?? '';
}

function getGoalFromProfile(): Post['goal_tag'] {
  try {
    const p = JSON.parse(localStorage.getItem('userProfile') ?? '{}');
    if (p.direction === 'lose') return 'lose';
    if (p.direction === 'gain') return 'gain';
  } catch { /* ignore */ }
  return 'universal';
}

async function apiFetchPosts(goal: string, offset = 0): Promise<Post[]> {
  const r = await fetch(`/api/feed/posts?goal=${goal}&limit=20&offset=${offset}`);
  if (!r.ok) throw new Error('Ошибка загрузки ленты');
  return ((await r.json()).posts ?? []) as Post[];
}

async function apiReact(postId: string, emoji: string) {
  await fetch('/api/feed/react', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initData: getInitData(), post_id: postId, emoji }),
  });
}

async function apiReport(postId: string) {
  await fetch('/api/feed/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initData: getInitData(), post_id: postId }),
  });
}

async function apiCreatePost(
  text: string,
  goal_tag: string,
  author_name: string,
): Promise<string | null> {
  const r = await fetch('/api/feed/post', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initData: getInitData(), text, goal_tag, author_name }),
  });
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    return (d as { error?: string }).error ?? 'Ошибка публикации';
  }
  return null;
}

function getTgName(): string {
  const u = window.Telegram?.WebApp?.initDataUnsafe?.user;
  if (!u) return '';
  return [u.first_name, u.last_name].filter(Boolean).join(' ') || u.username || '';
}

export function FeedTab() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [myReactions, setMyReactions] = useState<Record<string, string>>({});
  const [hidden, setHidden] = useState<Set<string>>(new Set());

  const [showCreate, setShowCreate] = useState(false);
  const [createText, setCreateText] = useState('');
  const [createGoal, setCreateGoal] = useState<Post['goal_tag']>(getGoalFromProfile());
  const [createName, setCreateName] = useState(() => getTgName());
  const [createStatus, setCreateStatus] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const goal = getGoalFromProfile();
  const inTg = isTelegram();
  const offsetRef = useRef(0);
  const hasMoreRef = useRef(true);

  useEffect(() => {
    setLoading(true);
    apiFetchPosts(goal, 0)
      .then((data) => {
        setPosts(data);
        offsetRef.current = data.length;
        hasMoreRef.current = data.length === 20;
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function loadMore() {
    if (loadingMore || !hasMoreRef.current) return;
    setLoadingMore(true);
    try {
      const more = await apiFetchPosts(goal, offsetRef.current);
      setPosts((prev) => [...prev, ...more]);
      offsetRef.current += more.length;
      hasMoreRef.current = more.length === 20;
    } catch { /* ignore */ }
    finally { setLoadingMore(false); }
  }

  function react(postId: string, emoji: string) {
    if (!inTg) return;
    const prev = myReactions[postId];
    setMyReactions((m) => ({ ...m, [postId]: emoji }));
    setPosts((all) =>
      all.map((p) => {
        if (p.id !== postId) return p;
        const r = { ...p.reactions };
        if (prev && prev !== emoji) r[prev] = Math.max(0, (r[prev] ?? 1) - 1);
        if (!prev || prev !== emoji) r[emoji] = (r[emoji] ?? 0) + 1;
        return { ...p, reactions: r };
      }),
    );
    apiReact(postId, emoji).catch(() => {});
  }

  function report(postId: string) {
    if (!inTg) return;
    apiReport(postId).catch(() => {});
    setHidden((s) => new Set([...s, postId]));
  }

  async function submitPost() {
    if (!createText.trim() || creating) return;
    setCreating(true);
    setCreateStatus(null);
    const err = await apiCreatePost(createText, createGoal, createName);
    setCreating(false);
    if (err) {
      setCreateStatus(err);
    } else {
      setCreateText('');
      setCreateStatus('✓ Пост отправлен на модерацию');
      setTimeout(() => { setShowCreate(false); setCreateStatus(null); }, 2000);
    }
  }

  const visible = posts.filter((p) => !hidden.has(p.id));

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground text-sm">
        Загружаем ленту…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center text-destructive text-sm">{error}</div>
    );
  }

  return (
    <div className="relative">
      {/* Scroll-snap feed */}
      <div
        className="overflow-y-scroll"
        style={{ height: 'calc(100svh - 185px)', scrollSnapType: 'y mandatory' }}
      >
        {visible.length === 0 && (
          <div
            style={{ scrollSnapAlign: 'start', minHeight: 'calc(100svh - 185px)' }}
            className="flex flex-col items-center justify-center gap-4 text-center text-muted-foreground"
          >
            <div className="text-4xl">🌱</div>
            <div className="text-sm">Лента пока пуста.<br />Будь первым!</div>
            {inTg && (
              <Button size="sm" onClick={() => setShowCreate(true)}>Поделиться</Button>
            )}
          </div>
        )}

        {visible.map((post) => (
          <div
            key={post.id}
            style={{ scrollSnapAlign: 'start', minHeight: 'calc(100svh - 185px)' }}
            className="flex flex-col justify-between rounded-xl border bg-card p-5"
          >
            {/* Автор + жалоба */}
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-base font-bold text-primary">
                {post.author_name[0]?.toUpperCase() ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold leading-tight truncate">{post.author_name}</div>
                <span className={cn('mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium', GOAL_CLASS[post.goal_tag])}>
                  {GOAL_LABEL[post.goal_tag]}
                </span>
              </div>
              {inTg && (
                <button
                  type="button"
                  aria-label="Пожаловаться"
                  onClick={() => report(post.id)}
                  className="mt-1 text-muted-foreground/40 hover:text-destructive transition-colors"
                >
                  <Flag className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Текст */}
            <div className="my-6 flex-1 text-[15px] leading-relaxed">{post.text}</div>

            {/* Реакции */}
            <div className="flex gap-2">
              {EMOJIS.map((emoji) => {
                const count = post.reactions[emoji] ?? 0;
                const active = myReactions[post.id] === emoji;
                return (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => react(post.id, emoji)}
                    className={cn(
                      'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors',
                      active
                        ? 'border-primary bg-primary/10 font-medium'
                        : 'border-border bg-background hover:bg-accent',
                      !inTg && 'pointer-events-none',
                    )}
                  >
                    {emoji}
                    {count > 0 && (
                      <span className="text-xs text-muted-foreground">{count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Конец ленты */}
        {visible.length > 0 && (
          <div
            style={{ scrollSnapAlign: 'start', minHeight: 'calc(100svh - 185px)' }}
            className="flex flex-col items-center justify-center gap-4 text-center text-muted-foreground"
          >
            <div className="text-3xl">🎉</div>
            <div className="text-sm">На сегодня всё!</div>
            {hasMoreRef.current ? (
              <Button variant="outline" size="sm" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? 'Загружаем…' : 'Загрузить ещё'}
              </Button>
            ) : inTg ? (
              <Button size="sm" onClick={() => setShowCreate(true)}>
                <Plus className="mr-1 h-4 w-4" /> Поделиться историей
              </Button>
            ) : null}
          </div>
        )}
      </div>

      {/* FAB — создать пост */}
      {inTg && !showCreate && (
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="fixed bottom-6 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
        >
          <Plus className="h-5 w-5" />
        </button>
      )}

      {/* Bottom sheet создания поста */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => { if (!creating) setShowCreate(false); }} />
          <div className="relative w-full rounded-t-2xl bg-background p-5 shadow-xl space-y-4">
            <div className="font-semibold">Поделиться</div>

            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Имя (необязательно)</label>
              <input
                type="text"
                placeholder="Как вас называть?"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                maxLength={50}
                className="flex h-9 w-full rounded-md border bg-background px-3 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Тема</label>
              <div className="flex gap-2">
                {(['lose', 'gain', 'universal'] as const).map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setCreateGoal(tag)}
                    className={cn(
                      'flex-1 rounded-full border px-2 py-1 text-xs font-medium transition-colors',
                      createGoal === tag
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border hover:bg-accent',
                    )}
                  >
                    {GOAL_LABEL[tag]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <textarea
                placeholder="Поделитесь своей историей, маленькой победой или поддержкой для других…"
                value={createText}
                onChange={(e) => setCreateText(e.target.value)}
                maxLength={500}
                rows={4}
                className="w-full rounded-md border bg-background px-3 py-2 text-sm resize-none ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="text-right text-xs text-muted-foreground">{createText.length}/500</div>
            </div>

            {createStatus && (
              <div className={cn(
                'rounded-md px-3 py-2 text-sm',
                createStatus.startsWith('✓')
                  ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'
                  : 'bg-destructive/10 text-destructive',
              )}>
                {createStatus}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setShowCreate(false); setCreateStatus(null); }}
                disabled={creating}
              >
                Отмена
              </Button>
              <Button
                className="flex-1"
                onClick={submitPost}
                disabled={!createText.trim() || creating}
              >
                <Send className="mr-1 h-4 w-4" />
                {creating ? 'Отправка…' : 'Отправить'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
