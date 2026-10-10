function execute({ game, roomId, io, rootAction }) {
    if (game.performDraw) {
        const playerIndex = rootAction.playerIndex;
        if (playerIndex !== undefined && game.players[playerIndex]) {
            const player = game.players[playerIndex];
            console.log(`[Game] ${player.username} sử dụng Draw Bottom.`);
            game.performDraw(game, player, roomId, true); // true for isBottom
        }
    } else {
        console.error('[Error] performDraw is not attached to the game object.');
    }
}

module.exports = { execute };
