import { useState, useEffect, useRef } from 'react';

const MAX_FILE_MB = 5;

const Chat = ({
  socket, roomId, user, initialMessages = [],
  onScreenShare, isScreenSharing, activeUsers = [], isHost,
  userPermissions = {}, onKickUser, onSetPermission, mySocketId,
  hasMoreMessages = false, onLoadMoreMessages, loadingMoreMessages = false,
}) => {
  const [messages, setMessages]     = useState(initialMessages);
  const [text, setText]             = useState('');
  const [sending, setSending]       = useState(false);
  const [filePreview, setFilePreview] = useState(null);
  const [activeTab, setActiveTab]   = useState('chat'); // 'chat' | 'users'
  const [openMenuId, setOpenMenuId] = useState(null);   // socketId whose 3-dot menu is open
  const [viewerItem, setViewerItem] = useState(null);   // { dataUrl, fileName, fileType }
  const bottomRef = useRef(null);
  const fileRef   = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { setMessages(initialMessages); }, [initialMessages]);

  useEffect(() => {
    if (!socket) return;
    const handle = (msg) => setMessages((prev) => [...prev, msg]);
    socket.on('receiveMessage', handle);
    return () => socket.off('receiveMessage', handle);
  }, [socket]);

  /* ── send ─────────────────────────────────────────────────────────────────── */
  const sendMessage = (e) => {
    e.preventDefault();
    if ((!text.trim() && !filePreview) || !socket || sending) return;
    setSending(true);
    if (filePreview) {
      socket.emit('sendMessage', {
        roomId, sender: user, text: filePreview.name,
        messageType: 'file', fileData: filePreview.dataUrl,
        fileName: filePreview.name, fileType: filePreview.type,
      });
      setFilePreview(null);
      if (fileRef.current) fileRef.current.value = '';
    } else {
      socket.emit('sendMessage', { roomId, sender: user, text: text.trim(), messageType: 'text' });
      setText('');
    }
    setSending(false);
  };

  /* ── file ─────────────────────────────────────────────────────────────────── */
  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      alert(`File too large — max ${MAX_FILE_MB} MB.`);
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setFilePreview({ dataUrl: reader.result, name: file.name, type: file.type });
    reader.readAsDataURL(file);
  };

  const cancelFile = () => {
    setFilePreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  /* ── helpers ─────────────────────────────────────────────────────────────── */
  const formatTime = (ts) => new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const isMine  = (msg) => msg.sender?._id === user?._id || msg.sender === user?._id;
  const isImage = (type = '') => type.startsWith('image/');
  const isPDF   = (type = '') => type === 'application/pdf';

  return (
    <div className="flex flex-col h-full bg-white dark:bg-neutral-900">

      {/* ── Tab bar ───────────────────────────────────────────────────────────── */}
      <div className="flex border-b border-slate-100 shrink-0 bg-white">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-all
            ${activeTab === 'chat'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/40'
              : 'text-slate-400 hover:text-slate-600 border-b-2 border-transparent hover:bg-slate-50'}`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          Chat
          {messages.length > 0 && (
            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[9px] rounded-full font-bold tabular-nums">
              {messages.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-all
            ${activeTab === 'users'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/40'
              : 'text-slate-400 hover:text-slate-600 border-b-2 border-transparent hover:bg-slate-50'}`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Users
          <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-600 text-[9px] rounded-full font-bold tabular-nums">
            {activeUsers.length}
          </span>
        </button>
      </div>

      {/* ── Users tab ─────────────────────────────────────────────────────────── */}
      {activeTab === 'users' && (
        <div className="flex-1 overflow-y-auto min-h-0">
          {activeUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 gap-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
                </svg>
              </div>
              <p className="text-xs text-slate-400 font-medium">No one else here yet</p>
            </div>
          ) : (
            <ul className="py-2">
              {activeUsers.map((u, i) => {
                const name       = u?.name || 'User';
                const initials   = name.slice(0, 2).toUpperCase();
                const bg         = ['bg-blue-500','bg-emerald-500','bg-amber-500','bg-rose-500','bg-purple-500','bg-cyan-500'][i % 6];
                const sid        = u?.socketId;
                const isMe       = !!mySocketId && sid === mySocketId;
                const isHostUser = isHost && isMe;
                const canManage  = isHost && !isMe && !!sid;
                const perm       = sid ? (userPermissions[sid] || 'read-write') : 'read-write';
                const BADGE      = { 'read-write':{ label:'Full', cls:'bg-emerald-100 text-emerald-700' }, 'draw-only':{ label:'Draw', cls:'bg-blue-100 text-blue-700' }, 'write-only':{ label:'Write', cls:'bg-violet-100 text-violet-700' }, 'read-only':{ label:'Read', cls:'bg-amber-100 text-amber-700' } };
                const badge      = BADGE[perm] || BADGE['read-write'];
                const menuOpen   = openMenuId === sid;

                const PERMS = [
                  { value:'read-write', label:'Full Access',  desc:'Can draw and write',      iconPath:'M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z', color:'text-emerald-600', bg:'hover:bg-emerald-50', activeBg:'bg-emerald-50' },
                  { value:'draw-only',  label:'Draw Only',    desc:'Can use drawing canvas',  iconPath:'M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z',                                        color:'text-blue-600',    bg:'hover:bg-blue-50',    activeBg:'bg-blue-50'    },
                  { value:'write-only', label:'Write Only',   desc:'Can use writing panel',   iconPath:'M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z',                                   color:'text-violet-600',  bg:'hover:bg-violet-50',  activeBg:'bg-violet-50'  },
                  { value:'read-only',  label:'Read Only',    desc:'View only, no editing',   iconPath:'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z', color:'text-amber-600', bg:'hover:bg-amber-50', activeBg:'bg-amber-50' },
                ];

                return (
                  <li key={u?._id || sid || i} className="relative flex items-center gap-3 px-4 py-3 hover:bg-slate-50/80 transition-colors">
                    {/* Avatar */}
                    <div className={`w-9 h-9 rounded-full ${bg} flex items-center justify-center shrink-0 shadow-sm`}>
                      <span className="text-white text-xs font-bold tracking-wide">{initials}</span>
                    </div>

                    {/* Name + status */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-semibold text-slate-800 truncate leading-none">{name}</span>
                        {isMe && <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-full font-bold uppercase tracking-wide">You</span>}
                        {isHostUser && <span className="text-[9px] px-1.5 py-0.5 bg-violet-100 text-violet-600 rounded-full font-bold uppercase tracking-wide">Host</span>}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                        <span className="text-[10px] text-slate-400 font-medium">Online</span>
                        {canManage && <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${badge.cls}`}>{badge.label}</span>}
                      </div>
                    </div>

                    {/* 3-dot menu — host only, not for self */}
                    {canManage && (
                      <div className="relative shrink-0">
                        <button
                          onClick={() => setOpenMenuId(menuOpen ? null : sid)}
                          className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors
                            ${menuOpen ? 'bg-slate-200 text-slate-700' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                          title="Manage user"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
                          </svg>
                        </button>

                        {menuOpen && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                            <div className="absolute right-0 top-full mt-1.5 w-52 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden py-1.5">
                              <div className="px-3 pt-1 pb-2 border-b border-slate-100">
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Set Permission</p>
                              </div>

                              {PERMS.map((opt) => {
                                const active = perm === opt.value;
                                return (
                                  <button
                                    key={opt.value}
                                    onClick={() => { onSetPermission?.(sid, opt.value); setOpenMenuId(null); }}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${active ? opt.activeBg : opt.bg}`}
                                  >
                                    <svg className={`w-3.5 h-3.5 shrink-0 ${active ? opt.color : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d={opt.iconPath}/>
                                    </svg>
                                    <div className="min-w-0 flex-1">
                                      <p className={`text-xs font-semibold leading-none ${active ? opt.color : 'text-slate-700'}`}>{opt.label}</p>
                                      <p className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</p>
                                    </div>
                                    {active && (
                                      <svg className={`w-3.5 h-3.5 shrink-0 ${opt.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                                      </svg>
                                    )}
                                  </button>
                                );
                              })}

                              <div className="my-1 mx-3 border-t border-slate-100" />

                              <button
                                onClick={() => { setOpenMenuId(null); if (window.confirm(`Remove ${name} from the room?`)) onKickUser?.(sid); }}
                                className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-red-50 transition-colors"
                              >
                                <svg className="w-3.5 h-3.5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6"/>
                                </svg>
                                <div>
                                  <p className="text-xs font-semibold text-red-500 leading-none">Remove from room</p>
                                  <p className="text-[10px] text-slate-400 mt-0.5">Kick this user out</p>
                                </div>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Online dot for non-manageable users */}
                    {!canManage && <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* ── Chat tab ──────────────────────────────────────────────────────────── */}
      {activeTab === 'chat' && (
        <>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0 bg-slate-50/40">
            {/* Load older messages */}
            {hasMoreMessages && (
              <div className="flex justify-center pb-1">
                <button
                  onClick={onLoadMoreMessages}
                  disabled={loadingMoreMessages}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-blue-600 hover:border-blue-200 transition disabled:opacity-50"
                >
                  {loadingMoreMessages ? (
                    <>
                      <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                      Loading…
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7"/>
                      </svg>
                      Load older messages
                    </>
                  )}
                </button>
              </div>
            )}
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round"
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-xs text-slate-400 font-medium">No messages yet — say hi! 👋</p>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const mine       = isMine(msg);
                const senderName = msg.sender?.name || 'Unknown';
                const isFile     = msg.messageType === 'file';
                return (
                  <div key={msg._id || idx} className="flex flex-col gap-0.5">
                    {/* Name + time row */}
                    <div className={`flex items-baseline gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                      <span className="text-[11px] font-semibold text-slate-700">
                        {mine ? 'You' : senderName}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {formatTime(msg.timestamp || msg.createdAt)}
                      </span>
                    </div>

                    {/* Bubble */}
                    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                      {isFile ? (
                        <div className={`max-w-[88%] rounded-2xl overflow-hidden border shadow-sm
                          ${mine ? 'border-blue-200 rounded-br-sm' : 'border-slate-200 rounded-bl-sm'}`}>
                          {isImage(msg.fileType) ? (
                            <button
                              type="button"
                              onClick={() => setViewerItem({ dataUrl: msg.fileData, fileName: msg.fileName, fileType: msg.fileType })}
                              className="block focus:outline-none"
                            >
                              <img src={msg.fileData} alt={msg.fileName}
                                className="max-w-[200px] max-h-[200px] object-cover block hover:opacity-90 transition cursor-zoom-in" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setViewerItem({ dataUrl: msg.fileData, fileName: msg.fileName, fileType: msg.fileType })}
                              className={`w-full flex items-center gap-3 px-3 py-2.5 hover:opacity-80 transition text-left
                                ${mine ? 'bg-blue-600' : 'bg-white'}`}>
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0
                                ${mine ? 'bg-blue-500' : 'bg-slate-100'}`}>
                                {isPDF(msg.fileType) ? (
                                  <svg className={`w-4 h-4 ${mine ? 'text-white' : 'text-red-500'}`} fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM8 17v-1h8v1H8zm0-3v-1h8v1H8zm0-3V10h5v1H8z"/>
                                  </svg>
                                ) : (
                                  <svg className={`w-4 h-4 ${mine ? 'text-white' : 'text-blue-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                  </svg>
                                )}
                              </div>
                              <div className="min-w-0">
                                <p className={`text-xs font-semibold truncate max-w-[130px] ${mine ? 'text-white' : 'text-slate-700'}`}>
                                  {msg.fileName || 'file'}
                                </p>
                                <p className={`text-[10px] ${mine ? 'text-blue-200' : 'text-slate-400'}`}>
                                  {isPDF(msg.fileType) ? 'PDF' : 'Document'} · Click to view
                                </p>
                              </div>
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className={`max-w-[88%] px-3 py-2 rounded-2xl text-sm break-words leading-relaxed
                          ${mine
                            ? 'bg-blue-600 text-white rounded-br-sm shadow-sm shadow-blue-100'
                            : 'bg-white text-slate-700 rounded-bl-sm border border-slate-200'
                          }`}>
                          {msg.text}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* File preview strip */}
          {filePreview && (
            <div className="mx-3 mb-0 mt-1 px-3 py-2 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2 shrink-0">
              {isImage(filePreview.type) ? (
                <img src={filePreview.dataUrl} alt={filePreview.name}
                  className="w-9 h-9 rounded-lg object-cover border border-blue-200 shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                </div>
              )}
              <p className="flex-1 text-xs text-blue-700 font-medium truncate">{filePreview.name}</p>
              <button onClick={cancelFile} className="text-blue-400 hover:text-red-500 transition p-1 rounded-lg hover:bg-red-50">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          )}

          {/* ── Input bar with inline icons ───────────────────────────────── */}
          <form onSubmit={sendMessage} className="px-3 py-3 border-t border-slate-100 flex items-center gap-2 shrink-0 bg-white">
            <input ref={fileRef} type="file"
              accept="image/*,application/pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx"
              className="hidden" onChange={onFileChange} />

            {/* Left icon buttons */}
            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                onClick={() => { setActiveTab('chat'); fileRef.current?.click(); }}
                title="Attach file"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
                </svg>
              </button>


            </div>

            {/* Text input */}
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={filePreview ? 'Ready to send…' : 'Type a message…'}
              maxLength={500}
              disabled={!!filePreview}
              className="flex-1 min-w-0 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400
                         focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all
                         disabled:opacity-50 disabled:cursor-not-allowed"
            />

            {/* Send button */}
            <button
              type="submit"
              disabled={(!text.trim() && !filePreview) || sending}
              className="w-9 h-9 shrink-0 flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800
                         disabled:opacity-30 disabled:cursor-not-allowed text-white transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"/>
              </svg>
            </button>
          </form>
        </>
      )}

      {/* ── In-app File Viewer Modal ─────────────────────────────────────────── */}
      {viewerItem && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-sm"
          onClick={() => setViewerItem(null)}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 bg-black/60 shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <span className="text-white text-sm font-medium truncate max-w-[70%]">{viewerItem.fileName}</span>
            <div className="flex items-center gap-2">
              {/* Download button */}
              <a
                href={viewerItem.dataUrl}
                download={viewerItem.fileName}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-white/10 hover:bg-white/20 rounded-lg transition"
                onClick={(e) => e.stopPropagation()}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                </svg>
                Download
              </a>
              {/* Close button */}
              <button
                type="button"
                onClick={() => setViewerItem(null)}
                className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div
            className="flex-1 flex items-center justify-center overflow-hidden p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {isImage(viewerItem.fileType) ? (
              <img
                src={viewerItem.dataUrl}
                alt={viewerItem.fileName}
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              />
            ) : isPDF(viewerItem.fileType) ? (
              <iframe
                src={viewerItem.dataUrl}
                title={viewerItem.fileName}
                className="w-full h-full rounded-lg bg-white"
                style={{ minHeight: '70vh' }}
              />
            ) : (
              <div className="flex flex-col items-center gap-4 text-white">
                <svg className="w-16 h-16 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                </svg>
                <p className="text-sm text-white/60">Preview not available — use the Download button to open this file.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
