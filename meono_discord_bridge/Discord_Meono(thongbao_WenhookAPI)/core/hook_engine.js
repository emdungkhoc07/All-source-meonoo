// core/hook_engine.js - Cơ chế Non-Invasive Hook vào Socket.IO trong RAM mà không cần sửa đổi bất kỳ dòng code nào trong game server
const discordService = require('../services/discord_service');
const roomTracker = require('./room_tracker');

// Cache chống gửi trùng lặp tin nhắn do Server lặp allSocketIds.forEach()
const recentExplosions = new Map(); // key -> timestamp
const recentGameOvers = new Map();  // roomId -> timestamp

function setupHook(ioModule) {
  if (!ioModule || !ioModule.Server || !ioModule.Socket) {
    console.warn('[Hook Engine] Không tìm thấy class Server/Socket trong socket.io');
    return;
  }

  const { Server, Socket } = ioModule;

  // Lấy class BroadcastOperator từ socket.io (nơi xử lý io.to(sid).emit và io.emit)
  let BroadcastOperator = null;
  try {
    const dummyServer = new Server();
    const dummyOp = dummyServer.to('dummy_channel');
    BroadcastOperator = dummyOp.constructor;
  } catch (err) {
    console.warn('[Hook Engine] Không thể trích xuất BroadcastOperator:', err.message);
  }

  // Hàm điều phối chung cho mọi sự kiện broadcast
  function handleInterceptedEvent(event, data, targetRoomOrSid) {
    try {
      // 1. Sự kiện cập nhật trạng thái phòng: rooms_state
      if (event === 'rooms_state') {
        roomTracker.handleRoomsState(data);
      }

      // 2. Sự kiện bắt đầu ván đấu mới: game_setup
      if (event === 'game_setup') {
        const roomId = data?.roomId || 'default';
        roomTracker.resetBombs(roomId);
      }

      // 3. Sự kiện người chơi bị nổ: game_player_exploded
      if (event === 'game_player_exploded' || event === 'game_super_exploding_drawn') {
        const victimKey = `${data?.roomId}_${data?.playerSocketId || data?.username}`;
        const now = Date.now();

        // Server gửi qua allSocketIds.forEach() nên chỉ nhận 1 lần trong 3000ms
        if (!recentExplosions.has(victimKey) || (now - recentExplosions.get(victimKey) > 3000)) {
          recentExplosions.set(victimKey, now);

          const rId = data?.roomId || 'roomBar1';
          roomTracker.recordBombExplosion(rId);

          console.log(`💥 [Hook Engine] Phát hiện người chơi nổ: ${data?.username} tại phòng ${rId}`);
          discordService.sendPlayerExploded({
            playerName: data?.username,
            bombCard: data?.bombCard
          });

          setTimeout(() => recentExplosions.delete(victimKey), 10000);
        }
      }

      // 4. Sự kiện kết thúc trận đấu: game_over
      if (event === 'game_over') {
        const roomId = data?.roomId || targetRoomOrSid || 'room_ended';
        const now = Date.now();

        if (!recentGameOvers.has(roomId) || (now - recentGameOvers.get(roomId) > 5000)) {
          recentGameOvers.set(roomId, now);

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

          const totalBombs = roomTracker.getBombCount(roomId) || Math.max(1, casualties.length);

          console.log(`🏆 [Hook Engine] Phát hiện ván đấu kết thúc: Quán quân ${winner} tại phòng ${roomId}`);
          discordService.sendGameOver({
            winnerName: winner,
            winnerDelta: winnerDelta,
            winnerScore: winnerScore,
            casualties: casualties,
            totalBombsExploded: totalBombs,
            isRankmatch: isRankmatch
          });

          setTimeout(() => recentGameOvers.delete(roomId), 15000);
        }
      }
    } catch (err) {
      console.error('[Hook Engine] Lỗi khi xử lý sự kiện hook:', err);
    }
  }

  // 1. Hook BroadcastOperator.prototype.emit (Bắt trọn 100% io.emit, io.to(sid).emit)
  if (BroadcastOperator && BroadcastOperator.prototype && typeof BroadcastOperator.prototype.emit === 'function') {
    const originalBroadcastEmit = BroadcastOperator.prototype.emit;
    BroadcastOperator.prototype.emit = function (event, ...args) {
      handleInterceptedEvent(event, args[0], this.rooms ? Array.from(this.rooms)[0] : null);
      return originalBroadcastEmit.apply(this, [event, ...args]);
    };
    console.log('✅ [Hook Engine] Đã hook BroadcastOperator.prototype.emit thành công!');
  }

  // 2. Hook Server.prototype.emit (Dự phòng cho io.emit trực tiếp trên Server)
  const originalServerEmit = Server.prototype.emit;
  Server.prototype.emit = function (event, ...args) {
    handleInterceptedEvent(event, args[0], null);
    return originalServerEmit.apply(this, [event, ...args]);
  };

  // 3. Hook Socket.prototype.emit (Bắt các sự kiện socket.emit đơn lẻ)
  const originalSocketEmit = Socket.prototype.emit;
  Socket.prototype.emit = function (event, ...args) {
    handleInterceptedEvent(event, args[0], this.id);
    return originalSocketEmit.apply(this, [event, ...args]);
  };

  console.log('✅ [Hook Engine] Đã kích hoạt toàn bộ Hook Socket.IO Non-Invasive thành công!');
}

module.exports = {
  setupHook
};
