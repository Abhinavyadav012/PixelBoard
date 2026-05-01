const TOOLS_PRIMARY = [
  {
    id: 'pencil', label: 'Pencil', key: 'P',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
      </svg>
    ),
  },
  {
    id: 'eraser', label: 'Eraser', key: 'E',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
        <path d="M20 20H7L3 16l10-10 7 7-2.5 2.5" />
        <path d="M6.0037 10.3462L13.6565 17.9989" />
      </svg>
    ),
  },
];

const TOOLS_SHAPES = [
  {
    id: 'line', label: 'Line', key: 'L',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" className="w-4 h-4">
        <line x1="5" y1="19" x2="19" y2="5" />
      </svg>
    ),
  },
  {
    id: 'rect', label: 'Rect', key: 'R',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <rect x="3" y="3" width="18" height="18" rx="2.5" />
      </svg>
    ),
  },
  {
    id: 'circle', label: 'Circle', key: 'C',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="w-4 h-4">
        <ellipse cx="12" cy="12" rx="10" ry="7" />
      </svg>
    ),
  },
];

const PRESET_COLORS = [
  { hex: '#1e293b', name: 'Black'  },
  { hex: '#ef4444', name: 'Red'    },
  { hex: '#f97316', name: 'Orange' },
  { hex: '#22c55e', name: 'Green'  },
  { hex: '#3b82f6', name: 'Blue'   },
  { hex: '#a855f7', name: 'Purple' },
  { hex: '#ec4899', name: 'Pink'   },
  { hex: '#ffffff', name: 'White'  },
];

const HR = () => <div className="w-full h-px bg-slate-100 my-2" />;

const ToolBtn = ({ t, active, onClick }) => (
  <button
    onClick={onClick}
    title={`${t.label} (${t.key})`}
    className={`flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-150 mx-auto
      ${active
        ? 'bg-slate-800 text-white shadow-sm'
        : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
      }`}
  >
    {t.icon}
  </button>
);

const Toolbar = ({ tool, setTool, color, setColor, size, setSize, fill, setFill, onUndo, onRedo, onClear }) => {
  return (
    <aside
      className="flex flex-col items-center w-[60px] shrink-0 bg-white border-r border-slate-200 py-3 overflow-y-auto"
      style={{ scrollbarWidth: 'none' }}
    >

      {/* Primary tools: pencil + eraser */}
      <div className="flex flex-col gap-1 w-full px-1.5">
        {TOOLS_PRIMARY.map((t) => (
          <ToolBtn key={t.id} t={t} active={tool === t.id} onClick={() => setTool(t.id)} />
        ))}
      </div>

      <HR />

      {/* Shape tools */}
      <div className="flex flex-col gap-1 w-full px-1.5">
        {TOOLS_SHAPES.map((t) => (
          <ToolBtn key={t.id} t={t} active={tool === t.id} onClick={() => setTool(t.id)} />
        ))}
      </div>

      {/* Fill toggle */}
      <button
        onClick={() => setFill((f) => !f)}
        title={fill ? 'Filled — click for Outline' : 'Outline — click for Filled'}
        className={`flex items-center justify-center w-10 h-10 rounded-xl mx-auto mt-1 transition-all border
          ${fill
            ? 'bg-slate-100 text-slate-700 border-slate-300'
            : 'text-slate-400 border-transparent hover:bg-slate-50 hover:text-slate-600'
          }`}
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill={fill ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
          <rect x="3" y="3" width="18" height="18" rx="2.5" />
        </svg>
      </button>

      <HR />

      {/* Color swatches */}
      <div className="flex flex-col gap-1.5 w-full px-2.5">
        {PRESET_COLORS.map((c) => (
          <button
            key={c.hex}
            onClick={() => setColor(c.hex)}
            title={c.name}
            className={`w-full aspect-square rounded-xl transition-all duration-150
              ${color === c.hex
                ? 'ring-2 ring-offset-1 ring-slate-600 scale-95 shadow-md'
                : 'hover:scale-95 hover:shadow-sm border border-slate-200'
              }
              ${c.hex === '#ffffff' ? 'border border-slate-300' : ''}`}
            style={{ background: c.hex }}
          />
        ))}

        {/* Custom color picker */}
        <label title="Custom color" className="w-full aspect-square cursor-pointer relative">
          <div
            className="w-full h-full rounded-xl border-2 border-dashed border-slate-300 hover:border-slate-400 transition overflow-hidden"
            style={{ background: PRESET_COLORS.some(c => c.hex === color) ? 'transparent' : color }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-3 h-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
              </svg>
            </div>
          </div>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="sr-only" />
        </label>
      </div>

      <HR />

      {/* Size slider */}
      <div className="w-full px-2.5 flex flex-col items-center gap-1">
        <p className="text-[10px] text-slate-400 font-medium">{size}px</p>
        <input
          type="range" min={1} max={50} value={size}
          onChange={(e) => setSize(Number(e.target.value))}
          className="w-full h-1.5 accent-slate-700 rounded-full cursor-pointer"
          style={{ writingMode: 'initial' }}
        />
      </div>

      <HR />

      {/* Actions: undo / redo / clear */}
      <div className="flex flex-col gap-1 w-full px-1.5">
        <button onClick={onUndo} title="Undo (Ctrl+Z)"
          className="flex items-center justify-center w-10 h-10 rounded-xl mx-auto text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition">
          <svg className="w-4.5 h-4.5 w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 7v6h6" /><path d="M3 13C5.333 8.333 9.6 6 15 6c3 0 5.5 1.167 7.5 3.5" />
          </svg>
        </button>
        <button onClick={onRedo} title="Redo (Ctrl+Y)"
          className="flex items-center justify-center w-10 h-10 rounded-xl mx-auto text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 7v6h-6" /><path d="M21 13C18.667 8.333 14.4 6 9 6c-3 0-5.5 1.167-7.5 3.5" />
          </svg>
        </button>
        <button onClick={onClear} title="Clear board"
          className="flex items-center justify-center w-10 h-10 rounded-xl mx-auto text-slate-400 hover:bg-red-50 hover:text-red-500 transition">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
          </svg>
        </button>
      </div>
    </aside>
  );
};

export default Toolbar;
