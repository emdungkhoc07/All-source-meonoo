// Logic cho lá Locking 5 (id: locking5) - Khóa 5 lá bài đối phương
function hasLockableCard(p) {
    const lockedUids = (p.lockedCards && Array.isArray(p.lockedCards.lockedCardUids)) ? p.lockedCards.lockedCardUids : [];
    return p.hand.some(c => !lockedUids.includes(c.uid));
}

function execute({ game, roomId, io, rootAction }) {
    const targets = game.players
        .filter(p => p.alive && !p.isFrozen && p.socketId !== rootAction.playerSocketId && p.hand.length > 0 && hasLockableCard(p))
        .map(p => ({ socketId: p.socketId, username: p.username, avatar: p.avatar }));
        
    if (targets.length === 0) {
        io.to(rootAction.playerSocketId).emit('game_locking_select_target', {
            roomId,
            targets: []
        });
        console.log(`[Game] ${rootAction.username} dùng Locking 5 nhưng không có ai có bài để khóa.`);
        game.phase = 'PLAYING';
        return;
    }

    game.phase = 'LOCKING_TARGET_SELECTION';
    game.lockingState = {
        attackerSocketId: rootAction.playerSocketId,
        attackerUsername: rootAction.username,
        attackerIndex: game.players.findIndex(p => p.socketId === rootAction.playerSocketId),
        countToLock: 5
    };
    
    io.to(rootAction.playerSocketId).emit('game_locking_select_target', {
        roomId,
        targets
    });
    
    console.log(`[Game] ${rootAction.username} dùng Locking 5, đang chọn mục tiêu để khóa 5 lá bài...`);
}

module.exports = { execute };
