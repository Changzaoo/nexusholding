import { useEffect, useRef, useState } from 'react';
import { useNotifications, type Severity } from '../lib/notifications';
import type { ModuleKey } from '../lib/crm';

const SEV: Record<Severity, { color: string; icon: string }> = {
  urgent: { color: '#ff5d73', icon: '⚠' },
  warn: { color: '#ffd166', icon: '◔' },
  info: { color: '#41e8ff', icon: '•' },
};
const fmtAgo = (ts: number) => {
  const min = Math.max(0, Math.round((Date.now() - ts) / 60000));
  if (min < 60) return `${min}min`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
};

/** Sino de notificações: badge de não lidas + painel; clicar leva ao módulo. */
export function NotificationBell({ onNavigate }: { onNavigate: (m: ModuleKey) => void }) {
  const { items, unread, readSet, markRead, markAllRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  const go = (m: ModuleKey, id: string) => { markRead(id); setOpen(false); onNavigate(m); };

  return (
    <div ref={ref} className="relative">
      <button
        data-tour="notif"
        onClick={() => setOpen((o) => !o)}
        aria-label="Notificações"
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-white/12 text-white/70 transition-colors hover:border-neon-cyan/40 hover:text-neon-cyan"
      >
        <span className="text-base">🔔</span>
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-neon-magenta px-1 font-mono text-[9px] font-bold text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-[70] mt-2 w-[330px] max-w-[88vw] overflow-hidden rounded-2xl border border-white/10 bg-void/95 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
            <span className="font-mono text-[10px] tracking-[0.25em] text-white/55 uppercase">Notificações</span>
            {items.length > 0 && unread > 0 && (
              <button onClick={markAllRead} className="font-mono text-[10px] tracking-[0.18em] text-neon-cyan uppercase hover:text-white">marcar lidas</button>
            )}
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {items.length === 0 ? (
              <div className="p-8 text-center font-mono text-xs text-white/40">Tudo em dia. 🎉</div>
            ) : (
              items.slice(0, 50).map((it) => {
                const s = SEV[it.severity];
                const lida = readSet.has(it.id);
                return (
                  <button
                    key={it.id}
                    onClick={() => go(it.module, it.id)}
                    className={`flex w-full items-start gap-3 border-b border-white/5 px-4 py-3 text-left transition-colors last:border-0 hover:bg-white/5 ${lida ? 'opacity-55' : ''}`}
                  >
                    <span className="mt-0.5 text-sm" style={{ color: s.color }}>{s.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-white">{it.title}</span>
                        {!lida && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-neon-magenta" />}
                      </div>
                      {it.body && <div className="mt-0.5 truncate font-mono text-[11px] text-white/50">{it.body}</div>}
                    </div>
                    <span className="shrink-0 font-mono text-[9px] text-white/30">{fmtAgo(it.ts)}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
