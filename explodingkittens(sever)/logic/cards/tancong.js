function execute({ game, roomId, io, allSocketIds }) {
    const attacker = game.players[game.currentTurnIndex];
    const step = game.turnDirection || 1;
    let nextIndex = (game.currentTurnIndex + step + game.players.length) % game.players.length;
    let safety = 0;
    // Bỏ qua người chơi đã nổ (chết), hoặc đang trong trạng thái Ngủ Đông (isFrozen), hoặc có cờ skipNextTurn
    while ((!game.players[nextIndex].alive || game.players[nextIndex].isFrozen || game.players[nextIndex].skipNextTurn) && safety < game.players.length) {
        nextIndex = (nextIndex + step + game.players.length) % game.players.length;
        safety++;
    }
    
    let target = game.players[nextIndex];

    // KIỂM TRA PHẢN ĐÒN (CONTRAST)
    const { checkAndReflectContrast } = require('../../handlers/game_action');
    if (typeof checkAndReflectContrast === 'function' && attacker && target) {
        const contrastRes = checkAndReflectContrast(game, attacker, target, 'tancong', io, roomId);
        if (contrastRes.reflected) {
            target = contrastRes.target; // Ban đầu là attacker
            nextIndex = game.players.findIndex(p => p.socketId === target.socketId);
        }
    }
    
    game.currentTurnIndex = nextIndex;
    // Chuyển hết lượt hiện tại cho người kế tiếp và +2 lượt
    game.turnsRemaining = game.turnsRemaining + 2;
    
    console.log(`[Game] Tấn công! Lượt tiếp theo: ${game.players[nextIndex].username}, Số lượt: ${game.turnsRemaining}`);
    
    const { broadcastTurnChanged } = require('../game_core');
    broadcastTurnChanged(game, roomId, io, nextIndex, game.turnsRemaining);
}

module.exports = { execute };
