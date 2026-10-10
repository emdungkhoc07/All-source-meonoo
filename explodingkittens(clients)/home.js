// Universal Desktop Canvas 2340x1080 (19.5:9) GPU Matrix Auto-Scale & Fullscreen / Landscape Engine
(function () {
    const DESIGN_WIDTH = 2340;
    const DESIGN_HEIGHT = 1080;

    function fitScreenPrecision() {
        if (!document.body) return;
        // Khóa cố định canvas, không đẩy web khi bàn phím ảo điện thoại mở lên
        if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
            return;
        }

        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        let scale = windowHeight / DESIGN_HEIGHT;
        if (DESIGN_WIDTH * scale > windowWidth) {
            scale = windowWidth / DESIGN_WIDTH;
        }

        const offsetX = Math.round((windowWidth - DESIGN_WIDTH * scale) / 2);
        const offsetY = Math.round((windowHeight - DESIGN_HEIGHT * scale) / 2);

        window._appScale = scale;
        window._appOffsetX = offsetX;
        window._appOffsetY = offsetY;

        const fitStyle = document.getElementById('instant-screen-fit');
        if (fitStyle) {
            fitStyle.innerHTML = `body { transform: translate(${offsetX}px, ${offsetY}px) scale(${scale}) !important; transform-origin: 0 0 !important; }`;
        }
        document.body.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
    }

    const preventKeyboardDisplacement = () => {
        window.scrollTo(0, 0);
        if (document.body) document.body.scrollTop = 0;
        if (document.documentElement) document.documentElement.scrollTop = 0;
    };

    document.addEventListener('focusin', (e) => {
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
            preventKeyboardDisplacement();
            setTimeout(preventKeyboardDisplacement, 50);
            setTimeout(preventKeyboardDisplacement, 150);
            setTimeout(preventKeyboardDisplacement, 300);
        }
    });

    document.addEventListener('focusout', (e) => {
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
            setTimeout(() => {
                preventKeyboardDisplacement();
                fitScreenPrecision();
            }, 100);
        }
    });

    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', () => {
            if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
                preventKeyboardDisplacement();
            }
        });
        window.visualViewport.addEventListener('scroll', () => {
            if (document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA')) {
                preventKeyboardDisplacement();
            }
        });
    }

    window.getAppScale = () => window._appScale || 1;
    window.fitScreenPrecision = fitScreenPrecision;

    window.addEventListener('DOMContentLoaded', fitScreenPrecision);
    window.addEventListener('load', fitScreenPrecision);
    window.addEventListener('resize', fitScreenPrecision);
    window.addEventListener('orientationchange', () => {
        setTimeout(fitScreenPrecision, 100);
        setTimeout(fitScreenPrecision, 300);
    });

    // Universal Fullscreen Toggle Function (Hỗ trợ toàn diện cho iOS Safari & Android)
    window.requestUniversalFullscreen = async () => {
        const docEl = document.documentElement;
        try {
            if (docEl.requestFullscreen) {
                await docEl.requestFullscreen();
                return true;
            } else if (docEl.webkitRequestFullscreen) {
                await docEl.webkitRequestFullscreen();
                return true;
            } else if (docEl.webkitEnterFullscreen) {
                await docEl.webkitEnterFullscreen();
                return true;
            }
        } catch (err) {
            console.warn("[Fullscreen] API fallback:", err);
        }

        window.scrollTo(0, 0);
        setTimeout(() => window.scrollTo(0, 1), 100);
        setTimeout(() => window.scrollTo(0, 0), 250);
        fitScreenPrecision();
        return true;
    };

    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    const isKeyboardActive = () => {
        const el = document.activeElement;
        if (!el) return false;
        // Ô nhập của chính popup xoay ngang (nếu có) không được tính là bàn phím
        if (el.id === 'mobileRotateAcceptBtn') return false;
        const tag = el.tagName;
        return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
    };

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                     (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

    if (isMobile) {
        // Cờ "đã bấm CHẤP NHẬN" CHỈ lưu trong bộ nhớ của tab hiện tại.
        // Cố tình KHÔNG lưu sessionStorage/localStorage: load lại web (F5) là mất cờ -> popup hiện lại.
        let rotateAccepted = false;
        let rotateObserver = null;
        let rotateWatchdog = null;

        const isPortrait = () => {
            if (isKeyboardActive()) return false; // Khi đang mở bàn phím ảo thì tuyệt đối không coi là xoay dọc
            if (screen.orientation && screen.orientation.type) {
                return screen.orientation.type.includes('portrait');
            }
            if (window.orientation !== undefined && typeof window.orientation === 'number') {
                return window.orientation === 0 || window.orientation === 180;
            }
            return window.innerHeight > window.innerWidth;
        };

        const isFullscreen = () => {
            if (isIOS) {
                // iOS iPhone không hỗ trợ Fullscreen API chuẩn HTML5, coi như Fullscreen nếu không ở chế độ dọc
                return !isPortrait();
            }
            let parentFullscreen = false;
            try {
                if (window.parent !== window && window.parent.document) {
                    parentFullscreen = !!(window.parent.document.fullscreenElement || window.parent.document.webkitFullscreenElement);
                }
            } catch(e) {}
            return !!(document.fullscreenElement || document.webkitFullscreenElement) || parentFullscreen;
        };

        // Điều kiện đã đạt yêu cầu: không xoay dọc VÀ đang fullscreen
        const isRequirementMet = () => !isPortrait() && isFullscreen();

        // Chặn mọi tương tác lọt xuống trang phía sau popup
        const swallowEvent = (e) => {
            e.stopPropagation();
            if (e.cancelable) e.preventDefault();
        };

        const removeRotatePrompt = () => {
            if (rotateObserver) { rotateObserver.disconnect(); rotateObserver = null; }
            if (rotateWatchdog) { clearInterval(rotateWatchdog); rotateWatchdog = null; }
            const promptEl = document.getElementById('mobileRotatePrompt');
            if (promptEl) promptEl.remove();
            document.removeEventListener('keydown', blockKeysWhilePrompt, true);
            document.removeEventListener('keyup', blockKeysWhilePrompt, true);
            document.removeEventListener('keypress', blockKeysWhilePrompt, true);
        };

        // Khi popup đang hiện: chặn toàn bộ phím ngoài popup (Esc, Tab, Enter, Space, F5 nếu chặn được...)
        const blockKeysWhilePrompt = (e) => {
            const promptEl = document.getElementById('mobileRotatePrompt');
            if (!promptEl) return;
            const acceptBtn = document.getElementById('mobileRotateAcceptBtn');
            // Cho phép Enter/Space kích hoạt đúng nút CHẤP NHẬN khi nó đang được focus
            if (e.target === acceptBtn && (e.key === 'Enter' || e.key === ' ')) return;
            e.stopPropagation();
            if (e.cancelable) e.preventDefault();
            // Giữ focus luôn nằm trên nút CHẤP NHẬN
            if (acceptBtn && document.activeElement !== acceptBtn) acceptBtn.focus();
        };

        const showRotatePrompt = () => {
            if (isKeyboardActive()) return; // Không hiển thị khi đang gõ phím
            if (document.getElementById('mobileRotatePrompt')) return;
            if (!document.documentElement) return;

            // ===== POPUP TỰ CÔ LẬP HOÀN TOÀN KHỎI CSS CỦA TRANG =====
            // - KHÔNG dùng class modal-*, btn-auth-submit (CSS trang sẽ đè font-size/padding bằng !important)
            // - KHÔNG dùng rem/em/vw/dvh (rem bị phóng theo cỡ chữ gốc của trang 2340px)
            // - Mọi cỡ chữ/khoảng cách tính bằng px và gắn !important trực tiếp trên từng phần tử
            // - Shadow DOM: CSS bên ngoài không thể đụng vào bên trong
            const vw = Math.max(window.innerWidth || 0, 1);
            const vh = Math.max(window.innerHeight || 0, 1);
            const shortSide = Math.min(vw, vh);

            // Cỡ chữ tính theo cạnh ngắn của màn hình thật (px), có chặn min/max
            const clampPx = (v, min, max) => Math.round(Math.max(min, Math.min(max, v)));
            const titlePx = clampPx(shortSide * 0.058, 18, 26);
            const descPx = clampPx(shortSide * 0.040, 13, 17);
            const btnPx = clampPx(shortSide * 0.042, 14, 18);
            const iconPx = clampPx(shortSide * 0.13, 44, 64);
            const padPx = clampPx(shortSide * 0.05, 14, 24);

            const overlay = document.createElement('div');
            overlay.id = 'mobileRotatePrompt';
            overlay.style.cssText = 'all: initial !important; position: fixed !important; top: 0 !important; left: 0 !important; right: 0 !important; bottom: 0 !important; width: 100% !important; height: 100% !important; z-index: 2147483647 !important; display: flex !important; align-items: center !important; justify-content: center !important; background: rgba(0, 0, 0, 0.96) !important; padding: 12px !important; box-sizing: border-box !important; overflow: hidden !important; opacity: 1 !important; visibility: visible !important; pointer-events: auto !important; transform: none !important; touch-action: none !important; font-size: 16px !important;';
            overlay.setAttribute('role', 'alertdialog');
            overlay.setAttribute('aria-modal', 'true');

            // Nuốt mọi loại sự kiện chạm/nhấp trên nền (bấm ngoài không làm gì cả)
            ['click', 'dblclick', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'touchstart', 'touchend', 'touchmove', 'contextmenu', 'wheel'].forEach(evt => {
                overlay.addEventListener(evt, (e) => {
                    const acceptBtn = overlay.querySelector('#mobileRotateAcceptBtn');
                    if (acceptBtn && (e.target === acceptBtn || acceptBtn.contains(e.target))) {
                        e.stopPropagation();
                        return;
                    }
                    swallowEvent(e);
                }, { passive: false });
            });

            const panel = document.createElement('div');
            panel.style.cssText = 'all: initial !important; display: flex !important; flex-direction: column !important; align-items: center !important; justify-content: center !important; gap: ' + padPx + 'px !important; width: 100% !important; max-width: 380px !important; max-height: 100% !important; overflow-y: auto !important; text-align: center !important; background: #18181b !important; border: 2px solid #52525b !important; padding: ' + (padPx + 4) + 'px !important; box-sizing: border-box !important; box-shadow: 0 20px 50px rgba(0,0,0,0.95) !important; font-family: "Be Vietnam Pro", Arial, sans-serif !important; border-radius: 0 !important; transform: none !important;';

            const iconSvg = document.createElement('div');
            iconSvg.style.cssText = 'all: initial !important; display: block !important; width: ' + iconPx + 'px !important; height: ' + iconPx + 'px !important; flex-shrink: 0 !important;';
            iconSvg.innerHTML = '<svg width="' + iconPx + '" height="' + iconPx + '" viewBox="0 0 24 24" fill="none" stroke="#fffdeb" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="display:block;width:' + iconPx + 'px;height:' + iconPx + 'px;"><rect x="6" y="2" width="12" height="20" rx="3" ry="3"></rect><line x1="9.5" y1="18.5" x2="14.5" y2="18.5"></line></svg>';
            panel.appendChild(iconSvg);

            const title = document.createElement('div');
            title.textContent = 'XOAY NGANG MÀN HÌNH';
            title.style.cssText = 'all: initial !important; display: block !important; color: #fffdeb !important; width: 100% !important; text-align: center !important; font-size: ' + titlePx + 'px !important; line-height: 1.25 !important; font-weight: 900 !important; letter-spacing: 1px !important; text-transform: uppercase !important; font-family: "Be Vietnam Pro", Arial, sans-serif !important; word-break: break-word !important;';
            panel.appendChild(title);

            const desc = document.createElement('div');
            desc.textContent = 'Vui lòng xoay ngang thiết bị để có trải nghiệm tốt nhất!';
            desc.style.cssText = 'all: initial !important; display: block !important; color: #e2e8f0 !important; width: 100% !important; text-align: center !important; font-size: ' + descPx + 'px !important; line-height: 1.5 !important; font-weight: 600 !important; font-family: "Be Vietnam Pro", Arial, sans-serif !important; word-break: break-word !important;';
            panel.appendChild(desc);

            const btn = document.createElement('button');
            btn.id = 'mobileRotateAcceptBtn';
            btn.type = 'button';
            btn.textContent = 'CHẤP NHẬN';
            btn.style.cssText = 'all: initial !important; display: flex !important; align-items: center !important; justify-content: center !important; width: 100% !important; box-sizing: border-box !important; padding: 12px 16px !important; min-height: 44px !important; background: #09090b !important; color: #fffdeb !important; border: 2px solid #fffdeb !important; border-radius: 0 !important; font-size: ' + btnPx + 'px !important; line-height: 1.2 !important; font-weight: 900 !important; letter-spacing: 1.5px !important; text-transform: uppercase !important; font-family: "Be Vietnam Pro", Arial, sans-serif !important; cursor: pointer !important; touch-action: manipulation !important; flex-shrink: 0 !important; transform: none !important;';

            btn.onmouseover = () => { btn.style.setProperty('background', '#fffdeb', 'important'); btn.style.setProperty('color', '#09090b', 'important'); };
            btn.onmouseout = () => { btn.style.setProperty('background', '#09090b', 'important'); btn.style.setProperty('color', '#fffdeb', 'important'); };

            let accepting = false;
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (accepting) return;
                accepting = true;
                try {
                    await window.requestUniversalFullscreen();
                    if (screen.orientation && screen.orientation.lock) {
                        await screen.orientation.lock('landscape').catch(() => {});
                    }
                } catch (err) {
                    console.warn("Không thể kích hoạt Fullscreen:", err);
                }
                // Chờ trình duyệt cập nhật trạng thái fullscreen/xoay rồi mới kiểm tra
                setTimeout(() => {
                    accepting = false;
                    // Chỉ gỡ popup khi THỰC SỰ đã đạt yêu cầu (ngang + fullscreen).
                    if (isRequirementMet()) {
                        rotateAccepted = true;
                        removeRotatePrompt();
                        fitScreenPrecision();
                    } else {
                        if (!document.getElementById('mobileRotatePrompt')) showRotatePrompt();
                    }
                }, 350);
            });

            panel.appendChild(btn);
            overlay.appendChild(panel);

            // Gắn vào documentElement (KHÔNG phải body) để thoát khỏi transform scale của body.
            document.documentElement.appendChild(overlay);

            // Khóa phím ở pha capture để chặn mọi phím bấm ra ngoài popup
            document.addEventListener('keydown', blockKeysWhilePrompt, true);
            document.addEventListener('keyup', blockKeysWhilePrompt, true);
            document.addEventListener('keypress', blockKeysWhilePrompt, true);

            try { btn.focus({ preventScroll: true }); } catch (e) { btn.focus(); }

            // ===== CHỐNG LÁCH LUẬT =====
            // 1) MutationObserver: nếu popup bị xóa khỏi DOM hoặc bị đổi style/class/thuộc tính -> dựng lại / ép lại ngay
            if (rotateObserver) rotateObserver.disconnect();
            rotateObserver = new MutationObserver(() => {
                if (isRequirementMet() && rotateAccepted) return;
                const el = document.getElementById('mobileRotatePrompt');
                if (!el) {
                    if (!isKeyboardActive()) showRotatePrompt();
                    return;
                }
                enforcePromptVisible(el);
            });
            rotateObserver.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class', 'hidden'] });

            // 2) Watchdog: kiểm tra định kỳ, ép style và dựng lại nếu cần
            if (rotateWatchdog) clearInterval(rotateWatchdog);
            rotateWatchdog = setInterval(() => {
                if (isKeyboardActive()) return;
                const el = document.getElementById('mobileRotatePrompt');
                if (isRequirementMet() && rotateAccepted) {
                    removeRotatePrompt();
                    return;
                }
                if (!el) {
                    showRotatePrompt();
                } else {
                    enforcePromptVisible(el);
                }
            }, 400);
        };

        // Ép popup luôn hiển thị đúng (chống ẩn bằng display:none, opacity, visibility, pointer-events, z-index...)
        function enforcePromptVisible(el) {
            const s = el.style;
            if (el.classList.contains('hidden')) el.classList.remove('hidden');
            if (el.hasAttribute('hidden')) el.removeAttribute('hidden');
            if (s.display !== 'flex') s.setProperty('display', 'flex', 'important');
            if (s.visibility !== 'visible') s.setProperty('visibility', 'visible', 'important');
            if (s.opacity !== '1') s.setProperty('opacity', '1', 'important');
            if (s.pointerEvents !== 'auto') s.setProperty('pointer-events', 'auto', 'important');
            if (s.position !== 'fixed') s.setProperty('position', 'fixed', 'important');
            if (s.zIndex !== '2147483647') s.setProperty('z-index', '2147483647', 'important');
            // Nếu popup bị chuyển sang cha khác (không còn là con trực tiếp của <html>) thì gắn lại
            if (el.parentNode !== document.documentElement) {
                document.documentElement.appendChild(el);
            }
        }

        const checkAndShowRotatePrompt = () => {
            const promptEl = document.getElementById('mobileRotatePrompt');
            // Nếu người dùng đang mở bàn phím để gõ chat thì không hiện prompt (giữ nguyên hành vi cũ)
            if (isKeyboardActive()) {
                if (promptEl) removeRotatePrompt();
                fitScreenPrecision();
                return;
            }
            if (!isRequirementMet()) {
                // Đang dọc hoặc thoát fullscreen -> BẮT BUỘC hiện lại popup, và đòi bấm CHẤP NHẬN lần nữa
                rotateAccepted = false;
                if (!promptEl) {
                    showRotatePrompt();
                } else {
                    enforcePromptVisible(promptEl);
                }
            } else {
                // Đã đạt yêu cầu nhưng chỉ được phép gỡ popup nếu người dùng ĐÃ bấm CHẤP NHẬN
                if (promptEl && rotateAccepted) {
                    removeRotatePrompt();
                }
            }
            fitScreenPrecision();
        };

        ['visibilitychange', 'fullscreenchange', 'webkitfullscreenchange', 'resize', 'orientationchange'].forEach(evt => {
            window.addEventListener(evt, () => {
                if (isKeyboardActive()) return;
                setTimeout(checkAndShowRotatePrompt, 100);
                setTimeout(checkAndShowRotatePrompt, 400);
            });
        });

        // Hiện popup ngay khi trang tải (F5 luôn bắt đầu lại từ trạng thái "chưa chấp nhận")
        setTimeout(checkAndShowRotatePrompt, 200);
        setTimeout(checkAndShowRotatePrompt, 800);
        window.addEventListener('load', () => setTimeout(checkAndShowRotatePrompt, 100));
    }

    document.addEventListener('gesturestart', (e) => e.preventDefault());
    document.addEventListener('gesturechange', (e) => e.preventDefault());
    document.addEventListener('gestureend', (e) => e.preventDefault());

    document.addEventListener('wheel', function (e) {
        if (e.ctrlKey) e.preventDefault();
    }, { passive: false });

    fitScreenPrecision();
})();

