function execute({ game, roomId, io, rootAction, allSocketIds }) {
    console.log(`[Game] ${rootAction.username} dùng Combo 5 lá, đang chọn bài lấy từ Hư Không...`);
    
    game.phase = 'COMBO_5_CARD_SELECTION';
    game.comboState = {
        requesterSocketId: rootAction.playerSocketId,
        requesterUsername: rootAction.username,
        comboType: 5
    };
    
    io.to(rootAction.playerSocketId).emit('game_combo_5_select_card', {
        roomId: roomId
    });
}

module.exports = {
    execute
};
