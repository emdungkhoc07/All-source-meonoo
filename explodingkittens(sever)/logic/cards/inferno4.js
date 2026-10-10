function execute({ game, roomId, io, rootAction }) {
    const targets = game.players
        .filter(p => p.alive && !p.isFrozen && p.socketId !== rootAction.playerSocketId && p.hand.length > 0)
        .map(p => ({ socketId: p.socketId, username: p.username, avatar: p.avatar, uid: p.uid }));

    if (targets.length === 0) {
        io.to(rootAction.playerSocketId).emit('game_inferno_select_target', {
            roomId,
            targets: []
        });
        console.log(`[Game] ${rootAction.username} dùng Inferno4 nhưng không có ai có bài để thiêu cháy.`);
        game.phase = 'PLAYING';
        return;
    }

    game.phase = 'INFERNO_TARGET_SELECTION';
    game.infernoState = {
        attackerSocketId: rootAction.playerSocketId,
        attackerUsername: rootAction.username,
        attackerIndex: game.players.findIndex(p => p.socketId === rootAction.playerSocketId),
        countToDestroy: 4,
        cardId: 'inferno4'
    };

    io.to(rootAction.playerSocketId).emit('game_inferno_select_target', {
        roomId,
        targets,
        countToDestroy: 4,
        cardId: 'inferno4'
    });

    console.log(`[Game] ${rootAction.username} dùng Inferno4, đang chọn mục tiêu để thiêu cháy 4 lá bài...`);
}

module.exports = { execute };
