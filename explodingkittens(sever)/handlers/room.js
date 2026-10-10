const { getPublicRoomsState } = require('../logic/shared_utils');

function reassignHost(roomId, ROOMS, PLAYERS) {
    const room = ROOMS[roomId];
    if (!room) return;
    room.hostSocketId = null;
    room.hostUsingDeck = [];
    room.waitNope = 2;

    // Tìm người chơi đầu tiên trong phòng để lên làm chủ phòng
    for (let i = 0; i < room.maxSeats; i++) {
        const s = room.seats[i];
        if (s) {
            s.isHost = true;
            room.hostSocketId = s.socketId;
            const hostPlayer = PLAYERS[s.socketId];
            if (hostPlayer && hostPlayer.usingDeckCards) {
                room.hostUsingDeck = hostPlayer.usingDeckCards;
                room.waitNope = hostPlayer.waitNope !== undefined ? hostPlayer.waitNope : 2;
            }
            console.log(`[Server] Người chơi ${s.username} đã trở thành Chủ Phòng mới của ${room.name}`);
            break;
        }
    }
}

function removePlayerFromAnySeat(socketId, ignoreHostReassignRoomId, ROOMS, PLAYERS, io) {
    let changed = false;
    for (const rId in ROOMS) {
        const room = ROOMS[rId];
        for (let i = 0; i < room.maxSeats; i++) {
            const s = room.seats[i];
            if (s && s.socketId === socketId) {
                // NẾU PHÒNG ĐANG CHƠI HOẶC ĐANG ĐẾM NGƯỢC -> Giữ lại ghế để họ có thể reconnect (Vào lại)
                if (room.status === "ĐANG CHƠI" || room.status === "PLAYING" || room.status === "COUNTDOWN" || room.status === "STARTING") {
                    continue;
                }
                
                // WebRTC Signaling: Thông báo cho những người còn lại trong phòng
                const otherPeers = room.seats.filter(seat => seat !== null && seat.socketId !== socketId).map(seat => seat.socketId);
                otherPeers.forEach(pId => {
                    io.to(pId).emit('webrtc_peer_left', { peerId: socketId });
                });
                io.to(socketId).emit('webrtc_leave_all');

                room.seats[i] = null;
                changed = true;
                if (room.hostSocketId === socketId && rId !== ignoreHostReassignRoomId) {
                    reassignHost(rId, ROOMS, PLAYERS);
                }
                if (!room.seats.some(seat => seat !== null)) {
                    room.status = "LOBBY";
                    room.chatHistory = [];
                    console.log(`[Chat Clean] Đã dọn sạch lịch sử nhắn tin phòng ${room.name} (${room.id}) vì phòng trống không còn ai.`);
                }
            }
        }
    }
    return changed;
}

function THUC_HIEN_DONG_PHONG(room, roomId, io, ROOMS) {
    if (!room) return;
    if (room.closeRoomVoteTimer) {
        clearTimeout(room.closeRoomVoteTimer);
        room.closeRoomVoteTimer = null;
    }
    room.closeRoomVoteState = null;

    const allSocketIds = room.seats.filter(s => s !== null).map(s => s.socketId);
    allSocketIds.forEach(sid => {
        io.to(sid).emit('room_closed');
    });
    room.seats = Array(10).fill(null);
    room.hostSocketId = null;
    room.hostUsingDeck = null;
    room.status = "LOBBY";
    room.game = null;
    room.chatHistory = [];
    if (ROOMS) io.emit('rooms_state', getPublicRoomsState(ROOMS));
}

function PHAT_TIN_HIEU_BIEU_QUYET_DONG_PHONG(room, io) {
    if (!room || !room.closeRoomVoteState) return;
    const seats = room.seats.filter(s => s !== null);
    const voteData = {
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
    };
    seats.forEach(s => {
        io.to(s.socketId).emit('vote_close_room_update', voteData);
    });
}

