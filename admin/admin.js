// ==========================================================================
// EXPLODING KITTEN - ADMIN DASHBOARD LOGIC
// ==========================================================================

// Link Backend Server mặc định làm fallback an toàn
const DEFAULT_SERVER_URL = 'https://explodingkitten-sever.onrender.com';

// Dọn dẹp triệt để localStorage: xóa vĩnh viễn domain cũ đã bị đình chỉ (bba2) hoặc link rác
try {
    const cachedUrl = localStorage.getItem('admin_server_url');
    if (cachedUrl && (cachedUrl.includes('bba2') || !cachedUrl.startsWith('http'))) {
        localStorage.removeItem('admin_server_url');
    }
} catch(e){}

// Helper lấy địa chỉ Backend Server chính xác từ config/env.js
function getServerUrl() {
    // 1. Ưu tiên cao nhất: lấy từ biến cấu hình tập trung config/env.js
    if (typeof window !== 'undefined' && window.ENV && window.ENV.SOCKET_URL) {
        let clean = window.ENV.SOCKET_URL.trim().replace(/\/$/, '');
        if (clean) return clean;
    }
    // 2. Nếu có cấu hình lưu trong localStorage (khác bba2)
    const saved = localStorage.getItem('admin_server_url');
    if (saved && (saved.startsWith('http://') || saved.startsWith('https://'))) {
        let clean = saved.trim().replace(/\/$/, '');
        if (!clean.includes('bba2')) {
            return clean;
        }
    }
    // 3. Nếu đang mở test local trên cổng 3000
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
        if (window.location.port === '3000') return 'http://localhost:3000';
    }
    // 4. Fallback an toàn tới Server Cloud chính
    return DEFAULT_SERVER_URL;
}

// State (Không cần nhập mật khẩu - Admin chạy local gửi key xác thực mặc định)
const adminKey = 'meono_admin_2026';
let rawUsersList = [];
let filteredUsersList = [];
let selectedUids = new Set();
let pendingDeleteTarget = null; // Single UID or 'bulk'

// DOM Elements
const serverStatusBadge = document.getElementById('serverStatusBadge');
const serverStatusText = document.getElementById('serverStatusText');
const btnRefreshData = document.getElementById('btnRefreshData');
const btnToggleTheme = document.getElementById('btnToggleTheme');

// Theme Management (Light / Dark Mode)
const savedTheme = localStorage.getItem('admin_portal_theme') || 'light';
document.documentElement.className = savedTheme === 'dark' ? 'dark-theme' : 'light-theme';
updateThemeButtonUI();

if (btnToggleTheme) {
    btnToggleTheme.addEventListener('click', () => {
        const isDark = document.documentElement.classList.contains('dark-theme');
        const newTheme = isDark ? 'light' : 'dark';
        document.documentElement.className = newTheme === 'dark' ? 'dark-theme' : 'light-theme';
        localStorage.setItem('admin_portal_theme', newTheme);
        updateThemeButtonUI();
        showToast(`Đã chuyển sang giao diện ${newTheme === 'dark' ? 'nền tối (Dark Mode)' : 'nền trắng (Light Mode)'}!`, 'info');
    });
}

function updateThemeButtonUI() {
    if (!btnToggleTheme) return;
    const isDark = document.documentElement.classList.contains('dark-theme');
    btnToggleTheme.innerHTML = isDark 
        ? `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="5"/><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg><span>Sáng</span>`
        : `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg><span>Tối</span>`;
    btnToggleTheme.title = isDark ? "Chuyển sang giao diện Sáng (Nền trắng)" : "Chuyển sang giao diện Tối (Nền đen)";
}

// Stats Elements
const statTotalUsers = document.getElementById('statTotalUsers');
const statGoogleUsers = document.getElementById('statGoogleUsers');
const statEmailUsers = document.getElementById('statEmailUsers');
const statRecentActive = document.getElementById('statRecentActive');

// Search & Filter Elements
const searchInput = document.getElementById('searchInput');
const btnClearSearch = document.getElementById('btnClearSearch');
const filterProvider = document.getElementById('filterProvider');
const filterOnlineTime = document.getElementById('filterOnlineTime');
const sortField = document.getElementById('sortField');
const btnBulkDelete = document.getElementById('btnBulkDelete');
const selectedCount = document.getElementById('selectedCount');

// Table Elements
const selectAllCheckbox = document.getElementById('selectAllCheckbox');
const usersTableBody = document.getElementById('usersTableBody');
const tableInfo = document.getElementById('tableInfo');

