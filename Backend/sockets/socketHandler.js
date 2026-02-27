const Message = require('../models/Message');
const Whiteboard = require('../models/Whiteboard');
const Room = require('../models/Room');

/**
 * In-memory redo stacks, keyed by roomId.
 * Each entry is an array of stroke objects.
 * Cleared when any user commits a new draw stroke in that room.
 */
const roomRedoStacks = {};

/**
 * In-memory screen-share state, keyed by roomId.
 * { hostSocketId: string, active: boolean }
 */
const roomScreenShare = {};

/**
 * In-memory user registry per room.
 * roomId -> { [socketId]: { userId, name } }
 */
const roomUsers = {};

/**
 * Per-user permissions per room.
 * roomId -> { [socketId]: 'read-write' | 'read-only' }
 */
const roomUserPermissions = {};

/**
 * Socket.io event handler
 * Registers all real-time collaborative events on the given io instance
 *
 * @param {import('socket.io').Server} io
 */
const socketHandler = (io) => {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // -------------------------------------------------------
    // joinRoom — user joins a whiteboard room
    // -------------------------------------------------------
    socket.on('joinRoom', async ({ roomId, user }) => {
      socket.join(roomId);
      console.log(`${user?.name || socket.id} joined room: ${roomId}`);

      // Track user in room registry
      if (!roomUsers[roomId]) roomUsers[roomId] = {};
      roomUsers[roomId][socket.id] = { userId: user?._id, name: user?.name || 'User' };

      // Send existing board strokes to the newly joined user
      try {
        const board = await Whiteboard.findOne({ roomId });
        if (board && board.strokes.length > 0) {
          socket.emit('boardState', board.strokes);
        }
      } catch (err) {
        console.error('Board state load error:', err.message);
      }

      // Determine room boardMode and set default permission for the joining user
      let boardMode = 'public';
      try {
        const roomDoc = await Room.findOne({ roomId });
        if (roomDoc) boardMode = roomDoc.boardMode || 'public';
      } catch (_) {}

      if (!roomUserPermissions[roomId]) roomUserPermissions[roomId] = {};
      // Only assign default if no explicit permission has been set for this socket
      if (!roomUserPermissions[roomId][socket.id]) {
        roomUserPermissions[roomId][socket.id] = boardMode === 'host-only' ? 'read-only' : 'read-write';
      }

      // Send the current live user list + permissions to the joining user
      socket.emit('roomUsersSync', {
        users: roomUsers[roomId],
        permissions: roomUserPermissions[roomId] || {},
        boardMode,
      });

      // Notify other users in the room
      socket.to(roomId).emit('userJoined', {
        userId: user?._id || socket.id,
        socketId: socket.id,
        name: user?.name || 'A user',
        message: `${user?.name || 'A user'} joined the room`,
      });
    });

    // -------------------------------------------------------
    // drawing — live preview broadcast (NOT persisted to DB)
    // -------------------------------------------------------
    socket.on('drawing', ({ roomId, stroke }) => {
      socket.to(roomId).emit('drawing', stroke);
    });

    // -------------------------------------------------------
    // draw — broadcast drawing stroke to room
    // -------------------------------------------------------
    socket.on('draw', async ({ roomId, stroke }) => {
      // Broadcast to everyone else in the room
      socket.to(roomId).emit('draw', stroke);

      // Persist stroke to database
      try {
        await Whiteboard.findOneAndUpdate(
          { roomId },
          {
            $push: { strokes: stroke },
            lastUpdated: Date.now(),
          },
          { upsert: true, new: true }
        );

        // A new stroke invalidates the redo history for this room
        roomRedoStacks[roomId] = [];
      } catch (err) {
        console.error('Draw persist error:', err.message);
      }
    });

    // -------------------------------------------------------
    // erase — broadcast erase action to room
    // -------------------------------------------------------
    socket.on('erase', ({ roomId, eraseData }) => {
      socket.to(roomId).emit('erase', eraseData);
    });

    // -------------------------------------------------------
    // clearBoard — clear all strokes in room
    // -------------------------------------------------------
    socket.on('clearBoard', async ({ roomId }) => {
      // Notify all users (including sender) to clear canvas
      io.to(roomId).emit('clearBoard');

      // Also wipe the redo stack since the board is empty
      roomRedoStacks[roomId] = [];

      // Clear persisted strokes in database
      try {
        await Whiteboard.findOneAndUpdate(
          { roomId },
          { strokes: [], lastUpdated: Date.now() },
          { upsert: true }
        );
      } catch (err) {
        console.error('Clear board error:', err.message);
      }
    });

    // -------------------------------------------------------
    // undoStroke — remove the last committed stroke, broadcast
    // -------------------------------------------------------
    socket.on('undoStroke', async ({ roomId }) => {
      try {
        const board = await Whiteboard.findOne({ roomId });
        if (!board || board.strokes.length === 0) return;

        // Pop the last stroke and save it for potential redo
        const popped = board.strokes[board.strokes.length - 1];
        if (!roomRedoStacks[roomId]) roomRedoStacks[roomId] = [];
        roomRedoStacks[roomId].push(popped);

        // Remove from the DB array and save
        board.strokes.pop();
        board.markModified('strokes');
        board.lastUpdated = Date.now();
        await board.save();

        // Broadcast the updated stroke list to EVERY client in the room
        io.to(roomId).emit('boardState', board.strokes);
      } catch (err) {
        console.error('Undo error:', err.message);
      }
    });

    // -------------------------------------------------------
    // redoStroke — restore the last undone stroke, broadcast
    // -------------------------------------------------------
    socket.on('redoStroke', async ({ roomId }) => {
      try {
        if (!roomRedoStacks[roomId] || roomRedoStacks[roomId].length === 0) return;

        const stroke = roomRedoStacks[roomId].pop();

        const board = await Whiteboard.findOneAndUpdate(
          { roomId },
          { $push: { strokes: stroke }, lastUpdated: Date.now() },
          { upsert: true, new: true }
        );

        // Broadcast the updated stroke list to EVERY client in the room
        io.to(roomId).emit('boardState', board.strokes);
      } catch (err) {
        console.error('Redo error:', err.message);
      }
    });

    // -------------------------------------------------------
    // sendMessage — broadcast chat message and save to DB
    // -------------------------------------------------------
    socket.on('sendMessage', async ({ roomId, sender, text, messageType, fileData, fileName, fileType }) => {
      try {
        const isFile = messageType === 'file';
        const message = await Message.create({
          roomId,
          sender: sender._id,
          text: isFile ? (fileName || 'file') : text,
          messageType: isFile ? 'file' : 'text',
          fileData: isFile ? fileData : null,
          fileName: isFile ? fileName : null,
          fileType: isFile ? fileType : null,
        });

        const payload = {
          _id: message._id,
          roomId,
          sender,
          text: message.text,
          messageType: message.messageType,
          fileData: message.fileData,
          fileName: message.fileName,
          fileType: message.fileType,
          timestamp: message.timestamp,
        };

        io.to(roomId).emit('receiveMessage', payload);
      } catch (err) {
        console.error('Send message socket error:', err.message);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // -------------------------------------------------------
    // changeBoardMode — host toggles public / host-only
    // -------------------------------------------------------
    socket.on('changeBoardMode', async ({ roomId, mode }) => {
      try {
        await Room.findOneAndUpdate({ roomId }, { boardMode: mode });
        io.to(roomId).emit('boardModeChanged', { mode });
      } catch (err) {
        console.error('Change board mode error:', err.message);
      }
    });

    // -------------------------------------------------------
    // kickUser — host removes a user from the room
    // -------------------------------------------------------
    socket.on('kickUser', ({ roomId, targetSocketId }) => {
      const targetSocket = io.sockets.sockets.get(targetSocketId);
      if (targetSocket) {
        io.to(targetSocketId).emit('kicked', { message: 'You have been removed from the room by the host.' });
        targetSocket.leave(roomId);
      }
      // Clean up registry
      if (roomUsers[roomId]) delete roomUsers[roomId][targetSocketId];
      if (roomUserPermissions[roomId]) delete roomUserPermissions[roomId][targetSocketId];
      // Notify everyone else
      io.to(roomId).emit('userKicked', { socketId: targetSocketId });
    });

    // -------------------------------------------------------
    // setPermission — host sets read-only or read-write for a user
    // -------------------------------------------------------
    socket.on('setPermission', ({ roomId, targetSocketId, permission }) => {
      if (!roomUserPermissions[roomId]) roomUserPermissions[roomId] = {};
      roomUserPermissions[roomId][targetSocketId] = permission;
      // Tell the target user directly
      io.to(targetSocketId).emit('permissionChanged', { permission });
      // Tell everyone so the host UI stays in sync
      io.to(roomId).emit('permissionUpdated', { socketId: targetSocketId, permission });
    });

    // -------------------------------------------------------
    // Screen sharing — WebRTC signaling relay
    // -------------------------------------------------------
    socket.on('startScreenShare', ({ roomId }) => {
      roomScreenShare[roomId] = { hostSocketId: socket.id, active: true };
      socket.to(roomId).emit('screenShareStarted', { hostSocketId: socket.id });
    });

    socket.on('stopScreenShare', ({ roomId }) => {
      if (roomScreenShare[roomId]) roomScreenShare[roomId].active = false;
      io.to(roomId).emit('screenShareStopped');
    });

    // Viewer tells host it is ready to receive the stream
    socket.on('viewerReadyForShare', ({ roomId }) => {
      const state = roomScreenShare[roomId];
      if (!state || !state.active) return;
      // Tell the host to send an offer to this specific viewer
      io.to(state.hostSocketId).emit('sendOfferTo', { viewerSocketId: socket.id });
    });

    // Host sends WebRTC offer to a specific viewer
    socket.on('screenShareOffer', ({ to, offer }) => {
      io.to(to).emit('screenShareOffer', { from: socket.id, offer });
    });

    // Viewer sends WebRTC answer to host
    socket.on('screenShareAnswer', ({ to, answer }) => {
      io.to(to).emit('screenShareAnswer', { from: socket.id, answer });
    });

    // ICE candidate relay (bidirectional)
    socket.on('screenShareIce', ({ to, candidate }) => {
      io.to(to).emit('screenShareIce', { from: socket.id, candidate });
    });

    // -------------------------------------------------------
    // writingUpdate — collaborative writing panel sync
    // Broadcast HTML content to all other users in the room (no DB persist)
    // -------------------------------------------------------
    socket.on('writingUpdate', ({ roomId, html }) => {
      socket.to(roomId).emit('writingSync', { html });
    });

    // -------------------------------------------------------
    // disconnect — notify room when user leaves
    // -------------------------------------------------------
    socket.on('disconnecting', () => {
      socket.rooms.forEach((roomId) => {
        if (roomId !== socket.id) {
          const userInfo = roomUsers[roomId]?.[socket.id];
          const name = userInfo?.name || 'A user';
          // Clean up registry
          if (roomUsers[roomId]) delete roomUsers[roomId][socket.id];
          if (roomUserPermissions[roomId]) delete roomUserPermissions[roomId][socket.id];
          socket.to(roomId).emit('userLeft', {
            userId: socket.id,
            socketId: socket.id,
            message: `${name} left the room`,
          });
        }
      });
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
};

module.exports = socketHandler;
