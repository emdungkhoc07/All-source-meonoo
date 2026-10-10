const crypto = require('crypto');

function createCardObject(cardId) {
    let maxArtIndex = 1;
    if (cardId === 'defuse') maxArtIndex = 4;
    else if (cardId === 'exploding_kitten') maxArtIndex = 4;
    else if (cardId === 'super_exploding_kitten') maxArtIndex = 1;
    else if (cardId === 'nope') maxArtIndex = 5;
    else if (cardId === 'nhintruoctuonglai' || cardId === 'nhintruoctuonglai1') maxArtIndex = 4;
    else if (cardId === 'xaobai') maxArtIndex = 3;
    else if (cardId === 'skip' || cardId === 'tancong' || cardId === 'favor' || cardId === 'clone') maxArtIndex = 3;
    else if (cardId === 'freeze') maxArtIndex = 1; // Lá Ngủ Đông
    else maxArtIndex = 1; // for cat cards and anything else

    const card = {
        uid: Math.random().toString(36).substring(2, 9),
        id: cardId,
        artIndex: Math.floor(Math.random() * maxArtIndex) + 1
    };
    if (cardId === 'chest') {
        card.chestPoints = 0;
    }
    return card;
}

function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = crypto.randomInt(0, i + 1);
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

module.exports = {
    createCardObject,
    shuffleArray
};
