const { shuffleArray } = require('./deck_logic');
const { getPublicRoomsState, getPlayersCardCounts } = require('./shared_utils');

function clearTurnTimer(game) {
    if (!game) return;
    if (game.turnTimer) {
        clearTimeout(game.turnTimer);
        game.turnTimer = null;
    }
}

function startTurnTimer(game, roomId, io) {
    clearTurnTimer(game);
    if (!game) return;
    if (game.phase === 'FAVOR_CARD_SELECTION' || game.phase === 'SUPERFAVOR_CARD_SELECTION' || game.phase === 'DEFUSING' || game.phase === 'CEREMONY' || game.phase === 'GAME_OVER') return;
    if (game.phase !== 'PLAYING' && !game.phase.endsWith('_SELECTION')) return;

    const currentPlayer = game.players[game.currentTurnIndex];
    if (!currentPlayer || !currentPlayer.alive) return;

    const TURN_SECONDS = 20;
    const TURN_TIMEOUT_MS = TURN_SECONDS * 1000;

    const counts = getPlayersCardCounts(game);
    const allSocketIds = game.players.map(p => p.socketId);
    allSocketIds.forEach(sid => {
        io.to(sid).emit('game_turn_timer', {
            roomId,
            currentTurnSocketId: currentPlayer.socketId,
            currentTurnUsername: currentPlayer.username,
            seconds: TURN_SECONDS,
            timeoutMs: TURN_TIMEOUT_MS,
            timestamp: Date.now(),
            playersCardCounts: counts
        });
        io.to(sid).emit('game_card_counts_update', { roomId, playersCardCounts: counts });
    });

    game.turnTimer = setTimeout(() => {
        game.turnTimer = null;
        if (!game) return;
        if (game.phase === 'GAME_OVER' || game.phase === 'DEFUSING' || game.phase === 'CEREMONY') return;

        // Nếu người chơi đang kẹt ở modal chọn đối thủ (Favor, Slap, Combo, Locking...) mà AFK hết 10s
        if (game.phase.endsWith('_SELECTION') || game.phase.includes('SELECTION')) {
            game.phase = 'PLAYING';
            const socketIds = game.players.map(p => p.socketId);
            socketIds.forEach(sid => {
                io.to(sid).emit('game_close_modals', { roomId });
            });
        }

        // Nếu có card stack chờ Nope thì hoãn
        if (game.pendingCardStack && game.pendingCardStack.length > 0) {
            console.log(`[TurnTimer] Card stack đang chờ xử lý, hoãn auto-draw.`);
            return;
        }

        const activePlayer = game.players[game.currentTurnIndex];
        if (!activePlayer || !activePlayer.alive) return;

        console.log(`[Anti-AFK] Hết 10s không tương tác! Hệ thống tự động rút bài cho ${activePlayer.username} (${activePlayer.socketId})`);

        if (typeof game.performDraw === 'function') {
            game.performDraw(game, activePlayer, roomId, false);
        }
    }, TURN_TIMEOUT_MS);
}

function resetTurnTimer(game, roomId, io) {
    if (!game) return;
    if (game.phase === 'GAME_OVER' || game.phase === 'DEFUSING' || game.phase === 'CEREMONY' || game.phase === 'FAVOR_CARD_SELECTION' || game.phase === 'SUPERFAVOR_CARD_SELECTION') return;
    startTurnTimer(game, roomId, io);
}

function incrementChestPoints(game) {
    if (!game || !game.players) return;
    game.players.forEach(p => {
        if (p.alive && Array.isArray(p.hand)) {
            p.hand.forEach(c => {
                if (c && c.id === 'chest') {
                    c.chestPoints = (typeof c.chestPoints === 'number' ? c.chestPoints : 0) + 1;
                }
            });
        }
    });
}

