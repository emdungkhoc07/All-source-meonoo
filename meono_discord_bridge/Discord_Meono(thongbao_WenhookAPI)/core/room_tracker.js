// core/room_tracker.js - Theo dõi biến động trạng thái phòng chơi (Lobby, Tham gia, Thoát)
const discordService = require('../services/discord_service');

class RoomTracker {
  constructor() {
    this.previousRoomsState = null;
    this.roomOpenedAnnounced = {}; // { roomId: boolean }
    this.roomPreGameSeats = {};    // { roomId: seats } lưu điểm trước ván để so sánh khi hết trận
    this.roomBombsExploded = {};   // { roomId: number } đếm số bom đã nổ trong ván
    this.recentGameOvers = new Map(); // roomId -> timestamp (chống spam trùng lặp)
  }

  /**
   * Đếm số lượng ghế đã có người ngồi trong phòng
   */
  countPlayers(seats) {
    if (!Array.isArray(seats)) return 0;
    return seats.filter(s => s !== null && s !== undefined).length;
  }

  /**
   * Xử lý gói tin rooms_state cập nhật từ Server
   * @param {object} newRoomsState - Trạng thái tất cả các phòng
   */
  async handleRoomsState(newRoomsState) {
    if (!newRoomsState || typeof newRoomsState !== 'object') return;

    if (!this.previousRoomsState) {
      // Lần đầu nhận rooms_state khi vừa khởi động: Ghi nhận trạng thái gốc
      this.previousRoomsState = JSON.parse(JSON.stringify(newRoomsState));
      for (const rId in newRoomsState) {
        const count = this.countPlayers(newRoomsState[rId].seats);
        this.roomOpenedAnnounced[rId] = count > 0;
      }
      return;
    }

    for (const rId in newRoomsState) {
      const currentRoom = newRoomsState[rId];
      const prevRoom = this.previousRoomsState[rId] || { seats: Array(10).fill(null), status: 'LOBBY' };

      const currentSeats = currentRoom.seats || [];
      const prevSeats = prevRoom.seats || [];

      const currentCount = this.countPlayers(currentSeats);
      const prevCount = this.countPlayers(prevSeats);
      const maxSeats = currentRoom.maxSeats || 10;

      // Tìm chủ phòng hiện tại
      const hostSeat = currentSeats.find(s => s && s.isHost) || currentSeats.find(s => s !== null);
      const hostName = hostSeat ? hostSeat.username : 'Chủ Phòng';

      // 1. TRƯỜNG HỢP: Phòng từ trống (0 người) -> có người đầu tiên vào mở phòng
      if (prevCount === 0 && currentCount >= 1 && !this.roomOpenedAnnounced[rId]) {
        this.roomOpenedAnnounced[rId] = true;
        this.roomBombsExploded[rId] = 0;

        console.log(`[Tracker] Phát hiện phòng mới mở: ${hostName} tại ${currentRoom.name || rId}`);
        await discordService.sendRoomOpened({
          hostName: hostName,
          mode: currentRoom.mode || 'NORMAL',
          playerCount: currentCount,
          maxSeats: currentRoom.mode === 'RANK' ? 5 : maxSeats
        });
      }

      // 2. TRƯỜNG HỢP: Có người chơi MỚI tham gia vào phòng đã có người
      if (prevCount > 0 && currentCount > prevCount) {
        // Tìm các ghế mới có người ngồi
        currentSeats.forEach(async (newSeat, idx) => {
          const oldSeat = prevSeats[idx];
          if (newSeat !== null && (oldSeat === null || oldSeat === undefined || oldSeat.socketId !== newSeat.socketId)) {
            // Đảm bảo không phải chủ phòng vừa tự đổi ghế
            if (newSeat.username !== hostName || currentCount > 1) {
              console.log(`[Tracker] Phát hiện người vào phòng: ${newSeat.username} vào phòng của ${hostName}`);
              await discordService.sendPlayerJoined({
                newPlayerName: newSeat.username,
                hostName: hostName,
                currentCount: currentCount,
                maxSeats: maxSeats
              });
            }
          }
        });
      }

      const isPlayingStatus = (status) => status === 'ĐANG CHƠI' || status === 'PLAYING' || status === 'COUNTDOWN' || status === 'STARTING';
      const wasPlaying = isPlayingStatus(prevRoom.status);
      const nowPlaying = isPlayingStatus(currentRoom.status);

      // 3. TRƯỜNG HỢP: Phòng bị rỗng (tất cả rời phòng) -> Reset cờ để lần sau thông báo lại
      if (currentCount === 0 && prevCount > 0 && !nowPlaying && !wasPlaying) {
        this.roomOpenedAnnounced[rId] = false;
        this.roomBombsExploded[rId] = 0;
        this.roomPreGameSeats[rId] = null;
      }

      // 4. TRƯỜNG HỢP: Trạng thái chuyển sang bắt đầu trận đấu (COUNTDOWN hoặc ĐANG CHƠI)
      if (!wasPlaying && nowPlaying) {
        // Lưu lại danh sách ghế trước ván để so điểm rank sau ván
        this.roomPreGameSeats[rId] = JSON.parse(JSON.stringify(currentSeats.filter(s => s !== null)));
        this.roomBombsExploded[rId] = 0;
        console.log(`[Tracker] Trận đấu tại ${currentRoom.name || rId} đã bắt đầu! (${this.roomPreGameSeats[rId].length} người)`);
      }

      // 5. TRƯỜNG HỢP: Trận đấu kết thúc (Từ ĐANG CHƠI / PLAYING -> LOBBY)
      if (wasPlaying && currentRoom.status === 'LOBBY') {
        const now = Date.now();
        if (!this.recentGameOvers.has(rId) || (now - this.recentGameOvers.get(rId) > 15000)) {
          this.recentGameOvers.set(rId, now);
          console.log(`[Tracker] Trận đấu tại ${currentRoom.name || rId} vừa kết thúc!`);
          this.handleGameEndedFromLobby(rId, prevRoom, currentRoom);
          this.roomPreGameSeats[rId] = null;
        }
      }
    }

    // Lưu lại trạng thái làm mốc so sánh cho lần sau
    this.previousRoomsState = JSON.parse(JSON.stringify(newRoomsState));
  }