// Edit User Modal Elements (Tùy chỉnh Tên, Avatar, Rank)
const editRankModal = document.getElementById('editRankModal');
const editRankTargetInfo = document.getElementById('editRankTargetInfo');
const editUsernameInput = document.getElementById('editUsernameInput');
const editAvatarPreviewBox = document.getElementById('editAvatarPreviewBox');
const editAvatarPreviewImg = document.getElementById('editAvatarPreviewImg');
const editAvatarFallbackIcon = document.getElementById('editAvatarFallbackIcon');
const editAvatarFileInput = document.getElementById('editAvatarFileInput');
const btnChooseAvatar = document.getElementById('btnChooseAvatar');
const btnRemoveAvatar = document.getElementById('btnRemoveAvatar');
const editRankPreviewIcon = document.getElementById('editRankPreviewIcon');
const editRankPreviewTitle = document.getElementById('editRankPreviewTitle');
const editRankPreviewScore = document.getElementById('editRankPreviewScore');
const editRankScoreInput = document.getElementById('editRankScoreInput');
const btnCloseEditRank = document.getElementById('btnCloseEditRank');
const btnCancelEditRank = document.getElementById('btnCancelEditRank');
const btnSaveEditRank = document.getElementById('btnSaveEditRank');
const btnStepMinus100 = document.getElementById('btnStepMinus100');
const btnStepMinus10 = document.getElementById('btnStepMinus10');
const btnStepPlus10 = document.getElementById('btnStepPlus10');
const btnStepPlus100 = document.getElementById('btnStepPlus100');
let currentEditingUser = null;
let currentEditingAvatarBase64 = '';

// Danger Delete Modal Elements
const deleteModal = document.getElementById('deleteModal');
const deleteModalTitle = document.getElementById('deleteModalTitle');
const deleteTargetInfo = document.getElementById('deleteTargetInfo');
const btnCloseDeleteModal = document.getElementById('btnCloseDeleteModal');
const btnCancelDelete = document.getElementById('btnCancelDelete');
const btnConfirmDelete = document.getElementById('btnConfirmDelete');

// System Settings Elements (Khóa / Mở tải avatar)
const btnToggleAvatarUpload = document.getElementById('btnToggleAvatarUpload');
const avatarSwitchLabel = document.getElementById('avatarSwitchLabel');
let currentAvatarUploadStatus = true;

// Toast Element
const toastContainer = document.getElementById('toastContainer');

// ==========================================================================
// 1. SERVER STATUS CHECK & AUTO INITIALIZATION
// ==========================================================================

async function checkServerHealth(quiet = false) {
    const url = getServerUrl();
    if (!serverStatusText) return false;
    if (!quiet) {
        serverStatusText.textContent = `Đang kết nối máy chủ Live...`;
        serverStatusText.style.color = '#94a3b8';
    }

    const startTime = Date.now();
    try {
        const res = await fetch(`${url}/ping`, { cache: 'no-store' });
        if (res.ok) {
            const elapsed = Date.now() - startTime;
            serverStatusText.innerHTML = `🟢 Máy chủ Online (${elapsed}ms)`;
            serverStatusText.style.color = '#10b981';
            const dot = document.querySelector('.status-dot');
            if (dot) dot.style.background = '#10b981';
            return true;
        }
    } catch (e) {
        serverStatusText.innerHTML = `🟡 Đang kết nối máy chủ Render (có thể mất 15-30s khởi động)...`;
        serverStatusText.style.color = '#f59e0b';
        const dot = document.querySelector('.status-dot');
        if (dot) dot.style.background = '#f59e0b';
    }
    return false;
}

// ==========================================================================
// 2. FETCH DATA & STATISTICS
// ==========================================================================

