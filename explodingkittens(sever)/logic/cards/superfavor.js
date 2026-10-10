const { broadcastPlayersCardCounts } = require('../shared_utils');

function execute({ game, roomId, io, rootAction }) {
    const attacker = game.players.find(p => p.socketId === rootAction.playerSocketId && p.alive);
    if (!attacker) {
        game.phase = 'PLAYING';
        return;
    }

    // Lọc tất cả người chơi khác còn sống, không bị đóng băng, có ít nhất 1 lá bài không bị khóa
    const eligibleTargets = game.players.filter(p => {
        if (!p.alive || p.isFrozen || p.socketId === attacker.socketId || !Array.isArray(p.hand) || p.hand.length === 0) return false;
        const existingLockedUids = (p.lockedCards && Array.isArray(p.lockedCards.lockedCardUids)) ? p.lockedCards.lockedCardUids : [];
        const lockableHand = p.hand.filter(c => !existingLockedUids.includes(c.uid));
        return lockableHand.length > 0;
    });

    if (eligibleTargets.length === 0) {
        // Không có ai có bài hợp lệ để tặng -> Thông báo và kết thúc lượt Super Favor
        const allSocketIds = game.players.map(p => p.socketId);
        allSocketIds.forEach(sid => {
            io.to(sid).emit('game_toast', {
                title: 'SUPER FAVOR',
                message: `<span class="toast-username">${attacker.username}</span> dùng Super Favor nhưng không có ai có bài hợp lệ để xin!`,
                type: 'info',
                duration: 4000
            });
        });
        console.log(`[Game] ${attacker.username} dùng Super Favor nhưng không có ai có bài hợp lệ để xin.`);
        game.phase = 'PLAYING';
        return;
    }

    // KIỂM TRA PHẢN ĐÒN CONTRAST: Từng người chơi có Contrast sẽ tự động phản đòn và miễn nộp bài
    const { checkAndReflectContrast } = require('../../handlers/game_action');
    const targetsToRequest = [];
    eligibleTargets.forEach(target => {
        let isReflected = false;
        if (typeof checkAndReflectContrast === 'function') {
            const contrastRes = checkAndReflectContrast(game, attacker, target, 'superfavor', io, roomId);
            if (contrastRes.reflected) {
                isReflected = true;
                console.log(`[Super Favor] ${target.username} đã phản đòn bằng Contrast -> Miễn nộp bài cho ${attacker.username}!`);
            }
        }
        if (!isReflected) {
            targetsToRequest.push(target);
        }
    });

    if (targetsToRequest.length === 0) {
        // Tất cả mục tiêu đều đã phản đòn bằng Contrast
        const allSocketIds = game.players.map(p => p.socketId);
        allSocketIds.forEach(sid => {
            io.to(sid).emit('game_toast', {
                title: 'SUPER FAVOR',
                message: `Đòn Super Favor của <span class="toast-username">${attacker.username}</span> đã bị Đảo Nghịch (Contrast) chặn đứng hoàn toàn!`,
                type: 'warning',
                duration: 4500
            });
        });
        game.phase = 'PLAYING';
        const { startTurnTimer } = require('../game_core');
        startTurnTimer(game, roomId, io);
        return;
    }

    // Chuyển sang trạng thái SUPERFAVOR_CARD_SELECTION
    game.phase = 'SUPERFAVOR_CARD_SELECTION';
    
    game.superfavorState = {
        requesterSocketId: attacker.socketId,
        requesterUsername: attacker.username,
        requesterUid: attacker.uid || '',
        targets: targetsToRequest.map(p => ({
            socketId: p.socketId,
            uid: p.uid || '',
            username: p.username,
            hasGiven: false
        }))
    };

    console.log(`[Game] ${attacker.username} dùng Super Favor! Yêu cầu ${targetsToRequest.length} người chơi (${targetsToRequest.map(t => t.username).join(', ')}) mỗi người tặng 1 lá bài.`);

    // Dừng đồng hồ đếm ngược của người đánh Super Favor
    const { clearTurnTimer, startTurnTimer } = require('../game_core');
    clearTurnTimer(game);

    // Gửi yêu cầu tặng bài đến TẤT CẢ người chơi cần tặng (bật favorPickMode và viền đỏ favor-hand-glow)
    const targetSocketIds = targetsToRequest.map(p => p.socketId);
    targetsToRequest.forEach(target => {
        io.to(target.socketId).emit('game_favor_give_card_req', {
            roomId,
            requesterUsername: attacker.username,
            isSuperFavor: true
        });
    });

    // Gửi thông báo chờ cho người xin bài và các người xem / người bị loại trừ
    const allSocketIds = game.players.map(p => p.socketId);
    const totalCount = targetsToRequest.length;
    allSocketIds.forEach(sid => {
        if (!targetSocketIds.includes(sid)) {
            io.to(sid).emit('game_favor_waiting', {
                roomId,
                targetUsername: 'tất cả mọi người',
                requesterUsername: attacker.username,
                isSuperFavor: true,
                givenCount: 0,
                totalCount: totalCount,
                remainingCount: totalCount
            });
        }
        io.to(sid).emit('game_turn_timer_paused', {
            roomId,
            reason: 'SUPERFAVOR_WAITING',
            targetUsername: 'tất cả mọi người',
            requesterUsername: attacker.username
        });
    });

    // Anti-AFK Timer 20s: Nếu người chơi nào chưa tặng sau 20s, server tự động chọn 1 lá ngẫu nhiên không bị khóa để tặng
    if (game.superfavorTimeoutTimer) {
        clearTimeout(game.superfavorTimeoutTimer);
        game.superfavorTimeoutTimer = null;
    }

    game.superfavorTimeoutTimer = setTimeout(() => {
        game.superfavorTimeoutTimer = null;
        if (!game || game.phase !== 'SUPERFAVOR_CARD_SELECTION' || !game.superfavorState) return;

        const req = game.players.find(p => (p.socketId === game.superfavorState.requesterSocketId || (game.superfavorState.requesterUid && p.uid === game.superfavorState.requesterUid) || p.username === game.superfavorState.requesterUsername) && p.alive);
        if (!req) {
            game.phase = 'PLAYING';
            game.superfavorState = null;
            return;
        }

        const pendingTargets = (game.superfavorState.targets || []).filter(t => !t.hasGiven);

        pendingTargets.forEach(tEntry => {
            const t = game.players.find(p => (p.socketId === tEntry.socketId || (tEntry.uid && p.uid === tEntry.uid) || p.username === tEntry.username) && p.alive);
            if (!t || !t.hand || t.hand.length === 0) return;

            const lockedUids = (t.lockedCards && Array.isArray(t.lockedCards.lockedCardUids)) ? t.lockedCards.lockedCardUids : [];
            const unlockableCards = t.hand.filter(c => !lockedUids.includes(c.uid));
            const availableCards = unlockableCards.length > 0 ? unlockableCards : t.hand;
            const randomCard = availableCards[Math.floor(Math.random() * availableCards.length)];

            console.log(`[Anti-AFK Super Favor] ${t.username} hết thời gian, tự động tặng ${randomCard.id} cho ${req.username}`);

            const cardIndex = t.hand.findIndex(c => c.uid === randomCard.uid);
            if (cardIndex !== -1) {
                const givenCard = t.hand.splice(cardIndex, 1)[0];
                if (givenCard.id === 'chest') {
                    givenCard.chestPoints = 0;
                }
                tEntry.hasGiven = true;
                req.hand.push(givenCard);

                const currentAllSids = game.players.map(p => p.socketId);
                currentAllSids.forEach(sid => {
                    io.to(sid).emit('game_favor_completed', {
                        roomId,
                        giverSocketId: t.socketId,
                        giverUsername: t.username,
                        giverUid: t.uid || '',
                        receiverSocketId: req.socketId,
                        receiverUsername: req.username,
                        receiverUid: req.uid || '',
                        card: (sid === req.socketId || givenCard.id === 'exploding_kitten' || givenCard.id === 'atomicbom' || givenCard.id === 'streaking') ? givenCard : { id: 'card_back', uid: givenCard.uid },
                        giverCardCount: t.hand.length,
                        receiverCardCount: req.hand.length,
                        isSuperFavor: true
                    });
                });
            }
        });

        game.superfavorState = null;
        game.phase = 'PLAYING';
        broadcastPlayersCardCounts(io, game, roomId);
        startTurnTimer(game, roomId, io);
    }, 20000);
}

module.exports = { execute };