  /**
   * Xử lý kết thúc trận đấu dựa vào diff điểm trong rooms_state
   */
  async handleGameEndedFromLobby(roomId, prevRoom, currentRoom) {
    const preSeats = (this.roomPreGameSeats[roomId] || prevRoom.seats || []).filter(s => s !== null);
    const postSeats = (currentRoom.seats || []).filter(s => s !== null);

    const isRank = (currentRoom.mode === 'RANK' || prevRoom.mode === 'RANK');

    // Nếu là phòng thường (thường tự giải tán ghế về trống) hoặc không còn ai ngồi lại
    if (!isRank || postSeats.length === 0) {
      const participants = preSeats.map(s => s.username);
      const totalBombs = this.roomBombsExploded[roomId] || (participants.length > 1 ? participants.length - 1 : 0);
      console.log(`[Tracker] Trận đấu phòng thường kết thúc: ${participants.join(', ')}`);
      await discordService.sendGameOver({
        winnerName: '',
        isRankmatch: false,
        participants: participants,
        totalBombsExploded: totalBombs
      });
      return;
    }

    // Nếu là phòng Rankmatch có lưu điểm cập nhật
    const rankResults = [];
    postSeats.forEach((curr) => {
      const prev = preSeats.find(p => p && (p.uid === curr.uid || p.username === curr.username));
      const oldScore = prev ? (parseInt(prev.rankScore) || 0) : (parseInt(curr.rankScore) || 0);
      const newScore = parseInt(curr.rankScore) || 0;
      const delta = newScore - oldScore;

      rankResults.push({
        username: curr.username,
        oldScore: oldScore,
        newScore: newScore,
        deltaScore: delta
      });
    });

    if (rankResults.length === 0) return;

    // Sắp xếp người có delta điểm cao nhất làm winner
    rankResults.sort((a, b) => b.deltaScore - a.deltaScore);

    const winner = rankResults[0];
    const casualties = rankResults.slice(1);
    const totalBombs = this.roomBombsExploded[roomId] || (rankResults.length - 1);

    await discordService.sendGameOver({
      winnerName: winner.username,
      winnerDelta: winner.deltaScore,
      winnerScore: winner.newScore,
      casualties: casualties,
      totalBombsExploded: totalBombs,
      isRankmatch: true
    });
  }

  /**
   * Đếm bom nổ khi nhận được sự kiện nổ trong hook
   */
  recordBombExplosion(roomId) {
    if (!this.roomBombsExploded[roomId]) {
      this.roomBombsExploded[roomId] = 0;
    }
    this.roomBombsExploded[roomId]++;
    return this.roomBombsExploded[roomId];
  }

  getBombCount(roomId) {
    return this.roomBombsExploded[roomId] || 0;
  }

  resetBombs(roomId) {
    this.roomBombsExploded[roomId] = 0;
  }
}

module.exports = new RoomTracker();