let fetchUsersRetryAttempts = 0;
async function fetchUsersList() {
    if (!usersTableBody) return;
    usersTableBody.innerHTML = `
        <tr class="loading-row">
            <td colspan="8">
                <div class="table-loader">
                    <div class="spinner"></div>
                    <span>Đang tải dữ liệu người chơi từ Firebase & Server Live...</span>
                </div>
            </td>
        </tr>
    `;

    const serverUrl = getServerUrl();
    try {
        const res = await fetch(`${serverUrl}/api/admin/users`, {
            headers: {
                'x-admin-key': adminKey
            }
        });

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText || 'Lỗi phản hồi máy chủ'}`);
        }

        const data = await res.json();
        if (data.success && Array.isArray(data.users)) {
            fetchUsersRetryAttempts = 0;
            rawUsersList = data.users;
            selectedUids.clear();
            updateBulkDeleteButton();
            calculateStats();
            applyFiltersAndRender();
        } else {
            showToast(data.message || 'Lỗi tải danh sách người chơi', 'error');
        }
    } catch (err) {
        console.warn('[Admin API Error]', err);

        // Nếu máy chủ Render đang ngủ (cold start), tự động ping đánh thức và thử lại tối đa 4 lần
        if (fetchUsersRetryAttempts < 4) {
            fetchUsersRetryAttempts++;
            usersTableBody.innerHTML = `
                <tr class="loading-row">
                    <td colspan="8">
                        <div class="table-loader">
                            <div class="spinner"></div>
                            <span>Máy chủ Render đang thức dậy (Lần ${fetchUsersRetryAttempts}/4)... Vui lòng đợi trong giây lát...</span>
                        </div>
                    </td>
                </tr>
            `;
            setTimeout(async () => {
                await checkServerHealth(true);
                fetchUsersList();
                fetchSystemSettings();
            }, 3500);
            return;
        }

        showToast('Lỗi kết nối máy chủ: ' + err.message, 'error');
        usersTableBody.innerHTML = `
            <tr>
                <td colspan="8" class="table-empty" style="color: #ef4444;">
                    Lỗi kết nối máy chủ (${err.message}) tới: <strong>${escapeHtml(serverUrl)}</strong>.<br>
                    Vui lòng kiểm tra lại kết nối mạng hoặc bấm nút <strong>LÀM MỚI</strong> để thử lại.
                </td>
            </tr>
        `;
    }
}

function calculateStats() {
    const total = rawUsersList.length;
    const googleCount = rawUsersList.filter(u => u.isGoogle).length;
    const emailCount = total - googleCount;

    // Online trong 24h
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;
    const activeCount = rawUsersList.filter(u => {
        const timeVal = u.lastOnline || u.lastSignInTime;
        if (!timeVal) return false;
        const time = new Date(timeVal).getTime();
        return !isNaN(time) && (now - time) <= twentyFourHours;
    }).length;

    if (statTotalUsers) statTotalUsers.textContent = total;
    if (statGoogleUsers) statGoogleUsers.textContent = googleCount;
    if (statEmailUsers) statEmailUsers.textContent = emailCount;
    if (statRecentActive) statRecentActive.textContent = activeCount;
}

// ==========================================================================
// 3. SYSTEM SETTINGS (KHÓA / MỞ QUYỀN TẢI AVATAR)
// ==========================================================================

async function fetchSystemSettings() {
    const serverUrl = getServerUrl();
    try {
        const res = await fetch(`${serverUrl}/api/admin/settings`, {
            headers: {
                'x-admin-key': adminKey
            }
        });
        if (res.ok) {
            const data = await res.json();
            if (data && data.success && data.settings && typeof data.settings.allowAvatarUpload === 'boolean') {
                updateAvatarControlUI(data.settings.allowAvatarUpload);
            }
        }
    } catch (err) {
        console.warn('[Admin] Lỗi lấy cài đặt hệ thống:', err);
    }
}

function updateAvatarControlUI(isAllowed) {
    currentAvatarUploadStatus = isAllowed;
    if (!btnToggleAvatarUpload) return;

    if (isAllowed) {
        btnToggleAvatarUpload.classList.add('active');
        if (avatarSwitchLabel) avatarSwitchLabel.textContent = 'BẬT';
    } else {
        btnToggleAvatarUpload.classList.remove('active');
        if (avatarSwitchLabel) avatarSwitchLabel.textContent = 'TẮT';
    }
}

if (btnToggleAvatarUpload) {
    btnToggleAvatarUpload.addEventListener('click', async () => {
        const targetStatus = !currentAvatarUploadStatus;
        const confirmMsg = targetStatus 
            ? "Bạn có chắc muốn MỞ LẠI tính năng tải/đổi avatar cho toàn bộ người chơi?"
            : "XÁC NHẬN KHÓA TẮT TẢI AVATAR:\nKhi bấm OK, TOÀN BỘ người chơi sẽ bị khóa tải lên/đổi ảnh avatar!\n\nBạn có muốn tiếp tục?";
        
        if (!confirm(confirmMsg)) return;

        btnToggleAvatarUpload.disabled = true;
        const serverUrl = getServerUrl();

        try {
            const res = await fetch(`${serverUrl}/api/admin/settings/avatar-upload`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-key': adminKey
                },
                body: JSON.stringify({ allowAvatarUpload: targetStatus })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                updateAvatarControlUI(targetStatus);
                if (targetStatus) {
                    showToast("Đã MỞ LẠI tính năng tải avatar thành công!", "success");
                } else {
                    showToast("Đã KHÓA TẮT tính năng tải avatar của người chơi!", "warning");
                }
            } else {
                showToast(data.message || 'Lỗi khi cập nhật cài đặt', 'error');
            }
        } catch (err) {
            showToast('Lỗi kết nối máy chủ: ' + err.message, 'error');
        } finally {
            btnToggleAvatarUpload.disabled = false;
        }
    });
}

if (btnRefreshData) {
    btnRefreshData.addEventListener('click', () => {
        showToast('Đang làm mới dữ liệu hệ thống...', 'info');
        checkServerHealth();
        fetchUsersList();
        fetchSystemSettings();
    });
}

// ==========================================================================
// 4. SEARCH, FILTER & RENDER TABLE
// ==========================================================================

function applyFiltersAndRender() {
    const query = (searchInput ? searchInput.value : '').trim().toLowerCase();
    const providerFilter = filterProvider ? filterProvider.value : 'all';
    const onlineTimeFilter = filterOnlineTime ? filterOnlineTime.value : 'all';
    const sortMode = sortField ? sortField.value : 'recent';

    const now = Date.now();

    filteredUsersList = rawUsersList.filter(u => {
        const nameMatch = (u.username || '').toLowerCase().includes(query);
        const emailMatch = (u.email || '').toLowerCase().includes(query);
        const uidMatch = (u.uid || '').toLowerCase().includes(query);
        const matchesSearch = !query || nameMatch || emailMatch || uidMatch;

        let matchesProvider = true;
        if (providerFilter === 'google') matchesProvider = u.isGoogle;
        if (providerFilter === 'email') matchesProvider = !u.isGoogle;

        let matchesOnlineTime = true;
        if (onlineTimeFilter !== 'all') {
            const timeStr = u.lastOnline || u.lastSignInTime;
            const time = timeStr ? new Date(timeStr).getTime() : 0;
            const hasValidTime = !isNaN(time) && time > 0;
            const diffMs = hasValidTime ? (now - time) : Infinity;

            if (onlineTimeFilter === '15m') {
                matchesOnlineTime = hasValidTime && diffMs <= 15 * 60 * 1000;
            } else if (onlineTimeFilter === '1h') {
                matchesOnlineTime = hasValidTime && diffMs <= 60 * 60 * 1000;
            } else if (onlineTimeFilter === '24h') {
                matchesOnlineTime = hasValidTime && diffMs <= 24 * 60 * 60 * 1000;
            } else if (onlineTimeFilter === '3d') {
                matchesOnlineTime = hasValidTime && diffMs <= 3 * 24 * 60 * 60 * 1000;
            } else if (onlineTimeFilter === '7d') {
                matchesOnlineTime = hasValidTime && diffMs <= 7 * 24 * 60 * 60 * 1000;
            } else if (onlineTimeFilter === '30d') {
                matchesOnlineTime = hasValidTime && diffMs <= 30 * 24 * 60 * 60 * 1000;
            } else if (onlineTimeFilter === 'offline_long') {
                matchesOnlineTime = !hasValidTime || diffMs > 30 * 24 * 60 * 60 * 1000;
            }
        }

        return matchesSearch && matchesProvider && matchesOnlineTime;
    });

    // Sorting
    filteredUsersList.sort((a, b) => {
        if (sortMode === 'recent') {
            const timeA = new Date(a.lastOnline || a.lastSignInTime || a.createdAt || 0).getTime();
            const timeB = new Date(b.lastOnline || b.lastSignInTime || b.createdAt || 0).getTime();
            return timeB - timeA;
        } else if (sortMode === 'oldest_online') {
            const timeA = new Date(a.lastOnline || a.lastSignInTime || a.createdAt || 0).getTime();
            const timeB = new Date(b.lastOnline || b.lastSignInTime || b.createdAt || 0).getTime();
            return timeA - timeB;
        } else if (sortMode === 'created') {
            const timeA = new Date(a.createdAt || 0).getTime();
            const timeB = new Date(b.createdAt || 0).getTime();
            return timeB - timeA;
        } else if (sortMode === 'rank') {
            return (b.rankScore || 0) - (a.rankScore || 0);
        } else if (sortMode === 'name') {
            return (a.username || '').localeCompare(b.username || '');
        }
        return 0;
    });

    renderTable();
}

function renderTable() {
    if (!usersTableBody) return;

    if (filteredUsersList.length === 0) {
        usersTableBody.innerHTML = `
            <tr>
                <td colspan="8" class="table-empty">
                    Không tìm thấy người chơi nào phù hợp với bộ lọc.
                </td>
            </tr>
        `;
        if (tableInfo) tableInfo.textContent = `Hiển thị 0 / ${rawUsersList.length} người chơi`;
        if (selectAllCheckbox) selectAllCheckbox.checked = false;
        return;
    }

    let html = '';
    filteredUsersList.forEach((user, index) => {
        const isChecked = selectedUids.has(user.uid);
        const rankInfo = getRankDetails(user.rankScore || 0);
        const timeDisplay = formatTimeDetails(user.lastOnline || user.lastSignInTime);
        const shortUid = user.uid && user.uid.length > 12 ? `${user.uid.slice(0, 5)}...${user.uid.slice(-4)}` : (user.uid || '');

        let avatarHtml = '';
        if (user.avatarBase64) {
            avatarHtml = `<img src="${user.avatarBase64}" alt="avatar">`;
        } else {
            avatarHtml = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
        }

        const providerBadge = user.isGoogle 
            ? `<span class="provider-badge badge-google"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg> Google</span>`
            : `<span class="provider-badge badge-email"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg> Email</span>`;

        html += `
            <tr data-uid="${user.uid}">
                <td class="col-checkbox">
                    <input type="checkbox" class="user-row-checkbox" data-uid="${user.uid}" ${isChecked ? 'checked' : ''}>
                </td>
                <td class="col-stt">${index + 1}</td>
                <td class="col-player">
                    <div class="player-cell">
                        <div class="user-table-avatar">${avatarHtml}</div>
                        <div class="user-table-name" title="${escapeHtml(user.username)}">${escapeHtml(user.username)}</div>
                    </div>
                </td>
                <td class="col-email">
                    <div class="email-cell">
                        <span class="email-text" title="${escapeHtml(user.email)}">${escapeHtml(user.email)}</span>
                        ${providerBadge}
                    </div>
                </td>
                <td class="col-uid">
                    <code class="uid-pill" data-uid="${user.uid}" title="Click để copy UID: ${user.uid}">${shortUid}</code>
                </td>
                <td class="col-rank">
                    <div class="rank-badge-wrap" data-uid="${user.uid}" title="Click để tùy chỉnh điểm Rank">
                        <img src="${rankInfo.icon}" class="rank-badge-img" alt="rank" onerror="this.outerHTML='<span style=\\'font-size:1.1rem\\'>${rankInfo.badge}</span>'">
                        <div>
                            <div class="rank-score-text">${user.rankScore || 0} pts</div>
                            <div class="rank-title-text">${rankInfo.name}</div>
                        </div>
                    </div>
                </td>
                <td class="col-time">
                    <div class="time-cell">
                        <span class="time-relative">${timeDisplay.relative}</span>
                        <span class="time-exact">${timeDisplay.exact}</span>
                    </div>
                </td>
                <td class="col-action">
                    <div class="action-buttons-wrap">
                        <button class="btn-edit-rank-row" data-uid="${user.uid}" title="Tùy chỉnh điểm Rank trên Firebase">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            <span>SỬA</span>
                        </button>
                        <button class="btn-delete-row" data-uid="${user.uid}" data-name="${escapeHtml(user.username)}" data-email="${escapeHtml(user.email)}" title="Xóa vĩnh viễn tài khoản này">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                            <span>XÓA</span>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    usersTableBody.innerHTML = html;
    if (tableInfo) tableInfo.textContent = `Đang hiển thị ${filteredUsersList.length} / ${rawUsersList.length} người chơi`;

    bindTableEvents();
}

