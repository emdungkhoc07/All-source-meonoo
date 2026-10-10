function execute({ game, roomId, io, rootAction }) {
    // Lá contrast (Đảo Nghịch) là lá thụ động, không thể đánh trực tiếp từ tay bài
    io.to(rootAction.playerSocketId).emit('error_msg', 'Lá Đảo Nghịch (Contrast) không thể đánh trực tiếp! Hãy click bật ON trên tay để sẵn sàng phản đòn.');
    console.log(`[Game] ${rootAction.username} cố gắng đánh trực tiếp lá Contrast nhưng bị chặn.`);
    game.phase = 'PLAYING';
}

module.exports = { execute };
