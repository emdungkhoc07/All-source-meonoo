const fs = require('fs');
const path = require('path');
const { createCardObject } = require('../deck_logic');

function getChestRewardCount(points) {
    const pts = typeof points === 'number' ? points : 0;
    if (pts >= 20) return 6;
    if (pts >= 17) return 5;
    if (pts >= 14) return 4;
    if (pts >= 10) return 3;
    if (pts >= 7) return 2;
    if (pts >= 3) return 1;
    return 0;
}

const EXCLUDED_IDS = ['exploding_kitten', 'super_exploding_kitten', 'atomicbom', 'streaking', 'chest'];
const INTERNAL_COMBO_FILES = ['combo_2', 'combo_3', 'combo_5'];

// Quét toàn bộ danh sách tất cả các lá bài tồn tại trong game (tự động nhận diện bài mới thêm sau này)
function getAllGameCardIds() {
    const cardSet = new Set();

    // 1. Quét từ _CARD_IDS trong decks_rankmatch.json
    const candidateJsonPaths = [
        path.join(process.cwd(), 'decks_rankmatch.json'),
        path.join(process.cwd(), 'explodingkittens(sever)', 'decks_rankmatch.json'),
        path.join(__dirname, '../../decks_rankmatch.json')
    ];
    for (const p of candidateJsonPaths) {
        try {
            if (fs.existsSync(p)) {
                const data = JSON.parse(fs.readFileSync(p, 'utf8'));
                if (data && data._CARD_IDS) {
                    Object.keys(data._CARD_IDS).forEach(id => cardSet.add(id));
                }
            }
        } catch(e) {}
    }

    // 2. Quét thư mục cards ở Client (đảm bảo tự động nhận bất kỳ lá bài mới nào được tạo ở client)
    const candidateClientCardDirs = [
        path.join(process.cwd(), 'explodingkittens(clients)', 'cards'),
        path.join(process.cwd(), 'cards'),
        path.join(__dirname, '../../../explodingkittens(clients)/cards')
    ];
    for (const dir of candidateClientCardDirs) {
        try {
            if (fs.existsSync(dir)) {
                const subDirs = fs.readdirSync(dir, { withFileTypes: true });
                subDirs.forEach(dirent => {
                    if (dirent.isDirectory()) {
                        cardSet.add(dirent.name);
                    }
                });
            }
        } catch(e) {}
    }

    // 3. Quét thư mục logic/cards ở Server
    const candidateServerCardDirs = [
        path.join(process.cwd(), 'explodingkittens(sever)', 'logic', 'cards'),
        path.join(__dirname, '../cards'),
        path.join(__dirname, '.')
    ];
    for (const dir of candidateServerCardDirs) {
        try {
            if (fs.existsSync(dir)) {
                const files = fs.readdirSync(dir);
                files.forEach(file => {
                    if (file.endsWith('.js')) {
                        const cardId = file.replace('.js', '').trim();
                        if (cardId && !EXCLUDED_IDS.includes(cardId) && !INTERNAL_COMBO_FILES.includes(cardId)) {
                            cardSet.add(cardId);
                        }
                    }
                });
            }
        } catch(e) {}
    }

    // Lọc bỏ 4 lá loại trừ (exploding_kitten, atomicbom, streaking, chest) và các file xử lý combo nội bộ
    return Array.from(cardSet).filter(id => !EXCLUDED_IDS.includes(id) && !INTERNAL_COMBO_FILES.includes(id));
}

function execute({ game, roomId, io, rootAction, allSocketIds }) {
    const player = game.players.find(p => p.socketId === rootAction.playerSocketId && p.alive);
    if (!player) {
        game.phase = 'PLAYING';
        return;
    }

    const points = (rootAction.card && typeof rootAction.card.chestPoints === 'number') ? rootAction.card.chestPoints : 0;
    const rewardCount = getChestRewardCount(points);

    // Lấy toàn bộ danh sách tất cả các lá bài tồn tại trong game (loại trừ: exploding_kitten, atomicbom, streaking, chest)
    const pool = getAllGameCardIds();
    console.log(`[Chest] Mở Rương: Pool gồm ${pool.length} loại bài hợp lệ trong toàn bộ game:`, pool.join(', '));

    const rewardedCards = [];
    for (let i = 0; i < rewardCount; i++) {
        const randomId = pool[Math.floor(Math.random() * pool.length)];
        const cardObj = createCardObject(randomId);
        if (cardObj.id === 'chest') {
            cardObj.chestPoints = 0;
        }
        rewardedCards.push(cardObj);
        player.hand.push(cardObj);
    }

    console.log(`[Game] ${player.username} mở Rương (${points} điểm) -> Nhận ${rewardCount} lá:`, rewardedCards.map(c => c.id));

    allSocketIds.forEach(sid => {
        io.to(sid).emit('game_chest_reward_resolved', {
            roomId,
            playerSocketId: player.socketId,
            playerUid: player.uid || '',
            playerUsername: player.username,
            points: points,
            rewardCount: rewardCount,
            cards: rewardedCards
        });

        if (rewardCount > 0) {
            io.to(sid).emit('game_toast', {
                title: 'RƯƠNG THƯỞNG',
                message: `<span class="toast-username">${player.username}</span> mở Rương tích <b>${points} điểm</b> và nhận được <b>${rewardCount} lá bài thưởng</b>!`,
                type: 'success',
                duration: 4000
            });
        } else {
            io.to(sid).emit('game_toast', {
                title: 'RƯƠNG THƯỞNG',
                message: `<span class="toast-username">${player.username}</span> mở Rương (chỉ có <b>${points} điểm</b>) và không nhận được lá bài nào!`,
                type: 'warning',
                duration: 3500
            });
        }
    });

    const { getPlayersCardCounts } = require('../shared_utils');
    const counts = getPlayersCardCounts(game);
    allSocketIds.forEach(sid => {
        io.to(sid).emit('game_card_counts_update', { roomId, playersCardCounts: counts });
    });

    game.phase = 'PLAYING';
}

module.exports = { execute, getChestRewardCount };