function bindTableEvents() {
    // Checkbox per row
    document.querySelectorAll('.user-row-checkbox').forEach(cb => {
        cb.addEventListener('change', (e) => {
            const uid = e.target.dataset.uid;
            if (e.target.checked) selectedUids.add(uid);
            else selectedUids.delete(uid);
            updateBulkDeleteButton();
        });
    });

    // Edit Rank button
    document.querySelectorAll('.btn-edit-rank-row').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const uid = btn.dataset.uid;
            const user = rawUsersList.find(u => u.uid === uid);
            if (user) openEditRankModal(user);
        });
    });

    // Click rank badge
    document.querySelectorAll('.rank-badge-wrap').forEach(wrap => {
        wrap.addEventListener('click', (e) => {
            e.stopPropagation();
            const uid = wrap.dataset.uid;
            const user = rawUsersList.find(u => u.uid === uid);
            if (user) openEditRankModal(user);
        });
    });

    // Click player cell (avatar / name) to edit
    document.querySelectorAll('.player-cell').forEach(cell => {
        cell.style.cursor = 'pointer';
        cell.title = 'Nhấp để tùy chỉnh Tên, Avatar và Rank của người chơi này';
        cell.addEventListener('click', (e) => {
            e.stopPropagation();
            const row = cell.closest('tr');
            const uid = row ? row.dataset.uid : null;
            const user = rawUsersList.find(u => u.uid === uid);
            if (user) openEditRankModal(user);
        });
    });

    // Delete single button
    document.querySelectorAll('.btn-delete-row').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const uid = btn.dataset.uid;
            const username = btn.dataset.name;
            const email = btn.dataset.email;
            promptDeleteSingle(uid, username, email);
        });
    });

    // Copy UID on click
    document.querySelectorAll('.uid-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            const fullUid = pill.dataset.uid || pill.textContent;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(fullUid).then(() => {
                    showToast(`Đã sao chép UID: ${fullUid}`, 'success');
                }).catch(() => {
                    showToast(`UID: ${fullUid}`, 'success');
                });
            }
        });
    });
}

