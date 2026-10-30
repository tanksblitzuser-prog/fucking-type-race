const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });
const PORT = process.env.PORT || 3000;
app.use(express.static(path.join(__dirname, 'public')));
app.get('/health', (_, res) => res.json({ ok: true, game: 'FUCKING TYPE RACE' }));

const rooms = new Map();
const WORDS = {
  uz: 'Tun jimjit edi, ammo eski zavod ichida soatning ovozi eshitilardi. Har bir soniya yangi imkoniyat, har bir harf esa marraga yaqinlashish demakdir.',
  en: 'The night was silent, but somewhere inside the old factory a clock kept ticking. Every second is a new chance, every letter brings you closer to the finish line.',
  ru: 'Ночь была тихой, но где-то внутри старой фабрики продолжали идти часы. Каждая секунда — новый шанс, каждая буква приближает к финишу.'
};
function cleanName(v) { return String(v || 'Racer').trim().replace(/[<>]/g, '').slice(0, 18) || 'Racer'; }
function makeCode() { return Math.random().toString(36).slice(2, 6).toUpperCase(); }
function publicRoom(room) {
  return { code: room.code, status: room.status, language: room.language, players: [...room.players.values()].map(p => ({ id:p.id, name:p.name, progress:p.progress, wpm:p.wpm, accuracy:p.accuracy, done:p.done, host:p.id===room.host })) };
}
function emitRoom(room) { io.to(room.code).emit('room:update', publicRoom(room)); }
function leaveRoom(socket) {
  const code = socket.data.roomCode;
  if (!code) return;
  const room = rooms.get(code);
  if (room) {
    room.players.delete(socket.id);
    if (!room.players.size) { clearTimeout(room.timer); rooms.delete(code); }
    else {
      if (room.host === socket.id) room.host = room.players.keys().next().value;
      emitRoom(room);
    }
  }
  socket.leave(code); socket.data.roomCode = null;
}
io.on('connection', socket => {
  socket.on('room:create', ({ name, language }, cb = () => {}) => {
    leaveRoom(socket);
    let code; do { code = makeCode(); } while (rooms.has(code));
    const room = { code, host: socket.id, status:'waiting', language:['uz','en','ru'].includes(language)?language:'en', players:new Map(), timer:null, startedAt:null, text:'' };
    room.players.set(socket.id, { id:socket.id, name:cleanName(name), progress:0, wpm:0, accuracy:100, done:false });
    rooms.set(code, room); socket.join(code); socket.data.roomCode=code;
    cb({ ok:true, code }); emitRoom(room);
  });
  socket.on('room:join', ({ code, name }, cb = () => {}) => {
    leaveRoom(socket);
    code = String(code || '').trim().toUpperCase();
    const room = rooms.get(code);
    if (!room) return cb({ ok:false, error:'ROOM_NOT_FOUND' });
    if (room.status !== 'waiting') return cb({ ok:false, error:'RACE_STARTED' });
    if (room.players.size >= 8) return cb({ ok:false, error:'ROOM_FULL' });
    room.players.set(socket.id, { id:socket.id, name:cleanName(name), progress:0, wpm:0, accuracy:100, done:false });
    socket.join(code); socket.data.roomCode=code; cb({ ok:true, code }); emitRoom(room);
  });
  socket.on('race:start', (_, cb = () => {}) => {
    const room = rooms.get(socket.data.roomCode);
    if (!room || room.host !== socket.id) return cb({ok:false});
    if (room.status !== 'waiting' || room.players.size < 1) return cb({ok:false});
    room.status='countdown'; room.text=WORDS[room.language] || WORDS.en; emitRoom(room);
    io.to(room.code).emit('race:countdown', { seconds:3 });
    room.timer=setTimeout(() => {
      if (!rooms.has(room.code)) return;
      room.status='racing'; room.startedAt=Date.now();
      for (const p of room.players.values()) { p.progress=0; p.wpm=0; p.accuracy=100; p.done=false; }
      io.to(room.code).emit('race:begin', { text:room.text, startedAt:room.startedAt }); emitRoom(room);
    }, 3000);
    cb({ok:true});
  });
  socket.on('race:progress', data => {
    const room=rooms.get(socket.data.roomCode); if (!room || room.status!=='racing') return;
    const p=room.players.get(socket.id); if (!p || p.done) return;
    p.progress=Math.max(0, Math.min(100, Number(data.progress)||0));
    p.wpm=Math.max(0, Math.min(300, Number(data.wpm)||0));
    p.accuracy=Math.max(0, Math.min(100, Number(data.accuracy)||0));
    if (p.progress>=100) { p.progress=100; p.done=true; }
    emitRoom(room);
    if ([...room.players.values()].every(x=>x.done)) {
      room.status='finished';
      const ranking=[...room.players.values()].sort((a,b)=>b.progress-a.progress || b.wpm-a.wpm).map((x,i)=>({...x, place:i+1}));
      io.to(room.code).emit('race:finish', { ranking }); emitRoom(room);
    }
  });
  socket.on('race:again', (_, cb=()=>{}) => {
    const room=rooms.get(socket.data.roomCode); if (!room || room.host!==socket.id || room.status!=='finished') return cb({ok:false});
    room.status='waiting'; room.startedAt=null;
    for (const p of room.players.values()) Object.assign(p,{progress:0,wpm:0,accuracy:100,done:false});
    emitRoom(room); cb({ok:true});
  });
  socket.on('disconnect', () => leaveRoom(socket));
});
server.listen(PORT, '0.0.0.0', () => console.log(`FUCKING TYPE RACE running on ${PORT}`));
