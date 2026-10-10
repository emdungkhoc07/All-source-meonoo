const fs = require('fs');
const path = require('path');
const { createCardObject, shuffleArray } = require('../logic/deck_logic');
const { getPublicRoomsState, parseDeck, broadcastPlayersCardCounts } = require('../logic/shared_utils');

function setupGame(room, roomId, io, PLAYERS) {
    const playersInRoom = room.seats.filter(s => s !== null);
    const playerCount = playersInRoom.length;

    // ĐỘC QUYỀN PHÒNG RANKMATCH: Đảm bảo nạp tươi 100% dữ liệu từ file JSON mới nhất khi chia bài
    if (room && room.mode === 'RANK') {
        try {
            const candidatePaths = [
                path.join(process.cwd(), 'decks_rankmatch.json'),
                path.join(process.cwd(), 'explodingkittens(sever)', 'decks_rankmatch.json'),
                path.join(__dirname, '../decks_rankmatch.json')
            ];
            for (const jsonPath of candidatePaths) {
                if (fs.existsSync(jsonPath)) {
                    const rankDecksData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
                    if (rankDecksData && rankDecksData[playerCount.toString()]) {
                        const cfg = rankDecksData[playerCount.toString()];
                        room.hostUsingDeck = parseDeck(cfg.deck);
                        if (cfg.waitNope !== undefined) room.waitNope = cfg.waitNope;
                        console.log(`[Rankmatch setupGame] Đã nạp thành công bộ bài ${room.hostUsingDeck.length} lá cho ${playerCount} người chơi từ ${jsonPath}.`);
                        break;
                    }
                }
            }
        } catch(e) {
            console.error('[Rankmatch setupGame Error]', e);
        }
    } else if (room && room.mode === 'NORMAL') {
        const hostPlayer = (PLAYERS && room.hostSocketId) ? PLAYERS[room.hostSocketId] : null;
        if (hostPlayer && hostPlayer.usingDeckCards && hostPlayer.usingDeckCards.length > 0) {
            room.hostUsingDeck = [...hostPlayer.usingDeckCards];
            if (hostPlayer.waitNope !== undefined) room.waitNope = hostPlayer.waitNope;
            console.log(`[Normal setupGame] Sử dụng bộ bài của host ${hostPlayer.username}: ${hostPlayer.usingDeckName || 'Tùy chỉnh'} (${room.hostUsingDeck.length} lá, waitNope: ${room.waitNope}s)`);
        }
    }

    const deckCardIds = room.hostUsingDeck || [];

    const allCards = deckCardIds.map(id => createCardObject(id));

    const explodingKittens = [];
    const defuseCards = [];
    const remainingCards = [];

    allCards.forEach(card => {
        if (card.id === 'exploding_kitten' || card.id === 'atomicbom' || card.id === 'super_exploding_kitten') {
            explodingKittens.push(card);
        } else if (card.id === 'defuse') {
            defuseCards.push(card);
        } else {
            remainingCards.push(card);
        }
    });

    console.log(`[Game] Setup: ${allCards.length} lá tổng, ${explodingKittens.length} bom, ${defuseCards.length} defuse, ${remainingCards.length} còn lại`);

    shuffleArray(remainingCards);

    const orderedPlayers = [];
    room.seats.forEach((seat) => {
        if (seat !== null) {
            orderedPlayers.push({
                socketId: seat.socketId,
                uid: seat.uid,
                username: seat.username,
                avatar: seat.avatar,
                hand: [],
                alive: true
            });
        }
    });

    const defuseDealSequence = [];
    const defuseDealtCards = []; 
    if (defuseCards.length >= playerCount) {
        for (let p = 0; p < orderedPlayers.length; p++) {
            const defuse = defuseCards.pop();
            orderedPlayers[p].hand.push(defuse);
            defuseDealSequence.push({
                playerIndex: p,
                playerUid: orderedPlayers[p].uid,
                playerSocketId: orderedPlayers[p].socketId,
                username: orderedPlayers[p].username,
                card: { id: defuse.id, uid: defuse.uid, artIndex: defuse.artIndex }
            });
            defuseDealtCards.push(defuse);
        }
    }

    const mainDealSequence = [];
    for (let round = 0; round < 6; round++) {
        for (let p = 0; p < orderedPlayers.length; p++) {
            if (remainingCards.length > 0) {
                const card = remainingCards.pop();
                orderedPlayers[p].hand.push(card);
                mainDealSequence.push({
                    playerIndex: p,
                    playerUid: orderedPlayers[p].uid,
                    playerSocketId: orderedPlayers[p].socketId,
                    username: orderedPlayers[p].username,
                    cardId: card.id
                });
            }
        }
    }

    const reinsertCards = [...defuseCards, ...explodingKittens]; 
    const drawPile = [...remainingCards, ...defuseCards, ...explodingKittens];

    shuffleArray(drawPile);

    const ceremonyExtractedCards = [
        ...explodingKittens.map(c => ({ id: c.id, uid: c.uid, artIndex: c.artIndex })),
        ...defuseDealtCards.map(c => ({ id: c.id, uid: c.uid, artIndex: c.artIndex })),
        ...defuseCards.map(c => ({ id: c.id, uid: c.uid, artIndex: c.artIndex }))
    ];

    const ceremonyReinsertCards = reinsertCards.map(c => ({ id: c.id, uid: c.uid, artIndex: c.artIndex }));

    room.game = {
        mode: room.mode || 'NORMAL',
        hostUsingDeck: Array.isArray(room.hostUsingDeck) ? [...room.hostUsingDeck] : (Array.isArray(deckCardIds) ? [...deckCardIds] : []),
        drawPile: drawPile,
        discardPile: [],
        players: orderedPlayers,
        currentTurnIndex: 0,
        turnsRemaining: 1, 
        turnDirection: 1, 
        phase: 'CEREMONY', 
        ceremonyData: {
            ceremonyExtractedCards,
            defuseDealSequence,
            mainDealSequence,
            ceremonyReinsertCards,
            totalCardsInDeck: allCards.length,
            totalCardsBeforeCeremony: allCards.length,
            explodingKittenCount: explodingKittens.length
        }
    };

    console.log(`[Game] Ceremony bắt đầu: ${orderedPlayers.length} người chơi, ${drawPile.length} lá trong chồng rút`);

    const playerPublicInfo = orderedPlayers.map(p => ({
        socketId: p.socketId,
        uid: p.uid,
        username: p.username,
        avatar: p.avatar,
        alive: p.alive,
        cardCount: p.hand.length,
        isSeeingFuture: !!p.seeingFutureTop3 || !!p.alteringFutureTop3,
        seeingFutureCount: p.seeingFutureTop3 ? p.seeingFutureTop3.length : (p.alteringFutureTop3 ? p.alteringFutureTop3.length : 3),
        seeingOthersHand: p.seeingOthersHand ? {
            targetSocketId: p.seeingOthersHand.targetSocketId,
            targetUsername: p.seeingOthersHand.targetUsername,
            targetUid: p.seeingOthersHand.targetUid || '',
            count: (p.seeingOthersHand.cards || []).length
        } : null,
        beingSeenBy: p.beingSeenBy ? {
            requesterSocketId: p.beingSeenBy.requesterSocketId,
            requesterUsername: p.beingSeenBy.requesterUsername,
            requesterUid: p.beingSeenBy.requesterUid || ''
        } : null
    }));

    room.requestedCloseUids = [];
    room.closeRoomVoteState = null;
    if (room.closeRoomVoteTimer) {
        clearTimeout(room.closeRoomVoteTimer);
        room.closeRoomVoteTimer = null;
    }

    orderedPlayers.forEach(p => {
        io.to(p.socketId).emit('game_setup', {
            roomId,
            players: playerPublicInfo,
            yourHand: p.hand,
            drawPileCount: drawPile.length,
            currentTurnSocketId: orderedPlayers[0].socketId,
            currentTurnUsername: orderedPlayers[0].username,
            turnsRemaining: room.game.turnsRemaining,
            hostSocketId: room.hostSocketId,
            requestedCloseUids: room.requestedCloseUids || [],
            ceremonyExtractedCards,
            defuseDealSequence,
            mainDealSequence,
            ceremonyReinsertCards,
            totalCardsInDeck: allCards.length,
            totalCardsBeforeCeremony: allCards.length,
            explodingKittenCount: explodingKittens.length,
            discardPile: room.game.discardPile,
            selectedMap: room.selectedMap || 'default',
            mode: room.mode || 'NORMAL'
        });
    });
}