// Select All Checkbox
if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        filteredUsersList.forEach(u => {
            if (isChecked) selectedUids.add(u.uid);
            else selectedUids.delete(u.uid);
        });
        document.querySelectorAll('.user-row-checkbox').forEach(cb => cb.checked = isChecked);
        updateBulkDeleteButton();
    });
}

function updateBulkDeleteButton() {
    if (!selectedCount || !btnBulkDelete) return;
    const count = selectedUids.size;
    selectedCount.textContent = count;
    if (count > 0) {
        btnBulkDelete.classList.remove('hidden');
    } else {
        btnBulkDelete.classList.add('hidden');
    }
}

// Search Inputs & Filters
if (searchInput) {
    searchInput.addEventListener('input', () => {
        if (searchInput.value.trim()) {
            if (btnClearSearch) btnClearSearch.classList.remove('hidden');
        } else {
            if (btnClearSearch) btnClearSearch.classList.add('hidden');
        }
        applyFiltersAndRender();
    });
}

if (btnClearSearch) {
    btnClearSearch.addEventListener('click', () => {
        if (searchInput) {
            searchInput.value = '';
            searchInput.focus();
        }
        btnClearSearch.classList.add('hidden');
        applyFiltersAndRender();
    });
}

if (filterProvider) filterProvider.addEventListener('change', applyFiltersAndRender);
if (filterOnlineTime) filterOnlineTime.addEventListener('change', applyFiltersAndRender);
if (sortField) sortField.addEventListener('change', applyFiltersAndRender);

// ==========================================================================
// 5. EDIT USER PROFILE (USERNAME, AVATAR, RANK) & FIREBASE INTERVENTION
// ==========================================================================

