// Kiểm tra người chơi còn ít nhất 1 lá bài CHƯA bị Locking khóa hay không
function hasLockableCard(p) {
    const lockedUids = (p.lockedCards && Array.isArray(p.lockedCards.lockedCardUids)) ? p.lockedCards.lockedCardUids : [];
    return p.hand.some(c => !lockedUids.includes(c.uid));
}

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
        io.to(rootAction.playerSocketId).emit('game_locking_select_target', {
            roomId,
            targets: []
        });
        console.log(`[Game] ${rootAction.username} dùng Locking nhưng không có ai có bài để khóa.`);
        game.phase = 'PLAYING';
        return;
    }

    game.phase = 'LOCKING_TARGET_SELECTION';
    game.lockingState = {
        attackerSocketId: rootAction.playerSocketId,
        attackerUsername: rootAction.username,
        attackerIndex: game.players.findIndex(p => p.socketId === rootAction.playerSocketId)
    };
    
    io.to(rootAction.playerSocketId).emit('game_locking_select_target', {
        roomId,
        targets
    });
    
    console.log(`[Game] ${rootAction.username} dùng Locking, đang chọn mục tiêu để khóa 3 lá bài...`);
}

module.exports = { execute };
