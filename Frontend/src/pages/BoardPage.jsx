import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';

import { useAuth } from '../context/AuthContext';
import { getRoomDetails } from '../api/rooms';
import { getRoomMessages } from '../api/messages';

import Canvas from '../components/board/Canvas';
import Toolbar from '../components/board/Toolbar';
import Chat from '../components/board/Chat';
import ActiveUsers from '../components/board/ActiveUsers';
import WritingPanel from '../components/board/WritingPanel';
import CodingPanel from '../components/board/CodingPanel';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

/* ICE servers for WebRTC screen sharing */
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
];

/* â”€â”€ Mode definitions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const MODES = [
  {
    id: 'drawing',
    label: 'Drawing',
    icon: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
      </svg>
    ),
  },
  {
    id: 'writing',
    label: 'Writing',
    icon: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
      </svg>
    ),
  },
  {
    id: 'coding',
    label: 'Coding',
    icon: (
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
      </svg>
    ),
  },
];

const BoardPage = () => {
  const { roomId }  = useParams();
  const navigate    = useNavigate();
  const [searchParams] = useSearchParams();
  const { user }    = useAuth();

  // â”€â”€ Socket â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [socket, setSocket] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const socketRef           = useRef(null);

  // â”€â”€ Room & chat state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [room, setRoom]             = useState(null);
  const [messages, setMessages]     = useState([]);
  const [activeUsers, setActiveUsers] = useState([]);
  const [notification, setNotification] = useState(null);

  // â”€â”€ Board permission mode â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [boardMode, setBoardMode]   = useState('public'); // 'public' | 'host-only'
  const hostIdRef                   = useRef(null);       // room.host._id or room.host
  const [userPermissions, setUserPermissions] = useState({}); // { socketId: 'read-write'|'read-only'|'draw-only'|'write-only' }
  const [myPermission, setMyPermission]       = useState('read-only');
  const isHost = room
    ? (String(room.host?._id || room.host) === String(user?._id))
    : false;
  // Host always has full access; other users use their explicitly granted permission
  const effectivePerm = isHost ? 'read-write' : myPermission;
  const canDraw  = effectivePerm === 'read-write' || effectivePerm === 'draw-only';
  const canWrite = effectivePerm === 'read-write' || effectivePerm === 'write-only';
  const isViewer = !canDraw && !canWrite; // fully read-only

  // â”€â”€ Screen sharing â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [isScreenSharing, setIsScreenSharing]         = useState(false);
  const [remoteScreenStream, setRemoteScreenStream]   = useState(null);
  const [screenShareError, setScreenShareError]       = useState(null);
  const localScreenStreamRef  = useRef(null);  // host's getDisplayMedia stream
  const peerConnectionsRef    = useRef({});    // host: map viewerSocketIdâ†’RTCPeerConnection
  const viewerPcRef           = useRef(null);  // viewer's single RTCPeerConnection
  const remoteVideoRef        = useRef(null);  // viewer: <video> element ref
  const localVideoRef         = useRef(null);  // host: preview of own screen
  const hostSocketIdRef       = useRef(null);  // viewer: who is sharing

  // â”€â”€ Drawing settings â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const [tool,  setTool]  = useState('pencil');
  const [color, setColor] = useState('#1e293b');
  const [size,  setSize]  = useState(4);
  const [fill,  setFill]  = useState(false);

  // ── UI / mode state ──────────────────────────────────────────────────────────
  const [chatOpen, setChatOpen]       = useState(true);
  const [roomIdCopied, setRoomIdCopied] = useState(false);
  const [mode, setMode]               = useState(() => {
    const m = searchParams.get('mode');
    if (m === 'writing') return 'writing';
    if (m === 'coding') return 'coding';
    return 'drawing';
  });

  // ── Message pagination ───────────────────────────────────────────────────────
  const [msgPage, setMsgPage]       = useState(1);
  const [msgHasMore, setMsgHasMore] = useState(false);
  const [msgLoading, setMsgLoading] = useState(false);

  const handleLoadMoreMessages = async () => {
    if (msgLoading || !msgHasMore) return;
    setMsgLoading(true);
    try {
      const nextPage = msgPage + 1;
      const { data } = await getRoomMessages(roomId, nextPage, 30);
      const older = Array.isArray(data) ? data : (data.messages || []);
      setMessages((prev) => [...older, ...prev]);
      setMsgPage(nextPage);
      setMsgHasMore(Array.isArray(data) ? false : (data.hasMore || false));
    } catch {
      // silently ignore
    } finally {
      setMsgLoading(false);
    }
  };

  // â”€â”€ Canvas ref â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const canvasRef = useRef(null);

  // â”€â”€ Notification helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const notify = useCallback((msg, type = 'info') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  }, []);

  // â”€â”€ Socket init â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (!user) return;
    const s = io(SOCKET_URL, {
      auth: { token: localStorage.getItem('token') },
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 10000,
      withCredentials: true,
    });
    s.on('connect', () => {
      setSocketConnected(true);
      s.emit('joinRoom', { roomId, user });
    });
    s.on('disconnect', () => {
      setSocketConnected(false);
    });
    s.on('connect_error', (err) => {
      setSocketConnected(false);
      console.error('Socket connection error:', err.message);
    });
    s.on('userJoined', ({ userId, socketId, name }) => {
      notify(`${name} joined the room`, 'info');
      setActiveUsers((prev) => {
        if (prev.find((u) => u.socketId === socketId)) return prev;
        return [...prev, { userId: userId || socketId, name, socketId }];
      });
    });
    s.on('userLeft', ({ message, socketId }) => {
      notify(message, 'info');
      if (socketId) setActiveUsers((prev) => prev.filter((u) => u.socketId !== socketId));
    });

    // Board mode change (host broadcasts)
    s.on('boardModeChanged', ({ mode }) => {
      setBoardMode(mode);
      // Reset permission for non-host users (host's effectivePerm is always 'read-write' regardless)
      setMyPermission(mode === 'host-only' ? 'read-only' : 'read-write');
      notify(mode === 'host-only' ? '🔒 Host-only mode — viewers can\'t edit' : '🌐 Public mode — everyone can edit', 'info');
    });

    // ── User permission management ────────────────────────────────────────
    s.on('kicked', ({ message }) => {
      notify(message || 'You were removed from the room.', 'error');
      setTimeout(() => navigate('/dashboard'), 2000);
    });

    s.on('permissionChanged', ({ permission }) => {
      setMyPermission(permission);
      const labels = {
        'read-only':  '🔒 Host set you to Read Only',
        'draw-only':  '✏️ Host set you to Draw Only',
        'write-only': '📝 Host set you to Write Only',
        'read-write': '✅ Host gave you full access',
      };
      notify(labels[permission] || 'Permission updated', 'info');
    });

    s.on('permissionUpdated', ({ socketId, permission }) => {
      setUserPermissions((prev) => ({ ...prev, [socketId]: permission }));
    });

    s.on('userKicked', ({ socketId }) => {
      setActiveUsers((prev) => prev.filter((u) => u.socketId !== socketId));
      setUserPermissions((prev) => { const n = { ...prev }; delete n[socketId]; return n; });
    });

    s.on('roomUsersSync', ({ users, permissions, boardMode: serverBoardMode }) => {
      // Sync board mode on initial join (server sends the room's current mode)
      if (serverBoardMode) setBoardMode(serverBoardMode);
      // Sync own permission from server state so it's always authoritative
      if (permissions && s.id) {
        const ownPerm = permissions[s.id];
        setMyPermission(ownPerm || (serverBoardMode === 'host-only' ? 'read-only' : 'read-write'));
      }
      const list = Object.entries(users || {}).map(([sid, info]) => ({
        userId: info.userId,
        name: info.name,
        socketId: sid,
      }));
      setActiveUsers(list);
      setUserPermissions(permissions || {});
    });

    // ── WebRTC screen share signaling (viewer side) ──────────────────────────────────────────
    s.on('screenShareStarted', ({ hostSocketId }) => {
      hostSocketIdRef.current = hostSocketId;
      setRemoteScreenStream('pending'); // show overlay placeholder
      s.emit('viewerReadyForShare', { roomId });
    });

    s.on('screenShareStopped', () => {
      if (viewerPcRef.current) { viewerPcRef.current.close(); viewerPcRef.current = null; }
      setRemoteScreenStream(null);
      hostSocketIdRef.current = null;
    });

    s.on('screenShareOffer', async ({ from, offer }) => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      viewerPcRef.current = pc;
      pc.ontrack = (e) => {
        const stream = e.streams[0];
        setRemoteScreenStream(stream);
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream;
      };
      pc.onicecandidate = (e) => {
        if (e.candidate) s.emit('screenShareIce', { to: from, candidate: e.candidate });
      };
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      s.emit('screenShareAnswer', { to: from, answer });
    });

    s.on('screenShareAnswer', async ({ from, answer }) => {
      const pc = peerConnectionsRef.current[from];
      if (pc) await pc.setRemoteDescription(new RTCSessionDescription(answer));
    });

    s.on('screenShareIce', async ({ from, candidate }) => {
      // Could be host or viewer receiving
      const pc = peerConnectionsRef.current[from] || viewerPcRef.current;
      if (pc && candidate) {
        try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch (_) {}
      }
    });

    // â”€â”€ Host: viewer is ready, send offer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    s.on('sendOfferTo', async ({ viewerSocketId }) => {
      if (!localScreenStreamRef.current) return;
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      peerConnectionsRef.current[viewerSocketId] = pc;
      localScreenStreamRef.current.getTracks().forEach((t) => pc.addTrack(t, localScreenStreamRef.current));
      pc.onicecandidate = (e) => {
        if (e.candidate) s.emit('screenShareIce', { to: viewerSocketId, candidate: e.candidate });
      };
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      s.emit('screenShareOffer', { to: viewerSocketId, offer });
    });

    socketRef.current = s;
    setSocket(s);
    return () => {
      // Clean up screen share on disconnect
      if (localScreenStreamRef.current) {
        localScreenStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      Object.values(peerConnectionsRef.current).forEach((pc) => pc.close());
      if (viewerPcRef.current) viewerPcRef.current.close();
      s.off('kicked');
      s.off('permissionChanged');
      s.off('permissionUpdated');
      s.off('userKicked');
      s.off('roomUsersSync');
      s.off('connect_error');
      s.off('disconnect');
      s.disconnect();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, user]);

  // â”€â”€ Load room & messages â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    const load = async () => {
      try {
        const [roomRes, msgRes] = await Promise.all([
          getRoomDetails(roomId),
          getRoomMessages(roomId, 1, 30),
        ]);
        setRoom(roomRes.data);
        // Support paginated { messages, hasMore } and legacy array
        const msgData = msgRes.data;
        if (Array.isArray(msgData)) {
          setMessages(msgData);
          setMsgHasMore(false);
        } else {
          setMessages(msgData.messages || []);
          setMsgHasMore(msgData.hasMore || false);
          setMsgPage(1);
        }
        // Set initial activeUsers from participants (socket will override with live data)
        const participants = roomRes.data.participants || [];
        setActiveUsers((prev) => prev.length === 0
          ? participants.map((p) => ({ userId: p._id, name: p.name, socketId: null }))
          : prev
        );
        setBoardMode(roomRes.data.boardMode || 'public');
        hostIdRef.current = roomRes.data.host?._id || roomRes.data.host;
      } catch (err) {
        if (err.response?.status === 404) { notify('Room not found', 'error'); navigate('/dashboard'); }
      }
    };
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // â”€â”€ Keyboard shortcuts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); canvasRef.current?.undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); canvasRef.current?.redo(); }
      if (mode !== 'drawing' || isViewer) return;
      if (e.key === 'p') setTool('pencil');
      if (e.key === 'e') setTool('eraser');
      if (e.key === 'l') setTool('line');
      if (e.key === 'r') setTool('rect');
      if (e.key === 'c') setTool('circle');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mode, isViewer]);

  const handleKickUser = useCallback((targetSocketId) => {
    socketRef.current?.emit('kickUser', { roomId, targetSocketId });
  }, [roomId]);

  const handleSetPermission = useCallback((targetSocketId, permission) => {
    socketRef.current?.emit('setPermission', { roomId, targetSocketId, permission });
  }, [roomId]);

  const handleUndo  = () => canvasRef.current?.undo();
  const handleRedo  = () => canvasRef.current?.redo();
  const handleClear = () => {
    if (!window.confirm('Clear the entire board? This cannot be undone.')) return;
    canvasRef.current?.clearAll();
    socketRef.current?.emit('clearBoard', { roomId });
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setRoomIdCopied(true);
    setTimeout(() => setRoomIdCopied(false), 2000);
  };

  const downloadCanvas = () => {
    const canvasEl = document.querySelector('#board-area canvas');
    if (!canvasEl) return;
    const link    = document.createElement('a');
    link.download = `pixelboard-${roomId.slice(0, 8)}.png`;
    link.href     = canvasEl.toDataURL('image/png');
    link.click();
  };

  // â”€â”€ Board mode toggle (host only) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const toggleBoardMode = () => {
    const next = boardMode === 'public' ? 'host-only' : 'public';
    setBoardMode(next);
    socketRef.current?.emit('changeBoardMode', { roomId, mode: next });
  };

  // â”€â”€ Screen sharing (host) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const startScreenShare = async () => {
    try {
      setScreenShareError(null);
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      localScreenStreamRef.current = stream;
      setIsScreenSharing(true);
      socketRef.current?.emit('startScreenShare', { roomId });
      // Stop when user ends share via browser UI
      stream.getVideoTracks()[0].onended = stopScreenShare;
    } catch (err) {
      if (err.name !== 'NotAllowedError') setScreenShareError('Screen share failed. Check browser permissions.');
    }
  };

  const stopScreenShare = () => {
    if (localScreenStreamRef.current) {
      localScreenStreamRef.current.getTracks().forEach((t) => t.stop());
      localScreenStreamRef.current = null;
    }
    Object.values(peerConnectionsRef.current).forEach((pc) => pc.close());
    peerConnectionsRef.current = {};
    setIsScreenSharing(false);
    socketRef.current?.emit('stopScreenShare', { roomId });
  };

  // Attach remote stream to viewer video element when it arrives
  useEffect(() => {
    if (remoteVideoRef.current && remoteScreenStream instanceof MediaStream) {
      remoteVideoRef.current.srcObject = remoteScreenStream;
    }
  }, [remoteScreenStream]);

  // Attach local stream to host preview video element
  useEffect(() => {
    if (localVideoRef.current && isScreenSharing && localScreenStreamRef.current) {
      localVideoRef.current.srcObject = localScreenStreamRef.current;
    }
  }, [isScreenSharing]);

  return (
    <div className="flex flex-col h-screen bg-slate-100 dark:bg-neutral-950 overflow-hidden">

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• TOP BAR â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <header className="flex items-center gap-3 px-5 border-b border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shrink-0 z-10" style={{ height: 52 }}>

        {/* Left: Room name + copy */}
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-sm font-semibold text-slate-800">
            Room: <span className="font-mono">{roomId.slice(0, 16)}{roomId.length > 16 ? 'â€¦' : ''}</span>
          </span>
          <button
            onClick={copyRoomId}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
          >
            {roomIdCopied ? (
              <><svg className="w-3.5 h-3.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg><span className="text-emerald-600">Copied!</span></>
            ) : (
              <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>Copy Room ID</>
            )}
          </button>

          {/* Board mode badge */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold
            ${boardMode === 'host-only' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
            {boardMode === 'host-only'
              ? <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
              : <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><path strokeLinecap="round" strokeLinejoin="round" d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/></svg>
            }
            {boardMode === 'host-only' ? 'Host Only' : 'Public'}
          </div>
        </div>

        {/* Center: Mode tabs */}
        <div className="flex-1 flex justify-center">
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 border border-slate-200">
            {MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all
                  ${mode === m.id
                    ? 'bg-white text-blue-600 shadow-sm border border-slate-200'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                  }`}
              >
                {m.icon}
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: host controls + online count + leave */}
        <div className="flex items-center gap-2 shrink-0">

          {/* Host-only toggle */}
          {isHost && (
            <button onClick={toggleBoardMode}
              title={boardMode === 'public' ? 'Switch to Host-Only' : 'Switch to Public'}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition
                ${boardMode === 'host-only'
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'text-slate-600 border-slate-200 hover:bg-amber-50 hover:text-amber-700'}`}>
              {boardMode === 'host-only'
                ? <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                : <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z"/></svg>
              }
              {boardMode === 'host-only' ? 'Host Only' : 'Public'}
            </button>
          )}

          {/* Export (drawing only) */}
          {mode === 'drawing' && (
            <button onClick={downloadCanvas} title="Export PNG"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 rounded-lg transition">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              Export
            </button>
          )}

          {/* Online count */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600">
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            <span className="font-medium">{activeUsers.length} online</span>
          </div>

          {/* Screen Share — host only */}
          {isHost && (
            <button
              onClick={isScreenSharing ? stopScreenShare : startScreenShare}
              title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition
                ${isScreenSharing
                  ? 'bg-rose-500 text-white border-rose-500 hover:bg-rose-600'
                  : 'text-slate-600 dark:text-slate-300 border-slate-200 dark:border-neutral-700 hover:bg-violet-50 hover:text-violet-600 dark:hover:bg-violet-900/30'}`}
            >
              {isScreenSharing ? (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
              )}
              {isScreenSharing ? 'Stop' : 'Share'}
            </button>
          )}

          {/* Leave button */}
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-neutral-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 hover:border-red-200 transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
            </svg>
            Leave
          </button>
        </div>
      </header>

      {/* â”€â”€ Notification toast â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {/* Socket connection warning */}
      {!socketConnected && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-center gap-2 shrink-0 z-10">
          <div className="w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-semibold text-amber-700">
            Connecting to server… Drawing, chat and real-time features require a connection.
          </span>
        </div>
      )}

      {notification && (
        <div className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium
          transition pointer-events-none border
          ${notification.type === 'error'
            ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-white border-slate-200 text-slate-700 shadow-slate-100'}`}>
          {notification.msg}
        </div>
      )}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• BODY â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <div className="flex flex-1 min-h-0">

        {/* Drawing Toolbar â€” only in drawing mode, hidden for viewers and during screen share */}
        {mode === 'drawing' && canDraw && !isScreenSharing && !remoteScreenStream && (
          <Toolbar
            tool={tool}    setTool={setTool}
            color={color}  setColor={setColor}
            size={size}    setSize={setSize}
            fill={fill}    setFill={setFill}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onClear={handleClear}
          />
        )}

        {/* Main content area */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 p-3 gap-3">

          {/* â”€â”€ Host: screen share preview â”€â”€ */}
          {isScreenSharing && (
            <div className="flex-1 min-h-0 rounded-2xl border border-slate-200 shadow-md bg-black overflow-hidden flex flex-col">
              <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-slate-700/50 bg-slate-900 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  <svg className="w-3.5 h-3.5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                  <span className="text-xs font-semibold text-slate-200">Sharing Your Screen</span>
                  <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold border border-red-500/30">LIVE</span>
                </div>
                <button
                  onClick={stopScreenShare}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-lg transition"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                  Stop Sharing
                </button>
              </div>
              <div className="flex-1 flex items-center justify-center min-h-0 bg-black p-2">
                <video
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className="max-w-full max-h-full rounded-lg shadow-xl object-contain"
                />
              </div>
            </div>
          )}

          {/* â”€â”€ Viewer: remote screen share â”€â”€ */}
          {!isHost && remoteScreenStream && (
            <div className="flex-1 min-h-0 rounded-2xl border border-slate-200 shadow-md bg-black overflow-hidden flex flex-col">
              <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-700/50 bg-slate-900 shrink-0">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <svg className="w-3.5 h-3.5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
                <span className="text-xs font-semibold text-slate-200">Host's Screen</span>
                <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold border border-red-500/30">LIVE</span>
              </div>
              <div className="flex-1 flex items-center justify-center min-h-0 bg-black p-2">
                {remoteScreenStream === 'pending' ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-violet-400 border-t-transparent rounded-full animate-spin" />
                    <p className="text-white/60 text-sm">Connecting to host's screenâ€¦</p>
                  </div>
                ) : (
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="max-w-full max-h-full rounded-lg shadow-xl object-contain"
                  />
                )}
              </div>
            </div>
          )}

          {/* â”€â”€ Drawing mode â”€â”€ */}
          {mode === 'drawing' && !isScreenSharing && !remoteScreenStream && (
            <div className="flex-1 min-h-0 rounded-2xl border border-slate-200 shadow-md bg-white overflow-hidden">
              {/* Panel header strip */}
              <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-100 bg-slate-50/70 shrink-0">
                <svg className="w-3.5 h-3.5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                </svg>
                <span className="text-xs font-semibold text-slate-600">Drawing Board</span>
                <div className="ml-auto flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
              </div>

              {/* Canvas area */}
              <div id="board-area" className="flex-1 relative overflow-hidden" style={{ height: 'calc(100% - 37px)' }}>
                {/* Active tool badge â€” bottom-left */}
                <div className="absolute bottom-4 left-4 z-20 flex items-center gap-2 px-3 py-2
                                bg-white border border-slate-200 rounded-xl shadow-md pointer-events-none">
                  {tool === 'eraser' ? (
                    <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 20H7L3 16l10-10 7 7-2.5 2.5"/><path d="M6.0037 10.3462L13.6565 17.9989"/>
                    </svg>
                  ) : tool === 'pencil' ? (
                    <svg className="w-3.5 h-3.5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                    </svg>
                  ) : tool === 'line' ? (
                    <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1="5" y1="19" x2="19" y2="5"/></svg>
                  ) : tool === 'rect' ? (
                    <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>
                  ) : (
                    <svg className="w-3.5 h-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><ellipse cx="12" cy="12" rx="10" ry="7"/></svg>
                  )}
                  <span className={`text-xs font-semibold capitalize ${tool === 'pencil' ? 'text-blue-600' : 'text-slate-600'}`}>
                    {tool}
                  </span>
                  <div className="w-px h-3.5 bg-slate-200" />
                  <span className="w-3.5 h-3.5 rounded-full border border-slate-300 shadow-sm" style={{ background: color }} />
                  <span className="text-[11px] text-slate-400 font-medium">{size}px</span>
                </div>

                <Canvas
                  ref={canvasRef}
                  tool={tool}
                  color={color}
                  size={size}
                  fill={fill}
                  socket={socket}
                  roomId={roomId}
                  readOnly={!canDraw}
                />
              </div>
            </div>
          )}

          {/* â”€â”€ Writing mode â”€â”€ */}
          {mode === 'writing' && !isScreenSharing && !remoteScreenStream && (
            <div className="flex-1 min-h-0 rounded-2xl border border-slate-200 shadow-md bg-white overflow-hidden flex flex-col">
              {/* Panel header strip */}
              <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-100 bg-slate-50/70 shrink-0">
                <svg className="w-3.5 h-3.5 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
                <span className="text-xs font-semibold text-slate-600">Writing Pad</span>
                <div className="ml-auto flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
              </div>
              {/* Writing panel fills remaining space */}
              <div className="flex-1 min-h-0 overflow-hidden">
                <WritingPanel readOnly={!canWrite} socket={socket} roomId={roomId} />
              </div>
            </div>
          )}

          {/* ── Coding mode ── */}
          {mode === 'coding' && !isScreenSharing && !remoteScreenStream && (
            <div className="flex-1 min-h-0 rounded-2xl border border-slate-200 shadow-md overflow-hidden flex flex-col">
              {/* Panel header strip */}
              <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-800 bg-slate-900 shrink-0">
                <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
                </svg>
                <span className="text-xs font-semibold text-slate-300">Code Editor</span>
                <div className="ml-auto flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-400" />
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                </div>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                <CodingPanel socket={socket} roomId={roomId} readOnly={!canWrite} />
              </div>
            </div>
          )}

        </div>

        <div className="w-80 shrink-0 flex flex-col min-h-0 border-l border-slate-200">
            <Chat
              socket={socket}
              roomId={roomId}
              user={user}
              initialMessages={messages}
              activeUsers={activeUsers}
              isHost={isHost}
              isScreenSharing={isScreenSharing}
              onScreenShare={isHost ? (isScreenSharing ? stopScreenShare : startScreenShare) : null}
              userPermissions={userPermissions}
              onKickUser={isHost ? handleKickUser : null}
              onSetPermission={isHost ? handleSetPermission : null}
              mySocketId={socket?.id}
              hasMoreMessages={msgHasMore}
              onLoadMoreMessages={handleLoadMoreMessages}
              loadingMoreMessages={msgLoading}
            />
          </div>
      </div>

      {/* Screen share error toast */}
      {screenShareError && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl shadow-lg
                        bg-red-50 border border-red-200 text-red-700 text-sm font-medium pointer-events-none">
          {screenShareError}
        </div>
      )}

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• STATUS BAR â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <div className="h-6 bg-white border-t border-slate-200 shrink-0 flex items-center px-4 gap-4">
        {/* Mode indicator */}
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-blue-600">
          {MODES.find(m => m.id === mode)?.icon}
          <span className="capitalize">{mode} Mode</span>
        </span>
        <div className="w-px h-3 bg-slate-200" />
        <span className={`flex items-center gap-1 text-[11px] font-semibold
          ${boardMode === 'host-only' ? 'text-amber-600' : 'text-emerald-600'}`}>
          {boardMode === 'host-only' ? 'ðŸ”’ Host Only' : 'ðŸŒ Public'}
        </span>

        {mode === 'drawing' && (
          <>
            <div className="w-px h-3 bg-slate-200" />
            <span className="text-[11px] text-slate-400">
              Tool: <span className="text-slate-600 font-semibold capitalize">{tool}</span>
            </span>
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              Color: <span className="inline-block w-3 h-3 rounded-full border border-slate-300 align-middle shadow-sm" style={{ background: color }} />
            </span>
            <span className="text-[11px] text-slate-400">
              Size: <span className="text-slate-600 font-semibold">{size}px</span>
            </span>
          </>
        )}

        <span className="ml-auto flex items-center gap-1.5 text-[11px] text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
          {activeUsers.length} online
        </span>
      </div>
    </div>
  );
};

export default BoardPage;