function updateAvatarPreviewUI(base64) {
    if (!editAvatarPreviewImg || !editAvatarFallbackIcon) return;
    if (base64) {
        editAvatarPreviewImg.src = base64;
        editAvatarPreviewImg.style.display = 'block';
        editAvatarFallbackIcon.style.display = 'none';
    } else {
        editAvatarPreviewImg.src = '';
        editAvatarPreviewImg.style.display = 'none';
        editAvatarFallbackIcon.style.display = 'flex';
    }
}

if (btnChooseAvatar && editAvatarFileInput) {
    btnChooseAvatar.addEventListener('click', () => editAvatarFileInput.click());
}
if (editAvatarPreviewBox && editAvatarFileInput) {
    editAvatarPreviewBox.addEventListener('click', () => editAvatarFileInput.click());
}

if (btnRemoveAvatar) {
    btnRemoveAvatar.addEventListener('click', () => {
        currentEditingAvatarBase64 = '';
        updateAvatarPreviewUI('');
        if (editAvatarFileInput) editAvatarFileInput.value = '';
        showToast('Đã gỡ avatar (sẽ dùng icon mặc định sau khi lưu)', 'info');
    });
}

if (editAvatarFileInput) {
    editAvatarFileInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            showToast('Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, WEBP)!', 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = new Image();
            img.onload = () => {
                // Tối ưu ảnh về kích thước tối đa 256x256 để lưu nhanh và nhẹ trên Firestore
                const maxDim = 256;
                let w = img.width;
                let h = img.height;
                if (w > maxDim || h > maxDim) {
                    if (w > h) {
                        h = Math.round((h * maxDim) / w);
                        w = maxDim;
                    } else {
                        w = Math.round((w * maxDim) / h);
                        h = maxDim;
                    }
                }
                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, w, h);
                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);

                currentEditingAvatarBase64 = compressedBase64;
                updateAvatarPreviewUI(compressedBase64);
                showToast('Đã chọn ảnh đại diện mới thành công!', 'success');
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    });
}

function openEditRankModal(user) {
    if (!user) return;
    currentEditingUser = user;
    currentEditingAvatarBase64 = user.avatarBase64 || '';

    if (editRankTargetInfo) {
        const providerBadge = user.isGoogle 
            ? `<span class="provider-badge badge-google" style="margin-left: 0;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg> Google</span>`
            : `<span class="provider-badge badge-email" style="margin-left: 0;"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg> Email</span>`;

        const timeInfo = formatTimeDetails(user.lastOnline || user.lastSignInTime);

        editRankTargetInfo.innerHTML = `
            <div class="edit-player-details" style="width: 100%;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
                    <span style="font-size: 0.74rem; font-weight: 700; color: var(--text-secondary); letter-spacing: 0.5px;">THÔNG TIN TÀI KHOẢN</span>
                    ${providerBadge}
                </div>
                <div class="edit-player-sub" style="font-size: 0.85rem; color: #ffffff;">Email: <strong>${escapeHtml(user.email)}</strong></div>
                <div class="edit-player-sub" style="margin-top: 3px;">UID: <code>${user.uid}</code></div>
                <div class="edit-player-sub" style="margin-top: 3px; color: #fbbf24;">Online gần nhất: <strong>${timeInfo.relative} (${timeInfo.exact})</strong></div>
            </div>
        `;
    }

    // 1. Điền Tên người chơi
    if (editUsernameInput) {
        editUsernameInput.value = user.username || '';
    }

    // 2. Điền Ảnh đại diện
    updateAvatarPreviewUI(currentEditingAvatarBase64);
    if (editAvatarFileInput) editAvatarFileInput.value = '';

    // 3. Điền Điểm Rank
    const currentScore = user.rankScore || 0;
    if (editRankScoreInput) editRankScoreInput.value = currentScore;
    updateLiveRankPreview(currentScore);

    if (editRankModal) editRankModal.classList.remove('hidden');
    setTimeout(() => {
        if (editUsernameInput) {
            editUsernameInput.focus();
            editUsernameInput.select();
        }
    }, 50);
}

function closeEditRankModal() {
    if (editRankModal) editRankModal.classList.add('hidden');
    currentEditingUser = null;
    currentEditingAvatarBase64 = '';
}

if (btnCloseEditRank) btnCloseEditRank.addEventListener('click', closeEditRankModal);
if (btnCancelEditRank) btnCancelEditRank.addEventListener('click', closeEditRankModal);

function updateLiveRankPreview(score) {
    const pts = Math.max(0, parseInt(score) || 0);
    const rankInfo = getRankDetails(pts);
    if (editRankPreviewIcon) editRankPreviewIcon.src = rankInfo.icon;
    if (editRankPreviewTitle) editRankPreviewTitle.textContent = rankInfo.name;
    if (editRankPreviewScore) editRankPreviewScore.textContent = `${pts} pts`;
}

// Live typing in score input
if (editRankScoreInput) {
    editRankScoreInput.addEventListener('input', () => {
        updateLiveRankPreview(editRankScoreInput.value);
    });
}

