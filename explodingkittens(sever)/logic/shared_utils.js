const fs = require('fs');
const path = require('path');

function parseDeck(deckInput) {
    if (Array.isArray(deckInput)) return deckInput;
    if (typeof deckInput === 'object' && deckInput !== null) {
        const flatDeck = [];
        for (const cardId in deckInput) {
            const count = parseInt(deckInput[cardId], 10) || 0;
            for (let i = 0; i < count; i++) {
                flatDeck.push(cardId);
            }
        }
        return flatDeck;
    }
    return [];
}

function getPublicRoomsState(ROOMS) {
    const state = {};
    for (const rId in ROOMS) {
        const r = ROOMS[rId];
        const isRank = (r.mode === 'RANK');
        if (isRank) {
            const playerCount = (r.seats || []).filter(s => s !== null).length;
            if (playerCount >= 2 && playerCount <= 10) {
                try {
                    const jsonPath = path.join(process.cwd(), 'decks_rankmatch.json');
                    if (fs.existsSync(jsonPath)) {
                        const rankDecksData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
                        if (rankDecksData && rankDecksData[playerCount.toString()]) {
                            const cfg = rankDecksData[playerCount.toString()];
                            r.hostUsingDeck = parseDeck(cfg.deck);
                            if (cfg.waitNope !== undefined) r.waitNope = cfg.waitNope;
                        }
                    }
                } catch(e){}
            }
        }
        state[rId] = {
            name: r.name,
            hostSocketId: r.hostSocketId,
            seats: r.seats,
            status: r.status,
            hostUsingDeck: r.hostUsingDeck,
            waitNope: r.waitNope,
            fastPlay: r.fastPlay,
            mode: r.mode || (isRank ? 'RANK' : 'NORMAL'),
            selectedMap: r.selectedMap || 'default'
        };
    }
    return state;
}

function getPlayersCardCounts(game) {
    if (!game || !game.players) return [];
    return game.players.map(p => ({
        uid: p.uid || '',
        username: p.username || '',
        socketId: p.socketId || '',
        cardCount: Array.isArray(p.hand) ? p.hand.length : 0,
        alive: p.alive !== false,
        isFrozen: p.isFrozen === true
    }));
}

function broadcastPlayersCardCounts(io, roomOrGameOrRooms, roomId) {
    let game = null;
    let rId = roomId;
    if (roomOrGameOrRooms) {
        if (roomOrGameOrRooms.players && Array.isArray(roomOrGameOrRooms.players)) {
            game = roomOrGameOrRooms;
        } else if (roomOrGameOrRooms.game && roomOrGameOrRooms.game.players) {
            game = roomOrGameOrRooms.game;
            rId = rId || roomOrGameOrRooms.id;
        } else if (roomId && roomOrGameOrRooms[roomId] && roomOrGameOrRooms[roomId].game) {
            game = roomOrGameOrRooms[roomId].game;
        }
    }
    if (!game || !game.players || !io) return;
    const counts = getPlayersCardCounts(game);
    const allSocketIds = game.players.map(p => p.socketId).filter(Boolean);
    allSocketIds.forEach(sid => {
        io.to(sid).emit('game_card_counts_update', { roomId: rId, playersCardCounts: counts });
    });
}

module.exports = {
    parseDeck,
    getPublicRoomsState,
    getPlayersCardCounts,
    broadcastPlayersCardCounts
};