function broadcastTurnChanged(game, roomId, io, nextIndex, turnsRemaining) {
    incrementChestPoints(game);
    const counts = getPlayersCardCounts(game);
    const allSocketIds = game.players.map(p => p.socketId);
    allSocketIds.forEach(sid => {
        const player = game.players.find(p => p.socketId === sid);
        const chestUpdates = (player && Array.isArray(player.hand))
            ? player.hand.filter(c => c && c.id === 'chest').map(c => ({ uid: c.uid, chestPoints: c.chestPoints || 0 }))
            : [];

        io.to(sid).emit('game_turn_changed', {
            roomId,
            currentTurnSocketId: game.players[nextIndex].socketId,
            currentTurnUsername: game.players[nextIndex].username,
            currentTurnIndex: nextIndex,
            turnsRemaining: turnsRemaining !== undefined ? turnsRemaining : game.turnsRemaining,
            playersCardCounts: counts,
            chestUpdates: chestUpdates
        });
        io.to(sid).emit('game_card_counts_update', { roomId, playersCardCounts: counts });
    });
}

function advanceTurn(game, roomId, io) {
    game.turnsRemaining--;
    if (game.turnsRemaining <= 0) {
        game.turnsRemaining = 1;
        // Tìm người kế tiếp còn sống theo chiều đi hiện tại (turnDirection: 1 hoặc -1)
        const step = game.turnDirection || 1;
        let nextIndex = (game.currentTurnIndex + step + game.players.length) % game.players.length;
        let safety = 0;
        
        while ((!game.players[nextIndex].alive || game.players[nextIndex].skipNextTurn) && safety < game.players.length) {
            if (game.players[nextIndex].skipNextTurn) {
                game.players[nextIndex].skipNextTurn = false;
                
                // Emit toast skipping turn due to freeze
                const allSocketIds = game.players.map(p => p.socketId);
                allSocketIds.forEach(sid => {
                    io.to(sid).emit('game_toast', {
                        title: 'NGỦ ĐÔNG',
                        message: `<span class="toast-username">${game.players[nextIndex].username}</span> đang Ngủ Đông nên bị bỏ qua lượt!`,
                        type: 'info',
                        duration: 3500
                    });
                });
            }
            nextIndex = (nextIndex + step + game.players.length) % game.players.length;
            safety++;
        }
        
        // Khi vòng lặp dừng lại ở một người chơi không bị skip
        // Kiểm tra xem người này có đang đóng băng từ trước không, nếu có thì giải phóng
        if (game.players[nextIndex].isFrozen) {
            game.players[nextIndex].isFrozen = false;
            const allSocketIds = game.players.map(p => p.socketId);
            allSocketIds.forEach(sid => {
                io.to(sid).emit('game_toast', {
                    title: 'THỨC GIẤC',
                    message: `<span class="toast-username">${game.players[nextIndex].username}</span> đã thức giấc và mất trạng thái Ngủ Đông!`,
                    type: 'info',
                    duration: 3500
                });
                io.to(sid).emit('game_freeze_deactivated', {
                    roomId,
                    playerSocketId: game.players[nextIndex].socketId,
                    playerUid: game.players[nextIndex].uid || '',
                    username: game.players[nextIndex].username
                });
            });
        }
        
        game.currentTurnIndex = nextIndex;

        console.log(`[Game] Lượt tiếp theo: ${game.players[nextIndex].username}`);

        // Tích điểm +1 cho tất cả các lá Rương thưởng (chest) trên tay người chơi còn sống khi chuyển lượt
        incrementChestPoints(game);

        // Broadcast lượt mới và đồng bộ số lá bài thời gian thực kèm chestUpdates
        const counts = getPlayersCardCounts(game);
        const allSocketIds = game.players.map(p => p.socketId);
        allSocketIds.forEach(sid => {
            const player = game.players.find(p => p.socketId === sid);
            const chestUpdates = (player && Array.isArray(player.hand))
                ? player.hand.filter(c => c && c.id === 'chest').map(c => ({ uid: c.uid, chestPoints: c.chestPoints || 0 }))
                : [];

            io.to(sid).emit('game_turn_changed', {
                roomId,
                currentTurnSocketId: game.players[nextIndex].socketId,
                currentTurnUsername: game.players[nextIndex].username,
                currentTurnIndex: nextIndex,
                turnsRemaining: game.turnsRemaining,
                playersCardCounts: counts,
                chestUpdates: chestUpdates
            });
            io.to(sid).emit('game_card_counts_update', { roomId, playersCardCounts: counts });
        });

        // --- GIẢI PHÓNG KHÓA BÀI (LOCKING) NẾU LƯỢT ĐÃ THỰC SỰ CHUYỂN SANG NGƯỜI KHÁC ---
        const newCurrentSocketId = game.players[nextIndex].socketId;
        game.players.forEach(p => {
            if (p.lockedCards && p.lockedCards.readyToExpire && p.socketId !== newCurrentSocketId) {
                console.log(`[Game] ${p.username} đã bốc bài xong và lượt đã chuyển sang người khác, giải phóng 3 lá bài bị khóa.`);
                p.lockedCards = null;
                allSocketIds.forEach(sid => {
                    io.to(sid).emit('game_locking_expired', {
                        roomId,
                        victimSocketId: p.socketId,
                        victimUsername: p.username
                    });
                });
            }
        });
    } else {
        // Vẫn là lượt của người hiện tại, nhưng số lượt (turnsRemaining) đã giảm
        const allSocketIds = game.players.map(p => p.socketId);
        allSocketIds.forEach(sid => {
            io.to(sid).emit('game_turn_changed', {
                roomId,
                currentTurnSocketId: game.players[game.currentTurnIndex].socketId,
                currentTurnUsername: game.players[game.currentTurnIndex].username,
                currentTurnIndex: game.currentTurnIndex,
                turnsRemaining: game.turnsRemaining
            });
        });
    }

    // Bắt đầu đếm ngược 10s cho lượt mới (chống AFK)
    startTurnTimer(game, roomId, io);
}

