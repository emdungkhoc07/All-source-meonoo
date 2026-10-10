// v2026.08.08-afterthefuture5
require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { initializeApp, cert } = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

// Khởi tạo Firebase Admin (Ưu tiên đọc từ biến môi trường Render.com, nếu không có sẽ đọc file local)
let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (e) {
        console.error("[Firebase Error] Lỗi parse biến môi trường FIREBASE_SERVICE_ACCOUNT:", e);
    }
} else {
    try {
        serviceAccount = require('../config/service-account.json');
    } catch (e) {
        try {
            serviceAccount = require('./config/service-account.json');
        } catch (err) {
            console.error("[Firebase Error] Không tìm thấy file service-account.json local:", err);
        }
    }
}

if (serviceAccount) {
    initializeApp({
        credential: cert(serviceAccount)
    });
} else {
    console.error("[Firebase Error] CRITICAL: Không cấu hình được Firebase Service Account!");
}
const db = getFirestore();
const authAdmin = getAuth();

const ADMIN_SECRET_KEY = process.env.ADMIN_SECRET_KEY || 'nth22122007';

const app = express();
app.use(cors());
app.use(express.json());

// Tường lửa bảo vệ: Chặn mọi request truy cập file .json trong thư mục config
app.use('/config', (req, res, next) => {
    if (req.url.endsWith('.json')) {
        return res.status(403).send('Forbidden: Access to configuration files is denied.');
    }
    next();
});

// Middleware bảo mật cho Admin API
const requireAdminAuth = (req, res, next) => {
    const key = req.headers['x-admin-key'] || req.query.adminKey || (req.body && req.body.adminKey);
    const validKeys = [ADMIN_SECRET_KEY, 'nth22122007', 'meono_admin_2026'];
    if (!key || !validKeys.includes(key)) {
        return res.status(401).json({ success: false, message: 'Từ chối truy cập: Mã bảo mật Admin không chính xác!' });
    }
    next();
};

// --- ADMIN MANAGEMENT REST API ---
app.post('/api/admin/verify', (req, res) => {
    const key = req.headers['x-admin-key'] || req.body.key;
    const validKeys = [ADMIN_SECRET_KEY, 'nth22122007', 'meono_admin_2026'];
    if (key && validKeys.includes(key)) {
        return res.json({ success: true, message: 'Xác thực Admin thành công!' });
    }
    return res.status(401).json({ success: false, message: 'Mã khóa Admin không hợp lệ!' });
});

app.get('/api/admin/users', requireAdminAuth, async (req, res) => {
    try {
        let authUsers = [];
        try {
            let nextPageToken;
            do {
                const listUsersResult = await authAdmin.listUsers(1000, nextPageToken);
                authUsers = authUsers.concat(listUsersResult.users);
                nextPageToken = listUsersResult.pageToken;
            } while (nextPageToken);
        } catch (e) {
            console.error('[Admin API] Error listing auth users:', e);
        }

        let firestoreUsers = new Map();
        try {
            const snap = await db.collection('users').get();
            snap.forEach(docSnap => {
                firestoreUsers.set(docSnap.id, docSnap.data());
            });
        } catch (e) {
            console.error('[Admin API] Error listing firestore users:', e);
        }

        const allUids = new Set([...authUsers.map(u => u.uid), ...firestoreUsers.keys()]);
        const mergedList = [];

        allUids.forEach(uid => {
            const authU = authUsers.find(u => u.uid === uid);
            const fsU = firestoreUsers.get(uid) || {};

            const providers = authU && authU.providerData ? authU.providerData.map(p => p.providerId) : [];
            const isGoogle = providers.includes('google.com') || (authU && authU.email && authU.email.includes('@gmail.com'));

            // Ưu tiên thời gian online chính xác khi người chơi truy cập home.html (fsU.lastOnline)
            const exactLastOnline = fsU.lastOnline || fsU.lastActive || (authU && authU.metadata && authU.metadata.lastSignInTime) || fsU.createdAt || '';

            mergedList.push({
                uid: uid,
                email: (authU && authU.email) || fsU.email || 'Không có email',
                emailVerified: authU ? authU.emailVerified : false,
                username: fsU.username || (authU && authU.displayName) || 'Chưa đặt tên',
                avatarBase64: fsU.avatarBase64 || '',
                rankScore: fsU.rankScore !== undefined ? fsU.rankScore : 0,
                createdAt: (authU && authU.metadata && authU.metadata.creationTime) || fsU.createdAt || '',
                lastOnline: exactLastOnline,
                lastSignInTime: exactLastOnline,
                isGoogle: isGoogle,
                providers: providers,
                disabled: authU ? authU.disabled : false
            });
        });

        // Sắp xếp người online gần nhất lên đầu
        mergedList.sort((a, b) => {
            const timeA = new Date(a.lastOnline || a.lastSignInTime || a.createdAt || 0).getTime();
            const timeB = new Date(b.lastOnline || b.lastSignInTime || b.createdAt || 0).getTime();
            return timeB - timeA;
        });

        res.json({ success: true, total: mergedList.length, users: mergedList });
    } catch (err) {
        console.error('[Admin API] Error fetching users:', err);
        res.status(500).json({ success: false, message: 'Lỗi máy chủ khi truy xuất danh sách người chơi: ' + err.message });
    }
});

