function execute({ game, roomId, io, rootAction }) {
    const targets = game.players
        .filter(p => p.alive && !p.isFrozen && p.socketId !== rootAction.playerSocketId)
        .map(p => ({ socketId: p.socketId, username: p.username, avatar: p.avatar, uid: p.uid }));
        
    if (targets.length === 0) {
        io.to(rootAction.playerSocketId).emit('game_switch_select_target', {
            roomId,
            targets: []
        });
        console.log(`[Game] ${rootAction.username} dùng Switch nhưng không có đối thủ nào hợp lệ.`);
        game.phase = 'PLAYING';
        return;
    }

    game.phase = 'SWITCH_TARGET_SELECTION';
    game.switchState = {
        attackerSocketId: rootAction.playerSocketId,
        attackerUsername: rootAction.username,
        attackerUid: rootAction.playerUid,
        attackerIndex: game.players.findIndex(p => p.socketId === rootAction.playerSocketId)
    };
    
    io.to(rootAction.playerSocketId).emit('game_switch_select_target', {
        roomId,
        targets
    });
    
    console.log(`[Game] ${rootAction.username} dùng Switch, đang chọn mục tiêu để hoán đổi toàn bộ bài...`);
}

module.exports = { execute };