function checkGameOver(game, roomId, io, ROOMS, db, PLAYERS) {
    const alivePlayers = game.players.filter(p => p.alive);
    if (alivePlayers.length <= 1) {
        clearTurnTimer(game);
        let winner = alivePlayers[0];
        if (!winner) {
            if (game.eliminationOrder && game.eliminationOrder.length > 0) {
                const lastEliminated = game.eliminationOrder[game.eliminationOrder.length - 1];
                winner = game.players.find(p => p.socketId === lastEliminated.socketId) || game.players[0];
            } else {
                winner = game.players[0];
            }
            if (winner) winner.alive = true;
        }
        if (!winner) return false;
        console.log('[Game] TRẬN ĐẤU KẾT THÚC! NGƯỜI CHIẾN THẮNG: ' + winner.username);
        
        if (!game.eliminationOrder) game.eliminationOrder = [];
        
        const winnerObj = {
            socketId: winner.socketId,
            uid: winner.uid || (PLAYERS && PLAYERS[winner.socketId] ? PLAYERS[winner.socketId].uid : ''),
            username: winner.username,
            avatar: winner.avatar || (PLAYERS && PLAYERS[winner.socketId] ? PLAYERS[winner.socketId].avatar : '')
        };

        const existingKeys = new Set();
        const finalPlacements = [];

        const getKey = (p) => p.uid || p.username || p.socketId;

        game.eliminationOrder.forEach(p => {
            const key = getKey(p);
            if (key && !existingKeys.has(key)) {
                existingKeys.add(key);
                finalPlacements.push({
                    socketId: p.socketId,
                    uid: p.uid || (PLAYERS && PLAYERS[p.socketId] ? PLAYERS[p.socketId].uid : ''),
                    username: p.username,
                    avatar: p.avatar || (PLAYERS && PLAYERS[p.socketId] ? PLAYERS[p.socketId].avatar : '')
                });
            }
        });

        game.players.forEach(p => {
            const key = getKey(p);
            if (!p.alive && key && !existingKeys.has(key)) {
                existingKeys.add(key);
                finalPlacements.push({
                    socketId: p.socketId,
                    uid: p.uid || (PLAYERS && PLAYERS[p.socketId] ? PLAYERS[p.socketId].uid : ''),
                    username: p.username,
                    avatar: p.avatar || (PLAYERS && PLAYERS[p.socketId] ? PLAYERS[p.socketId].avatar : '')
                });
            }
        });

        const winnerKey = getKey(winnerObj);
        if (winnerKey && !existingKeys.has(winnerKey)) {
            existingKeys.add(winnerKey);
            finalPlacements.push(winnerObj);
        }

        const M = finalPlacements.length;

        // Bảng điểm nền BasePlacement theo số người chơi N (từ 2 đến 10 người)
        const BASE_POINTS_TABLE = {
            2: [-15, 20],
            3: [-25, 10, 30],
            4: [-25, -15, 15, 30],
            5: [-30, -18, 5, 18, 35],
            6: [-35, -22, -12, 10, 25, 40],
            7: [-40, -25, -15, 5, 15, 30, 45],
            8: [-45, -32, -22, -12, 10, 20, 35, 50],
            9: [-50, -36, -26, -16, 5, 15, 25, 40, 55],
            10: [-55, -40, -30, -20, -10, 10, 20, 30, 45, 60]
        };

        function calculateFormula3RankDeltas(placements, scores) {
            const N = placements.length;
            if (N < 2) return [20];

            let baseDeltas = BASE_POINTS_TABLE[N];
            if (!baseDeltas) {
                baseDeltas = BASE_POINTS_TABLE[10];
            }

            const calculatedDeltas = new Array(N).fill(0);
            const halfCutoff = Math.floor(N / 2); // N=4 -> halfCutoff=2 (0,1 là nửa dưới, 2,3 là nửa trên)

            for (let i = 0; i < N; i++) {
                const R_A = scores[i] || 0;
                const basePoint = baseDeltas[i] !== undefined ? baseDeltas[i] : 0;
                let totalEloDelta = 0;

                for (let j = 0; j < N; j++) {
                    if (i === j) continue;
                    const R_B = scores[j] || 0;
                    const E_AB = 1 / (1 + Math.pow(10, (R_B - R_A) / 400));

                    if (i > j) {
                        // A xếp trên B (xếp thứ hạng tốt hơn B) -> A THẮNG B
                        if (R_B > R_A) {
                            // Dưới cơ lật kèo (Underdog Wins) -> Thưởng lớn
                            const kw = 150 + Math.min(60, (R_B - R_A) / 15);
                            totalEloDelta += kw * (1 - E_AB);
                        } else {
                            // Cửa trên thắng cửa dưới (Favorite Wins) -> Chiết khấu
                            const kw = 5 * Math.max(0.1, 1 - (R_A - R_B) / 1200);
                            totalEloDelta += kw * (1 - E_AB);
                        }
                    } else {
                        // A xếp dưới B (xếp thứ hạng kém hơn B) -> A THUA B
                        if (R_A > R_B) {
                            // Cao thủ bị mất mặt thua cửa dưới (Favorite Loses) -> Phạt nặng
                            const kl = 130 + Math.min(50, (R_A - R_B) / 18);
                            totalEloDelta -= kl * E_AB;
                        } else {
                            // Tân thủ thua cao thủ (Underdog Loses) -> Giảm phạt bảo vệ tân thủ
                            totalEloDelta -= 4 * E_AB;
                        }
                    }
                }

                const avgEloDelta = totalEloDelta / (N - 1);
                let finalDelta = Math.round(basePoint + avgEloDelta);

                // CHIA ĐỀU 50/50: Nửa dưới (i < halfCutoff) luôn BỊ TRỪ DIỂM (< 0), Nửa trên (i >= halfCutoff) luôn ĐƯỢC CỘNG ĐIỂM (> 0)
                if (i < halfCutoff) {
                    finalDelta = Math.min(-1, finalDelta);
                } else {
                    finalDelta = Math.max(1, finalDelta);
                }

                calculatedDeltas[i] = finalDelta;
            }

            return calculatedDeltas;
        }

        const roomObj = ROOMS[roomId];
        const isRankmatch = !!(roomObj && roomObj.mode === 'RANK');

        // KHÔNG TÍNH ĐIỂM RANK CHO PHÒNG THƯỜNG: Hiện chữ USER WIN 2s rồi tự kick người chơi & đóng phòng
        if (!isRankmatch) {
            console.log(`[Game Core] Phòng thường (${roomId}) kết thúc: Không tính điểm rank. Chuẩn bị hiện Winner banner và đóng phòng...`);
            setTimeout(() => {
                const room = ROOMS[roomId];
                if (!room || !room.game) return;

                console.log(`[Game Over] Phòng thường: Gửi sự kiện game_over (không tính rank)...`);
                const allSocketIds = room.game.players.map(p => p.socketId);
                allSocketIds.forEach(sid => {
                    io.to(sid).emit('game_over', {
                        winner: winner.username,
                        winnerSocketId: winner.socketId,
                        rankResults: [],
                        isRankmatch: false
                    });
                });

                // Cho client hiện đủ 2.0s và hoàn tất hiệu ứng trước khi giải tán phòng
                setTimeout(() => {
                    const currentRoom = ROOMS[roomId];
                    if (!currentRoom) return;

                    console.log(`[Game Over] Tự động giải tán phòng thường ${roomId}...`);
                    const currentSeats = currentRoom.seats.filter(s => s !== null);
                    currentSeats.forEach(s => {
                        io.to(s.socketId).emit('room_closed');
                    });
                    currentRoom.seats = Array(10).fill(null);
                    currentRoom.hostSocketId = null;
                    currentRoom.hostUsingDeck = null;
                    currentRoom.status = "LOBBY";
                    currentRoom.game = null;
                    currentRoom.chatHistory = [];
                    io.emit('rooms_state', getPublicRoomsState(ROOMS));
                }, 3500);
            }, 3000);

            return true;
        }

        // CƠ CHẾ ĐẶC QUYỀN CHO PHÒNG RANKMATCH: Đọc/Ghi Firebase + Tính toán cộng trừ điểm Rank
        console.log('[Rank Debug] Total players in match (M):', M);
        finalPlacements.forEach((p, i) => {
            console.log('[Rank Debug] Player ' + i + ':', p.username, 'uid=' + p.uid, 'socketId=' + p.socketId);
        });

        // Timer 3000ms (rút bài + nổ + pause) chạy song song với đọc Firebase
        const delayPromise = new Promise(resolve => setTimeout(resolve, 3000));

        // Đọc điểm từ Firebase cho TẤT CẢ người chơi trong lúc đang chờ 2600ms
        const readScorePromises = finalPlacements.map((p) => {
            const memScore = (p.socketId && PLAYERS && PLAYERS[p.socketId] && PLAYERS[p.socketId].rankScore !== undefined) 
                ? (parseInt(PLAYERS[p.socketId].rankScore) || 0) 
                : 0;
            if (p.uid && db) {
                return db.collection('users').doc(p.uid).get().then(docSnap => {
                    if (docSnap.exists) {
                        const data = docSnap.data();
                        return (data.rankScore !== undefined && data.rankScore !== null) ? (parseInt(data.rankScore) || 0) : memScore;
                    }
                    return memScore;
                }).catch(() => memScore);
            }
            return Promise.resolve(memScore);
        });

        // Chờ ĐỒNG THỜI cả delay 2600ms nổ xong lẫn dữ liệu Firebase
        Promise.all([delayPromise, Promise.all(readScorePromises)]).then(([_, currentScores]) => {
            const rankResults = [];
            const writePromises = [];

            // Tính toán delta điểm Rank theo Công thức 3.0 Động
            const pointDeltas = calculateFormula3RankDeltas(finalPlacements, currentScores);
            console.log('[Rank Debug] Point deltas calculated:', JSON.stringify(pointDeltas));

            for (let i = 0; i < finalPlacements.length; i++) {
                const p = finalPlacements[i];
                const delta = pointDeltas[i] !== undefined ? pointDeltas[i] : 0;
                const currentScore = currentScores[i] || 0;
                const newScore = Math.max(0, currentScore + delta);

                rankResults.push({
                    socketId: p.socketId,
                    uid: p.uid,
                    username: p.username,
                    avatar: p.avatar,
                    placement: M - i,
                    oldScore: currentScore,
                    deltaScore: delta,
                    newScore: newScore
                });

                // Cập nhật điểm mới trực tiếp vào bộ nhớ RAM của Server (PLAYERS và room.seats)
                if (p.socketId && PLAYERS && PLAYERS[p.socketId]) {
                    PLAYERS[p.socketId].rankScore = newScore;
                }
                const currentRoom = ROOMS[roomId];
                if (currentRoom && Array.isArray(currentRoom.seats)) {
                    currentRoom.seats.forEach(s => {
                        if (s && (s.socketId === p.socketId || (s.uid && p.uid && s.uid === p.uid))) {
                            s.rankScore = newScore;
                        }
                    });
                }

                if (p.uid && db) {
                    writePromises.push(
                        db.collection('users').doc(p.uid).set({ rankScore: newScore }, { merge: true }).catch(() => {})
                    );
                }
            }

            const room = ROOMS[roomId];
            if (!room || !room.game) return;

            console.log('[Game Over] Emitting game_over (2.6s after explosion triggered)');
            const allSocketIds = room.game.players.map(p => p.socketId);
            allSocketIds.forEach(sid => {
                io.to(sid).emit('game_over', {
                    winner: winner.username,
                    winnerSocketId: winner.socketId,
                    rankResults: rankResults,
                    isRankmatch: true
                });
            });

            // Đặt phòng về trạng thái LOBBY để chủ phòng có thể bắt đầu ván mới nếu muốn
            const roomToReset = ROOMS[roomId];
            if (roomToReset) {
                console.log('[Game Over] Resetting Rankmatch room status to LOBBY.');
                roomToReset.status = "LOBBY";
                roomToReset.game = null;
                io.emit('rooms_state', getPublicRoomsState(ROOMS));
            }

            Promise.all(writePromises).catch(() => {});
        }).catch(err => {
            console.error('[Rank] Error in game over process:', err);
        });

        return true;
    }
    return false;
}

