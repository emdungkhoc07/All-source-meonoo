function execute({ game, io, roomId, rootAction, allSocketIds }) {
    // Lấy toàn bộ lá exploding_kitten ra khỏi chồng bài rút
    const bombCards = game.drawPile.filter(c => c.id === 'exploding_kitten');
    game.drawPile = game.drawPile.filter(c => c.id !== 'exploding_kitten');

    // Đảm bảo mỗi lá bom đều có artIndex chuẩn (1-4)
    bombCards.forEach(c => {
        if (!c.artIndex) {
            c.artIndex = Math.floor(Math.random() * 4) + 1;
        }
    });

    // Đặt tất cả lá bom lên ĐẦU chồng bài rút (cuối mảng = trên đầu bài)
    // Giữ nguyên thứ tự tuyệt đối này trong drawPile
    game.drawPile.push(...bombCards);

    const drawPileCount = game.drawPile.length;

    // Tạo mảng thông tin lá bom kèm artIndex gửi về client
    const bombList = bombCards.map(c => ({
        id: c.id,
        artIndex: c.artIndex,
        uid: c.uid
    }));

    // Broadcast sự kiện theend cho tất cả người chơi
    allSocketIds.forEach(sid => {
        io.to(sid).emit('game_theend', {
            playerSocketId: rootAction.playerSocketId,
            username: rootAction.username,
            bombCount: bombCards.length,
            bombList: bombList,
            drawPileCount
        });
    });
}

module.exports = { execute };