// Cập nhật thông tin người chơi (username, avatarBase64, rankScore) trong Firebase Firestore & Auth
app.put('/api/admin/users/:uid', requireAdminAuth, async (req, res) => {
    const { uid } = req.params;
    if (!uid) return res.status(400).json({ success: false, message: 'Thiếu UID người chơi!' });

    const { username, avatarBase64, rankScore } = req.body;
    const updateData = {
        updatedAt: new Date().toISOString()
    };

    if (username !== undefined && typeof username === 'string') {
        const cleanName = username.trim();
        if (cleanName) {
            updateData.username = cleanName;
            try {
                await authAdmin.updateUser(uid, { displayName: cleanName });
            } catch (e) {
                console.warn(`[Admin API] Auth updateUser error for ${uid}:`, e.message);
            }
        }
    }

    if (avatarBase64 !== undefined) {
        updateData.avatarBase64 = avatarBase64 || '';
    }

    if (rankScore !== undefined && rankScore !== null && !isNaN(parseInt(rankScore))) {
        updateData.rankScore = Math.max(0, parseInt(rankScore));
    }

    try {
        await db.collection('users').doc(uid).set(updateData, { merge: true });

        // Đồng bộ RAM nếu player đang online
        if (typeof PLAYERS === 'object' && PLAYERS) {
            Object.values(PLAYERS).forEach(p => {
                if (p && p.uid === uid) {
                    if (updateData.username !== undefined) p.username = updateData.username;
                    if (updateData.avatarBase64 !== undefined) p.avatarBase64 = updateData.avatarBase64;
                    if (updateData.rankScore !== undefined) p.rankScore = updateData.rankScore;
                }
            });
        }

        console.log(`[Admin API] Đã cập nhật profile cho user ${uid}:`, { ...updateData, avatarBase64: updateData.avatarBase64 ? '(base64 string)' : '(empty)' });
        res.json({
            success: true,
            message: 'Đã cập nhật thông tin người chơi thành công!',
            uid,
            ...updateData
        });
    } catch (err) {
        console.error(`[Admin API] Error updating user profile ${uid}:`, err);
        res.status(500).json({ success: false, message: 'Lỗi cập nhật người chơi: ' + err.message });
    }
});

// Cập nhật điểm Rank (rankScore) cho người chơi trong Firebase Firestore
app.put('/api/admin/users/:uid/rank', requireAdminAuth, async (req, res) => {
    const { uid } = req.params;
    if (!uid) return res.status(400).json({ success: false, message: 'Thiếu UID người chơi!' });

    let { rankScore } = req.body;
    if (rankScore === undefined || rankScore === null || isNaN(parseInt(rankScore))) {
        return res.status(400).json({ success: false, message: 'Điểm rank không hợp lệ!' });
    }

    const newScore = Math.max(0, parseInt(rankScore));

    try {
        await db.collection('users').doc(uid).set({
            rankScore: newScore,
            updatedAt: new Date().toISOString()
        }, { merge: true });

        // Cập nhật trạng thái in-memory nếu người chơi đang online
        if (typeof PLAYERS === 'object' && PLAYERS) {
            Object.values(PLAYERS).forEach(p => {
                if (p && p.uid === uid) {
                    p.rankScore = newScore;
                }
            });
        }

        console.log(`[Admin API] Đã can thiệp cập nhật rankScore cho user ${uid} thành: ${newScore}`);
        res.json({
            success: true,
            message: `Đã cập nhật điểm Rank thành công: ${newScore} điểm!`,
            uid,
            rankScore: newScore
        });
    } catch (err) {
        console.error(`[Admin API] Error updating rank for user ${uid}:`, err);
        res.status(500).json({ success: false, message: 'Lỗi cập nhật điểm rank: ' + err.message });
    }
});