function resolveCardStack(game, roomId, io) {
    if (!game.pendingCardStack || game.pendingCardStack.length === 0) return;
    game.nopeTimer = null;
    
    const stack = game.pendingCardStack;
    // Logic vô hiệu hóa của NOPE: Duyệt từ trên xuống (cái đánh sau vô hiệu hóa cái dưới nó)
    for (let i = 0; i < stack.length; i++) {
        stack[i].isCancelled = false;
    }

    for (let i = stack.length - 1; i >= 0; i--) {
        const effectiveId = stack[i].card.clonedId || stack[i].card.id;
        if ((effectiveId === 'nope' || effectiveId === 'supernope') && !stack[i].isCancelled) {
            for (let j = i - 1; j >= 0; j--) {
                if (!stack[j].isCancelled) {
                    stack[j].isCancelled = true;
                    break;
                }
            }
        }
    }

    // Chuyển toàn bộ vào discardPile
    stack.forEach(item => {
        if (item.card.originalCards) {
            game.discardPile.push(...item.card.originalCards);
        } else {
            game.discardPile.push(item.card);
        }
        // Fix bug F5 (Reconnect during wait_nope):
        // Update playerSocketId to the latest socket.id of that player
        if (item.playerIndex !== undefined && game.players[item.playerIndex]) {
            item.playerSocketId = game.players[item.playerIndex].socketId;
            item.playerUid = game.players[item.playerIndex].uid || item.playerUid || '';
            item.uid = item.playerUid;
        }
    });

    const rootAction = stack[0]; 
    
    const allSocketIds = game.players.map(p => p.socketId);
    
    // Gửi kết quả resolve cho client
    allSocketIds.forEach(sid => {
        io.to(sid).emit('game_card_resolved', {
            roomId,
            stackResult: stack.map(s => ({ card: s.card, isCancelled: s.isCancelled })),
            rootCardId: rootAction.card.clonedId || rootAction.card.id,
            rootIsCancelled: rootAction.isCancelled,
            discardPileCount: game.discardPile.length
        });
    });

    if (!rootAction.isCancelled) {
        const executeId = rootAction.card.clonedId || rootAction.card.id;
        console.log(`[Game] Thực thi chức năng của lá: ${executeId} (Gốc: ${rootAction.card.id})`);
        try {
            const cardLogic = require(`./cards/${executeId}`);
            cardLogic.execute({ game, roomId, io, rootAction, allSocketIds, advanceTurn, shuffleArray });
        } catch (err) {
            console.log(`[Game] Chưa thiết lập logic chức năng cho lá bài: ${executeId}`);
        }
    } else {
        console.log(`[Game] Lá bài gốc ${rootAction.card.id} ĐÃ BỊ CHẶN!`);
        game.phase = 'PLAYING';
    }

    game.pendingCardStack = [];
}

module.exports = {
    advanceTurn,
    checkGameOver,
    resolveCardStack,
    clearTurnTimer,
    startTurnTimer,
    resetTurnTimer,
    incrementChestPoints,
    broadcastTurnChanged
};
