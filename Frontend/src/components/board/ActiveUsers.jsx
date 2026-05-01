import { useState } from 'react';

const COLORS = [
  ['#4c6ef5', '#e0e7ff'], // indigo
  ['#f97316', '#ffedd5'], // orange
  ['#22c55e', '#dcfce7'], // green
  ['#a855f7', '#f3e8ff'], // purple
  ['#ef4444', '#fee2e2'], // red
  ['#06b6d4', '#cffafe'], // cyan
  ['#eab308', '#fef9c3'], // yellow
  ['#ec4899', '#fce7f3'], // pink
];

const getColor = (name = '') => COLORS[name.charCodeAt(0) % COLORS.length];

const ActiveUsers = ({ users }) => {
  const [open, setOpen] = useState(false);
  const count = users?.length ?? 0;

  return (
    <div className="relative flex items-center">
      {/* Trigger button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl border transition-all
          ${
            count > 0
              ? 'bg-white border-slate-200 hover:border-blue-300 hover:bg-blue-50 shadow-sm'
              : 'bg-slate-50 border-slate-200 text-slate-400'
          }`}
        title={count > 0 ? `${count} user${count !== 1 ? 's' : ''} online` : 'No one else here yet'}
      >
        {/* Stacked avatars (max 3) */}
        <div className="flex items-center">
          {count === 0 ? (
            // Empty: show faded people icon
            <span className="flex items-center gap-1.5 text-slate-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-[11px] font-medium">Waiting…</span>
            </span>
          ) : (
            <>
              {users.slice(0, 3).map((u, i) => {
                const [fg, bg] = getColor(u.name || '?');
                return (
                  <div
                    key={u.userId || i}
                    title={u.name}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white shrink-0 shadow-sm"
                    style={{
                      background: bg,
                      color: fg,
                      marginLeft: i > 0 ? '-6px' : 0,
                      zIndex: 10 - i,
                    }}
                  >
                    {(u.name || '?')[0].toUpperCase()}
                  </div>
                );
              })}
              {/* Count badge */}
              <div className="flex items-center gap-1 ml-2">
                <span className="flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
                <span className="text-[11px] font-semibold text-slate-600">
                  {count} online
                </span>
              </div>
            </>
          )}
        </div>
      </button>

      {/* Dropdown panel */}
      {open && count > 0 && (
        <>
          {/* backdrop */}
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl z-40 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Online now</span>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">{count}</span>
            </div>
            <ul className="py-1 max-h-56 overflow-y-auto">
              {users.map((u, i) => {
                const [fg, bg] = getColor(u.name || '?');
                return (
                  <li key={u.userId || i} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 shadow-sm"
                      style={{ background: bg, color: fg }}
                    >
                      {(u.name || '?')[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-700 truncate">{u.name || 'Unknown'}</p>
                      <p className="text-[10px] text-emerald-500 font-medium flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                        Active
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
};

export default ActiveUsers;
