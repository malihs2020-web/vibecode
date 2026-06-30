const tg = typeof window !== 'undefined' ? window.Telegram?.WebApp : undefined;

export function isTelegram(): boolean {
  return !!tg?.initData;
}

export function initTelegram(): void {
  if (!tg) return;
  tg.ready();
  tg.expand();
}