function setupGameSetupHandlers(socket, io, ROOMS, PLAYERS, db) {
    socket.on('auth', async (data) => {
        if (!data || !data.uid) return;

        let existingRankScore = PLAYERS[socket.id]?.rankScore;
        if (existingRankScore === undefined || existingRankScore === null || existingRankScore === 0) {
            for (const rId in ROOMS) {
                const r = ROOMS[rId];
                for (const s of (r.seats || [])) {
                    if (s && (s.uid === data.uid || s.socketId === socket.id || (data.username && s.username === data.username)) && s.rankScore !== undefined && s.rankScore !== null && s.rankScore > 0) {
                        existingRankScore = s.rankScore;
                        break;
                    }
                }
                if (existingRankScore !== undefined && existingRankScore > 0) break;
            }
        }

        let finalRankScore = 0;
        if (data.rankScore !== undefined && data.rankScore !== null && !isNaN(parseInt(data.rankScore)) && parseInt(data.rankScore) > 0) {
            finalRankScore = parseInt(data.rankScore);
        } else if (existingRankScore !== undefined && existingRankScore !== null && existingRankScore > 0) {
            finalRankScore = parseInt(existingRankScore);
        }

        // Ưu tiên đọc dữ liệu Rank chính chủ từ Firebase Firestore nếu có
        if (db && data.uid) {
            try {
                const userDoc = await db.collection('users').doc(data.uid).get();
                if (userDoc.exists && userDoc.data().rankScore !== undefined && userDoc.data().rankScore !== null) {
                    finalRankScore = parseInt(userDoc.data().rankScore) || 0;
                }
            } catch(e) {}
        }

        PLAYERS[socket.id] = {
            socketId: socket.id,
            uid: data.uid,
            username: (data.username || 'Người chơi').substring(0, 12),
            avatar: data.avatar || null,
            rankScore: finalRankScore,
            usingDeckName: data.usingDeck || null,
            usingDeckCards: data.usingDeckCards || [],
            waitNope: data.waitNope !== undefined ? data.waitNope : 2
        };
        console.log(`[Server] Player auth: ${PLAYERS[socket.id].username} (${data.uid}) - Rank: ${PLAYERS[socket.id].rankScore} - Received waitNope: ${data.waitNope}, Set to: ${PLAYERS[socket.id].waitNope}`);

        let updated = false;
        for (const rId in ROOMS) {
            const room = ROOMS[rId];
            for (let i = 0; i < room.maxSeats; i++) {
                const s = room.seats[i];
                if (s && (s.socketId === socket.id || (s.uid && data.uid && s.uid === data.uid) || (data.username && s.username === data.username))) {
                    const oldSocketId = s.socketId;
                    s.username = data.username || PLAYERS[socket.id].username;
                    s.avatar = data.avatar || PLAYERS[socket.id].avatar;
                    s.rankScore = finalRankScore;
                    updated = true;
                    
                    const isRoomPlaying = (room.game && room.game.phase !== 'GAME_OVER');
                    const isMatchSocket = (data.matchRoomId === rId || data.isMatchSocket === true);

                    // Nếu phòng đang chơi dở, chỉ cho phép socket từ trang trận đấu (match.html) chiếm quyền game
                    if (!isRoomPlaying || isMatchSocket) {
                        s.socketId = socket.id;
                        if (data.uid) s.uid = data.uid;
                        if (room.hostSocketId === oldSocketId) {
                            room.hostSocketId = socket.id;
                        }
                    }

                    if (isRoomPlaying && (isMatchSocket || !s.socketId)) {
                        const gamePlayer = room.game.players.find(p => 
                            (p.uid && data.uid && p.uid === data.uid) || 
                            p.socketId === socket.id || 
                            p.socketId === oldSocketId ||
                            (data.username && p.username === data.username)
                        );
                        if (gamePlayer) {
                            gamePlayer.socketId = socket.id;
                            if (data.uid) gamePlayer.uid = data.uid;
                            console.log(`[Game] Người chơi ${gamePlayer.username} auth/reconnect vào game (${oldSocketId} -> ${socket.id})`);

                            if (room.game.seetheothersState) {
                                if (room.game.seetheothersState.targetSocketId === oldSocketId || (room.game.seetheothersState.targetUid && room.game.seetheothersState.targetUid === data.uid) || room.game.seetheothersState.targetUsername === gamePlayer.username) {
                                    room.game.seetheothersState.targetSocketId = socket.id;
                                    if (data.uid) room.game.seetheothersState.targetUid = data.uid;
                                    const attacker = room.game.players.find(p => p.socketId === room.game.seetheothersState.requesterSocketId || (room.game.seetheothersState.requesterUid && p.uid === room.game.seetheothersState.requesterUid) || p.username === room.game.seetheothersState.requesterUsername);
                                    if (attacker && attacker.seeingOthersHand) {
                                        attacker.seeingOthersHand.targetSocketId = socket.id;
                                        if (data.uid) attacker.seeingOthersHand.targetUid = data.uid;
                                    }
                                }
                                if (room.game.seetheothersState.requesterSocketId === oldSocketId || (room.game.seetheothersState.requesterUid && room.game.seetheothersState.requesterUid === data.uid) || room.game.seetheothersState.requesterUsername === gamePlayer.username) {
                                    room.game.seetheothersState.requesterSocketId = socket.id;
                                    if (data.uid) room.game.seetheothersState.requesterUid = data.uid;
                                }
                            }

                            const playerPublicInfo = room.game.players.map(p => ({
                                socketId: p.socketId,
                                uid: p.uid,
                                username: p.username,
                                avatar: p.avatar,
                                alive: p.alive,
                                cardCount: p.hand ? p.hand.length : 0,
                                isSeeingFuture: !!p.seeingFutureTop3 || !!p.alteringFutureTop3,
                                seeingFutureCount: p.seeingFutureTop3 ? p.seeingFutureTop3.length : (p.alteringFutureTop3 ? p.alteringFutureTop3.length : 3),
                                seeingOthersHand: p.seeingOthersHand ? {
                                    targetSocketId: p.seeingOthersHand.targetSocketId,
                                    targetUsername: p.seeingOthersHand.targetUsername,
                                    targetUid: p.seeingOthersHand.targetUid || '',
                                    count: (p.seeingOthersHand.cards || []).length
                                } : null,
                                beingSeenBy: p.beingSeenBy ? {
                                    requesterSocketId: p.beingSeenBy.requesterSocketId,
                                    requesterUsername: p.beingSeenBy.requesterUsername,
                                    requesterUid: p.beingSeenBy.requesterUid || ''
                                } : null
                            }));

                            const isCeremony = (room.game.phase === 'CEREMONY');
                            const curTurnIndex = (typeof room.game.currentTurnIndex === 'number' && room.game.players[room.game.currentTurnIndex]) ? room.game.currentTurnIndex : 0;
                            const curTurnPlayer = room.game.players[curTurnIndex];

                            io.to(socket.id).emit('game_setup', {
                                roomId: rId,
                                players: playerPublicInfo,
                                yourHand: gamePlayer.hand || [],
                                drawPileCount: room.game.drawPile ? room.game.drawPile.length : 0,
                                currentTurnSocketId: curTurnPlayer ? curTurnPlayer.socketId : null,
                                currentTurnUsername: curTurnPlayer ? curTurnPlayer.username : '',
                                turnsRemaining: room.game.turnsRemaining || 1,
                                hostSocketId: room.hostSocketId,
                                requestedCloseUids: room.requestedCloseUids || [],
                                fastReconnect: !isCeremony, 
                                discardPile: room.game.discardPile || [],
                                selectedMap: room.selectedMap || 'default',
                                mode: room.mode || 'NORMAL',
                                ...(isCeremony ? room.game.ceremonyData : {
                                    defuseDealSequence: [],
                                    totalCardsInDeck: 0,
                                    explodingKittenCount: 0
                                })
                            });
                            
                            if (gamePlayer.seeingFutureTop3) {
                                io.to(socket.id).emit('game_see_future', { top3: gamePlayer.seeingFutureTop3 });
                            }
                            if (gamePlayer.alteringFutureTop3) {
                                io.to(socket.id).emit('game_alter_future', { top3: gamePlayer.alteringFutureTop3 });
                            }
                            if (gamePlayer.seeingOthersHand) {
                                io.to(socket.id).emit('game_see_the_others', {
                                    targetUsername: gamePlayer.seeingOthersHand.targetUsername,
                                    targetSocketId: gamePlayer.seeingOthersHand.targetSocketId,
                                    targetUid: gamePlayer.seeingOthersHand.targetUid || '',
                                    cards: gamePlayer.seeingOthersHand.cards || []
                                });
                            }

                            // Khôi phục hiệu ứng nhìn bài cho người khác nếu có ai đang nhìn bài
                            const seeingOthersPlayer = room.game.players.find(p => p.seeingOthersHand);
                            if (seeingOthersPlayer && seeingOthersPlayer.socketId !== socket.id) {
                                io.to(socket.id).emit('game_see_the_others_others', {
                                    requesterSocketId: seeingOthersPlayer.socketId,
                                    requesterUsername: seeingOthersPlayer.username,
                                    requesterUid: seeingOthersPlayer.uid || '',
                                    targetSocketId: seeingOthersPlayer.seeingOthersHand.targetSocketId,
                                    targetUsername: seeingOthersPlayer.seeingOthersHand.targetUsername,
                                    targetUid: seeingOthersPlayer.seeingOthersHand.targetUid || '',
                                    count: (seeingOthersPlayer.seeingOthersHand.cards || []).length
                                });
                            }

                            // Khôi phục trạng thái khóa bài (Locking) sau F5/reconnect
                            if (gamePlayer.lockedCards && Array.isArray(gamePlayer.lockedCards.lockedCardUids) && gamePlayer.lockedCards.lockedCardUids.length > 0) {
                                io.to(socket.id).emit('game_locking_applied', {
                                    roomId: rId,
                                    attackerSocketId: gamePlayer.lockedCards.attackerSocketId,
                                    attackerUsername: gamePlayer.lockedCards.attackerUsername,
                                    victimSocketId: socket.id,
                                    victimUsername: gamePlayer.username,
                                    lockedCardUids: gamePlayer.lockedCards.lockedCardUids
                                });
                            }

                            // Khôi phục trạng thái Ngủ đông (Freeze) sau F5/reconnect
                            room.game.players.forEach(p => {
                                if (p.isFrozen) {
                                    io.to(socket.id).emit('game_freeze_activated', {
                                        roomId: rId,
                                        playerSocketId: p.socketId,
                                        playerUid: p.uid || '',
                                        username: p.username
                                    });
                                }
                            });

                            const updatePeers = room.seats.filter(seat => seat !== null && seat.socketId !== socket.id).map(seat => seat.socketId);
                            updatePeers.forEach(sid => {
                                io.to(sid).emit('game_player_socket_updated', {
                                    roomId: rId,
                                    uid: data.uid,
                                    username: s.username,
                                    oldSocketId: oldSocketId,
                                    newSocketId: socket.id
                                });
                            });
                            broadcastPlayersCardCounts(io, room, rId);
                            
                            if (room.game.phase === 'DEFUSING' && room.game.defusingState) {
                                if (room.game.defusingState.playerSocketId === oldSocketId || (room.game.defusingState.uid && room.game.defusingState.uid === data.uid) || room.game.defusingState.username === gamePlayer.username) {
                                    room.game.defusingState.playerSocketId = socket.id;
                                    io.to(socket.id).emit('game_defuse_prompt', {
                                        roomId: rId,
                                        kittenCard: room.game.defusingState.kittenCard,
                                        maxIndex: room.game.drawPile.length,
                                        immediate: true
                                    });
                                } else {
                                    io.to(socket.id).emit('game_defuse_wait', {
                                        roomId: rId,
                                        username: room.game.defusingState.username,
                                        immediate: true
                                    });
                                }
                            }
                            
                            if (room.game.phase === 'FAVOR_TARGET_SELECTION' && room.game.favorState) {
                                if (room.game.favorState.requesterSocketId === oldSocketId || room.game.favorState.requesterSocketId === socket.id || (room.game.favorState.requesterUid && room.game.favorState.requesterUid === data.uid) || room.game.favorState.requesterUsername === gamePlayer.username) {
                                    room.game.favorState.requesterSocketId = socket.id;
                                    room.game.favorState.requesterUid = data.uid || gamePlayer.uid;
                                    const targets = room.game.players.filter(p => p.socketId !== socket.id && p.alive && p.hand.length > 0).map(p => ({
                                        socketId: p.socketId,
                                        username: p.username,
                                        avatar: p.avatar
                                    }));
                                    io.to(socket.id).emit('game_favor_select_target', { roomId: rId, targets });
                                }
                            } else if (room.game.phase === 'FAVOR_CARD_SELECTION' && room.game.favorState) {
                                if (room.game.favorState.requesterSocketId === oldSocketId || room.game.favorState.requesterSocketId === socket.id || (room.game.favorState.requesterUid && room.game.favorState.requesterUid === data.uid) || room.game.favorState.requesterUsername === gamePlayer.username) {
                                    room.game.favorState.requesterSocketId = socket.id;
                                    room.game.favorState.requesterUid = data.uid || gamePlayer.uid;
                                    io.to(socket.id).emit('game_favor_waiting', {
                                        roomId: rId,
                                        targetUsername: room.game.favorState.targetUsername,
                                        requesterUsername: room.game.favorState.requesterUsername
                                    });
                                } else if (room.game.favorState.targetSocketId === oldSocketId || room.game.favorState.targetSocketId === socket.id || (room.game.favorState.targetUid && room.game.favorState.targetUid === data.uid) || room.game.favorState.targetUsername === gamePlayer.username) {
                                    room.game.favorState.targetSocketId = socket.id;
                                    room.game.favorState.targetUid = data.uid || gamePlayer.uid;
                                    io.to(socket.id).emit('game_favor_give_card_req', {
                                        roomId: rId,
                                        requesterUsername: room.game.favorState.requesterUsername
                                    });
                                } else {
                                    io.to(socket.id).emit('game_favor_waiting', {
                                        roomId: rId,
                                        targetUsername: room.game.favorState.targetUsername,
                                        requesterUsername: room.game.favorState.requesterUsername
                                    });
                                }
                            } else if (room.game.phase === 'SUPERFAVOR_CARD_SELECTION' && room.game.superfavorState) {
                                const state = room.game.superfavorState;
                                const totalCount = (state.targets || []).length;
                                const givenCount = (state.targets || []).filter(t => t.hasGiven).length;
                                const remainingCount = totalCount - givenCount;

                                const isReq = (state.requesterSocketId === oldSocketId || state.requesterSocketId === socket.id || (state.requesterUid && state.requesterUid === data.uid) || state.requesterUsername === gamePlayer.username);
                                if (isReq) {
                                    state.requesterSocketId = socket.id;
                                    state.requesterUid = data.uid || gamePlayer.uid;
                                    io.to(socket.id).emit('game_favor_waiting', {
                                        roomId: rId,
                                        targetUsername: 'tất cả mọi người',
                                        requesterUsername: state.requesterUsername,
                                        isSuperFavor: true,
                                        givenCount,
                                        totalCount,
                                        remainingCount
                                    });
                                } else {
                                    const targetEntry = (state.targets || []).find(t => 
                                        (t.uid && data.uid && t.uid === data.uid) || 
                                        t.username === gamePlayer.username || 
                                        t.socketId === oldSocketId || 
                                        t.socketId === socket.id
                                    );
                                    if (targetEntry) {
                                        targetEntry.socketId = socket.id;
                                        if (data.uid) targetEntry.uid = data.uid;
                                        if (!targetEntry.hasGiven) {
                                            io.to(socket.id).emit('game_favor_give_card_req', {
                                                roomId: rId,
                                                requesterUsername: state.requesterUsername,
                                                isSuperFavor: true
                                            });
                                        } else {
                                            io.to(socket.id).emit('game_favor_waiting', {
                                                roomId: rId,
                                                targetUsername: 'tất cả mọi người',
                                                requesterUsername: state.requesterUsername,
                                                isSuperFavor: true,
                                                givenCount,
                                                totalCount,
                                                remainingCount
                                            });
                                        }
                                    } else {
                                        io.to(socket.id).emit('game_favor_waiting', {
                                            roomId: rId,
                                            targetUsername: 'tất cả mọi người',
                                            requesterUsername: state.requesterUsername,
                                            isSuperFavor: true,
                                            givenCount,
                                            totalCount,
                                            remainingCount
                                        });
                                    }
                                }
                            }
                            
                            if (room.game.phase === 'COMBO_2_TARGET_SELECTION' && room.game.comboState) {
                                if (room.game.comboState.requesterSocketId === oldSocketId || room.game.comboState.requesterSocketId === socket.id || (room.game.comboState.requesterUid && room.game.comboState.requesterUid === data.uid) || room.game.comboState.requesterUsername === gamePlayer.username) {
                                    room.game.comboState.requesterSocketId = socket.id;
                                    room.game.comboState.requesterUid = data.uid || gamePlayer.uid;
                                    const targets = room.game.players.filter(p => p.socketId !== socket.id && p.alive && p.hand.length > 0).map(p => ({
                                        socketId: p.socketId,
                                        username: p.username,
                                        avatar: p.avatar
                                    }));
                                    io.to(socket.id).emit('game_combo_select_target', { roomId: rId, targets, comboType: 2 });
                                }
                            } else if (room.game.phase === 'COMBO_3_TARGET_SELECTION' && room.game.comboState) {
                                if (room.game.comboState.requesterSocketId === oldSocketId || room.game.comboState.requesterSocketId === socket.id || (room.game.comboState.requesterUid && room.game.comboState.requesterUid === data.uid) || room.game.comboState.requesterUsername === gamePlayer.username) {
                                    room.game.comboState.requesterSocketId = socket.id;
                                    room.game.comboState.requesterUid = data.uid || gamePlayer.uid;
                                    const targets = room.game.players.filter(p => p.socketId !== socket.id && p.alive && p.hand.length > 0).map(p => ({
                                        socketId: p.socketId,
                                        username: p.username,
                                        avatar: p.avatar
                                    }));
                                    io.to(socket.id).emit('game_combo_select_target', { roomId: rId, targets, comboType: 3 });
                                }
                            } else if (room.game.phase === 'COMBO_3_CARD_SELECTION' && room.game.comboState) {
                                if (room.game.comboState.requesterSocketId === oldSocketId || room.game.comboState.requesterSocketId === socket.id || (room.game.comboState.requesterUid && room.game.comboState.requesterUid === data.uid) || room.game.comboState.requesterUsername === gamePlayer.username) {
                                    room.game.comboState.requesterSocketId = socket.id;
                                    room.game.comboState.requesterUid = data.uid || gamePlayer.uid;
                                    io.to(socket.id).emit('game_combo_3_select_card', {
                                        roomId: rId,
                                        targetUsername: room.game.comboState.targetUsername
                                    });
                                }
                            } else if (room.game.phase === 'COMBO_5_CARD_SELECTION' && room.game.comboState) {
                                if (room.game.comboState.requesterSocketId === oldSocketId || room.game.comboState.requesterSocketId === socket.id || (room.game.comboState.requesterUid && room.game.comboState.requesterUid === data.uid) || room.game.comboState.requesterUsername === gamePlayer.username) {
                                    room.game.comboState.requesterSocketId = socket.id;
                                    room.game.comboState.requesterUid = data.uid || gamePlayer.uid;
                                    io.to(socket.id).emit('game_combo_5_select_card', {
                                        roomId: rId,
                                        discardPile: room.game.discardPile || []
                                    });
                                }
                            }

                            if (room.game.phase === 'SLAP_TARGET_SELECTION' && room.game.slapState) {
                                if (room.game.slapState.requesterSocketId === oldSocketId || room.game.slapState.requesterSocketId === socket.id || (room.game.slapState.requesterUid && room.game.slapState.requesterUid === data.uid) || room.game.slapState.requesterUsername === gamePlayer.username) {
                                    room.game.slapState.requesterSocketId = socket.id;
                                    const targets = room.game.players.filter(p => p.socketId !== socket.id && p.alive && !p.isFrozen).map(p => ({
                                        socketId: p.socketId,
                                        username: p.username,
                                        avatar: p.avatar
                                    }));
                                    io.to(socket.id).emit('game_slap_select_target', {
                                        roomId: rId,
                                        targets,
                                        count: room.game.slapState.count
                                    });
                                }
                            }

                            if (room.game.phase === 'INFERNO_TARGET_SELECTION' && room.game.infernoState) {
                                if (room.game.infernoState.requesterSocketId === oldSocketId || room.game.infernoState.requesterSocketId === socket.id || (room.game.infernoState.requesterUid && room.game.infernoState.requesterUid === data.uid) || room.game.infernoState.requesterUsername === gamePlayer.username) {
                                    room.game.infernoState.requesterSocketId = socket.id;
                                    const targets = room.game.players.filter(p => p.socketId !== socket.id && p.alive && !p.isFrozen).map(p => ({
                                        socketId: p.socketId,
                                        username: p.username,
                                        avatar: p.avatar
                                    }));
                                    io.to(socket.id).emit('game_inferno_select_target', {
                                        roomId: rId,
                                        targets,
                                        burnCount: room.game.infernoState.burnCount
                                    });
                                }
                            }

                            if (room.game.phase === 'SEETHEOTHERS_TARGET_SELECTION' && room.game.seetheothersState) {
                                if (room.game.seetheothersState.requesterSocketId === oldSocketId || room.game.seetheothersState.requesterSocketId === socket.id || (room.game.seetheothersState.requesterUid && room.game.seetheothersState.requesterUid === data.uid) || room.game.seetheothersState.requesterUsername === gamePlayer.username) {
                                    room.game.seetheothersState.requesterSocketId = socket.id;
                                    const targets = room.game.players.filter(p => p.alive && !p.isFrozen && p.socketId !== socket.id && p.hand && p.hand.length > 0).map(p => ({
                                        socketId: p.socketId,
                                        uid: p.uid || '',
                                        username: p.username,
                                        avatar: p.avatar || '',
                                        cardCount: p.hand.length
                                    }));
                                    io.to(socket.id).emit('game_seetheothers_select_target', {
                                        roomId: rId,
                                        targets
                                    });
                                }
                            }

                            if (room.game.phase === 'SEETHEOTHERS_VIEWING' && room.game.seetheothersState) {
                                if (room.game.seetheothersState.requesterSocketId === oldSocketId || room.game.seetheothersState.requesterSocketId === socket.id || (room.game.seetheothersState.requesterUid && room.game.seetheothersState.requesterUid === data.uid) || room.game.seetheothersState.requesterUsername === gamePlayer.username) {
                                    room.game.seetheothersState.requesterSocketId = socket.id;
                                    const target = findGamePlayer(room.game.players, room.game.seetheothersState.targetSocketId, room.game.seetheothersState.targetUid, room.game.seetheothersState.targetUsername);
                                    if (target && target.hand) {
                                        io.to(socket.id).emit('game_see_the_others', {
                                            targetUsername: target.username,
                                            targetSocketId: target.socketId,
                                            targetUid: target.uid || '',
                                            cards: target.hand
                                        });
                                    }
                                } else {
                                    const target = findGamePlayer(room.game.players, room.game.seetheothersState.targetSocketId, room.game.seetheothersState.targetUid, room.game.seetheothersState.targetUsername);
                                    if (target) {
                                        io.to(socket.id).emit('game_see_the_others_others', {
                                            requesterSocketId: room.game.seetheothersState.requesterSocketId,
                                            requesterUsername: room.game.seetheothersState.requesterUsername,
                                            requesterUid: room.game.seetheothersState.requesterUid || '',
                                            targetSocketId: target.socketId,
                                            targetUsername: target.username,
                                            targetUid: target.uid || '',
                                            count: target.hand ? target.hand.length : 0
                                        });
                                    }
                                }
                            }
                        }

                        const roomPeers = room.seats.filter(seat => seat !== null && seat.socketId !== socket.id).map(seat => seat.socketId);
                        socket.emit('webrtc_room_peers', { peers: roomPeers, roomId: rId });
                        roomPeers.forEach(sid => {
                            io.to(sid).emit('webrtc_peer_left', { peerId: oldSocketId });
                            io.to(sid).emit('webrtc_peer_joined', { peerId: socket.id, roomId: rId });
                        });

                        if (room.closeRoomVoteState && room.closeRoomVoteState.active && room.closeRoomVoteState.endTime > Date.now()) {
                            io.to(socket.id).emit('vote_close_room_update', {
                                active: room.closeRoomVoteState.active,
                                requesterSocketId: room.closeRoomVoteState.requesterSocketId,
                                requesterUid: room.closeRoomVoteState.requesterUid,
                                requesterName: room.closeRoomVoteState.requesterName,
                                yesCount: room.closeRoomVoteState.yesVotes.length,
                                noCount: room.closeRoomVoteState.noVotes.length,
                                totalPlayers: room.closeRoomVoteState.totalPlayers,
                                yesVotes: room.closeRoomVoteState.yesVotes,
                                noVotes: room.closeRoomVoteState.noVotes,
                                endTime: room.closeRoomVoteState.endTime
                            });
                        }
                    }

                    updated = true;
                }
            }
        }
        
        if (data.matchRoomId) {
            const requestedRoom = ROOMS[data.matchRoomId];
            let inRequestedRoom = false;
            let roomIsPlaying = false;
            
            if (requestedRoom) {
                if (requestedRoom.status === "ĐANG CHƠI" || requestedRoom.status === "PLAYING" || requestedRoom.status === "COUNTDOWN" || requestedRoom.status === "STARTING" || requestedRoom.game) {
                    roomIsPlaying = true;
                }
                for (let i = 0; i < requestedRoom.maxSeats; i++) {
                    const s = requestedRoom.seats[i];
                    if (s && (s.uid === data.uid || (data.username && s.username === data.username) || s.socketId === socket.id)) {
                        inRequestedRoom = true;
                        break;
                    }
                }
                if (!inRequestedRoom && requestedRoom.game && requestedRoom.game.players) {
                    const gp = requestedRoom.game.players.find(p => (data.uid && p.uid === data.uid) || (data.username && p.username === data.username) || p.socketId === socket.id);
                    if (gp) inRequestedRoom = true;
                }
            }
            
            if (!inRequestedRoom || !roomIsPlaying) {
                console.log(`[Server] Auth check rejected for matchRoomId ${data.matchRoomId} (inRoom: ${inRequestedRoom}, playing: ${roomIsPlaying})`);
                socket.emit('match_rejected', { reason: "Ván đấu đã kết thúc hoặc không tồn tại." });
            }
        }

        try {
            const userDoc = await db.collection('users').doc(data.uid).get();
            if (userDoc.exists) {
                const userData = userDoc.data();
                if (userData.settings) {
                    socket.emit('settings_sync', userData.settings);
                }
            }
        } catch (e) {
            console.error('[Firebase] Error loading settings:', e);
        }

        if (updated) {
            io.emit('rooms_state', getPublicRoomsState(ROOMS));
        }
    });

    socket.on('update_deck', (data) => {
        if (!PLAYERS[socket.id]) return;
        PLAYERS[socket.id].usingDeckName = data.usingDeck;
        PLAYERS[socket.id].usingDeckCards = data.usingDeckCards || [];
        PLAYERS[socket.id].waitNope = data.waitNope !== undefined ? data.waitNope : 2;
        console.log(`[Server] Player ${PLAYERS[socket.id].username} updated deck. waitNope received: ${data.waitNope}, set to: ${PLAYERS[socket.id].waitNope}`);
        
        for (const rId in ROOMS) {
            if (ROOMS[rId].hostSocketId === socket.id) {
                if (ROOMS[rId].mode === 'RANK') continue; // ĐỘC QUYỀN PHÒNG RANKMATCH: Không cho phép host dùng bài cá nhân đè bài Rankmatch
                ROOMS[rId].hostUsingDeck = PLAYERS[socket.id].usingDeckCards;
                ROOMS[rId].waitNope = PLAYERS[socket.id].waitNope;
                console.log(`[Server] Room ${rId} waitNope updated to: ${ROOMS[rId].waitNope}`);
                io.emit('rooms_state', getPublicRoomsState(ROOMS));
            }
        }
    });

    socket.on('update_settings', async (settings) => {
        const player = PLAYERS[socket.id];
        if (!player || !player.uid) return;
        try {
            await db.collection('users').doc(player.uid).set({ settings: settings }, { merge: true });
        } catch (e) {
            console.error('[Firebase] Error saving settings:', e);
        }
    });

    socket.on('get_leaderboard', async () => {
        try {
            const snapshot = await db.collection('users').get();
            const list = [];
            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                list.push({
                    uid: docSnap.id,
                    username: data.username || 'Người chơi',
                    avatar: data.avatarBase64 || '',
                    rankScore: data.rankScore !== undefined ? parseInt(data.rankScore) || 0 : 0
                });
            });
            // Sắp xếp giảm dần theo điểm rankScore trong RAM
            list.sort((a, b) => b.rankScore - a.rankScore);
            socket.emit('leaderboard_data', { success: true, list });
        } catch (err) {
            console.error('[Server Error] Lỗi get_leaderboard:', err);
            socket.emit('leaderboard_data', { success: false, error: err.message });
        }
    });

    socket.on('start_room', ({ roomId }) => {
        const room = ROOMS[roomId];
        if (!room) return;
        if (room.hostSocketId !== socket.id) {
            socket.emit('error_msg', "Chỉ Chủ Phòng mới có quyền bắt đầu ván đấu!");
            return;
        }

        const playersInRoom = room.seats.filter(s => s !== null);
        const playerCount = playersInRoom.length;

        if (playerCount < 2 || playerCount > 10) {
            socket.emit('error_msg', `ĐIỀU KIỆN BẮT ĐẦU:\nPhòng cần tối thiểu 2 người chơi và tối đa 10 người chơi (hiện có ${playerCount} người).`);
            return;
        }

        // ĐỘC QUYỀN PHÒNG RANKMATCH: Nạp bộ bài & waitNope theo số người chơi từ decks_rankmatch.json ở root
        if (room.mode === 'RANK') {
            try {
                const jsonPath = path.join(process.cwd(), 'decks_rankmatch.json');
                if (fs.existsSync(jsonPath)) {
                    const rankDecksData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
                    if (rankDecksData && rankDecksData[playerCount.toString()]) {
                        const cfg = rankDecksData[playerCount.toString()];
                        room.hostUsingDeck = parseDeck(cfg.deck);
                        if (cfg.waitNope !== undefined) room.waitNope = cfg.waitNope;
                        console.log(`[Rankmatch] Nạp bộ bài độc quyền cho ${playerCount} người chơi từ decks_rankmatch.json (${room.hostUsingDeck.length} lá, waitNope: ${room.waitNope}ms)`);
                    }
                }
            } catch(e) {
                console.error('[Rankmatch Error] Lỗi nạp bộ bài từ decks_rankmatch.json:', e);
            }
        } else {
            // NORMAL MODE: Luôn nạp đúng bộ bài của chủ phòng hiện tại
            const hostPlayer = PLAYERS[room.hostSocketId] || PLAYERS[socket.id];
            if (hostPlayer && hostPlayer.usingDeckCards && hostPlayer.usingDeckCards.length > 0) {
                room.hostUsingDeck = [...hostPlayer.usingDeckCards];
                if (hostPlayer.waitNope !== undefined) room.waitNope = hostPlayer.waitNope;
                console.log(`[Normal Match start_room] Nạp bộ bài của Host ${hostPlayer.username}: ${hostPlayer.usingDeckName || 'Tùy chỉnh'} (${room.hostUsingDeck.length} lá, waitNope: ${room.waitNope}s)`);
            }
        }

        const explodingKittenCount = (room.hostUsingDeck || []).filter(id => id === 'exploding_kitten' || id === 'super_exploding_kitten').length;
        const streakingCount = (room.hostUsingDeck || []).filter(id => id === 'streaking').length;
        const requiredKittens = (playerCount - 1) + streakingCount;

        if (explodingKittenCount < requiredKittens) {
            socket.emit('error_msg', `ĐIỀU KIỆN BẮT ĐẦU:\nBộ bài cần tối thiểu ${requiredKittens} lá Exploding Kitten (${playerCount - 1} lá cho ${playerCount} người chơi + ${streakingCount} lá Streaking). Hiện chỉ có ${explodingKittenCount} lá Exploding Kitten (Lá Atomic Bom không tính vào số lượng lá Mèo nổ này).`);
            return;
        }

        console.log(`[Server] Phòng ${room.name} đủ điều kiện (${playerCount} người, ${explodingKittenCount} mèo nổ), đếm ngược bắt đầu...`);
        room.status = "COUNTDOWN";
        io.emit('rooms_state', getPublicRoomsState(ROOMS));
        
        const roomPeers = room.seats.filter(s => s !== null).map(s => s.socketId);
        roomPeers.forEach(pId => {
            io.to(pId).emit('room_countdown_start', { roomId, seconds: 3 });
        });

        setTimeout(() => {
            if (ROOMS[roomId] && ROOMS[roomId].seats.filter(s => s !== null).length >= 2) {
                room.status = "ĐANG CHƠI";
                io.emit('rooms_state', getPublicRoomsState(ROOMS));
                setupGame(room, roomId, io, PLAYERS);
            }
        }, 3000);
    });
}

module.exports = {
    setupGameSetupHandlers
};
