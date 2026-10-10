function execute({ game, roomId, io, rootAction, allSocketIds, shuffleArray }) {
    shuffleArray(game.drawPile);
    allSocketIds.forEach(sid => {
        io.to(sid).emit('game_deck_shuffled', { roomId });
    });
}

module.exports = { execute };
