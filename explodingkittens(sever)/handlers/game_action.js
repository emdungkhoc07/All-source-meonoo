const { advanceTurn, checkGameOver, resolveCardStack, clearTurnTimer, startTurnTimer, resetTurnTimer, broadcastTurnChanged } = require('../logic/game_core');
const { getPlayersCardCounts, broadcastPlayersCardCounts } = require('../logic/shared_utils');


function findGamePlayer(players, socketId, uid, username) {
    if (!players) return null;
    // Ưu tiên 1 (Bắt buộc tuyệt đối): UID Firebase
    if (uid) {
        const found = players.find(p => p.uid === uid);
        if (found) return found;
    }
    // Ưu tiên 2: Username
    if (username) {
        const found = players.find(p => p.username === username);
        if (found) return found;
    }
    // Ưu tiên 3: SocketId
    if (socketId) {
        const found = players.find(p => p.socketId === socketId);
        if (found) return found;
    }
    return players.find(p => {
        if (uid && (p.socketId === uid || p.username === uid)) return true;
        if (username && (p.socketId === username || p.uid === username)) return true;
        if (socketId && (p.uid === socketId || p.username === socketId)) return true;
        return false;
    });
}

function findGamePlayerIndex(players, socketId, uid, username) {
    if (!players) return -1;
    // Ưu tiên 1 (Bắt buộc tuyệt đối): UID Firebase
    if (uid) {
        const idx = players.findIndex(p => p.uid === uid);
        if (idx !== -1) return idx;
    }
    // Ưu tiên 2: Username
    if (username) {
        const idx = players.findIndex(p => p.username === username);
        if (idx !== -1) return idx;
    }
    // Ưu tiên 3: SocketId
    if (socketId) {
        const idx = players.findIndex(p => p.socketId === socketId);
        if (idx !== -1) return idx;
    }
    return players.findIndex(p => {
        if (uid && (p.socketId === uid || p.username === uid)) return true;
        if (username && (p.socketId === username || p.uid === username)) return true;
        if (socketId && (p.uid === socketId || p.username === socketId)) return true;
        return false;
    });
}

// Khi 1 lá bài rời tay người chơi (bị cướp/tặng), xóa uid khỏi lockedCardUids nếu đang bị khóa
function removeCardFromLocking(player, cardUid, io, roomId, allSocketIds) {
    if (!player.lockedCards || !Array.isArray(player.lockedCards.lockedCardUids)) return;
    const idx = player.lockedCards.lockedCardUids.indexOf(cardUid);
    if (idx === -1) return;
    player.lockedCards.lockedCardUids.splice(idx, 1);
    // Nếu hết lá bị khóa thì xóa luôn trạng thái khóa
    if (player.lockedCards.lockedCardUids.length === 0) {
        player.lockedCards = null;
        if (allSocketIds) {
            allSocketIds.forEach(sid => {
                io.to(sid).emit('game_locking_expired', {
                    roomId,
                    victimSocketId: player.socketId,
                    victimUsername: player.username
                });
            });
        }
    } else {
        // Cập nhật client với danh sách khóa mới
        if (allSocketIds) {
            allSocketIds.forEach(sid => {
                io.to(sid).emit('game_locking_updated', {
                    roomId,
                    victimSocketId: player.socketId,
                    lockedCardUids: player.lockedCards.lockedCardUids
                });
            });
        }
    }
}

// Kiểm tra 1 lá bài (theo uid) của người chơi có đang bị Locking khóa hay không
function isCardLocked(player, cardUid) {
    return !!(player && player.lockedCards && Array.isArray(player.lockedCards.lockedCardUids) && player.lockedCards.lockedCardUids.includes(cardUid));
}

// Tìm index của lá bài theo id, NHƯNG bỏ qua các lá đang bị khóa (dùng để tự động đánh Defuse)
function findUnlockedCardIndex(player, cardId) {
    if (!player || !Array.isArray(player.hand)) return -1;
    return player.hand.findIndex(c => c.id === cardId && !isCardLocked(player, c.uid));
}

// Đếm số lá bài theo id, NHƯNG bỏ qua các lá đang bị khóa (dùng cho Streaking - giữ bom an toàn)
function countUnlockedCards(player, cardId) {
    if (!player || !Array.isArray(player.hand)) return 0;
    return player.hand.filter(c => c.id === cardId && !isCardLocked(player, c.uid)).length;
}

// Kiểm tra sau khi lượt đã chuyển: nếu người bị khóa đã bốc bài xong (readyToExpire) VÀ
// lượt hiện tại không còn là của họ nữa (đã sang người khác) thì mới thực sự giải phóng khóa.
function expireLocksIfTurnPassed(game, io, roomId) {
    if (!game || !Array.isArray(game.players)) return;
    const currentSocketId = game.players[game.currentTurnIndex]?.socketId;
    game.players.forEach(p => {
        if (p.lockedCards && p.lockedCards.readyToExpire && p.socketId !== currentSocketId) {
            console.log(`[Game] ${p.username} đã bốc bài xong và lượt đã chuyển sang người khác, giải phóng 3 lá bài bị khóa.`);
            p.lockedCards = null;
            const allSocketIds = game.players.map(pl => pl.socketId);
            allSocketIds.forEach(sid => {
                io.to(sid).emit('game_locking_expired', {
                    roomId,
                    victimSocketId: p.socketId,
                    victimUsername: p.username
                });
            });
        }
    });
}

function checkAndReflectContrast(game, attacker, target, attackType, io, roomId) {
    if (!target || !target.alive || !target.hand) return { reflected: false, target, attacker };

    let contrastCardIndex = target.hand.findIndex(c => c.id === 'contrast' && c.contrastOn === true);
    
    // Yêu cầu: Tự động phản đòn nếu trên tay chỉ còn 1 hoặc 2 lá, bất kể đang OFF (áp dụng cho tất cả đòn tấn công)
    if (contrastCardIndex === -1 && target.hand.length <= 2) {
        contrastCardIndex = target.hand.findIndex(c => c.id === 'contrast');
    }

    if (contrastCardIndex === -1) return { reflected: false, target, attacker };

    const contrastCard = target.hand.splice(contrastCardIndex, 1)[0];
    if (game.discardPile) {
        game.discardPile.push(contrastCard);
    }
    broadcastPlayersCardCounts(io, game, roomId);

    console.log(`[Game] CONTRAST REFLECTED! ${target.username} used CONTRAST against ${attacker.username}'s ${attackType}!`);

    const allSocketIds = game.players.map(p => p.socketId);
    allSocketIds.forEach(sid => {
        io.to(sid).emit('game_contrast_reflected', {
            roomId,
            attackerSocketId: attacker.socketId,
            attackerUsername: attacker.username,
            attackerUid: attacker.uid || '',
            victimSocketId: target.socketId,
            victimUsername: target.username,
            victimUid: target.uid || '',
            attackType,
            contrastCardUid: contrastCard.uid
        });
    });

    return { reflected: true, target: attacker, attacker: target };
}

