const { clearTurnTimer } = require("../game_core");

function execute({ game, roomId, io, rootAction, allSocketIds }) {
    const attacker = game.players.find(p => p.socketId === rootAction.playerSocketId && p.alive);
    if (!attacker) {
        game.phase = "PLAYING";
        return;
    }

    const eligibleTargets = game.players.filter(p => {
        return p.alive && !p.isFrozen && p.socketId !== attacker.socketId && Array.isArray(p.hand) && p.hand.length > 0;
    });

    if (eligibleTargets.length === 0) {
        allSocketIds.forEach(sid => {
            io.to(sid).emit("game_toast", {
                title: "NHÌN BÀI",
                message: `<span class="toast-username">${attacker.username}</span> dùng Nhìn Bài nhưng không có ai có bài trên tay!`,
                type: "info",
                duration: 4000
            });
        });
        console.log(`[Game] ${attacker.username} dùng seetheothers nhưng không có đối thủ nào có bài.`);
        game.phase = "PLAYING";
        return;
    }

    game.phase = "SEETHEOTHERS_TARGET_SELECTION";
    game.seetheothersState = {
        requesterSocketId: attacker.socketId,
        requesterUsername: attacker.username,
        requesterUid: attacker.uid || (rootAction.playerUid || rootAction.uid || "")
    };

    console.log(`[Game] ${attacker.username} dùng Nhìn Bài! Đang mở menu chọn mục tiêu...`);

    clearTurnTimer(game);

    const targets = eligibleTargets.map(p => ({
        socketId: p.socketId,
        uid: p.uid || "",
        username: p.username,
        avatar: p.avatar || "",
        cardCount: p.hand.length
    }));

    io.to(attacker.socketId).emit("game_seetheothers_select_target", {
        roomId,
        targets
    });

    allSocketIds.forEach(sid => {
        io.to(sid).emit("game_turn_timer_paused", {
            roomId,
            reason: "SEETHEOTHERS_SELECTION",
            message: `${attacker.username} đang chọn người chơi để nhìn bài...`
        });
    });
}

module.exports = { execute };

