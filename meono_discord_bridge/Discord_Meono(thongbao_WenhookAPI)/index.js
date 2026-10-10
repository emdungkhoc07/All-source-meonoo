// index.js - Standalone Listener Mode: Kết nối trực tiếp tới Game Server qua Socket.IO Client
const { io } = require('socket.io-client');
const config = require('./config');
const roomTracker = require('./core/room_tracker');
const discordService = require('./services/discord_service');

console.log('═══════════════════════════════════════════════════════════════');
console.log('         MEONO x DISCORD BRIDGE (STANDALONE LISTENER)          ');
console.log(` 👉 Đang kết nối tới Game Server: ${config.GAME_SERVER_URL}`);
console.log(` 👉 Webhook Discord: ${config.DISCORD_WEBHOOK_URL ? 'Đã thiết lập' : 'Chưa có'}`);
console.log('═══════════════════════════════════════════════════════════════');

// Tự động gửi HTTP Ping đánh thức Game Server trên Render nếu đang ngủ (Cold start)
async function wakeupGameServer() {
  if (!config.GAME_SERVER_URL || config.GAME_SERVER_URL.includes('localhost') || config.GAME_SERVER_URL.includes('127.0.0.1')) {
    return;
  }

  const pingUrl = config.GAME_SERVER_URL.endsWith('/') ? config.GAME_SERVER_URL + 'ping' : config.GAME_SERVER_URL + '/ping';
  try {
    const res = await fetch(pingUrl, { signal: AbortSignal.timeout(10000) });
    if (res.ok) {
      console.log(`⚡ [Render WakeUp] Game Server Render đang hoạt động tốt (Ping status: ${res.status})!`);
    }
  } catch (err) {
    console.log(`⏳ [Render WakeUp] Đang gửi tín hiệu kích hoạt Game Server Render: ${err.message}`);
  }
}

// Gọi đánh thức ngay khi khởi chạy
wakeupGameServer();
// Duy trì ping mỗi 8 phút để Game Server Render không bị ngủ đông (Sleep 15m free-tier)
setInterval(wakeupGameServer, 8 * 60 * 1000);

// Tự duy trì hoạt động cho chính Discord Bridge trên Render bằng cách ping qua Public URL (reset bộ đếm 15 phút của Render)
const SELF_URL = process.env.RENDER_EXTERNAL_URL || 'https://discord-meono-thongbao-wenhookapi.onrender.com';
async function keepSelfAlive() {
  if (!SELF_URL) return;
  const selfPingUrl = SELF_URL.endsWith('/') ? SELF_URL + 'ping' : SELF_URL + '/ping';
  try {
    const res = await fetch(selfPingUrl, { signal: AbortSignal.timeout(10000) });
    if (res.ok) {
      console.log('⚡ [Self KeepAlive] Đã tự duy trì hoạt động cho Discord Bridge trên Render!');
    }
  } catch (err) {}
}
// Chạy sau 1 phút khởi động và lặp lại mỗi 8 phút
setTimeout(keepSelfAlive, 60 * 1000);
setInterval(keepSelfAlive, 8 * 60 * 1000);

const socket = io(config.GAME_SERVER_URL, {
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 25000
});

socket.on('connect', () => {
  console.log(`✅ [Bridge] Đã kết nối thành công tới Game Server Render! (Socket ID: ${socket.id})`);
  console.log(`📡 [Bridge] Đang trực tiếp lắng nghe các trận đấu tại: ${config.GAME_SERVER_URL}`);
});

socket.on('connect_error', (err) => {
  console.warn(`⚠️ [Bridge] Chưa kết nối được Game Server (${config.GAME_SERVER_URL}): ${err.message}. Đang thử lại...`);
});

socket.on('disconnect', (reason) => {
  console.warn(`[Bridge] Mất kết nối tới Game Server: ${reason}. Đang tự động kết nối lại...`);
});

// Lắng nghe trạng thái phòng chơi (mở phòng, vào phòng, kết thúc trận)
socket.on('rooms_state', (roomsState) => {
  try {
    roomTracker.handleRoomsState(roomsState);
  } catch (err) {
    console.error('[Bridge Error] Lỗi khi xử lý rooms_state:', err);
  }
});

// Lắng nghe sự kiện người chơi bị nổ trực tiếp từ Socket
const handleExplosionEvent = (data) => {
  try {
    console.log(`💥 [Bridge] Phát hiện người chơi nổ qua Socket: ${data?.username}`);
    roomTracker.recordBombExplosion(data?.roomId || 'default');
    discordService.sendPlayerExploded({
      playerName: data?.username,
      bombCard: data?.bombCard
    });
  } catch (err) {
    console.error('[Bridge Error] Lỗi khi xử lý sự kiện nổ:', err);
  }
};

socket.on('discord_player_exploded', handleExplosionEvent);
socket.on('game_player_exploded', handleExplosionEvent);

// Lắng nghe sự kiện kết thúc ván đấu trực tiếp từ Socket
socket.on('game_over', (data) => {
  try {
    console.log(`🏆 [Bridge] Phát hiện kết thúc ván đấu qua Socket: Quán quân ${data?.winner}`);
    const winner = data?.winner || 'Vô danh';
    const rankResults = Array.isArray(data?.rankResults) ? data?.rankResults : [];
    const isRankmatch = !!data?.isRankmatch;

    let winnerDelta = 0;
    let winnerScore = undefined;
    const winnerData = rankResults.find(r => r.username === winner);
    if (winnerData) {
      winnerDelta = winnerData.deltaScore !== undefined ? winnerData.deltaScore : 0;
      winnerScore = winnerData.newScore;
    }

    const casualties = rankResults
      .filter(r => r.username !== winner)
      .sort((a, b) => (b.placement || 0) - (a.placement || 0));

    discordService.sendGameOver({
      winnerName: winner,
      winnerDelta: winnerDelta,
      winnerScore: winnerScore,
      casualties: casualties,
      totalBombsExploded: roomTracker.getBombCount(data?.roomId) || Math.max(1, casualties.length),
      isRankmatch: isRankmatch
    });
  } catch (err) {
    console.error('[Bridge Error] Lỗi khi xử lý game_over:', err);
  }
});

// HTTP Server siêu nhẹ phục vụ Render.com kiểm tra sức khỏe và ping 24/7
const http = require('http');
const HTTP_PORT = process.env.PORT || 3344;
const pingServer = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.url === '/ping' || req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      status: 'active',
      service: 'Meono Discord Bridge',
      gameServer: config.GAME_SERVER_URL,
      socketConnected: socket.connected,
      time: new Date().toISOString()
    }));
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

pingServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`⚠️ [HTTP Server] Cổng ${HTTP_PORT} đang bận (có tiến trình khác đang dùng). Bridge Socket.IO vẫn hoạt động bình thường!`);
  } else {
    console.error('⚠️ [HTTP Server] Lỗi:', err.message);
  }
});

pingServer.listen(HTTP_PORT, '0.0.0.0', () => {
  console.log(`📡 [HTTP Server] Đang lắng nghe tại 0.0.0.0:${HTTP_PORT} (Hỗ trợ Render.com & Ping 24/7)`);
});

// Giữ tiến trình chạy nền ổn định
process.on('SIGINT', () => {
  console.log('\n[Bridge] Đang dừng Discord Bridge...');
  socket.disconnect();
  pingServer.close();
  process.exit(0);
});