app.post('/api/admin/users/:uid/rank', requireAdminAuth, async (req, res) => {
    const { uid } = req.params;
    if (!uid) return res.status(400).json({ success: false, message: 'Thiếu UID người chơi!' });

    let { rankScore } = req.body;
    if (rankScore === undefined || rankScore === null || isNaN(parseInt(rankScore))) {
        return res.status(400).json({ success: false, message: 'Điểm rank không hợp lệ!' });
    }

    const newScore = Math.max(0, parseInt(rankScore));

    try {
        await db.collection('users').doc(uid).set({
            rankScore: newScore,
            updatedAt: new Date().toISOString()
        }, { merge: true });

        if (typeof PLAYERS === 'object' && PLAYERS) {
            Object.values(PLAYERS).forEach(p => {
                if (p && p.uid === uid) {
                    p.rankScore = newScore;
                }
            });
        }

        console.log(`[Admin API] Đã can thiệp cập nhật rankScore cho user ${uid} thành: ${newScore}`);
        res.json({
            success: true,
            message: `Đã cập nhật điểm Rank thành công: ${newScore} điểm!`,
            uid,
            rankScore: newScore
        });
    } catch (err) {
        console.error(`[Admin API] Error updating rank for user ${uid}:`, err);
        res.status(500).json({ success: false, message: 'Lỗi cập nhật điểm rank: ' + err.message });
    }
});

app.delete('/api/admin/users/:uid', requireAdminAuth, async (req, res) => {
    const { uid } = req.params;
    if (!uid) return res.status(400).json({ success: false, message: 'Thiếu UID người chơi cần xóa!' });

    try {
        let authDeleted = false;
        let firestoreDeleted = false;

        // 1. Xóa khỏi Firebase Authentication
        try {
            await authAdmin.deleteUser(uid);
            authDeleted = true;
        } catch (e) {
            console.log(`[Admin API] User ${uid} not found in Auth or already deleted:`, e.message);
        }

        // 2. Xóa Document khỏi Firestore collection 'users'
        try {
            await db.collection('users').doc(uid).delete();
            firestoreDeleted = true;
        } catch (e) {
            console.error(`[Admin API] Error deleting firestore doc ${uid}:`, e.message);
        }

        // 3. Ngắt kết nối socket & đá ra khỏi phòng nếu đang online
        try {
            for (const rId in ROOMS) {
                const room = ROOMS[rId];
                if (room && room.seats) {
                    room.seats.forEach((seat, idx) => {
                        if (seat && seat.uid === uid) {
                            const sock = io.sockets.sockets.get(seat.socketId);
                            if (sock) {
                                sock.emit('player_kicked', { reason: 'Tài khoản của bạn đã bị Quản Trị Viên xóa vĩnh viễn khỏi hệ thống!' });
                                sock.disconnect(true);
                            }
                            room.seats[idx] = null;
                        }
                    });
                }
            }
        } catch(e){}

        res.json({
            success: true,
            message: `Đã xóa sạch tài khoản ${uid} thành công!`,
            authDeleted,
            firestoreDeleted
        });
    } catch (err) {
        console.error(`[Admin API] Error deleting user ${uid}:`, err);
        res.status(500).json({ success: false, message: 'Lỗi khi xóa người dùng: ' + err.message });
    }
});