import { auth, db } from './config/firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";
import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore.js";

let allowAvatarUpload = true;
window.allowAvatarUpload = true;
let originalBase64 = '';

window.updateAvatarUploadUI = function(isAllowed) {
    window.allowAvatarUpload = isAllowed;
    allowAvatarUpload = isAllowed;
    const previewContainer = document.getElementById('avatarPreviewContainer');
    const editOverlay = document.querySelector('.avatar-edit-overlay');

    if (!isAllowed) {
        if (previewContainer) {
            previewContainer.classList.add('avatar-locked');
            previewContainer.setAttribute('title', 'Chức năng đã bị tắt');
        }
        if (editOverlay) {
            editOverlay.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`;
        }
    } else {
        if (previewContainer) {
            previewContainer.classList.remove('avatar-locked');
            previewContainer.setAttribute('title', 'Nhấp để chọn ảnh đại diện');
        }
        if (editOverlay) {
            editOverlay.innerHTML = `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>`;
        }
    }
};

// Lắng nghe cài đặt hệ thống real-time từ Firestore
try {
    onSnapshot(doc(db, 'system_settings', 'features'), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (typeof data.allowAvatarUpload === 'boolean') {
                window.updateAvatarUploadUI(data.allowAvatarUpload);
            }
        }
    }, (err) => {
        console.warn("[System Settings] onSnapshot error:", err);
    });
} catch(e) {}

// Nạp cài đặt ban đầu từ server REST API (được quản lý tập trung từ config/env.js)
(async function checkSystemSettingsInit() {
    try {
        const sUrl = (window.ENV && window.ENV.SOCKET_URL) ? window.ENV.SOCKET_URL.replace(/\/$/, '') : '';
        if (!sUrl) return;
        const res = await fetch(`${sUrl}/api/system/settings`, { cache: 'no-store' });
        if (res.ok) {
            const data = await res.json();
            if (data && data.settings && typeof data.settings.allowAvatarUpload === 'boolean') {
                window.updateAvatarUploadUI(data.settings.allowAvatarUpload);
            }
        }
    } catch(e) {}
})();

const userAvatar = document.getElementById('userAvatar');
const displayUsername = document.getElementById('displayUsername');
const avatarDropdown = document.getElementById('avatarDropdown');
const btnLogout = document.getElementById('btnLogout');
const btnProfile = document.getElementById('btnProfile');

// DOM Elements - Profile Modal
const profileModal = document.getElementById('profileModal');
const btnCloseProfile = document.getElementById('btnCloseProfile');
const avatarPreviewContainer = document.getElementById('avatarPreviewContainer');
const fileInputAvatar = document.getElementById('fileInputAvatar');
const avatarPreviewImage = document.getElementById('avatarPreviewImage');
const avatarPreviewText = document.getElementById('avatarPreviewText');
const btnSaveAvatar = document.getElementById('btnSaveAvatar');
const inputProfileUsername = document.getElementById('inputProfileUsername');

// DOM Elements - Alert Modal
const alertModal = document.getElementById('alertModal');
const alertTitle = document.getElementById('alertTitle');
const alertMessage = document.getElementById('alertMessage');
const alertButtons = document.getElementById('alertButtons');

// DOM Elements - Leaderboard Modal
const leaderboardModal = document.getElementById('leaderboardModal');
const btnCloseLeaderboard = document.getElementById('btnCloseLeaderboard');
const leaderboardList = document.getElementById('leaderboardList');
const userRankContainer = document.getElementById('userRankContainer');
const btnRankInfoHelp = document.getElementById('btnRankInfoHelp');
const rankInfoModal = document.getElementById('rankInfoModal');
const btnCloseRankInfo = document.getElementById('btnCloseRankInfo');

const userRankLogo = document.getElementById('userRankLogo');
const userRankTitle = document.getElementById('userRankTitle');
const userRankScore = document.getElementById('userRankScore');

// Load cached user data from localStorage immediately to prevent UI flickering on refresh (F5)
try {
    const cachedUsername = localStorage.getItem('cached_username');
    const cachedAvatar = localStorage.getItem('cached_avatar');
    const cachedRankTitle = localStorage.getItem('cached_rank_title');
    const cachedRankScore = localStorage.getItem('cached_rank_score');
    const cachedRankIcon = localStorage.getItem('cached_rank_icon');

    if (cachedUsername && displayUsername) displayUsername.textContent = cachedUsername;
    if (cachedAvatar && userAvatar) {
        userAvatar.innerHTML = `<img src="${cachedAvatar}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
    }
    if (cachedRankIcon && userRankLogo) userRankLogo.src = cachedRankIcon;
    if (cachedRankTitle && userRankTitle) userRankTitle.textContent = cachedRankTitle;
    if (cachedRankScore !== null && cachedRankScore !== undefined && userRankScore) {
        userRankScore.textContent = cachedRankScore;
    }
} catch (e) {
    console.warn("Lỗi khi load cache từ localStorage:", e);
}

// Helper: Hiển thị Pop-up Thông báo (Alert Modal)
function showAlert(title, message, buttons) {
    alertTitle.textContent = title;
    
    // Đổi màu: Nếu là LỖI thì màu đỏ, còn lại (THÔNG BÁO) thì màu trắng vàng
    if (title.includes("LỖI")) {
        alertTitle.style.color = "#ef4444";
    } else {
        alertTitle.style.color = "#fffdeb";
    }
    
    alertMessage.innerHTML = message;
    alertButtons.innerHTML = '';
    buttons.forEach(btnInfo => {
        const btn = document.createElement('button');
        btn.textContent = btnInfo.text;
        let typeClass = 'btn-alert-confirm';
        if (btnInfo.type === 'cancel') typeClass = 'btn-alert-cancel';
        if (btnInfo.type === 'neutral' || btnInfo.text === 'ĐÓNG') typeClass = 'btn-alert-neutral';
        btn.className = 'btn-alert ' + typeClass;
        btn.addEventListener('click', () => {
            alertModal.classList.add('hidden');
            if (btnInfo.onClick) btnInfo.onClick();
        });
        alertButtons.appendChild(btn);
    });
    alertModal.classList.remove('hidden');
    const primaryBtn = alertButtons.querySelector('.btn-alert-neutral') || alertButtons.querySelector('.btn-alert-confirm') || alertButtons.lastElementChild;
    if (primaryBtn) primaryBtn.focus();
}

let currentUser = null;
let currentBase64 = null;

// 1. Logic Đóng/Mở Dropdown Menu
userAvatar.addEventListener('click', (e) => {
    e.stopPropagation(); // Ngăn sự kiện click nổi bọt lên window
    avatarDropdown.classList.toggle('active');
});

// Click ra ngoài khoảng trống sẽ tự đóng menu
window.addEventListener('click', (e) => {
    if (!e.target.closest('.avatar-container')) {
        avatarDropdown.classList.remove('active');
    }
});

// 2. Logic Đăng xuất
btnLogout.addEventListener('click', async () => {
    try {
        localStorage.removeItem('cached_username');
        localStorage.removeItem('cached_avatar');
        localStorage.removeItem('cached_rank_title');
        localStorage.removeItem('cached_rank_score');
        localStorage.removeItem('cached_rank_icon');
        await signOut(auth);
        window.location.href = "index.html";
    } catch (error) {
        console.error("Lỗi đăng xuất:", error);
    }
});

btnProfile.addEventListener('click', () => {
    profileModal.classList.remove('hidden');
    avatarDropdown.classList.remove('active'); // Đóng menu dropdown
});

btnCloseProfile.addEventListener('click', () => {
    profileModal.classList.add('hidden');
});

// Click vào vùng preview để chọn ảnh
avatarPreviewContainer.addEventListener('click', () => {
    if (window.allowAvatarUpload === false) {
        showAlert("THÔNG BÁO", "Chức năng đã bị tắt", [{text: "ĐÓNG"}]);
        return;
    }
    fileInputAvatar.click();
});

// Xử lý nén ảnh và hiển thị preview
fileInputAvatar.addEventListener('change', (e) => {
    if (window.allowAvatarUpload === false) {
        fileInputAvatar.value = '';
        showAlert("THÔNG BÁO", "Chức năng đã bị tắt", [{text: "ĐÓNG"}]);
        return;
    }
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        showAlert("LỖI CHỌN ẢNH", "Vui lòng chọn một file ảnh hợp lệ.", [{text: "ĐÓNG"}]);
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            // Nén ảnh bằng Canvas
            const canvas = document.createElement('canvas');
            const MAX_WIDTH = 200;
            const MAX_HEIGHT = 200;
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }
            } else {
                if (height > MAX_HEIGHT) {
                    width *= MAX_HEIGHT / height;
                    height = MAX_HEIGHT;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            currentBase64 = canvas.toDataURL('image/jpeg', 0.8); // Nén jpeg 80%

            // Hiển thị preview
            avatarPreviewImage.src = currentBase64;
            avatarPreviewImage.style.display = 'block';
            avatarPreviewText.style.display = 'none';
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

// Lưu Avatar & Username
btnSaveAvatar.addEventListener('click', async () => {
    const newUsername = inputProfileUsername.value.trim();
    const usernameRegex = /^[a-zA-Z0-9A-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂưăạảấầẩẫậắằẳẵặẹẻẽềềểỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪễệỉịọỏốồổỗộớờởỡợụủứừỮỰỲỴÝỶỸửữựỳỵỷỹ\s]+$/;

    if (!newUsername) {
        showAlert("LỖI CẬP NHẬT", "Tên người dùng không được để trống.", [{text: "ĐÓNG"}]);
        return;
    }
    
    if (!usernameRegex.test(newUsername)) {
        showAlert("LỖI CẬP NHẬT", "Tên người dùng không được chứa kí tự đặc biệt!", [{text: "ĐÓNG"}]);
        return;
    }

    if (newUsername.length > 12) {
        showAlert("LỖI CẬP NHẬT", "Tên người dùng không được vượt quá 12 kí tự!", [{text: "ĐÓNG"}]);
        return;
    }

    // Kiểm tra nếu người dùng cố tình cập nhật ảnh khi đang bị khóa
    const hasAvatarChanged = (currentBase64 && currentBase64 !== originalBase64);
    if (hasAvatarChanged && window.allowAvatarUpload === false) {
        showAlert("THÔNG BÁO", "Chức năng đã bị tắt", [{text: "ĐÓNG"}]);
        return;
    }

    if (!currentBase64 && !newUsername) {
        showAlert("THÔNG BÁO", "Không có thay đổi nào để cập nhật.", [{text: "ĐÓNG"}]);
        return;
    }

    if (!currentUser) return;

    btnSaveAvatar.textContent = 'ĐANG CẬP NHẬT...';

    try {
        const updateData = {
            username: newUsername
        };
        if (hasAvatarChanged && window.allowAvatarUpload !== false) {
            updateData.avatarBase64 = currentBase64;
            originalBase64 = currentBase64;
        }
        
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, updateData);
        
        // Cập nhật giao diện bên ngoài
        if (hasAvatarChanged && window.allowAvatarUpload !== false) {
            userAvatar.innerHTML = `<img src="${currentBase64}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
            localStorage.setItem('cached_avatar', currentBase64);
        }
        if (displayUsername) {
            displayUsername.textContent = newUsername;
            localStorage.setItem('cached_username', newUsername);
        }
        if (typeof window.sendSocketAuth === 'function') window.sendSocketAuth();
        
        showAlert("THÔNG BÁO", "Cập nhật hồ sơ thành công!", [{text: "ĐÓNG"}]);
    } catch (error) {
        showAlert("LỖI CẬP NHẬT", "Lỗi: " + error.message, [{text: "ĐÓNG"}]);
    } finally {
        btnSaveAvatar.textContent = 'CẬP NHẬT';
    }
});

function getRankInfo(points) {
    const pts = parseInt(points) || 0;
    if (pts >= 1500) return { name: 'Bất bại', key: 'batbai', icon: 'assets/ranker/batbai.png' };
    if (pts >= 1000) return { name: 'Huyền thoại', key: 'huyenthoai', icon: 'assets/ranker/huyenthoai.png' };
    if (pts >= 600) return { name: 'Cao thủ', key: 'caothu', icon: 'assets/ranker/caothu.png' };
    if (pts >= 300) return { name: 'Pro', key: 'pro', icon: 'assets/ranker/pro.png' };
    if (pts >= 100) return { name: 'Biết chơi', key: 'bietchoi', icon: 'assets/ranker/bietchoi.png' };
    return { name: 'Gà mờ', key: 'gamo', icon: 'assets/ranker/gamo.png' };
}
window.getRankInfo = getRankInfo;

// --- GHI NHẬN THỜI GIAN ONLINE DUY NHẤT MỖI LẦN VÀO TRANG HOME (TIẾT KIỆM TÀI NGUYÊN) ---
let hasRecordedOnlineThisVisit = false;

let unsubscribeUserSnapshot = null;

// 3. Auth Guard (Bảo vệ trang) & Lấy dữ liệu Avatar & Rank
onAuthStateChanged(auth, async (user) => {
    // Nếu chưa có user (chưa đăng nhập hoặc phiên đã hết hạn) -> Đá văng về trang chủ
    if (!user) {
        if (unsubscribeUserSnapshot) {
            unsubscribeUserSnapshot();
            unsubscribeUserSnapshot = null;
        }
        window.location.href = "index.html";
        return;
    }
    
    currentUser = user;

    // Ghi nhận duy nhất 1 lần khi người dùng vào trang home, lần tiếp theo vào lại mới cập nhật tiếp
    if (!hasRecordedOnlineThisVisit) {
        hasRecordedOnlineThisVisit = true;
        try {
            const nowIso = new Date().toISOString();
            const userRef = doc(db, 'users', user.uid);
            updateDoc(userRef, {
                lastOnline: nowIso,
                lastActive: nowIso
            }).catch(async () => {
                // Nếu document chưa tồn tại, tạo mới
                try {
                    await setDoc(userRef, {
                        username: user.displayName || (user.email ? user.email.split('@')[0] : 'Người chơi'),
                        email: user.email || '',
                        createdAt: nowIso,
                        lastOnline: nowIso,
                        lastActive: nowIso,
                        rankScore: 0
                    }, { merge: true });
                } catch (e) {}
            });
        } catch(e) {}
    }

    // Lắng nghe biến động dữ liệu người dùng thời gian thực từ Firestore (Real-time onSnapshot)
    if (unsubscribeUserSnapshot) {
        unsubscribeUserSnapshot();
    }

    try {
        const userRef = doc(db, 'users', user.uid);
        unsubscribeUserSnapshot = onSnapshot(userRef, (snapshot) => {
            let displayName = "";
            let rankScore = 0;

            if (snapshot.exists()) {
                const data = snapshot.data();
                displayName = data.username || "";
                if (data.rankScore !== undefined && data.rankScore !== null) {
                    rankScore = parseInt(data.rankScore) || 0;
                }
                
                // Nếu có avatar base64 thì hiển thị
                if (data.avatarBase64) {
                    userAvatar.innerHTML = `<img src="${data.avatarBase64}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;">`;
                    currentBase64 = data.avatarBase64;
                    originalBase64 = data.avatarBase64;
                    if (avatarPreviewImage) avatarPreviewImage.src = currentBase64;
                    if (avatarPreviewImage) avatarPreviewImage.style.display = 'block';
                    if (avatarPreviewText) avatarPreviewText.style.display = 'none';
                }
            }
            
            // Fallback liên tiếp
            if (!displayName && user.displayName) displayName = user.displayName;
            if (!displayName && user.email) {
                let emailStr = user.email;
                displayName = emailStr.split('@')[0];
            }
            if (!displayName) displayName = "Tài Khoản";
            
            if (displayUsername) displayUsername.textContent = displayName;
            if (inputProfileUsername) inputProfileUsername.value = displayName;

            // Cập nhật Rank Logo & Điểm số ở góc trên bên trái
            window.currentUserRankScore = rankScore;
            const rankInfo = getRankInfo(rankScore);
            if (userRankLogo) userRankLogo.src = rankInfo.icon;
            if (userRankTitle) userRankTitle.textContent = (rankInfo.name || 'Gà mờ').toUpperCase();
            if (userRankScore) userRankScore.textContent = `${rankScore}`;

            // Lưu vào localStorage để không bị nhấp nháy khi F5
            try {
                localStorage.setItem('cached_username', displayName);
                if (currentBase64) {
                    localStorage.setItem('cached_avatar', currentBase64);
                }
                localStorage.setItem('cached_rank_title', rankInfo.name);
                localStorage.setItem('cached_rank_score', `${rankScore}`);
                localStorage.setItem('cached_rank_icon', rankInfo.icon);
            } catch (e) {
                console.warn("Lỗi khi lưu cache vào localStorage:", e);
            }

            // Đồng bộ điểm mới lên Server Socket ngay lập tức
            if (typeof window.sendSocketAuth === 'function') {
                window.sendSocketAuth();
            }

            // Nếu modal chi tiết phòng đang mở, re-render lại thẻ phòng ngay
            if (typeof window.renderRoomDetailUI === 'function') {
                window.renderRoomDetailUI();
            }
        }, (error) => {
            console.error("Lỗi Firestore onSnapshot user:", error);
        });
    } catch (e) {
        console.error("Lỗi khi thiết lập onSnapshot user:", e);
    }
});

// --- LOGIC BẢNG XẾP HẠNG LEADERBOARD ---
function loadLeaderboard() {
    if (!leaderboardList) return;
    leaderboardList.innerHTML = '<div style="color: #fffdeb; text-align: center; font-weight: bold; width: 100%; padding: 20px; font-family: \'Be Vietnam Pro\', sans-serif;">ĐANG TẢI BẢNG XẾP HẠNG...</div>';
    
    const socket = window.globalSocket;
    if (socket) {
        socket.emit('get_leaderboard');
    } else {
        leaderboardList.innerHTML = '<div style="color: #ef4444; text-align: center; width: 100%; padding: 20px; font-family: \'Be Vietnam Pro\', sans-serif;">LỖI KẾT NỐI SERVER!</div>';
    }
}

// Lắng nghe dữ liệu bảng xếp hạng từ Socket.io
function registerLeaderboardSocketListener() {
    const socket = window.globalSocket;
    if (socket) {
        socket.off('leaderboard_data');
        socket.on('leaderboard_data', ({ success, list, error }) => {
            if (!leaderboardList) return;
            if (!success) {
                console.error("Lỗi khi tải bảng xếp hạng từ server:", error);
                leaderboardList.innerHTML = `<div style="color: #ef4444; text-align: center; width: 100%; padding: 20px; font-family: 'Be Vietnam Pro', sans-serif;">LỖI TẢI BẢNG XẾP HẠNG! (${error})</div>`;
                return;
            }

            leaderboardList.innerHTML = '';
            if (!list || list.length === 0) {
                leaderboardList.innerHTML = '<div style="color: #a1a1aa; text-align: center; width: 100%; padding: 20px; font-family: \'Be Vietnam Pro\', sans-serif;">Chưa có dữ liệu người chơi.</div>';
                return;
            }

            list.forEach((p, idx) => {
                const username = p.username || "Người chơi";
                const rankScore = p.rankScore !== undefined ? parseInt(p.rankScore) || 0 : 0;
                const avatar = p.avatar || "";
                const rankInfo = getRankInfo(rankScore);

                const item = document.createElement('div');
                item.className = `leaderboard-item leaderboard-tier-${rankInfo.key}`;

                const avatarHtml = avatar ? 
                    `<img src="${avatar}" class="leaderboard-avatar" />` : 
                    `<div class="leaderboard-avatar leaderboard-avatar-default">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fffdeb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                    </div>`;

                let runningBorderHtml = '';
                if (rankInfo.key === 'huyenthoai' || rankInfo.key === 'batbai') {
                    runningBorderHtml = `
                        <span class="running-border-top"></span>
                        <span class="running-border-bottom"></span>
                    `;
                }

                item.innerHTML = `
                    ${runningBorderHtml}
                    <div class="leaderboard-user-section">
                        <span class="leaderboard-rank-number rank-top-${idx + 1}">#${idx + 1}</span>
                        ${avatarHtml}
                        <span class="leaderboard-username">${username}</span>
                    </div>
                    <div class="leaderboard-stats-section">
                        <span class="leaderboard-score">${rankScore}</span>
                        <img src="${rankInfo.icon}" class="leaderboard-rank-icon" alt="${rankInfo.name}" />
                    </div>
                `;
                leaderboardList.appendChild(item);
            });
        });
    }
}

// Đăng ký listener khi socket khả dụng
if (window.globalSocket) {
    registerLeaderboardSocketListener();
} else {
    const socketCheckInterval = setInterval(() => {
        if (window.globalSocket) {
            clearInterval(socketCheckInterval);
            registerLeaderboardSocketListener();
        }
    }, 50);
}

// Click vào container Rank để mở bảng xếp hạng
if (userRankContainer) {
    userRankContainer.style.cursor = 'pointer';
    userRankContainer.addEventListener('click', () => {
        if (leaderboardModal) {
            leaderboardModal.classList.remove('hidden');
            loadLeaderboard();
        }
    });
}

// Đóng bảng xếp hạng khi click nút X
if (btnCloseLeaderboard) {
    btnCloseLeaderboard.addEventListener('click', () => {
        if (leaderboardModal) leaderboardModal.classList.add('hidden');
    });
}

// Đóng bảng xếp hạng khi click ra ngoài modal-panel
window.addEventListener('click', (e) => {
    if (e.target === leaderboardModal) {
        leaderboardModal.classList.add('hidden');
    }
});

// Mở bảng giải thích các mức Rank (khi click vào icon chiếc cúp)
if (btnRankInfoHelp) {
    btnRankInfoHelp.addEventListener('click', () => {
        if (rankInfoModal) rankInfoModal.classList.remove('hidden');
    });
}

// Đóng bảng giải thích các mức Rank khi click nút X
if (btnCloseRankInfo) {
    btnCloseRankInfo.addEventListener('click', () => {
        if (rankInfoModal) rankInfoModal.classList.add('hidden');
    });
}

// Đóng bảng giải thích các mức Rank khi click ra ngoài modal-panel
window.addEventListener('click', (e) => {
    if (e.target === rankInfoModal) {
        rankInfoModal.classList.add('hidden');
    }
});

// --- XỬ LÝ SỰ KIỆN MỞ/ĐÓNG POPUP NEWUPDATE ---
const btnUpdateNotice = document.getElementById('btnUpdateNotice');
const updateNoticeModal = document.getElementById('updateNoticeModal');
const btnCloseUpdateNotice = document.getElementById('btnCloseUpdateNotice');
const updateNoticeContent = document.getElementById('updateNoticeContent');

if (btnUpdateNotice && updateNoticeModal) {
    btnUpdateNotice.addEventListener('click', async () => {
        updateNoticeModal.classList.remove('hidden');
        if (updateNoticeContent) updateNoticeContent.textContent = 'Đang tải thông tin cập nhật...';

        const filesToTry = ['new_update.json'];
        let loadedContent = null;

        for (const file of filesToTry) {
            try {
                const res = await fetch(file + '?v=' + Date.now());
                if (!res.ok) continue;

                const rawText = await res.text();
                if (!rawText || !rawText.trim()) continue;

                // 1. Thử parse JSON
                try {
                    const data = JSON.parse(rawText);
                    if (typeof data === 'string') {
                        loadedContent = data;
                    } else if (data && typeof data.content === 'string') {
                        loadedContent = data.content;
                    } else if (data && typeof data.message === 'string') {
                        loadedContent = data.message;
                    } else if (data && typeof data.update === 'string') {
                        loadedContent = data.update;
                    } else if (data && typeof data.notes === 'string') {
                        loadedContent = (data.version ? `Phiên bản: ${data.version}\n\n` : '') + data.notes;
                    } else if (Array.isArray(data)) {
                        loadedContent = data.map(item => typeof item === 'string' ? item : JSON.stringify(item)).join('\n');
                    } else if (data && typeof data === 'object') {
                        const values = Object.values(data).filter(v => typeof v === 'string');
                        if (values.length > 0) {
                            loadedContent = values.join('\n');
                        } else {
                            loadedContent = JSON.stringify(data, null, 2);
                        }
                    }
                } catch (jsonErr) {
                    // 2. Dự phòng: Nếu file không đúng cú pháp JSON (ví dụ người dùng viết text thuần hoặc quên key-value)
                    let cleanText = rawText.trim();
                    if (cleanText.startsWith('{') && cleanText.endsWith('}')) {
                        cleanText = cleanText.slice(1, -1).trim();
                    }
                    cleanText = cleanText.replace(/^["']|["']$/g, '').trim();
                    if (cleanText) {
                        loadedContent = cleanText;
                    }
                }

                if (loadedContent) break;
            } catch (e) {
                console.warn(`[UpdateNotice] Không thể tải ${file}:`, e);
            }
        }

        if (updateNoticeContent) {
            updateNoticeContent.textContent = loadedContent || 'Hiện chưa có thông tin cập nhật mới.';
        }
    });
}

if (btnCloseUpdateNotice && updateNoticeModal) {
    btnCloseUpdateNotice.addEventListener('click', () => {
        updateNoticeModal.classList.add('hidden');
    });
}

window.addEventListener('click', (e) => {
    if (e.target === updateNoticeModal) {
        updateNoticeModal.classList.add('hidden');
    }
});

// --- XỬ LÝ SỰ KIỆN MỞ/ĐÓNG POPUP DONATE ---
const btnDonateNotice = document.getElementById('btnDonateNotice');
const donateModal = document.getElementById('donateModal');
const btnCloseDonate = document.getElementById('btnCloseDonate');

if (btnDonateNotice && donateModal) {
    btnDonateNotice.addEventListener('click', () => {
        const donateImg = donateModal.querySelector('img');
        if (donateImg) {
            donateImg.onerror = () => {
                donateImg.onerror = null;
                donateImg.src = 'donate.jpg';
            };
            if (window.ENV && window.ENV.SOCKET_URL) {
                let serverUrl = window.ENV.SOCKET_URL;
                if (!serverUrl.endsWith('/')) serverUrl += '/';
                if (!donateImg.src.startsWith(serverUrl)) {
                    donateImg.src = serverUrl + 'donate.jpg';
                }
            }
        }
        donateModal.classList.remove('hidden');
    });
}
const btnDownloadDonate = document.getElementById('btnDownloadDonate');
if (btnDownloadDonate) {
    btnDownloadDonate.addEventListener('click', async (e) => {
        e.stopPropagation();
        const donateImg = donateModal ? donateModal.querySelector('img') : null;
        const imgSrc = (donateImg && donateImg.src) ? donateImg.src : 'donate.jpg';
        try {
            const response = await fetch(imgSrc);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = 'donate_nguyenvi.jpg';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
        } catch (err) {
            const a = document.createElement('a');
            a.href = imgSrc;
            a.download = 'donate_nguyenvi.jpg';
            a.target = '_blank';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    });
}
if (btnCloseDonate && donateModal) {
    btnCloseDonate.addEventListener('click', () => {
        donateModal.classList.add('hidden');
    });
}
window.addEventListener('click', (e) => {
    if (e.target === donateModal) {
        donateModal.classList.add('hidden');
    }
});
