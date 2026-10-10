const { getPlayersCardCounts } = require('../shared_utils');

module.exports = {
    execute: function ({ game, roomId, io, rootAction, allSocketIds }) {
        const player = game.players[rootAction.playerIndex];
        if (!player) return;

        player.isFrozen = true;
        player.skipNextTurn = true;

        allSocketIds.forEach(sid => {
            io.to(sid).emit('game_toast', {
                title: 'NGỦ ĐÔNG',
                message: `<span class="toast-username">${player.username}</span> đã bước vào trạng thái Ngủ Đông (Bất tử & Bất động)!`,
                type: 'info',
                duration: 4000
            });
            io.to(sid).emit('game_freeze_activated', {
                roomId,
                playerSocketId: player.socketId,
                playerUid: player.uid || '',
                username: player.username
            });
        });

        // Tìm người kế tiếp còn sống và không bị ngủ đông theo chiều đi hiện tại
        const step = game.turnDirection || 1;
        let nextIndex = (game.currentTurnIndex + step + game.players.length) % game.players.length;
        let safety = 0;
        while ((!game.players[nextIndex].alive || game.players[nextIndex].isFrozen || game.players[nextIndex].skipNextTurn) && safety < game.players.length) {
            nextIndex = (nextIndex + step + game.players.length) % game.players.length;
            safety++;
        }

        // Chuyển giao toàn bộ số lượt hiện tại (nếu đang bị tấn công dồn lượt) cho người kế tiếp chịu
        const transferredTurns = Math.max(1, game.turnsRemaining);
        game.currentTurnIndex = nextIndex;
        game.turnsRemaining = transferredTurns;

        console.log(`[Game] Ngủ Đông kích hoạt! Lượt chuyển sang: ${game.players[nextIndex].username}, Số lượt chuyển giao: ${game.turnsRemaining}`);

        const { broadcastTurnChanged } = require('../game_core');
        broadcastTurnChanged(game, roomId, io, nextIndex, game.turnsRemaining);
    }
};