// Steppers (-100, -10, +10, +100)
if (btnStepMinus100) {
    btnStepMinus100.addEventListener('click', () => {
        const cur = parseInt(editRankScoreInput.value) || 0;
        editRankScoreInput.value = Math.max(0, cur - 100);
        updateLiveRankPreview(editRankScoreInput.value);
    });
}

if (btnStepMinus10) {
    btnStepMinus10.addEventListener('click', () => {
        const cur = parseInt(editRankScoreInput.value) || 0;
        editRankScoreInput.value = Math.max(0, cur - 10);
        updateLiveRankPreview(editRankScoreInput.value);
    });
}

if (btnStepPlus10) {
    btnStepPlus10.addEventListener('click', () => {
        const cur = parseInt(editRankScoreInput.value) || 0;
        editRankScoreInput.value = Math.min(999999, cur + 10);
        updateLiveRankPreview(editRankScoreInput.value);
    });
}

if (btnStepPlus100) {
    btnStepPlus100.addEventListener('click', () => {
        const cur = parseInt(editRankScoreInput.value) || 0;
        editRankScoreInput.value = Math.min(999999, cur + 100);
        updateLiveRankPreview(editRankScoreInput.value);
    });
}

// Preset buttons
document.querySelectorAll('.btn-preset').forEach(btn => {
    btn.addEventListener('click', () => {
        const preset = parseInt(btn.dataset.preset) || 0;
        if (editRankScoreInput) editRankScoreInput.value = preset;
        updateLiveRankPreview(preset);
    });
});

