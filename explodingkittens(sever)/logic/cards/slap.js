function execute({ game, roomId, io, rootAction }) {
    const targets = game.players
        .filter(p => p.alive && !p.isFrozen)
        .map(p => ({ socketId: p.socketId, username: p.username, avatar: p.avatar, uid: p.uid }));

    if (targets.length === 0) {
        game.phase = 'PLAYING';
        return;
    }

    game.phase = 'SLAP_TARGET_SELECTION';
    game.slapState = {
        requesterSocketId: rootAction.playerSocketId,
        requesterUsername: rootAction.username,
        requesterUid: rootAction.playerUid,
        requesterIndex: game.players.findIndex(p => p.socketId === rootAction.playerSocketId),
        bonusTurns: 0,
        cardId: 'slap'
    };

    io.to(rootAction.playerSocketId).emit('game_slap_select_target', {
        roomId,
        targets,
        bonusTurns: 0,
        cardId: 'slap'
    });

    console.log(`[Game] ${rootAction.username} dùng Slap, đang chọn mục tiêu...`);
}

module.exports = { execute };
