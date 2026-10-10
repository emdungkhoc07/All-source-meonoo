function execute({ game, roomId, io, advanceTurn }) {
    // Super Skip clears all remaining turns (sets to 1 so advanceTurn will decrement it to 0 and switch turns)
    game.turnsRemaining = 1;
    advanceTurn(game, roomId, io);
}

module.exports = { execute };