app.post('/api/admin/users/bulk-delete', requireAdminAuth, async (req, res) => {
    const { uids } = req.body;
    if (!uids || !Array.isArray(uids) || uids.length === 0) {
        return res.status(400).json({ success: false, message: 'Danh sách UIDs không hợp lệ!' });
    }

    try {
        let deletedAuthCount = 0;
        let deletedFsCount = 0;

        // 1. Bulk delete Firebase Auth
        try {
            const deleteResult = await authAdmin.deleteUsers(uids);
            deletedAuthCount = deleteResult.successCount;
        } catch (e) {
            console.error('[Admin API] Error bulk deleting auth users:', e);
        }

        // 2. Bulk delete Firestore docs
        try {
            const batch = db.batch();
            uids.forEach(uid => {
                const docRef = db.collection('users').doc(uid);
                batch.delete(docRef);
            });
            await batch.commit();
            deletedFsCount = uids.length;
        } catch (e) {
            console.error('[Admin API] Error bulk deleting firestore docs:', e);
        }

        // 3. Kick any active socket connections
        try {
            for (const rId in ROOMS) {
                const room = ROOMS[rId];
                if (room && room.seats) {
                    room.seats.forEach((seat, idx) => {
                        if (seat && uids.includes(seat.uid)) {
                            const sock = io.sockets.sockets.get(seat.socketId);
                            if (sock) {
                                sock.emit('player_kicked', { reason: 'Tài khoản của bạn đã bị Quản Trị Viên xóa vĩnh viễn khỏi hệ thống!' });
                                sock.disconnect(true);
                            }
                            room.seats[idx] = null;
                        }
                    });
                }
            }
        } catch(e){}

        res.json({
            success: true,
            message: `Đã xóa thành công ${uids.length} tài khoản khỏi hệ thống!`,
            deletedCount: uids.length
        });
    } catch (err) {
        console.error('[Admin API] Bulk delete error:', err);
        res.status(500).json({ success: false, message: 'Lỗi khi xóa hàng loạt: ' + err.message });
    }
});

const clientLocalPath = path.join(__dirname, '../explodingkittens(clients)');
if (fs.existsSync(clientLocalPath)) {
    app.use(express.static(clientLocalPath));
    app.get('/', (req, res) => {
        res.sendFile(path.join(clientLocalPath, 'index.html'));
    });
}

app.use(express.static(path.join(__dirname, '../'), {
    maxAge: '1d',
    setHeaders: (res, filePath) => {
        // Tối ưu hóa bộ nhớ đệm HTTP cho thiết bị di động:
        // Ảnh, âm thanh, font chữ cho cache 7 ngày immutable (0ms tải lại)
        if (/\.(png|jpg|jpeg|gif|webp|svg|mp3|wav|ogg|woff2?|ttf|eot)$/i.test(filePath)) {
            res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
        } else if (/\.(css|js)$/i.test(filePath)) {
            res.setHeader('Cache-Control', 'public, max-age=3600');
        }
    }
}));

app.get('/ping', (req, res) => res.status(200).send('pong'));
app.get('/health', (req, res) => res.status(200).send('OK'));
app.get('/donate.jpg', (req, res) => res.sendFile(path.join(__dirname, 'donate.jpg')));

app.get('/log_error', (req, res) => {
    console.error('[Client Error]:', req.query.msg);
    res.sendStatus(200);
});

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// --- SYSTEM SETTINGS (Cấu hình tính năng hệ thống toàn cục) ---
let systemSettings = {
    allowAvatarUpload: true
};

// Nạp cài đặt hệ thống từ Firestore khi khởi động server
async function loadSystemSettings() {
    try {
        if (!db) return;
        const docRef = db.collection('system_settings').doc('features');
        const docSnap = await docRef.get();
        if (docSnap.exists) {
            const data = docSnap.data();
            if (typeof data.allowAvatarUpload === 'boolean') {
                systemSettings.allowAvatarUpload = data.allowAvatarUpload;
                console.log(`[System Settings] Đã nạp trạng thái allowAvatarUpload: ${systemSettings.allowAvatarUpload}`);
            }
        } else {
            await docRef.set({
                allowAvatarUpload: true,
                updatedAt: new Date().toISOString()
            });
            console.log(`[System Settings] Đã tạo tài liệu cấu hình mặc định system_settings/features`);
        }
    } catch (e) {
        console.error('[System Settings] Lỗi nạp cài đặt từ Firestore:', e.message);
    }
}
loadSystemSettings();

// Public endpoint để client lấy cấu hình tính năng
app.get('/api/system/settings', (req, res) => {
    res.json({ success: true, settings: systemSettings });
});

// Admin endpoint lấy cấu hình
app.get('/api/admin/settings', requireAdminAuth, (req, res) => {
    res.json({ success: true, settings: systemSettings });
});