function setupRoomHandlers(socket, io, ROOMS, PLAYERS) {
    // Người chơi tham gia phòng
    socket.on('join_room', ({ roomId, slotIndex }) => {
        const player = PLAYERS[socket.id];
        if (!player) {
            socket.emit('error_msg', "Bạn cần đăng nhập để tham gia phòng!");
            return;
        }
        const room = ROOMS[roomId];
        if (!room) return;
        if (room.status !== "LOBBY") {
            socket.emit('error_msg', "Phòng này đang trong ván đấu hoặc đang bắt đầu, không thể tham gia!");
            return;
        }
        if (slotIndex < 0 || slotIndex >= room.maxSeats) return;

        if (room.seats[slotIndex] !== null && room.seats[slotIndex].socketId !== socket.id) {
            socket.emit('error_msg', "Vị trí này đã có người ngồi!");
            return;
        }

        // Xóa người chơi khỏi ghế cũ
        removePlayerFromAnySeat(socket.id, roomId, ROOMS, PLAYERS, io);

        const isRoomEmpty = room.hostSocketId === null || !room.seats.some(s => s !== null);
        const isHost = isRoomEmpty || (room.hostSocketId === socket.id);

        room.seats[slotIndex] = {
            socketId: socket.id,
            uid: player.uid,
            username: player.username,
            avatar: player.avatar,
            rankScore: player.rankScore !== undefined ? (parseInt(player.rankScore) || 0) : 0,
            isHost: isHost
        };

        if (isHost) {
            room.hostSocketId = socket.id;
            if (room.mode !== 'RANK') {
                room.hostUsingDeck = player.usingDeckCards || [];
                room.waitNope = player.waitNope !== undefined ? player.waitNope : 2;
                console.log(`[Server] ${player.username} làm chủ phòng ${room.name} với bộ bài ${player.usingDeckName || 'mặc định'} (${room.hostUsingDeck.length} lá) - waitNope: ${room.waitNope}`);
            }
        }

        const existingPeers = room.seats.filter(seat => seat !== null && seat.socketId !== socket.id).map(seat => seat.socketId);
        socket.emit('webrtc_room_peers', { peers: existingPeers, roomId: roomId });
        existingPeers.forEach(pId => {
            io.to(pId).emit('webrtc_peer_joined', { peerId: socket.id, roomId: roomId });
        });

        io.emit('rooms_state', getPublicRoomsState(ROOMS));
    });

    socket.on('set_room_mode', ({ roomId, mode }) => {
        const room = ROOMS[roomId];
        if (!room) return;
        if (room.hostSocketId !== socket.id) {
            socket.emit('error_msg', "Chỉ Chủ Phòng mới có quyền thay đổi chế độ chơi!");
            return;
        }
        room.mode = (mode === 'RANK' ? 'RANK' : 'NORMAL');
        if (room.mode === 'NORMAL') {
            const hostPlayer = PLAYERS[room.hostSocketId] || PLAYERS[socket.id];
            if (hostPlayer && hostPlayer.usingDeckCards && hostPlayer.usingDeckCards.length > 0) {
                room.hostUsingDeck = [...hostPlayer.usingDeckCards];
                room.waitNope = hostPlayer.waitNope !== undefined ? hostPlayer.waitNope : 2;
                console.log(`[Server] Phòng ${room.name} (${roomId}) chuyển về NORMAL, nạp lại bộ bài của chủ phòng ${hostPlayer.username} (${room.hostUsingDeck.length} lá, waitNope: ${room.waitNope}s)`);
            } else {
                room.hostUsingDeck = [];
                room.waitNope = 2;
            }
        }
        console.log(`[Server] Phòng ${room.name} (${roomId}) đã chuyển sang chế độ: ${room.mode}`);
        io.emit('rooms_state', getPublicRoomsState(ROOMS));
    });

    socket.on('set_room_map', ({ roomId, mapUrl }) => {
        const room = ROOMS[roomId];
        if (!room) return;
        if (room.hostSocketId !== socket.id) {
            socket.emit('error_msg', "Chỉ Chủ Phòng mới có quyền chọn bản đồ!");
            return;
        }
        room.selectedMap = mapUrl || 'default';
        console.log(`[Server] Phòng ${room.name} (${roomId}) đã chọn bản đồ: ${room.selectedMap}`);
        io.emit('rooms_state', getPublicRoomsState(ROOMS));
    });

    socket.on('webrtc_signal', ({ target, signal }) => {
        if (target) {
            io.to(target).emit('webrtc_signal', {
                sender: socket.id,
                signal: signal
            });
        }
    });

    socket.on('room_chat', ({ text, roomId }) => {
        if (!text || typeof text !== 'string' || !text.trim()) return;
        const msgText = text.trim().substring(0, 120);

        let targetRoomId = roomId;
        let senderSeat = null;

        if (targetRoomId && ROOMS[targetRoomId]) {
            senderSeat = ROOMS[targetRoomId].seats.find(s => s !== null && (s.socketId === socket.id || (socket.userId && s.uid === socket.userId)));
        }

        if (!senderSeat) {
            for (const rId in ROOMS) {
                const room = ROOMS[rId];
                const seat = room.seats.find(s => s !== null && (s.socketId === socket.id || (socket.userId && s.uid === socket.userId)));
                if (seat) {
                    targetRoomId = rId;
                    senderSeat = seat;
                    break;
                }
            }
        }

        if (targetRoomId && ROOMS[targetRoomId]) {
            const room = ROOMS[targetRoomId];
            if (!room.chatHistory) room.chatHistory = [];
            const username = (senderSeat && senderSeat.username) || (PLAYERS[socket.id] && PLAYERS[socket.id].username) || 'Người chơi';
            const userUid = (senderSeat && senderSeat.uid) || socket.userId || null;
            const chatMsg = {
                sender: username,
                senderUid: userUid,
                text: msgText,
                senderSocketId: socket.id,
                roomId: targetRoomId,
                timestamp: Date.now()
            };
            room.chatHistory.push(chatMsg);
            if (room.chatHistory.length > 30) room.chatHistory.shift();

            io.emit('room_chat_msg', chatMsg);
        }
    });

    socket.on('get_room_chat_history', ({ roomId }) => {
        if (roomId && ROOMS[roomId]) {
            socket.emit('room_chat_history', {
                roomId: roomId,
                history: ROOMS[roomId].chatHistory || []
            });
        }
    });

    socket.on('leave_room', () => {
        if (removePlayerFromAnySeat(socket.id, null, ROOMS, PLAYERS, io)) {
            io.emit('rooms_state', getPublicRoomsState(ROOMS));
        }
    });

    socket.on('request_vote_close_room', ({ roomId }) => {
        let room = roomId ? ROOMS[roomId] : null;
        if (!room) {
            for (const rId in ROOMS) {
                const rm = ROOMS[rId];
                if (rm.seats && rm.seats.some(s => s && (s.socketId === socket.id || (PLAYERS[socket.id] && s.uid === PLAYERS[socket.id].uid)))) {
                    room = rm;
                    break;
                }
            }
        }
        if (!room) return;

        const pInfo = PLAYERS[socket.id];
        const seat = room.seats.find(s => s && (s.socketId === socket.id || (pInfo && s.uid === pInfo.uid)));
        if (!seat) return;

        // Cập nhật socket.id mới nếu vừa reconnect
        seat.socketId = socket.id;

        // Nếu đang có biểu quyết hoạt động chưa hết 10s
        if (room.closeRoomVoteState && room.closeRoomVoteState.active && room.closeRoomVoteState.endTime > Date.now()) {
            socket.emit('error_msg', 'Đang có biểu quyết đóng phòng diễn ra!');
            return;
        }

        const activeSeats = room.seats.filter(s => s !== null);
        const totalPlayers = activeSeats.length;
        if (totalPlayers <= 0) return;

        const requesterUid = seat.uid || socket.id;
        const requesterName = seat.username || 'Người chơi';

        if (!room.requestedCloseUids) room.requestedCloseUids = [];
        if (room.requestedCloseUids.includes(requesterUid)) {
            socket.emit('error_msg', 'Bạn đã sử dụng quyền Yêu cầu đóng phòng trong ván này rồi!');
            return;
        }
        room.requestedCloseUids.push(requesterUid);

        const now = Date.now();
        const endTime = now + 10000; // 10 giây

        room.closeRoomVoteState = {
            active: true,
            requesterSocketId: socket.id,
            requesterUid: requesterUid,
            requesterName: requesterName,
            yesVotes: [requesterUid], // Người tạo biểu quyết mặc định chọn ĐỒNG Ý (1 phiếu)
            noVotes: [],
            totalPlayers: totalPlayers,
            startTime: now,
            endTime: endTime
        };

        // Phát tín hiệu hiển thị Popup cho tất cả mọi người trong phòng
        PHAT_TIN_HIEU_BIEU_QUYET_DONG_PHONG(room, io);

        // Trường hợp phòng chỉ có 1 người (đang test solo): Hiện popup 1.5s rồi mới đóng phòng
        if (totalPlayers === 1) {
            if (room.closeRoomVoteTimer) clearTimeout(room.closeRoomVoteTimer);
            room.closeRoomVoteTimer = setTimeout(() => {
                THUC_HIEN_DONG_PHONG(room, room.id || roomId, io, ROOMS);
            }, 1500);
            return;
        }

        // Hẹn giờ tự động hủy sau 10s nếu không đủ phiếu đồng ý
        if (room.closeRoomVoteTimer) clearTimeout(room.closeRoomVoteTimer);
        room.closeRoomVoteTimer = setTimeout(() => {
            if (room.closeRoomVoteState && room.closeRoomVoteState.active) {
                room.closeRoomVoteState = null;
                const currentSeats = room.seats.filter(s => s !== null);
                currentSeats.forEach(s => {
                    io.to(s.socketId).emit('vote_close_room_expired');
                });
            }
        }, 10000);
    });

    socket.on('vote_close_room', ({ roomId, voteChoice }) => {
        let room = roomId ? ROOMS[roomId] : null;
        if (!room) {
            for (const rId in ROOMS) {
                const rm = ROOMS[rId];
                if (rm.seats && rm.seats.some(s => s && (s.socketId === socket.id || (PLAYERS[socket.id] && s.uid === PLAYERS[socket.id].uid)))) {
                    room = rm;
                    break;
                }
            }
        }
        if (!room || !room.closeRoomVoteState || !room.closeRoomVoteState.active) return;
        if (Date.now() > room.closeRoomVoteState.endTime) return;

        const pInfo = PLAYERS[socket.id];
        const seat = room.seats.find(s => s && (s.socketId === socket.id || (pInfo && s.uid === pInfo.uid)));
        if (!seat) return;

        const voterId = seat.uid || socket.id;

        // Nếu người chơi này đã bỏ phiếu rồi thì bỏ qua
        if (room.closeRoomVoteState.yesVotes.includes(voterId) || room.closeRoomVoteState.noVotes.includes(voterId)) {
            return;
        }

        if (voteChoice === 'YES') {
            room.closeRoomVoteState.yesVotes.push(voterId);
        } else if (voteChoice === 'NO') {
            room.closeRoomVoteState.noVotes.push(voterId);
        }

        const totalPlayers = room.closeRoomVoteState.totalPlayers;

        // ĐIỀU KIỆN ĐỒNG Ý: Số phiếu ĐỒNG Ý > 50% tổng số người chơi -> ĐÓNG PHÒNG NGAY LẬP TỨC
        if (room.closeRoomVoteState.yesVotes.length > totalPlayers / 2) {
            THUC_HIEN_DONG_PHONG(room, room.id || roomId, io, ROOMS);
            return;
        }

        // ĐIỀU KIỆN TỪ CHỐI: Số phiếu TỪ CHỐI >= 50% tổng số người chơi -> THẤT BẠI, HỦY POPUP NGAY LẬP TỨC
        if (room.closeRoomVoteState.noVotes.length >= totalPlayers / 2) {
            if (room.closeRoomVoteTimer) clearTimeout(room.closeRoomVoteTimer);
            room.closeRoomVoteState = null;
            const currentSeats = room.seats.filter(s => s !== null);
            currentSeats.forEach(s => {
                io.to(s.socketId).emit('vote_close_room_failed');
            });
            return;
        }

        // Cập nhật lại số liệu phiếu cho tất cả người chơi
        PHAT_TIN_HIEU_BIEU_QUYET_DONG_PHONG(room, io);
    });

    socket.on('kick_player', ({ targetUid, targetSocketId, targetUsername, slotIndex, roomId }) => {
        const senderPlayer = PLAYERS[socket.id];
        let targetRoom = roomId ? ROOMS[roomId] : null;
        if (!targetRoom) {
            for (const rId in ROOMS) {
                const rm = ROOMS[rId];
                if (rm.hostSocketId === socket.id || 
                    (senderPlayer && senderPlayer.uid && rm.seats && rm.seats.some(s => s && s.uid === senderPlayer.uid && s.isHost)) ||
                    (rm.seats && rm.seats.some(s => s && s.socketId === socket.id && s.isHost))) {
                    targetRoom = rm;
                    break;
                }
            }
        }
        if (!targetRoom) return;

        const isHost = (targetRoom.hostSocketId === socket.id) || 
                       (senderPlayer && senderPlayer.uid && targetRoom.seats && targetRoom.seats.some(s => s && s.uid === senderPlayer.uid && s.isHost)) ||
                       (targetRoom.seats && targetRoom.seats.some(s => s && s.socketId === socket.id && s.isHost));
        if (!isHost) {
            socket.emit('error_msg', "Chỉ chủ phòng mới có quyền kick người chơi!");
            return;
        }

        let seatIndex = -1;
        if (typeof slotIndex === 'number' && slotIndex >= 0 && slotIndex < targetRoom.seats.length && targetRoom.seats[slotIndex]) {
            seatIndex = slotIndex;
        } else {
            seatIndex = targetRoom.seats.findIndex(s => s && (
                (targetUid && s.uid === targetUid) ||
                (targetUsername && s.username === targetUsername) ||
                (targetSocketId && s.socketId === targetSocketId)
            ));
        }

        if (seatIndex !== -1) {
            const kickedSeat = targetRoom.seats[seatIndex];
            
            // Không cho phép kick chủ phòng
            if (kickedSeat.isHost) return;

            const kickedSocketId = kickedSeat.socketId;

            // Xóa người chơi khỏi ghế
            targetRoom.seats[seatIndex] = null;

            if (!targetRoom.seats.some(s => s !== null)) {
                targetRoom.status = "LOBBY";
                targetRoom.chatHistory = [];
            }

            // Gửi thông báo bị kick cho tất cả socket liên quan của người chơi đó
            for (const sid in PLAYERS) {
                const p = PLAYERS[sid];
                if (p && ((kickedSeat.uid && p.uid === kickedSeat.uid) || (kickedSeat.username && p.username === kickedSeat.username) || (kickedSocketId && sid === kickedSocketId))) {
                    io.to(sid).emit('player_kicked', { reason: "Bạn đã bị chủ phòng đuổi khỏi phòng!" });
                    io.to(sid).emit('webrtc_leave_all');
                }
            }

            // WebRTC update cho các người chơi còn lại
            const roomPeers = targetRoom.seats.filter(s => s !== null).map(s => s.socketId);
            roomPeers.forEach(pId => {
                if (kickedSocketId) io.to(pId).emit('webrtc_peer_left', { peerId: kickedSocketId });
            });

            // Nếu trận đấu đang diễn ra, loại người chơi khỏi mảng room.game.players và phát thông báo đồng bộ
            if (targetRoom.game && targetRoom.game.players) {
                const pIdx = targetRoom.game.players.findIndex(p => 
                    (targetUid && p.uid === targetUid) ||
                    (targetUsername && p.username === targetUsername) ||
                    (kickedSocketId && p.socketId === kickedSocketId)
                );
                if (pIdx !== -1) {
                    const wasCurrentTurn = (targetRoom.game.currentTurnIndex === pIdx);
                    targetRoom.game.players.splice(pIdx, 1);

                    if (targetRoom.game.players.length > 0) {
                        if (targetRoom.game.currentTurnIndex >= targetRoom.game.players.length) {
                            targetRoom.game.currentTurnIndex = 0;
                        }
                        const newTurnPlayer = targetRoom.game.players[targetRoom.game.currentTurnIndex];

                        const playerPublicInfo = targetRoom.game.players.map(pl => ({
                            socketId: pl.socketId,
                            uid: pl.uid,
                            username: pl.username,
                            avatar: pl.avatar,
                            cardCount: pl.hand ? pl.hand.length : 0,
                            alive: pl.alive !== false,
                            isSeeingFuture: !!pl.seeingFutureTop3 || !!pl.alteringFutureTop3
                        }));

                        // Phát thông báo game_setup cập nhật cho tất cả người chơi còn lại trong trận
                        targetRoom.game.players.forEach(p => {
                            io.to(p.socketId).emit('game_setup', {
                                roomId: targetRoom.id,
                                players: playerPublicInfo,
                                yourHand: p.hand || [],
                                drawPileCount: targetRoom.game.drawPile ? targetRoom.game.drawPile.length : 0,
                                currentTurnSocketId: newTurnPlayer ? newTurnPlayer.socketId : null,
                                currentTurnUsername: newTurnPlayer ? newTurnPlayer.username : '',
                                turnsRemaining: targetRoom.game.turnsRemaining || 1,
                                hostSocketId: targetRoom.hostSocketId,
                                fastReconnect: true,
                                discardPile: targetRoom.game.discardPile || [],
                                selectedMap: targetRoom.selectedMap || 'default',
                                mode: targetRoom.mode || 'NORMAL'
                            });

                            if (newTurnPlayer && wasCurrentTurn) {
                                io.to(p.socketId).emit('game_turn_changed', {
                                    currentTurnSocketId: newTurnPlayer.socketId,
                                    currentTurnUsername: newTurnPlayer.username,
                                    turnsRemaining: targetRoom.game.turnsRemaining
                                });
                            }
                        });
                    } else {
                        targetRoom.game = null;
                        targetRoom.status = "LOBBY";
                    }
                }
            }

            console.log(`[Server] Chủ phòng đã kick ${kickedSeat.username} khỏi phòng ${targetRoom.id}`);
            io.emit('rooms_state', getPublicRoomsState(ROOMS));
        } else {
            console.log(`[Server] Không tìm thấy người chơi cần kick: targetUid=${targetUid}, targetSocketId=${targetSocketId}, targetUsername=${targetUsername}`);
        }
    });

    socket.on('disconnect', () => {
        console.log('[Server] Người chơi đã ngắt kết nối:', socket.id);
        const disconnectedSocketId = socket.id;
        delete PLAYERS[disconnectedSocketId];

        // Giữ ghế trong 3 giây để xử lý F5 (reconnect)
        setTimeout(() => {
            if (removePlayerFromAnySeat(disconnectedSocketId, null, ROOMS, PLAYERS, io)) {
                io.emit('rooms_state', getPublicRoomsState(ROOMS));
            }
        }, 3000);
    });
}

module.exports = {
    reassignHost,
    removePlayerFromAnySeat,
    setupRoomHandlers
};
