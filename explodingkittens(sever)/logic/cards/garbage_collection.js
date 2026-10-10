const { clearTurnTimer, resetTurnTimer } = require('../game_core');

const NON_FUNCTIONAL_CAT_IDS = [
    'catermelon',
    'rainbowcat',
    'potatocat',
    'zombiecat',
    'tacocat',
    'golemcat',
    'cattea',
    'vampirecat'
];

function execute({ game, roomId, io, rootAction, allSocketIds }) {
    clearTurnTimer(game);

    const playerDiscardMap = {};
    let totalDiscarded = 0;

    game.players.forEach(p => {
        if (!p.alive || !Array.isArray(p.hand)) return;

        const removedCards = [];
        const keptCards = [];

        p.hand.forEach(card => {
            if (card && NON_FUNCTIONAL_CAT_IDS.includes(card.id)) {
                removedCards.push(card);
            } else {
                keptCards.push(card);
            }
        });

        p.hand = keptCards;

        // Xóa UID khỏi danh sách khóa bài (Locking) nếu lá bài đó bị dọn vào thùng rác
        if (p.lockedCards && Array.isArray(p.lockedCards.lockedCardUids)) {
            const removedUids = new Set(removedCards.map(c => c.uid));
            p.lockedCards.lockedCardUids = p.lockedCards.lockedCardUids.filter(uid => !removedUids.has(uid));
        }

        if (removedCards.length > 0) {
            // Các lá bài vô chức năng bị dọn vào thùng rác và biến mất hoàn toàn, KHÔNG đưa vào discardPile
            totalDiscarded += removedCards.length;
        }

        playerDiscardMap[p.socketId] = {
            username: p.username,
            uid: p.uid || '',
            cards: removedCards.map(c => ({ id: c.id, uid: c.uid, artIndex: c.artIndex || 1 })),
            count: removedCards.length,
            remainingCount: p.hand.length
        };
    });

    console.log(`[Game] ${rootAction.username} đã đánh lá DỌN RÁC (garbage_collection)! Đã dọn tổng cộng ${totalDiscarded} lá bài vô chức năng.`);

    // Broadcast sự kiện dọn rác cho tất cả người chơi trong phòng
    allSocketIds.forEach(sid => {
        io.to(sid).emit('game_garbage_collection_trigger', {
            roomId,
            playerSocketId: rootAction.playerSocketId,
            username: rootAction.username,
            discardData: playerDiscardMap,
            totalDiscarded,
            discardPileCount: game.discardPile.length
        });
    });

    // Sau khi hoạt ảnh kết thúc (~3.2s), tiếp tục lượt chơi bình thường
    setTimeout(() => {
        if (!game || game.phase === 'GAME_OVER') return;
        game.phase = 'PLAYING';
        resetTurnTimer(game, roomId, io);
    }, 3200);
}

module.exports = { execute, NON_FUNCTIONAL_CAT_IDS };