// Lưu toàn bộ thông tin người chơi (Tên, Avatar, Điểm Rank) vào Firestore & Firebase Auth qua Server API
if (btnSaveEditRank) {
    btnSaveEditRank.addEventListener('click', async () => {
        if (!currentEditingUser) return;

        const newUsername = editUsernameInput ? editUsernameInput.value.trim() : '';
        if (!newUsername) {
            showToast('Tên người chơi không được để trống!', 'warning');
            if (editUsernameInput) editUsernameInput.focus();
            return;
        }

        const newScore = Math.max(0, parseInt(editRankScoreInput.value) || 0);
        const newAvatarBase64 = currentEditingAvatarBase64;

        btnSaveEditRank.disabled = true;
        btnSaveEditRank.textContent = 'ĐANG LƯU...';

        const serverUrl = getServerUrl();
        try {
            const res = await fetch(`${serverUrl}/api/admin/users/${currentEditingUser.uid}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'x-admin-key': adminKey
                },
                body: JSON.stringify({
                    username: newUsername,
                    avatarBase64: newAvatarBase64,
                    rankScore: newScore
                })
            });

            const data = await res.json();
            if (data.success) {
                showToast(`Đã cập nhật thông tin người chơi "${newUsername}" thành công!`, 'success');
                
                // Cập nhật local state
                currentEditingUser.username = newUsername;
                currentEditingUser.avatarBase64 = newAvatarBase64;
                currentEditingUser.rankScore = newScore;

                const found = rawUsersList.find(u => u.uid === currentEditingUser.uid);
                if (found) {
                    found.username = newUsername;
                    found.avatarBase64 = newAvatarBase64;
                    found.rankScore = newScore;
                }

                closeEditRankModal();
                applyFiltersAndRender();
            } else {
                showToast(data.message || 'Lỗi khi cập nhật thông tin người chơi', 'error');
            }
        } catch (err) {
            showToast('Lỗi kết nối khi lưu: ' + err.message, 'error');
        } finally {
            btnSaveEditRank.disabled = false;
            btnSaveEditRank.textContent = 'LƯU THAY ĐỔI';
        }
    });
}

// ==========================================================================
// 6. DELETE CONFIRMATION & EXECUTION
// ==========================================================================

function promptDeleteSingle(uid, username, email) {
    pendingDeleteTarget = { type: 'single', uid, username, email };
    if (deleteModalTitle) deleteModalTitle.textContent = 'XÁC NHẬN XÓA TÀI KHOẢN';
    if (deleteTargetInfo) {
        deleteTargetInfo.innerHTML = `
            <div style="font-weight: 700; color: #ffffff; margin-bottom: 4px;">Người chơi: <span style="color: #ef4444;">${username}</span></div>
            <div style="color: #94a3b8; margin-bottom: 4px;">Email: <b>${email}</b></div>
            <div style="color: #64748b; font-family: monospace; font-size: 0.82rem;">UID: ${uid}</div>
        `;
    }
    if (deleteModal) deleteModal.classList.remove('hidden');
}

if (btnBulkDelete) {
    btnBulkDelete.addEventListener('click', () => {
        if (selectedUids.size === 0) return;
        pendingDeleteTarget = { type: 'bulk', uids: Array.from(selectedUids) };
        if (deleteModalTitle) deleteModalTitle.textContent = `XÁC NHẬN XÓA HÀNG LOẠT (${selectedUids.size} TÀI KHOẢN)`;
        if (deleteTargetInfo) {
            deleteTargetInfo.innerHTML = `
                <div style="font-weight: 700; color: #ffffff; margin-bottom: 6px;">Bạn chuẩn bị xóa vĩnh viễn <b style="color:#ef4444;">${selectedUids.size}</b> tài khoản đã chọn.</div>
                <div style="max-height: 120px; overflow-y: auto; font-family: monospace; font-size: 0.8rem; color: #94a3b8; background: #09090b; padding: 8px; border: 1px solid #3f3f46;">
                    ${Array.from(selectedUids).join('<br>')}
                </div>
            `;
        }
        if (deleteModal) deleteModal.classList.remove('hidden');
    });
}

function closeDeleteModal() {
    if (deleteModal) deleteModal.classList.add('hidden');
    pendingDeleteTarget = null;
}

if (btnCloseDeleteModal) btnCloseDeleteModal.addEventListener('click', closeDeleteModal);
if (btnCancelDelete) btnCancelDelete.addEventListener('click', closeDeleteModal);

if (btnConfirmDelete) {
    btnConfirmDelete.addEventListener('click', async () => {
        if (!pendingDeleteTarget) return;

        btnConfirmDelete.disabled = true;
        btnConfirmDelete.textContent = 'ĐANG XÓA...';

        const serverUrl = getServerUrl();
        try {
            if (pendingDeleteTarget.type === 'single') {
                const uid = pendingDeleteTarget.uid;
                const res = await fetch(`${serverUrl}/api/admin/users/${uid}`, {
                    method: 'DELETE',
                    headers: {
                        'x-admin-key': adminKey
                    }
                });
                const data = await res.json();
                if (data.success) {
                    showToast(`Đã xóa vĩnh viễn tài khoản ${pendingDeleteTarget.username || uid}!`, 'success');
                    rawUsersList = rawUsersList.filter(u => u.uid !== uid);
                    selectedUids.delete(uid);
                } else {
                    showToast(data.message || 'Lỗi khi xóa tài khoản', 'error');
                }
            } else if (pendingDeleteTarget.type === 'bulk') {
                const uids = pendingDeleteTarget.uids;
                const res = await fetch(`${serverUrl}/api/admin/users/bulk-delete`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'x-admin-key': adminKey
                    },
                    body: JSON.stringify({ uids })
                });
                const data = await res.json();
                if (data.success) {
                    showToast(`Đã xóa thành công ${uids.length} tài khoản!`, 'success');
                    rawUsersList = rawUsersList.filter(u => !uids.includes(u.uid));
                    selectedUids.clear();
                } else {
                    showToast(data.message || 'Lỗi khi xóa hàng loạt', 'error');
                }
            }

            closeDeleteModal();
            updateBulkDeleteButton();
            calculateStats();
            applyFiltersAndRender();
        } catch (err) {
            showToast('Lỗi kết nối khi xóa: ' + err.message, 'error');
        } finally {
            btnConfirmDelete.disabled = false;
            btnConfirmDelete.textContent = 'XÓA TẬN GỐC';
        }
    });
}

// ==========================================================================
// 7. HELPERS (RANK IMAGES FROM ranker/ FOLDER)
// ==========================================================================

function getRankDetails(pts) {
    const p = parseInt(pts) || 0;
    if (p >= 1500) return { name: 'Bất bại', icon: 'ranker/batbai.png', badge: '🏆' };
    if (p >= 1000) return { name: 'Huyền thoại', icon: 'ranker/huyenthoai.png', badge: '👑' };
    if (p >= 600) return { name: 'Cao thủ', icon: 'ranker/caothu.png', badge: '⚔️' };
    if (p >= 300) return { name: 'Pro', icon: 'ranker/pro.png', badge: '🔥' };
    if (p >= 100) return { name: 'Biết chơi', icon: 'ranker/bietchoi.png', badge: '⭐' };
    return { name: 'Gà mờ', icon: 'ranker/gamo.png', badge: '🐣' };
}

function formatTimeDetails(isoString) {
    if (!isoString) return { relative: 'Chưa online', exact: 'Không có dữ liệu' };

    const date = new Date(isoString);
    if (isNaN(date.getTime())) return { relative: 'Không rõ', exact: isoString };

    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    let relative = '';
    if (diffSec < 60) relative = '🟢 Vừa xong';
    else if (diffSec < 3600) relative = `🟢 ${Math.floor(diffSec / 60)} phút trước`;
    else if (diffSec < 86400) relative = `🟡 ${Math.floor(diffSec / 3600)} giờ trước`;
    else if (diffSec < 86400 * 7) relative = `${Math.floor(diffSec / 86400)} ngày trước`;
    else if (diffSec < 86400 * 30) relative = `${Math.floor(diffSec / (86400 * 7))} tuần trước`;
    else relative = `${Math.floor(diffSec / (86400 * 30))} tháng trước`;

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hour = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    const sec = String(date.getSeconds()).padStart(2, '0');
    const exact = `${day}/${month}/${year} ${hour}:${min}:${sec}`;

    return { relative, exact };
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function showToast(msg, type = 'success') {
    if (!toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${msg}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.2s ease';
        setTimeout(() => toast.remove(), 250);
    }, 3500);
}

// ==========================================================================
// 8. INITIALIZE ON LOAD
// ==========================================================================

checkServerHealth();
fetchUsersList();
fetchSystemSettings();