// Admin endpoint cập nhật khóa/mở tải avatar
app.post('/api/admin/settings/avatar-upload', requireAdminAuth, async (req, res) => {
    try {
        const { allowAvatarUpload } = req.body;
        if (typeof allowAvatarUpload !== 'boolean') {
            return res.status(400).json({ success: false, message: 'Tham số allowAvatarUpload không hợp lệ (phải là true hoặc false)!' });
        }

        systemSettings.allowAvatarUpload = allowAvatarUpload;

        // Lưu vào Firestore với quyền Admin SDK
        try {
            if (db) {
                await db.collection('system_settings').doc('features').set({
                    allowAvatarUpload: allowAvatarUpload,
                    updatedAt: new Date().toISOString()
                }, { merge: true });
            }
        } catch (dbErr) {
            console.error('[System Settings] Lỗi lưu Firestore:', dbErr.message);
        }

        // Bắn Socket.IO thông báo tức thì tới tất cả các client đang online
        io.emit('system_avatar_upload_toggled', { allowAvatarUpload: allowAvatarUpload });

        console.log(`[Admin API] Admin đã đổi trạng thái allowAvatarUpload thành: ${allowAvatarUpload}`);
        res.json({ 
            success: true, 
            allowAvatarUpload: allowAvatarUpload,
            message: allowAvatarUpload ? 'Đã BẬT tính năng tải ảnh avatar cho toàn bộ người chơi!' : 'Đã KHÓA TẮT tính năng tải ảnh avatar cho toàn bộ người chơi!'
        });
    } catch (err) {
        console.error('[Admin API] Error updating avatar upload setting:', err);
        res.status(500).json({ success: false, message: 'Lỗi khi cập nhật cài đặt: ' + err.message });
    }
});

// --- AUTHORITATIVE ROOM MANAGEMENT STATE ---
const ROOMS = {
    "roomBar1": {
        id: "roomBar1",
        name: "PHÒNG 1",
        maxSeats: 10,
        hostSocketId: null,
        hostUsingDeck: [], 
        waitNope: null,
        seats: Array(10).fill(null),
        status: "LOBBY",
        mode: "NORMAL",
        selectedMap: "default"
    },
    "roomBar2": {
        id: "roomBar2",
        name: "PHÒNG 2",
        maxSeats: 10,
        hostSocketId: null,
        hostUsingDeck: [],
        waitNope: null,
        seats: Array(10).fill(null),
        status: "LOBBY",
        mode: "NORMAL",
        selectedMap: "default"
    },
    "roomBar3": {
        id: "roomBar3",
        name: "PHÒNG 3",
        maxSeats: 10,
        hostSocketId: null,
        hostUsingDeck: [],
        waitNope: null,
        seats: Array(10).fill(null),
        status: "LOBBY",
        mode: "NORMAL",
        selectedMap: "default"
    }
};

const PLAYERS = {}; // map socket.id -> { socketId, uid, username, avatar, usingDeckName, usingDeckCards }

// Import Modules
const { getPublicRoomsState } = require('./logic/shared_utils');
const { startCronJobs } = require('./services/cron_jobs');
const { setupRoomHandlers } = require('./handlers/room');
const { setupGameSetupHandlers } = require('./handlers/game_setup');
const { setupGameActionHandlers } = require('./handlers/game_action');

// Khởi chạy các dịch vụ chạy ngầm (Cron Jobs & Terminal CLI)
startCronJobs(ROOMS, PLAYERS, io);

// Sự kiện khi có Client kết nối tới
io.on('connection', (socket) => {
    console.log('[Server] Một người chơi đã kết nối:', socket.id);

    // Gửi trạng thái phòng ngay khi kết nối
    socket.emit('rooms_state', getPublicRoomsState(ROOMS));

    // Gửi trạng thái tính năng hệ thống (Khóa/Mở tải avatar) ngay khi kết nối
    socket.emit('system_settings_init', { allowAvatarUpload: systemSettings.allowAvatarUpload });

    // Đăng ký các Handlers
    setupRoomHandlers(socket, io, ROOMS, PLAYERS);
    setupGameSetupHandlers(socket, io, ROOMS, PLAYERS, db);
    setupGameActionHandlers(socket, io, ROOMS, db, PLAYERS);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`[Game Server] Authoritative Server đang chạy tại cổng ${PORT}`);
    console.log(`[Web Game Local] Nhấp vào link để mở Web: http://localhost:${PORT}`);
});
