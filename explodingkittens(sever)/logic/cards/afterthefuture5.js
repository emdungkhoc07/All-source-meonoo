const { clearTurnTimer } = require('../game_core');

function execute({ game, roomId, io, rootAction, allSocketIds }) {
    clearTurnTimer(game);
    const top5 = game.drawPile.slice(-5).reverse();
    const pIndex = game.players.findIndex(p => p.socketId === rootAction.playerSocketId);
    if (pIndex !== -1) {
        game.players[pIndex].alteringFutureTop3 = top5;
    }
    io.to(rootAction.playerSocketId).emit('game_alter_future', { top3: top5 });
    allSocketIds.forEach(sid => {
        io.to(sid).emit('game_turn_timer_paused', {
            roomId,
            message: `${rootAction.username} đang can thiệp tương lai...`
        });
        if (sid !== rootAction.playerSocketId) {
            io.to(sid).emit('game_see_future_others', { 
                playerSocketId: rootAction.playerSocketId, 
                username: rootAction.username, 
                uid: rootAction.playerUid || rootAction.uid || '',
                count: top5.length 
            });
        }
    });
}

module.exports = { execute };
