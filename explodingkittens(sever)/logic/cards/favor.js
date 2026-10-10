function execute({ game, roomId, io, rootAction }) {
    const targets = game.players
        .filter(p => {
            if (!p.alive || p.isFrozen || p.socketId === rootAction.playerSocketId || p.hand.length === 0) return false;
            const existingLockedUids = (p.lockedCards && Array.isArray(p.lockedCards.lockedCardUids)) ? p.lockedCards.lockedCardUids : [];
            const lockableHand = p.hand.filter(c => !existingLockedUids.includes(c.uid));
            return lockableHand.length > 0;
        })
        .map(p => ({ socketId: p.socketId, username: p.username, avatar: p.avatar }));
        
    if (targets.length === 0) {
        // Không ai có bài -> Bỏ qua
        io.to(rootAction.playerSocketId).emit('game_favor_select_target', {
            roomId,
            targets: []
        });
        console.log(`[Game] ${rootAction.username} dùng Favor nhưng không có ai có bài để xin.`);
        game.phase = 'PLAYING';
        return;
    }

    game.phase = 'FAVOR_TARGET_SELECTION';
    game.favorState = {
        requesterSocketId: rootAction.playerSocketId,
        requesterUsername: rootAction.username,
        requesterIndex: game.players.findIndex(p => p.socketId === rootAction.playerSocketId)
    };
    
    io.to(rootAction.playerSocketId).emit('game_favor_select_target', {
        roomId,
        targets
    });
    
    console.log(`[Game] ${rootAction.username} dùng Favor, đang chọn mục tiêu...`);
}

module.exports = { execute };
