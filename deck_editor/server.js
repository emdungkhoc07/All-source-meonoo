// server.js - Server cục bộ nhẹ (Zero Dependencies) cho Trình Biên Tập Decks Rankmatch
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3333;
const DECKS_FILE_PATH = path.join(__dirname, '..', 'explodingkittens(sever)', 'decks_rankmatch.json');
const BACKUP_FILE_PATH = path.join(__dirname, '..', 'explodingkittens(sever)', 'decks_rankmatch.backup.json');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(parsedUrl.pathname);

  // API 1: Lấy dữ liệu file decks_rankmatch.json
  if (req.method === 'GET' && pathname === '/api/deck') {
    try {
      if (fs.existsSync(DECKS_FILE_PATH)) {
        const content = fs.readFileSync(DECKS_FILE_PATH, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(content);
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'File decks_rankmatch.json không tồn tại' }));
      }
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // API 2: Lưu dữ liệu trực tiếp vào file decks_rankmatch.json
  if (req.method === 'POST' && pathname === '/api/deck') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (!data._CARD_IDS) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Dữ liệu không hợp lệ (thiếu _CARD_IDS)' }));
          return;
        }

        // Tạo bản backup file cũ trước khi ghi đè
        if (fs.existsSync(DECKS_FILE_PATH)) {
          fs.copyFileSync(DECKS_FILE_PATH, BACKUP_FILE_PATH);
        }

        const formattedJson = JSON.stringify(data, null, 2);
        fs.writeFileSync(DECKS_FILE_PATH, formattedJson, 'utf-8');

        console.log(`[DeckEditor] Đã lưu thành công vào: ${DECKS_FILE_PATH}`);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Đã lưu thành công vào máy' }));
      } catch (err) {
        console.error('[DeckEditor] Lỗi lưu file:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // API 3: Lưu vào file và TỰ ĐỘNG Push lên GitHub
  if (req.method === 'POST' && pathname === '/api/save-and-push') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (!data._CARD_IDS) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Dữ liệu không hợp lệ (thiếu _CARD_IDS)' }));
          return;
        }

        if (fs.existsSync(DECKS_FILE_PATH)) {
          fs.copyFileSync(DECKS_FILE_PATH, BACKUP_FILE_PATH);
        }

        const formattedJson = JSON.stringify(data, null, 2);
        fs.writeFileSync(DECKS_FILE_PATH, formattedJson, 'utf-8');

        // Chạy lệnh Git để push lên GitHub
        const { exec } = require('child_process');
        const severDir = path.join(__dirname, '..', 'explodingkittens(sever)');
        const gitCmd = `git add decks_rankmatch.json && git commit -m "Update decks_rankmatch.json from Deck Editor" && git push origin main`;

        exec(gitCmd, { cwd: severDir }, (error, stdout, stderr) => {
          if (error) {
            console.error('[DeckEditor] Git push error:', stderr || error.message);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              success: true, 
              gitPushed: false, 
              message: 'Đã lưu vào máy nhưng chưa push được lên GitHub (Vui lòng kiểm tra kết nối mạng)' 
            }));
          } else {
            console.log('[DeckEditor] Git push success:\n', stdout);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              success: true, 
              gitPushed: true, 
              message: 'Đã lưu vào file và đẩy trực tiếp lên GitHub thành công!' 
            }));
          }
        });
      } catch (err) {
        console.error('[DeckEditor] Lỗi lưu & push file:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Phục vụ ảnh từ thư mục explodingkittens(clients)/cards
  if (pathname.startsWith('/explodingkittens(clients)/') || pathname.startsWith('/cards/')) {
    let relativePath = pathname;
    if (pathname.startsWith('/cards/')) {
      relativePath = path.join('..', 'explodingkittens(clients)', pathname);
    } else {
      relativePath = path.join('..', pathname);
    }
    const fullPath = path.resolve(__dirname, relativePath);
    if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
      const ext = path.extname(fullPath).toLowerCase();
      const mime = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': mime });
      fs.createReadStream(fullPath).pipe(res);
      return;
    }
  }

  // Phục vụ static files trong thư mục deck_editor
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME_TYPES[ext] || 'text/plain';
    res.writeHead(200, { 'Content-Type': mime });
    fs.createReadStream(filePath).pipe(res);
  } else {
    // Fallback về index.html
    const indexPath = path.join(__dirname, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(indexPath).pipe(res);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
    }
  }
});

server.listen(PORT, () => {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(` TRÌNH BIÊN TẬP DECKS RANKMATCH ĐANG CHẠY TẠI:`);
  console.log(` 👉 http://localhost:${PORT}`);
  console.log('═══════════════════════════════════════════════════════════════');
});