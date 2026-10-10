function execute({ game, roomId, io, rootAction }) {
    if (game.performDraw) {
        const playerIndex = rootAction.playerIndex;
        if (playerIndex !== undefined && game.players[playerIndex]) {
            const player = game.players[playerIndex];
            console.log(`[Game] ${player.username} sử dụng Everywhere.`);
            // performDraw(game, player, roomId, isBottom, isRandom)
            game.performDraw(game, player, roomId, false, true); // false for isBottom, true for isRandom
        }
    } else {
        console.error('[Error] performDraw is not attached to the game object.');
    }
}

module.exports = { execute };
