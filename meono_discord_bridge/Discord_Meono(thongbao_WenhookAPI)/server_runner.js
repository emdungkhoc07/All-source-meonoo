// server_runner.js - Khởi chạy Game Server Mèo Nổ kèm Discord Bridge mà KHÔNG cần sửa bất kỳ file nào trong explodingkittens(sever)
const path = require('path');
const fs = require('fs');

console.log('═══════════════════════════════════════════════════════════════');
console.log('       MEONO x DISCORD WEBHOOK INTEGRATION RUNNER              ');
console.log('   (Không chỉnh sửa hay thay đổi bất kỳ code nào của Server)   ');
console.log('═══════════════════════════════════════════════════════════════');

const serverDir = path.resolve(__dirname, '../explodingkittens(sever)');
const serverFilePath = path.join(serverDir, 'server.js');

if (!fs.existsSync(serverFilePath)) {
  console.error('[Error] Không tìm thấy file game server tại:', serverFilePath);
  process.exit(1);
}

// 1. Nạp module socket.io từ thư mục server và kích hoạt Hook trong RAM
try {
  const socketIoModulePath = path.join(serverDir, 'node_modules', 'socket.io');
  const socketIo = require(socketIoModulePath);
  const { setupHook } = require('./core/hook_engine');
  setupHook(socketIo);
} catch (err) {
  console.error('[Warning] Không thể nạp socket.io để cài đặt hook:', err.message);
}

// 2. Chuyển working directory sang explodingkittens(sever) để server đọc đúng file decks_rankmatch.json, donate.jpg,...
process.chdir(serverDir);

// 3. Khởi chạy game server gốc
console.log('[Runner] Đang nạp server gốc từ:', serverFilePath);
require(serverFilePath);
