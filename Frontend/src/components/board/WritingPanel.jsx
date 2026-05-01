import { useState, useRef, useCallback, useEffect } from 'react';

const FONTS = [
  'Inter', 'Arial', 'Verdana', 'Trebuchet MS',
  'Georgia', 'Times New Roman', 'Palatino',
  'Courier New', 'Lucida Console',
  'Comic Sans MS',
];

const SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 48, 72];

const HEADING_FORMATS = [
  { label: 'Normal',     block: 'p' },
  { label: 'Heading 1',  block: 'h1' },
  { label: 'Heading 2',  block: 'h2' },
  { label: 'Heading 3',  block: 'h3' },
  { label: 'Heading 4',  block: 'h4' },
  { label: 'Blockquote', block: 'blockquote' },
  { label: 'Code Block', block: 'pre' },
];

const LINE_HEIGHTS = [
  { label: 'Compact',  value: '1.2'  },
  { label: '1.5',      value: '1.5'  },
  { label: 'Normal',   value: '1.8'  },
  { label: 'Relaxed',  value: '2.2'  },
  { label: 'Double',   value: '2.6'  },
];

export default function WritingPanel({ readOnly = false, socket = null, roomId = null }) {
  const editorRef   = useRef(null);
  const syncTimerRef = useRef(null);    // debounce timer for outgoing sync
  const isRemoteUpdate = useRef(false); // suppress echo
  const [fontSize,   setFontSize]   = useState(16);
  const [fontFamily, setFontFamily] = useState('Inter');
  const [lineHeight, setLineHeight] = useState('1.8');
  const [wordCount,  setWordCount]  = useState(0);
  const [charCount,  setCharCount]  = useState(0);
  const [textColor,  setTextColor]  = useState('#1e293b');
  const [bgColor,    setBgColor]    = useState('#fef08a');

  const exec = useCallback((cmd, val = null) => {
    document.execCommand(cmd, false, val);
    editorRef.current?.focus();
  }, []);

  // ── Socket sync ──────────────────────────────────────────────────────────────
  // Receive remote writing changes
  useEffect(() => {
    if (!socket) return;
    const handle = ({ html }) => {
      if (!editorRef.current) return;
      isRemoteUpdate.current = true;
      // Only update if content differs to avoid cursor jump
      if (editorRef.current.innerHTML !== html) {
        editorRef.current.innerHTML = html;
      }
      isRemoteUpdate.current = false;
    };
    socket.on('writingSync', handle);
    return () => socket.off('writingSync', handle);
  }, [socket]);

  // Broadcast own changes (debounced 300 ms)
  const broadcastContent = useCallback(() => {
    if (!socket || !roomId || !editorRef.current) return;
    socket.emit('writingUpdate', { roomId, html: editorRef.current.innerHTML });
  }, [socket, roomId]);

  const handleInput = () => {
    const text  = editorRef.current?.innerText || '';
    setWordCount(text.trim().split(/\s+/).filter(Boolean).length);
    setCharCount(text.replace(/\n/g, '').length);
    // Debounce sync
    if (!isRemoteUpdate.current && socket && roomId) {
      clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(broadcastContent, 300);
    }
  };

  const insertHR = () =>
    exec('insertHTML', '<hr style="border:none;border-top:2px solid #e2e8f0;margin:1.5em 0;" />');

  const insertLink = () => {
    const url = prompt('Enter URL (include https://):');
    if (url) exec('createLink', url);
  };

  const clearFmt = () => {
    exec('removeFormat');
    editorRef.current.style.fontSize  = '16px';
    editorRef.current.style.fontFamily = 'Inter';
    setFontSize(16);
    setFontFamily('Inter');
  };

  const Btn = ({ cmd, val, title, children, onClick }) => (
    <button
      onMouseDown={(e) => { e.preventDefault(); onClick ? onClick() : exec(cmd, val); }}
      title={title}
      className="px-1.5 py-1 rounded text-sm transition select-none text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    >
      {children}
    </button>
  );

  const Sep = () => <div className="w-px h-5 bg-slate-200 mx-0.5 shrink-0" />;

  return (
    <div className="relative flex flex-col h-full bg-slate-50">

      {/*  TOOLBAR ROWS  */}
      <div className="bg-white border-b border-slate-200 shadow-sm shrink-0">

        {/* ROW 1 � style, font, size, line-height */}
        <div className="flex items-center gap-1 px-3 py-1.5 border-b border-slate-100 flex-wrap">

          <select
            onChange={(e) => exec('formatBlock', e.target.value)}
            defaultValue="p"
            title="Paragraph style"
            className="text-xs border border-slate-200 rounded px-2 py-1 text-slate-600 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 w-28">
            {HEADING_FORMATS.map(f => <option key={f.block} value={f.block}>{f.label}</option>)}
          </select>

          <Sep />

          <select
            value={fontFamily}
            onChange={(e) => { setFontFamily(e.target.value); exec('fontName', e.target.value); }}
            title="Font family"
            className="text-xs border border-slate-200 rounded px-2 py-1 text-slate-600 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 w-36">
            {FONTS.map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f}</option>)}
          </select>

          <Sep />

          {/* size  / select / + */}
          <button onMouseDown={(e) => { e.preventDefault(); const n = Math.max(8, fontSize - 2); setFontSize(n); if (editorRef.current) editorRef.current.style.fontSize = `${n}px`; }}
            className="w-6 h-6 flex items-center justify-center rounded text-slate-500 hover:bg-slate-100 font-bold"></button>
          <select
            value={fontSize}
            onChange={(e) => { const s = Number(e.target.value); setFontSize(s); if (editorRef.current) editorRef.current.style.fontSize = `${s}px`; }}
            className="text-xs border border-slate-200 rounded px-1 py-1 text-slate-600 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 w-16 text-center">
            {SIZES.map(s => <option key={s} value={s}>{s}px</option>)}
          </select>
          <button onMouseDown={(e) => { e.preventDefault(); const n = Math.min(72, fontSize + 2); setFontSize(n); if (editorRef.current) editorRef.current.style.fontSize = `${n}px`; }}
            className="w-6 h-6 flex items-center justify-center rounded text-slate-500 hover:bg-slate-100 font-bold">+</button>

          <Sep />

          {/* line-height */}
          <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <line x1="3" y1="5" x2="21" y2="5"/><line x1="3" y1="10" x2="21" y2="10"/>
            <line x1="3" y1="15" x2="21" y2="15"/><line x1="3" y1="20" x2="21" y2="20"/>
          </svg>
          <select
            value={lineHeight}
            onChange={(e) => { setLineHeight(e.target.value); if (editorRef.current) editorRef.current.style.lineHeight = e.target.value; }}
            className="text-xs border border-slate-200 rounded px-1 py-1 text-slate-600 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 w-22">
            {LINE_HEIGHTS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </div>

        {/* ROW 2 � formatting controls */}
        <div className="flex items-center gap-0.5 px-3 py-1 flex-wrap">

          {/* Bold / Italic / Underline / Strike */}
          <Btn cmd="bold"          title="Bold (Ctrl+B)">        <b>B</b>   </Btn>
          <Btn cmd="italic"        title="Italic (Ctrl+I)">      <i>I</i>   </Btn>
          <Btn cmd="underline"     title="Underline (Ctrl+U)">   <u>U</u>   </Btn>
          <Btn cmd="strikeThrough" title="Strikethrough">         <s>S</s>   </Btn>

          <Sep />

          {/* Superscript / Subscript */}
          <Btn cmd="superscript" title="Superscript">
            <span className="leading-none">x<sup className="text-[8px]">2</sup></span>
          </Btn>
          <Btn cmd="subscript" title="Subscript">
            <span className="leading-none">x<sub className="text-[8px]">2</sub></span>
          </Btn>

          <Sep />

          {/* Alignment */}
          <Btn cmd="justifyLeft"   title="Align left">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="15" y2="12"/><line x1="3" y1="18" x2="18" y2="18"/>
            </svg>
          </Btn>
          <Btn cmd="justifyCenter" title="Align center">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/>
            </svg>
          </Btn>
          <Btn cmd="justifyRight"  title="Align right">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="6" y1="18" x2="21" y2="18"/>
            </svg>
          </Btn>
          <Btn cmd="justifyFull"   title="Justify">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </Btn>

          <Sep />

          {/* Indent / Outdent */}
          <Btn cmd="indent"  title="Increase indent">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <line x1="3" y1="6"  x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="9" y1="18" x2="21" y2="18"/>
              <polyline points="3 8 7 12 3 16"/>
            </svg>
          </Btn>
          <Btn cmd="outdent" title="Decrease indent">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <line x1="3" y1="6"  x2="21" y2="6"/><line x1="9" y1="12" x2="21" y2="12"/><line x1="9" y1="18" x2="21" y2="18"/>
              <polyline points="7 8 3 12 7 16"/>
            </svg>
          </Btn>

          <Sep />

          {/* Lists */}
          <Btn cmd="insertUnorderedList" title="Bullet list">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/>
              <circle cx="4" cy="6"  r="1.5" fill="currentColor" stroke="none"/>
              <circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none"/>
              <circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none"/>
            </svg>
          </Btn>
          <Btn cmd="insertOrderedList" title="Numbered list">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <line x1="10" y1="6"  x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/>
              <text x="2" y="8"  fontSize="7" fill="currentColor" stroke="none">1.</text>
              <text x="2" y="14" fontSize="7" fill="currentColor" stroke="none">2.</text>
              <text x="2" y="20" fontSize="7" fill="currentColor" stroke="none">3.</text>
            </svg>
          </Btn>

          <Sep />

          {/* Text color */}
          <label title="Text color" className="flex items-center gap-1 cursor-pointer px-1.5 py-1 rounded hover:bg-slate-100 transition">
            <span className="text-sm font-bold text-slate-700 leading-none">A</span>
            <div className="w-4 h-1.5 rounded-sm shadow-sm" style={{ background: textColor }} />
            <input type="color" value={textColor}
              onChange={(e) => { setTextColor(e.target.value); exec('foreColor', e.target.value); }}
              className="sr-only" />
          </label>

          {/* Highlight */}
          <label title="Highlight" className="flex items-center gap-1 cursor-pointer px-1.5 py-1 rounded hover:bg-slate-100 transition">
            <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M4 20h4l10-10-4-4L4 16v4z"/><line x1="13.5" y1="6.5" x2="17.5" y2="10.5"/>
            </svg>
            <div className="w-4 h-1.5 rounded-sm shadow-sm" style={{ background: bgColor }} />
            <input type="color" value={bgColor}
              onChange={(e) => { setBgColor(e.target.value); exec('hiliteColor', e.target.value); }}
              className="sr-only" />
          </label>

          <Sep />

          {/* Link & Unlink */}
          <Btn title="Insert link" onClick={insertLink}>
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>
            </svg>
          </Btn>
          <Btn cmd="unlink" title="Remove link">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/>
              <line x1="2" y1="2" x2="22" y2="22"/>
            </svg>
          </Btn>

          {/* HR */}
          <Btn title="Horizontal rule" onClick={insertHR}>
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="6" y2="6"/><line x1="3" y1="18" x2="6" y2="18"/>
            </svg>
          </Btn>

          <Sep />

          {/* Undo / Redo */}
          <Btn cmd="undo" title="Undo (Ctrl+Z)">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M3 7v6h6"/><path d="M3 13C5.33 7.33 12 4 18 7"/>
            </svg>
          </Btn>
          <Btn cmd="redo" title="Redo (Ctrl+Y)">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M21 7v6h-6"/><path d="M21 13C18.67 7.33 12 4 6 7"/>
            </svg>
          </Btn>

          <Sep />

          {/* Clear formatting */}
          <button
            onMouseDown={(e) => { e.preventDefault(); clearFmt(); }}
            title="Clear formatting"
            className="flex items-center gap-1 px-1.5 py-1 rounded text-slate-500 hover:bg-red-50 hover:text-red-500 transition text-xs select-none">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
              <line x1="2" y1="2" x2="22" y2="22"/>
            </svg>
            Clear
          </button>

          <div className="ml-auto flex items-center gap-2 text-[11px] text-slate-400 shrink-0 select-none">
            <span><b className="text-slate-600">{wordCount}</b> words</span>
            <span><b className="text-slate-600">{charCount}</b> chars</span>
          </div>
        </div>
      </div>

      {/*  EDITOR  */}
      <div className="flex-1 overflow-y-auto p-8 flex justify-center">
        {readOnly && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-1.5
                          bg-amber-50 border border-amber-200 rounded-xl shadow pointer-events-none">
            <svg className="w-3.5 h-3.5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
            </svg>
            <span className="text-xs font-semibold text-amber-700">View only — Host controls the board</span>
          </div>
        )}
        <div className="w-full max-w-3xl min-h-full bg-white rounded-2xl shadow-sm border border-slate-100 px-14 py-12">
          <div
            ref={editorRef}
            contentEditable={!readOnly}
            suppressContentEditableWarning
            onInput={handleInput}
            spellCheck
            data-placeholder="Start writing your notes here"
            style={{ fontFamily, fontSize: `${fontSize}px`, lineHeight, cursor: readOnly ? 'default' : 'text' }}
            className="min-h-[500px] outline-none text-slate-800
              [&_h1]:text-4xl [&_h1]:font-bold [&_h1]:text-slate-900 [&_h1]:mb-3 [&_h1]:mt-5 [&_h1]:leading-tight
              [&_h2]:text-3xl [&_h2]:font-bold [&_h2]:text-slate-800 [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:leading-tight
              [&_h3]:text-2xl [&_h3]:font-semibold [&_h3]:text-slate-800 [&_h3]:mb-2 [&_h3]:mt-3
              [&_h4]:text-xl  [&_h4]:font-semibold [&_h4]:text-slate-700 [&_h4]:mb-1 [&_h4]:mt-2
              [&_blockquote]:border-l-4 [&_blockquote]:border-blue-400 [&_blockquote]:pl-4 [&_blockquote]:text-slate-500 [&_blockquote]:italic [&_blockquote]:my-3
              [&_pre]:bg-slate-900 [&_pre]:text-emerald-300 [&_pre]:rounded-xl [&_pre]:px-5 [&_pre]:py-4 [&_pre]:font-mono [&_pre]:text-sm [&_pre]:my-3 [&_pre]:overflow-x-auto
              [&_ul]:list-disc  [&_ul]:pl-6 [&_ul]:my-2
              [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-2
              [&_li]:mb-1
              [&_a]:text-blue-600 [&_a]:underline
              empty:before:content-[attr(data-placeholder)] empty:before:text-slate-300 empty:before:pointer-events-none"
          />
        </div>
      </div>
    </div>
  );
}
