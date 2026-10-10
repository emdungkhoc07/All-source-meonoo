const readline = require('readline');
const { getPublicRoomsState, getPlayersCardCounts } = require('../logic/shared_utils');

function startCronJobs(ROOMS, PLAYERS, io) {
    // === LOGIC RESET SERVER 3H SÁNG ===
    setInterval(() => {
        const now = new Date();
        // Reset vào đúng 03:00 (kiểm tra mỗi phút, nếu là 03:00 thì chạy)
        if (now.getHours() === 3 && now.getMinutes() === 0) {
            console.log(`[Server] ${now.toLocaleString()} - Tự động reset toàn bộ phòng...`);
            // Khởi tạo lại tất cả 3 phòng sảnh
            const activeRoomIds = ["roomBar1", "roomBar2", "roomBar3"];
            activeRoomIds.forEach((rId, idx) => {
                ROOMS[rId] = {
                    id: rId,
                    name: `PHÒNG ${idx + 1}`,
                    hostSocketId: null,
                    hostUsingDeck: [],
                    waitNope: null,
                    status: 'LOBBY',
                    maxSeats: 10,
                    seats: Array(10).fill(null),
                    mode: 'NORMAL',
                    selectedMap: 'default',
                    game: null,
                    chatHistory: []
                };
            });
            // Dọn sạch các key phòng cũ không thuộc 3 phòng trên
            Object.keys(ROOMS).forEach(id => {
                if (!activeRoomIds.includes(id)) {
                    delete ROOMS[id];
                }
            });
            io.emit('rooms_state', getPublicRoomsState(ROOMS));
        }
    }, 60000); // Check mỗi 60 giây

    // Note: Toàn bộ đồng bộ lượt đi và số lượng bài đã chuyển sang cơ chế Server-Push tức thì theo sự kiện (Event-driven Webhook)

    // === DEBUG COMMANDS ===
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.on('line', (input) => {
        if (input.trim() === 'game_viewdecks') {
            const roomIds = Object.keys(ROOMS);
            if (roomIds.length === 0) {
                console.log('[DEBUG] Không có phòng nào đang mở.');
                return;
            }
            roomIds.forEach(id => {
                const room = ROOMS[id];
                if (room.game && room.game.drawPile) {
                    console.log(`\n=== CHỒNG BÀI RÚT PHÒNG ${id} ===`);
                    console.log(`Số lượng: ${room.game.drawPile.length} lá`);
                    const deckList = room.game.drawPile.map((card, index) => `[${index}] ${card.id}`).reverse().join('\n');
                    console.log(deckList);
                    console.log(`=================================`);
                } else {
                    console.log(`\n[DEBUG] Phòng ${id} chưa bắt đầu game hoặc không có drawPile.`);
                }
            });
        }
    });
}

module.exports = { startCronJobs };
