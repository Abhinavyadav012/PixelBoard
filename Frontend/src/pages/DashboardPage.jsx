import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getAllRooms, createRoom, joinRoom, leaveRoom, deleteRoom } from '../api/rooms';

const QUOTES = [
  { text: "Creativity is intelligence having fun.", author: "Albert Einstein" },
  { text: "Every artist was first an amateur.", author: "Ralph Waldo Emerson" },
  { text: "Alone we can do so little; together we can do so much.", author: "Helen Keller" },
  { text: "The best way to predict the future is to create it.", author: "Peter Drucker" },
  { text: "Collaboration allows teachers to capture each other's fund of collective intelligence.", author: "Mike Schmoker" },
  { text: "A blank canvas is full of possibilities.", author: "Unknown" },
];

const FEATURES = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
      </svg>
    ),
    label: "Real-time Collaboration",
    desc: "Draw together with your team in real-time — no lag, no waiting.",
    color: "text-blue-600 bg-blue-50",
    actionKey: "join",
    cta: "Join a Room →",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
      </svg>
    ),
    label: "Smart Drawing Tools",
    desc: "Pencil, shapes, eraser, undo/redo — everything a whiteboard needs.",
    color: "text-violet-600 bg-violet-50",
    actionKey: "draw",
    cta: "Start Drawing →",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
      </svg>
    ),
    label: "Live Chat",
    desc: "Discuss ideas alongside your canvas in the built-in team chat.",
    color: "text-emerald-600 bg-emerald-50",
    actionKey: "chat",
    cta: "Open Chat →",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
      </svg>
    ),
    label: "Notes & Writing",
    desc: "Switch to Writing mode for rich-text notes with full formatting.",
    color: "text-orange-600 bg-orange-50",
    actionKey: "write",
    cta: "Open Writing Mode →",
  },
];

const CARD_COLORS = [
  ['from-blue-50 to-indigo-100',   'text-blue-500',   'bg-blue-100/80'],
  ['from-violet-50 to-purple-100', 'text-violet-500', 'bg-violet-100/80'],
  ['from-emerald-50 to-teal-100',  'text-emerald-500','bg-emerald-100/80'],
  ['from-orange-50 to-amber-100',  'text-orange-500', 'bg-orange-100/80'],
  ['from-pink-50 to-rose-100',     'text-pink-500',   'bg-pink-100/80'],
  ['from-cyan-50 to-sky-100',      'text-cyan-500',   'bg-cyan-100/80'],
];

const DashboardPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [rooms, setRooms]                   = useState([]);
  const [loadingRooms, setLoadingRooms]     = useState(true);
  const [creating, setCreating]             = useState(false);
  const [joinId, setJoinId]                 = useState('');
  const [joining, setJoining]               = useState(false);
  const [showJoinModal, setShowJoinModal]   = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createName, setCreateName]         = useState('');
  const [createCode, setCreateCode]         = useState('');
  const [createMode, setCreateMode]         = useState('drawing');
  const [showNewBoardModal, setShowNewBoardModal] = useState(false);
  const [newBoardName, setNewBoardName]     = useState('');
  const [notification, setNotification]     = useState(null);
  const [quoteIdx, setQuoteIdx]             = useState(0);
  const [quoteFade, setQuoteFade]           = useState(true);

  const notify = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  };

  const fetchRooms = async () => {
    try {
      const { data } = await getAllRooms();
      setRooms(data);
    } catch {
      notify('Failed to load rooms', 'error');
    } finally {
      setLoadingRooms(false);
    }
  };

  useEffect(() => { fetchRooms(); }, []);

  // Rotate quote every 5s
  useEffect(() => {
    const t = setInterval(() => {
      setQuoteFade(false);
      setTimeout(() => {
        setQuoteIdx((i) => (i + 1) % QUOTES.length);
        setQuoteFade(true);
      }, 400);
    }, 5000);
    return () => clearInterval(t);
  }, []);

  const handleCreate = async (mode = 'drawing', name = '', roomCode = '') => {
    setCreating(true);
    try {
      const { data } = await createRoom(name, roomCode);
      notify('Room created!');
      const query = mode !== 'drawing' ? `?mode=${mode}` : '';
      navigate(`/board/${data.room.roomId}${query}`);
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to create room', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    await handleCreate(createMode, createName, createCode);
    setShowCreateModal(false);
    setCreateName('');
    setCreateCode('');
    setCreateMode('drawing');
  };

  const openCreateModal = (mode = 'drawing') => {
    setCreateMode(mode);
    setShowCreateModal(true);
  };

  const handleNewBoardSubmit = async (e) => {
    e.preventDefault();
    await handleCreate('drawing', newBoardName);
    setShowNewBoardModal(false);
    setNewBoardName('');
  };

  const onFeatureClick = (actionKey) => {
    switch (actionKey) {
      case 'join':  return setShowJoinModal(true);
      case 'draw':  return openCreateModal('drawing');
      case 'chat':  return openCreateModal('drawing');
      case 'write': return openCreateModal('writing');
      default: break;
    }
  };

  const handleDelete = async (roomId) => {
    try {
      await deleteRoom(roomId);
      setRooms((prev) => prev.filter((r) => r.roomId !== roomId));
      notify('Board deleted');
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to delete board', 'error');
    }
  };

  const handleLeave = async (roomId) => {
    try {
      await leaveRoom(roomId);
      setRooms((prev) => prev.filter((r) => r.roomId !== roomId));
      notify('Left the room');
    } catch (err) {
      notify(err.response?.data?.message || 'Failed to leave room', 'error');
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!joinId.trim()) return;
    setJoining(true);
    try {
      await joinRoom(joinId.trim());
      navigate(`/board/${joinId.trim()}`);
    } catch (err) {
      notify(err.response?.data?.message || 'Room not found', 'error');
    } finally {
      setJoining(false);
    }
  };

  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-neutral-950 dark:via-neutral-950 dark:to-neutral-900">

      {/*  NAVBAR  */}
      <nav className="border-b border-white/70 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/90 backdrop-blur-md sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-200">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
            <span className="font-extrabold tracking-tight text-slate-800 dark:text-slate-100 text-lg">PixelBoard</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Avatar or initials — links to profile */}
            <button
              onClick={() => navigate('/profile')}
              title="My Profile"
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 rounded-lg transition"
            >
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-5 h-5 rounded-full object-cover" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <span className="text-white text-[9px] font-bold">{(user?.name || 'U').slice(0,2).toUpperCase()}</span>
                </div>
              )}
              <span className="hidden sm:inline font-medium">{user?.name?.split(' ')[0]}</span>
            </button>

            <button
              onClick={logout}
              className="px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 border border-slate-200 dark:border-neutral-700 rounded-lg transition flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/*  NOTIFICATION  */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl shadow-xl text-sm font-medium border
          ${notification.type === 'error'
            ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
          {notification.msg}
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pb-16">

        {/*  HERO SECTION  */}
        <div className="relative overflow-hidden rounded-3xl mt-8 mb-8 bg-gradient-to-br from-blue-600 via-indigo-600 to-violet-700 px-8 py-12 shadow-2xl shadow-blue-200">
          {/* Decorative blobs */}
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-12 w-80 h-80 bg-indigo-400/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-4 right-32 w-24 h-24 bg-violet-300/20 rounded-full blur-xl pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <p className="text-blue-200 text-sm font-medium mb-1 tracking-wide uppercase">Welcome back</p>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3 leading-tight">
                Hello, {firstName}! 
              </h1>
              <p className="text-blue-100 text-sm sm:text-base max-w-md leading-relaxed">
                Your collaborative canvas is ready. Draw ideas, write notes, and build together — all in real time.
              </p>

              {/* Animated quote */}
              <div
                className="mt-5 p-4 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl max-w-lg transition-opacity duration-500"
                style={{ opacity: quoteFade ? 1 : 0 }}
              >
                <p className="text-white/90 text-sm italic leading-relaxed">
                  &ldquo;{QUOTES[quoteIdx].text}&rdquo;
                </p>
                <p className="text-blue-200 text-xs mt-2 font-medium">— {QUOTES[quoteIdx].author}</p>
              </div>
            </div>

            {/* CTA buttons — stacked vertically */}
            <div className="flex flex-col gap-2.5 shrink-0 min-w-[180px]">
              <button
                onClick={() => setShowJoinModal(true)}
                className="w-full px-5 py-2.5 bg-white/15 hover:bg-white/25 border border-white/30 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2 backdrop-blur-sm"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                Join Room
              </button>
              <button
                onClick={() => { setNewBoardName(''); setShowNewBoardModal(true); }}
                disabled={creating}
                className="w-full px-5 py-2.5 bg-white/15 hover:bg-white/25 border border-white/30 text-white rounded-xl text-sm font-semibold transition flex items-center gap-2 backdrop-blur-sm disabled:opacity-60"
              >
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
                New Board
              </button>
              <button
                onClick={() => openCreateModal()}
                disabled={creating}
                className="w-full px-5 py-2.5 bg-white hover:bg-blue-50 disabled:opacity-60 text-blue-700 rounded-xl text-sm font-bold transition flex items-center gap-2 shadow-lg shadow-black/10"
              >
                {creating ? (
                  <svg className="animate-spin w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                )}
                Create Room
              </button>
            </div>
          </div>
        </div>

        {/*  FEATURE CARDS  */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
          {FEATURES.map((f) => (
            <button
              key={f.label}
              onClick={() => onFeatureClick(f.actionKey)}
              className="group bg-white dark:bg-neutral-800 border border-slate-100 dark:border-neutral-700 rounded-2xl p-4 shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-slate-200 dark:hover:border-neutral-600 transition-all duration-200 text-left cursor-pointer w-full"
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${f.color}`}>
                {f.icon}
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-1">{f.label}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mb-3">{f.desc}</p>
              <span className="text-xs font-semibold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                {f.cta}
              </span>
            </button>
          ))}
        </div>

        {/*  BOARDS SECTION  */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">My Boards</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
              {loadingRooms ? 'Loading' : `${rooms.length} board${rooms.length !== 1 ? 's' : ''} saved`}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowJoinModal(true)}
              className="px-4 py-2 border border-slate-200 dark:border-neutral-700 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-600 dark:text-slate-300 hover:text-blue-700 rounded-xl text-sm font-medium transition flex items-center gap-1.5 bg-white dark:bg-neutral-800 shadow-sm"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Join Room
            </button>
            <button
              onClick={() => { setNewBoardName(''); setShowNewBoardModal(true); }}
              disabled={creating}
              className="px-4 py-2 border border-slate-200 dark:border-neutral-700 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-600 dark:text-slate-300 hover:text-blue-700 rounded-xl text-sm font-medium transition flex items-center gap-1.5 bg-white dark:bg-neutral-800 shadow-sm disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              New Board
            </button>
            <button
              onClick={() => openCreateModal()}
              disabled={creating}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition flex items-center gap-1.5 shadow-sm shadow-blue-200"
            >
              {creating ? (
                <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
              )}
              Create Room
            </button>
          </div>
        </div>

        {loadingRooms ? (
          <div className="flex items-center justify-center h-48">
            <div className="text-center">
              <svg className="animate-spin w-8 h-8 text-blue-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <p className="text-slate-400 dark:text-neutral-500 text-sm">Loading your boards</p>
            </div>
          </div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-slate-200 dark:border-neutral-800 rounded-3xl bg-white/60 dark:bg-neutral-900/60">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-sm">
              <svg className="w-9 h-9 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
              </svg>
            </div>
            <p className="text-slate-700 dark:text-slate-200 font-bold text-lg mb-1">No boards yet</p>
            <p className="text-slate-400 dark:text-slate-500 text-sm mb-6 max-w-xs mx-auto">Create your first collaborative board or join an existing one using a Room ID.</p>
            <button
              onClick={() => openCreateModal()}
              disabled={creating}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition shadow-sm shadow-blue-200 inline-flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Create Room
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map((room) => (
              <RoomCard
                key={room._id}
                room={room}
                currentUserId={user?._id}
                onClick={() => navigate(`/board/${room.roomId}`)}
                onDelete={handleDelete}
                onLeave={handleLeave}
              />
            ))}
          </div>
        )}

        {/*  ABOUT SECTION  */}
        <div className="mt-14 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2 bg-white dark:bg-neutral-900 border border-slate-100 dark:border-neutral-800 rounded-3xl p-7 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-200">
                <svg className="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100">About PixelBoard</h3>
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-3">
              <span className="font-semibold text-slate-700 dark:text-slate-200">PixelBoard</span> is a real-time collaborative whiteboard built for teams, classrooms, and creative minds. Whether you're brainstorming, teaching, or designing — PixelBoard gives your ideas a shared space.
            </p>
            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
              Powered by <span className="font-medium text-indigo-600">Socket.io</span> for instant sync, <span className="font-medium text-blue-600">React</span> for a fluid UI, and <span className="font-medium text-emerald-600">MongoDB</span> to persist every stroke — your work is always saved and shareable.
            </p>
            <div className="flex flex-wrap gap-2 mt-5">
              {['Real-time Sync', 'Cloud Storage', 'Team Chat', 'Undo / Redo', 'Export PNG', 'Drawing & Writing Modes'].map((tag) => (
                <span key={tag} className="px-2.5 py-1 bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-medium">{tag}</span>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-7 shadow-xl shadow-indigo-200 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
                </svg>
              </div>
              <p className="text-white font-bold text-lg mb-2">Quick Tip</p>
              <p className="text-indigo-100 text-sm leading-relaxed">
                Press <kbd className="px-1.5 py-0.5 bg-white/20 rounded text-xs font-mono">P</kbd> for Pencil, <kbd className="px-1.5 py-0.5 bg-white/20 rounded text-xs font-mono">E</kbd> for Eraser, <kbd className="px-1.5 py-0.5 bg-white/20 rounded text-xs font-mono">Ctrl+Z</kbd> to undo, and <kbd className="px-1.5 py-0.5 bg-white/20 rounded text-xs font-mono">Ctrl+Y</kbd> to redo — all from anywhere on the board!
              </p>
            </div>
            <p className="text-indigo-300 text-xs mt-6 font-medium">More shortcuts in the board toolbar </p>
          </div>
        </div>
      </main>

      {/*  JOIN ROOM MODAL  */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 rounded-3xl p-7 w-full max-w-md shadow-2xl">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Join a Room</h3>
                <p className="text-slate-400 dark:text-slate-500 text-xs">Enter a room ID shared with you</p>
              </div>
            </div>
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1.5">Room ID</label>
                <input
                  type="text"
                  value={joinId}
                  onChange={(e) => setJoinId(e.target.value)}
                  required
                  placeholder="e.g. 550e8400-e29b-41d4..."
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-neutral-500
                             focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition text-sm"
                  autoFocus
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowJoinModal(false); setJoinId(''); }}
                  className="flex-1 py-2.5 border border-slate-200 dark:border-neutral-700 hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={joining}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-2"
                >
                  {joining && (
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  )}
                  Join Board
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/*  NEW BOARD MODAL (name only)  */}
      {showNewBoardModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4"
          onClick={() => setShowNewBoardModal(false)}
        >
          <div
            className="bg-white dark:bg-neutral-900 rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">New Board</h3>
                  <p className="text-blue-200 text-xs">Name your board to get started</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewBoardModal(false)}
                className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleNewBoardSubmit} className="px-6 py-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">Board Name</label>
                <input
                  type="text"
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  placeholder="e.g. Sprint Planning, Wireframes…"
                  maxLength={60}
                  required
                  autoFocus
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-neutral-800 border-2 border-slate-200 dark:border-neutral-700 rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-neutral-500
                             focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-neutral-700 transition text-sm"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewBoardModal(false)}
                  className="flex-1 py-3 border-2 border-slate-200 dark:border-neutral-700 hover:border-slate-300 hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newBoardName.trim()}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
                >
                  {creating ? (
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  )}
                  Create Board
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/*  CREATE ROOM MODAL  */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 px-4"
          onClick={() => { setShowCreateModal(false); setCreateName(''); setCreateCode(''); }}>
          <div className="bg-white dark:bg-neutral-900 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}>

            {/* Modal header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-7 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold text-white">Create a Room</h3>
                    <p className="text-blue-200 text-xs mt-0.5">Set up your collaborative board</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); setCreateName(''); setCreateCode(''); }}
                  className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Form body */}
            <form onSubmit={handleCreateSubmit} className="px-7 py-6 space-y-5">

              {/* Room Name */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">
                  <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  Room Name
                  <span className="ml-1 text-xs text-slate-400 font-normal">optional</span>
                </label>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g. Sprint Planning, Design Review…"
                  maxLength={60}
                  autoFocus
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-800 placeholder-slate-400
                             focus:outline-none focus:border-blue-500 focus:bg-white transition text-sm"
                />
              </div>

              {/* Room ID */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">
                  <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  Room ID
                  <span className="ml-1 text-xs text-slate-400 font-normal">optional — auto-generated if blank</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={createCode}
                    onChange={(e) => setCreateCode(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                    placeholder="e.g. my-team-board"
                    maxLength={40}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-neutral-800 border-2 border-slate-200 dark:border-neutral-700 rounded-xl text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-neutral-500
                               focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-neutral-700 transition text-sm font-mono pr-28"
                  />
                  {createCode.length === 0 && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-slate-400 dark:text-neutral-500 bg-slate-100 dark:bg-neutral-700 px-2 py-0.5 rounded-lg pointer-events-none">
                      auto-generate
                    </span>
                  )}
                  {createCode.length > 0 && createCode.length < 4 && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-red-500 bg-red-50 px-2 py-0.5 rounded-lg pointer-events-none">
                      min 4 chars
                    </span>
                  )}
                  {createCode.length >= 4 && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg pointer-events-none">
                      ✓ valid
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 dark:text-neutral-500 mt-1.5 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                  Letters, numbers, - and _ only · 4–40 characters · Shared with teammates to join
                </p>
              </div>

              {/* Mode picker */}
              <div>
                <label className="flex items-center gap-1.5 text-sm font-bold text-slate-700 dark:text-slate-200 mb-2">
                  <svg className="w-4 h-4 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
                  </svg>
                  Start Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'drawing', label: 'Drawing', desc: 'Canvas & tools', icon: (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                      </svg>
                    )},
                    { key: 'writing', label: 'Writing', desc: 'Rich-text notes', icon: (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                      </svg>
                    )},
                  ].map(({ key, label, desc, icon }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setCreateMode(key)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition text-left
                        ${createMode === key
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30'
                          : 'border-slate-200 dark:border-neutral-700 bg-slate-50 dark:bg-neutral-800 hover:border-slate-300 dark:hover:border-neutral-600'}`}
                    >
                      <span className={`${createMode === key ? 'text-blue-600' : 'text-slate-400'}`}>{icon}</span>
                      <div>
                        <p className={`text-sm font-bold ${createMode === key ? 'text-blue-700 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300'}`}>{label}</p>
                        <p className={`text-[10px] ${createMode === key ? 'text-blue-500' : 'text-slate-400 dark:text-neutral-500'}`}>{desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); setCreateName(''); setCreateCode(''); }}
                  className="flex-1 py-3 border-2 border-slate-200 dark:border-neutral-700 hover:border-slate-300 hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || (createCode.length > 0 && createCode.length < 4)}
                  className="flex-1 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
                >
                  {creating ? (
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                  )}
                  Create Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

//  RoomCard 
const RoomCard = ({ room, currentUserId, onClick, onDelete, onLeave }) => {
  const isHost = String(room.host?._id || room.host) === String(currentUserId);
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const colorIdx = room.roomId.charCodeAt(0) % CARD_COLORS.length;
  const [gradCls, iconCls, bgCls] = CARD_COLORS[colorIdx];

  const copyRoomId = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(room.roomId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      onClick={onClick}
      className="relative group bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-xl hover:shadow-blue-100/60 rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-1"
    >
      {/* Banner */}
      <div className={`w-full h-28 bg-gradient-to-br ${gradCls} flex items-center justify-center relative`}>
        {/* Mini canvas illustration */}
        <div className={`w-12 h-12 ${bgCls} rounded-2xl flex items-center justify-center shadow-sm`}>
          <svg className={`w-6 h-6 ${iconCls}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
        </div>
        {isHost && (
          <span className="absolute top-2.5 right-2.5 px-2.5 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700 font-bold border border-amber-200">
            host
          </span>
        )}
        {/* Hover overlay hint */}
        <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/5 transition-all flex items-center justify-center">
          <span className="opacity-0 group-hover:opacity-100 transition-all text-xs font-semibold text-blue-600 bg-white/90 px-3 py-1.5 rounded-lg shadow-sm border border-blue-100">
            Open Board 
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 flex items-start justify-between gap-2">
        <div className="min-w-0">
          {room.name ? (
            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate mb-0.5">{room.name}</p>
          ) : null}
          <p className="text-xs font-mono text-slate-400 dark:text-neutral-500 truncate mb-2">{room.roomId.slice(0, 22)}</p>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {room.participants?.length || 1} participant{room.participants?.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={copyRoomId}
            title="Copy room ID"
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-neutral-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
          >
            {copied
              ? <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
              : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
            }
          </button>

          {/* Delete (host) or Leave (participant) */}
          {!confirmDelete && (
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmDelete(true); }}
              title={isHost ? 'Delete board' : 'Leave room'}
              className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition"
            >
              {isHost ? (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Confirm overlay */}
      {confirmDelete && (
      <div
        className="absolute inset-0 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-3 z-10 px-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isHost ? 'bg-red-100' : 'bg-orange-100'}`}>
          {isHost ? (
            <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          )}
        </div>
        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 text-center">
          {isHost ? 'Delete this board?' : 'Leave this room?'}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
          {isHost ? "This can't be undone." : "You can rejoin later with the room code."}
        </p>
        <div className="flex gap-2 w-full">
          <button
            onClick={() => setConfirmDelete(false)}
            className="flex-1 py-2 border border-slate-200 dark:border-neutral-700 hover:bg-slate-50 dark:hover:bg-neutral-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold transition"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              if (isHost) onDelete(room.roomId);
              else onLeave(room.roomId);
              setConfirmDelete(false);
            }}
            className={`flex-1 py-2 text-white rounded-xl text-xs font-semibold transition
              ${isHost ? 'bg-red-500 hover:bg-red-600' : 'bg-orange-500 hover:bg-orange-600'}`}
          >
            {isHost ? 'Delete' : 'Leave'}
          </button>
        </div>
      </div>
    )}
  </div>
  );
};

export default DashboardPage;
