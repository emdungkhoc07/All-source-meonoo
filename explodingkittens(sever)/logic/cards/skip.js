function execute({ game, roomId, io, advanceTurn }) {
    advanceTurn(game, roomId, io);
}

module.exports = { execute };
