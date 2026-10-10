function execute({ game, roomId, io, rootAction, allSocketIds, advanceTurn }) {
    // 1. Đảo chiều thứ tự lượt đi
    game.turnDirection = (game.turnDirection === -1) ? 1 : -1;
    const isCounterClockwise = (game.turnDirection === -1);

    console.log(`[Game] ${rootAction.username} đã đánh lá REVERSE! Chiều lượt chơi đổi sang: ${isCounterClockwise ? 'Ngược chiều kim đồng hồ (-1)' : 'Thuận chiều kim đồng hồ (+1)'}`);

    // Broadcast sự kiện đổi chiều cho toàn bộ phòng
    allSocketIds.forEach(sid => {
        io.to(sid).emit('game_turn_direction_changed', {
            roomId,
            turnDirection: game.turnDirection,
            isCounterClockwise
        });
        io.to(sid).emit('game_toast', {
            title: 'ĐỔI CHIỀU',
            message: `<span class="toast-username">${rootAction.username}</span> đã đổi chiều lượt chơi sang <b>${isCounterClockwise ? 'Ngược kim đồng hồ' : 'Thuận kim đồng hồ'}</b>!`,
            type: 'info',
            duration: 3500
        });
    });

    // 2. Kết thúc 1 lượt bốc bài của bản thân (giảm 1 lượt bốc)
    advanceTurn(game, roomId, io);
}

module.exports = { execute };