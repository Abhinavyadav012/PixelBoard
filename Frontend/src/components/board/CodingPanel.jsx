import { useState, useRef, useCallback, useEffect } from 'react';

const LANGUAGES = ['JavaScript', 'Python', 'TypeScript', 'HTML', 'CSS', 'Java', 'C++', 'Go', 'Rust', 'SQL'];

const THEMES = {
  dark: {
    bg: 'bg-slate-900',
    editor: 'bg-slate-900 text-emerald-300',
    lineNums: 'bg-slate-800 text-slate-500',
    header: 'bg-slate-800 border-slate-700',
    headerText: 'text-slate-400',
    dot: ['bg-red-500', 'bg-yellow-500', 'bg-green-500'],
    statusBar: 'bg-slate-800 border-slate-700 text-slate-400',
  },
  light: {
    bg: 'bg-white',
    editor: 'bg-white text-slate-800',
    lineNums: 'bg-slate-50 text-slate-400',
    header: 'bg-slate-100 border-slate-200',
    headerText: 'text-slate-500',
    dot: ['bg-red-400', 'bg-yellow-400', 'bg-green-400'],
    statusBar: 'bg-slate-50 border-slate-200 text-slate-500',
  },
};

const CodingPanel = ({ socket = null, roomId = null, readOnly = false }) => {
  const [code, setCode] = useState('// Welcome to the PixelBoard Code Editor\n// Start typing your code here...\n\n');
  const [language, setLanguage] = useState('JavaScript');
  const [theme, setTheme] = useState('dark');
  const [fontSize, setFontSize] = useState(14);
  const [copied, setCopied] = useState(false);
  const textareaRef = useRef(null);
  const syncTimerRef = useRef(null);
  const isRemoteUpdate = useRef(false);

  const t = THEMES[theme];

  const lines = code.split('\n');

  // ── Socket sync: receive remote coding changes ───────────────────────────
  useEffect(() => {
    if (!socket) return;
    const handle = ({ code: remoteCode, language: remoteLang }) => {
      isRemoteUpdate.current = true;
      if (remoteCode !== undefined) setCode(remoteCode);
      if (remoteLang !== undefined) setLanguage(remoteLang);
      isRemoteUpdate.current = false;
    };
    socket.on('codingSync', handle);
    return () => socket.off('codingSync', handle);
  }, [socket]);

  // Broadcast own changes (debounced 300ms)
  const broadcastCode = useCallback((newCode, newLang) => {
    if (!socket || !roomId) return;
    socket.emit('codingUpdate', { roomId, code: newCode, language: newLang });
  }, [socket, roomId]);

  const handleCodeChange = (e) => {
    const newCode = e.target.value;
    setCode(newCode);
    if (!isRemoteUpdate.current && socket && roomId) {
      clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(() => broadcastCode(newCode, language), 300);
    }
  };

  const handleLanguageChange = (e) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    if (!isRemoteUpdate.current && socket && roomId) {
      broadcastCode(code, newLang);
    }
  };

  // Handle Tab key for indentation
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end   = e.target.selectionEnd;
      const newCode = code.slice(0, start) + '  ' + code.slice(end);
      setCode(newCode);
      if (!isRemoteUpdate.current && socket && roomId) {
        clearTimeout(syncTimerRef.current);
        syncTimerRef.current = setTimeout(() => broadcastCode(newCode, language), 300);
      }
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = start + 2;
          textareaRef.current.selectionEnd   = start + 2;
        }
      });
    }
    // Ctrl+/ — toggle line comment
    if ((e.ctrlKey || e.metaKey) && e.key === '/') {
      e.preventDefault();
      const start = e.target.selectionStart;
      const lineStart = code.lastIndexOf('\n', start - 1) + 1;
      const lineEnd   = code.indexOf('\n', start);
      const line = code.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
      const prefix = ['Python', 'Ruby'].includes(language) ? '# ' : '// ';
      const newLine = line.startsWith(prefix) ? line.slice(prefix.length) : prefix + line;
      const end2 = lineEnd === -1 ? code.length : lineEnd;
      const toggledCode = code.slice(0, lineStart) + newLine + code.slice(end2);
      setCode(toggledCode);
      if (!isRemoteUpdate.current && socket && roomId) {
        clearTimeout(syncTimerRef.current);
        syncTimerRef.current = setTimeout(() => broadcastCode(toggledCode, language), 300);
      }
    }
  }, [code, language, socket, roomId, broadcastCode]);

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadCode = () => {
    const extMap = { JavaScript: 'js', TypeScript: 'ts', Python: 'py', HTML: 'html', CSS: 'css', Java: 'java', 'C++': 'cpp', Go: 'go', Rust: 'rs', SQL: 'sql' };
    const ext  = extMap[language] || 'txt';
    const blob = new Blob([code], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `code.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`flex flex-col h-full ${t.bg}`}>
      {/* Editor header — macOS-style window chrome */}
      <div className={`flex items-center gap-3 px-4 h-10 border-b ${t.header} shrink-0`}>
        {/* Traffic lights */}
        <div className="flex items-center gap-1.5">
          {t.dot.map((c, i) => <span key={i} className={`w-3 h-3 rounded-full ${c}`} />)}
        </div>

        <div className="flex-1 flex items-center justify-center">
          <span className={`text-xs font-mono ${t.headerText}`}>
            code.{({ JavaScript:'js', TypeScript:'ts', Python:'py', HTML:'html', CSS:'css', Java:'java', 'C++':'cpp', Go:'go', Rust:'rs', SQL:'sql' })[language] || 'txt'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Language picker */}
          <select
            value={language}
            onChange={handleLanguageChange}
            className={`text-xs rounded-md px-2 py-0.5 border ${t.header} ${t.headerText} bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500`}
          >
            {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
          </select>

          {/* Font size */}
          <select
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className={`text-xs rounded-md px-2 py-0.5 border ${t.header} ${t.headerText} bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500`}
          >
            {[11, 12, 13, 14, 16, 18, 20].map(s => <option key={s} value={s}>{s}px</option>)}
          </select>

          {/* Theme toggle */}
          <button
            onClick={() => setTheme(th => th === 'dark' ? 'light' : 'dark')}
            title="Toggle theme"
            className={`p-1 rounded ${t.headerText} hover:opacity-80 transition`}
          >
            {theme === 'dark'
              ? <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              : <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"/></svg>
            }
          </button>

          {/* Copy */}
          <button onClick={copyCode} title="Copy code"
            className={`text-xs px-2 py-0.5 rounded border ${t.header} ${t.headerText} hover:opacity-80 transition`}
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>

          {/* Download */}
          <button onClick={downloadCode} title="Download file"
            className={`text-xs px-2 py-0.5 rounded border ${t.header} ${t.headerText} hover:opacity-80 transition`}
          >
            ↓ Save
          </button>
        </div>
      </div>

      {/* Editor body — line numbers + textarea */}
      <div className="flex flex-1 overflow-hidden font-mono" style={{ fontSize }}>
        {/* Line numbers */}
        <div className={`${t.lineNums} select-none text-right px-3 pt-4 pb-4 overflow-hidden shrink-0 min-w-[3rem] leading-6`}
          aria-hidden>
          {lines.map((_, i) => (
            <div key={i} className="leading-6">{i + 1}</div>
          ))}
        </div>

        {/* Code textarea */}
        <textarea
          ref={textareaRef}
          value={code}
          onChange={handleCodeChange}
          onKeyDown={readOnly ? undefined : handleKeyDown}
          readOnly={readOnly}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          className={`flex-1 resize-none outline-none px-4 pt-4 pb-4 leading-6 ${t.editor} overflow-auto`}
          style={{ fontSize, tabSize: 2 }}
          placeholder="// Start coding..."
        />
      </div>

      {/* Status bar */}
      <div className={`h-6 border-t ${t.statusBar} shrink-0 flex items-center px-4 gap-4 text-[11px]`}>
        <span>{language}</span>
        <span>UTF-8</span>
        <span>Spaces: 2</span>
        <span className="ml-auto">{lines.length} lines · {code.length} chars</span>
      </div>
    </div>
  );
};

export default CodingPanel;