function setupGameActionHandlers(socket, io, ROOMS, db, PLAYERS) {
    const processExplodingKitten = (game, player, bombCard, roomId) => {
        const room = ROOMS[roomId];
        game.phase = 'DEFUSING';
        // Nếu lá Defuse đang bị Locking khóa thì coi như KHÔNG có Defuse để dùng
        const defuseIndex = findUnlockedCardIndex(player, 'defuse');

        if (defuseIndex !== -1) {
            const defuseCard = player.hand.splice(defuseIndex, 1)[0];
            game.discardPile.push(defuseCard);
            broadcastPlayersCardCounts(io, game, roomId);
            game.defusingState = {
                playerSocketId: player.socketId,
                    uid: player.uid || '',
                    username: player.username,
                kittenCard: bombCard,
                defuseCard: defuseCard
            };
            console.log(`[Game] ${player.username} ĐÃ GỠ BOM!`);

            const allAlive = game.players.map(p => p.socketId);
            allAlive.forEach(sid => {
                io.to(sid).emit('game_defusing', {
                    roomId,
                    playerSocketId: player.socketId,
                    playerUid: player.uid || '',
                    username: player.username,
                    kittenCard: bombCard,
                    defuseCard: defuseCard,
                    drawPileCount: game.drawPile.length
                });
            });

            io.to(player.socketId).emit('game_defuse_prompt', {
                roomId,
                kittenCard: bombCard,
                maxIndex: game.drawPile.length
            });

            const otherPlayers = game.players.filter(p => p.socketId !== player.socketId);
            otherPlayers.forEach(p => {
                io.to(p.socketId).emit('game_defuse_wait', {
                    roomId,
                    username: player.username,
                    immediate: false
                });
            });
        } else {
            console.log(`[Game] ${player.username} BỊ NỔ!`);
            player.alive = false;
            game.discardPile.push(bombCard);
            broadcastPlayersCardCounts(io, game, roomId);

            if (!game.eliminationOrder) game.eliminationOrder = [];
            game.eliminationOrder.push({
                socketId: player.socketId,
                uid: player.uid || '',
                username: player.username,
                avatar: player.avatar || ''
            });

            const allSocketIds = game.players.map(p => p.socketId);
            allSocketIds.forEach(sid => {
                io.to(sid).emit('game_player_exploded', {
                    roomId,
                    playerSocketId: player.socketId,
                    uid: player.uid || '',
                    username: player.username,
                    bombCard: bombCard
                });
            });

            // Tín hiệu độc lập phát ra sảnh cho Discord Bridge (0 ảnh hưởng tới UI/logic client)
            io.emit('discord_player_exploded', {
                roomId,
                username: player.username,
                bombCard: bombCard
            });

            if (!checkGameOver(game, roomId, io, ROOMS, db, PLAYERS)) {
                game.phase = 'PLAYING';
                const currentPlayerSocketId = game.players[game.currentTurnIndex]?.socketId;
                if (player.socketId === currentPlayerSocketId) {
                    game.turnsRemaining = 1; 
                    advanceTurn(game, roomId, io);
                    expireLocksIfTurnPassed(game, io, roomId);
                }
            }
        }
    };

    const processSuperExplodingKitten = (game, player, bombCard, roomId) => {
        const room = ROOMS[roomId];
        const allSocketIds = game.players.map(p => p.socketId);
        
        // Kiểm tra xem người chơi có lá Defuse (không bị khóa) trên tay không
        const defuseIndex = findUnlockedCardIndex(player, 'defuse');
        let defuseCard = null;
        if (defuseIndex !== -1) {
            defuseCard = player.hand.splice(defuseIndex, 1)[0];
            game.discardPile.push(defuseCard);
            console.log(`[Game] ${player.username} có Defuse nhưng gặp Siêu Mèo Nổ -> Defuse bị thiêu cháy và ${player.username} vẫn phát nổ!`);
        } else {
            console.log(`[Game] ${player.username} không có Defuse và bị Siêu Mèo Nổ nổ chết!`);
        }

        player.alive = false;
        game.discardPile.push(bombCard);
        broadcastPlayersCardCounts(io, game, roomId);

        if (!game.eliminationOrder) game.eliminationOrder = [];
        game.eliminationOrder.push({
            socketId: player.socketId,
            uid: player.uid || '',
            username: player.username,
            avatar: player.avatar || ''
        });

        if (defuseCard) {
            // Trường hợp có Defuse: phát game_super_exploding_drawn để chạy hiệu ứng Defuse bay ra bàn rồi bị đốt cháy thành tro
            allSocketIds.forEach(sid => {
                io.to(sid).emit('game_super_exploding_drawn', {
                    roomId,
                    playerSocketId: player.socketId,
                    uid: player.uid || '',
                    username: player.username,
                    bombCard: bombCard,
                    defuseCard: defuseCard,
                    hasDefuse: true,
                    drawPileCount: game.drawPile.length
                });
            });
        } else {
            // Trường hợp không có Defuse: phát nổ bình thường
            allSocketIds.forEach(sid => {
                io.to(sid).emit('game_player_exploded', {
                    roomId,
                    playerSocketId: player.socketId,
                    uid: player.uid || '',
                    username: player.username,
                    bombCard: bombCard
                });
            });
        }

        // Tín hiệu độc lập phát ra sảnh cho Discord Bridge (0 ảnh hưởng tới UI/logic client)
        io.emit('discord_player_exploded', {
            roomId,
            username: player.username,
            bombCard: bombCard
        });

        if (!checkGameOver(game, roomId, io, ROOMS, db, PLAYERS)) {
            game.phase = 'PLAYING';
            const currentPlayerSocketId = game.players[game.currentTurnIndex]?.socketId;
            if (player.socketId === currentPlayerSocketId) {
                game.turnsRemaining = 1;
                advanceTurn(game, roomId, io);
                expireLocksIfTurnPassed(game, io, roomId);
            }
        }
    };
    
    const processAtomicBom = (game, player, bombCard, roomId) => {
        const room = ROOMS[roomId];
        const numPlayers = game.players.length;
        const playerIndex = game.players.findIndex(p => p.socketId === player.socketId);
        
        let affectedIndices = [playerIndex];
        
        // Find left alive player
        for (let i = 1; i < numPlayers; i++) {
            let leftIdx = (playerIndex - i + numPlayers) % numPlayers;
            if (game.players[leftIdx].alive) {
                if (!affectedIndices.includes(leftIdx)) affectedIndices.push(leftIdx);
                break;
            }
        }
        
        // Find right alive player
        for (let i = 1; i < numPlayers; i++) {
            let rightIdx = (playerIndex + i) % numPlayers;
            if (game.players[rightIdx].alive) {
                if (!affectedIndices.includes(rightIdx)) affectedIndices.push(rightIdx);
                break;
            }
        }
        
        const allSocketIds = game.players.map(p => p.socketId);
        const affectedDetails = [];
        
        affectedIndices.forEach(idx => {
            const p = game.players[idx];
            // Nếu lá Defuse đang bị Locking khóa thì coi như KHÔNG có Defuse để dùng
            if (p.isFrozen) {
                console.log(`[Game] ${p.username} bị Atomic Bomb nổ chết khi đang Ngủ Đông (bài bị bất động)!`);
                p.alive = false;
                if (!game.eliminationOrder) game.eliminationOrder = [];
                game.eliminationOrder.push({
                    socketId: p.socketId,
                    uid: p.uid || '',
                    username: p.username,
                    avatar: p.avatar || ''
                });
                p.hand.forEach(c => game.discardPile.push(c));
                p.hand = [];
                affectedDetails.push({ socketId: p.socketId, username: p.username, defused: false });
                return;
            }
            const defuseIndex = findUnlockedCardIndex(p, 'defuse');
            if (defuseIndex !== -1) {
                const defuseCard = p.hand.splice(defuseIndex, 1)[0];
                game.discardPile.push(defuseCard);
                console.log(`[Game] ${p.username} ĐÃ GỠ BOM ATOMIC!`);
                affectedDetails.push({
                    socketId: p.socketId,
                    uid: p.uid || '',
                    username: p.username,
                    defused: true,
                    defuseCard: defuseCard
                });
            } else {
                console.log(`[Game] ${p.username} BỊ NỔ BỞI ATOMIC!`);
                p.alive = false;
                if (!game.eliminationOrder) game.eliminationOrder = [];
                game.eliminationOrder.push({
                    socketId: p.socketId,
                    uid: p.uid || '',
                    username: p.username,
                    avatar: p.avatar || ''
                });
                
                // Drop hand
                p.hand.forEach(c => game.discardPile.push(c));
                p.hand = [];

                affectedDetails.push({
                    socketId: p.socketId,
                    uid: p.uid || '',
                    username: p.username,
                    defused: false
                });
            }
        });

        game.discardPile.push(bombCard);
        broadcastPlayersCardCounts(io, game, roomId);

        // Nếu lá AtomicBom nổ tiêu diệt toàn bộ người chơi còn sống (không còn ai sống)
        const remainingAlive = game.players.filter(p => p.alive);
        if (remainingAlive.length === 0) {
            // Người bốc lá atomicbom (người ở giữa) sống sót và trở thành người chiến thắng!
            console.log(`[Game] AtomicBom nổ chết tất cả người chơi! Người bốc bom ở giữa (${player.username}) chiến thắng!`);
            player.alive = true;
            if (game.eliminationOrder) {
                game.eliminationOrder = game.eliminationOrder.filter(p => p.socketId !== player.socketId);
            }
            const drawerDetail = affectedDetails.find(d => d.socketId === player.socketId);
            if (drawerDetail) {
                drawerDetail.survivedWinner = true;
            }
        }

        // Phát 1 sự kiện duy nhất game_atomic_bom_drawn cho tất cả người chơi
        allSocketIds.forEach(sid => {
            io.to(sid).emit('game_atomic_bom_drawn', {
                roomId,
                drawerSocketId: player.socketId,
                drawerUsername: player.username,
                drawerUid: player.uid || '',
                bombCard: bombCard,
                affectedPlayers: affectedDetails,
                drawPileCount: game.drawPile.length
            });
        });

        // Tín hiệu độc lập phát ra sảnh cho Discord Bridge (0 ảnh hưởng tới UI/logic client)
        if (Array.isArray(affectedDetails)) {
            affectedDetails.filter(d => !d.defused && !d.survivedWinner).forEach(deadPlayer => {
                io.emit('discord_player_exploded', {
                    roomId,
                    username: deadPlayer.username,
                    bombCard: bombCard
                });
            });
        }

        if (!checkGameOver(game, roomId, io, ROOMS, db, PLAYERS)) {
            game.phase = 'PLAYING';
            const currentPlayerSocketId = game.players[game.currentTurnIndex]?.socketId;
            if (player.socketId === currentPlayerSocketId) {
                game.turnsRemaining = 1; 
                advanceTurn(game, roomId, io);
                expireLocksIfTurnPassed(game, io, roomId);
            }
        }
    };


    const handlePostStealBombCheck = (game, victim, thief, stolenCard, roomId) => {
        if (stolenCard.id === 'super_exploding_kitten') {
            console.log(`[Game] ${thief.username} cướp phải SIÊU MÈO NỔ (super_exploding_kitten) - Vô phương cứu chữa!`);
            processSuperExplodingKitten(game, thief, stolenCard, roomId);
            return true;
        }

        if (stolenCard.id === 'exploding_kitten' || stolenCard.id === 'atomicbom') {
            // Nạn nhân mất Streaking (vì họ vừa bị cướp mất bom mà trước đó họ cầm được là nhờ có streaking)
            // Nếu lá Streaking đang bị khóa thì bỏ qua, không tính/không vứt (vì nó không hề phát huy tác dụng)
            const victimStreakingIndex = findUnlockedCardIndex(victim, 'streaking');
            if (victimStreakingIndex !== -1) {
                const discardedStreaking = victim.hand.splice(victimStreakingIndex, 1)[0];
                game.discardPile.push(discardedStreaking);
                console.log(`[Game] ${victim.username} bị cướp bom, 1 lá Streaking tự động vứt xuống bàn.`);
                // Thông báo vứt lá streaking cho tất cả người chơi
                game.players.forEach(p => {
                    io.to(p.socketId).emit('game_card_discarded', {
                        roomId,
                        card: discardedStreaking,
                        playerSocketId: victim.socketId,
                        playerUid: victim.uid || '',
                        username: victim.username
                    });
                });
            }

            // Lá Streaking đang bị khóa thì KHÔNG được tính vào số lượng giúp giữ bom an toàn
            const thiefStreakingCount = countUnlockedCards(thief, 'streaking');
            const thiefBombCount = thief.hand.filter(c => c.id === 'exploding_kitten' || c.id === 'atomicbom').length;
            
            if (thiefBombCount < thiefStreakingCount) {
                thief.hand.push(stolenCard);
                console.log(`[Game] ${thief.username} cướp được bom nhưng an toàn nhờ có đủ Streaking.`);
            } else {
                console.log(`[Game] ${thief.username} cướp phải Mèo Nổ và bị phát nổ!`);
                if (stolenCard.id === 'atomicbom') processAtomicBom(game, thief, stolenCard, roomId);
                else processExplodingKitten(game, thief, stolenCard, roomId);
                return true; // Return true means someone exploded
            }
        }
        
        // Nếu lá bài bị cướp là Streaking Kitten
        else if (stolenCard.id === 'streaking') {
            thief.hand.push(stolenCard);
            
            // Kiểm tra nạn nhân có đang ôm dư bom không (Streaking đang bị khóa thì không được tính)
            const victimStreakingCount = countUnlockedCards(victim, 'streaking');
            const victimBombCount = victim.hand.filter(c => c.id === 'exploding_kitten' || c.id === 'atomicbom').length;
            
            if (victimBombCount > victimStreakingCount) {
                const victimBombIndex = victim.hand.findIndex(c => c.id === 'exploding_kitten' || c.id === 'atomicbom');
                const victimBombCard = victim.hand.splice(victimBombIndex, 1)[0];
                console.log(`[Game] ${victim.username} bị cướp Streaking Kitten, không đủ Streaking giữ bom nên phát nổ!`);
                if (victimBombCard.id === 'atomicbom') processAtomicBom(game, victim, victimBombCard, roomId);
                else processExplodingKitten(game, victim, victimBombCard, roomId);
                return true;
            }
        } else {
            thief.hand.push(stolenCard);
        }
        
        broadcastPlayersCardCounts(io, game, roomId);
        return false;
    };

    socket.on('ceremony_complete', ({ roomId }) => {
        const room = ROOMS[roomId];
        if (!room || !room.game) return;
        if (room.game.phase === 'CEREMONY') {
            room.game.phase = 'PLAYING';
            console.log(`[Game] Ceremony hoàn tất, ván đấu chính thức bắt đầu tại phòng ${room.name}`);
            if (!room.game.performDraw) room.game.performDraw = performDraw;
            startTurnTimer(room.game, roomId, io);
        }
    });

    socket.on('game_play_card', (data) => {
        const { roomId, cardUid } = data;
        const room = ROOMS[roomId];
        if (!room || !room.game) return;

        const game = room.game;
        if (game.phase === 'CEREMONY' || game.phase === 'GAME_OVER' || game.phase === 'DEFUSING') return;
        if (!game.performDraw) game.performDraw = performDraw;

        const playerIndex = game.players.findIndex(p => p.socketId === socket.id);
        if (playerIndex === -1 || !game.players[playerIndex].alive) return;

        const player = game.players[playerIndex];
        const cardIndex = player.hand.findIndex(c => c.uid === cardUid);
        if (cardIndex === -1) return;
        const cardToPlay = player.hand[cardIndex];

        if (cardToPlay.id === 'defuse' || cardToPlay.id === 'exploding_kitten' || cardToPlay.id === 'super_exploding_kitten' || cardToPlay.id === 'streaking' || cardToPlay.id === 'atomicbom') {
            socket.emit('error_msg', 'Bạn không thể chủ động đánh lá bài này xuống bàn!');
            return;
        }

        if (player.lockedCards && Array.isArray(player.lockedCards.lockedCardUids) && player.lockedCards.lockedCardUids.includes(cardToPlay.uid)) {
            socket.emit('error_msg', 'Lá bài này đang bị KHÓA, bạn không thể đánh xuống!');
            return;
        }

        if (cardToPlay.id === 'clone') {
            let clonedId = null;
            const nonCloneable = ['defuse', 'exploding_kitten', 'super_exploding_kitten', 'atomicbom', 'streaking', 'tacocat', 'zombiecat', 'rainbowcat', 'catermelon', 'potatocat', 'whatcat', 'contrast', 'golemcat', 'cattea', 'vampirecat'];
            if (game.discardPile && game.discardPile.length > 0) {
                for (let i = game.discardPile.length - 1; i >= 0; i--) {
                    const c = game.discardPile[i];
                    // Nếu lá bài ở chồng bài bỏ là clone thì lấy clonedId chức năng của nó
                    const effectiveTopId = (c.id === 'clone' && c.clonedId) ? c.clonedId : c.id;
                    if (effectiveTopId && effectiveTopId !== 'clone' && !nonCloneable.includes(effectiveTopId) && !effectiveTopId.startsWith('combo_')) {
                        clonedId = effectiveTopId;
                        break;
                    }
                }
            }
            if (!clonedId) {
                socket.emit('error_msg', 'Chưa có lá bài chức năng hợp lệ nào trên chồng bài đã đánh để Clone!');
                return;
            }
            cardToPlay.clonedId = clonedId;
        }

        if (!game.pendingCardStack) game.pendingCardStack = [];

        const effectiveId = cardToPlay.clonedId || cardToPlay.id;

        if (effectiveId === 'nope' || effectiveId === 'supernope') {
            if (game.pendingCardStack.length === 0) {
                socket.emit('error_msg', 'Chỉ có thể đánh Nope / Super Nope để chặn một lá bài khác đang chờ hiệu ứng!');
                return;
            }
            const lastPendingItem = game.pendingCardStack[game.pendingCardStack.length - 1];
            if (lastPendingItem) {
                const lastEffectiveId = lastPendingItem.card.clonedId || lastPendingItem.card.id;
                if (lastEffectiveId === 'supernope') {
                    socket.emit('error_msg', 'Không thể dùng Nope hoặc Super Nope đè lên Super Nope!');
                    return;
                }
                if (lastPendingItem.playerSocketId === socket.id) {
                    socket.emit('error_msg', 'Bạn không thể đánh Nope / Super Nope để tự hủy lá bài hoặc combo của chính mình!');
                    return;
                }
            }
        } else {
            if (playerIndex !== game.currentTurnIndex) return;
            if (game.pendingCardStack.length > 0) {
                socket.emit('error_msg', 'Đang có bài chờ xử lý, không thể đánh lá bài thường lúc này!');
                return;
            }
        }

        const isSuperNope = (effectiveId === 'supernope');
        const card = player.hand.splice(cardIndex, 1)[0];
        
        game.pendingCardStack.push({
            playerSocketId: socket.id,
            playerIndex: playerIndex,
            playerUid: player.uid || '',
            username: player.username,
            card: card
        });

        console.log(`[Game] ${player.username} đưa lá ${card.id} vào hàng chờ. (WaitNope = ${isSuperNope ? 0 : room.waitNope}s)`);
        broadcastPlayersCardCounts(io, room, roomId);
        resetTurnTimer(game, roomId, io);

        const allSocketIds = game.players.map(p => p.socketId);
        allSocketIds.forEach(sid => {
            io.to(sid).emit('game_card_played_pending', {
                roomId,
                playerSocketId: socket.id,
                playerUid: player.uid || '',
                playerUsername: player.username,
                playerIndex,
                card: card,
                playerCardCount: player.hand.length,
                stackLength: game.pendingCardStack.length,
                waitNopeTime: isSuperNope ? 0 : room.waitNope
            });
        });

        if (game.nopeTimer) clearTimeout(game.nopeTimer);
        
        if (isSuperNope) {
            // Super Nope không có thời gian chờ Nope đè lên (waitNope = 0), nhưng cần 600ms để hoạt ảnh bài bay từ tay ra mặt bàn (0.5s) hoàn tất trước khi chốt stack!
            game.nopeTimer = setTimeout(() => {
                resolveCardStack(game, roomId, io);
            }, 600);
        } else if (room.waitNope > 0) {
            game.nopeTimer = setTimeout(() => {
                resolveCardStack(game, roomId, io);
            }, room.waitNope * 1000);
        } else {
            game.nopeTimer = setTimeout(() => {
                resolveCardStack(game, roomId, io);
            }, 600);
        }
    });
    socket.on('game_play_combo', ({ roomId, cardUids, comboType }) => {
        const room = ROOMS[roomId];
        if (!room || !room.game || room.game.phase !== 'PLAYING') return;
        const game = room.game;
        const playerIndex = game.players.findIndex(p => p.socketId === socket.id);
        if (playerIndex === -1 || !game.players[playerIndex].alive) return;
        if (playerIndex !== game.currentTurnIndex) return; // Must be their turn
        
        const player = game.players[playerIndex];
        
        // Find cards
        const cardsToPlay = [];
        const cardIndices = [];
        for (const uid of cardUids) {
            const idx = player.hand.findIndex(c => c.uid === uid);
            if (idx === -1) return; // Missing card
            cardsToPlay.push(player.hand[idx]);
            cardIndices.push(idx);
        }
        
        // Validate cards
        const validVanilla = ['catermelon', 'rainbowcat', 'potatocat', 'zombiecat', 'tacocat', 'golemcat', 'cattea', 'vampirecat'];
        const validWithWhatCat = [...validVanilla, 'whatcat'];
        let baseId = 'vanilla_mixed';
        
        if (comboType === 5) {
            if (cardsToPlay.length !== 5) return;
            const ids = cardsToPlay.map(c => c.id);
            const isAllValid = ids.every(id => validWithWhatCat.includes(id));
            if (!isAllValid) return;
            
            const uniqueVanillaIds = new Set(ids.filter(id => id !== 'whatcat'));
            const whatCatCount = ids.filter(id => id === 'whatcat').length;
            
            if (uniqueVanillaIds.size + whatCatCount < 5) return;
            baseId = 'vanilla_mixed';
        } else {
            if (cardsToPlay.length !== comboType) return;
            const ids = cardsToPlay.map(c => c.id);
            const isAllValid = ids.every(id => validWithWhatCat.includes(id));
            if (!isAllValid) return;
            
            // Tìm baseId (lá bài không phải whatcat). Nếu toàn whatcat thì baseId = whatcat
            baseId = ids.find(id => id !== 'whatcat') || 'whatcat';
            if (baseId !== 'whatcat' && !validVanilla.includes(baseId)) return;
            
            // Đảm bảo các lá bài đều là baseId hoặc whatcat
            const isMatchingBase = ids.every(id => id === baseId || id === 'whatcat');
            if (!isMatchingBase) return;
        }
        
        if (player.lockedCards && Array.isArray(player.lockedCards.lockedCardUids)) {
            const isAnyLocked = cardUids.some(uid => player.lockedCards.lockedCardUids.includes(uid));
            if (isAnyLocked) {
                socket.emit('error_msg', 'Có lá bài trong bộ Combo đang bị KHÓA, bạn không thể đánh xuống!');
                return;
            }
        }

        if (!game.pendingCardStack) game.pendingCardStack = [];
        if (game.pendingCardStack.length > 0) return; // Cannot play combo if stack not empty
        
        // Remove cards from hand (sort indices descending to safely splice)
        cardIndices.sort((a,b) => b - a);
        const removedCards = [];
        cardIndices.forEach(idx => {
            removedCards.push(player.hand.splice(idx, 1)[0]);
        });
        
        // Push virtual card to stack
        const virtualCard = {
            id: `combo_${comboType}`,
            baseId: baseId,
            name: `Combo ${comboType} lá ${baseId}`,
            originalCards: removedCards
        };
        
        game.pendingCardStack.push({
            playerSocketId: socket.id,
            playerIndex: playerIndex,
            playerUid: player.uid || '',
            username: player.username,
            card: virtualCard
        });

        console.log(`[Game] ${player.username} đánh Combo ${comboType} lá. (WaitNope = ${room.waitNope}s)`);
        broadcastPlayersCardCounts(io, room, roomId);
        resetTurnTimer(game, roomId, io);
        
        const allSocketIds = game.players.map(p => p.socketId);
        allSocketIds.forEach(sid => {
            io.to(sid).emit('game_card_played_pending', {
                roomId,
                playerSocketId: socket.id,
                playerUid: player.uid || '',
                playerUsername: player.username,
                playerIndex,
                card: virtualCard,
                playerCardCount: player.hand.length,
                stackLength: game.pendingCardStack.length,
                waitNopeTime: room.waitNope
            });
        });
        
        if (game.nopeTimer) clearTimeout(game.nopeTimer);
        const timeoutMs = room.waitNope > 0 ? room.waitNope * 1000 : 600;
        game.nopeTimer = setTimeout(() => {
            resolveCardStack(game, roomId, io);
        }, timeoutMs);
    });

    socket.on('game_locking_pick_target', (data) => {
        if (!data || !data.roomId || !data.targetSocketId) return;
        const room = ROOMS[data.roomId];
        if (!room || !room.game) return;
        const game = room.game;
        
        if (game.phase !== 'LOCKING_TARGET_SELECTION') return;
        if (!game.lockingState || game.lockingState.attackerSocketId !== socket.id) return;
        
        const initialAttacker = game.players.find(p => p.socketId === socket.id);
        let target = game.players.find(p => p.socketId === data.targetSocketId && p.alive);
        let attacker = initialAttacker;
        
        if (!target || target.hand.length === 0) {
            io.to(socket.id).emit('error_msg', 'Người chơi này không hợp lệ hoặc không có bài trên tay!');
            game.phase = 'PLAYING';
            game.lockingState = null;
            return;
        }

        // KIỂM TRA PHẢN ĐÒN (CONTRAST)
        const contrastRes = checkAndReflectContrast(game, attacker, target, 'locking', io, data.roomId);
        if (contrastRes.reflected) {
            target = contrastRes.target;
            attacker = contrastRes.attacker;

            if (target.hand.length === 0) {
                const allSocketIds = game.players.map(p => p.socketId);
                allSocketIds.forEach(sid => {
                    io.to(sid).emit('game_toast', {
                        title: 'ĐẢO NGHỊCH',
                        message: `<span class="toast-username">${target.username}</span> không có bài để khóa! Đòn Khóa bài bị vô hiệu hóa!`,
                        type: 'info',
                        duration: 4500
                    });
                });
                game.phase = 'PLAYING';
                game.lockingState = null;
                return;
            }
        }

        // Các lá ĐANG bị khóa sẵn (nếu có) - không được chọn lại, không được đè lên
        const existingLockedUids = (target.lockedCards && Array.isArray(target.lockedCards.lockedCardUids))
            ? target.lockedCards.lockedCardUids
            : [];

        // Chỉ được chọn ngẫu nhiên trong số các lá CHƯA bị khóa
        const lockableHand = target.hand.filter(c => !existingLockedUids.includes(c.uid));

        if (lockableHand.length === 0) {
            io.to(socket.id).emit('error_msg', 'Toàn bộ bài của người chơi này đã bị khóa, không thể khóa thêm!');
            game.phase = 'PLAYING';
            game.lockingState = null;
            return;
        }
        
        game.phase = 'PLAYING';
        
        const handCopy = [...lockableHand];
        const newLockedUids = [];
        const countToLock = Math.min((game.lockingState && game.lockingState.countToLock) ? game.lockingState.countToLock : 3, handCopy.length);
        
        for (let i = 0; i < countToLock; i++) {
            const randomIndex = Math.floor(Math.random() * handCopy.length);
            const pickedCard = handCopy.splice(randomIndex, 1)[0];
            newLockedUids.push(pickedCard.uid);
        }

        const mergedLockedUids = [...existingLockedUids, ...newLockedUids];
        
        target.lockedCards = {
            attackerSocketId: attacker.socketId,
            attackerUsername: attacker.username,
            lockedCardUids: mergedLockedUids,
            readyToExpire: false
        };
        
        const attackerUsername = attacker.username;
        const victimUsername = target.username;
        const victimSocketId = target.socketId;
        
        console.log(`[Game] ${attackerUsername} dùng Locking khóa thêm ${newLockedUids.length} lá bài của ${victimUsername} (tổng đang khóa: ${mergedLockedUids.length}):`, newLockedUids);
        
        const allSocketIds = game.players.map(p => p.socketId);
        allSocketIds.forEach(sid => {
            io.to(sid).emit('game_locking_applied', {
                roomId: data.roomId,
                attackerSocketId: attacker.socketId,
                attackerUsername,
                attackerUid: attacker.uid || '',
                victimSocketId,
                victimUsername,
                victimUid: target.uid || '',
                lockedCardUids: mergedLockedUids,
                newlyLockedCardUids: newLockedUids
            });
        });
        
        game.lockingState = null;
        resetTurnTimer(game, data.roomId, io);
    });

    socket.on('game_switch_pick_target', (data) => {
        if (!data || !data.roomId || !data.targetSocketId) return;
        const room = ROOMS[data.roomId];
        if (!room || !room.game) return;
        const game = room.game;
        
        if (game.phase !== 'SWITCH_TARGET_SELECTION') return;
        if (!game.switchState || game.switchState.attackerSocketId !== socket.id) return;
        
        const attacker = game.players.find(p => p.socketId === socket.id);
        const target = game.players.find(p => p.socketId === data.targetSocketId && p.alive);
        
        if (!attacker || !target || attacker.socketId === target.socketId) {
            game.phase = 'PLAYING';
            game.switchState = null;
            return;
        }

        // KIỂM TRA PHẢN ĐÒN (CONTRAST): B phản đòn Switch lại A -> B bị tiêu tốn lá Contrast nhưng cả 2 vẫn hoán đổi bài cho nhau!
        const contrastRes = checkAndReflectContrast(game, attacker, target, 'switch', io, data.roomId);
        const wasReflected = contrastRes.reflected;

        game.phase = 'PLAYING';
        game.switchState = null;

        const attackerOldHand = [...attacker.hand];
        const targetOldHand = [...target.hand];

        // Hoán đổi toàn bộ bài trên tay 2 người
        attacker.hand = targetOldHand;
        target.hand = attackerOldHand;

        // Reset điểm lá Rương thưởng khi bị hoán đổi
        attacker.hand.forEach(c => { if (c.id === 'chest') c.chestPoints = 0; });
        target.hand.forEach(c => { if (c.id === 'chest') c.chestPoints = 0; });

        const allSocketIds = game.players.map(p => p.socketId);

        // Giải phóng trạng thái khóa bài nếu có
        if (attacker.lockedCards) {
            attacker.lockedCards = null;
            allSocketIds.forEach(sid => io.to(sid).emit('game_locking_expired', { victimSocketId: attacker.socketId, victimUsername: attacker.username }));
        }
        if (target.lockedCards) {
            target.lockedCards = null;
            allSocketIds.forEach(sid => io.to(sid).emit('game_locking_expired', { victimSocketId: target.socketId, victimUsername: target.username }));
        }

        console.log(`[Game] Switch: ${attacker.username} (cũ: ${attackerOldHand.length} lá) đã hoán đổi toàn bộ bài với ${target.username} (cũ: ${targetOldHand.length} lá) ${wasReflected ? '(Bị phản đòn nhưng vẫn hoán đổi!)' : ''}`);

        allSocketIds.forEach(sid => {
            const isAttacker = (sid === attacker.socketId);
            const isTarget = (sid === target.socketId);

            io.to(sid).emit('game_switch_completed', {
                roomId: data.roomId,
                attackerSocketId: attacker.socketId,
                attackerUid: attacker.uid || '',
                attackerUsername: attacker.username,
                targetSocketId: target.socketId,
                targetUid: target.uid || '',
                targetUsername: target.username,
                attackerNewHand: isAttacker ? attacker.hand : undefined,
                targetNewHand: isTarget ? target.hand : undefined,
                attackerOldCards: (isAttacker || isTarget) ? attackerOldHand : undefined,
                targetOldCards: (isAttacker || isTarget) ? targetOldHand : undefined,
                attackerOldCount: attackerOldHand.length,
                targetOldCount: targetOldHand.length,
                attackerNewCount: attacker.hand.length,
                targetNewCount: target.hand.length
            });

            if (wasReflected) {
                io.to(sid).emit('game_toast', {
                    title: 'SWITCH x ĐẢO NGHỊCH',
                    message: `<span class="toast-username">${target.username}</span> phản đòn Switch lại <span class="toast-username">${attacker.username}</span> (cả 2 vẫn hoán đổi bài nhưng <span class="toast-username">${target.username}</span> bị mất lá Đảo Nghịch)!`,
                    type: 'warning',
                    duration: 5000
                });
            } else {
                io.to(sid).emit('game_toast', {
                    title: 'SWITCH',
                    message: `<span class="toast-username">${attacker.username}</span> đã hoán đổi toàn bộ bài trên tay với <span class="toast-username">${target.username}</span>!`,
                    type: 'info',
                    duration: 4000
                });
            }
        });

        broadcastPlayersCardCounts(io, game, data.roomId);
        resetTurnTimer(game, data.roomId, io);
    });

    socket.on('game_combo_pick_target', (data) => {
        if (!data || !data.roomId || !data.targetSocketId) return;
        const room = ROOMS[data.roomId];
        if (!room || !room.game) return;
        const game = room.game;
        
        if (game.phase !== 'COMBO_2_TARGET_SELECTION' && game.phase !== 'COMBO_3_TARGET_SELECTION') return;
        if (!game.comboState || game.comboState.requesterSocketId !== socket.id) return;
        
        const initialAttacker = game.players.find(p => p.socketId === socket.id);
        let target = findGamePlayer(game.players, data.targetSocketId, data.targetUid, data.targetUsername);
        let attacker = initialAttacker;
        
        if (!target || !target.alive || target.hand.length === 0) {
            io.to(socket.id).emit('error_msg', 'Người chơi này không hợp lệ hoặc không có bài để cướp!');
            return;
        }

        // KIỂM TRA PHẢN ĐÒN (CONTRAST) - Chỉ áp dụng cho combo 2 (cướp trực tiếp)
        if (game.comboState.comboType === 2) {
            const contrastRes = checkAndReflectContrast(game, attacker, target, 'combo_2', io, data.roomId);
            if (contrastRes.reflected) {
                target = contrastRes.target;
                attacker = contrastRes.attacker;

                if (target.hand.length === 0) {
                    const allSocketIds = game.players.map(p => p.socketId);
                    allSocketIds.forEach(sid => {
                        io.to(sid).emit('game_toast', {
                            title: 'ĐẢO NGHỊCH',
                            message: `<span class="toast-username">${target.username}</span> không có bài để cướp! Combo 2 lá bị vô hiệu hóa!`,
                            type: 'info',
                            duration: 4500
                        });
                    });
                    game.phase = 'PLAYING';
                    game.comboState = null;
                    return;
                }
            }
        }
        
        if (game.comboState.comboType === 2) {
            const randomIdx = Math.floor(Math.random() * target.hand.length);
            const stolenCard = target.hand.splice(randomIdx, 1)[0];
            if (stolenCard.id === 'chest') {
                stolenCard.chestPoints = 0;
            }
            removeCardFromLocking(target, stolenCard.uid, io, data.roomId, game.players.map(p => p.socketId));
            
            const didSomeoneExplode = handlePostStealBombCheck(game, target, attacker, stolenCard, data.roomId);
            
            if (!didSomeoneExplode) {
                game.phase = 'PLAYING';
            }
            
            const allSocketIds = game.players.map(p => p.socketId);
            allSocketIds.forEach(sid => {
                io.to(sid).emit('game_combo_2_completed', {
                    roomId: data.roomId,
                    giverSocketId: target.socketId,
                    giverUsername: target.username,
                    giverUid: target.uid || '',
                    receiverSocketId: attacker.socketId,
                    receiverUsername: attacker.username,
                    receiverUid: attacker.uid || '',
                    card: stolenCard,
                    giverCardCount: target.hand.length,
                    receiverCardCount: attacker.hand.length
                });
            });
            broadcastPlayersCardCounts(io, room, data.roomId);
        } else if (game.comboState.comboType === 3) {
            game.phase = 'COMBO_3_CARD_SELECTION';
            game.comboState.targetSocketId = target.socketId;
            game.comboState.targetUsername = target.username;
            
            io.to(socket.id).emit('game_combo_3_select_card', {
                roomId: data.roomId,
                targetUsername: target.username
            });
        }
    });

    socket.on('game_combo_pick_card_type', (data) => {
        if (!data || !data.roomId || !data.targetCardId) return;
        const room = ROOMS[data.roomId];
        if (!room || !room.game) return;
        const game = room.game;
        
        if (game.phase !== 'COMBO_3_CARD_SELECTION' && game.phase !== 'COMBO_5_CARD_SELECTION') return;
        if (!game.comboState || game.comboState.requesterSocketId !== socket.id) return;
        
        if (game.phase === 'COMBO_5_CARD_SELECTION') {
            const requester = game.players.find(p => p.socketId === socket.id);
            if (!requester) {
                game.phase = 'PLAYING';
                return;
            }
            
            game.phase = 'PLAYING';
            
            const { createCardObject } = require('../logic/deck_logic');
            const newCard = createCardObject(data.targetCardId);
            if (newCard.id === 'chest') {
                newCard.chestPoints = 0;
            }
            requester.hand.push(newCard);
            
            const allSocketIds = game.players.map(p => p.socketId);
            allSocketIds.forEach(sid => {
                io.to(sid).emit('game_combo_5_completed', {
                    roomId: data.roomId,
                    targetCardId: data.targetCardId,
                    receiverSocketId: requester.socketId,
                    receiverUsername: requester.username,
                    card: newCard,
                    receiverCardCount: requester.hand.length
                });
            });
            broadcastPlayersCardCounts(io, room, data.roomId);
            resetTurnTimer(game, data.roomId, io);
            return;
        }
        
        let target = findGamePlayer(game.players, game.comboState.targetSocketId, game.comboState.targetUid, game.comboState.targetUsername);
        let requester = findGamePlayer(game.players, socket.id);
        
        if (!target || !requester) {
            game.phase = 'PLAYING';
            return;
        }

        // KIỂM TRA PHẢN ĐÒN (CONTRAST) CHO COMBO 3
        const contrastRes = checkAndReflectContrast(game, requester, target, 'combo_3', io, data.roomId);
        if (contrastRes.reflected) {
            // Khi phản đòn: target trở thành người phải giao nộp bài (chính là requester ban đầu)
            // requester trở thành người được nhận bài (chính là target ban đầu)
            target = contrastRes.target; // Ban đầu là requester
            requester = contrastRes.attacker; // Ban đầu là target
        }
        
        const cardIndex = target.hand.findIndex(c => c.id === data.targetCardId);
        if (cardIndex !== -1) {
            const stolenCard = target.hand.splice(cardIndex, 1)[0];
            if (stolenCard.id === 'chest') {
                stolenCard.chestPoints = 0;
            }
            removeCardFromLocking(target, stolenCard.uid, io, data.roomId, game.players.map(p => p.socketId));
            
            const didSomeoneExplode = handlePostStealBombCheck(game, target, requester, stolenCard, data.roomId);
            if (!didSomeoneExplode) {
                game.phase = 'PLAYING';
            }
            
            const allSocketIds = game.players.map(p => p.socketId);
            allSocketIds.forEach(sid => {
                io.to(sid).emit('game_combo_3_completed', {
                    roomId: data.roomId,
                    success: true,
                    targetCardId: data.targetCardId,
                    giverSocketId: target.socketId,
                    giverUsername: target.username,
                    giverUid: target.uid || '',
                    receiverSocketId: requester.socketId,
                    receiverUsername: requester.username,
                    receiverUid: requester.uid || '',
                    card: stolenCard,
                    giverCardCount: target.hand.length,
                    receiverCardCount: requester.hand.length
                });
            });
        } else {
            game.phase = 'PLAYING';
            const allSocketIds = game.players.map(p => p.socketId);
            allSocketIds.forEach(sid => {
                io.to(sid).emit('game_combo_3_completed', {
                    roomId: data.roomId,
                    success: false,
                    targetCardId: data.targetCardId,
                    giverSocketId: target.socketId,
                    giverUsername: target.username,
                    giverUid: target.uid || '',
                    receiverSocketId: requester.socketId,
                    receiverUsername: requester.username,
                    receiverUid: requester.uid || ''
                });
            });
        }
        broadcastPlayersCardCounts(io, room, data.roomId);
        resetTurnTimer(game, data.roomId, io);
    });

    socket.on('game_favor_pick_target', (data) => {
        if (!data || !data.roomId || !data.targetSocketId) return;
        const room = ROOMS[data.roomId];
        if (!room || !room.game) return;
        const game = room.game;
        
        if (game.phase !== 'FAVOR_TARGET_SELECTION') return;
        if (!game.favorState || game.favorState.requesterSocketId !== socket.id) return;
        
        const initialAttacker = game.players.find(p => p.socketId === socket.id);
        let target = findGamePlayer(game.players, data.targetSocketId, data.targetUid, data.targetUsername);
        let attacker = initialAttacker;
        
        if (!target || !target.alive || target.hand.length === 0) {
            io.to(socket.id).emit('error_msg', 'Người chơi này không có bài để tặng!');
            return;
        }

        // KIỂM TRA PHẢN ĐÒN (CONTRAST)
        const contrastRes = checkAndReflectContrast(game, attacker, target, 'favor', io, data.roomId);
        if (contrastRes.reflected) {
            target = contrastRes.target;
            attacker = contrastRes.attacker;

            if (target.hand.length === 0) {
                const allSocketIds = game.players.map(p => p.socketId);
                allSocketIds.forEach(sid => {
                    io.to(sid).emit('game_toast', {
                        title: 'ĐẢO NGHỊCH',
                        message: `<span class="toast-username">${target.username}</span> không có bài để xin! Đòn Xin Xỏ bị vô hiệu hóa!`,
                        type: 'info',
                        duration: 4500
                    });
                });
                game.phase = 'PLAYING';
                game.favorState = null;
                return;
            }
        }
        
        game.phase = 'FAVOR_CARD_SELECTION';
        game.favorState.targetSocketId = target.socketId;
        game.favorState.targetUsername = target.username;
        game.favorState.requesterSocketId = attacker.socketId;
        game.favorState.requesterUsername = attacker.username;
        game.favorState.targetUid = target.uid;
        game.favorState.targetIndex = findGamePlayerIndex(game.players, target.socketId, target.uid, target.username);
        
        console.log(`[Game] ${attacker.username} xin bài từ ${target.username}. Dừng đồng hồ đếm ngược của người xin để chờ đối phương tặng bài.`);

        // DỪNG ĐỒNG HỒ ĐẾM NGƯỢC CỦA NGƯỜI ĐÁNH FAVOR (Chờ đối phương tương tác tặng bài)
        clearTurnTimer(game);
        
        io.to(target.socketId).emit('game_favor_give_card_req', {
            roomId: data.roomId,
            requesterUsername: attacker.username
        });
        
        const allSocketIds = game.players.map(p => p.socketId);
        allSocketIds.forEach(sid => {
            if (sid !== target.socketId) {
                io.to(sid).emit('game_favor_waiting', {
                    roomId: data.roomId,
                    targetUsername: target.username,
                    requesterUsername: attacker.username
                });
            }
            io.to(sid).emit('game_turn_timer_paused', {
                roomId: data.roomId,
                reason: 'FAVOR_WAITING',
                targetUsername: target.username,
                requesterUsername: attacker.username
            });
        });

        // Đếm ngược 10s cho đối phương (Target) chọn bài tặng. Nếu AFK hết 10s, server tự động chọn 1 lá ngẫu nhiên không bị khóa để tặng
        if (game.favorTimeoutTimer) {
            clearTimeout(game.favorTimeoutTimer);
            game.favorTimeoutTimer = null;
        }
        game.favorTimeoutTimer = setTimeout(() => {
            game.favorTimeoutTimer = null;
            if (!game || game.phase !== 'FAVOR_CARD_SELECTION' || !game.favorState) return;

            const t = findGamePlayer(game.players, game.favorState.targetSocketId, game.favorState.targetUid, game.favorState.targetUsername);
            const req = findGamePlayer(game.players, game.favorState.requesterSocketId, game.favorState.requesterUid, game.favorState.requesterUsername);
            if (!t || !req || !t.alive || !req.alive || t.hand.length === 0) {
                game.phase = 'PLAYING';
                game.favorState = null;
                startTurnTimer(game, data.roomId, io);
                return;
            }

            // Tìm lá không bị khóa
            const lockedUids = (t.lockedCards && Array.isArray(t.lockedCards.lockedCardUids)) ? t.lockedCards.lockedCardUids : [];
            const unlockableCards = t.hand.filter(c => !lockedUids.includes(c.uid));
            const availableCards = unlockableCards.length > 0 ? unlockableCards : t.hand;
            const randomCard = availableCards[Math.floor(Math.random() * availableCards.length)];

            console.log(`[Anti-AFK Favor] ${t.username} hết 10s không chọn, hệ thống tự động tặng lá ${randomCard.id} cho ${req.username}`);

            const cardIndex = t.hand.findIndex(c => c.uid === randomCard.uid);
            if (cardIndex !== -1) {
                const givenCard = t.hand.splice(cardIndex, 1)[0];
                if (givenCard.id === 'chest') {
                    givenCard.chestPoints = 0;
                }
                const didSomeoneExplode = handlePostStealBombCheck(game, t, req, givenCard, data.roomId);
                
                const allSids = game.players.map(p => p.socketId);
                allSids.forEach(sid => {
                    io.to(sid).emit('game_favor_completed', {
                        roomId: data.roomId,
                        giverSocketId: t.socketId,
                        giverUsername: t.username,
                        giverUid: t.uid || '',
                        receiverSocketId: req.socketId,
                        receiverUsername: req.username,
                        receiverUid: req.uid || '',
                        card: (sid === req.socketId || givenCard.id === 'exploding_kitten' || givenCard.id === 'super_exploding_kitten' || givenCard.id === 'atomicbom' || givenCard.id === 'streaking') ? givenCard : { id: 'card_back', uid: givenCard.uid },
                        giverCardCount: t.hand.length,
                        receiverCardCount: req.hand.length
                    });
                });

                if (!didSomeoneExplode) {
                    game.phase = 'PLAYING';
                }
                game.favorState = null;
                broadcastPlayersCardCounts(io, room, data.roomId);
                startTurnTimer(game, data.roomId, io);
            }
        }, 20000);
    });
    
    socket.on('game_favor_give_card', (data) => {
        if (!data || !data.roomId || !data.cardUid) return;
        const room = ROOMS[data.roomId];
        if (!room || !room.game) return;
        const game = room.game;
        
        if (game.phase === 'FAVOR_CARD_SELECTION') {
            if (!game.favorState) return;
            const targetPlayer = findGamePlayer(game.players, socket.id);
            const isTarget = game.favorState.targetSocketId === socket.id ||
                (targetPlayer && game.favorState.targetUid && targetPlayer.uid && game.favorState.targetUid === targetPlayer.uid) ||
                (targetPlayer && game.favorState.targetUsername && targetPlayer.username && game.favorState.targetUsername === targetPlayer.username);
            if (!isTarget) return;

            if (game.favorTimeoutTimer) {
                clearTimeout(game.favorTimeoutTimer);
                game.favorTimeoutTimer = null;
            }
            
            const target = targetPlayer || findGamePlayer(game.players, game.favorState.targetSocketId, game.favorState.targetUid, game.favorState.targetUsername);
            const requester = findGamePlayer(game.players, game.favorState.requesterSocketId, game.favorState.requesterUid, game.favorState.requesterUsername);
            if (!target || !requester) return;
            
            const cardIndex = target.hand.findIndex(c => c.uid === data.cardUid);
            if (cardIndex === -1) {
                io.to(socket.id).emit('error_msg', 'Lá bài không hợp lệ!');
                return;
            }
            
            if (target.lockedCards && Array.isArray(target.lockedCards.lockedCardUids) && target.lockedCards.lockedCardUids.includes(data.cardUid)) {
                return;
            }
            
            const givenCard = target.hand.splice(cardIndex, 1)[0];
            if (givenCard.id === 'chest') {
                givenCard.chestPoints = 0;
            }
            
            const allSocketIds = game.players.map(p => p.socketId);
            removeCardFromLocking(target, givenCard.uid, io, data.roomId, allSocketIds);

            console.log(`[Game] ${target.username} tặng lá ${givenCard.id} cho ${requester.username}`);
            
            const didSomeoneExplode = handlePostStealBombCheck(game, target, requester, givenCard, data.roomId);
            
            allSocketIds.forEach(sid => {
                io.to(sid).emit('game_favor_completed', {
                    roomId: data.roomId,
                    giverSocketId: target.socketId,
                    giverUsername: target.username,
                    giverUid: target.uid || '',
                    receiverSocketId: requester.socketId,
                    receiverUsername: requester.username,
                    receiverUid: requester.uid || '',
                    card: (sid === requester.socketId || givenCard.id === 'exploding_kitten' || givenCard.id === 'super_exploding_kitten' || givenCard.id === 'atomicbom' || givenCard.id === 'streaking') ? givenCard : { id: 'card_back', uid: givenCard.uid },
                    giverCardCount: target.hand.length,
                    receiverCardCount: requester.hand.length
                });
            });
            
            if (!didSomeoneExplode) {
                game.phase = 'PLAYING';
            }
            game.favorState = null;
            broadcastPlayersCardCounts(io, room, data.roomId);
            startTurnTimer(game, data.roomId, io);
        } else if (game.phase === 'SUPERFAVOR_CARD_SELECTION') {
            if (!game.superfavorState) return;
            const state = game.superfavorState;

            // Tìm target entry theo socketId, uid, hoặc username
            const targetPlayer = findGamePlayer(game.players, socket.id);
            const targetEntry = (state.targets || []).find(t => 
                t.socketId === socket.id || 
                (targetPlayer && t.uid && targetPlayer.uid && t.uid === targetPlayer.uid) ||
                (targetPlayer && t.username && targetPlayer.username && t.username === targetPlayer.username)
            );

            if (!targetEntry || targetEntry.hasGiven) return;

            const target = targetPlayer || findGamePlayer(game.players, targetEntry.socketId, targetEntry.uid, targetEntry.username);
            const requester = findGamePlayer(game.players, state.requesterSocketId, state.requesterUid, state.requesterUsername);
            if (!target || !requester) return;

            const cardIndex = target.hand.findIndex(c => c.uid === data.cardUid);
            if (cardIndex === -1) {
                io.to(socket.id).emit('error_msg', 'Lá bài không hợp lệ!');
                return;
            }

            if (target.lockedCards && Array.isArray(target.lockedCards.lockedCardUids) && target.lockedCards.lockedCardUids.includes(data.cardUid)) {
                return;
            }

            const givenCard = target.hand.splice(cardIndex, 1)[0];
            if (givenCard.id === 'chest') {
                givenCard.chestPoints = 0;
            }

            targetEntry.hasGiven = true;

            const allSocketIds = game.players.map(p => p.socketId);
            removeCardFromLocking(target, givenCard.uid, io, data.roomId, allSocketIds);

            const totalCount = (state.targets || []).length;
            const givenCount = (state.targets || []).filter(t => t.hasGiven).length;
            const remainingCount = totalCount - givenCount;
            console.log(`[Game] (Super Favor) ${target.username} tặng lá ${givenCard.id} cho ${requester.username} (Tiến độ: ${givenCount}/${totalCount}, còn lại ${remainingCount} người)`);

            const didSomeoneExplode = handlePostStealBombCheck(game, target, requester, givenCard, data.roomId);

            allSocketIds.forEach(sid => {
                io.to(sid).emit('game_favor_completed', {
                    roomId: data.roomId,
                    giverSocketId: target.socketId,
                    giverUsername: target.username,
                    giverUid: target.uid || '',
                    receiverSocketId: requester.socketId,
                    receiverUsername: requester.username,
                    receiverUid: requester.uid || '',
                    card: (sid === requester.socketId || givenCard.id === 'exploding_kitten' || givenCard.id === 'super_exploding_kitten' || givenCard.id === 'atomicbom' || givenCard.id === 'streaking') ? givenCard : { id: 'card_back', uid: givenCard.uid },
                    giverCardCount: target.hand.length,
                    receiverCardCount: requester.hand.length,
                    isSuperFavor: true,
                    givenCount,
                    totalCount,
                    remainingCount
                });
            });

            broadcastPlayersCardCounts(io, room, data.roomId);

            if (!requester.alive || didSomeoneExplode || game.phase === 'DEFUSING' || game.phase === 'GAME_OVER') {
                if (game.superfavorTimeoutTimer) {
                    clearTimeout(game.superfavorTimeoutTimer);
                    game.superfavorTimeoutTimer = null;
                }
                game.superfavorState = null;
                // Nếu người dùng Super Favor bị nổ hoặc phải gỡ bom, hủy ngay trạng thái bắt buộc tặng bài cho những người còn lại
                allSocketIds.forEach(sid => {
                    io.to(sid).emit('game_favor_cancelled', { roomId: data.roomId });
                });
                return;
            }

            if (remainingCount === 0) {
                if (game.superfavorTimeoutTimer) {
                    clearTimeout(game.superfavorTimeoutTimer);
                    game.superfavorTimeoutTimer = null;
                }
                game.superfavorState = null;
                if (!didSomeoneExplode) {
                    game.phase = 'PLAYING';
                }
                startTurnTimer(game, data.roomId, io);
            }
        }
    });

    socket.on('game_slap_pick_target', (data) => {
        if (!data || !data.roomId || !data.targetSocketId) return;
        const room = ROOMS[data.roomId];
        if (!room || !room.game) return;
        const game = room.game;

        if (game.phase !== 'SLAP_TARGET_SELECTION') return;
        if (!game.slapState || game.slapState.requesterSocketId !== socket.id) return;

        const initialAttacker = game.players.find(p => p.socketId === socket.id);
        let target = findGamePlayer(game.players, data.targetSocketId, data.targetUid, data.targetUsername);
        let attacker = initialAttacker;
        
        if (!target || !target.alive) {
            io.to(socket.id).emit('error_msg', 'Mục tiêu không hợp lệ hoặc đã nổ!');
            return;
        }

        // KIỂM TRA PHẢN ĐÒN (CONTRAST)
        const contrastRes = checkAndReflectContrast(game, attacker, target, 'slap', io, data.roomId);
        if (contrastRes.reflected) {
            target = contrastRes.target;
            attacker = contrastRes.attacker;
        }

        const targetIndex = findGamePlayerIndex(game.players, target.socketId, target.uid, target.username);
        if (targetIndex === -1) return;

        const bonusTurns = typeof game.slapState.bonusTurns === 'number' ? game.slapState.bonusTurns : 0;
        const requesterUsername = attacker.username;
        const cardId = game.slapState.cardId || 'slap';

        game.currentTurnIndex = targetIndex;
        game.turnsRemaining = (game.turnsRemaining > 0 ? game.turnsRemaining : 1) + bonusTurns;

        game.phase = 'PLAYING';
        game.slapState = null;

        console.log(`[Game] ${requesterUsername} đã slap ${target.username} (${bonusTurns} bonus). Turns: ${game.turnsRemaining}`);

        const isSelf = (target.socketId === attacker.socketId);

        broadcastTurnChanged(game, data.roomId, io, targetIndex, game.turnsRemaining);

        const allSocketIds = game.players.map(p => p.socketId);
        allSocketIds.forEach(sid => {
            io.to(sid).emit('game_slap_completed', {
                roomId: data.roomId,
                attackerSocketId: attacker.socketId,
                attackerUsername: requesterUsername,
                attackerUid: attacker.uid || '',
                targetSocketId: target.socketId,
                targetUsername: target.username,
                targetUid: target.uid || '',
                turnsRemaining: game.turnsRemaining,
                isSelf: isSelf,
                cardId: cardId
            });
        });
    });

    socket.on('game_inferno_pick_target', (data) => {
        if (!data || !data.roomId || !data.targetSocketId) return;
        const room = ROOMS[data.roomId];
        if (!room || !room.game) return;
        const game = room.game;

        if (game.phase !== 'INFERNO_TARGET_SELECTION') return;
        if (!game.infernoState || game.infernoState.attackerSocketId !== socket.id) return;

        const initialAttacker = game.players.find(p => p.socketId === socket.id);
        let target = findGamePlayer(game.players, data.targetSocketId, data.targetUid, data.targetUsername);
        let attacker = initialAttacker;
        
        if (!target || !target.alive || target.hand.length === 0) {
            io.to(socket.id).emit('error_msg', 'Người chơi này không hợp lệ hoặc không có bài!');
            game.phase = 'PLAYING';
            game.infernoState = null;
            return;
        }

        // KIỂM TRA PHẢN ĐÒN (CONTRAST)
        const contrastRes = checkAndReflectContrast(game, attacker, target, 'inferno', io, data.roomId);
        if (contrastRes.reflected) {
            target = contrastRes.target;
            attacker = contrastRes.attacker;

            if (target.hand.length === 0) {
                const allSocketIds = game.players.map(p => p.socketId);
                allSocketIds.forEach(sid => {
                    io.to(sid).emit('game_toast', {
                        title: 'ĐẢO NGHỊCH',
                        message: `<span class="toast-username">${target.username}</span> không có bài để thiêu cháy! Đòn Inferno bị vô hiệu hóa!`,
                        type: 'info',
                        duration: 4500
                    });
                });
                game.phase = 'PLAYING';
                game.infernoState = null;
                return;
            }
        }

        game.phase = 'INFERNO_ANIMATING';

        const countToDestroy = Math.min((game.infernoState && game.infernoState.countToDestroy) ? game.infernoState.countToDestroy : 2, target.hand.length);
        const destroyedCards = [];
        const destroyedCardUids = [];

        for (let i = 0; i < countToDestroy; i++) {
            const randomIndex = Math.floor(Math.random() * target.hand.length);
            const card = target.hand.splice(randomIndex, 1)[0];
            destroyedCards.push(card);
            destroyedCardUids.push(card.uid);
            if (game.discardPile) {
                game.discardPile.push(card);
            }
        }

        const attackerUsername = attacker.username;
        const victimUsername = target.username;
        const victimSocketId = target.socketId;
        const cardId = game.infernoState.cardId || 'inferno';

        console.log(`[Game] ${attackerUsername} dùng ${cardId} thiêu cháy ${destroyedCards.length} lá bài của ${victimUsername}:`, destroyedCardUids);

        const allSocketIds = game.players.map(p => p.socketId);
        allSocketIds.forEach(sid => {
            io.to(sid).emit('game_inferno_applied', {
                roomId: data.roomId,
                attackerSocketId: attacker.socketId,
                attackerUsername,
                attackerUid: attacker.uid || '',
                victimSocketId,
                victimUsername,
                victimUid: target.uid || '',
                destroyedCardUids,
                destroyedCount: destroyedCards.length,
                targetCardCount: target.hand.length,
                cardId
            });
        });
        broadcastPlayersCardCounts(io, room, data.roomId);

        game.infernoState = null;

        setTimeout(() => {
            if (game.phase === 'INFERNO_ANIMATING') {
                game.phase = 'PLAYING';
                console.log(`[Game] Hoạt ảnh Inferno (1.0s) hoàn tất. Ván đấu trở lại phase PLAYING.`);
            }
        }, 1300);
    });

    socket.on('game_toggle_contrast', (data) => {
        if (!data || !data.roomId || !data.cardUid) return;
        const room = ROOMS[data.roomId];
        if (!room || !room.game) return;
        const player = room.game.players.find(p => p.socketId === socket.id);
        if (!player || !player.alive || !player.hand) return;

        const card = player.hand.find(c => c.uid === data.cardUid && c.id === 'contrast');
        if (card) {
            card.contrastOn = !!data.isOn;
            console.log(`[Game] ${player.username} bật/tắt lá Đảo Nghịch (Contrast) ${card.uid} -> ${card.contrastOn ? 'ON' : 'OFF'}`);
        }
    });

    socket.on('game_reorder_hand', (data) => {
        if (!data || !data.roomId) return;
        const room = ROOMS[data.roomId];
        if (!room || !room.game || room.game.phase !== 'PLAYING') return;

        const playerIndex = room.game.players.findIndex(p => p.socketId === socket.id);
        if (playerIndex !== -1 && room.game.players[playerIndex].alive) {
            const oldHand = room.game.players[playerIndex].hand || [];
            const newHand = (data.cards || []).map(newC => {
                const oldC = oldHand.find(oc => oc.uid === newC.uid);
                if (oldC && oldC.id === 'contrast' && newC.contrastOn === undefined) {
                    newC.contrastOn = oldC.contrastOn;
                }
                return newC;
            });
            room.game.players[playerIndex].hand = newHand;
        }
    });

    socket.on('game_see_future_done', ({ roomId }) => {
        const room = ROOMS[roomId];
        if (!room || !room.game) return;
        const playerObj = findGamePlayer(room.game.players, socket.id, PLAYERS[socket.id]?.uid, PLAYERS[socket.id]?.username);
        if (playerObj) {
            playerObj.seeingFutureTop3 = null;
        }
        const allSocketIds = room.game.players.map(p => p.socketId);
        allSocketIds.forEach(sid => {
            if (sid !== socket.id) {
                io.to(sid).emit('game_see_future_done_others', { playerSocketId: socket.id, username: playerObj?.username, uid: playerObj?.uid || '' });
            }
        });
        resetTurnTimer(room.game, roomId, io);
    });

    socket.on('game_alter_future_done', ({ roomId, orderedUids }) => {
        const room = ROOMS[roomId];
        if (!room || !room.game) return;
        const playerObj = findGamePlayer(room.game.players, socket.id, PLAYERS[socket.id]?.uid, PLAYERS[socket.id]?.username);
        if (playerObj && playerObj.alteringFutureTop3) {
            const originalTop3 = playerObj.alteringFutureTop3;
            if (orderedUids && orderedUids.length === originalTop3.length) {
                const numCards = room.game.drawPile.length;
                const countToReplace = Math.min(originalTop3.length, numCards);
                const actualTopCards = room.game.drawPile.splice(numCards - countToReplace, countToReplace);
                
                const cardMap = {};
                actualTopCards.forEach(c => { cardMap[c.uid] = c; });
                
                const newTopCards = [];
                // orderedUids: index 0 is Top, so we push it last (reverse order)
                for (let i = orderedUids.length - 1; i >= 0; i--) {
                    const uid = orderedUids[i];
                    if (cardMap[uid]) {
                        newTopCards.push(cardMap[uid]);
                        delete cardMap[uid];
                    }
                }
                
                Object.values(cardMap).forEach(c => newTopCards.push(c));
                room.game.drawPile.push(...newTopCards);
            }
            playerObj.alteringFutureTop3 = null;
        }
        const allSocketIds = room.game.players.map(p => p.socketId);
        allSocketIds.forEach(sid => {
            if (sid !== socket.id) {
                io.to(sid).emit('game_see_future_done_others', { playerSocketId: socket.id, username: playerObj?.username, uid: playerObj?.uid || '' });
            }
        });
        resetTurnTimer(room.game, roomId, io);
    });

    socket.on('game_seetheothers_pick_target', (data) => {
        if (!data || !data.roomId || !data.targetSocketId) return;
        const room = ROOMS[data.roomId];
        if (!room || !room.game) return;
        const game = room.game;

        if (game.phase !== 'SEETHEOTHERS_TARGET_SELECTION') return;
        if (!game.seetheothersState || game.seetheothersState.requesterSocketId !== socket.id) return;

        let attacker = findGamePlayer(game.players, socket.id, PLAYERS[socket.id]?.uid, PLAYERS[socket.id]?.username);
        let target = findGamePlayer(game.players, data.targetSocketId, data.targetUid, data.targetUsername);

        if (!attacker || !target || !target.alive || !target.hand || target.hand.length === 0) {
            io.to(socket.id).emit('error_msg', 'Người chơi này không có bài để nhìn!');
            return;
        }

        // KIỂM TRA PHẢN ĐÒN (CONTRAST)
        const contrastRes = checkAndReflectContrast(game, attacker, target, 'seetheothers', io, data.roomId);
        if (contrastRes.reflected) {
            target = contrastRes.target; // Ban đầu là attacker
            attacker = contrastRes.attacker; // Ban đầu là target

            if (!target.hand || target.hand.length === 0) {
                const allSocketIds = game.players.map(p => p.socketId);
                allSocketIds.forEach(sid => {
                    io.to(sid).emit('game_toast', {
                        title: 'ĐẢO NGHỊCH',
                        message: `<span class="toast-username">${target.username}</span> không có bài để nhìn!`,
                        type: 'info',
                        duration: 4000
                    });
                });
                game.phase = 'PLAYING';
                game.seetheothersState = null;
                startTurnTimer(game, data.roomId, io);
                return;
            }
        }

        game.phase = 'SEETHEOTHERS_VIEWING';
        game.seetheothersState.targetSocketId = target.socketId;
        game.seetheothersState.targetUsername = target.username;
        game.seetheothersState.targetUid = target.uid || '';

        attacker.seeingOthersHand = {
            targetSocketId: target.socketId,
            targetUsername: target.username,
            targetUid: target.uid || '',
            cards: target.hand
        };

        target.beingSeenBy = {
            requesterSocketId: attacker.socketId,
            requesterUsername: attacker.username,
            requesterUid: attacker.uid || ''
        };

        console.log(`[Game] ${attacker.username} đang nhìn bài của ${target.username} (${target.hand.length} lá).`);

        clearTurnTimer(game);

        // Gửi toàn bộ bài của target cho attacker
        io.to(attacker.socketId).emit('game_see_the_others', {
            targetUsername: target.username,
            targetSocketId: target.socketId,
            targetUid: target.uid || '',
            cards: target.hand
        });

        // Gửi hoạt ảnh mini cards cho tất cả các socket khác
        const allSocketIds = game.players.map(p => p.socketId);
        allSocketIds.forEach(sid => {
            if (sid !== attacker.socketId) {
                io.to(sid).emit('game_see_the_others_others', {
                    requesterSocketId: attacker.socketId,
                    requesterUsername: attacker.username,
                    requesterUid: attacker.uid || '',
                    targetSocketId: target.socketId,
                    targetUsername: target.username,
                    targetUid: target.uid || '',
                    count: target.hand.length
                });
            }
            io.to(sid).emit('game_turn_timer_paused', {
                roomId: data.roomId,
                reason: 'SEETHEOTHERS_VIEWING',
                message: `${attacker.username} đang nhìn bài của ${target.username}...`
            });
        });
    });

    socket.on('game_see_the_others_done', ({ roomId }) => {
        const room = ROOMS[roomId];
        if (!room || !room.game) return;
        const game = room.game;

        const attacker = findGamePlayer(game.players, socket.id, PLAYERS[socket.id]?.uid, PLAYERS[socket.id]?.username);
        const targetSocketId = attacker?.seeingOthersHand?.targetSocketId || game.seetheothersState?.targetSocketId;
        const targetUid = attacker?.seeingOthersHand?.targetUid || game.seetheothersState?.targetUid;
        const targetUsername = attacker?.seeingOthersHand?.targetUsername || game.seetheothersState?.targetUsername;

        if (attacker) {
            attacker.seeingOthersHand = null;
        }

        const target = findGamePlayer(game.players, targetSocketId, targetUid, targetUsername);
        if (target) {
            target.beingSeenBy = null;
        }

        game.seetheothersState = null;
        game.phase = 'PLAYING';

        const allSocketIds = game.players.map(p => p.socketId);
        allSocketIds.forEach(sid => {
            io.to(sid).emit('game_see_the_others_done_others', {
                requesterSocketId: socket.id,
                requesterUsername: attacker?.username,
                requesterUid: attacker?.uid || '',
                targetSocketId: targetSocketId,
                targetUsername: targetUsername,
                targetUid: targetUid
            });
        });

        console.log(`[Game] ${attacker?.username} đã xem xong bài của ${targetUsername}.`);
        resetTurnTimer(game, roomId, io);
    });

    function performDraw(game, player, roomId, isBottom = false, isRandom = false) {
        clearTurnTimer(game);
        if (game.drawPile.length <= 0) return;
        
        let drawnCard;
        let drawSource = 'trên cùng';
        if (isRandom) {
            const randomIndex = Math.floor(Math.random() * game.drawPile.length);
            drawnCard = game.drawPile.splice(randomIndex, 1)[0];
            drawSource = `ngẫu nhiên (vị trí ${randomIndex})`;
        } else if (isBottom) {
            drawnCard = game.drawPile.shift();
            drawSource = 'dưới cùng';
        } else {
            drawnCard = game.drawPile.pop();
        }
        
        const playerIndex = game.players.findIndex(p => p.socketId === player.socketId);
        
        console.log(`[Game] ${player.username} rút lá ${drawnCard.id} (Từ ${drawSource})`);

        io.to(player.socketId).emit('game_card_drawn_self', {
            roomId,
            card: drawnCard,
            drawPileCount: game.drawPile.length
        });

        const otherPlayers = game.players.filter(p => p.socketId !== player.socketId);

        if (drawnCard.id === 'super_exploding_kitten') {
            console.log(`[Game] ${player.username} rút trúng SIÊU MÈO NỔ (super_exploding_kitten) - Vô phương cứu chữa!`);
            otherPlayers.forEach(p => {
                io.to(p.socketId).emit('game_card_drawn_other', {
                    roomId,
                    playerSocketId: player.socketId,
                    playerUid: player.uid || '',
                    playerUsername: player.username,
                    playerIndex,
                    playerCardCount: player.hand.length,
                    drawPileCount: game.drawPile.length
                });
            });
            processSuperExplodingKitten(game, player, drawnCard, roomId);
        } else if (drawnCard.id === 'exploding_kitten' || drawnCard.id === 'atomicbom') {
            // Lá Streaking đang bị Locking khóa thì KHÔNG được tính vào số lượng giúp giữ bom an toàn
            const streakingCount = countUnlockedCards(player, 'streaking');
            const heldBombs = player.hand.filter(c => c.id === 'exploding_kitten' || c.id === 'atomicbom').length;

            if (heldBombs < streakingCount) {
                console.log(`[Game] ${player.username} rút trúng bom nhưng an toàn nhờ có đủ Streaking.`);
                player.hand.push(drawnCard);
                
                otherPlayers.forEach(p => {
                    io.to(p.socketId).emit('game_card_drawn_other', {
                        roomId,
                        playerSocketId: player.socketId,
                        playerUid: player.uid || '',
                        playerUsername: player.username,
                        playerIndex,
                        playerCardCount: player.hand.length,
                        drawPileCount: game.drawPile.length
                    });
                });
                
                advanceTurn(game, roomId, io);
            } else {
                otherPlayers.forEach(p => {
                    io.to(p.socketId).emit('game_card_drawn_other', {
                        roomId,
                        playerSocketId: player.socketId,
                        playerUid: player.uid || '',
                        playerUsername: player.username,
                        playerIndex,
                        playerCardCount: player.hand.length, // Chưa push nên count giữ nguyên
                        drawPileCount: game.drawPile.length
                    });
                });
                
                if (drawnCard.id === 'atomicbom') processAtomicBom(game, player, drawnCard, roomId);
                else processExplodingKitten(game, player, drawnCard, roomId);
            }
        } else {
            player.hand.push(drawnCard);
            
            otherPlayers.forEach(p => {
                io.to(p.socketId).emit('game_card_drawn_other', {
                    roomId,
                    playerSocketId: player.socketId,
                    playerUid: player.uid || '',
                    playerUsername: player.username,
                    playerIndex,
                    playerCardCount: player.hand.length,
                    drawPileCount: game.drawPile.length
                });
            });
            
            advanceTurn(game, roomId, io);
        }

        // --- ĐÁNH DẤU SẴN SÀNG HẾT KHÓA (LOCKING) SAU KHI RÚT BÀI XONG ---
        // Không giải phóng khóa ngay lập tức nữa. Chỉ đánh dấu "đã bốc bài xong",
        // khóa CHỈ thực sự hết tác dụng khi lượt chơi chuyển sang người khác
        // (xem hàm expireLocksIfTurnPassed, được gọi sau mỗi lần advanceTurn()).
        if (player.lockedCards && !player.lockedCards.readyToExpire) {
            player.lockedCards.readyToExpire = true;
            console.log(`[Game] ${player.username} đã rút bài xong, khóa 3 lá bài sẽ hết tác dụng khi lượt chuyển sang người khác.`);
        }
        expireLocksIfTurnPassed(game, io, roomId);

        // --- ĐỒNG BỘ TOÀN BỘ SỐ BÀI ---
        broadcastPlayersCardCounts(io, ROOMS, roomId);
        const playersSyncData = game.players.map(p => ({
            socketId: p.socketId,
            uid: p.uid,
            username: p.username,
            cardCount: p.hand.length,
            isFrozen: p.isFrozen
        }));
        const allAlive = game.players.filter(p => p.alive).map(p => p.socketId);
        allAlive.forEach(sid => {
            io.to(sid).emit('game_turn_sync', {
                roomId,
                currentTurnSocketId: game.players[game.currentTurnIndex]?.socketId,
                players: playersSyncData
            });
        });
    };

    socket.on('game_draw_card', ({ roomId }) => {
        const room = ROOMS[roomId];
        if (!room || !room.game || room.game.phase !== 'PLAYING') return;

        const game = room.game;
        
        // Đính kèm performDraw vào game object nếu chưa có để các card logic khác có thể gọi
        if (!game.performDraw) {
            game.performDraw = performDraw;
        }

        const playerIndex = game.players.findIndex(p => p.socketId === socket.id);
        if (playerIndex === -1 || !game.players[playerIndex].alive) return;

        if (playerIndex !== game.currentTurnIndex) return;
        if (game.pendingCardStack && game.pendingCardStack.length > 0) {
            socket.emit('error_msg', 'Đang có bài chờ xử lý, bạn không thể rút bài lúc này!');
            return;
        }
        if (game.drawPile.length <= 0) return;

        const player = game.players[playerIndex];
        performDraw(game, player, roomId, false);
    });

    socket.on('game_place_kitten', ({ roomId, index, kittenCard }) => {
        const room = ROOMS[roomId];
        if (!room || !room.game || room.game.phase !== 'DEFUSING') return;

        const game = room.game;
        let insertIndex = parseInt(index);
        if (isNaN(insertIndex) || insertIndex < 0) insertIndex = 0;
        if (insertIndex > game.drawPile.length) insertIndex = game.drawPile.length;

        game.drawPile.splice(insertIndex, 0, kittenCard);
        
        console.log(`[Game] ${socket.id} đã gài lại bom ở vị trí ${insertIndex}/${game.drawPile.length}`);
        
        // KHÔNG set game.phase = 'PLAYING' ở đây để chặn user spam nút rút bài trong lúc gài bom
        
        const allSocketIds = game.players.map(p => p.socketId);
        allSocketIds.forEach(sid => {
            io.to(sid).emit('game_kitten_placed', {
                roomId,
                drawPileCount: game.drawPile.length
            });
        });

        // Chờ 1300ms cho hoạt ảnh nhét bom vào chồng bài rút hoàn tất trên giao diện tất cả người chơi
        setTimeout(() => {
            game.phase = 'PLAYING';
            advanceTurn(game, roomId, io);
            expireLocksIfTurnPassed(game, io, roomId);
        }, 1300);
    });

    socket.on('game_request_card_counts', ({ roomId }) => {
        const room = ROOMS[roomId];
        if (!room || !room.game) return;
        const counts = getPlayersCardCounts(room.game);
        socket.emit('game_card_counts_update', { roomId, playersCardCounts: counts });
    });
}

module.exports = {
    setupGameActionHandlers,
    checkAndReflectContrast
};
