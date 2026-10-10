function execute({ game, roomId, io, rootAction }) {
    game.phase = 'COMBO_2_TARGET_SELECTION';
    game.comboState = {
        requesterSocketId: rootAction.playerSocketId,
        requesterUsername: rootAction.username,
        requesterIndex: game.players.findIndex(p => p.socketId === rootAction.playerSocketId),
        comboType: 2
    };
    
    const targets = game.players
        .filter(p => {
            if (!p.alive || p.isFrozen || p.socketId === rootAction.playerSocketId || p.hand.length === 0) return false;
            const existingLockedUids = (p.lockedCards && Array.isArray(p.lockedCards.lockedCardUids)) ? p.lockedCards.lockedCardUids : [];
            const lockableHand = p.hand.filter(c => !existingLockedUids.includes(c.uid));
            return lockableHand.length > 0;
        })
        .map(p => ({ socketId: p.socketId, username: p.username, avatar: p.avatar }));
    
    if (targets.length === 0) {
        io.to(rootAction.playerSocketId).emit('error_msg', 'Không có đối thủ nào có bài để cướp!');
        game.phase = 'PLAYING';
        return;
    }
    
    io.to(rootAction.playerSocketId).emit('game_combo_select_target', {
        roomId,
        targets,
        comboType: 2
    });
    
    console.log(`[Game] ${rootAction.username} dùng Combo 2 lá, đang chọn mục tiêu...`);
}

module.exports = { execute };
