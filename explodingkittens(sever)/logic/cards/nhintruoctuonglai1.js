const { clearTurnTimer } = require('../game_core');

function execute({ game, roomId, io, rootAction, allSocketIds }) {
    clearTurnTimer(game);
    const top1 = game.drawPile.slice(-1).reverse();
    const pIndex = game.players.findIndex(p => p.socketId === rootAction.playerSocketId);
    if (pIndex !== -1) {
        game.players[pIndex].seeingFutureTop3 = top1;
    }
    // Gửi sự kiện game_see_future về cho người chơi vừa đánh lá bài (chứa 1 lá)
    io.to(rootAction.playerSocketId).emit('game_see_future', { top3: top1 });
    
    // Broadcast cho các đối thủ khác biết
    allSocketIds.forEach(sid => {
        io.to(sid).emit('game_turn_timer_paused', {
            roomId,
            message: `${rootAction.username} đang nhìn trước tương lai...`
        });
        if (sid !== rootAction.playerSocketId) {
            io.to(sid).emit('game_see_future_others', { 
                playerSocketId: rootAction.playerSocketId, 
                username: rootAction.username, 
                uid: rootAction.playerUid || rootAction.uid || '',
                count: top1.length 
            });
        }
    });
}

module.exports = { execute };
