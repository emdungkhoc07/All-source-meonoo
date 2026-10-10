function execute({ game, roomId, io, rootAction, allSocketIds }) {
    let swapped = false;
    if (game.drawPile && game.drawPile.length >= 2) {
        const topIndex = game.drawPile.length - 1;
        const bottomIndex = 0;
        const temp = game.drawPile[topIndex];
        game.drawPile[topIndex] = game.drawPile[bottomIndex];
        game.drawPile[bottomIndex] = temp;
        swapped = true;
        console.log(`[Game] ${rootAction.username} đã hoán đổi lá đỉnh (${game.drawPile[bottomIndex].id} -> đáy) và lá đáy (${game.drawPile[topIndex].id} -> đỉnh) của cọc bài rút!`);
    } else {
        console.log(`[Game] Cọc bài có ít hơn 2 lá (${game.drawPile ? game.drawPile.length : 0} lá), không thể hoán đổi.`);
    }

    allSocketIds.forEach(sid => {
        io.to(sid).emit('game_deck_swapped', {
            roomId,
            playerSocketId: rootAction.playerSocketId,
            username: rootAction.username,
            uid: rootAction.playerUid || rootAction.uid || '',
            swapped,
            drawPileCount: game.drawPile ? game.drawPile.length : 0
        });
    });
}

module.exports = { execute };