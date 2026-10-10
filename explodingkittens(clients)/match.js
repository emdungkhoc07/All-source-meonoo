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
        document.body.style.willChange = 'auto';
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
        const tag = el.tagName;
        return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
    };

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                     (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

    if (isMobile) {
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

        const checkAndShowRotatePrompt = () => {
            const promptEl = document.getElementById('mobileRotatePrompt');
            // Nếu người dùng đang mở bàn phím để gõ chat thì gỡ ngay lập tức và không hiện prompt
            if (isKeyboardActive()) {
                if (promptEl) promptEl.remove();
                fitScreenPrecision();
                return;
            }
            if (isPortrait() || !isFullscreen()) {
                if (!promptEl) {
                    showRotatePrompt();
                }
            } else {
                if (promptEl) {
                    promptEl.remove();
                }
            }
            fitScreenPrecision();
        };

        const showRotatePrompt = () => {
            if (isKeyboardActive()) return; // Không hiển thị khi đang gõ phím
            if (document.getElementById('mobileRotatePrompt')) return;

            const overlay = document.createElement('div');
            overlay.id = 'mobileRotatePrompt';
            overlay.className = 'modal-backdrop';
            overlay.style.cssText = 'position: fixed; inset: 0; z-index: 2147483647; display: flex; align-items: center; justify-content: center; background: rgba(0, 0, 0, 0.94); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);';
            
            const panel = document.createElement('div');
            panel.className = 'modal-panel';
            panel.style.cssText = 'max-width: 1200px; width: 92%; text-align: center; box-shadow: 0 40px 90px rgba(0,0,0,0.98); font-family: "Be Vietnam Pro", sans-serif; background: #18181b; border: 4px solid #52525b; padding: 60px 72px; border-radius: 0; box-sizing: border-box;';
            
            const header = document.createElement('div');
            header.className = 'modal-header';
            header.style.cssText = 'display: flex; flex-direction: column; align-items: center; justify-content: center; background: transparent; padding: 0; margin-bottom: 30px;';
            
            const iconSvg = document.createElement('div');
            iconSvg.innerHTML = `<svg width="140" height="140" viewBox="0 0 24 24" fill="none" stroke="#fffdeb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom: 24px;"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect><path d="M12 18h.01"></path><path d="M17 6l3 3-3 3"></path><path d="M7 18l-3-3 3-3"></path></svg>`;
            header.appendChild(iconSvg);

            const title = document.createElement('h2');
            title.style.cssText = 'color: #fffdeb; width: 100%; text-align: center; margin: 0; font-size: 4.2rem; text-transform: uppercase; font-family: "Be Vietnam Pro", sans-serif; font-weight: 900; letter-spacing: 3px;';
            title.textContent = 'XOAY NGANG MÀN HÌNH';
            header.appendChild(title);
            panel.appendChild(header);

            const body = document.createElement('div');
            body.className = 'modal-body';
            body.style.cssText = 'text-align: center; display: flex; flex-direction: column; align-items: center; gap: 36px; padding: 0;';

            const desc = document.createElement('p');
            desc.style.cssText = 'color: #e2e8f0; font-size: 2.8rem; line-height: 1.6; margin: 0; font-weight: 600;';
            desc.textContent = 'Vui lòng xoay ngang thiết bị để có trải nghiệm tốt nhất!';
            body.appendChild(desc);

            const btn = document.createElement('button');
            btn.className = 'btn-auth-submit';
            btn.style.cssText = 'width: 100%; margin: 0; font-size: 2.8rem; font-weight: 900; letter-spacing: 3px; padding: 30px 60px; background: #09090b; color: #fffdeb; border: 4px solid #fffdeb; border-radius: 0; text-transform: uppercase; cursor: pointer; transition: all 0.2s ease; box-sizing: border-box;';
            btn.textContent = 'CHẤP NHẬN';

            btn.onmouseover = () => { btn.style.background = '#fffdeb'; btn.style.color = '#09090b'; };
            btn.onmouseout = () => { btn.style.background = '#09090b'; btn.style.color = '#fffdeb'; };

            btn.addEventListener('click', async () => {
                try {
                    await window.requestUniversalFullscreen();
                    if (screen.orientation && screen.orientation.lock) {
                        await screen.orientation.lock('landscape').catch(() => {});
                    }
                    try { sessionStorage.setItem('meono_fullscreen_accepted', '1'); } catch(e) {}
                } catch (err) {
                    console.warn("Không thể kích hoạt Fullscreen:", err);
                } finally {
                    overlay.remove();
                    fitScreenPrecision();
                }
            });

            body.appendChild(btn);
            panel.appendChild(body);
            overlay.appendChild(panel);
            document.body.appendChild(overlay);
        };

        ['visibilitychange', 'fullscreenchange', 'webkitfullscreenchange', 'resize', 'orientationchange'].forEach(evt => {
            window.addEventListener(evt, () => {
                if (isKeyboardActive()) return;
                setTimeout(checkAndShowRotatePrompt, 100);
                setTimeout(checkAndShowRotatePrompt, 400);
            });
        });

        setTimeout(checkAndShowRotatePrompt, 200);

        const autoRestoreFullscreen = async () => {
            try {
                const accepted = sessionStorage.getItem('meono_fullscreen_accepted');
                if (!accepted) return;
                if (isFullscreen()) return;
                await window.requestUniversalFullscreen();
                if (screen.orientation && screen.orientation.lock) {
                    await screen.orientation.lock('landscape').catch(() => {});
                }
                const promptEl = document.getElementById('mobileRotatePrompt');
                if (promptEl) promptEl.remove();
            } catch(e) {}
        };
        document.addEventListener('touchstart', autoRestoreFullscreen, { once: true });
        document.addEventListener('click', autoRestoreFullscreen, { once: true });
    }

    document.addEventListener('gesturestart', (e) => e.preventDefault());
    document.addEventListener('gesturechange', (e) => e.preventDefault());
    document.addEventListener('gestureend', (e) => e.preventDefault());

    document.addEventListener('wheel', function (e) {
        if (e.ctrlKey) e.preventDefault();
    }, { passive: false });

    fitScreenPrecision();
})();

// match.js - Logic and interactive algorithms for Match Card Game
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('roomId');
const socketUrl = (window.ENV && window.ENV.SOCKET_URL) || 'https://explodingkitten-sever.onrender.com';
const socket = io(socketUrl, {
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 3000,
    timeout: 60000
});

const matchAuthRaw = localStorage.getItem('matchAuth');
const matchAuth = matchAuthRaw ? JSON.parse(matchAuthRaw) : null;
let myUid = (matchAuth && matchAuth.uid) ? matchAuth.uid : localStorage.getItem('meono_guest_uid');
if (!myUid) {
    myUid = 'guest_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
    localStorage.setItem('meono_guest_uid', myUid);
}

// Helper giải quyết nhanh tài nguyên đã nạp sẵn trong RAM (0ms không cần request mạng)
function resolveAsset(path) {
    if (!path) return path;
    return (typeof window.getPreloadedAssetUrl === 'function') 
        ? window.getPreloadedAssetUrl(path) 
        : ((window.parent && typeof window.parent.getPreloadedAssetUrl === 'function') 
            ? window.parent.getPreloadedAssetUrl(path) 
            : path);
}

// Hàm giúp thoát game an toàn (kể cả khi chạy trong Iframe hoặc standalone)
function returnToHome() {
    if (window.parent !== window && window.parent.postMessage) {
        window.parent.postMessage({ type: 'EXIT_GAME' }, '*');
    } else {
        window.location.href = 'home.html';
    }
}

function isMeUid(uid) {
    if (!uid) return false;
    return uid === myUid || (matchAuth && matchAuth.uid && uid === matchAuth.uid);
}

function isSelfUsername(name) {
    if (!name) return false;
    const clean = name.trim().toLowerCase();
    if (clean.includes('bạn') || clean === 'bạn' || clean === 'bạn.') return true;
    const myName = (typeof myUsername !== 'undefined' ? myUsername : (typeof matchState !== 'undefined' && matchState && matchState.players && matchState.players.find(p => p.socketId === socket?.id)?.username) || '').trim().toLowerCase();
    return myName && (clean === myName || clean.startsWith(myName));
}

function isMePlayer(socketId, uid, username) {
    if (socketId && typeof socket !== 'undefined' && socket && socket.id && socketId === socket.id) return true;
    if (uid && isMeUid(uid)) return true;
    if (username && isSelfUsername(username)) return true;
    return false;
}

let isCeremonyPlaying = false;

// --- PRELOAD TÀI NGUYÊN (TRÁNH LỖI MẠNG CHẬM) ---
const preloadedDieImg = new Image();
preloadedDieImg.src = 'assets/cards/die.png';

const preloadedSprites = [];
for (let i = 1; i <= 70; i++) {
    const img = new Image();
    img.src = `cards/exploding_kitten/sprite_${i}.png`;
    preloadedSprites.push(img);
}

// Preload 5 ảnh nền phong cảnh các phòng trận đấu vào RAM
const preloadedBackgrounds = [];
['assets/background/background1.jpg', 'assets/background/background2.jpg', 'assets/background/background3.jpg', 'assets/background/background4.jpg', 'assets/background/background5.jpg'].forEach(url => {
    const img = new Image();
    img.src = url;
    preloadedBackgrounds.push(img);
});

// Preload sticker chat bubble SVG và các file sticker PNG
const preloadedStickerSvg = new Image();
preloadedStickerSvg.src = 'assets/UI/sticker_chat.svg';
const preloadedStickers = [];
for (let st = 1; st <= 5; st++) {
    const sImg = new Image();
    sImg.src = `assets/sticker/sticker${st}.png`;
    preloadedStickers.push(sImg);
}

function applyRoomBackground(rId, customMapUrl) {
    const targetRoomId = rId || roomId || (typeof matchState !== 'undefined' && matchState ? matchState.roomId : null);

    let bgUrl = customMapUrl || null;
    if (!bgUrl && targetRoomId) {
        bgUrl = localStorage.getItem('matchSelectedMap_' + targetRoomId);
    }
    if (!bgUrl) {
        bgUrl = 'default';
    }

    const defaultRedGradient = 'radial-gradient(circle at 50% 40%, #6b1d22 0%, #3f0e11 60%, #1a0506 100%)';

    if (!bgUrl || bgUrl === 'default' || bgUrl === 'none' || bgUrl === 'default_red') {
        document.body.style.backgroundImage = 'none';
        document.body.style.background = defaultRedGradient;
        document.body.style.backgroundSize = 'cover';
        document.body.style.backgroundPosition = 'center';
        document.documentElement.style.backgroundColor = '#1a0506';
        return;
    }

    document.body.style.background = '';
    document.body.style.backgroundColor = '#1a0506';
    document.body.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.65)), url('${bgUrl}')`;
    document.body.style.backgroundSize = 'cover';
    document.body.style.backgroundPosition = 'center';
    document.body.style.backgroundRepeat = 'no-repeat';
    document.body.style.backgroundAttachment = 'scroll';
    document.documentElement.style.backgroundColor = '#1a0506';
}
applyRoomBackground(roomId);

function showAlert(title, message, buttons = [{ text: 'ĐÓNG' }]) {
    if (window.parent && window.parent !== window && typeof window.parent.showAlert === 'function') {
        window.parent.showAlert(title, message, buttons);
    } else {
        showGameToast(title, message, 'warning');
    }
}

function showGameToast(title, message, type = 'warning', duration = 4500, id = null) {
    const container = document.getElementById('gameToastContainer');
    if (!container) return;
    
    if (id) {
        const existing = document.getElementById(id);
        if (existing) existing.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = 'game-toast ' + type;
    if (id) toast.id = id;
    toast.innerHTML = '<div class="toast-message">' + message + '</div>';
    
    const usernames = toast.querySelectorAll('.toast-username');
    usernames.forEach(el => {
        const text = el.textContent || '';
        if (isSelfUsername(text)) {
            el.classList.add('toast-username-self');
            el.classList.remove('toast-username-opponent');
        } else {
            el.classList.add('toast-username-opponent');
            el.classList.remove('toast-username-self');
        }
    });
    
    container.appendChild(toast);
    
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });
    });
    
    if (duration > 0) {
        setTimeout(() => {
            if (toast.parentNode) {
                toast.classList.remove('show');
                toast.classList.add('hide');
                setTimeout(() => { if (toast.parentNode) toast.remove(); }, 500);
            }
        }, duration);
    }
    
    return toast;
}

function removeGameToast(id) {
    const toast = document.getElementById(id);
    if (toast) {
        toast.classList.remove('show');
        toast.classList.add('hide');
        setTimeout(() => { if (toast.parentNode) toast.remove(); }, 500);
    }
}

// --- KHÓA BẢO VỆ GIAO DIỆN (UI LOCK & ANTI-CONSOLE) ---
// Chặn chuột phải (Context Menu)
document.addEventListener('contextmenu', (e) => e.preventDefault());

// Chặn kéo thả UI (Drag & Drop)
document.addEventListener('dragstart', (e) => e.preventDefault());

// Chặn bôi đen / chọn văn bản (Text Selection)
document.addEventListener('selectstart', (e) => {
    if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
    }
});

// Chặn các phím tắt mở Console / DevTools (F12, Ctrl+Shift+I/J/C, Ctrl+U, v.v.)
document.addEventListener('keydown', (e) => {
    if (
        e.key === 'F12' || e.keyCode === 123 ||
        (e.ctrlKey && e.shiftKey && ['I', 'i', 'J', 'j', 'C', 'c'].includes(e.key)) ||
        (e.ctrlKey && ['U', 'u', 'S', 's', 'P', 'p'].includes(e.key))
    ) {
        e.preventDefault();
        return false;
    }
});
// --- KẾT THÚC KHÓA BẢO VỆ ---

// Card Deck Definition (Custom Action Cards)
const CARD_TYPES = [
    { id: 'defuse', name: 'Defuse' },
    { id: 'exploding_kitten', name: 'Mèo Cảm Tử' },
    { id: 'super_exploding_kitten', name: 'Siêu Mèo Cảm Tử' },
    { id: 'nope', name: 'Nope' },
    { id: 'supernope', name: 'Super Nope' },
    { id: 'nhintruoctuonglai1', name: 'Nhìn Tương Lai 1' },
    { id: 'nhintruoctuonglai', name: 'Nhìn Tương Lai' },
    { id: 'xaobai', name: 'Xào Bài' },
    { id: 'tancong', name: 'Tấn Công' },
    { id: 'skip', name: 'Skip' },
    { id: 'superskip', name: 'Super Skip' },
    { id: 'slap', name: 'Slap' },
    { id: 'slap2', name: 'Slap x2' },
    { id: 'slap3', name: 'Slap x3' },
    { id: 'inferno', name: 'INFERNO' },
    { id: 'inferno4', name: 'INFERNO 4' },
    { id: 'contrast', name: 'Đảo Nghịch' },
    { id: 'favor', name: 'Xin Xỏ' },
    { id: 'tacocat', name: 'Mèo Taco' },
    { id: 'zombiecat', name: 'Mèo Zombie' },
    { id: 'rainbowcat', name: 'Mèo Cầu Vồng' },
    { id: 'catermelon', name: 'Mèo Dưa Hấu' },
    { id: 'potatocat', name: 'Mèo Khoai Tây' },
    { id: 'golemcat', name: 'Mèo Golem' },
    { id: 'cattea', name: 'Mèo Trà' },
    { id: 'vampirecat', name: 'Mèo Ma Cà Rồng' },
    { id: 'streaking', name: 'Streaking' },
    { id: 'drawbottom', name: 'Draw Bottom' },
    { id: 'nhintruoctuonglai5', name: 'Nhìn Tương Lai 5' },
    { id: 'everywhere', name: 'Everywhere' },
    { id: 'whatcat', name: 'What cat' },
    { id: 'atomicbom', name: 'ATOMIC BOM' },
    { id: 'afterthefuture', name: 'Can thiệp tương lai' },
    { id: 'afterthefuture5', name: 'Can thiệp tương lai 5' },
    { id: 'theend', name: 'The End' },
    { id: 'freeze', name: 'Ngủ Đông' },
    { id: 'swap', name: 'Hoán Đổi' },
    { id: 'reverse', name: 'Đổi Chiều' },
    { id: 'switch', name: 'Switch' },
    { id: 'chest', name: 'Rương thưởng' },
    { id: 'clone', name: 'Clone' },
    { id: 'superfavor', name: 'Super Favor' },
    { id: 'seetheothers', name: 'Nhìn bài' },
    { id: 'garbage_collection', name: 'Dọn rác' },
    { id: 'locking', name: 'LOCKING' },
    { id: 'locking5', name: 'LOCKING 5' }
];

let handCards = [];
let remainingDeckCount = 0;
let discardCount = 0;
let discardedList = [];
let selectedCardIndex = null;
let lastPlayedCardRect = null;
let lastPlayedCardUid = null;
let isMyTurn = false;

// Khóa chặn tất cả mọi hành động liên quan tới logic game: (bốc bài, đánh bài) trong thời gian hoạt ảnh diễn ra (0.5s)
let isCardActionLocked = false;
let cardActionLockTimer = null;
let isDrawAnimationActive = false;
let pendingTurnChangeData = null;
let pendingTurnTimerData = null;
let drawAnimationTimer = null;

function lockCardActions(durationMs = 500) {
    isCardActionLocked = true;
    if (document.body) document.body.classList.add('card-action-locked');
    if (typeof updatePlayButtonState === 'function') updatePlayButtonState();
    clearTimeout(cardActionLockTimer);
    cardActionLockTimer = setTimeout(() => {
        isCardActionLocked = false;
        if (document.body) document.body.classList.remove('card-action-locked');
        if (typeof updatePlayButtonState === 'function') updatePlayButtonState();
    }, durationMs);
}

function isMobileDevice() {
    const ua = navigator.userAgent || navigator.vendor || window.opera || '';
    const isTouchMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(ua);
    const isSmallTouchScreen = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches && navigator.maxTouchPoints > 0 && window.innerWidth <= 1024);
    return isTouchMobile || isSmallTouchScreen;
}

const defaultFastPlay = !isMobileDevice(); // ON (true) cho Máy tính / PC, OFF (false) cho Điện thoại

let settings = {
    music: true,
    sfx: true,
    fastPlay: defaultFastPlay
};

const savedSettings = localStorage.getItem('matchSettings');
if (savedSettings) {
    try {
        const parsed = JSON.parse(savedSettings);
        if (parsed && typeof parsed === 'object') {
            if (parsed.music !== undefined) settings.music = !!parsed.music;
            if (parsed.sfx !== undefined) settings.sfx = !!parsed.sfx;
            if (parsed.fastPlay !== undefined) settings.fastPlay = !!parsed.fastPlay;
        }
    } catch (e) {
        console.error(e);
    }
}

// Quản lý âm thanh bằng Web Audio API (không cần file âm thanh bên ngoài)
const soundManager = {
    ctx: null,
    bgmAudio: new Audio('assets/sounds/music_theme.mp3'),
    explosionAudio: new Audio('assets/sounds/die.mp3'),
    tingAudio: new Audio('assets/sounds/ting.wav'),
    playCardAudio: new Audio('assets/sounds/play_card.wav'),
    drawCardAudio: new Audio('assets/sounds/draw_card.wav'),
    shuffleAudio: new Audio('assets/sounds/shuffle.wav'),
    defuseAudio: new Audio('assets/sounds/defuse.mp3'),
    explodingKittenAudio: new Audio('assets/sounds/exploding_kitten.mp3'),
    winAudio: new Audio('assets/sounds/win.mp3'),
    
    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.bgmAudio.loop = true;
            this.bgmAudio.volume = 0.2; // Giảm 80% âm lượng, chỉ còn 20%
            this.explosionAudio.volume = 1.0;
            this.tingAudio.volume = 0.8;
            this.playCardAudio.volume = 1.0;
            this.drawCardAudio.volume = 1.0;
            this.shuffleAudio.volume = 1.0;
            this.defuseAudio.volume = 1.0;
            this.explodingKittenAudio.volume = 1.0;
            this.winAudio.volume = 1.0;
            
            // Tăng âm lượng gấp 3 lần bằng GainNode cho các hiệu ứng
            const boostVolume = (audioEl, ctx, multiplier) => {
                try {
                    const source = ctx.createMediaElementSource(audioEl);
                    const gainNode = ctx.createGain();
                    gainNode.gain.value = multiplier;
                    source.connect(gainNode);
                    gainNode.connect(ctx.destination);
                } catch (e) {
                    console.warn("Could not boost volume for audio", e);
                }
            };
            
            boostVolume(this.playCardAudio, this.ctx, 3);
            boostVolume(this.drawCardAudio, this.ctx, 3);
            boostVolume(this.shuffleAudio, this.ctx, 3);
            boostVolume(this.defuseAudio, this.ctx, 3);
            boostVolume(this.explodingKittenAudio, this.ctx, 3);
            boostVolume(this.winAudio, this.ctx, 3);
        }
    },
    
    playSfx(type) {
        if (!settings.sfx) return;
        this.init();
        
        if (type === 'defuse') {
            try {
                this.defuseAudio.currentTime = 0;
                this.defuseAudio.play().catch(e => {
                    const resolveUrl = (typeof window.getPreloadedAssetUrl === 'function') 
                        ? window.getPreloadedAssetUrl 
                        : ((window.parent && typeof window.parent.getPreloadedAssetUrl === 'function') 
                            ? window.parent.getPreloadedAssetUrl 
                            : (u => u));
                    const fallbackAudio = new Audio(resolveUrl('assets/sounds/defuse.mp3'));
                    fallbackAudio.volume = 1.0;
                    fallbackAudio.play().catch(() => {});
                });
            } catch(e){}
            return;
        }
        if (type === 'exploding_kitten') {
            this.explodingKittenAudio.currentTime = 0;
            this.explodingKittenAudio.play().catch(e => {});
            return;
        }
        if (type === 'win') {
            this.winAudio.currentTime = 0;
            this.winAudio.play().catch(e => {});
            return;
        }
        if (type === 'locking') {
            try {
                if (!this.lockingAudio) {
                    this.lockingAudio = new Audio('cards/locking/locking.mp3');
                }
                this.lockingAudio.currentTime = 0;
                this.lockingAudio.play().catch(e => {});
            } catch(e){}
            return;
        }
        if (type === 'inferno') {
            try {
                if (!this.infernoAudio) {
                    this.infernoAudio = new Audio('assets/sounds/inferno.mp3');
                }
                this.infernoAudio.currentTime = 0;
                this.infernoAudio.play().catch(e => {});
            } catch(e){}
            return;
        }
        if (type === 'contrast') {
            try {
                if (!this.contrastAudio) {
                    this.contrastAudio = new Audio('assets/sounds/contrast.mp3');
                }
                this.contrastAudio.currentTime = 0;
                this.contrastAudio.play().catch(e => {});
            } catch(e){}
            return;
        }
        if (type === 'freeze_avatar') {
            try {
                if (!this.freezeAvatarAudio) {
                    this.freezeAvatarAudio = new Audio('assets/sounds/freeze_avatar.mp3');
                }
                this.freezeAvatarAudio.currentTime = 0;
                this.freezeAvatarAudio.play().catch(e => {});
            } catch(e){}
            return;
        }
        if (type === 'explosion') {
            this.explosionAudio.currentTime = 0;
            this.explosionAudio.play().catch(e => console.warn(e));
            return;
        }
        if (type === 'ting') {
            this.tingAudio.currentTime = 0;
            this.tingAudio.play().catch(e => {});
            return;
        }
        if (type === 'play_card' || type === 'card') {
            this.playCardAudio.currentTime = 0;
            this.playCardAudio.play().catch(e => {});
            return;
        }
        if (type === 'draw_card') {
            this.drawCardAudio.currentTime = 0;
            this.drawCardAudio.play().catch(e => {});
            return;
        }
        if (type === 'shuffle') {
            this.shuffleAudio.currentTime = 0;
            this.shuffleAudio.play().catch(e => {});
            return;
        }
    },
    
    toggleMusic(play) {
        this.init();
        if (play && settings.music) {
            this.bgmAudio.play().catch(e => console.warn('BGM play blocked:', e));
        } else {
            this.bgmAudio.pause();
        }
    }
};

// DOM Elements
const handContainer = document.getElementById('handContainer');
const centerDeck = document.getElementById('centerDeck');
const deckCountVal = document.getElementById('deckCountVal');
const discardPile = document.getElementById('discardPile');

// Cài đặt & Nút đánh bài điện thoại DOM Elements
const btnSettings = document.getElementById('btnSettings');
const settingsModal = document.getElementById('settingsModal');
const confirmCloseModal = document.getElementById('confirmCloseModal');
const btnCloseConfirmModal = document.getElementById('btnCloseConfirmModal');
const btnConfirmCloseRoom = document.getElementById('btnConfirmCloseRoom');
const btnCancelCloseRoom = document.getElementById('btnCancelCloseRoom');
const btnCloseSettings = document.getElementById('btnCloseSettings');
const toggleMusic = document.getElementById('toggleMusic');
const toggleSfx = document.getElementById('toggleSfx');
const toggleFastPlay = document.getElementById('toggleFastPlay');
const btnPlaySelected = document.getElementById('btnPlaySelected');
const btnInfoAction = document.getElementById('btnInfoAction');
const btnSortAction = document.getElementById('btnSortAction');

function applySettings() {
    localStorage.setItem('matchSettings', JSON.stringify(settings));
    if (settings.fastPlay) {
        document.body.classList.remove('fast-play-off');
        if (typeof matchState !== 'undefined' && matchState.active) {
            btnPlaySelected.classList.add('hidden');
            if (btnInfoAction) btnInfoAction.classList.add('hidden');
            if (btnSortAction) btnSortAction.classList.remove('hidden');
        }
        selectedCardIndex = null;
    } else {
        document.body.classList.add('fast-play-off');
        if (typeof matchState !== 'undefined' && matchState.active) {
            btnPlaySelected.classList.remove('hidden');
            if (btnInfoAction) btnInfoAction.classList.remove('hidden');
            if (btnSortAction) btnSortAction.classList.remove('hidden');
            updatePlayButtonState();
        }
    }
}

function isCloneInvalidToPlay() {
    let targetClonedCard = null;
    if (typeof discardedList !== 'undefined' && discardedList && discardedList.length > 0) {
        for (let i = discardedList.length - 1; i >= 0; i--) {
            const itemCard = discardedList[i].card || discardedList[i];
            const cId = itemCard ? (itemCard.id || itemCard.baseId) : null;
            if (cId && cId !== 'clone') {
                targetClonedCard = cId;
                break;
            }
        }
    }
    const nonCloneable = ['defuse', 'exploding_kitten', 'super_exploding_kitten', 'atomicbom', 'streaking', 'tacocat', 'zombiecat', 'rainbowcat', 'catermelon', 'potatocat', 'whatcat', 'contrast', 'golemcat', 'cattea', 'vampirecat'];
    return (!targetClonedCard || nonCloneable.includes(targetClonedCard) || targetClonedCard.startsWith('combo_'));
}

// Kiểm tra tính hợp lệ tuyệt đối của một lá bài trên tay khi muốn đánh ra
function canPlayCard(index) {
    if (index === null || index === undefined || index < 0 || index >= handCards.length) return false;
    const playedCard = handCards[index];
    if (!playedCard) return false;

    // Trạng thái Ngủ Đông (Freeze)
    if (matchState.isMeFrozen) return false;

    // Lá bài đang bị Locking khóa
    if (matchState.myLockedCardUids && matchState.myLockedCardUids.includes(playedCard.uid)) return false;

    const isSelfNope = matchState.isWaitingNope && (playedCard.id === 'nope' || playedCard.id === 'supernope') && matchState.lastPendingPlayerSocketId === socket.id;
    const isEmergencyNope = matchState.isWaitingNope && (playedCard.id === 'nope' || playedCard.id === 'supernope') && !isSelfNope;

    if (!isEmergencyNope) {
        if (typeof isCeremonyPlaying !== 'undefined' && isCeremonyPlaying) return false;
        if (typeof isCardActionLocked !== 'undefined' && isCardActionLocked) return false;
        if (typeof isDrawAnimationActive !== 'undefined' && isDrawAnimationActive) return false;
    } else {
        if (typeof isCeremonyPlaying !== 'undefined' && isCeremonyPlaying) return false;
    }

    // Khi được xin bài (favorPickMode): cho phép tặng bất kỳ lá bài nào
    if (matchState.favorPickMode) return true;

    // Lá Nope / Super Nope: chỉ đánh khi đang có bài chờ (isWaitingNope) và không tự Nope chính mình
    if (playedCard.id === 'nope' || playedCard.id === 'supernope') {
        return !!(matchState.isWaitingNope && !isSelfNope);
    }

    // Tất cả các lá bài khác: chỉ được đánh trong lượt của mình và KHÔNG trong lúc đang chờ Nope
    if (!isMyTurn || matchState.isWaitingNope) return false;

    // Các lá bài thụ động / không thể chủ động đánh xuống bàn
    if (['defuse', 'exploding_kitten', 'super_exploding_kitten', 'streaking', 'atomicbom', 'contrast'].includes(playedCard.id)) {
        return false;
    }

    // Lá Clone: kiểm tra lá bài đầu cọc bài bỏ có clone được không
    if (playedCard.id === 'clone') {
        if (isCloneInvalidToPlay()) return false;
    }

    // Bài vô chức năng (vanilla cats + whatcat): phải đủ điều kiện tạo Combo (combo 2, combo 3, hoặc combo 5)
    const validVanilla = ['catermelon', 'rainbowcat', 'potatocat', 'zombiecat', 'tacocat', 'golemcat', 'cattea', 'vampirecat'];
    if (validVanilla.includes(playedCard.id) || playedCard.id === 'whatcat') {
        const lockedUids = matchState.myLockedCardUids || [];
        const usableHandCards = handCards.filter(c => !lockedUids.includes(c.uid));
        const whatCatsInHand = usableHandCards.filter(c => c.id === 'whatcat');

        // Combo 5 khác loại
        let uniqueVanillas = validVanilla.filter(v => usableHandCards.some(c => c.id === v));
        if (uniqueVanillas.length + whatCatsInHand.length >= 5) {
            return true;
        }

        // Combo 2 hoặc 3 cùng loại
        let targetId = playedCard.id;
        if (playedCard.id === 'whatcat') {
            let maxCount = -1;
            let bestVanilla = 'whatcat';
            validVanilla.forEach(v => {
                let count = usableHandCards.filter(c => c.id === v).length;
                if (count > maxCount && count > 0) {
                    maxCount = count;
                    bestVanilla = v;
                }
            });
            targetId = bestVanilla;
        }

        const sameCards = usableHandCards.filter(c => c.id === targetId);
        const availableWhatCats = targetId === 'whatcat' ? [] : whatCatsInHand;
        if (sameCards.length + availableWhatCats.length >= 2) {
            return true;
        }

        return false;
    }

    return true;
}

function updatePlayButtonState() {
    if (settings.fastPlay) return;
    if (selectedCardIndex !== null && selectedCardIndex < handCards.length) {
        if (btnInfoAction) btnInfoAction.classList.remove('disabled');
        if (canPlayCard(selectedCardIndex)) {
            btnPlaySelected.classList.remove('disabled');
        } else {
            btnPlaySelected.classList.add('disabled');
        }
    } else {
        if (selectedCardIndex >= handCards.length) selectedCardIndex = null;
        btnPlaySelected.classList.add('disabled');
        if (btnInfoAction) btnInfoAction.classList.add('disabled');
    }
}

// Pool 7 ảnh nghệ thuật cho 7 lá Defuse trong bộ bài
let defuseArtPool = [];
function getNextDefuseArtIndex() {
    if (defuseArtPool.length === 0) {
        defuseArtPool = [1, 2, 3, 4];
        for (let i = defuseArtPool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [defuseArtPool[i], defuseArtPool[j]] = [defuseArtPool[j], defuseArtPool[i]];
        }
    }
    return defuseArtPool.pop();
}

// Pool 6 ảnh nghệ thuật cho 6 lá Mèo Nổ trong bộ bài
let explodingKittenArtPool = [];
function getNextExplodingKittenArtIndex() {
    if (explodingKittenArtPool.length === 0) {
        explodingKittenArtPool = [1, 2, 3, 4];
        for (let i = explodingKittenArtPool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [explodingKittenArtPool[i], explodingKittenArtPool[j]] = [explodingKittenArtPool[j], explodingKittenArtPool[i]];
        }
    }
    return explodingKittenArtPool.pop();
}

// Pool 6 ảnh nghệ thuật cho 6 lá Nope trong bộ bài
let nopeArtPool = [];
function getNextNopeArtIndex() {
    if (nopeArtPool.length === 0) {
        nopeArtPool = [1, 2, 3, 4, 5];
        for (let i = nopeArtPool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [nopeArtPool[i], nopeArtPool[j]] = [nopeArtPool[j], nopeArtPool[i]];
        }
    }
    return nopeArtPool.pop();
}

// Pool 4 ảnh nghệ thuật cho 4 lá Nhìn trước tương lai trong bộ bài
let nhintruoctuonglaiArtPool = [];
function getNextNhintruoctuonglaiArtIndex() {
    if (nhintruoctuonglaiArtPool.length === 0) {
        nhintruoctuonglaiArtPool = [1, 2, 3, 4];
        for (let i = nhintruoctuonglaiArtPool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [nhintruoctuonglaiArtPool[i], nhintruoctuonglaiArtPool[j]] = [nhintruoctuonglaiArtPool[j], nhintruoctuonglaiArtPool[i]];
        }
    }
    return nhintruoctuonglaiArtPool.pop();
}

// Pool 3 ảnh nghệ thuật cho 3 lá Xào bài trong bộ bài
let xaobaiArtPool = [];
function getNextXaobaiArtIndex() {
    if (xaobaiArtPool.length === 0) {
        xaobaiArtPool = [1, 2, 3];
        for (let i = xaobaiArtPool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [xaobaiArtPool[i], xaobaiArtPool[j]] = [xaobaiArtPool[j], xaobaiArtPool[i]];
        }
    }
    return xaobaiArtPool.pop();
}

// Pool 5 ảnh nghệ thuật cho 5 lá Skip trong bộ bài
let skipArtPool = [];
function getNextSkipArtIndex() {
    if (skipArtPool.length === 0) {
        skipArtPool = [1, 2, 3];
        for (let i = skipArtPool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [skipArtPool[i], skipArtPool[j]] = [skipArtPool[j], skipArtPool[i]];
        }
    }
    return skipArtPool.pop();
}

// Pool 3 ảnh nghệ thuật cho 3 lá Tấn công trong bộ bài
let tancongArtPool = [];
function getNextTancongArtIndex() {
    if (tancongArtPool.length === 0) {
        tancongArtPool = [1, 2, 3];
        for (let i = tancongArtPool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [tancongArtPool[i], tancongArtPool[j]] = [tancongArtPool[j], tancongArtPool[i]];
        }
    }
    return tancongArtPool.pop();
}

// Pool 3 ảnh nghệ thuật cho lá Favor trong bộ bài
let favorArtPool = [];
function getNextFavorArtIndex() {
    if (favorArtPool.length === 0) {
        favorArtPool = [1, 2, 3];
        for (let i = favorArtPool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [favorArtPool[i], favorArtPool[j]] = [favorArtPool[j], favorArtPool[i]];
        }
    }
    return favorArtPool.pop();
}

// Pools ảnh nghệ thuật cho 8 loại mèo vô chức năng (tối đa 5 ảnh mỗi loại)
let tacocatArtPool = [], zombiecatArtPool = [], rainbowcatArtPool = [], catermelonArtPool = [], potatocatArtPool = [], golemcatArtPool = [], catteaArtPool = [], vampirecatArtPool = [];
function getNextCatArtIndex(pool) {
    if (pool.length === 0) {
        pool.push(1);
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }
    }
    return pool.pop();
}

function getCardClass(baseClass, card) {
    let target = card;
    if (card && card.id && card.id.startsWith('combo_') && card.baseId) {
        target = { id: card.baseId, artIndex: (card.originalCards && card.originalCards[0]) ? card.originalCards[0].artIndex : null };
    }
    if (target && target.id === 'defuse' && !target.artIndex) {
        target.artIndex = getNextDefuseArtIndex();
    }
    if (target && target.id === 'exploding_kitten' && !target.artIndex) {
        target.artIndex = getNextExplodingKittenArtIndex();
    }
    if (target && target.id === 'nope' && !target.artIndex) {
        target.artIndex = getNextNopeArtIndex();
    }
    if (target && (target.id === 'nhintruoctuonglai' || target.id === 'nhintruoctuonglai1') && !target.artIndex) {
        target.artIndex = getNextNhintruoctuonglaiArtIndex();
    }
    if (target && target.id === 'xaobai' && !target.artIndex) {
        target.artIndex = getNextXaobaiArtIndex();
    }
    if (target && target.id === 'skip' && !target.artIndex) {
        target.artIndex = getNextSkipArtIndex();
    }
    if (target && (target.id === 'superskip' || target.id === 'supernope' || target.id === 'swap' || target.id === 'reverse' || target.id === 'switch' || target.id === 'chest' || target.id === 'superfavor' || target.id === 'super_exploding_kitten' || target.id === 'seetheothers' || target.id === 'garbage_collection' || target.id === 'slap' || target.id === 'slap2' || target.id === 'slap3' || target.id === 'inferno' || target.id === 'inferno4' || target.id === 'contrast') && !target.artIndex) {
        target.artIndex = 1;
    }
    if (target && target.id === 'tancong' && !target.artIndex) {
        target.artIndex = getNextTancongArtIndex();
    }
    if (target && target.id === 'favor' && !target.artIndex) {
        target.artIndex = getNextFavorArtIndex();
    }
    if (target && target.id === 'clone' && !target.artIndex) {
        target.artIndex = 1;
    }
    if (target && (target.id === 'locking' || target.id === 'locking5') && !target.artIndex) {
        target.artIndex = 1;
    }
    if (target && target.id === 'tacocat' && !target.artIndex) target.artIndex = getNextCatArtIndex(tacocatArtPool);
    if (target && target.id === 'zombiecat' && !target.artIndex) target.artIndex = getNextCatArtIndex(zombiecatArtPool);
    if (target && target.id === 'rainbowcat' && !target.artIndex) target.artIndex = getNextCatArtIndex(rainbowcatArtPool);
    if (target && target.id === 'catermelon' && !target.artIndex) target.artIndex = getNextCatArtIndex(catermelonArtPool);
    if (target && target.id === 'potatocat' && !target.artIndex) target.artIndex = getNextCatArtIndex(potatocatArtPool);
    if (target && target.id === 'golemcat' && !target.artIndex) target.artIndex = getNextCatArtIndex(golemcatArtPool);
    if (target && target.id === 'cattea' && !target.artIndex) target.artIndex = getNextCatArtIndex(catteaArtPool);
    if (target && target.id === 'vampirecat' && !target.artIndex) target.artIndex = getNextCatArtIndex(vampirecatArtPool);

    let cls = `${baseClass} card-${target ? target.id : ''}`;
    if (target && target.id === 'defuse' && target.artIndex) cls += ` defuse-art-${target.artIndex}`;
    if (target && target.id === 'exploding_kitten' && target.artIndex) cls += ` exploding_kitten-art-${target.artIndex}`;
    if (target && target.id === 'super_exploding_kitten' && target.artIndex) cls += ` super_exploding_kitten-art-${target.artIndex}`;
    if (target && target.id === 'seetheothers' && target.artIndex) cls += ` seetheothers-art-${target.artIndex}`;
    if (target && target.id === 'garbage_collection' && target.artIndex) cls += ` garbage_collection-art-${target.artIndex}`;
    if (target && target.id === 'nope' && target.artIndex) cls += ` nope-art-${target.artIndex}`;
    if (target && target.id === 'supernope' && target.artIndex) cls += ` supernope-art-${target.artIndex}`;
    if (target && target.id === 'swap' && target.artIndex) cls += ` swap-art-${target.artIndex}`;
    if (target && target.id === 'reverse' && target.artIndex) cls += ` reverse-art-${target.artIndex}`;
    if (target && target.id === 'switch' && target.artIndex) cls += ` switch-art-${target.artIndex}`;
    if (target && target.id === 'chest' && target.artIndex) cls += ` chest-art-${target.artIndex}`;
    if (target && (target.id === 'nhintruoctuonglai' || target.id === 'nhintruoctuonglai1') && target.artIndex) cls += ` ${target.id}-art-${target.artIndex}`;
    if (target && target.id === 'xaobai' && target.artIndex) cls += ` xaobai-art-${target.artIndex}`;
    if (target && target.id === 'skip' && target.artIndex) cls += ` skip-art-${target.artIndex}`;
    if (target && target.id === 'superskip' && target.artIndex) cls += ` superskip-art-${target.artIndex}`;
    if (target && target.id === 'slap' && target.artIndex) cls += ` slap-art-${target.artIndex}`;
    if (target && target.id === 'slap2' && target.artIndex) cls += ` slap2-art-${target.artIndex}`;
    if (target && target.id === 'slap3' && target.artIndex) cls += ` slap3-art-${target.artIndex}`;
    if (target && target.id === 'inferno' && target.artIndex) cls += ` inferno-art-${target.artIndex}`;
    if (target && target.id === 'inferno4' && target.artIndex) cls += ` inferno4-art-${target.artIndex}`;
    if (target && target.id === 'contrast' && target.artIndex) cls += ` contrast-art-${target.artIndex}`;
    if (target && target.id === 'tancong' && target.artIndex) cls += ` tancong-art-${target.artIndex}`;
    if (target && target.id === 'favor' && target.artIndex) cls += ` favor-art-${target.artIndex}`;
    if (target && target.id === 'superfavor' && target.artIndex) cls += ` superfavor-art-${target.artIndex}`;
    if (target && target.id === 'clone' && target.artIndex) cls += ` clone-art-${target.artIndex}`;
    if (target && target.id === 'locking' && target.artIndex) cls += ` locking-art-${target.artIndex}`;
    if (target && target.id === 'locking5' && target.artIndex) cls += ` locking5-art-${target.artIndex}`;
    if (target && target.id === 'tacocat' && target.artIndex) cls += ` tacocat-art-${target.artIndex}`;
    if (target && target.id === 'zombiecat' && target.artIndex) cls += ` zombiecat-art-${target.artIndex}`;
    if (target && target.id === 'rainbowcat' && target.artIndex) cls += ` rainbowcat-art-${target.artIndex}`;
    if (target && target.id === 'catermelon' && target.artIndex) cls += ` catermelon-art-${target.artIndex}`;
    if (target && target.id === 'potatocat' && target.artIndex) cls += ` potatocat-art-${target.artIndex}`;
    if (target && target.id === 'golemcat' && target.artIndex) cls += ` golemcat-art-${target.artIndex}`;
    if (target && target.id === 'cattea' && target.artIndex) cls += ` cattea-art-${target.artIndex}`;
    if (target && target.id === 'vampirecat' && target.artIndex) cls += ` vampirecat-art-${target.artIndex}`;
    
    // Add glowing class if it's a combo card to make it look special!
    if (card && card.id && card.id.startsWith('combo_')) {
        cls += ' combo-card-glow';
    }
    
    return cls;
}

function setupCardContent(el, card) {
    el.innerHTML = '';
    if (!card) return;
    
    // Đặt ảnh nền Full-Art cho lá bài (fix lỗi lá bài trắng tinh)
    let imgId = card.id;
    if (card.type === 'combo' && card.baseId) {
        imgId = card.baseId;
    }
    let parts = imgId.split('_');
    let type = parts[0];
    let variation = parts[1] || '1';
    
    // Ánh xạ type sang tên thư mục tương ứng
    let folderName = type;
    if (type === 'bovno') folderName = 'exploding_kitten';
    else if (type === 'meo1') folderName = 'tacocat';
    else if (type === 'meo2') folderName = 'catermelon';
    else if (type === 'meo3') folderName = 'potatocat';
    else if (type === 'meo4') folderName = 'zombiecat';
    else if (type === 'meo5') folderName = 'rainbowcat';
    else if (type === 'meo6') folderName = 'golemcat';
    else if (type === 'meo7') folderName = 'cattea';
    else if (type === 'meo8') folderName = 'vampirecat';

    const rawCardUrl = `cards/${folderName}/art/${variation}.png`;
    const resolvedCardUrl = (typeof window.getPreloadedAssetUrl === 'function') 
        ? window.getPreloadedAssetUrl(rawCardUrl) 
        : ((window.parent && typeof window.parent.getPreloadedAssetUrl === 'function') 
            ? window.parent.getPreloadedAssetUrl(rawCardUrl) 
            : rawCardUrl);
    el.style.backgroundImage = `url('${resolvedCardUrl}')`;
    
    // Nếu là bài Mèo thường thì không cần hiện thêm icon/chữ gì
    if (['meo1', 'meo2', 'meo3', 'meo4', 'meo5', 'meo6', 'meo7', 'meo8'].includes(imgId)) {
        return;
    }

    if (card.id === 'defuse') {
        const titleEl = document.createElement('span');
        titleEl.className = 'defuse-corner-title';
        titleEl.textContent = 'DEFUSE';
        el.appendChild(titleEl);
    }
    if (card && card.id === 'nope') {
        const titleEl = document.createElement('span');
        titleEl.className = 'nope-corner-title';
        titleEl.textContent = 'NOPE';
        el.appendChild(titleEl);
    }
    if (card && card.id === 'supernope') {
        const titleEl = document.createElement('span');
        titleEl.className = 'supernope-corner-title';
        titleEl.textContent = 'SUPER NOPE';
        el.appendChild(titleEl);
    }
    if (card && card.id === 'swap') {
        const titleEl = document.createElement('span');
        titleEl.className = 'swap-corner-title';
        titleEl.textContent = 'SWAP';
        el.appendChild(titleEl);
    }
    if (card && card.id === 'nhintruoctuonglai') {
        const titleEl = document.createElement('span');
        titleEl.className = 'nhintruoctuonglai-corner-title';
        titleEl.textContent = 'SEE THE FUTURE';
        el.appendChild(titleEl);
    }
    if (card && card.id === 'xaobai') {
        const titleEl = document.createElement('span');
        titleEl.className = 'xaobai-corner-title';
        titleEl.textContent = 'SHUFFLE';
        el.appendChild(titleEl);
    }
    if (card && (card.id === 'skip' || card.id === 'superskip')) {
        const titleEl = document.createElement('span');
        titleEl.className = 'skip-corner-title';
        titleEl.textContent = card.id === 'superskip' ? 'SUPER SKIP' : 'SKIP';
        el.appendChild(titleEl);
    }
    if (card && (card.id === 'slap' || card.id === 'slap2' || card.id === 'slap3')) {
        const titleEl = document.createElement('span');
        titleEl.className = 'skip-corner-title';
        let lbl = 'SLAP';
        if (card.id === 'slap2') lbl = 'SLAP X2';
        if (card.id === 'slap3') lbl = 'SLAP X3';
        titleEl.textContent = lbl;
        el.appendChild(titleEl);
    }
    if (card && (card.id === 'inferno' || card.id === 'inferno4')) {
        const titleEl = document.createElement('span');
        titleEl.className = 'tancong-corner-title';
        titleEl.textContent = 'INFERNO';
        el.appendChild(titleEl);
    }
    if (card && card.id === 'contrast') {
        const titleEl = document.createElement('span');
        titleEl.className = 'tancong-corner-title';
        titleEl.textContent = 'ĐẢO NGHỊCH';
        el.appendChild(titleEl);
    }
    if (card && card.id === 'swap') {
        const titleEl = document.createElement('span');
        titleEl.className = 'xaobai-corner-title';
        titleEl.textContent = 'SWAP';
        el.appendChild(titleEl);
    }
    if (card && card.id === 'reverse') {
        const titleEl = document.createElement('span');
        titleEl.className = 'skip-corner-title';
        titleEl.textContent = 'REVERSE';
        el.appendChild(titleEl);
    }
    if (card && card.id === 'switch') {
        const titleEl = document.createElement('span');
        titleEl.className = 'xaobai-corner-title';
        titleEl.textContent = 'SWITCH';
        el.appendChild(titleEl);
    }
    if (card && card.id === 'chest') {
        const pts = (typeof card.chestPoints === 'number') ? card.chestPoints : 0;
        const badgeEl = document.createElement('div');
        badgeEl.className = 'chest-points-badge';
        badgeEl.innerHTML = `<span class="chest-points-val">${pts}</span>`;
        el.appendChild(badgeEl);
    }
    if (card && card.id === 'tancong') {
        const titleEl = document.createElement('span');
        titleEl.className = 'tancong-corner-title';
        titleEl.textContent = 'ATTACK';
        el.appendChild(titleEl);
    }
    if (card && card.id === 'favor') {
        const titleEl = document.createElement('span');
        titleEl.className = 'favor-corner-title';
        titleEl.textContent = 'FAVOR';
        el.appendChild(titleEl);
    }
    if (card && card.id === 'superfavor') {
        const titleEl = document.createElement('span');
        titleEl.className = 'favor-corner-title';
        titleEl.textContent = 'SUPER FAVOR';
        el.appendChild(titleEl);
    }
    if (card && card.id === 'seetheothers') {
        const titleEl = document.createElement('span');
        titleEl.className = 'nhintruoctuonglai-corner-title';
        titleEl.textContent = 'NHÌN BÀI';
        el.appendChild(titleEl);
    }
    if (card && card.id === 'garbage_collection') {
        const titleEl = document.createElement('span');
        titleEl.className = 'garbage_collection-corner-title';
        titleEl.textContent = 'DỌN RÁC';
        el.appendChild(titleEl);
    }
    if (card && card.id === 'tacocat') {
        const titleEl = document.createElement('span');
        titleEl.className = 'tacocat-corner-title';
        titleEl.textContent = 'TACOCAT';
        el.appendChild(titleEl);
    }
    if (card && card.id === 'zombiecat') {
        const titleEl = document.createElement('span');
        titleEl.className = 'zombiecat-corner-title';
        titleEl.textContent = 'ZOMBIE CAT';
        el.appendChild(titleEl);
    }
    if (card && card.id === 'rainbowcat') {
        const titleEl = document.createElement('span');
        titleEl.className = 'rainbowcat-corner-title';
        titleEl.textContent = 'RAINBOW CAT';
        el.appendChild(titleEl);
    }
    if (card && card.id === 'catermelon') {
        const titleEl = document.createElement('span');
        titleEl.className = 'catermelon-corner-title';
        titleEl.textContent = 'CATTERMELON';
        el.appendChild(titleEl);
    }
    if (card && card.id === 'potatocat') {
        const titleEl = document.createElement('span');
        titleEl.className = 'potatocat-corner-title';
        titleEl.textContent = 'POTATO CAT';
        el.appendChild(titleEl);
    }
    if (card && card.id === 'golemcat') {
        const titleEl = document.createElement('span');
        titleEl.className = 'golemcat-corner-title';
        titleEl.textContent = 'GOLEM CAT';
        el.appendChild(titleEl);
    }
    if (card && card.id === 'cattea') {
        const titleEl = document.createElement('span');
        titleEl.className = 'cattea-corner-title';
        titleEl.textContent = 'CATTEA';
        el.appendChild(titleEl);
    }
    if (card && card.id === 'vampirecat') {
        const titleEl = document.createElement('span');
        titleEl.className = 'vampirecat-corner-title';
        titleEl.textContent = 'VAMPIRE CAT';
        el.appendChild(titleEl);
    }
    if (card && card.id === 'streaking') {
        const titleEl = document.createElement('span');
        titleEl.className = 'streaking-corner-title';
        titleEl.textContent = 'STREAKING';
        el.appendChild(titleEl);
    }
}

// Helper to generate a random action card
function getRandomCard() {
    const type = CARD_TYPES[Math.floor(Math.random() * CARD_TYPES.length)];
    const card = {
        uid: Math.random().toString(36).substring(2, 9),
        id: type.id,
        name: type.name,


    };
    if (type.id === 'defuse') {
        card.artIndex = getNextDefuseArtIndex();
    } else if (type.id === 'exploding_kitten') {
        card.artIndex = getNextExplodingKittenArtIndex();
    } else if (type.id === 'nope') {
        card.artIndex = getNextNopeArtIndex();
    } else if (type.id === 'nhintruoctuonglai' || type.id === 'nhintruoctuonglai1') {
        card.artIndex = getNextNhintruoctuonglaiArtIndex();
    } else if (type.id === 'xaobai') {
        card.artIndex = getNextXaobaiArtIndex();
    } else if (type.id === 'skip') {
        card.artIndex = getNextSkipArtIndex();
    } else if (type.id === 'superskip' || type.id === 'supernope' || type.id === 'swap' || type.id === 'reverse' || type.id === 'switch' || type.id === 'chest' || type.id === 'superfavor' || type.id === 'super_exploding_kitten' || type.id === 'seetheothers' || type.id === 'garbage_collection' || type.id === 'slap' || type.id === 'slap2' || type.id === 'slap3' || type.id === 'inferno' || type.id === 'inferno4' || type.id === 'contrast') {
        card.artIndex = 1;
        if (type.id === 'chest') {
            card.chestPoints = 0;
        }
    } else if (type.id === 'tancong') {
        card.artIndex = getNextTancongArtIndex();
    } else if (type.id === 'favor') {
        card.artIndex = getNextFavorArtIndex();
    } else if (type.id === 'tacocat') {
        card.artIndex = getNextCatArtIndex(tacocatArtPool);
    } else if (type.id === 'zombiecat') {
        card.artIndex = getNextCatArtIndex(zombiecatArtPool);
    } else if (type.id === 'rainbowcat') {
        card.artIndex = getNextCatArtIndex(rainbowcatArtPool);
    } else if (type.id === 'catermelon') {
        card.artIndex = getNextCatArtIndex(catermelonArtPool);
    } else if (type.id === 'potatocat') {
        card.artIndex = getNextCatArtIndex(potatocatArtPool);
    } else if (type.id === 'golemcat') {
        card.artIndex = getNextCatArtIndex(golemcatArtPool);
    } else if (type.id === 'cattea') {
        card.artIndex = getNextCatArtIndex(catteaArtPool);
    } else if (type.id === 'vampirecat') {
        card.artIndex = getNextCatArtIndex(vampirecatArtPool);
    }
    return card;
}

// Calculate Overlap Ratio: Biến động từ 0% đến 60% (tăng 5% mỗi lá bài thêm vào), sau đó cố định 60%
function calculateOverlapRatio(N) {
    if (N <= 1) return 0;
    // Bắt đầu từ lá thứ 2 tăng 5% (0.05), lá thứ 3 là 10%...
    const ratio = (N - 1) * 0.05;
    // Tối đa là 60% (0.60)
    return Math.min(ratio, 0.60);
}

// Update UI Statistics
function updateStats() {
    const N = handCards.length;

    const ratio = calculateOverlapRatio(N);
    const ratioPercent = Math.round(ratio * 100);

    if (deckCountVal) {
        const prevText = deckCountVal.textContent;
        const newText = String(remainingDeckCount);
        deckCountVal.textContent = newText;
        if (prevText !== newText && prevText !== '') {
            deckCountVal.classList.remove('deck-count-pop');
            void deckCountVal.offsetWidth;
            deckCountVal.classList.add('deck-count-pop');
        }
    }
}

// --- HOẠT ẢNH SPRITE KHÓA BÀI (Locking) ---
// Đặt frame sprite hiện tại (1-8) lên trên layer art gốc của lá bài
function setLockSpriteFrame(cardEl, frame) {
    const artBg = cardEl.dataset.artBg || 'none';
    if (cardEl.classList.contains('card-frozen')) {
        cardEl.style.setProperty('background-image', `url('cards/freeze/freeze_card.png'), ${artBg}`, 'important');
        cardEl.style.setProperty('background-size', '100% 100%, 100% 100%', 'important');
    } else {
        cardEl.style.setProperty('background-image', `url('cards/locking/sprites${frame}.png'), ${artBg}`, 'important');
        cardEl.style.setProperty('background-size', 'contain, 100% 100%', 'important');
    }
    cardEl.style.setProperty('background-position', 'center, center', 'important');
    cardEl.style.setProperty('background-repeat', 'no-repeat, no-repeat', 'important');
}

// Chạy hoạt ảnh sprite khóa bài mượt mà bằng requestAnimationFrame:
// direction 'in' = sprites1 -> sprites8 (xuất hiện), 'out' = sprites8 -> sprites1 (biến mất)
function animateLockSprite(cardEls, direction, duration = 1000, totalFrames = 8, onDone) {
    if (!cardEls || cardEls.length === 0) {
        if (onDone) onDone();
        return;
    }
    const startTime = performance.now();
    let lastRenderedFrame = -1;

    function step(now) {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        let frameIndex = Math.floor(progress * totalFrames) + 1;
        if (frameIndex > totalFrames) frameIndex = totalFrames;
        
        const frame = direction === 'in' ? frameIndex : (totalFrames - frameIndex + 1);
        if (frame !== lastRenderedFrame) {
            lastRenderedFrame = frame;
            cardEls.forEach(el => setLockSpriteFrame(el, frame));
        }

        if (progress < 1) {
            requestAnimationFrame(step);
        } else {
            if (onDone) onDone();
        }
    }
    requestAnimationFrame(step);
}

// --- HOẠT ẢNH SPRITE THIÊU CHÁY (Inferno - Thời lượng 1.0s, Chạy mượt mà 60fps bằng requestAnimationFrame) ---
function animateInfernoSprite(cardEls, duration = 1000, totalFrames = 12, onDone) {
    if (!cardEls || cardEls.length === 0) {
        if (onDone) onDone();
        return;
    }

    const resolveUrl = (typeof window.getPreloadedAssetUrl === 'function') 
        ? window.getPreloadedAssetUrl 
        : ((window.parent && typeof window.parent.getPreloadedAssetUrl === 'function') 
            ? window.parent.getPreloadedAssetUrl 
            : (u => u));

    // Lớp hiển thị ngọn lửa sắc nét 100% đè lên từng lá bài
    const overlays = cardEls.map(cardEl => {
        const rect = cardEl.getBoundingClientRect();
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            left: ${rect.left}px;
            top: ${rect.top}px;
            width: ${rect.width}px;
            height: ${rect.height}px;
            z-index: 999999;
            pointer-events: none;
            background-size: contain;
            background-position: center;
            background-repeat: no-repeat;
            opacity: 1 !important;
            will-change: background-image;
        `;
        overlay.style.backgroundImage = `url('${resolveUrl('assets/cards/inferno/inferno_sprites/1.png')}')`;
        document.body.appendChild(overlay);
        return { cardEl, overlay };
    });

    const startTime = performance.now();
    let lastFrame = 0;

    function step(now) {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        const frame = Math.min(totalFrames, Math.floor(progress * totalFrames) + 1);

        if (frame !== lastFrame) {
            lastFrame = frame;
            const spriteUrl = resolveUrl(`assets/cards/inferno/inferno_sprites/${frame}.png`);
            const cardBrightness = Math.max(0, 1 - progress * 1.5);
            const cardOpacity = Math.max(0, 1 - progress);

            overlays.forEach(({ cardEl, overlay }) => {
                overlay.style.backgroundImage = `url('${spriteUrl}')`;
                cardEl.style.filter = `brightness(${cardBrightness})`;
                cardEl.style.opacity = `${cardOpacity}`;
            });
        }

        if (progress < 1) {
            requestAnimationFrame(step);
        } else {
            overlays.forEach(({ overlay }) => {
                if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            });
            if (onDone) onDone();
        }
    }
    requestAnimationFrame(step);
}

function animateInfernoAvatarSprite(avatarEl, duration = 1000, totalFrames = 12) {
    if (!avatarEl) return;
    const rect = avatarEl.getBoundingClientRect();
    const overlay = document.createElement('div');
    overlay.style.cssText = `
        position: fixed;
        left: ${rect.left}px;
        top: ${rect.top}px;
        width: ${rect.width}px;
        height: ${rect.height}px;
        border-radius: 50%;
        z-index: 999999;
        pointer-events: none;
        background-size: contain;
        background-position: center;
        background-repeat: no-repeat;
        opacity: 1 !important;
        transform: scale(1.5);
        transform-origin: center center;
        will-change: background-image;
    `;
    const resolveUrl = (typeof window.getPreloadedAssetUrl === 'function') 
        ? window.getPreloadedAssetUrl 
        : ((window.parent && typeof window.parent.getPreloadedAssetUrl === 'function') 
            ? window.parent.getPreloadedAssetUrl 
            : (u => u));

    overlay.style.backgroundImage = `url('${resolveUrl('assets/cards/inferno/inferno_sprites/1.png')}')`;
    document.body.appendChild(overlay);

    const startTime = performance.now();
    let lastFrame = 0;

    function step(now) {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        const frame = Math.min(totalFrames, Math.floor(progress * totalFrames) + 1);

        if (frame !== lastFrame) {
            lastFrame = frame;
            overlay.style.backgroundImage = `url('${resolveUrl(`assets/cards/inferno/inferno_sprites/${frame}.png`)}')`;
        }

        if (progress < 1) {
            requestAnimationFrame(step);
        } else {
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        }
    }
    requestAnimationFrame(step);
}

// Render Cards in Hand with algorithmic overlapping
function saveContrastStates() {
    try {
        const states = {};
        handCards.forEach(c => {
            if (c.id === 'contrast') {
                states[c.uid] = !!c.contrastOn;
            }
        });
        localStorage.setItem('contrast_states_' + myUid, JSON.stringify(states));
    } catch(e){}
}

function loadContrastStates() {
    try {
        const raw = localStorage.getItem('contrast_states_' + myUid);
        if (!raw) return;
        const states = JSON.parse(raw);
        handCards.forEach(c => {
            if (c.id === 'contrast' && states[c.uid] !== undefined) {
                c.contrastOn = states[c.uid];
                if (typeof socket !== 'undefined' && socket.connected && matchState && matchState.roomId) {
                    socket.emit('game_toggle_contrast', {
                        roomId: matchState.roomId,
                        cardUid: c.uid,
                        isOn: c.contrastOn
                    });
                }
            }
        });
    } catch(e){}
}

function renderHand(animateLast = false, sourceRect = null) {
    loadContrastStates();
    const myPlayer = matchState.players ? matchState.players.find(p => p.socketId === socket.id) : null;
    matchState.isMeFrozen = myPlayer ? myPlayer.isFrozen : false;
    
    handContainer.innerHTML = '';
    const N = handCards.length;
    if (N === 0) {
        updateStats();
        return;
    }

    if (selectedCardIndex !== null && selectedCardIndex >= N) {
        selectedCardIndex = null;
    }

    const ratio = calculateOverlapRatio(N);
    
    // Get current CSS card width (Cached để không ép Reflow getComputedStyle liên tục)
    if (!window._cachedCardWidth) {
        const rootStyles = getComputedStyle(document.documentElement);
        const cardWidthStr = rootStyles.getPropertyValue('--card-width').trim();
        window._cachedCardWidth = parseInt(cardWidthStr, 10) || 195;
    }
    const cardWidth = window._cachedCardWidth;

    // Calculate horizontal step between consecutive cards
    let stepX = cardWidth * (1 - ratio);

    // Tự động co dãn thông minh: Khi có quá nhiều bài (18, 19, 20 lá) trên màn hình, tự động thu nhỏ bước nhảy vừa phải để không bị tràn màn hình
    const maxAllowedWidth = (handContainer.clientWidth || window.innerWidth) * 0.92;
    const currentTotalWidth = cardWidth + (N - 1) * stepX;
    if (currentTotalWidth > maxAllowedWidth && N > 1) {
        stepX = (maxAllowedWidth - cardWidth) / (N - 1);
    }

    // Calculate total fanned width to center horizontally
    const totalWidth = cardWidth + (N - 1) * stepX;
    const startOffset = -totalWidth / 2;

    // CHỈ tính toán getBoundingClientRect khi THỰC SỰ có hiệu ứng rút bài (animateLast = true)
    // Giúp loại bỏ 100% hiện tượng Layout Thrashing khi render trạng thái bài thông thường trên điện thoại yếu!
    let deltaXFromDeck = 0;
    let deltaYFromDeck = 0;
    if (animateLast) {
        const appScale = window._appScale || 1;
        let targetSourceRect = sourceRect;
        if (!targetSourceRect) {
            const deckElem = document.getElementById('deckStackElem') || document.getElementById('centerDeck');
            if (deckElem) {
                targetSourceRect = deckElem.getBoundingClientRect();
            } else {
                targetSourceRect = { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 195 * appScale, height: 278 * appScale };
            }
        }
        const handRect = handContainer.getBoundingClientRect();
        deltaXFromDeck = ((targetSourceRect.left + targetSourceRect.width / 2) - (handRect.left + handRect.width / 2)) / appScale;
        deltaYFromDeck = ((targetSourceRect.top + targetSourceRect.height / 2) - (handRect.top + handRect.height / 2)) / appScale;
    }

    const bombCountInHand = handCards.filter(c => c.id === 'exploding_kitten' || c.id === 'atomicbom').length;

    handCards.forEach((card, index) => {
        const cardEl = document.createElement('div');
        cardEl.className = getCardClass('card', card);
        cardEl.dataset.uid = card.uid;
        
        const myPlayer = matchState.players ? matchState.players.find(p => p.socketId === socket.id) : null;
        const isMeAlive = myPlayer ? myPlayer.alive !== false : true;

        // Lá Streaking phát sáng xanh lá cây nếu đang giúp cầm lá bom trên tay (chỉ khi còn sống)
        if (card.id === 'streaking' && bombCountInHand > 0 && isMeAlive) {
            cardEl.classList.add('streaking-holding-bomb');
        }



        // Lá Contrast phát sáng màu vàng & nhô cao nếu đang ở chế độ ON
        if (card.id === 'contrast' && card.contrastOn) {
            cardEl.classList.add('contrast-on');
        }

        // Nếu đang ở chế độ tắt Đánh bài nhanh và lá bài này được chọn
        if (!settings.fastPlay && selectedCardIndex === index) {
            cardEl.classList.add('selected');
        }

        // Hướng che đè bài cố định: Phải đè Trái (lá sau đè lên lá trước)
        cardEl.style.zIndex = index + 10;

        // Calculate exact horizontal offset from screen center
        const cardX = startOffset + index * stepX;
        cardEl.style.left = `calc(50% + ${cardX}px)`;

        // Xếp bài theo 1 đường thẳng ngang (không xoay, không cong)
        cardEl.style.bottom = `0px`;
        cardEl.style.transform = '';

        // If this is the newly drawn card, apply fly animation from deck!
        if (animateLast && index === N - 1) {
            cardEl.style.setProperty('--start-x', `${deltaXFromDeck - cardX}px`);
            cardEl.style.setProperty('--start-y', `${deltaYFromDeck}px`);
            cardEl.style.setProperty('--target-rot', `0deg`);
            cardEl.classList.add('flying-in');
            // Gỡ bỏ class flying-in sau khi bay xong (0.5s) để giải phóng transform, giúp lá cuối cùng nhấc lên mượt mà 100% khi hover!
            setTimeout(() => {
                cardEl.classList.remove('flying-in');
            }, 500);
        }

        const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

        if (!isTouchDevice) {
            cardEl.addEventListener('mouseenter', () => {
                if (!settings.fastPlay) return;
                const allCards = handContainer.querySelectorAll('.card');
                allCards.forEach((el, j) => {
                    if (el.classList.contains('flying-in')) return;
                    if (j > index) {
                        el.classList.add('shift-right');
                    } else {
                        el.classList.remove('shift-right');
                    }
                });
            });

            cardEl.addEventListener('mouseleave', () => {
                if (!settings.fastPlay) return;
                const allCards = handContainer.querySelectorAll('.card');
                allCards.forEach(el => el.classList.remove('shift-right'));
            });
        }

        // Thiết lập nội dung bên trong lá bài (thêm chữ defuse nếu là thẻ defuse)
        setupCardContent(cardEl, card);
        // Click chuột phải (contextmenu) vào lá bài -> Mở Modal xem chi tiết bài & hướng dẫn
        cardEl.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            soundManager.playSfx('card');
            showCardInspectModal(card);
        });

        // Click card to play or select it
        cardEl.addEventListener('click', (e) => {
            e.stopPropagation();

            const isEmergencyNope = matchState.isWaitingNope && 
                (card.id === 'nope' || card.id === 'supernope') && 
                matchState.lastPendingPlayerSocketId !== socket.id &&
                (!matchState.myLockedCardUids || !matchState.myLockedCardUids.includes(card.uid));

            if (!isEmergencyNope && (isCeremonyPlaying || isCardActionLocked || isDrawAnimationActive)) return;
            if (isEmergencyNope && isCeremonyPlaying) return;

            soundManager.playSfx('card');

            // Lá Đảo Nghịch (Contrast): Bật/tắt chế độ ON/OFF khi click, bảo toàn trạng thái (trừ khi đang phải tặng bài)
            if (card.id === 'contrast' && !matchState.favorPickMode) {
                card.contrastOn = !card.contrastOn;
                saveContrastStates();
                if (typeof socket !== 'undefined' && socket.connected) {
                    socket.emit('game_toggle_contrast', {
                        roomId: matchState.roomId,
                        cardUid: card.uid,
                        isOn: card.contrastOn
                    });
                }
                renderHand(false);
                return;
            }

            // Khi đang có bài chờ phản đòn Nope/Super Nope: click vào lá Nope/Super Nope sẽ đánh ra ngay lập tức
            if (isEmergencyNope || settings.fastPlay) {
                playCard(index, cardEl);
            } else {
                // Đánh bài nhanh = Tắt -> Chỉ chọn bài (nhấc lên), tuyệt đối KHÔNG đánh ngay khi click
                if (selectedCardIndex === index) {
                    // Click lần 2 vào lá bài đang nhấc -> Bỏ chọn lá bài đó (nhất định không đánh!)
                    selectedCardIndex = null;
                    renderHand(false);
                } else {
                    selectedCardIndex = index;
                    const allCards = handContainer.querySelectorAll('.card');
                    allCards.forEach((el, j) => {
                        if (el.classList.contains('flying-in')) return;
                        if (j === index) {
                            el.classList.add('selected');
                        } else {
                            el.classList.remove('selected');
                        }
                        if (j > index) {
                            el.classList.add('shift-right');
                        } else {
                            el.classList.remove('shift-right');
                        }
                    });
                    updatePlayButtonState();
                }
            }
        });

        handContainer.appendChild(cardEl);

        // Nếu lá bài đang bị KHÓA bởi lá Locking → dùng background-image layer (không cần child element, tránh display:none)
        // QUAN TRỌNG: đoạn này phải chạy SAU khi cardEl đã được append vào DOM,
        // vì getComputedStyle() chỉ trả về giá trị background-image thật (từ CSS class .card-...)
        // khi element đã nằm trong DOM. Gọi trước appendChild sẽ luôn trả về rỗng.
        if (matchState.myLockedCardUids && matchState.myLockedCardUids.includes(card.uid)) {
            cardEl.classList.add('card-locked');
            cardEl.style.filter = 'grayscale(60%) brightness(0.65)';
            // Lấy background-image (art) gốc của lá bài, lưu lại để tái sử dụng khi chạy hoạt ảnh sprite
            const currentBg = getComputedStyle(cardEl).backgroundImage;
            cardEl.dataset.artBg = currentBg;
            // Trạng thái tĩnh mặc định khi render lại (không phải lúc vừa bị khóa/mở khóa): giữ nguyên sprites8
            setLockSpriteFrame(cardEl, 8);
        }

        if (matchState.isMeFrozen) {
            cardEl.classList.add('card-frozen');
            cardEl.style.filter = 'grayscale(60%) brightness(0.65)';
            const currentBg = getComputedStyle(cardEl).backgroundImage;
            if (!cardEl.dataset.artBg) cardEl.dataset.artBg = currentBg;
            const artBg = cardEl.dataset.artBg;
            cardEl.style.setProperty('background-image', `url('cards/freeze/freeze_card.png'), ${artBg}`, 'important');
            cardEl.style.setProperty('background-size', '100% 100%, 100% 100%', 'important');
            cardEl.style.setProperty('background-position', 'center, center', 'important');
            cardEl.style.setProperty('background-repeat', 'no-repeat, no-repeat', 'important');
        }
    });


    updateStats();
    updatePlayButtonState();
    
    
    updatePlayButtonState();
    
    // Xử lý mũi tên cuộn
    if (btnScrollLeft && btnScrollRight) {
        // Cần đợi render xong xíu để lấy kích thước chính xác
        setTimeout(() => {
            if (handCards.length > 20) {
                btnScrollLeft.classList.remove('hidden');
                btnScrollRight.classList.remove('hidden');
            } else {
                btnScrollLeft.classList.add('hidden');
                btnScrollRight.classList.add('hidden');
            }
        }, 50);
    }
}
// Action: Draw a card from center deck
function drawCard() {
    if (isCeremonyPlaying || isCardActionLocked || isDrawAnimationActive) return;
    if (!isMyTurn) return;
    if (matchState.isWaitingNope) return;

    lockCardActions(500);
    isDrawAnimationActive = true;
    clearTimeout(drawAnimationTimer);
    drawAnimationTimer = setTimeout(() => { isDrawAnimationActive = false; }, 500);
    socket.emit('game_draw_card', { roomId: matchState.roomId });
}

// Action: Play / Discard a card to the center table
function playCard(index, cardEl) {
    if (!canPlayCard(index)) return;
    const playedCard = handCards[index];
    if (!playedCard) return;

    // --- FAVOR PICK MODE: Khi bị xin bài, click lá bài = tặng cho đối phương ---
    if (matchState.favorPickMode) {
        socket.emit('game_favor_give_card', { roomId: matchState.roomId, cardUid: playedCard.uid });
        matchState.favorPickMode = false;
        const handWrapper = document.querySelector('.hand-wrapper');
        if (handWrapper) handWrapper.classList.remove('favor-hand-glow');
        return;
    }

    if (cardEl) {
        lastPlayedCardRect = cardEl.getBoundingClientRect();
        lastPlayedCardUid = playedCard.uid;
    }

    // Kiểm tra bài vô chức năng (catermelon, rainbowcat, potatocat, zombiecat, tacocat, golemcat, cattea, vampirecat) + whatcat
    const validVanilla = ['catermelon', 'rainbowcat', 'potatocat', 'zombiecat', 'tacocat', 'golemcat', 'cattea', 'vampirecat'];
    if (validVanilla.includes(playedCard.id) || playedCard.id === 'whatcat') {
        const lockedUids = matchState.myLockedCardUids || [];
        const usableHandCards = handCards.filter(c => !lockedUids.includes(c.uid));
        const whatCatsInHand = usableHandCards.filter(c => c.id === 'whatcat');

        // Ưu tiên kiểm tra Combo 5 trước
        let uniqueVanillas = validVanilla.filter(v => usableHandCards.some(c => c.id === v));
        if (uniqueVanillas.length + whatCatsInHand.length >= 5) {
            let cardsToPlay = [];
            // Lấy tối đa 5 lá (tất cả unique vanillas, còn thiếu thì bù bằng whatcat)
            let takeVanilla = Math.min(uniqueVanillas.length, 5);
            for (let i = 0; i < takeVanilla; i++) {
                cardsToPlay.push(usableHandCards.find(c => c.id === uniqueVanillas[i]));
            }
            let neededWhatCats = 5 - cardsToPlay.length;
            for (let i = 0; i < neededWhatCats; i++) {
                cardsToPlay.push(whatCatsInHand[i]);
            }

            let cardUids = cardsToPlay.map(c => c.uid);
            lockCardActions(500);
            socket.emit('game_play_combo', { roomId: matchState.roomId, cardUids: cardUids, comboType: 5 });
            return;
        }

        // Nếu không đủ Combo 5, kiểm tra Combo 2/3
        let targetId = playedCard.id;
        if (playedCard.id === 'whatcat') {
            let maxCount = -1;
            let bestVanilla = 'whatcat';
            validVanilla.forEach(v => {
                let count = usableHandCards.filter(c => c.id === v).length;
                if (count > maxCount && count > 0) {
                    maxCount = count;
                    bestVanilla = v;
                }
            });
            targetId = bestVanilla;
        }

        const sameCards = usableHandCards.filter(c => c.id === targetId);
        const availableWhatCats = targetId === 'whatcat' ? [] : whatCatsInHand;

        if (sameCards.length + availableWhatCats.length < 2) {
            return;
        }

        let totalAvailable = sameCards.length + availableWhatCats.length;
        let comboType = totalAvailable >= 3 ? 3 : 2;

        let cardsToPlay = [];
        let takeSame = Math.min(sameCards.length, comboType);
        for(let i=0; i<takeSame; i++) cardsToPlay.push(sameCards[i]);

        let neededWhatCats = comboType - cardsToPlay.length;
        for(let i=0; i<neededWhatCats; i++) cardsToPlay.push(availableWhatCats[i]);

        let cardUids = cardsToPlay.map(c => c.uid);

        lockCardActions(500);
        socket.emit('game_play_combo', { roomId: matchState.roomId, cardUids: cardUids, comboType: comboType });
        return;
    }

    lockCardActions(500);
    socket.emit('game_play_card', { roomId: matchState.roomId, cardUid: playedCard.uid });
}

// Helper tạo DOM element cho lá bài đã đánh
function createDiscardCardElement(item) {
    const el = document.createElement('div');
    el.className = getCardClass('card', item.card);
    el.style.position = 'absolute';
    el.style.top = '0px';
    el.style.left = '0px';
    
    el.style.transform = `translate(${item.offsetX}px, ${item.offsetY}px)`;
    el.style.pointerEvents = 'auto';
    setupCardContent(el, item.card);
    
    // Nếu là lá bài Clone, thực hiện hiệu ứng biến đổi (chỉ phát 1 lần duy nhất khi vừa ném bài)
    if (item.card.id === 'clone' && item.card.clonedId && !item.alreadyTransformed) {
        item.alreadyTransformed = true;
        // Sau 400ms (bay đến đích), bắt đầu rung lắc
        setTimeout(() => {
            el.classList.add('clone-transforming');
            // Sau 500ms rung lắc, biến thành bài mới
            setTimeout(() => {
                el.classList.remove('clone-transforming');
                const fakeCard = { ...item.card, id: item.card.clonedId };
                el.className = getCardClass('card', fakeCard);
                setupCardContent(el, fakeCard);
            }, 500);
        }, 400);
    }
    
    el.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        soundManager.playSfx('card');
        // Nếu clone đã biến hình thì soi bài phải hiện bài bị biến hình
        const cardToInspect = (item.card.id === 'clone' && item.card.clonedId) 
            ? { ...item.card, id: item.card.clonedId } 
            : item.card;
        showCardInspectModal(cardToInspect);
    });
    return el;
}

// Đảm bảo các lá bài trong chồng bài đã đánh luôn xếp theo thứ tự z-index tăng dần (lá mới nhất luôn trên cùng)
function refreshDiscardPileZIndices() {
    if (!discardPile) return;
    const cards = Array.from(discardPile.children);
    cards.forEach((cardEl, idx) => {
        cardEl.style.zIndex = (idx + 1);
    });
}

// Render chồng bài đã đánh (dùng cho khởi tạo hoặc reset)
function renderDiscardPile() {
    discardPile.innerHTML = '';
    discardedList.forEach((item, idx) => {
        const el = createDiscardCardElement(item);
        el.style.zIndex = (idx + 1);
        discardPile.appendChild(el);
    });
    refreshDiscardPileZIndices();
}

// Event Listeners cho Chồng bài rút (Hỗ trợ Fast-Tap 0ms trên điện thoại, giữ nguyên vị trí tĩnh không rung lắc/zoom)
let lastDrawTapTime = 0;
function handleDeckTap(e) {
    if (e) {
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
    }
    if (isCeremonyPlaying || isCardActionLocked || isDrawAnimationActive) return;
    const now = Date.now();
    if (now - lastDrawTapTime < 250) return;
    lastDrawTapTime = now;

    drawCard();
}

if (centerDeck) {
    let touchHandled = false;

    // Fast-path touchstart cho điện thoại (Rút bài ngay lập tức không trễ 300ms)
    centerDeck.addEventListener('touchstart', (e) => {
        touchHandled = true;
        handleDeckTap(e);
        setTimeout(() => { touchHandled = false; }, 400);
    }, { passive: false });

    // Fast-path pointerdown cho thiết bị cảm ứng
    centerDeck.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'touch' && !touchHandled) {
            touchHandled = true;
            handleDeckTap(e);
            setTimeout(() => { touchHandled = false; }, 400);
        }
    });

    // Fallback click cho chuột máy tính
    centerDeck.addEventListener('click', (e) => {
        if (touchHandled) return;
        handleDeckTap(e);
    });
}



// Initialize with 7 cards by default as requested!
applySettings();
// Đợi game_setup từ server thay vì tự khởi tạo
// initHand(7);

// Event Listeners cho Cài đặt & Nút đánh bài điện thoại
btnSettings.addEventListener('click', () => {
    toggleMusic.checked = settings.music;
    toggleSfx.checked = settings.sfx;
    toggleFastPlay.checked = settings.fastPlay;
    settingsModal.classList.remove('hidden');
});

btnCloseSettings.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
});

settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
        settingsModal.classList.add('hidden');
    }
});

toggleMusic.addEventListener('change', (e) => {
    settings.music = e.target.checked;
    soundManager.toggleMusic(settings.music);
    if (typeof socket !== 'undefined' && socket.connected) {
        socket.emit('update_settings', settings);
    }
});

toggleSfx.addEventListener('change', (e) => {
    settings.sfx = e.target.checked;
    if (typeof socket !== 'undefined' && socket.connected) {
        socket.emit('update_settings', settings);
    }
});

toggleFastPlay.addEventListener('change', (e) => {
    settings.fastPlay = e.target.checked;
    applySettings();
    renderHand(false);
    if (typeof socket !== 'undefined' && socket.connected) {
        socket.emit('update_settings', settings);
    }
});

btnPlaySelected.addEventListener('click', () => {
    if (selectedCardIndex === null || selectedCardIndex >= handCards.length) return;
    if (!canPlayCard(selectedCardIndex)) return;

    const targetEl = handContainer.children[selectedCardIndex];
    if (targetEl) {
        soundManager.playSfx('card');
        playCard(selectedCardIndex, targetEl);
    }
});

if (btnInfoAction) {
    btnInfoAction.addEventListener('click', () => {
        if (selectedCardIndex !== null && selectedCardIndex < handCards.length) {
            soundManager.playSfx('card');
            showCardInspectModal(handCards[selectedCardIndex]);
        }
    });
}

if (btnSortAction) {
    btnSortAction.addEventListener('click', () => {
        if (handCards.length <= 1) return;
        soundManager.playSfx('card');
        const selectedObj = selectedCardIndex !== null ? handCards[selectedCardIndex] : null;
        const sortOrder = ['defuse', 'exploding_kitten', 'super_exploding_kitten', 'atomicbom', 'nope', 'supernope', 'nhintruoctuonglai', 'nhintruoctuonglai1', 'nhintruoctuonglai5', 'afterthefuture', 'afterthefuture5', 'theend', 'xaobai', 'swap', 'reverse', 'switch', 'chest', 'tancong', 'slap', 'slap2', 'slap3', 'inferno', 'inferno4', 'contrast', 'skip', 'superskip', 'favor', 'superfavor', 'seetheothers', 'garbage_collection', 'clone', 'locking', 'locking5', 'tacocat', 'zombiecat', 'rainbowcat', 'catermelon', 'potatocat', 'golemcat', 'cattea', 'vampirecat', 'streaking', 'drawbottom', 'everywhere', 'whatcat', 'freeze'];
        handCards.sort((a, b) => {
            let idxA = sortOrder.indexOf(a.id);
            let idxB = sortOrder.indexOf(b.id);
            if (idxA === -1) idxA = 999;
            if (idxB === -1) idxB = 999;
            if (idxA !== idxB) return idxA - idxB;
            return a.uid.localeCompare(b.uid);
        });
        if (selectedObj) {
            selectedCardIndex = handCards.indexOf(selectedObj);
        }
        renderHand(false);
        if (typeof socket !== 'undefined' && socket.connected) {
            socket.emit('game_reorder_hand', { roomId: matchState.roomId, cards: handCards });
        }
    });
}

const btnScrollLeft = document.getElementById('btnScrollLeft');
const btnScrollRight = document.getElementById('btnScrollRight');
if (btnScrollLeft) {
    btnScrollLeft.addEventListener('click', () => {
        handContainer.scrollBy({ left: -300, behavior: 'smooth' });
    });
}
if (btnScrollRight) {
    btnScrollRight.addEventListener('click', () => {
        handContainer.scrollBy({ left: 300, behavior: 'smooth' });
    });
}

// --- XỬ LÝ NÚT YÊU CẦU ĐÓNG PHÒNG & POPUP BIỂU QUYẾT ---
let voteCloseTimerInterval = null;
let currentVoteEndTime = 0;
let isVoteCloseActive = false;
let hasRequestedCloseRoomInMatch = false;

function disableCloseRoomButton() {
    hasRequestedCloseRoomInMatch = true;
    try {
        const rId = (typeof matchState !== 'undefined' && matchState && matchState.roomId) ? matchState.roomId : null;
        if (rId) sessionStorage.setItem('has_requested_close_' + rId, '1');
    } catch(e) {}
    const btn = document.getElementById('btnRequestCloseRoom');
    if (btn) {
        btn.disabled = true;
        btn.style.opacity = '0.35';
        btn.style.cursor = 'not-allowed';
        btn.style.pointerEvents = 'none';
        btn.style.background = '#3f3f46';
        btn.style.color = '#a1a1aa';
        btn.style.borderColor = '#52525b';
        btn.style.boxShadow = 'none';
        btn.innerText = 'ĐÃ YÊU CẦU ĐÓNG PHÒNG';
    }
}

function resetCloseRoomButton() {
    hasRequestedCloseRoomInMatch = false;
    try {
        const rId = (typeof matchState !== 'undefined' && matchState && matchState.roomId) ? matchState.roomId : null;
        if (rId) sessionStorage.removeItem('has_requested_close_' + rId);
    } catch(e) {}
    const btn = document.getElementById('btnRequestCloseRoom');
    if (btn) {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.cursor = 'pointer';
        btn.style.pointerEvents = 'auto';
        btn.style.background = '#fffdeb';
        btn.style.color = '#18181b';
        btn.style.borderColor = '#18181b';
        btn.style.boxShadow = '4px 4px 0px #000000';
        btn.innerText = 'YÊU CẦU ĐÓNG PHÒNG';
    }
}

document.addEventListener('click', (e) => {
    const btnReq = e.target.closest('#btnRequestCloseRoom');
    if (btnReq) {
        // KIỂM TRA BẢO MẬT: Nút chỉ hợp lệ khi menu Cài đặt đang được mở
        const settingsModal = document.getElementById('settingsModal');
        if (settingsModal && settingsModal.classList.contains('hidden')) return;

        if (hasRequestedCloseRoomInMatch || btnReq.disabled) {
            console.log("CLIENT: Bạn đã dùng quyền Yêu cầu đóng phòng trong ván này rồi!");
            return;
        }

        console.log("CLIENT: Bấm nút YÊU CẦU ĐÓNG PHÒNG!");
        disableCloseRoomButton();

        if (settingsModal) settingsModal.classList.add('hidden');

        if (isVoteCloseActive && currentVoteEndTime > Date.now()) {
            console.log("CLIENT: Biểu quyết đang diễn ra, chặn gửi request.");
            if (typeof showToast === 'function') {
                showToast("Đang có biểu quyết đóng phòng diễn ra!", "warning");
            } else {
                alert("Đang có biểu quyết đóng phòng diễn ra!");
            }
            return;
        }

        const rId = (typeof matchState !== 'undefined' && matchState) ? matchState.roomId : null;
        console.log("CLIENT: Gửi request_vote_close_room với roomId:", rId);
        socket.emit('request_vote_close_room', { roomId: rId });
    }

    const btnY = e.target.closest('#btnVoteYes');
    if (btnY) {
        const popup = document.getElementById('voteCloseRoomPopup');
        if (popup && popup.classList.contains('hidden')) return;

        const bY = document.getElementById('btnVoteYes');
        const bN = document.getElementById('btnVoteNo');
        if (bY) bY.disabled = true;
        if (bN) bN.disabled = true;
        const rId = (typeof matchState !== 'undefined' && matchState) ? matchState.roomId : null;
        socket.emit('vote_close_room', { roomId: rId, voteChoice: 'YES' });
    }

    const btnN = e.target.closest('#btnVoteNo');
    if (btnN) {
        const popup = document.getElementById('voteCloseRoomPopup');
        if (popup && popup.classList.contains('hidden')) return;
        
        const bY = document.getElementById('btnVoteYes');
        const bN = document.getElementById('btnVoteNo');
        if (bY) bY.disabled = true;
        if (bN) bN.disabled = true;
        const rId = (typeof matchState !== 'undefined' && matchState) ? matchState.roomId : null;
        socket.emit('vote_close_room', { roomId: rId, voteChoice: 'NO' });
    }
});

function updateVoteTimerDisplay() {
    if (!currentVoteEndTime) return;
    const remainingMs = currentVoteEndTime - Date.now();
    const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
    const timerEl = document.getElementById('voteCloseTimer');
    if (timerEl) {
        timerEl.textContent = `${remainingSec}s`;
    }
    if (remainingSec <= 0) {
        if (voteCloseTimerInterval) clearInterval(voteCloseTimerInterval);
    }
}

socket.on('vote_close_room_update', (data) => {
    console.log("CLIENT: Nhận được vote_close_room_update:", data);
    if (!data || !data.active) {
        console.log("CLIENT: data không active, ẩn popup");
        hideVoteClosePopup();
        return;
    }

    isVoteCloseActive = true;
    currentVoteEndTime = data.endTime || (Date.now() + 10000);

    const popup = document.getElementById('voteCloseRoomPopup');
    const reqNameEl = document.getElementById('voteRequesterName');
    if (popup) {
        popup.classList.remove('hidden');
        console.log("CLIENT: Đã xóa class hidden của popup");
    } else {
        console.warn("CLIENT: Không tìm thấy element voteCloseRoomPopup!");
    }

    // Render các chấm tròn đại diện cho mỗi người chơi trong ván
    const dotsContainer = document.getElementById('voteDotsContainer');
    if (dotsContainer) {
        dotsContainer.innerHTML = '';
        const total = data.totalPlayers || 2;
        const yesCount = data.yesCount !== undefined ? data.yesCount : 1;
        const noCount = data.noCount !== undefined ? data.noCount : 0;

        for (let i = 0; i < total; i++) {
            const dot = document.createElement('div');
            if (i < yesCount) {
                dot.className = 'vote-dot yes';
            } else if (i < yesCount + noCount) {
                dot.className = 'vote-dot no';
            } else {
                dot.className = 'vote-dot pending';
            }
            dotsContainer.appendChild(dot);
        }
    }

    const myId = myUid || socket.id;
    const hasVotedYes = Array.isArray(data.yesVotes) && (data.yesVotes.includes(myId) || data.yesVotes.includes(socket.id));
    const hasVotedNo = Array.isArray(data.noVotes) && (data.noVotes.includes(myId) || data.noVotes.includes(socket.id));
    const isRequester = !!hasRequestedCloseRoomInMatch || (data.requesterSocketId === socket.id) || (data.requesterUid && data.requesterUid === myId);

    if (reqNameEl) {
        reqNameEl.textContent = isRequester ? 'Bạn' : (data.requesterName || 'Người chơi');
    }

    const voteActions = document.getElementById('voteActionsWrapper') || (popup ? popup.querySelector('.vote-actions-wrapper') : null);
    const bY = document.getElementById('btnVoteYes');
    const bN = document.getElementById('btnVoteNo');

    // Người yêu cầu đóng phòng mặc định đã tính là 1 phiếu ĐỒNG Ý -> Không hiện 2 nút Đồng ý & Từ chối
    if (voteActions) {
        if (isRequester) {
            voteActions.classList.add('hidden');
        } else {
            voteActions.classList.remove('hidden');
        }
    }

    if (hasVotedYes || hasVotedNo || isRequester) {
        if (bY) bY.disabled = true;
        if (bN) bN.disabled = true;
    } else {
        if (bY) bY.disabled = false;
        if (bN) bN.disabled = false;
    }

    updateVoteTimerDisplay();
    if (voteCloseTimerInterval) clearInterval(voteCloseTimerInterval);
    voteCloseTimerInterval = setInterval(updateVoteTimerDisplay, 500);
});

function hideVoteClosePopup() {
    isVoteCloseActive = false;
    currentVoteEndTime = 0;
    if (voteCloseTimerInterval) clearInterval(voteCloseTimerInterval);
    const popup = document.getElementById('voteCloseRoomPopup');
    if (popup) popup.classList.add('hidden');
    const voteActions = document.getElementById('voteActionsWrapper') || (popup ? popup.querySelector('.vote-actions-wrapper') : null);
    if (voteActions) voteActions.classList.remove('hidden');
    const bY = document.getElementById('btnVoteYes');
    const bN = document.getElementById('btnVoteNo');
    if (bY) bY.disabled = false;
    if (bN) bN.disabled = false;
}

socket.on('vote_close_room_failed', () => {
    hideVoteClosePopup();
});

socket.on('vote_close_room_expired', () => {
    hideVoteClosePopup();
});

// Xử lý bị kick khỏi phòng
socket.on('player_kicked', ({ reason }) => {
    alert(reason || "Bạn đã bị chủ phòng đuổi khỏi phòng!");
    returnToHome();
});



// --- LOGIC MODAL XEM CHI TIẾT LÁ BÀI & HƯỚNG DẪN (CARD INSPECT MODAL) ---
const cardInspectModal = document.getElementById('cardInspectModal');
const btnCloseInspect = document.getElementById('btnCloseInspect');
const inspectCardPreview = document.getElementById('inspectCardPreview');
const inspectCardName = document.getElementById('inspectCardName');
const inspectCardContent = document.getElementById('inspectCardContent');

function parseColorCodes(text) {
    if (!text) return '';
    let escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    escaped = escaped.replace(/\n/g, '<br>');
    let currentColor = '#cbd5e1'; // Mặc định chữ xám nhẹ
    let result = `<span style="color: ${currentColor};">`;
    const regex = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-fA-F])/g;
    let lastIndex = 0;
    let match;
    while ((match = regex.exec(escaped)) !== null) {
        result += escaped.substring(lastIndex, match.index);
        currentColor = match[0];
        result += `</span><span style="color: ${currentColor};">`;
        lastIndex = regex.lastIndex;
        if (escaped[lastIndex] === ' ') {
            lastIndex++;
        }
    }
    result += escaped.substring(lastIndex) + '</span>';
    return result;
}

async function getCardGuideText(card) {
    // 1. Thử fetch từ file huongdan.json trong thư mục cards/<id>/huongdan.json
    try {
        const response = await fetch(`cards/${card.id}/huongdan.json`);
        if (response.ok) {
            const data = await response.json();
            if (data.guide) return data.guide;
        }
    } catch (err) {}
    
    // 2. Fallback lấy từ thuộc tính guide trong CARD_TYPES (đảm bảo 100% hoạt động khi mở offline bằng file://)
    const typeObj = CARD_TYPES.find(t => t.id === card.id);
    return (typeObj && typeObj.guide) ? typeObj.guide : 'Không có thông tin hướng dẫn.';
}

async function showCardInspectModal(card) {
    if (!cardInspectModal) return;
    const typeObj = CARD_TYPES.find(t => t.id === card.id);
    inspectCardName.textContent = typeObj ? typeObj.name : 'Chi Tiết Lá Bài';
    inspectCardPreview.className = getCardClass('inspect-card-preview', card);
    setupCardContent(inspectCardPreview, card);
    inspectCardContent.innerHTML = '<span style="color: #94a3b8;">Đang tải thông tin hướng dẫn...</span>';
    cardInspectModal.classList.remove('hidden');
    
    const guideText = await getCardGuideText(card);
    inspectCardContent.innerHTML = parseColorCodes(guideText);
}

if (btnCloseInspect && cardInspectModal) {
    btnCloseInspect.addEventListener('click', () => {
        cardInspectModal.classList.add('hidden');
    });
    cardInspectModal.addEventListener('click', (e) => {
        if (e.target === cardInspectModal) {
            cardInspectModal.classList.add('hidden');
        }
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !cardInspectModal.classList.contains('hidden')) {
            cardInspectModal.classList.add('hidden');
        }
    });
}

if (discardPile) {
    discardPile.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (discardedList.length > 0) {
            soundManager.playSfx('card');
            showCardInspectModal(discardedList[discardedList.length - 1].card);
        }
    });
}

// --- LOGIC HỆ THỐNG TRÒ CHUYỆN (SYSTEM CHAT) ---
const btnChatToggle = document.getElementById('btnChatToggle');
const chatInputWrapper = document.getElementById('chatInputWrapper');
const chatInputField = document.getElementById('chatInputField');
const btnChatSend = document.getElementById('btnChatSend');
const chatMessagesContainer = document.getElementById('chatMessagesContainer');
const chatStickerBar = document.getElementById('chatStickerBar');

function openChatInput() {
    if (!chatInputWrapper) return;
    chatInputWrapper.classList.remove('hidden');
    if (chatStickerBar) chatStickerBar.classList.remove('hidden');
}

function closeChatInput() {
    if (!chatInputWrapper) return;
    chatInputWrapper.classList.add('hidden');
    if (chatStickerBar) chatStickerBar.classList.add('hidden');
    if (chatInputField) {
        chatInputField.blur();
    }
}

// Xóa sạch mọi dữ liệu chat rác còn sót lại trong sessionStorage để đảm bảo chat chỉ lưu trên RAM Server
try {
    Object.keys(sessionStorage).forEach(k => {
        if (k.startsWith('meono_chat_')) sessionStorage.removeItem(k);
    });
} catch(e) {}

function renderSingleChatMessage(sender, text) {
    if (!chatMessagesContainer) return;
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hh}:${mm}`;
    
    const msgEl = document.createElement('div');
    msgEl.className = 'chat-message-bubble';
    
    const timeSpan = document.createElement('span');
    timeSpan.style.color = '#94a3b8';
    timeSpan.textContent = `${timeStr} `;
    
    const senderSpan = document.createElement('span');
    senderSpan.style.color = '#ffffff';
    senderSpan.style.fontWeight = 'bold';
    senderSpan.textContent = `${sender}: `;
    
    msgEl.appendChild(timeSpan);
    msgEl.appendChild(senderSpan);

    const matchSticker = String(text).trim().match(/^\[sticker:(\d+)\]$/);
    if (matchSticker) {
        const stickerNum = matchSticker[1];
        const img = document.createElement('img');
        img.src = `assets/sticker/sticker${stickerNum}.png`;
        img.className = 'chat-sticker-msg';
        img.alt = `Sticker ${stickerNum}`;
        msgEl.appendChild(img);
    } else {
        const textSpan = document.createElement('span');
        textSpan.style.color = '#ffffff';
        textSpan.textContent = text;
        msgEl.appendChild(textSpan);
    }
    
    chatMessagesContainer.appendChild(msgEl);
    while (chatMessagesContainer.children.length > 8) {
        chatMessagesContainer.firstElementChild.remove();
    }
    
    // Hiện tin nhắn và cài đặt tự động ẩn sau 5s
    chatMessagesContainer.style.opacity = '1';
    if (window.chatHideTimer) {
        clearTimeout(window.chatHideTimer);
    }
    window.chatHideTimer = setTimeout(() => {
        if (chatMessagesContainer) {
            chatMessagesContainer.style.opacity = '0';
        }
    }, 5000);
}

function addChatMessage(sender, text) {
    renderSingleChatMessage(sender, text);
}

function sendStickerMessage(stickerNum) {
    socket.emit('room_chat', { text: `[sticker:${stickerNum}]` });
}

if (chatStickerBar) {
    chatStickerBar.addEventListener('click', (e) => {
        e.stopPropagation();
    });
    const stickerItems = chatStickerBar.querySelectorAll('.chat-sticker-item');
    stickerItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            const num = item.dataset.sticker;
            if (num) sendStickerMessage(num);
        });
    });
}

function sendChatMessage() {
    if (!chatInputField || !chatMessagesContainer) return;
    const text = chatInputField.value.trim();
    if (!text) {
        closeChatInput();
        return;
    }
    
    // Gửi tin nhắn qua socket cho cả phòng thấy
    socket.emit('room_chat', { text: text });
    
    chatInputField.value = '';
    closeChatInput();
}

if (btnChatToggle) {
    btnChatToggle.addEventListener('click', () => {
        if (chatInputWrapper && chatInputWrapper.classList.contains('hidden')) {
            openChatInput();
        } else {
            closeChatInput();
        }
    });
}

if (btnChatSend) {
    btnChatSend.addEventListener('click', () => {
        sendChatMessage();
    });
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const isMobile = isMobileDevice();
        if (chatInputWrapper && chatInputWrapper.classList.contains('hidden')) {
            e.preventDefault();
            openChatInput();
            if (!isMobile && chatInputField) {
                // Trên PC / Desktop: ấn Enter 1 lần là có con trỏ | văn bản và gõ được luôn
                chatInputField.focus();
            }
        } else if (chatInputWrapper && !chatInputWrapper.classList.contains('hidden')) {
            e.preventDefault();
            if (isMobile && chatInputField && document.activeElement !== chatInputField) {
                // Trên điện thoại: giữ nguyên cơ chế ấn 2 lần (lần 2 mới focus)
                chatInputField.focus();
            } else {
                sendChatMessage();
            }
        }
    } else if (e.key === 'Escape') {
        if (chatInputWrapper && !chatInputWrapper.classList.contains('hidden')) {
            e.preventDefault();
            closeChatInput();
        }
    }
});

document.addEventListener('click', (e) => {
    if (chatInputWrapper && !chatInputWrapper.classList.contains('hidden')) {
        if (!chatInputWrapper.contains(e.target) && (!chatStickerBar || !chatStickerBar.contains(e.target)) && (!btnChatToggle || !btnChatToggle.contains(e.target))) {
            closeChatInput();
        }
    }
});

// --- LOGIC THU GỌN / MỞ RỘNG MENU CARD GAME ---
const toggleMenuIcon = document.getElementById('toggleMenuIcon');


// ==========================================
// SOCKET.IO MULTIPLAYER LOGIC
// ==========================================


var matchState = {
    roomId: roomId,
    active: false,
    players: [],
    currentTurnSocketId: null,
    turnDirection: 1
};

socket.on('connect', () => {
    console.log('[Match] Socket connected:', socket.id);
    if (window.VoiceEngine) window.VoiceEngine.init(socket);
    if (roomId) {
        socket.emit('get_room_chat_history', { roomId: roomId });
    }
    const username = (matchAuth && matchAuth.username) ? matchAuth.username : 'Người chơi';
    const avatar = (matchAuth && matchAuth.avatar) ? matchAuth.avatar : null;
    const rankScore = (matchAuth && matchAuth.rankScore !== undefined && matchAuth.rankScore !== null) 
        ? parseInt(matchAuth.rankScore) 
        : (parseInt(localStorage.getItem('cached_rank_score')) || 0);

    socket.emit('auth', {
        uid: myUid,
        username: username,
        avatar: avatar,
        rankScore: rankScore,
        matchRoomId: roomId,
        isMatchSocket: true
    });
    console.log('[Match] Sent auth:', myUid, username, 'Rank:', rankScore);
});

socket.on('connect_error', (err) => {
    console.warn('[Match] Đang kết nối lại Server...', err);
});

let pendingKickToHome = false;

// Khi nhận tín hiệu chủ phòng hoặc server đã đóng/reset phòng
socket.on('room_closed', () => {
    console.log('[Match] Server issued room_closed.');
    const overlay = document.getElementById('postMatchRankOverlay');
    const gameOverOverlay = document.getElementById('gameOverOverlay');
    const isGameOverShowing = gameOverOverlay && !gameOverOverlay.classList.contains('hidden');

    if ((overlay && !overlay.classList.contains('hidden')) || isGameOverShowing || matchState.isWinningShowing || matchState.isExploding) {
        // Đang xem Bảng Xếp Hạng hoặc đang hiện dòng chữ "... USERNAME WIN" đủ 2s hoặc đang nổ -> trì hoãn kick
        pendingKickToHome = true;
    } else {
        // Menu không mở và không có hoạt ảnh -> kick ngay về home.html
        returnToHome();
    }
});

// Nếu server từ chối tham gia (phòng đã đóng hoặc không có quyền)
socket.on('match_rejected', (data) => {
    returnToHome();
});

socket.on('settings_sync', (syncedSettings) => {
    if (syncedSettings) {
        settings = { ...settings, ...syncedSettings };
        
        // Update UI
        toggleMusic.checked = settings.music;
        toggleSfx.checked = settings.sfx;
        toggleFastPlay.checked = settings.fastPlay;
        
        // Apply settings
        soundManager.toggleMusic(settings.music);
        applySettings();
    }
});

socket.on('game_player_socket_updated', (data) => {
    if (!matchState.active || matchState.roomId !== data.roomId) return;
    
    // Tìm người chơi linh hoạt bằng cả 3 tiêu chí: uid, old socketId, hoặc username
    const p = matchState.players.find(x => 
        (data.uid && x.uid === data.uid) || 
        x.socketId === data.oldSocketId || 
        (data.username && x.username === data.username)
    );
    
    if (p) {
        // Cập nhật dataset id trong DOM trước khi render lại
        const oppEl = findOpponentElement(data.oldSocketId, data.username, data.uid);
        if (oppEl) {
            oppEl.dataset.id = data.newSocketId;
            if (data.uid) oppEl.dataset.uid = data.uid;
        }
        
        p.socketId = data.newSocketId;
        renderOpponentsMultiplayer();
    }
    
    // Nếu đó là lượt hiện tại, cập nhật currentTurnSocketId
    if (matchState.currentTurnSocketId === data.oldSocketId) {
        matchState.currentTurnSocketId = data.newSocketId;
        updateStats();
    }
});

socket.on('game_setup', (data) => {
    console.log('[Match] Nhận game_setup:', data);
    if (data && data.roomId) {
        matchState.roomId = data.roomId;
        applyRoomBackground(data.roomId, data.selectedMap);
    }
    // Nếu ván đấu mới bắt đầu, ẩn menu bảng xếp hạng ở nền và vào trận mới ngay
    const rankOverlay = document.getElementById('postMatchRankOverlay');
    if (rankOverlay) rankOverlay.classList.add('hidden');
    pendingKickToHome = false;

    matchState.active = true;
    matchState.turnDirection = data.turnDirection !== undefined ? data.turnDirection : 1;
    if (data.fastReconnect) {
        matchState.players = data.players || [];
    } else {
        matchState.players = (data.players || []).map(p => ({ ...p, cardCount: 0, hand: [] }));
    }
    matchState.currentTurnSocketId = data.currentTurnSocketId;
    if (data.hostSocketId) matchState.hostSocketId = data.hostSocketId;
    if(data.turnsRemaining !== undefined) updateTurnsRemainingBanner(data.turnsRemaining, data.currentTurnUsername);
    
    // Ẩn banner chờ gài bom khi nhận game_setup mới
    const dwb = document.getElementById('defuseWaitBanner');
    if (dwb) dwb.classList.add('hidden');
    
    // Hiển thị nút Yêu cầu đóng phòng cho tất cả người chơi trong ván
    const rowCloseRoom = document.getElementById('rowCloseRoom');
    if (rowCloseRoom) {
        rowCloseRoom.style.display = 'flex';
    }
    
    // Cập nhật trạng thái nút Yêu cầu đóng phòng
    if (!data || !data.fastReconnect) {
        // Ván đấu mới -> Reset danh sách chết, nút bấm về ban đầu cho tất cả mọi người, dọn dẹp sessionStorage ván cũ
        deadPlayers.clear();
        currentlyExplodingPlayers.clear();
        resetCloseRoomButton();
        hideVoteClosePopup();
    } else {
        // Tái kết nối F5 giữa trận -> Giữ trạng thái đã bấm nếu đã từng bấm trong ván này
        const myUid = (typeof myUserInfo !== 'undefined' && myUserInfo) ? myUserInfo.uid : null;
        const isRequestedOnServer = data && data.requestedCloseUids && Array.isArray(data.requestedCloseUids) && (data.requestedCloseUids.includes(socket?.id) || (myUid && data.requestedCloseUids.includes(myUid)));
        const isRequestedInStorage = (function() {
            try { return data && data.roomId && sessionStorage.getItem('has_requested_close_' + data.roomId) === '1'; } catch(e) { return false; }
        })();

        if (isRequestedOnServer || isRequestedInStorage) {
            disableCloseRoomButton();
        } else {
            resetCloseRoomButton();
        }
    }

    // Hiện lại cục bài ở giữa sau khi nhận data
    const centerDeck = document.getElementById('centerDeck');
    if (centerDeck) centerDeck.style.visibility = 'visible';

    // Render opponents
    if (data.players && Array.isArray(data.players)) {
        data.players.forEach(p => {
            if (p.alive === false) {
                markPlayerDead(p);
            }
        });
    }
    renderOpponentsMultiplayer();

    // Bảo toàn & tiếp tục chạy hoạt ảnh nổ nếu vừa F5 giữa chừng
    if (data && data.roomId) {
        try {
            const expUid = sessionStorage.getItem('meono_exploding_uid_' + data.roomId);
            const expTimeStr = sessionStorage.getItem('meono_exploding_time_' + data.roomId);
            if (expUid && expTimeStr) {
                const elapsed = Date.now() - parseInt(expTimeStr);
                if (elapsed >= 0 && elapsed < 2200) {
                    const startFrame = Math.min(70, Math.max(1, Math.floor(elapsed / 25) + 1));
                    const expPlayer = findPlayerInState(expUid, expUid);
                    const expUsername = expPlayer ? expPlayer.username : 'Người chơi';
                    setTimeout(() => {
                        triggerExplosionAnimation(expUid, expUsername, startFrame);
                    }, 200);
                } else {
                    sessionStorage.removeItem('meono_exploding_uid_' + data.roomId);
                    sessionStorage.removeItem('meono_exploding_time_' + data.roomId);
                }
            }
        } catch(e){}
    }

    if (data.fastReconnect) {
        if (data.yourHand && Array.isArray(data.yourHand)) {
            handCards = data.yourHand;
        }
        if (typeof data.drawPileCount === 'number') {
            remainingDeckCount = data.drawPileCount;
        }
    } else {
        handCards = [];
        remainingDeckCount = data.totalCardsBeforeCeremony || data.totalCardsInDeck || (typeof data.drawPileCount === 'number' ? (data.drawPileCount + (data.players ? data.players.length * 7 : 14)) : 0);
    }
    updateStats();

    // Khôi phục trạng thái chết (nếu có)
    const myPlayer = matchState.players ? matchState.players.find(p => isMeUid(p.uid) || p.socketId === socket.id) : null;
    if (myPlayer && myPlayer.alive === false) {
        document.body.classList.add('hand-dead');
    } else {
        document.body.classList.remove('hand-dead');
    }

    // Khôi phục chồng bài rác (discard pile)
    if (data.discardPile && Array.isArray(data.discardPile) && data.discardPile.length > 0) {
        discardPile.innerHTML = '';
        discardedList = [];
        discardCount = 0;
        data.discardPile.forEach((card) => {
            discardedList.push({
                card: card,
                offsetX: (Math.random() - 0.5) * 40,
                offsetY: (Math.random() - 0.5) * 40
            });
            discardCount++;
        });
        renderDiscardPile();
    }

    applySettings();

    // Bắt đầu ceremony an toàn
    playCeremony(data).catch(e => {
        console.error('[Ceremony Error] Spawning fallback UI state:', e);
        isCeremonyPlaying = false;
        if (data.yourHand && Array.isArray(data.yourHand)) {
            handCards = data.yourHand;
        }
        if (data.players && Array.isArray(data.players)) {
            matchState.players = data.players;
        }
        if (typeof data.drawPileCount === 'number') {
            remainingDeckCount = data.drawPileCount;
        }
        renderHand(false);
        renderOpponentsMultiplayer();
        updateStats();
        updateTurnIndicator();
        const centerDeck = document.getElementById('centerDeck');
        if (centerDeck) centerDeck.style.visibility = 'visible';
    });
});

// ===== HỆ THỐNG CHIA BÀI CEREMONY =====


function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Hàm tạo 1 ceremony card element (mặt ngửa)
function createCeremonyCard(card) {
    const el = document.createElement('div');
    el.className = getCardClass('ceremony-card face-up', card);
    setupCardContent(el, card);
    return el;
}

async function playCeremony(data) {
    if (data.fastReconnect) {
        isCeremonyPlaying = false;
        handCards = data.yourHand || [];
        matchState.players = data.players;

        // Kiểm tra xem bài trên tay tôi có đang bị người khác nhìn không khi F5
        const myPlayer = (data.players || []).find(p => isMePlayer(p.socketId, p.uid, p.username));
        const someoneSeeingOthers = (data.players || []).find(p => p.seeingOthersHand);
        const isMyHandBeingViewed = (myPlayer && myPlayer.beingSeenBy) || 
            (someoneSeeingOthers && someoneSeeingOthers.seeingOthersHand && isMePlayer(someoneSeeingOthers.seeingOthersHand.targetSocketId, someoneSeeingOthers.seeingOthersHand.targetUid, someoneSeeingOthers.seeingOthersHand.targetUsername));

        if (isMyHandBeingViewed) {
            document.body.classList.add('my-hand-being-viewed');
        } else {
            document.body.classList.remove('my-hand-being-viewed');
        }

        renderHand(false);
        renderOpponentsMultiplayer();
        updateStats();
        updateTurnIndicator();
        
        matchState.players.forEach(p => {
            if (p.isSeeingFuture && !isMePlayer(p.socketId, p.uid, p.username)) {
                spawnSeeFutureMiniCards(p.socketId, p.username, p.seeingFutureCount || 3);
            }
            if (p.seeingOthersHand && !isMePlayer(p.socketId, p.uid, p.username)) {
                spawnSeeTheOthersMiniCards(
                    p.socketId,
                    p.username,
                    p.uid,
                    p.seeingOthersHand.targetSocketId,
                    p.seeingOthersHand.targetUsername,
                    p.seeingOthersHand.targetUid,
                    p.seeingOthersHand.count || 3,
                    true // isReconnect
                );
            }
        });
        
        if (window.parent && window.parent !== window && window.parent.postMessage) {
            try { window.parent.postMessage({ type: 'MATCH_RENDERED' }, '*'); } catch(e) {}
        }
        if (typeof window.dismissGamePreloader === 'function') {
            window.dismissGamePreloader();
        }
        return;
    }

    isCeremonyPlaying = true;
    console.log('[Ceremony] Bắt đầu chuỗi ceremony chia bài');
    await delay(800);

    const deckElem = document.getElementById('deckStackElem') || document.getElementById('centerDeck');
    const deckRect = deckElem.getBoundingClientRect();

    // ① Bước 1: Rút các lá EK + Defuse ra giữa bàn
    console.log('[Ceremony] Bước 1: Rút EK + Defuse ra giữa bàn');
    const extractedCards = data.ceremonyExtractedCards || [];
    const tableCards = []; // Lưu các DOM element đang trên bàn
    
    if (extractedCards.length > 0) {
        const screenCenterX = window.innerWidth / 2;
        const screenCenterY = window.innerHeight / 2;
        const cardW = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--card-width')) || 195;
        const cardH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--card-height')) || 278;
        const overlapRatio = 0.4; // Đè nhau 60% → hiện 40%
        const stepX = cardW * overlapRatio;
        const totalWidth = cardW + (extractedCards.length - 1) * stepX;
        const startX = screenCenterX - totalWidth / 2;

        for (let i = 0; i < extractedCards.length; i++) {
            const card = extractedCards[i];
            const el = createCeremonyCard(card);
            
            const targetX = startX + i * stepX;
            const targetY = screenCenterY - cardH / 2;
            const deltaX = deckRect.left - targetX;
            const deltaY = deckRect.top - targetY;
            
            // Bắt đầu từ vị trí chồng bài rút bằng GPU translate3d
            el.style.left = targetX + 'px';
            el.style.top = targetY + 'px';
            el.style.width = cardW + 'px';
            el.style.height = cardH + 'px';
            el.style.willChange = 'transform, opacity';
            el.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0) scale(0.95)`;
            el.style.opacity = '0';
            el.style.zIndex = String(8001 + i);
            document.body.appendChild(el);

            // Giảm số bài trong chồng rút ngay khi lá bài bắt đầu được rút ra
            remainingDeckCount = Math.max(0, remainingDeckCount - 1);
            updateStats();

            soundManager.playSfx('draw_card');

            // Animate bay ra giữa bàn bằng GPU translate3d
            await delay(30);
            el.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.5s ease';
            el.style.transform = 'translate3d(0, 0, 0) scale(1)';
            el.style.opacity = '1';

            tableCards.push({ el: el, card: card });
            
            await delay(320);
        }
        await delay(800);
    }

    // ② Bước 2: Phát 1 Defuse cho mỗi người (nếu có)
    const defuseSequence = data.defuseDealSequence || [];
    console.log('[Ceremony] Bước 2: Phát ' + defuseSequence.length + ' lá Defuse');
    
    if (defuseSequence.length > 0) {
        for (let i = 0; i < defuseSequence.length; i++) {
            const deal = defuseSequence[i];
            
            // Tìm lá defuse trên bàn và gỡ nó ra
            const defuseIdx = tableCards.findIndex(function(tc) { return tc.card.id === 'defuse'; });
            let startEl = null;
            if (defuseIdx !== -1) {
                startEl = tableCards[defuseIdx].el;
                tableCards.splice(defuseIdx, 1);
            }

            const isMe = isMeUid(deal.playerUid) || (deal.playerSocketId && deal.playerSocketId === socket.id);
            
            if (isMe) {
                if (deal.card) { handCards.push(deal.card); }
                if (startEl) {
                    const startRect = startEl.getBoundingClientRect();
                    startEl.remove();
                    renderHand(true, startRect);
                } else {
                    renderHand(true);
                }
                soundManager.playSfx('draw_card');
            } else {
                let sRect = null;
                if (startEl) {
                    sRect = startEl.getBoundingClientRect();
                    startEl.remove();
                }
                animateCardFlyToOpponent(deal.playerSocketId || deal.playerUid, sRect, deal.username);
                const oppPlayer = findPlayerInState(deal.playerSocketId, deal.playerUid, deal.username);
                if (oppPlayer) {
                    oppPlayer.cardCount = (typeof oppPlayer.cardCount === 'number' ? oppPlayer.cardCount : (oppPlayer.hand?.length || 0)) + 1;
                }
                renderOpponentsMultiplayer();
                soundManager.playSfx('draw_card');
            }
            
            await delay(500);
        }
        await delay(350);
    }

    // ③ Bước 3: Xáo chồng bài rút lần 1
    console.log('[Ceremony] Bước 3: Shuffle chồng bài rút lần 1');
    const deckContainer = document.getElementById('centerDeck');
    if (deckContainer) {
        deckContainer.classList.add('deck-shuffling'); soundManager.playSfx('shuffle'); await delay(1500);
        deckContainer.classList.remove('deck-shuffling');
    }
    await delay(300);

    // ④ Bước 4: Chia 6 lá/người từ chồng bài rút
    const mainSequence = data.mainDealSequence || [];
    console.log('[Ceremony] Bước 4: Chia ' + mainSequence.length + ' lá bài');
    
    for (let i = 0; i < mainSequence.length; i++) {
        const deal = mainSequence[i];
        const isMe = isMeUid(deal.playerUid) || (deal.playerSocketId && deal.playerSocketId === socket.id);
        
        // Giảm số bài trong chồng rút mỗi lần chia
        remainingDeckCount = Math.max(0, remainingDeckCount - 1);
        updateStats();

        if (isMe) {
            // Chia cho tôi
            const cardInHand = data.yourHand.find(function(c) {
                return c.id === deal.cardId && !handCards.some(function(hc) { return hc.uid === c.uid; });
            });
            if (cardInHand) {
                handCards.push(cardInHand);
            }
            renderHand(true);
            soundManager.playSfx('card');
        } else {
            // Chia cho đối thủ
            animateCardFlyToOpponent(deal.playerSocketId || deal.playerUid, null, deal.username);
            // Cập nhật cardCount
            const oppPlayer = findPlayerInState(deal.playerSocketId, deal.playerUid, deal.username);
            if (oppPlayer) {
                oppPlayer.cardCount = (typeof oppPlayer.cardCount === 'number' ? oppPlayer.cardCount : (oppPlayer.hand?.length || 0)) + 1;
            }
            renderOpponentsMultiplayer();
        }

        await delay(350);
    }
    await delay(450);

    // ⑤ Bước 5: Lật úp các lá EK + Defuse thừa và nhét lại vào chồng rút
    const reinsertCards = data.ceremonyReinsertCards || [];
    console.log('[Ceremony] Bước 5: Nhét lại ' + reinsertCards.length + ' lá (EK + Defuse thừa)');
    
    if (tableCards.length > 0) {
        // Lật úp cùng 1 lúc
        for (let t = 0; t < tableCards.length; t++) {
            const el = tableCards[t].el;
            el.style.transition = 'transform 0.25s ease';
            el.style.transform = 'rotateY(90deg)';
        }
        await delay(250);
        
        // Đổi sang mặt sau
        for (let t = 0; t < tableCards.length; t++) {
            const el = tableCards[t].el;
            el.className = 'ceremony-card face-down';
            el.innerHTML = '';
            el.style.backgroundImage = ''; // Xóa ảnh mặt trước để CSS mặt sau có tác dụng
            el.style.transform = 'rotateY(0deg)';
        }
        await delay(250);

        // Trượt từng lá về chồng bài rút bằng GPU translate3d
        const freshDeckRect = deckElem.getBoundingClientRect();
        for (let t = 0; t < tableCards.length; t++) {
            const el = tableCards[t].el;
            const currentCardRect = el.getBoundingClientRect();
            const deltaX = freshDeckRect.left - currentCardRect.left;
            const deltaY = freshDeckRect.top - currentCardRect.top;
            
            el.style.willChange = 'transform, opacity';
            el.style.transition = 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.45s ease';
            el.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0) scale(0.9)`;
            el.style.opacity = '0.2';
            
            // Tăng số bài trong chồng rút
            remainingDeckCount++;
            updateStats();
            
            soundManager.playSfx('card');
            setTimeout(() => { if (el.parentNode) el.remove(); }, 450);
            await delay(200);
        }
        await delay(250);
    }

    // ⑥ Bước 6: Xáo chồng bài rút lần cuối
    console.log('[Ceremony] Bước 6: Shuffle lần cuối');
    if (deckContainer) {
        deckContainer.classList.add('deck-shuffling'); soundManager.playSfx('shuffle'); await delay(1500);
        deckContainer.classList.remove('deck-shuffling');
    }

    // Cập nhật số bài chính xác từ server
    remainingDeckCount = data.drawPileCount;
    updateStats();

    // Hiện banner "BẮT ĐẦU!"
    const banner = document.createElement('div');
    banner.className = 'ceremony-start-banner';
    banner.textContent = 'BẮT ĐẦU!';
    document.body.appendChild(banner);
    await delay(50);
    banner.classList.add('show');
    await delay(1000);
    banner.classList.add('hide');
    await delay(400);
    if (banner.parentNode) banner.remove();

    // Ceremony hoàn tất → báo server chuyển phase sang PLAYING
    isCeremonyPlaying = false;
    socket.emit('ceremony_complete', { roomId: matchState.roomId });
    
    // Đảm bảo hand cuối cùng đúng với data từ server
    handCards = data.yourHand;
    matchState.players = data.players; // Khôi phục cardCount chính xác từ server
    renderHand(false);
    renderOpponentsMultiplayer();
    remainingDeckCount = data.drawPileCount;
    updateStats();
    updateTurnIndicator();
    
    console.log('[Ceremony] Hoàn tất! Ván đấu bắt đầu.');
}

// Biến cờ bảo vệ chu kỳ rút bài: đảm bảo hoạt ảnh lá bài bay về tay/avatar người rút kết thúc xong xuôi thì lượt mới chuyển và người tiếp theo mới được rút
// (Đã khai báo ở đầu file match.js)

// Người chơi TỰ MÌNH rút bài (server gửi lá bài cụ thể)
socket.on('game_card_drawn_self', (data) => {
    if (!matchState.active) return;
    
    lockCardActions(500);
    isDrawAnimationActive = true;
    clearTimeout(drawAnimationTimer);
    
    remainingDeckCount = data.drawPileCount;
    updateStats();
    
    soundManager.playSfx('card');
    handCards.push(data.card);
    renderHand(true);

    drawAnimationTimer = setTimeout(() => {
        isDrawAnimationActive = false;
        if (pendingTurnChangeData) {
            const turnData = pendingTurnChangeData;
            pendingTurnChangeData = null;
            applyTurnChanged(turnData);
        }
    }, 500);
});

// NGƯỜI KHÁC rút bài (server không gửi lá bài cụ thể, chỉ gửi số lượng)
socket.on('game_card_drawn_other', (data) => {
    if (!matchState.active) return;
    
    lockCardActions(500);
    isDrawAnimationActive = true;
    clearTimeout(drawAnimationTimer);
    
    remainingDeckCount = data.drawPileCount;
    updateStats();
    
    // Tìm người chơi linh hoạt bằng cả 3 tiêu chí
    const opp = findPlayerInState(data.playerSocketId, data.playerUid, data.playerUsername);
    if (opp) {
        if (data.playerCardCount !== undefined) {
            opp.cardCount = data.playerCardCount;
        } else {
            opp.cardCount = (opp.cardCount !== undefined ? opp.cardCount : (opp.hand?.length || 0)) + 1;
        }
    }
    // Render lại UI để có DOM mới nhất
    renderOpponentsMultiplayer();
    
    // Gọi animation SAU KHI DOM ĐÃ CẬP NHẬT để không bị mất element
    requestAnimationFrame(() => {
        animateCardFlyToOpponent(data.playerSocketId, null, data.playerUsername, data.playerUid);
    });

    drawAnimationTimer = setTimeout(() => {
        isDrawAnimationActive = false;
        if (pendingTurnChangeData) {
            const turnData = pendingTurnChangeData;
            pendingTurnChangeData = null;
            applyTurnChanged(turnData);
        }
    }, 500);
});


let nopeProgressTimer = null;
let currentPendingCardsDOM = []; // DOM elements waiting to be resolved

function startNopeTimer(waitSec) {
    const container = document.getElementById('nopeProgressContainer');
    const circle = document.getElementById('nopeProgressCircle');
    if (!container || !circle) return;
    
    clearInterval(nopeProgressTimer);
    
    container.style.display = 'block';
    circle.style.transition = 'none';
    circle.style.strokeDashoffset = '0';
    
    // Force reflow
    void circle.getBoundingClientRect();
    
    circle.style.transition = `stroke-dashoffset ${waitSec}s linear`;
    circle.style.strokeDashoffset = '653.45';
    
    nopeProgressTimer = setTimeout(() => {
        container.style.display = 'none';
    }, waitSec * 1000);
}

function stopNopeTimer() {
    const container = document.getElementById('nopeProgressContainer');
    if (container) container.style.display = 'none';
    clearInterval(nopeProgressTimer);
    matchState.isWaitingNope = false;
    matchState.lastPendingPlayerSocketId = null;
}

// Thêm tính năng click vào UI đếm ngược "NOPE?" để tự động đánh lá Nope hoặc Super Nope trên tay (nếu có)
const nopeProgressContainerEl = document.getElementById('nopeProgressContainer');
if (nopeProgressContainerEl) {
    nopeProgressContainerEl.addEventListener('click', () => {
        if (!matchState.isWaitingNope) return;

        // Chặn tự Nope lá bài hoặc combo của chính mình
        if (matchState.lastPendingPlayerSocketId === socket.id) return;

        // Ưu tiên lá bài Nope hoặc Super Nope đang được chọn (selected) nếu có
        const lockedUids = matchState.myLockedCardUids || [];
        let chosenIndex = -1;
        if (selectedCardIndex !== null && selectedCardIndex < handCards.length) {
            const sCard = handCards[selectedCardIndex];
            if (sCard && (sCard.id === 'nope' || sCard.id === 'supernope') && !lockedUids.includes(sCard.uid)) {
                chosenIndex = selectedCardIndex;
            }
        }

        // Nếu chưa chọn, ưu tiên tìm lá Nope thường trước (để tiết kiệm Super Nope), nếu không có mới dùng Super Nope
        if (chosenIndex === -1) {
            chosenIndex = handCards.findIndex(c => c.id === 'nope' && !lockedUids.includes(c.uid));
            if (chosenIndex === -1) {
                chosenIndex = handCards.findIndex(c => c.id === 'supernope' && !lockedUids.includes(c.uid));
            }
        }

        if (chosenIndex === -1) return;

        const nopeCard = handCards[chosenIndex];
        const cardEls = document.querySelectorAll('#handContainer .card');
        let cardEl = null;
        cardEls.forEach(el => {
            if (el.dataset.uid === nopeCard.uid) cardEl = el;
        });

        playCard(chosenIndex, cardEl);
    });
}

socket.on('game_card_played_pending', (data) => {
    if (!matchState.active) return;
    
    const isMe = (data.playerSocketId === socket.id);
    const playedCard = data.card;
    const waitTime = data.waitNopeTime;
    
    // --- SHOW TOAST THÔNG BÁO (wrapped in try-catch to never block card animations) ---
    try {
        const playerPlaying = matchState.players[data.playerIndex];
        if (playerPlaying) {
            const username = playerPlaying.username;
            const cardId = playedCard.id;
            
            if (['skip', 'superskip', 'slap', 'slap2', 'slap3', 'inferno', 'inferno4', 'nope', 'supernope', 'swap', 'reverse', 'switch', 'chest', 'tancong', 'nhintruoctuonglai', 'nhintruoctuonglai1', 'afterthefuture', 'afterthefuture5', 'xaobai', 'favor', 'superfavor', 'seetheothers', 'garbage_collection', 'clone', 'locking', 'locking5'].includes(cardId)) {
                let msg = '';
                if (cardId === 'inferno' || cardId === 'inferno4') {
                    const iName = cardId === 'inferno4' ? 'INFERNO 4' : 'INFERNO';
                    msg = `<span class="toast-username">${username}</span> dùng <span style="color: #ef4444; font-weight: bold; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">${iName}</span>`;
                } else if (cardId === 'slap' || cardId === 'slap2' || cardId === 'slap3') {
                    let sName = 'Slap';
                    if (cardId === 'slap2') sName = 'Slap x2';
                    if (cardId === 'slap3') sName = 'Slap x3';
                    msg = `<span class="toast-username">${username}</span> dùng <span style="color: #ef4444; font-weight: bold; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">${sName}</span>`;
                } else if (cardId === 'skip') {
                    msg = `<span class="toast-username">${username}</span> dùng <span style="color: #3b82f6; font-weight: bold; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">Lướt qua</span>`;
                } else if (cardId === 'superskip') {
                    msg = `<span class="toast-username">${username}</span> dùng <span style="color: #3b82f6; font-weight: bold; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">Siêu Lướt qua</span>`;
                } else if (cardId === 'nope') {
                    msg = `<span class="toast-username">${username}</span> dùng <span style="color: #ef4444; font-weight: bold; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">Nope</span>`;
                } else if (cardId === 'supernope') {
                    msg = `<span class="toast-username">${username}</span> dùng <span style="color: #f43f5e; font-weight: bold; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">SUPER NOPE</span>`;
                } else if (cardId === 'swap') {
                    msg = `<span class="toast-username">${username}</span> dùng <span style="color: #06b6d4; font-weight: bold; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">Hoán Đổi</span>`;
                } else if (cardId === 'reverse') {
                    msg = `<span class="toast-username">${username}</span> dùng <span style="color: #3b82f6; font-weight: bold; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">Đổi Chiều</span>`;
                } else if (cardId === 'switch') {
                    msg = `<span class="toast-username">${username}</span> dùng <span style="color: #06b6d4; font-weight: bold; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">Switch</span>`;
                } else if (cardId === 'chest') {
                    const pts = (typeof playedCard.chestPoints === 'number') ? playedCard.chestPoints : 0;
                    msg = `<span class="toast-username">${username}</span> mở <span style="color: #f59e0b; font-weight: bold; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">Rương Thưởng</span> (${pts} điểm)`;
                } else if (cardId === 'nhintruoctuonglai' || cardId === 'nhintruoctuonglai1') {
                    msg = `<span class="toast-username">${username}</span> dùng <span style="color: #ec4899; font-weight: bold; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">Nhìn tương lai</span>`;
                } else if (cardId === 'afterthefuture' || cardId === 'afterthefuture5') {
                    msg = `<span class="toast-username">${username}</span> dùng <span style="color: #8b5cf6; font-weight: bold; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">Can thiệp tương lai</span>`;
                } else if (cardId === 'xaobai') {
                    msg = `<span class="toast-username">${username}</span> dùng <span style="color: #d97706; font-weight: bold; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">Xào bài</span>`;
                } else if (cardId === 'favor') {
                    msg = `<span class="toast-username">${username}</span> dùng <span style="color: #94a3b8; font-weight: bold; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">Xin xỏ</span>`;
                } else if (cardId === 'superfavor') {
                    msg = `<span class="toast-username">${username}</span> dùng <span style="color: #a855f7; font-weight: bold; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">Super Favor</span>`;
                } else if (cardId === 'seetheothers') {
                    msg = `<span class="toast-username">${username}</span> dùng <span style="color: #06b6d4; font-weight: bold; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">Nhìn bài</span>`;
                } else if (cardId === 'garbage_collection') {
                    msg = `<span class="toast-username">${username}</span> dùng <span style="color: #10b981; font-weight: bold; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">Dọn rác</span>`;
                } else if (cardId === 'clone') {
                    msg = `<span class="toast-username">${username}</span> dùng <span style="color: #22c55e; font-weight: bold; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">Clone</span>`;
                } else if (cardId === 'locking' || cardId === 'locking5') {
                    const cardNameDisplay = cardId === 'locking5' ? 'LOCKING 5' : 'LOCKING';
                    msg = `<span class="toast-username">${username}</span> dùng <span style="color: #dc2626; font-weight: bold; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">${cardNameDisplay}</span>`;
                } else if (cardId === 'tancong') {
                    // Tìm người tiếp theo an toàn
                    let nextUsername = '???';
                    try {
                        const step = matchState.turnDirection || 1;
                        let nextIndex = (data.playerIndex + step + matchState.players.length) % matchState.players.length;
                        let safety = 0;
                        while (matchState.players[nextIndex] && !matchState.players[nextIndex].alive && safety < matchState.players.length) {
                            nextIndex = (nextIndex + step + matchState.players.length) % matchState.players.length;
                            safety++;
                        }
                        if (matchState.players[nextIndex]) nextUsername = matchState.players[nextIndex].username;
                    } catch(e) {}
                    msg = `<span class="toast-username">${username}</span> dùng <span style="color: #f97316; font-weight: bold; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">Tấn công</span> lên <span class="toast-username">${nextUsername}</span>`;
                }
                showGameToast('Hành động', msg, 'success');
            } else if (cardId.startsWith('combo_')) {
                const count = cardId.replace('combo_', '');
                let msg = `<span class="toast-username">${username}</span> dùng <span style="color: #eab308; font-weight: bold; text-shadow: 0 1px 2px rgba(0,0,0,0.8);">Combo ${count} lá</span>`;
                showGameToast('Hành động', msg, 'success');
            }
        }
    } catch(e) { console.warn('[Toast] Lỗi hiển thị toast:', e); }
    // ----------------------------
    
    // Bật cờ chờ nope nếu có (nếu là supernope thì tắt/đóng timer nope ngay lập tức)
    if (playedCard.id === 'supernope' || !waitTime || waitTime <= 0) {
        stopNopeTimer();
    } else {
        matchState.isWaitingNope = true;
        matchState.lastPendingPlayerSocketId = data.playerSocketId;
        startNopeTimer(waitTime);
    }
    
    // Cập nhật nút Play nếu đang chọn lá Nope
    if (typeof updatePlayButtonState === 'function') updatePlayButtonState();
    
    const targetOffsetX = (Math.random() * 60) - 30;
    const targetOffsetY = (Math.random() * 40) - 20;
    
    if (isMe) {
        lockCardActions(500);
        let isCombo = playedCard.id && playedCard.id.startsWith('combo_');
        let cardRemoved = false;
        let startRect = null;
        const cardStartRects = {};

        if (isCombo) {
            // Lấy vị trí từng lá bài trên tay trước khi gỡ để tạo hiệu ứng bay chuẩn xác từ tay
            playedCard.originalCards.forEach((oc) => {
                const cardDOM = document.querySelector(`.card[data-uid="${oc.uid}"]`);
                if (cardDOM) {
                    cardStartRects[oc.uid] = cardDOM.getBoundingClientRect();
                }
                const idx = handCards.findIndex(c => c.uid === oc.uid);
                if (idx !== -1) handCards.splice(idx, 1);
            });
            cardRemoved = true;
            
            const handRect = document.getElementById('handContainer').getBoundingClientRect();
            startRect = { left: handRect.left + handRect.width / 2, top: handRect.top, width: 100, height: 145 };
        } else {
            const idx = handCards.findIndex(c => c.uid === playedCard.uid);
            if (idx !== -1) {
                if (lastPlayedCardUid === playedCard.uid && lastPlayedCardRect) {
                    startRect = lastPlayedCardRect;
                } else {
                    const cardDOM = document.querySelector(`.card[data-uid="${playedCard.uid}"]`);
                    if (cardDOM) {
                        startRect = cardDOM.getBoundingClientRect();
                    } else {
                        const handRect = document.getElementById('handContainer').getBoundingClientRect();
                        startRect = { left: handRect.left + handRect.width / 2, top: handRect.top, width: 100, height: 145 };
                    }
                }
                handCards.splice(idx, 1);
                cardRemoved = true;
            }
        }

        if (cardRemoved) {
            selectedCardIndex = null;
            renderHand(false);
            
            const discardPileRect = discardPile.getBoundingClientRect();
            const appScale = window._appScale || 1;
            const rootStyles = getComputedStyle(document.documentElement);
            const cardW = parseInt(rootStyles.getPropertyValue('--card-width')) || 195;
            const cardH = parseInt(rootStyles.getPropertyValue('--card-height')) || 278;
            
            let cardsToAnimate = [];
            if (playedCard.id && playedCard.id.startsWith('combo_') && playedCard.originalCards) {
                const comboCount = playedCard.originalCards.length;
                // Hiển thị riêng cho combo (2 lá giống, 3 lá giống, 5 lá khác nhau):
                // Các lá đè lên nhau nhưng cách nhau 40% bề rộng lá bài (0.4 * cardW) và thẳng hàng ngang (offsetY = 0)
                const stepX = cardW * 0.4;
                const totalSpan = (comboCount - 1) * stepX;
                const startX = -totalSpan / 2;

                cardsToAnimate = playedCard.originalCards.map((oc, i) => {
                    return {
                        card: oc,
                        targetOffsetX: Math.round(startX + i * stepX),
                        targetOffsetY: 0,
                        comboIndex: i,
                        isCombo: true,
                        customStartRect: cardStartRects[oc.uid] || null
                    };
                });
            } else {
                cardsToAnimate = [{ card: playedCard, targetOffsetX, targetOffsetY, comboIndex: 0, isCombo: false, customStartRect: null }];
            }

            const targetLeft = discardPileRect.left + discardPileRect.width / 2 - (cardW * appScale) / 2;
            const targetTop = discardPileRect.top + discardPileRect.height / 2 - (cardH * appScale) / 2;

            cardsToAnimate.forEach(cAnim => {
                const curStartRect = cAnim.customStartRect || startRect;
                const deltaX = (curStartRect.left + curStartRect.width / 2 - (targetLeft + (cardW * appScale) / 2)) / appScale;
                const deltaY = (curStartRect.top + curStartRect.height / 2 - (targetTop + (cardH * appScale) / 2)) / appScale;

                const el = createDiscardCardElement({ card: cAnim.card, offsetX: cAnim.targetOffsetX, offsetY: cAnim.targetOffsetY });
                
                // Add glowing class if it's a combo
                if (cAnim.isCombo) {
                    el.classList.add('combo-card-glow');
                }
                
                el.style.position = 'fixed';
                el.style.left = targetLeft + 'px';
                el.style.top = targetTop + 'px';
                el.style.width = (cardW * appScale) + 'px';
                el.style.height = (cardH * appScale) + 'px';
                el.style.willChange = 'transform';
                el.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0) scale(1)`;
                el.style.zIndex = 1000 + data.stackLength * 10 + (cAnim.comboIndex || 0);
                el.style.transition = 'none';
                
                document.body.appendChild(el);
                
                requestAnimationFrame(() => {
                    el.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
                    el.style.transform = `translate3d(${cAnim.targetOffsetX}px, ${cAnim.targetOffsetY}px, 0) scale(1)`;
                });
                
                currentPendingCardsDOM.push({ el, item: { card: cAnim.card, offsetX: cAnim.targetOffsetX, offsetY: cAnim.targetOffsetY } });
            });
        }

    } else {
        const opp = findPlayerInState(data.playerSocketId, data.playerUid, data.playerUsername);
        if (opp) {
            if (data.playerCardCount !== undefined) {
                opp.cardCount = data.playerCardCount;
            } else {
                let cardsPlayed = 1;
                if (data.card && data.card.originalCards) {
                    cardsPlayed = data.card.originalCards.length;
                }
                const currentCount = opp.cardCount !== undefined ? opp.cardCount : (opp.hand?.length || 0);
                opp.cardCount = Math.max(0, currentCount - cardsPlayed);
            }
        }
        renderOpponentsMultiplayer();
        
        requestAnimationFrame(() => {
            let startRect = null;
            const oppEl = findOpponentElement(data.playerSocketId, data.playerUsername || (opp ? opp.username : null), data.playerUid || (opp ? opp.uid : null));
            if (oppEl) {
                const avatarCircle = oppEl.querySelector('.opponent-avatar-circle') || oppEl;
                startRect = avatarCircle.getBoundingClientRect();
            }
            if (!startRect) {
                startRect = { left: window.innerWidth / 2, top: -100, width: 50, height: 50 };
            }
            
            const discardPileRect = discardPile.getBoundingClientRect();
            const appScale = window._appScale || 1;
            const rootStyles = getComputedStyle(document.documentElement);
            const cardW = parseInt(rootStyles.getPropertyValue('--card-width')) || 195;
            const cardH = parseInt(rootStyles.getPropertyValue('--card-height')) || 278;
            
            let cardsToAnimate = [];
            if (playedCard.id && playedCard.id.startsWith('combo_') && playedCard.originalCards) {
                const comboCount = playedCard.originalCards.length;
                // Đối thủ đánh combo (2 lá giống, 3 lá giống, 5 lá khác nhau):
                // Các lá đè lên nhau nhưng cách nhau 40% bề rộng lá bài (0.4 * cardW) và thẳng hàng ngang (offsetY = 0)
                const stepX = cardW * 0.4;
                const totalSpan = (comboCount - 1) * stepX;
                const startX = -totalSpan / 2;

                cardsToAnimate = playedCard.originalCards.map((oc, i) => {
                    return {
                        card: oc,
                        targetOffsetX: Math.round(startX + i * stepX),
                        targetOffsetY: 0,
                        comboIndex: i,
                        isCombo: true
                    };
                });
            } else {
                cardsToAnimate = [{ card: playedCard, targetOffsetX, targetOffsetY, comboIndex: 0, isCombo: false }];
            }

            const targetLeft = discardPileRect.left + discardPileRect.width / 2 - (cardW * appScale) / 2;
            const targetTop = discardPileRect.top + discardPileRect.height / 2 - (cardH * appScale) / 2;
            const deltaX = (startRect.left + startRect.width / 2 - (targetLeft + (cardW * appScale) / 2)) / appScale;
            const deltaY = (startRect.top + startRect.height / 2 - (targetTop + (cardH * appScale) / 2)) / appScale;
            
            cardsToAnimate.forEach(cAnim => {
                const el = createDiscardCardElement({ card: cAnim.card, offsetX: cAnim.targetOffsetX, offsetY: cAnim.targetOffsetY });
                
                // Add glowing class if it's a combo
                if (cAnim.isCombo) {
                    el.classList.add('combo-card-glow');
                }
                
                el.style.position = 'fixed';
                el.style.left = targetLeft + 'px';
                el.style.top = targetTop + 'px';
                el.style.width = (cardW * appScale) + 'px';
                el.style.height = (cardH * appScale) + 'px';
                el.style.willChange = 'transform';
                el.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0) scale(0.4)`;
                el.style.zIndex = 1000 + data.stackLength * 10 + (cAnim.comboIndex || 0);
                el.style.transition = 'none';
                
                document.body.appendChild(el);
                
                requestAnimationFrame(() => {
                    el.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
                    el.style.transform = `translate3d(${cAnim.targetOffsetX}px, ${cAnim.targetOffsetY}px, 0) scale(1)`;
                });
                
                currentPendingCardsDOM.push({ el, item: { card: cAnim.card, offsetX: cAnim.targetOffsetX, offsetY: cAnim.targetOffsetY } });
            });
        });
    }
    
    updateStats();
});

socket.on('game_card_resolved', (data) => {
    if (!matchState.active) return;
    
    matchState.isWaitingNope = false;
    matchState.lastPendingPlayerSocketId = null;
    stopNopeTimer();
    if (typeof updatePlayButtonState === 'function') updatePlayButtonState();
    
    // Gắn lá bài vào UI discardPile chính thức
    if (currentPendingCardsDOM.length === 0 && data.stackResult && data.stackResult.length > 0) {
        // Fallback cho user vừa F5 (reconnect) và bỏ lỡ animation pending
        const rootStyles = getComputedStyle(document.documentElement);
        const cardW = parseInt(rootStyles.getPropertyValue('--card-width')) || 195;
        data.stackResult.forEach(item => {
            let actualCards = item.card.originalCards || [item.card];
            const isCombo = actualCards.length > 1;
            const stepX = isCombo ? (cardW * 0.4) : 0;
            const totalSpan = isCombo ? (actualCards.length - 1) * stepX : 0;
            const startX = isCombo ? -totalSpan / 2 : 0;

            actualCards.forEach((c, idx) => {
                const cardToRender = (c.id === 'clone' && c.clonedId) ? { ...c, id: c.clonedId } : c;
                const offsetX = isCombo ? Math.round(startX + idx * stepX) : (Math.random() - 0.5) * 20;
                const offsetY = isCombo ? 0 : (Math.random() - 0.5) * 20;
                const el = document.createElement('div');
                el.className = getCardClass('card', cardToRender);
                if (isCombo) el.classList.add('combo-card-glow');
                setupCardContent(el, cardToRender);
                el.style.position = 'absolute';
                el.style.left = '0px';
                el.style.top = '0px';
                el.style.marginLeft = '0px';
                el.style.marginTop = '0px';
                el.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
                discardPile.appendChild(el);
                
                discardedList.push({ card: c, offsetX, offsetY });
                if (discardedList.length > 300) discardedList.shift();
            });
        });
    } else {
        currentPendingCardsDOM.forEach(pendingObj => {
            const el = pendingObj.el;
            el.style.position = 'absolute';
            el.style.left = '0px';
            el.style.top = '0px';
            el.style.marginLeft = '0px';
            el.style.marginTop = '0px';
            el.style.transform = `translate(${pendingObj.item.offsetX}px, ${pendingObj.item.offsetY}px)`;
            discardPile.appendChild(el);
            
            discardedList.push(pendingObj.item);
            if (discardedList.length > 300) {
                discardedList.shift();
            }
        });
    }
    
    refreshDiscardPileZIndices();
    
    currentPendingCardsDOM = [];
    discardCount = data.discardPileCount;
    updateStats();
    
    // Âm thanh
    if (data.rootIsCancelled) {
        soundManager.playSfx('nope'); // Có thể mượn âm thanh khác nếu chưa có nope
    } else {
        // Thực thi hiệu ứng UI tùy loại bài nếu cần thiết ở Frontend
        if (data.rootCardId === 'xaobai') {
            soundManager.playSfx('shuffle');
            const deck = document.getElementById('centerDeck');
            if (deck) {
                isCeremonyPlaying = true;
                deck.classList.remove('deck-shuffling');
                void deck.offsetWidth; // Force reflow
                deck.classList.add('deck-shuffling');
                setTimeout(() => {
                    deck.classList.remove('deck-shuffling');
                    isCeremonyPlaying = false;
                }, 1500);
            }
        } else if (data.rootCardId === 'swap') {
            playSwapDeckAnimation();
        }
    }
});

function playSwapDeckAnimation() {
    const deck = document.getElementById('centerDeck');
    if (!deck) return;

    isCeremonyPlaying = true;
    try { soundManager.playSfx('card'); } catch(e) {}

    const appScale = window._appScale || 1;
    const rootStyles = getComputedStyle(document.documentElement);
    const cardW = parseInt(rootStyles.getPropertyValue('--card-width')) || 195;
    const cardH = parseInt(rootStyles.getPropertyValue('--card-height')) || 278;

    const deckRect = deck.getBoundingClientRect();
    const targetW = cardW * appScale;
    const targetH = cardH * appScale;
    const targetLeft = deckRect.left + deckRect.width / 2 - targetW / 2;
    const targetTop = deckRect.top + deckRect.height / 2 - targetH / 2;

    const cardTop = document.createElement('div');
    cardTop.className = 'card card-back-fly swap-anim-card-top';
    cardTop.style.position = 'fixed';
    cardTop.style.left = targetLeft + 'px';
    cardTop.style.top = targetTop + 'px';
    cardTop.style.width = targetW + 'px';
    cardTop.style.height = targetH + 'px';
    cardTop.style.backgroundImage = `url('${resolveAsset("assets/cards/matsau.jpg")}')`;
    cardTop.style.backgroundSize = 'cover';
    cardTop.style.backgroundPosition = 'center';
    cardTop.style.borderRadius = '10px';
    cardTop.style.pointerEvents = 'none';
    cardTop.style.willChange = 'transform';

    const cardBottom = document.createElement('div');
    cardBottom.className = 'card card-back-fly swap-anim-card-bottom';
    cardBottom.style.position = 'fixed';
    cardBottom.style.left = targetLeft + 'px';
    cardBottom.style.top = targetTop + 'px';
    cardBottom.style.width = targetW + 'px';
    cardBottom.style.height = targetH + 'px';
    cardBottom.style.backgroundImage = `url('${resolveAsset("assets/cards/matsau.jpg")}')`;
    cardBottom.style.backgroundSize = 'cover';
    cardBottom.style.backgroundPosition = 'center';
    cardBottom.style.borderRadius = '10px';
    cardBottom.style.pointerEvents = 'none';
    cardBottom.style.willChange = 'transform';

    deck.classList.add('swap-deck-pulse');
    document.body.appendChild(cardTop);
    document.body.appendChild(cardBottom);

    setTimeout(() => {
        deck.classList.remove('swap-deck-pulse');
        if (cardTop && cardTop.parentNode) cardTop.parentNode.removeChild(cardTop);
        if (cardBottom && cardBottom.parentNode) cardBottom.parentNode.removeChild(cardBottom);
        isCeremonyPlaying = false;
    }, 1150);
}

socket.on('game_deck_swapped', (data) => {
    if (!matchState.active) return;
    if (data && data.swapped) {
        playSwapDeckAnimation();
    }
    if (data && typeof data.drawPileCount === 'number') {
        remainingDeckCount = data.drawPileCount;
        updateStats();
    }
});

socket.on('game_turn_direction_changed', (data) => {
    if (!matchState.active) return;
    if (data && data.turnDirection !== undefined) {
        matchState.turnDirection = data.turnDirection;
        renderOpponentsMultiplayer();
    }
});

socket.on('game_card_discarded', ({ roomId: discardRoomId, card, playerSocketId, playerUid, username }) => {
    if (!matchState.active) return;
    if (discardRoomId && roomId && discardRoomId !== roomId) return;
    
    const isMe = isMeUid(playerUid) || (playerSocketId === socket.id) || isSelfUsername(username);

    // Cập nhật local hand nếu mình là người bị loại bỏ bài
    if (isMe && card) {
        lockCardActions(500);
        handCards = handCards.filter(c => c.uid !== card.uid);
        renderHand(false);
    } else {
        const oppPlayer = findPlayerInState(playerSocketId, playerUid, username);
        if (oppPlayer && oppPlayer.cardCount !== undefined && oppPlayer.cardCount > 0) {
            oppPlayer.cardCount--;
            renderOpponentsMultiplayer();
        }
    }
    
    // Tìm phần tử nguồn (từ mình hoặc đối thủ) để bay bài ra
    let startRect = null;
    if (isMe) {
        startRect = { left: window.innerWidth / 2 - 60, top: window.innerHeight - 180, width: 120, height: 170 };
    } else {
        const oppEl = findOpponentElement(playerSocketId, username, playerUid);
        if (oppEl) {
            const avatarCircle = oppEl.querySelector('.opponent-avatar-circle') || oppEl;
            startRect = avatarCircle.getBoundingClientRect();
        } else {
            startRect = { left: window.innerWidth / 2, top: -100, width: 50, height: 50 };
        }
    }
    
    const targetOffsetX = (Math.random() - 0.5) * 20;
    const targetOffsetY = (Math.random() - 0.5) * 20;
    
    animateCardToDiscard(card, targetOffsetX, targetOffsetY, startRect);
    soundManager.playSfx('card');
});




function applyTurnChanged(data) {
    if (!data) return;
    if (data.turnsRemaining !== undefined) updateTurnsRemainingBanner(data.turnsRemaining, data.currentTurnUsername);
    if (!matchState.active) return;
    matchState.currentTurnSocketId = data.currentTurnSocketId;
    matchState.turnsRemaining = data.turnsRemaining || 1;
    
    if (data.playersCardCounts && Array.isArray(data.playersCardCounts)) {
        syncAllPlayerCardCounts(data.playersCardCounts);
    }

    if (data.chestUpdates && Array.isArray(data.chestUpdates)) {
        let hasChestUpdate = false;
        data.chestUpdates.forEach(u => {
            const c = handCards.find(card => card.uid === u.uid);
            if (c) {
                c.chestPoints = u.chestPoints;
                hasChestUpdate = true;
            }
        });
        if (hasChestUpdate) {
            renderHand(false);
        }
    }

    // Nếu đang có vụ nổ thì không cập nhật ngay, đợi nổ xong sẽ update
    if (!matchState.isExploding) {
        updateTurnIndicator();
    }

    if (pendingTurnTimerData) {
        const timerData = pendingTurnTimerData;
        pendingTurnTimerData = null;
        if (timerData.currentTurnUsername) {
            updateTurnsRemainingBanner(matchState.turnsRemaining || 1, timerData.currentTurnUsername);
        }
        startClientTurnTimer(timerData.seconds || 20, timerData.currentTurnSocketId, timerData.currentTurnUsername);
    }
}

socket.on('game_turn_changed', (data) => {
    if (isDrawAnimationActive) {
        pendingTurnChangeData = data;
        return;
    }
    applyTurnChanged(data);
});

socket.on('game_turn_timer', (data) => {
    if (!matchState.active) return;
    if (isDrawAnimationActive) {
        pendingTurnTimerData = data;
        return;
    }
    if (data.currentTurnUsername) {
        updateTurnsRemainingBanner(matchState.turnsRemaining || 1, data.currentTurnUsername);
    }
    startClientTurnTimer(data.seconds || 20, data.currentTurnSocketId, data.currentTurnUsername);
});

socket.on('game_turn_timer_paused', (data) => {
    stopClientTurnTimer();
    if (data && data.message) {
        updateTurnsRemainingBanner(matchState.turnsRemaining || 1, null, data.message);
    } else if (data && data.targetUsername && data.requesterUsername) {
        updateTurnsRemainingBanner(matchState.turnsRemaining || 1, null, `Đang chờ <span class="toast-username">${data.targetUsername}</span> tặng bài...`);
    }
});

socket.on('game_close_modals', () => {
    closeAllTargetModals();
});

function syncAllPlayerCardCounts(serverPlayersCounts) {
    if (isCeremonyPlaying) return; // Không can thiệp trong lúc đang chia bài từ 0 lá
    if (!serverPlayersCounts || !Array.isArray(serverPlayersCounts) || !matchState || !matchState.players) return;
    
    let shouldReRenderOpponents = false;
    serverPlayersCounts.forEach(sp => {
        const p = findPlayerInState(sp.socketId, sp.uid, sp.username);
        if (p) {
            if (sp.cardCount !== undefined) p.cardCount = sp.cardCount;
            if (sp.alive !== undefined && p.alive !== sp.alive) {
                p.alive = sp.alive;
                shouldReRenderOpponents = true;
            }
            if (sp.isFrozen !== undefined && p.isFrozen !== sp.isFrozen) {
                p.isFrozen = sp.isFrozen;
                shouldReRenderOpponents = true;
                if (p.socketId === socket.id) {
                    matchState.isMeFrozen = p.isFrozen;
                    renderHand(false);
                }
            }
        }
    });

    if (shouldReRenderOpponents) {
        renderOpponentsMultiplayer();
    }
    
    // Cập nhật DOM của từng thẻ đối thủ trực tiếp theo thời gian thực
    const oppItems = document.querySelectorAll('.opponent-item');
    oppItems.forEach(el => {
        const uid = el.dataset.uid;
        const sid = el.dataset.id;
        const nameSpan = el.querySelector('.opponent-name');
        const name = nameSpan ? nameSpan.textContent.trim() : null;
        
        const p = findPlayerInState(sid, uid, name);
        if (p && isPlayerDead(p)) {
            const stack = el.querySelector('.opponent-cards-stack');
            if (stack) stack.remove();
        } else if (p && p.cardCount !== undefined) {
            const countSpan = el.querySelector('.opponent-card-count');
            if (countSpan) {
                const oldVal = parseInt(countSpan.textContent) || 0;
                if (oldVal !== p.cardCount) {
                    countSpan.textContent = p.cardCount;
                    countSpan.classList.remove('count-updated-pulse');
                    void countSpan.offsetWidth;
                    countSpan.classList.add('count-updated-pulse');
                }
            }
        }
    });
}

socket.on('game_card_counts_update', ({ roomId: rId, playersCardCounts }) => {
    const currentRoomId = (typeof matchState !== 'undefined' && matchState && matchState.roomId) ? matchState.roomId : roomId;
    if ((!rId || !currentRoomId || rId === currentRoomId) && Array.isArray(playersCardCounts)) {
        syncAllPlayerCardCounts(playersCardCounts);
    }
});

// Note: Đồng bộ số lượng bài đã chuyển sang cơ chế Server-Push tức thì theo thời gian thực

socket.on('game_turn_sync', (data) => {
    if (!matchState.active) return;
    matchState.currentTurnSocketId = data.currentTurnSocketId;
    if (data.turnsRemaining !== undefined) matchState.turnsRemaining = data.turnsRemaining;
    
    if (data.players && Array.isArray(data.players)) {
        syncAllPlayerCardCounts(data.players);
    } else if (data.playersCardCounts && Array.isArray(data.playersCardCounts)) {
        syncAllPlayerCardCounts(data.playersCardCounts);
    }
    
    if (!matchState.isExploding) {
        _syncTurnRing();
    }
});

// Nhận tin nhắn chat từ server - chỉ hiển thị tin nhắn thuộc phòng hiện tại (roomId)
socket.on('room_chat_msg', ({ sender, text, senderSocketId, senderUid, roomId: msgRoomId }) => {
    if (msgRoomId && roomId && msgRoomId !== roomId) return; // Bỏ qua tin nhắn từ phòng khác
    const isMe = (senderSocketId === socket.id || isMeUid(senderUid) || isSelfUsername(sender));
    const displayName = isMe ? 'Bạn' : sender;
    addChatMessage(displayName, text, true);

    // Kiểm tra nếu là tin nhắn sticker -> Hiện bong bóng sticker dưới avatar
    const matchSticker = String(text).trim().match(/^\[sticker:(\d+)\]$/);
    if (matchSticker) {
        const stickerNum = matchSticker[1];
        showAvatarSticker(senderSocketId, senderUid, sender, stickerNum);
    }
});

socket.on('room_chat_history', ({ roomId: rId, history }) => {
    if (rId === roomId && Array.isArray(history)) {
        if (chatMessagesContainer) chatMessagesContainer.innerHTML = '';
        try { sessionStorage.removeItem(getChatStorageKey()); } catch(e){}
        history.forEach(item => {
            const isMe = (item.senderSocketId === socket.id);
            const displayName = isMe ? 'Bạn' : item.sender;
            addChatMessage(displayName, item.text, true);
        });
    }
});

function findPlayerInState(socketId, uid = null, username = null) {
    if (!matchState || !matchState.players) return null;
    
    // Ưu tiên 1 (bắt buộc tuyệt đối): UID Firebase
    if (uid) {
        const found = matchState.players.find(p => p.uid === uid);
        if (found) return found;
    }

    // Ưu tiên 2: Nếu socketId truyền vào thực chất là UID Firebase
    if (socketId) {
        const foundByUid = matchState.players.find(p => p.uid === socketId);
        if (foundByUid) return foundByUid;
    }

    // Ưu tiên 3: Username
    if (username) {
        const found = matchState.players.find(p => p.username === username);
        if (found) return found;
    }

    // Ưu tiên 4: SocketId
    if (socketId) {
        const found = matchState.players.find(p => p.socketId === socketId);
        if (found) return found;
    }
    
    // Fallback: Check if parameters got mixed up
    return matchState.players.find(p => {
        if (uid && (p.socketId === uid || p.username === uid)) return true;
        if (username && (p.uid === username || p.socketId === username)) return true;
        if (socketId && (p.uid === socketId || p.username === socketId)) return true;
        return false;
    });
}

// Tập hợp lưu trữ danh sách người chơi đã hoàn tất hiệu ứng chết (chuyển sang die.png)
const deadPlayers = new Set();
// Tập hợp người chơi đang trong quá trình nổ hoạt ảnh (chưa đến sprite_20)
const currentlyExplodingPlayers = new Set();

function isPlayerDead(player) {
    if (!player) return false;
    // SINGLE SOURCE OF TRUTH: Chỉ khi nào hoạt ảnh nổ đã chạm mốc sprite_20 (hoặc đã chết từ ván trước) thì mới có trong deadPlayers
    return deadPlayers.has(player.uid) || deadPlayers.has(player.socketId) || deadPlayers.has(player.username);
}

function markPlayerDead(playerOrIdentifier) {
    if (!playerOrIdentifier) return;
    if (typeof playerOrIdentifier === 'string') {
        deadPlayers.add(playerOrIdentifier);
        const p = findPlayerInState(playerOrIdentifier, playerOrIdentifier, playerOrIdentifier);
        if (p) {
            if (p.uid) deadPlayers.add(p.uid);
            if (p.socketId) deadPlayers.add(p.socketId);
            if (p.username) deadPlayers.add(p.username);
            p.alive = false;
        }
    } else {
        if (playerOrIdentifier.uid) deadPlayers.add(playerOrIdentifier.uid);
        if (playerOrIdentifier.socketId) deadPlayers.add(playerOrIdentifier.socketId);
        if (playerOrIdentifier.username) deadPlayers.add(playerOrIdentifier.username);
        playerOrIdentifier.alive = false;
    }
}

function getOpponentIndex(socketId, username = null, uid = null) {
    const mySocketId = socket.id;
    const allPlayers = matchState.players;
    
    const p = findPlayerInState(socketId, uid, username);
    if (!p) return -1;
    
    const myIndex = allPlayers.findIndex(x => isMeUid(x.uid) || x.socketId === mySocketId);
    
    const opponents = [];
    if (myIndex !== -1) {
        for (let i = 1; i < allPlayers.length; i++) {
            const idx = (myIndex + i) % allPlayers.length;
            opponents.push(allPlayers[idx]);
        }
    } else {
        allPlayers.forEach(x => { if (!isMeUid(x.uid) && x.socketId !== mySocketId) opponents.push(x); });
    }
    return opponents.findIndex(x => (p.uid && x.uid === p.uid) || (p.username && x.username === p.username) || x.socketId === p.socketId);
}

function findOpponentElement(socketId, username = null, uid = null) {
    const p = findPlayerInState(socketId, uid, username);
    const targetUid = (p && p.uid) ? p.uid : (uid || (isMeUid(socketId) ? myUid : (socketId && String(socketId).startsWith('guest_') ? socketId : null)));
    const nameToSearch = p ? p.username : (username || null);
    
    let oppEl = null;
    // Ưu tiên 1 (bắt buộc tuyệt đối): UID Firebase
    if (targetUid) {
        oppEl = document.querySelector(`.opponents-top-bar .opponent-item[data-uid="${targetUid}"]`);
    }
    if (!oppEl && p && p.uid) {
        oppEl = document.querySelector(`.opponents-top-bar .opponent-item[data-uid="${p.uid}"]`);
    }
    if (!oppEl && uid) {
        oppEl = document.querySelector(`.opponents-top-bar .opponent-item[data-uid="${uid}"]`);
    }
    // Ưu tiên 2: Username
    if (!oppEl && nameToSearch) {
        const allOpps = document.querySelectorAll('.opponents-top-bar .opponent-item');
        oppEl = Array.from(allOpps).find(el => {
            const nameSpan = el.querySelector('.opponent-name');
            return nameSpan && nameSpan.textContent === nameToSearch;
        });
    }
    // Ưu tiên 3: SocketId
    if (!oppEl && p && p.socketId) {
        oppEl = document.querySelector(`.opponents-top-bar .opponent-item[data-id="${p.socketId}"]`);
    }
    if (!oppEl && socketId) {
        oppEl = document.querySelector(`.opponents-top-bar .opponent-item[data-id="${socketId}"]`);
    }
    return oppEl;
}

// Quản lý hiển thị sticker chat nổi dưới avatar người chơi (bảo toàn qua các lần re-render)
const activeStickerTimers = new Map();
const activeOpponentStickers = new Map(); // key -> { stickerNum, expiresAt }

function showAvatarSticker(senderSocketId, senderUid, senderUsername, stickerNum) {
    const isMe = (senderSocketId === socket.id || isMeUid(senderUid) || isSelfUsername(senderUsername));
    // Không cần hiện sticker trên bài mình nếu mình là người thả sticker
    if (isMe) return;

    const timerKey = senderUid || senderSocketId || senderUsername;
    if (!timerKey) return;

    // Nếu người đó spam click thì xóa timer cũ để reset 2s từ đầu và không cộng dồn
    if (activeStickerTimers.has(timerKey)) {
        clearTimeout(activeStickerTimers.get(timerKey));
        activeStickerTimers.delete(timerKey);
    }

    const expiresAt = Date.now() + 2000;
    activeOpponentStickers.set(timerKey, { stickerNum, expiresAt });

    const oppEl = findOpponentElement(senderSocketId, senderUsername, senderUid);
    if (oppEl) {
        const parentContainer = oppEl.querySelector('.opponent-avatar-circle') || oppEl;
        let bubbleEl = parentContainer.querySelector('.avatar-sticker-bubble');
        if (!bubbleEl) {
            bubbleEl = document.createElement('div');
            bubbleEl.className = 'avatar-sticker-bubble';
            bubbleEl.innerHTML = `
                <img class="avatar-sticker-bg" src="assets/UI/sticker_chat.svg" alt="Chat Bubble">
                <img class="avatar-sticker-img" src="" alt="Sticker">
            `;
            parentContainer.appendChild(bubbleEl);
        }

        const stickerImg = bubbleEl.querySelector('.avatar-sticker-img');
        if (stickerImg) {
            stickerImg.src = `assets/sticker/sticker${stickerNum}.png`;
        }

        // Hiệu ứng nảy nhẹ khi xuất hiện hoặc khi đổi sticker
        bubbleEl.classList.remove('sticker-bubble-pop');
        void bubbleEl.offsetWidth; // Trigger reflow
        bubbleEl.classList.add('sticker-bubble-pop');
    }

    // Sau đúng 2s tự động biến mất luôn (không có hiệu ứng mờ dần) nếu không còn click tiếp
    const timeoutId = setTimeout(() => {
        activeOpponentStickers.delete(timerKey);
        activeStickerTimers.delete(timerKey);
        const curOpp = findOpponentElement(senderSocketId, senderUsername, senderUid);
        if (curOpp) {
            const b = curOpp.querySelector('.avatar-sticker-bubble');
            if (b) b.remove();
        }
    }, 2000);

    activeStickerTimers.set(timerKey, timeoutId);
}

function updateTurnIndicator() {
    _syncTurnRing();
    if (isMyTurn) {
        soundManager.playSfx('card');
    }
}

function renderOpponentsMultiplayer() {
    const opponentsTopBar = document.getElementById('opponentsTopBar');
    if (!opponentsTopBar) return;
    
    const mySocketId = socket.id;
    const allPlayers = matchState.players || [];
    const myIndex = allPlayers.findIndex(p => p.socketId === mySocketId || isMeUid(p.uid));
    
    // Xếp đối thủ theo chiều kim đồng hồ: bắt đầu từ người ngồi ngay sau mình
    const opponents = [];
    if (myIndex !== -1) {
        for (let i = 1; i < allPlayers.length; i++) {
            const idx = (myIndex + i) % allPlayers.length;
            opponents.push(allPlayers[idx]);
        }
    } else {
        // Fallback nếu không tìm thấy mình
        allPlayers.forEach(p => { if (p.socketId !== mySocketId && !isMeUid(p.uid)) opponents.push(p); });
    }
    
    const arrowChar = (matchState.turnDirection === -1) ? '<' : '>';
    const existingItems = Array.from(opponentsTopBar.querySelectorAll('.opponent-item'));
    const existingArrows = Array.from(opponentsTopBar.querySelectorAll('.turn-direction-arrow'));
    const isSameStructure = existingItems.length === opponents.length &&
        (opponents.length <= 1 || existingArrows.length === opponents.length - 1) &&
        opponents.every((opp, idx) => {
            const el = existingItems[idx];
            return el && (el.dataset.id === opp.socketId || (opp.uid && el.dataset.uid === opp.uid));
        });

    if (isSameStructure) {
        // Cập nhật các mũi tên chiều lượt đi
        existingArrows.forEach(arr => {
            if (arr.textContent !== arrowChar) arr.textContent = arrowChar;
        });

        // Cập nhật DOM trực tiếp tại chỗ, không tạo lại toàn bộ DOM, tránh vỡ ảnh / giật lag!
        opponents.forEach((opp, idx) => {
            const item = existingItems[idx];
            item.dataset.id = opp.socketId;
            if (opp.uid) item.dataset.uid = opp.uid;
            const isDeadVisual = isPlayerDead(opp);
            
            if (isDeadVisual) {
                item.classList.add('player-dead');
            } else {
                item.classList.remove('player-dead');
            }
            
            const avatarCircle = item.querySelector('.opponent-avatar-circle');
            if (avatarCircle) {
                if (opp.socketId === matchState.currentTurnSocketId) {
                    avatarCircle.classList.add('active-turn');
                } else {
                    avatarCircle.classList.remove('active-turn');
                }
                
                // Cập nhật avatar nếu chuyển trạng thái sống/chết hoặc đổi avatar
                const currentImg = avatarCircle.querySelector('img:not(.avatar-sticker-bg):not(.avatar-sticker-img)');
                const desiredSrc = isDeadVisual ? 'assets/cards/die.png' : (opp.avatar || '');
                if (desiredSrc) {
                    if (!currentImg) {
                        const newImg = document.createElement('img');
                        newImg.src = desiredSrc;
                        newImg.style.cssText = isDeadVisual 
                            ? 'width:100%;height:100%;object-fit:cover;border-radius:50%;transform:scale(1.8);' 
                            : 'width:100%;height:100%;object-fit:cover;border-radius:50%;';
                        avatarCircle.prepend(newImg);
                    } else if (currentImg.getAttribute('src') !== desiredSrc) {
                        currentImg.src = desiredSrc;
                        currentImg.style.cssText = isDeadVisual 
                            ? 'width:100%;height:100%;object-fit:cover;border-radius:50%;transform:scale(1.8);' 
                            : 'width:100%;height:100%;object-fit:cover;border-radius:50%;';
                    }
                }
                
                // Frozen overlay
                let frozenEl = avatarCircle.querySelector('.frozen-avatar-overlay');
                if (opp.isFrozen && !frozenEl) {
                    frozenEl = document.createElement('div');
                    frozenEl.className = 'frozen-avatar-overlay';
                    avatarCircle.appendChild(frozenEl);
                } else if (!opp.isFrozen && frozenEl) {
                    frozenEl.remove();
                }
                
                // Card count
                let cardsStack = avatarCircle.querySelector('.opponent-cards-stack');
                const targetCount = typeof opp.cardCount === 'number' ? opp.cardCount : 0;
                if (isDeadVisual) {
                    if (cardsStack) cardsStack.remove();
                } else {
                    if (!cardsStack) {
                        cardsStack = document.createElement('div');
                        cardsStack.className = 'opponent-cards-stack';
                        cardsStack.innerHTML = `
                            <div class="card-layer card-layer-3"></div>
                            <div class="card-layer card-layer-2"></div>
                            <div class="card-layer card-layer-1 opponent-card-count">${targetCount}</div>
                        `;
                        avatarCircle.appendChild(cardsStack);
                    } else {
                        const countEl = cardsStack.querySelector('.opponent-card-count');
                        if (countEl && countEl.textContent !== String(targetCount)) {
                            countEl.textContent = targetCount;
                        }
                    }
                }
            }
            
            const nameEl = item.querySelector('.opponent-name');
            if (nameEl && nameEl.textContent !== opp.username) {
                nameEl.textContent = opp.username;
            }
        });
    } else {
        // Tái tạo lại chỉ khi danh sách người chơi thực sự thay đổi
        opponentsTopBar.innerHTML = '';
        opponents.forEach((opp, idx) => {
            const item = document.createElement('div');
            const isDeadVisual = isPlayerDead(opp);
            item.className = 'opponent-item' + (isDeadVisual ? ' player-dead' : '');
            item.dataset.id = opp.socketId;
            if (opp.uid) item.dataset.uid = opp.uid;
            
            let avatarSvg = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fffdeb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>';
            
            if (isDeadVisual) {
                avatarSvg = '<img src="assets/cards/die.png" style="width:100%;height:100%;object-fit:cover;border-radius:50%;transform:scale(1.8);">';
            } else if (opp.avatar) {
                avatarSvg = '<img src="' + opp.avatar + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">';
            }
            
            const activeClass = (opp.socketId === matchState.currentTurnSocketId) ? 'active-turn' : '';
            
            item.innerHTML = `
                <div class="opponent-avatar-circle ${activeClass}">
                    ${avatarSvg}
                    ${opp.isFrozen ? '<div class="frozen-avatar-overlay"></div>' : ''}
                    ${!isDeadVisual ? `
                    <div class="opponent-cards-stack">
                        <div class="card-layer card-layer-3"></div>
                        <div class="card-layer card-layer-2"></div>
                        <div class="card-layer card-layer-1 opponent-card-count">${typeof opp.cardCount === 'number' ? opp.cardCount : 0}</div>
                    </div>
                    ` : ''}
                </div>
                <div class="opponent-info">
                    <span class="opponent-name">${opp.username}</span>
                </div>
            `;

            // Tự động khôi phục bong bóng sticker nếu đối thủ này vẫn đang trong 2s hiển thị
            const stickerKey = opp.uid || opp.socketId || opp.username;
            const activeSticker = activeOpponentStickers.get(stickerKey);
            if (activeSticker && Date.now() < activeSticker.expiresAt) {
                const avatarCircle = item.querySelector('.opponent-avatar-circle') || item;
                const bubbleEl = document.createElement('div');
                bubbleEl.className = 'avatar-sticker-bubble';
                bubbleEl.innerHTML = `
                    <img class="avatar-sticker-bg" src="assets/UI/sticker_chat.svg" alt="Chat Bubble">
                    <img class="avatar-sticker-img" src="assets/sticker/sticker${activeSticker.stickerNum}.png" alt="Sticker">
                `;
                avatarCircle.appendChild(bubbleEl);
            }

            opponentsTopBar.appendChild(item);

            // Thêm mũi tên chỉ chiều lượt ở khoảng trống giữa các avatar
            if (idx < opponents.length - 1) {
                const arrowEl = document.createElement('div');
                arrowEl.className = 'turn-direction-arrow';
                arrowEl.textContent = arrowChar;
                opponentsTopBar.appendChild(arrowEl);
            }
        });
    }
    
    // Luôn cập nhật lại vòng tròn lượt đi sau mỗi lần render để không bao giờ bị mất
    _syncTurnRing();
}

// Hàm nội bộ chỉ đồng bộ vòng tròn xanh lượt đi, không phát âm thanh
function _syncTurnRing() {
    const mySocketId = socket.id;
    const curTurn = matchState.currentTurnSocketId;
    const curPlayer = curTurn ? findPlayerInState(curTurn) : null;
    const isMe = (curTurn === mySocketId || (curPlayer && (curPlayer.socketId === mySocketId || isMeUid(curPlayer.uid))));
    isMyTurn = isMe;
    
    const avatarCircles = document.querySelectorAll('.opponent-avatar-circle');
    avatarCircles.forEach(el => el.classList.remove('active-turn'));
    
    const handWrap = document.querySelector('.hand-wrapper');
    if (isMyTurn) {
        if (handWrap) handWrap.classList.add('my-turn-active');
    } else {
        if (handWrap) handWrap.classList.remove('my-turn-active');
        const oppEl = findOpponentElement(curTurn, curPlayer ? curPlayer.username : null, curPlayer ? curPlayer.uid : null);
        if (oppEl) {
            const avatar = oppEl.querySelector('.opponent-avatar-circle');
            if (avatar) avatar.classList.add('active-turn');
        }
    }
    updatePlayButtonState();
}

function animateCardFlyToOpponent(socketIdOrUid, sourceRect = null, username = null, uid = null) {
    soundManager.playSfx('card');
    const deckElem = document.getElementById('deckStackElem') || centerDeck;
    let startRect = sourceRect; if (!startRect) startRect = deckElem.getBoundingClientRect();
    
    const oppEl = findOpponentElement(socketIdOrUid, username, uid);
    if (!oppEl) return;
    const avatarCircle = oppEl.querySelector('.opponent-avatar-circle') || oppEl;
    const targetRect = avatarCircle.getBoundingClientRect();

    const bodyRect = document.body.getBoundingClientRect();
    const appScale = window._appScale || 1;

    const initialLeft = (startRect.left - bodyRect.left) / appScale;
    const initialTop = (startRect.top - bodyRect.top) / appScale;
    const cardW = (startRect.width || 195) / appScale;
    const cardH = (startRect.height || 278) / appScale;

    const targetX = ((targetRect.left - bodyRect.left) + (targetRect.width / 2)) / appScale - (cardW / 2);
    const targetY = ((targetRect.top - bodyRect.top) + (targetRect.height / 2)) / appScale - (cardH / 2);
    const deltaX = targetX - initialLeft;
    const deltaY = targetY - initialTop;

    const flyCard = document.createElement('div');
    flyCard.className = 'card';
    flyCard.style.position = 'absolute';
    flyCard.style.left = `${initialLeft}px`;
    flyCard.style.top = `${initialTop}px`;
    flyCard.style.width = `${cardW}px`;
    flyCard.style.height = `${cardH}px`;
    
    flyCard.style.transformOrigin = 'center center';
    flyCard.style.backgroundImage = `url('${resolveAsset("assets/cards/matsau.jpg")}')`;
    flyCard.style.backgroundSize = 'cover';
    flyCard.style.backgroundPosition = 'center';
    flyCard.style.border = '2px solid #ffffff';
    flyCard.style.borderRadius = '12px';
    flyCard.style.boxShadow = '0 10px 25px rgba(0,0,0,0.5)';
    flyCard.style.zIndex = '9999';
    flyCard.style.pointerEvents = 'none';
    flyCard.style.willChange = 'transform, opacity';
    flyCard.style.transform = 'translate3d(0, 0, 0) scale(1) rotate(0deg)';
    flyCard.style.opacity = '1';
    flyCard.style.imageRendering = '-webkit-optimize-contrast';
    document.body.appendChild(flyCard);

    const rot = (Math.random() * 40 - 20);

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            // Hoạt ảnh bay 100% GPU composited mượt mà, tốc độ tự nhiên dễ nhìn (0.5s)
            flyCard.style.transition = 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.5s ease';
            flyCard.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0) scale(0.35) rotate(${rot}deg)`;
            flyCard.style.opacity = '0.1';

            setTimeout(() => {
                if (flyCard.parentNode) flyCard.remove();
            }, 500);
        });
    });
}

function animateCardToDiscard(playedCard, targetOffsetX, targetOffsetY, startRect) {
    const newItem = {
        card: playedCard,
        offsetX: targetOffsetX,
        offsetY: targetOffsetY
    };
    discardedList.push(newItem);
    if (discardedList.length > 300) {
        discardedList.shift();
    }
    
    discardCount++;

    const el = createDiscardCardElement(newItem);
    el.style.willChange = 'transform';
    el.style.zIndex = '99999'; // Trong lúc bay luôn nổi trên đỉnh
    
    if (startRect) {
        const discardRect = discardPile.getBoundingClientRect();
        const appScale = window._appScale || 1;
        
        const startCenterX = startRect.left + startRect.width / 2;
        const startCenterY = startRect.top + startRect.height / 2;
        
        const discardCenterX = discardRect.left + discardRect.width / 2;
        const discardCenterY = discardRect.top + discardRect.height / 2;
        
        // Delta from center to center in 1920x1080 canvas pixels
        const startX = (startCenterX - discardCenterX) / appScale;
        const startY = (startCenterY - discardCenterY) / appScale;
        
        el.style.transform = `translate3d(${startX}px, ${startY}px, 0)`;
        el.style.transition = 'none';
    } else {
        el.style.transform = 'translate3d(0px, -200px, 0)'; // Fallback: drop from above if no rect
        el.style.transition = 'none';
    }
    
    discardPile.appendChild(el);
    if (discardPile.children.length > 300) { discardPile.firstElementChild.remove(); }
    
    // Ép reflow để trình duyệt tính toán toạ độ startX, startY trước khi kích hoạt transition
    void el.offsetWidth;
    
    requestAnimationFrame(() => { 
        requestAnimationFrame(() => {
            el.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)'; 
            el.style.transform = `translate3d(${targetOffsetX}px, ${targetOffsetY}px, 0)`; 
            setTimeout(() => { 
                if (el) { 
                    el.style.transition = 'none'; 
                    el.style.willChange = 'auto';
                    refreshDiscardPileZIndices(); 
                } 
            }, 500); 
        });
    }); 
    return el;
}

        // --- REAL-TIME VOICE CHAT WEBRTC MESH & NOISE SUPPRESSION ---
        let localAudioStream = null;
        const peerConnections = {};
        const iceCandidateQueues = {}; // Queue candidate trước khi setRemoteDescription
        const rtcConfig = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' }
            ]
        };

        // --- UNIFIED VOICE ENGINE INTEGRATION ---
        const btnToggleMic = document.getElementById('btnToggleMic');
        if (btnToggleMic) {
            btnToggleMic.addEventListener('click', () => {
                if (window.VoiceEngine) window.VoiceEngine.toggleMic();
            });
        }

        const btnToggleSpeaker = document.getElementById('btnToggleSpeaker');
        if (btnToggleSpeaker) {
            btnToggleSpeaker.addEventListener('click', () => {
                if (window.VoiceEngine) window.VoiceEngine.toggleSpeaker();
            });
        }

        
















/* ========================================================
   EXPLODING KITTEN LOGIC
   ======================================================== */
const defuseModal = document.getElementById('defuseModal');
const defuseSlider = document.getElementById('defuseSlider');
const defuseSliderValue = document.getElementById('defuseSliderValue');
const btnSubmitDefuse = document.getElementById('btnSubmitDefuse');
const explosionOverlay = document.getElementById('explosionOverlay');
const gameOverOverlay = document.getElementById('gameOverOverlay');
const winnerName = document.getElementById('winnerName');

let currentDefusingKitten = null;
let explosionInterval = null;

if (defuseSlider) {
    defuseSlider.addEventListener('input', (e) => {
        const max = parseInt(defuseSlider.max) || 1;
        const val = parseInt(e.target.value) || 0;
        const posLabel = document.getElementById('defusePosLabel');
        if (posLabel) {
            const indexFromTop = max - val + 1;
            posLabel.textContent = 'Lá mèo nổ: Lá ' + indexFromTop;
        }
    });
}

const btnDefuseLeft = document.getElementById('btnDefuseLeft');
const btnDefuseRight = document.getElementById('btnDefuseRight');
if (btnDefuseLeft && defuseSlider) {
    btnDefuseLeft.addEventListener('click', () => {
        let val = parseInt(defuseSlider.value) || 0;
        if (val > 0) {
            defuseSlider.value = val - 1;
            defuseSlider.dispatchEvent(new Event('input'));
        }
    });
}
if (btnDefuseRight && defuseSlider) {
    btnDefuseRight.addEventListener('click', () => {
        let val = parseInt(defuseSlider.value) || 0;
        let max = parseInt(defuseSlider.max) || 0;
        if (val < max) {
            defuseSlider.value = val + 1;
            defuseSlider.dispatchEvent(new Event('input'));
        }
    });
}

// Xử lý vuốt trực tiếp trên thanh gài bom dành cho thiết bị di động
const defuseVertContainer = document.querySelector('.defuse-slider-vert-container');
if (defuseVertContainer && defuseSlider) {
    const handleTouchSlider = (e) => {
        if (!e.touches || !e.touches[0]) return;
        const rect = defuseVertContainer.getBoundingClientRect();
        const touchY = e.touches[0].clientY;
        const ratio = 1 - Math.min(Math.max((touchY - rect.top) / rect.height, 0), 1);
        const min = parseInt(defuseSlider.min) || 0;
        const max = parseInt(defuseSlider.max) || 10;
        const val = Math.round(min + ratio * (max - min));
        if (parseInt(defuseSlider.value) !== val) {
            defuseSlider.value = val;
            defuseSlider.dispatchEvent(new Event('input'));
        }
    };
    defuseVertContainer.addEventListener('touchstart', handleTouchSlider, { passive: true });
    defuseVertContainer.addEventListener('touchmove', (e) => {
        handleTouchSlider(e);
    }, { passive: true });
}

if (btnSubmitDefuse) {
    btnSubmitDefuse.addEventListener('click', () => {
        const index = defuseSlider.value;
        socket.emit('game_place_kitten', {
            roomId: matchState.roomId,
            index: index,
            kittenCard: currentDefusingKitten
        });
        defuseModal.classList.add('hidden');
        showGameToast('ĐÃ GÀI BOM', '<span class="toast-username">Bạn</span> đã giấu bom vào vị trí thứ ' + index + ' từ dưới lên.', 'warning');
    });
}

// Khi server báo 1 ai đó vừa bốc phải bom và có Defuse
socket.on('game_defusing', ({ playerSocketId, playerUid, username, kittenCard, defuseCard, drawPileCount }) => {
    const p = findPlayerInState(playerSocketId, playerUid, username);
    const isMe = isMeUid(playerUid) || (playerSocketId === socket.id) || isSelfUsername(username);
    const displayName = isMe ? 'BẠN' : (p ? p.username : (username || 'Ai đó'));
    remainingDeckCount = drawPileCount;
    updateStats();
    
    matchState.favorPickMode = false;
    const handWrapper = document.querySelector('.hand-wrapper');
    if (handWrapper) handWrapper.classList.remove('favor-hand-glow');
    removeGameToast('favor-waiting-toast');
    if (favorSelectModal) favorSelectModal.classList.remove('show');
    
    // Khóa toàn bộ tương tác trong toàn bộ thời gian diễn ra hiệu ứng (0.5s rút + 0.5s bom + 0.5s defuse = 1.6s)
    lockCardActions(1600);

    const deckElem = document.getElementById('deckStackElem') || document.getElementById('centerDeck');
    const startRect = deckElem ? deckElem.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 195, height: 278 };

    // BƯỚC 1: Đợi hoạt ảnh rút bài từ chồng bài bay về tay/avatar hoàn tất (đúng 0.5s = 500ms)
    setTimeout(() => {
        // BƯỚC 2: Hệ thống tự động đánh lá BOM từ tay/avatar xuống bàn (0.5s)
        let bombStartRect = null;
        if (isMe) {
            const bombEl = document.querySelector(`.hand-container .card[data-uid="${kittenCard.uid}"]`)
                || document.querySelector('.hand-container .card.card-exploding_kitten')
                || (handContainer ? handContainer.lastElementChild : null);
            if (bombEl) {
                bombStartRect = bombEl.getBoundingClientRect();
            } else if (handContainer) {
                bombStartRect = handContainer.getBoundingClientRect();
            }
            // Xóa lá bom khỏi tay sau khi đã lấy vị trí xuất phát
            handCards = handCards.filter(c => (kittenCard.uid ? c.uid !== kittenCard.uid : c.id !== 'exploding_kitten'));
            renderHand(false);
        } else {
            const oppEl = findOpponentElement(playerSocketId, p ? p.username : displayName, playerUid || (p ? p.uid : null));
            const avatarCircle = oppEl ? (oppEl.querySelector('.opponent-avatar-circle') || oppEl) : null;
            bombStartRect = avatarCircle ? avatarCircle.getBoundingClientRect() : null;
        }

        animateCardToDiscard(kittenCard, 0, 0, bombStartRect || startRect);
        soundManager.playSfx('exploding_kitten');
        showGameToast('NGUY HIỂM!', '<span class="toast-username">' + displayName + '</span> vừa bốc phải MÈO NỔ!', 'danger');
        
        // BƯỚC 3: Sau khi lá bom đánh xuống xong (0.5s = 500ms sau khi bom bay), lá DEFUSE đánh tiếp xuống (0.5s)
        setTimeout(() => {
            let defuseStartRect = null;
            if (isMe) {
                const defuseEl = document.querySelector(`.hand-container .card[data-uid="${defuseCard.uid}"]`)
                    || document.querySelector('.hand-container .card.defuse')
                    || document.querySelector('.hand-container .defuse');
                if (defuseEl) {
                    defuseStartRect = defuseEl.getBoundingClientRect();
                } else if (handContainer) {
                    defuseStartRect = handContainer.getBoundingClientRect();
                }
                // Xóa lá defuse khỏi tay
                handCards = handCards.filter(c => (defuseCard.uid ? c.uid !== defuseCard.uid : c.id !== 'defuse'));
                renderHand(false);
            } else {
                const oppEl = findOpponentElement(playerSocketId, p ? p.username : displayName, playerUid || (p ? p.uid : null));
                const avatarCircle = oppEl ? (oppEl.querySelector('.opponent-avatar-circle') || oppEl) : null;
                defuseStartRect = avatarCircle ? avatarCircle.getBoundingClientRect() : null;
                
                // Cập nhật số bài của đối thủ (-1 defuse)
                const opp = findPlayerInState(playerSocketId, playerUid, displayName);
                if (opp) {
                    opp.cardCount = Math.max(0, (opp.cardCount !== undefined ? opp.cardCount : (opp.hand?.length || 0)) - 1);
                    renderOpponentsMultiplayer();
                }
            }

            const defuseEl = animateCardToDiscard(defuseCard, Math.random() * 20 - 10, Math.random() * 20 - 10, defuseStartRect || startRect);
            if (defuseEl) {
                defuseEl.classList.add('defuse-glowing');
                setTimeout(() => { defuseEl.classList.remove('defuse-glowing'); }, 850);
            }
            soundManager.playSfx('defuse');
            showGameToast('AN TOÀN', '<span class="toast-username">' + displayName + '</span> đã dùng Defuse để gỡ bom!', 'success');
        }, 500);
    }, 500);
});

socket.on('game_defuse_prompt', ({ kittenCard, maxIndex, immediate }) => {
    // Tắt banner "Đến lượt A rút bài" ngay lập tức để không bị đè
    const turnsBanner = document.getElementById('turnsRemainingBanner');
    if (turnsBanner) turnsBanner.classList.add('hidden');

    currentDefusingKitten = kittenCard;
    const deckCountEl = document.getElementById('defuseDeckCount');
    if (deckCountEl) deckCountEl.textContent = maxIndex;
    
    if (defuseSlider) {
        defuseSlider.max = maxIndex;
        defuseSlider.value = maxIndex; // Mặc định ở trên cùng
        
        const posLabel = document.getElementById('defusePosLabel');
        if (posLabel) posLabel.textContent = 'Lá mèo nổ: Lá 1';
    }
    
    const showModal = () => {
        if (defuseModal) defuseModal.classList.remove('hidden');
    };
    
    if (immediate) {
        showModal();
    } else {
        setTimeout(showModal, 1600); // 500ms rút + 500ms bom + 500ms defuse + 100ms
    }
});

const defuseWaitBanner = document.getElementById('defuseWaitBanner');
const defuseWaitName = document.getElementById('defuseWaitName');

socket.on('game_defuse_wait', ({ username, immediate }) => {
    // Tắt banner "Đến lượt A rút bài" ngay lập tức để không bị đè
    const turnsBanner = document.getElementById('turnsRemainingBanner');
    if (turnsBanner) turnsBanner.classList.add('hidden');

    if (defuseWaitName) {
        defuseWaitName.textContent = username;
        defuseWaitName.className = isSelfUsername(username) ? 'toast-username-self' : 'toast-username-opponent';
    }
    const showBanner = () => {
        if (defuseWaitBanner) defuseWaitBanner.classList.remove('hidden');
    };
    if (immediate) {
        showBanner();
    } else {
        setTimeout(showBanner, 1600); // Đợi diễn xong hoạt ảnh bom (0.5s) & gỡ bom (0.5s)
    }
});

socket.on('game_kitten_placed', ({ drawPileCount }) => {
    remainingDeckCount = drawPileCount;
    updateStats();
    if (defuseWaitBanner) defuseWaitBanner.classList.add('hidden');
    
    // Xóa lá exploding_kitten cuối cùng khỏi chồng bài đã đánh
    const ekIdx = discardedList.findLastIndex(item => item.card && item.card.id === 'exploding_kitten');
    if (ekIdx !== -1) {
        discardedList.splice(ekIdx, 1);
    }
    // Render lại discard pile để xóa lá EK khỏi giao diện
    renderDiscardPile();
    
    // Ép render lại danh sách đối thủ để đảm bảo DOM mới nhất sau sự kiện gỡ bom
    renderOpponentsMultiplayer();
    setTimeout(() => {
        _syncTurnRing();
    }, 100);
    setTimeout(() => {
        _syncTurnRing();
    }, 500);
    
    // Hoạt ảnh lá bom bay từ chồng bài đã đánh về chồng bài rút
    const discardPileEl = document.getElementById('discardPile');
    const centerDeckEl = document.getElementById('centerDeck');
    if (discardPileEl && centerDeckEl) {
        const startRect = discardPileEl.getBoundingClientRect();
        const endRect = centerDeckEl.getBoundingClientRect();
        
        const cardW = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--card-width')) || 195;
        const cardH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--card-height')) || 278;
        
        const flyCard = document.createElement('div');
        const kittenObj = currentDefusingKitten || { id: 'exploding_kitten', artIndex: 1 };
        flyCard.className = getCardClass('card', kittenObj);
        setupCardContent(flyCard, kittenObj);
        
        flyCard.style.position = 'fixed';
        flyCard.style.left = (startRect.left + startRect.width / 2 - cardW / 2) + 'px';
        flyCard.style.top = (startRect.top + startRect.height / 2 - cardH / 2) + 'px';
        flyCard.style.width = cardW + 'px';
        flyCard.style.height = cardH + 'px';
        flyCard.style.borderRadius = window.innerWidth <= 1024 ? '4px' : '12px';
        flyCard.style.boxShadow = '0 8px 24px rgba(0,0,0,0.5)';
        flyCard.style.zIndex = '9999';
        
        // Default to opacity 0 until flip starts if needed, but here we just append
        document.body.appendChild(flyCard);
        
        flyCard.offsetHeight; // force reflow
        
        setTimeout(() => {
            requestAnimationFrame(() => {
                // Step 1: Flip card halfway
                flyCard.style.transition = 'transform 0.2s ease-in';
                flyCard.style.transform = 'rotateY(90deg)';
            
            setTimeout(() => {
                // Instantly flip to -90deg and change texture
                flyCard.style.transition = 'none';
                flyCard.style.transform = 'rotateY(-90deg)';
                flyCard.style.backgroundImage = ''; // Clear inline background
                flyCard.className = 'card ceremony-card face-down';
                flyCard.style.backfaceVisibility = 'visible';
                flyCard.innerHTML = ''; // clear kitten content
                
                // Force reflow
                flyCard.offsetHeight;
                
                // Step 2: Complete flip to 0deg
                flyCard.style.transition = 'transform 0.2s ease-out';
                flyCard.style.transform = 'rotateY(0deg)';
                
                setTimeout(() => {
                    // Step 3: Fly to deck
                    flyCard.style.transition = 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
                    flyCard.style.left = (endRect.left + endRect.width / 2 - cardW / 2) + 'px';
                    flyCard.style.top = (endRect.top + endRect.height / 2 - cardH / 2) + 'px';
                    flyCard.style.opacity = '0.3';
                    
                    setTimeout(() => {
                        flyCard.remove();
                    }, 500);
                }, 300); // Wait for flip to complete + a tiny pause
            }, 200);
        });
        }, 50); // Wait for reflow before triggering flip animation
    }
});

// Xử lý sự kiện rút phải lá ATOMIC BOM (Chuỗi hoạt ảnh: Rút về tay -> Thả xuống bàn 0.5s -> Rung lắc phát sáng đỏ 1s -> Phát nổ 3 người)
socket.on('game_atomic_bom_drawn', ({ roomId, drawerSocketId, drawerUsername, drawerUid, bombCard, affectedPlayers, drawPileCount }) => {
    if (!matchState.active) return;
    
    matchState.isExploding = true;
    remainingDeckCount = drawPileCount;
    updateStats();

    // Bước 0: Bảo vệ avatar tròn của tất cả người bị nổ, không cho chuyển die.png sớm
    if (Array.isArray(affectedPlayers)) {
        affectedPlayers.forEach(pInfo => {
            if (!pInfo.defused) {
                if (pInfo.socketId) {
                    currentlyExplodingPlayers.add(pInfo.socketId);
                    deadPlayers.delete(pInfo.socketId);
                }
                if (pInfo.uid) {
                    currentlyExplodingPlayers.add(pInfo.uid);
                    deadPlayers.delete(pInfo.uid);
                }
                if (pInfo.username) {
                    currentlyExplodingPlayers.add(pInfo.username);
                    deadPlayers.delete(pInfo.username);
                }
            }
        });
    }

    if (matchState._explodingSafetyTimer) clearTimeout(matchState._explodingSafetyTimer);
    matchState._explodingSafetyTimer = setTimeout(() => {
        matchState.isExploding = false;
    }, 7000);

    const isDrawer = isMeUid(drawerUid) || (drawerSocketId === socket.id) || isSelfUsername(drawerUsername);
    if (isDrawer) {
        lockCardActions(1500);
    }

    // Bước 1: Đợi bốc bài lên tay/avatar hoàn tất (500ms)
    setTimeout(() => {
        // Tìm vị trí duy nhất của người bốc (drawer)
        let drawerRect = null;
        if (isDrawer) {
            const bombEl = document.querySelector(`.hand-container .card[data-uid="${bombCard.uid}"]`)
                || document.querySelector('.hand-container .card.card-atomicbom')
                || (handContainer ? handContainer.lastElementChild : null);
            if (bombEl) drawerRect = bombEl.getBoundingClientRect();
            else if (handContainer) drawerRect = handContainer.getBoundingClientRect();
            handCards = handCards.filter(c => c.uid !== bombCard.uid);
            renderHand(false);
        } else {
            const oppEl = findOpponentElement(drawerSocketId, drawerUsername, drawerUid);
            const avatarCircle = oppEl ? (oppEl.querySelector('.opponent-avatar-circle') || oppEl) : null;
            if (avatarCircle) drawerRect = avatarCircle.getBoundingClientRect();
        }

        // Bước 2: Hệ thống TỰ ĐỘNG ĐÁNH lá Atomic Bom từ DUY NHẤT người bốc xuống bàn (tốc độ 0.5s)
        const atomicEl = animateCardToDiscard(bombCard, 0, 0, drawerRect);
        soundManager.playSfx('exploding_kitten');
        showGameToast('ATOMIC BOM!', '<span class="toast-username">' + drawerUsername + '</span> đã bốc phải ATOMIC BOM!', 'danger');

        // Bước 3: Bài đánh xuống xong (500ms) + nghỉ 500ms (tổng 1000ms)
        setTimeout(() => {
            // Bước 4: Lá Atomic Bom trên bàn RUNG LẮC & PHÁT SÁNG ĐỎ TO GẤP 3 LẦN trong ĐÚNG 1.0 giây
            if (atomicEl) atomicEl.classList.add('atomic-charging');
            try { soundManager.playSfx('ting'); } catch(e){}

            // Bước 5: CHỈ SAU KHI HẾT 1.0 GIÂY RUNG LẮC PHÁT SÁNG ĐỎ -> MỚI NỔ CẢ 3 NGƯỜI
            setTimeout(() => {
                if (atomicEl) atomicEl.classList.remove('atomic-charging');

                affectedPlayers.forEach(pInfo => {
                    const isMe = isMeUid(pInfo.uid) || (pInfo.socketId === socket.id) || isSelfUsername(pInfo.username);
                    if (pInfo.defused) {
                        // Người này có Defuse -> Thả lá Defuse phát sáng xanh
                        let playerRect = null;
                        if (isMe) {
                            const defuseEl = document.querySelector(`.hand-container .card[data-uid="${pInfo.defuseCard.uid}"]`)
                                || document.querySelector('.hand-container .card.defuse')
                                || document.querySelector('.hand-container .defuse');
                            if (defuseEl) playerRect = defuseEl.getBoundingClientRect();
                            else if (handContainer) playerRect = handContainer.getBoundingClientRect();
                            handCards = handCards.filter(c => c.uid !== pInfo.defuseCard.uid);
                            renderHand(false);
                        } else {
                            const oppEl = findOpponentElement(pInfo.socketId, pInfo.username, pInfo.uid);
                            const avatarCircle = oppEl ? (oppEl.querySelector('.opponent-avatar-circle') || oppEl) : null;
                            if (avatarCircle) playerRect = avatarCircle.getBoundingClientRect();
                            const opp = findPlayerInState(pInfo.socketId, pInfo.uid, pInfo.username);
                            if (opp) {
                                opp.cardCount = Math.max(0, (opp.cardCount !== undefined ? opp.cardCount : (opp.hand?.length || 0)) - 1);
                                renderOpponentsMultiplayer();
                            }
                        }

                        const defuseEl = animateCardToDiscard(pInfo.defuseCard, Math.random() * 20 - 10, Math.random() * 20 - 10, playerRect);
                        if (defuseEl) {
                            defuseEl.classList.add('defuse-glowing');
                            setTimeout(() => { defuseEl.classList.remove('defuse-glowing'); }, 850);
                        }
                        soundManager.playSfx('defuse');
                        showGameToast('AN TOÀN', '<span class="toast-username">' + pInfo.username + '</span> đã gỡ bom Atomic thành công!', 'success');
                    } else {
                        // Người này bị nổ -> Chạy hiệu ứng nổ sprite 1-70
                        try { soundManager.playSfx('explosion'); } catch(e){}
                        
                        const getExplosionSpriteUrl = (frame) => {
                            const raw = `cards/exploding_kitten/sprite_${frame}.png`;
                            return (typeof window.getPreloadedAssetUrl === 'function') 
                                ? window.getPreloadedAssetUrl(raw) 
                                : ((window.parent && typeof window.parent.getPreloadedAssetUrl === 'function') 
                                    ? window.parent.getPreloadedAssetUrl(raw) 
                                    : raw);
                        };

                        const deadPlayer = findPlayerInState(pInfo.socketId, pInfo.uid, pInfo.username);
                        if (deadPlayer) deadPlayer.alive = false;
                        
                        if (isMe) {
                            if (explosionOverlay) {
                                explosionOverlay.classList.remove('hidden');
                                let frame = 1;
                                if (explosionInterval) clearInterval(explosionInterval);
                                explosionInterval = setInterval(() => {
                                    explosionOverlay.style.backgroundImage = `url('${getExplosionSpriteUrl(frame)}')`;
                                    
                                    // Đúng vào lúc sprite_4 của hoạt ảnh nổ -> Chuyển sang trạng thái chết
                                    if (frame === 4) {
                                        if (pInfo.socketId) currentlyExplodingPlayers.delete(pInfo.socketId);
                                        if (pInfo.uid) currentlyExplodingPlayers.delete(pInfo.uid);
                                        if (pInfo.username) currentlyExplodingPlayers.delete(pInfo.username);
                                        document.body.classList.add('hand-dead');
                                        markPlayerDead(pInfo);
                                    }

                                    frame++;
                                    if (frame > 70) {
                                        clearInterval(explosionInterval);
                                        explosionOverlay.style.backgroundImage = 'none';
                                        explosionOverlay.classList.add('hidden');
                                        if (pInfo.socketId) currentlyExplodingPlayers.delete(pInfo.socketId);
                                        if (pInfo.uid) currentlyExplodingPlayers.delete(pInfo.uid);
                                        if (pInfo.username) currentlyExplodingPlayers.delete(pInfo.username);
                                        markPlayerDead(pInfo);
                                        matchState.isExploding = false;
                                        if (matchState._explodingSafetyTimer) clearTimeout(matchState._explodingSafetyTimer);
                                        updateTurnIndicator();
                                    }
                                }, 1000 / 40);
                            }
                            showGameToast('BÙM!!!', '<span class="toast-username">BẠN</span> ĐÃ BỊ NỔ CHẾT!', 'danger');
                        } else {
                            let oppEl = findOpponentElement(pInfo.socketId, pInfo.username, pInfo.uid);
                            if (oppEl) {
                                const avatarImg = oppEl.querySelector('.opponent-avatar-circle') || oppEl;
                                const rect = avatarImg.getBoundingClientRect();
                                const circle = oppEl.querySelector('.opponent-avatar-circle');

                                const expDiv = document.createElement('div');
                                expDiv.className = 'avatar-explosion';
                                expDiv.style.position = 'fixed';
                                expDiv.style.left = (rect.left + rect.width / 2) + 'px';
                                expDiv.style.top = (rect.top + rect.height / 2) + 'px';
                                expDiv.style.transform = 'translate(-50%, -55%)';
                                expDiv.style.width = '280px';
                                expDiv.style.height = '280px';
                                expDiv.style.backgroundSize = 'contain';
                                expDiv.style.backgroundPosition = 'center';
                                expDiv.style.backgroundRepeat = 'no-repeat';
                                expDiv.style.zIndex = '999999';
                                expDiv.style.pointerEvents = 'none';
                                document.body.appendChild(expDiv);

                                let frame = 1;
                                let intv = setInterval(() => {
                                    expDiv.style.backgroundImage = `url('${getExplosionSpriteUrl(frame)}')`;
                                    
                                    // Chuyển sang ảnh die.png đúng vào lúc sprite_4 của hoạt ảnh nổ
                                    if (frame === 4) {
                                        if (pInfo.socketId) { currentlyExplodingPlayers.delete(pInfo.socketId); deadPlayers.add(pInfo.socketId); }
                                        if (pInfo.uid) { currentlyExplodingPlayers.delete(pInfo.uid); deadPlayers.add(pInfo.uid); }
                                        if (pInfo.username) { currentlyExplodingPlayers.delete(pInfo.username); deadPlayers.add(pInfo.username); }
                                        markPlayerDead(pInfo);

                                        const curOpp = findOpponentElement(pInfo.socketId, pInfo.username, pInfo.uid);
                                        if (curOpp) {
                                            curOpp.classList.add('player-dead');
                                            const curCircle = curOpp.querySelector('.opponent-avatar-circle');
                                            if (curCircle) {
                                                curCircle.style.visibility = 'visible';
                                                curCircle.innerHTML = '<img src="assets/cards/die.png" style="width:100%;height:100%;object-fit:cover;border-radius:50%;transform:scale(1.8);">';
                                            }
                                        }
                                    }

                                    frame++;
                                    if (frame > 70) {
                                        clearInterval(intv);
                                        expDiv.remove();
                                        if (pInfo.socketId) currentlyExplodingPlayers.delete(pInfo.socketId);
                                        if (pInfo.uid) currentlyExplodingPlayers.delete(pInfo.uid);
                                        if (pInfo.username) currentlyExplodingPlayers.delete(pInfo.username);
                                        markPlayerDead(pInfo);
                                    }
                                }, 1000 / 40);
                            }
                        }
                    }
                });

                setTimeout(() => {
                    matchState.isExploding = false;
                    updateTurnIndicator();
                }, 1900);

            }, 1000); // 1.0s rung lắc phát sáng đỏ (atomic-charging)
        }, 1000); // 500ms bay + 500ms nằm nghỉ trên bàn
    }, 600); // 600ms bốc bài lên tay
});

function triggerExplosionAnimation(targetUid, username, startFrame = 1, socketId = null) {
    const rId = matchState.roomId;
    
    // Lưu thông tin ván nổ vào sessionStorage để bảo toàn qua F5
    try {
        if (rId && (targetUid || socketId)) {
            sessionStorage.setItem('meono_exploding_uid_' + rId, targetUid || socketId);
            sessionStorage.setItem('meono_exploding_time_' + rId, Date.now().toString());
        }
    } catch(e){}

    const clearExpStorage = () => {
        try {
            if (rId) {
                sessionStorage.removeItem('meono_exploding_uid_' + rId);
                sessionStorage.removeItem('meono_exploding_time_' + rId);
            }
        } catch(e){}
    };

    const deadPlayer = findPlayerInState(socketId, targetUid, username);
    const resolvedSocketId = socketId || (deadPlayer ? deadPlayer.socketId : null);
    const resolvedUid = targetUid || (deadPlayer ? deadPlayer.uid : null);
    const resolvedUsername = username || (deadPlayer ? deadPlayer.username : null);

    const isMe = (resolvedSocketId === socket.id) || isMeUid(resolvedUid) || (deadPlayer && (isMeUid(deadPlayer.uid) || (typeof myUsername !== 'undefined' && deadPlayer.username === myUsername)));

    // Đảm bảo đối tượng luôn được bảo vệ trong currentlyExplodingPlayers nếu startFrame < 4
    if (startFrame < 4) {
        if (resolvedUid) currentlyExplodingPlayers.add(resolvedUid);
        if (resolvedSocketId) currentlyExplodingPlayers.add(resolvedSocketId);
        if (resolvedUsername) currentlyExplodingPlayers.add(resolvedUsername);
        if (deadPlayer) {
            if (deadPlayer.uid) currentlyExplodingPlayers.add(deadPlayer.uid);
            if (deadPlayer.socketId) currentlyExplodingPlayers.add(deadPlayer.socketId);
            if (deadPlayer.username) currentlyExplodingPlayers.add(deadPlayer.username);
        }
    }

    if (isMe) {
        if (explosionOverlay) {
            explosionOverlay.classList.remove('hidden');
            let frame = startFrame;
            if (frame >= 4) {
                if (resolvedUid) { currentlyExplodingPlayers.delete(resolvedUid); deadPlayers.add(resolvedUid); }
                if (resolvedSocketId) { currentlyExplodingPlayers.delete(resolvedSocketId); deadPlayers.add(resolvedSocketId); }
                if (resolvedUsername) { currentlyExplodingPlayers.delete(resolvedUsername); deadPlayers.add(resolvedUsername); }
                if (deadPlayer) {
                    if (deadPlayer.uid) { currentlyExplodingPlayers.delete(deadPlayer.uid); deadPlayers.add(deadPlayer.uid); }
                    if (deadPlayer.socketId) { currentlyExplodingPlayers.delete(deadPlayer.socketId); deadPlayers.add(deadPlayer.socketId); }
                    if (deadPlayer.username) { currentlyExplodingPlayers.delete(deadPlayer.username); deadPlayers.add(deadPlayer.username); }
                }
                document.body.classList.add('hand-dead');
                markPlayerDead(deadPlayer || resolvedUid || resolvedSocketId);
            }
            const getExpUrl = (f) => {
                const raw = `cards/exploding_kitten/sprite_${f}.png`;
                return (typeof window.getPreloadedAssetUrl === 'function') 
                    ? window.getPreloadedAssetUrl(raw) 
                    : ((window.parent && typeof window.parent.getPreloadedAssetUrl === 'function') 
                        ? window.parent.getPreloadedAssetUrl(raw) 
                        : raw);
            };

            if (explosionInterval) clearInterval(explosionInterval);
            explosionInterval = setInterval(() => {
                explosionOverlay.style.backgroundImage = `url('${getExpUrl(frame)}')`;
                
                // Đúng vào lúc sprite_4 của hoạt ảnh nổ -> Chuyển sang trạng thái chết
                if (frame === 4) {
                    if (resolvedUid) { currentlyExplodingPlayers.delete(resolvedUid); deadPlayers.add(resolvedUid); }
                    if (resolvedSocketId) { currentlyExplodingPlayers.delete(resolvedSocketId); deadPlayers.add(resolvedSocketId); }
                    if (resolvedUsername) { currentlyExplodingPlayers.delete(resolvedUsername); deadPlayers.add(resolvedUsername); }
                    if (deadPlayer) {
                        if (deadPlayer.uid) { currentlyExplodingPlayers.delete(deadPlayer.uid); deadPlayers.add(deadPlayer.uid); }
                        if (deadPlayer.socketId) { currentlyExplodingPlayers.delete(deadPlayer.socketId); deadPlayers.add(deadPlayer.socketId); }
                        if (deadPlayer.username) { currentlyExplodingPlayers.delete(deadPlayer.username); deadPlayers.add(deadPlayer.username); }
                    }
                    document.body.classList.add('hand-dead');
                    markPlayerDead(deadPlayer || resolvedUid || resolvedSocketId);
                }

                frame++;
                if (frame > 70) {
                    clearInterval(explosionInterval);
                    explosionOverlay.style.backgroundImage = 'none';
                    explosionOverlay.classList.add('hidden');
                    clearExpStorage();
                    
                    if (resolvedUid) currentlyExplodingPlayers.delete(resolvedUid);
                    if (resolvedSocketId) currentlyExplodingPlayers.delete(resolvedSocketId);
                    if (resolvedUsername) currentlyExplodingPlayers.delete(resolvedUsername);
                    if (deadPlayer) {
                        if (deadPlayer.uid) currentlyExplodingPlayers.delete(deadPlayer.uid);
                        if (deadPlayer.socketId) currentlyExplodingPlayers.delete(deadPlayer.socketId);
                        if (deadPlayer.username) currentlyExplodingPlayers.delete(deadPlayer.username);
                    }
                    markPlayerDead(deadPlayer || resolvedUid || resolvedSocketId);

                    matchState.isExploding = false;
                    if (matchState._explodingSafetyTimer) clearTimeout(matchState._explodingSafetyTimer);
                    updateTurnIndicator();
                }
            }, 1000 / 40);
        } else {
            clearExpStorage();
            if (resolvedUid) { currentlyExplodingPlayers.delete(resolvedUid); deadPlayers.add(resolvedUid); }
            if (resolvedSocketId) { currentlyExplodingPlayers.delete(resolvedSocketId); deadPlayers.add(resolvedSocketId); }
            if (resolvedUsername) { currentlyExplodingPlayers.delete(resolvedUsername); deadPlayers.add(resolvedUsername); }
            if (deadPlayer) {
                if (deadPlayer.uid) currentlyExplodingPlayers.delete(deadPlayer.uid);
                if (deadPlayer.socketId) currentlyExplodingPlayers.delete(deadPlayer.socketId);
                if (deadPlayer.username) currentlyExplodingPlayers.delete(deadPlayer.username);
            }
            document.body.classList.add('hand-dead');
            markPlayerDead(deadPlayer || resolvedUid || resolvedSocketId);
            matchState.isExploding = false;
            if (matchState._explodingSafetyTimer) clearTimeout(matchState._explodingSafetyTimer);
        }
        showGameToast('BÙM!!!', '<span class="toast-username">BẠN</span> ĐÃ BỊ NỔ CHẾT!', 'danger');
    } else {
        let oppEl = findOpponentElement(resolvedSocketId, resolvedUsername, resolvedUid);

        if (oppEl) {
            const avatarImg = oppEl.querySelector('.opponent-avatar-circle') || oppEl;
            const rect = avatarImg.getBoundingClientRect();

            const expDiv = document.createElement('div');
            expDiv.className = 'avatar-explosion';
            expDiv.style.position = 'fixed';
            expDiv.style.left = (rect.left + rect.width / 2) + 'px';
            expDiv.style.top = (rect.top + rect.height / 2) + 'px';
            expDiv.style.transform = 'translate(-50%, -55%)';
            expDiv.style.width = '280px';
            expDiv.style.height = '280px';
            expDiv.style.backgroundSize = 'contain';
            expDiv.style.backgroundPosition = 'center';
            expDiv.style.backgroundRepeat = 'no-repeat';
            expDiv.style.zIndex = '999999';
            expDiv.style.pointerEvents = 'none';
            document.body.appendChild(expDiv);
            
            const getExpUrl = (f) => {
                const raw = `cards/exploding_kitten/sprite_${f}.png`;
                return (typeof window.getPreloadedAssetUrl === 'function') 
                    ? window.getPreloadedAssetUrl(raw) 
                    : ((window.parent && typeof window.parent.getPreloadedAssetUrl === 'function') 
                        ? window.parent.getPreloadedAssetUrl(raw) 
                        : raw);
            };

            let frame = startFrame;
            // Nếu F5 phục hồi từ frame >= 4 thì lập tức chuyển avatar sang die.png
            if (frame >= 4) {
                if (resolvedUid) { currentlyExplodingPlayers.delete(resolvedUid); deadPlayers.add(resolvedUid); }
                if (resolvedSocketId) { currentlyExplodingPlayers.delete(resolvedSocketId); deadPlayers.add(resolvedSocketId); }
                if (resolvedUsername) { currentlyExplodingPlayers.delete(resolvedUsername); deadPlayers.add(resolvedUsername); }
                if (deadPlayer) {
                    if (deadPlayer.uid) { currentlyExplodingPlayers.delete(deadPlayer.uid); deadPlayers.add(deadPlayer.uid); }
                    if (deadPlayer.socketId) { currentlyExplodingPlayers.delete(deadPlayer.socketId); deadPlayers.add(deadPlayer.socketId); }
                    if (deadPlayer.username) { currentlyExplodingPlayers.delete(deadPlayer.username); deadPlayers.add(deadPlayer.username); }
                }
                markPlayerDead(deadPlayer || resolvedUid || resolvedSocketId);

                const curOpp = findOpponentElement(resolvedSocketId, resolvedUsername, resolvedUid);
                if (curOpp) {
                    curOpp.classList.add('player-dead');
                    const curCircle = curOpp.querySelector('.opponent-avatar-circle');
                    if (curCircle) {
                        curCircle.style.visibility = 'visible';
                        curCircle.innerHTML = '<img src="assets/cards/die.png" style="width:100%;height:100%;object-fit:cover;border-radius:50%;transform:scale(1.8);">';
                    }
                }
            }

            let intv = setInterval(() => {
                expDiv.style.backgroundImage = `url('${getExpUrl(frame)}')`;
                
                // Đúng vào lúc sprite_4 của hoạt ảnh nổ -> Chuyển từ avatar tròn sang ảnh die.png KHÔNG ĐỘ TRỄ
                if (frame === 4) {
                    if (resolvedUid) { currentlyExplodingPlayers.delete(resolvedUid); deadPlayers.add(resolvedUid); }
                    if (resolvedSocketId) { currentlyExplodingPlayers.delete(resolvedSocketId); deadPlayers.add(resolvedSocketId); }
                    if (resolvedUsername) { currentlyExplodingPlayers.delete(resolvedUsername); deadPlayers.add(resolvedUsername); }
                    if (deadPlayer) {
                        deadPlayer.alive = false;
                        if (deadPlayer.uid) { currentlyExplodingPlayers.delete(deadPlayer.uid); deadPlayers.add(deadPlayer.uid); }
                        if (deadPlayer.socketId) { currentlyExplodingPlayers.delete(deadPlayer.socketId); deadPlayers.add(deadPlayer.socketId); }
                        if (deadPlayer.username) { currentlyExplodingPlayers.delete(deadPlayer.username); deadPlayers.add(deadPlayer.username); }
                    }
                    markPlayerDead(deadPlayer || resolvedUid || resolvedSocketId);

                    // Tra cứu trực tiếp DOM phần tử hiện tại để ghi nhận thay đổi ngay lập tức
                    const curOpp = findOpponentElement(resolvedSocketId, resolvedUsername, resolvedUid);
                    if (curOpp) {
                        curOpp.classList.add('player-dead');
                        const curCircle = curOpp.querySelector('.opponent-avatar-circle');
                        if (curCircle) {
                            curCircle.style.visibility = 'visible';
                            curCircle.innerHTML = '<img src="assets/cards/die.png" style="width:100%;height:100%;object-fit:cover;border-radius:50%;transform:scale(1.8);">';
                        }
                    }
                }

                frame++;
                if (frame > 70) {
                    clearInterval(intv);
                    expDiv.remove();
                    clearExpStorage();
                    
                    if (resolvedUid) currentlyExplodingPlayers.delete(resolvedUid);
                    if (resolvedSocketId) currentlyExplodingPlayers.delete(resolvedSocketId);
                    if (resolvedUsername) currentlyExplodingPlayers.delete(resolvedUsername);
                    if (deadPlayer) {
                        if (deadPlayer.uid) currentlyExplodingPlayers.delete(deadPlayer.uid);
                        if (deadPlayer.socketId) currentlyExplodingPlayers.delete(deadPlayer.socketId);
                        if (deadPlayer.username) currentlyExplodingPlayers.delete(deadPlayer.username);
                    }
                    markPlayerDead(deadPlayer || resolvedUid || resolvedSocketId);

                    matchState.isExploding = false;
                    if (matchState._explodingSafetyTimer) clearTimeout(matchState._explodingSafetyTimer);
                    updateTurnIndicator();
                }
            }, 1000 / 40);
        } else {
            // Fallback nếu không tìm thấy DOM ban đầu: chạy timer 100ms (tương đương frame 4) rồi lập tức chuyển die.png
            setTimeout(() => {
                if (resolvedUid) { currentlyExplodingPlayers.delete(resolvedUid); deadPlayers.add(resolvedUid); }
                if (resolvedSocketId) { currentlyExplodingPlayers.delete(resolvedSocketId); deadPlayers.add(resolvedSocketId); }
                if (resolvedUsername) { currentlyExplodingPlayers.delete(resolvedUsername); deadPlayers.add(resolvedUsername); }
                if (deadPlayer) {
                    deadPlayer.alive = false;
                    if (deadPlayer.uid) { currentlyExplodingPlayers.delete(deadPlayer.uid); deadPlayers.add(deadPlayer.uid); }
                    if (deadPlayer.socketId) { currentlyExplodingPlayers.delete(deadPlayer.socketId); deadPlayers.add(deadPlayer.socketId); }
                    if (deadPlayer.username) { currentlyExplodingPlayers.delete(deadPlayer.username); deadPlayers.add(deadPlayer.username); }
                }
                markPlayerDead(deadPlayer || resolvedUid || resolvedSocketId);
                renderOpponentsMultiplayer();
            }, 100);

            setTimeout(() => {
                clearExpStorage();
                matchState.isExploding = false;
                if (matchState._explodingSafetyTimer) clearTimeout(matchState._explodingSafetyTimer);
            }, 1800);
        }
        showGameToast('BÙM!!!', '<span class="toast-username">' + (username || 'Đối thủ') + '</span> ĐÃ BỊ NỔ CHẾT!', 'danger');
    }
}

socket.on('game_player_exploded', ({ playerSocketId, username, uid, bombCard }) => {
    matchState.isExploding = true;
    matchState.favorPickMode = false;
    const handWrapper = document.querySelector('.hand-wrapper');
    if (handWrapper) handWrapper.classList.remove('favor-hand-glow');
    removeGameToast('favor-waiting-toast');
    if (favorSelectModal) favorSelectModal.classList.remove('show');
    const safetyDuration = 5000;

    // Đăng ký ngay người này vào danh sách ĐANG NỔ để tuyệt đối không bị chuyển sang die.png sớm
    if (playerSocketId) {
        currentlyExplodingPlayers.add(playerSocketId);
        deadPlayers.delete(playerSocketId);
    }
    if (uid) {
        currentlyExplodingPlayers.add(uid);
        deadPlayers.delete(uid);
    }
    if (username) {
        currentlyExplodingPlayers.add(username);
        deadPlayers.delete(username);
    }
    const oppObj = findPlayerInState(playerSocketId, uid, username);
    if (oppObj) {
        if (oppObj.uid) currentlyExplodingPlayers.add(oppObj.uid);
        if (oppObj.socketId) currentlyExplodingPlayers.add(oppObj.socketId);
        if (oppObj.username) currentlyExplodingPlayers.add(oppObj.username);
    }

    if (matchState._explodingSafetyTimer) clearTimeout(matchState._explodingSafetyTimer);
    matchState._explodingSafetyTimer = setTimeout(() => {
        matchState.isExploding = false;
    }, safetyDuration);

    const isMe = (playerSocketId === socket.id) || isMeUid(uid) || (typeof myUsername !== 'undefined' && username === myUsername);
    const displayName = isMe ? 'BẠN' : (username || 'Ai đó');
    const kittenCard = bombCard || { id: 'exploding_kitten', artIndex: 1 };

    // Khóa toàn bộ tương tác trong toàn bộ thời gian diễn ra hiệu ứng (0.5s rút + 0.5s bom = 1.0s)
    lockCardActions(1600);

    const deckElem = document.getElementById('deckStackElem') || document.getElementById('centerDeck');
    const startRect = deckElem ? deckElem.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 195, height: 278 };

    // 1. Chờ hoạt ảnh rút bài từ chồng bài bay về tay/avatar hoàn tất (đúng 0.5s = 500ms)
    setTimeout(() => {
        let bombStartRect = null;
        if (isMe) {
            const bombEl = document.querySelector(`.hand-container .card[data-uid="${kittenCard.uid}"]`)
                || document.querySelector('.hand-container .card.card-super_exploding_kitten')
                || document.querySelector('.hand-container .card.card-exploding_kitten')
                || (handContainer ? handContainer.lastElementChild : null);
            if (bombEl) {
                bombStartRect = bombEl.getBoundingClientRect();
            } else if (handContainer) {
                bombStartRect = handContainer.getBoundingClientRect();
            }
            // Xóa lá bom khỏi tay sau khi đã lấy được vị trí xuất phát
            handCards = handCards.filter(c => (kittenCard.uid ? c.uid !== kittenCard.uid : (c.id !== 'exploding_kitten' && c.id !== 'super_exploding_kitten')));
            renderHand(false);
        } else {
            const oppEl = findOpponentElement(playerSocketId, username, uid);
            const avatarCircle = oppEl ? (oppEl.querySelector('.opponent-avatar-circle') || oppEl) : null;
            bombStartRect = avatarCircle ? avatarCircle.getBoundingClientRect() : null;
            const opp = findPlayerInState(playerSocketId, uid, username);
            if (opp) {
                opp.cardCount = Math.max(0, (opp.cardCount !== undefined ? opp.cardCount : (opp.hand?.length || 0)) - 1);
                renderOpponentsMultiplayer();
            }
        }

        // 2. Hệ thống TỰ ĐỘNG NÉM lá bom xuống chồng bài đã đánh (đúng 0.5s = 500ms)
        animateCardToDiscard(kittenCard, 0, 0, bombStartRect || startRect);
        soundManager.playSfx('exploding_kitten');
        showGameToast('NGUY HIỂM!', '<span class="toast-username">' + displayName + '</span> vừa bốc phải MÈO NỔ!', 'danger');

        // 3. Chờ lá bom bay xong vào bàn (đúng 0.5s = 500ms), KÍCH HOẠT NỔ NGAY LẬP TỨC
        setTimeout(() => {
            try { soundManager.playSfx('explosion'); } catch(e){}
            const targetUid = uid || (findPlayerInState(playerSocketId, uid, username)?.uid) || playerSocketId;
            triggerExplosionAnimation(targetUid, username, 1, playerSocketId);
        }, 500);
    }, 500);
});

// Khi bốc phải SIÊU MÈO NỔ (super_exploding_kitten) và có Defuse:
// Defuse tự động đánh xuống bàn -> Bị ngọn lửa Inferno thiêu rụi thành tro -> Phát nổ chết!
socket.on('game_super_exploding_drawn', ({ roomId, playerSocketId, uid, username, bombCard, defuseCard, hasDefuse, drawPileCount }) => {
    matchState.isExploding = true;
    matchState.favorPickMode = false;
    const handWrapper = document.querySelector('.hand-wrapper');
    if (handWrapper) handWrapper.classList.remove('favor-hand-glow');
    removeGameToast('favor-waiting-toast');
    if (favorSelectModal) favorSelectModal.classList.remove('show');
    if (typeof drawPileCount === 'number') {
        remainingDeckCount = drawPileCount;
        updateStats();
    }

    const safetyDuration = 6000;

    // Đăng ký ngay người này vào danh sách ĐANG NỔ để tuyệt đối không bị chuyển sang die.png sớm
    if (playerSocketId) {
        currentlyExplodingPlayers.add(playerSocketId);
        deadPlayers.delete(playerSocketId);
    }
    if (uid) {
        currentlyExplodingPlayers.add(uid);
        deadPlayers.delete(uid);
    }
    if (username) {
        currentlyExplodingPlayers.add(username);
        deadPlayers.delete(username);
    }
    const oppObj = findPlayerInState(playerSocketId, uid, username);
    if (oppObj) {
        if (oppObj.uid) currentlyExplodingPlayers.add(oppObj.uid);
        if (oppObj.socketId) currentlyExplodingPlayers.add(oppObj.socketId);
        if (oppObj.username) currentlyExplodingPlayers.add(oppObj.username);
    }

    if (matchState._explodingSafetyTimer) clearTimeout(matchState._explodingSafetyTimer);
    matchState._explodingSafetyTimer = setTimeout(() => {
        matchState.isExploding = false;
    }, safetyDuration);

    const isMe = (playerSocketId === socket.id) || isMeUid(uid) || (typeof myUsername !== 'undefined' && username === myUsername);
    const displayName = isMe ? 'BẠN' : (username || 'Ai đó');
    const kittenCard = bombCard || { id: 'super_exploding_kitten', artIndex: 1 };
    const actualDefuseCard = defuseCard || { id: 'defuse', artIndex: 1 };

    // Khóa tương tác trong toàn bộ thời gian diễn ra chuỗi hoạt ảnh (0.5s rút + 0.5s bom + 0.5s defuse + 1.0s đốt + 1.0s nổ = 3.5s)
    lockCardActions(3500);

    const deckElem = document.getElementById('deckStackElem') || document.getElementById('centerDeck');
    const startRect = deckElem ? deckElem.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 195, height: 278 };

    // BƯỚC 1: Đợi hoạt ảnh rút bài từ cọc bay về tay/avatar (đúng 0.5s = 500ms)
    setTimeout(() => {
        let bombStartRect = null;
        if (isMe) {
            const bombEl = document.querySelector(`.hand-container .card[data-uid="${kittenCard.uid}"]`)
                || document.querySelector('.hand-container .card.card-super_exploding_kitten')
                || document.querySelector('.hand-container .card.card-exploding_kitten')
                || (handContainer ? handContainer.lastElementChild : null);
            if (bombEl) {
                bombStartRect = bombEl.getBoundingClientRect();
            } else if (handContainer) {
                bombStartRect = handContainer.getBoundingClientRect();
            }
            // Xóa lá bom khỏi tay sau khi đã lấy vị trí xuất phát
            handCards = handCards.filter(c => (kittenCard.uid ? c.uid !== kittenCard.uid : (c.id !== 'super_exploding_kitten' && c.id !== 'exploding_kitten')));
            renderHand(false);
        } else {
            const oppEl = findOpponentElement(playerSocketId, username, uid);
            const avatarCircle = oppEl ? (oppEl.querySelector('.opponent-avatar-circle') || oppEl) : null;
            bombStartRect = avatarCircle ? avatarCircle.getBoundingClientRect() : null;
            const opp = findPlayerInState(playerSocketId, uid, username);
            if (opp) {
                opp.cardCount = Math.max(0, (opp.cardCount !== undefined ? opp.cardCount : (opp.hand?.length || 0)) - 1);
                renderOpponentsMultiplayer();
            }
        }

        // BƯỚC 2: Hệ thống tự động ném lá SIÊU MÈO NỔ xuống bàn (0.5s)
        animateCardToDiscard(kittenCard, 0, 0, bombStartRect || startRect);
        soundManager.playSfx('exploding_kitten');
        showGameToast('NGUY HIỂM!', '<span class="toast-username">' + displayName + '</span> vừa bốc phải SIÊU MÈO NỔ!', 'danger');

        // BƯỚC 3: Sau khi Siêu Mèo Nổ tiếp đất, lá DEFUSE tự động bay ra bàn gỡ bom (0.5s)
        setTimeout(() => {
            let defuseStartRect = null;
            if (isMe) {
                const defuseEl = document.querySelector(`.hand-container .card[data-uid="${actualDefuseCard.uid}"]`)
                    || document.querySelector('.hand-container .card.defuse')
                    || document.querySelector('.hand-container .defuse');
                if (defuseEl) {
                    defuseStartRect = defuseEl.getBoundingClientRect();
                } else if (handContainer) {
                    defuseStartRect = handContainer.getBoundingClientRect();
                }
                // Xóa lá defuse khỏi tay
                handCards = handCards.filter(c => (actualDefuseCard.uid ? c.uid !== actualDefuseCard.uid : c.id !== 'defuse'));
                renderHand(false);
            } else {
                const oppEl = findOpponentElement(playerSocketId, username, uid);
                const avatarCircle = oppEl ? (oppEl.querySelector('.opponent-avatar-circle') || oppEl) : null;
                defuseStartRect = avatarCircle ? avatarCircle.getBoundingClientRect() : null;
                
                const opp = findPlayerInState(playerSocketId, uid, username);
                if (opp) {
                    opp.cardCount = Math.max(0, (opp.cardCount !== undefined ? opp.cardCount : (opp.hand?.length || 0)) - 1);
                    renderOpponentsMultiplayer();
                }
            }

            const defuseEl = animateCardToDiscard(actualDefuseCard, Math.random() * 20 - 10, Math.random() * 20 - 10, defuseStartRect || startRect);
            soundManager.playSfx('defuse');
            
            // BƯỚC 4: Ngay khi lá Defuse hạ xuống bàn, ngọn lửa Inferno bùng cháy thiêu rụi Defuse thành tro (1.0s)
            setTimeout(() => {
                soundManager.playSfx('inferno');
                showGameToast('VÔ PHƯƠNG CỨU CHỮA!', '<span class="toast-username">' + displayName + '</span> dùng Defuse nhưng bị thiêu cháy thành tro!', 'danger');
                
                animateInfernoSprite(defuseEl ? [defuseEl] : [], 1000, 12, () => {
                    // BƯỚC 5: Thiêu cháy xong -> Người chơi phát nổ chết ngay lập tức!
                    try { soundManager.playSfx('explosion'); } catch(e){}
                    const targetUid = uid || (findPlayerInState(playerSocketId, uid, username)?.uid) || playerSocketId;
                    triggerExplosionAnimation(targetUid, username, 1, playerSocketId);
                });
            }, 350);
        }, 500);
    }, 500);
});

socket.on('game_over', ({ winner, winnerSocketId, rankResults, isRankmatch }) => {
    console.log('[Game Over] Event received for winner:', winner, rankResults, isRankmatch);
    if (Array.isArray(rankResults)) {
        const myResult = rankResults.find(p => isMeUid(p.uid) || p.socketId === socket.id || isSelfUsername(p.username));
        if (myResult && myResult.newScore !== undefined) {
            try {
                localStorage.setItem('cached_rank_score', myResult.newScore.toString());
                const rInfo = getRankInfo(myResult.newScore);
                localStorage.setItem('cached_rank_title', rInfo.name);
                localStorage.setItem('cached_rank_icon', rInfo.icon);
            } catch(e){}
        }
    }
    const showWinScreen = () => {
        matchState.isWinningShowing = true;
        try { soundManager.playSfx('win'); } catch(e){}
        const gameOverOverlay = document.getElementById('gameOverOverlay');
        const winnerNameEl = document.getElementById('winnerName') || document.getElementById('gameOverText');
        if (winnerNameEl) {
            winnerNameEl.textContent = `${winner ? winner.toUpperCase() : ''}`;
        }
        if (gameOverOverlay) {
            gameOverOverlay.classList.remove('hidden');
        }
        console.log('[Game Over] Displaying USERNAME WIN for 2s...');

        // Dòng chữ USERNAME WIN! hiện ĐỦ đúng 2.0s
        setTimeout(() => {
            matchState.isWinningShowing = false;
            if (gameOverOverlay) {
                gameOverOverlay.classList.add('hidden');
            }
            if ((isRankmatch || (rankResults && rankResults.length > 0)) && rankResults && rankResults.length > 0) {
                console.log('[Game Over] Displaying Post-Match Rank Summary UI Overlay permanently until user closes...');
                renderPostMatchRankOverlay(rankResults);
            } else {
                console.log('[Game Over] Phòng thường: Đã hiển thị đủ 2s dòng chữ Winner.');
                if (pendingKickToHome) {
                    returnToHome();
                } else {
                    setTimeout(returnToHome, 500);
                }
            }
        }, 2000);
    };

    let checkCount = 0;
    const checkInterval = setInterval(() => {
        checkCount++;
        // Đợi vụ nổ hoàn tất, tối đa 3.5 giây (70 * 50ms)
        if (!matchState.isExploding || checkCount > 70) {
            clearInterval(checkInterval);
            setTimeout(showWinScreen, 300);
        }
    }, 50);
});







// --- COMBO LOGIC ---
const comboTargetSelectModal = document.getElementById('comboTargetSelectModal');
const comboTargetAvatarContainer = document.getElementById('comboTargetAvatarContainer');
const cardTypeSelectModal = document.getElementById('cardTypeSelectModal');
const cardTypeGrid = document.getElementById('cardTypeGrid');
const cardTypeSelectTitle = document.getElementById('cardTypeSelectTitle');
const comboTargetSelectTitle = document.getElementById('comboTargetSelectTitle');

function renderTargetAvatarHtml(t) {
    if (t && t.avatar) {
        return `<img class="favor-avatar-img" src="${t.avatar}" alt="${t.username}">`;
    }
    return `
        <div class="favor-avatar-img favor-avatar-default">
            <svg viewBox="0 0 24 24" fill="none" stroke="#fffdeb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
            </svg>
        </div>
    `;
}

socket.on('game_locking_select_target', ({ roomId, targets }) => {
    if (!matchState.active) return;
    comboTargetAvatarContainer.innerHTML = '';
    
    if (!targets || targets.length === 0) {
        showGameToast('LOCKING', 'Không có ai có bài để khóa!', 'warning');
        return;
    }
    
    comboTargetSelectTitle.innerText = "Chọn mục tiêu để KHÓA BÀI";
    
    targets.forEach(t => {
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'favor-avatar';
        
        avatarDiv.innerHTML = `
            ${renderTargetAvatarHtml(t)}
            <span class="favor-avatar-name">${t.username}</span>
        `;
        
        avatarDiv.addEventListener('click', () => {
            try { soundManager.playSfx('card'); } catch(e){}
            avatarDiv.classList.add('selected');
            socket.emit('game_locking_pick_target', { roomId: matchState.roomId, targetSocketId: t.socketId });
            comboTargetSelectModal.classList.remove('show');
        });
        
        comboTargetAvatarContainer.appendChild(avatarDiv);
    });
    
    comboTargetSelectModal.classList.add('show');
});

socket.on('game_switch_select_target', ({ roomId, targets }) => {
    if (!matchState.active) return;
    comboTargetAvatarContainer.innerHTML = '';
    
    if (!targets || targets.length === 0) {
        showGameToast('SWITCH', 'Không có đối thủ hợp lệ để hoán đổi bài!', 'warning');
        return;
    }
    
    comboTargetSelectTitle.innerText = "Chọn mục tiêu để HOÁN ĐỔI TOÀN BỘ BÀI";
    
    targets.forEach(t => {
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'favor-avatar';
        
        avatarDiv.innerHTML = `
            ${renderTargetAvatarHtml(t)}
            <span class="favor-avatar-name">${t.username}</span>
        `;
        
        avatarDiv.addEventListener('click', () => {
            try { soundManager.playSfx('card'); } catch(e){}
            avatarDiv.classList.add('selected');
            socket.emit('game_switch_pick_target', { roomId: matchState.roomId, targetSocketId: t.socketId });
            comboTargetSelectModal.classList.remove('show');
        });
        
        comboTargetAvatarContainer.appendChild(avatarDiv);
    });
    
    comboTargetSelectModal.classList.add('show');
});

socket.on('game_locking_applied', ({ victimSocketId, victimUsername, lockedCardUids, newlyLockedCardUids }) => {
    if (!matchState.active) return;
    
    try { soundManager.playSfx('locking'); } catch(e){}
    const numLocked = newlyLockedCardUids ? newlyLockedCardUids.length : 3;
    showGameToast('Khóa bài', `${victimUsername || 'Đối thủ'} đã bị khóa ${numLocked} lá bài`, 'danger', 4000);
    
    if (victimSocketId === socket.id) {
        matchState.myLockedCardUids = lockedCardUids || [];
        renderHand(false);
        // Hoạt ảnh xuất hiện: sprites1 -> sprites8 trong 1 giây, sau đó giữ nguyên sprites8
        const lockedEls = Array.from(handContainer.querySelectorAll('.card-locked'))
            .filter(el => matchState.myLockedCardUids.includes(el.dataset.uid));
        animateLockSprite(lockedEls, 'in', 250, 8);
    }
});

socket.on('game_locking_expired', ({ victimSocketId, victimUsername }) => {
    if (!matchState.active) return;
    
    showGameToast('Giải phóng', `Các lá bài bị khóa của ${victimUsername || 'Đối thủ'} đã được giải phóng!`, 'info', 3000);
    
    if (victimSocketId === socket.id) {
        // Hoạt ảnh biến mất: sprites8 -> sprites1 trong 1 giây, SAU ĐÓ mới thực sự mở khóa & render lại bài
        const lockedEls = Array.from(handContainer.querySelectorAll('.card-locked'))
            .filter(el => matchState.myLockedCardUids.includes(el.dataset.uid));
        animateLockSprite(lockedEls, 'out', 250, 8, () => {
            matchState.myLockedCardUids = [];
            renderHand(false);
        });
    }
});

socket.on('game_locking_updated', ({ victimSocketId, lockedCardUids }) => {
    if (!matchState.active) return;
    if (victimSocketId === socket.id) {
        matchState.myLockedCardUids = lockedCardUids || [];
        renderHand(false);
    }
});

socket.on('game_combo_select_target', ({ roomId, targets, comboType }) => {
    if (!matchState.active) return;
    comboTargetAvatarContainer.innerHTML = '';
    
    if (targets.length === 0) {
        showGameToast('COMBO', 'Không có ai có bài để cướp!', 'warning');
        return;
    }
    
    comboTargetSelectTitle.innerText = comboType === 3 ? "Chọn mục tiêu để đòi bài chỉ định" : "Chọn mục tiêu để cướp ngẫu nhiên";
    
    targets.forEach(t => {
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'favor-avatar';
        
        avatarDiv.innerHTML = `
            ${renderTargetAvatarHtml(t)}
            <span class="favor-avatar-name">${t.username}</span>
        `;
        
        avatarDiv.addEventListener('click', () => {
            try { soundManager.playSfx('card'); } catch(e){}
            avatarDiv.classList.add('selected');
            const allAvatars = comboTargetAvatarContainer.querySelectorAll('.favor-avatar');
            allAvatars.forEach(av => {
                if (av !== avatarDiv) av.style.opacity = '0.35';
            });
            socket.emit('game_combo_pick_target', { roomId: matchState.roomId, targetSocketId: t.socketId, targetUsername: t.username, targetUid: t.uid });
        });
        
        comboTargetAvatarContainer.appendChild(avatarDiv);
    });
    
    comboTargetSelectModal.classList.add('show');
});

socket.on('game_combo_3_select_card', ({ roomId, targetUsername }) => {
    if (!matchState.active) return;
    
    // Server đã xác nhận target, ta đóng modal chọn target
    comboTargetSelectModal.classList.remove('show');
    
    if (cardTypeSelectTitle) cardTypeSelectTitle.innerText = "Chọn 1 lá bài bạn muốn đòi";
    showCardTypeSelectModal();
});

socket.on('game_combo_5_select_card', ({ roomId }) => {
    if (!matchState.active) return;
    if (cardTypeSelectTitle) cardTypeSelectTitle.innerText = "Chọn 1 lá bài bạn muốn lấy từ Hư Không";
    showCardTypeSelectModal();
});

function showCardTypeSelectModal() {
    cardTypeGrid.innerHTML = '';
    
    const cardTypes = [
        { id: 'defuse', name: 'Defuse', class: 'defuse' },
        { id: 'tancong', name: 'Tấn Công', class: 'attack' },
        { id: 'slap', name: 'Slap', class: 'attack' },
        { id: 'slap2', name: 'Slap x2', class: 'attack' },
        { id: 'slap3', name: 'Slap x3', class: 'attack' },
        { id: 'inferno', name: 'INFERNO', class: 'attack' },
        { id: 'inferno4', name: 'INFERNO 4', class: 'attack' },
        { id: 'skip', name: 'Qua Lượt', class: 'skip' },
        { id: 'superskip', name: 'Siêu Qua Lượt', class: 'skip' },
        { id: 'favor', name: 'Xin Xỏ', class: 'favor' },
        { id: 'superfavor', name: 'Super Favor', class: 'favor' },
        { id: 'xaobai', name: 'Xào Bài', class: 'shuffle' },
        { id: 'nhintruoctuonglai', name: 'See 3 Future', class: 'see_the_future' },
        { id: 'nhintruoctuonglai1', name: 'See 1 Future', class: 'see_the_future' },
        { id: 'nhintruoctuonglai5', name: 'See 5 Future', class: 'see_the_future5' },
        { id: 'freeze', name: 'Ngủ Đông', class: 'vanilla' },
        { id: 'afterthefuture', name: 'afterthefuture', class: 'afterthefuture' },
        { id: 'afterthefuture5', name: 'afterthefuture5', class: 'afterthefuture' },
        { id: 'drawbottom', name: 'drawbottom', class: 'drawbottom' },
        { id: 'swap', name: 'Hoán Đổi', class: 'swap' },
        { id: 'reverse', name: 'Đổi Chiều', class: 'skip' },
        { id: 'switch', name: 'Switch', class: 'swap' },
        { id: 'chest', name: 'Rương thưởng', class: 'swap' },
        { id: 'everywhere', name: 'everywhere', class: 'everywhere' },
        { id: 'clone', name: 'clone', class: 'clone' },
        { id: 'streaking', name: 'streaking', class: 'streaking' },
        { id: 'garbage_collection', name: 'Dọn rác', class: 'vanilla' },
        { id: 'nope', name: 'Nope', class: 'nope' },
        { id: 'supernope', name: 'Super Nope', class: 'supernope' },
        { id: 'whatcat', name: 'whatcat', class: 'whatcat' },
        { id: 'catermelon', name: 'Catermelon', class: 'vanilla' },
        { id: 'rainbowcat', name: 'Rainbow Cat', class: 'vanilla' },
        { id: 'potatocat', name: 'Potato Cat', class: 'vanilla' },
        { id: 'zombiecat', name: 'Zombie Cat', class: 'vanilla' },
        { id: 'tacocat', name: 'Taco Cat', class: 'vanilla' },
        { id: 'golemcat', name: 'Golem Cat', class: 'vanilla' },
        { id: 'cattea', name: 'Cattea', class: 'vanilla' },
        { id: 'vampirecat', name: 'Vampire Cat', class: 'vanilla' }
    ];
    
    cardTypes.forEach(type => {
        const btn = document.createElement('div');
        btn.className = `card-type-btn ${type.class}`;
        btn.innerText = type.name;
        btn.addEventListener('click', () => {
            try { soundManager.playSfx('card'); } catch(e){}
            btn.classList.add('selected');
            socket.emit('game_combo_pick_card_type', { roomId: matchState.roomId, targetCardId: type.id });
            cardTypeSelectModal.classList.remove('show');
        });
        cardTypeGrid.appendChild(btn);
    });
    
    cardTypeSelectModal.classList.add('show');
}

function animateCardTransfer(giverSocketId, receiverSocketId, card, onComplete, giverUid = null, receiverUid = null, giverUsername = null, receiverUsername = null) {
    const isGiver = isMeUid(giverUid) || (giverSocketId && giverSocketId === socket.id) || isSelfUsername(giverUsername);
    const isReceiver = isMeUid(receiverUid) || (receiverSocketId && receiverSocketId === socket.id) || isSelfUsername(receiverUsername);
    const handWrapper = document.querySelector('.hand-wrapper');
    
    let startRect = null;
    let endRect = null;
    
    if (isGiver) {
        startRect = handWrapper ? handWrapper.getBoundingClientRect() : null;
    } else {
        const giverOppEl = findOpponentElement(giverSocketId, giverUsername, giverUid);
        const avatarCircle = giverOppEl ? (giverOppEl.querySelector('.opponent-avatar-circle') || giverOppEl) : null;
        if (avatarCircle) startRect = avatarCircle.getBoundingClientRect();
    }
    
    if (isReceiver) {
        endRect = handWrapper ? handWrapper.getBoundingClientRect() : null;
    } else {
        const receiverOppEl = findOpponentElement(receiverSocketId, receiverUsername, receiverUid);
        const avatarCircle = receiverOppEl ? (receiverOppEl.querySelector('.opponent-avatar-circle') || receiverOppEl) : null;
        if (avatarCircle) endRect = avatarCircle.getBoundingClientRect();
    }
    
    const deckElem = document.getElementById('deckStackElem') || document.getElementById('centerDeck');
    const deckFallbackRect = deckElem ? deckElem.getBoundingClientRect() : { left: window.innerWidth / 2 - 30, top: window.innerHeight / 2 - 30, width: 60, height: 60 };

    if (!startRect) startRect = deckFallbackRect;
    if (!endRect) endRect = deckFallbackRect;

    const bodyRect = document.body.getBoundingClientRect();
    const appScale = window._appScale || 1;

    // Chiều rộng và chiều cao lá bài trong hệ toạ độ Canvas
    const cardW = 120;
    const cardH = 171;

    const startX = ((startRect.left - bodyRect.left) + (startRect.width / 2)) / appScale - (cardW / 2);
    const startY = ((startRect.top - bodyRect.top) + (startRect.height / 2)) / appScale - (cardH / 2);

    const targetX = ((endRect.left - bodyRect.left) + (endRect.width / 2)) / appScale - (cardW / 2);
    const targetY = ((endRect.top - bodyRect.top) + (endRect.height / 2)) / appScale - (cardH / 2);

    const deltaX = targetX - startX;
    const deltaY = targetY - startY;
    
    const flyCard = document.createElement('div');
    if (isReceiver && card) {
        flyCard.className = getCardClass('card', card);
        setupCardContent(flyCard, card);
    } else {
        flyCard.className = 'card card-back-fly';
        flyCard.style.backgroundImage = `url('${resolveAsset("assets/cards/matsau.jpg")}')`;
        flyCard.style.backgroundSize = 'cover';
        flyCard.style.backgroundPosition = 'center';
    }
    
    flyCard.style.position = 'absolute';
    flyCard.style.width = `${cardW}px`;
    flyCard.style.height = `${cardH}px`;
    flyCard.style.left = `${startX}px`;
    flyCard.style.top = `${startY}px`;
    flyCard.style.borderRadius = '10px';
    flyCard.style.boxShadow = '0 10px 30px rgba(0,0,0,0.6)';
    flyCard.style.zIndex = '99999';
    flyCard.style.pointerEvents = 'none';
    flyCard.style.transformOrigin = 'center center';
    flyCard.style.willChange = 'transform, opacity';
    flyCard.style.transform = 'translate3d(0, 0, 0) scale(0.65)';
    flyCard.style.opacity = '1';
    
    document.body.appendChild(flyCard);
    try { soundManager.playSfx('card'); } catch(e) {}
    
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            flyCard.style.transition = 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.5s ease';
            flyCard.style.transform = `translate3d(${deltaX}px, ${deltaY}px, 0) scale(0.65)`;
            
            setTimeout(() => {
                flyCard.style.transition = 'opacity 0.12s ease';
                flyCard.style.opacity = '0';
                
                if (onComplete) onComplete();
                
                setTimeout(() => flyCard.remove(), 140);
            }, 500);
        });
    });
}

socket.on('game_combo_2_completed', ({ roomId, giverSocketId, giverUsername, giverUid, receiverSocketId, receiverUsername, receiverUid, card, giverCardCount, receiverCardCount }) => {
    if (!matchState.active) return;
    
    // Server đã xử lý xong combo 2, đóng modal (nếu có mở)
    comboTargetSelectModal.classList.remove('show');
    
    showGameToast('COMBO 2 LÁ', `<span class="toast-username">${receiverUsername}</span> dùng combo 2 cướp được 1 lá nào đó của <span class="toast-username">${giverUsername}</span>`, 'success');
    
    const isGiver = isMeUid(giverUid) || (giverSocketId === socket.id) || isSelfUsername(giverUsername);
    const isReceiver = isMeUid(receiverUid) || (receiverSocketId === socket.id) || isSelfUsername(receiverUsername);

    const oppPlayer = findPlayerInState(giverSocketId, giverUid, giverUsername);
    if (oppPlayer) oppPlayer.cardCount = giverCardCount;
    
    if (isGiver && card) {
        handCards = handCards.filter(c => c.uid !== card.uid);
        renderHand(false);
    }
    
    renderOpponentsMultiplayer();
    
    animateCardTransfer(giverSocketId, receiverSocketId, card, () => {
        if (isReceiver && card) {
            handCards.push(card);
            renderHand(false);
            soundManager.playSfx('draw_card');
        }
    }, giverUid, receiverUid, giverUsername, receiverUsername);
});

const CARD_NAMES_MAP = {
    'defuse': 'Defuse',
    'tancong': 'Tấn Công',
    'slap': 'Slap',
    'slap2': 'Slap x2',
    'slap3': 'Slap x3',
    'inferno': 'INFERNO',
    'inferno4': 'INFERNO 4',
    'contrast': 'Đảo Nghịch',
    'skip': 'Qua Lượt',
    'superskip': 'Siêu Qua Lượt',
    'favor': 'Xin Xỏ',
    'superfavor': 'Super Favor',
    'xaobai': 'Xào Bài',
    'nhintruoctuonglai': 'See 3 Future',
    'nhintruoctuonglai1': 'See 1 Future',
    'nope': 'Nope',
    'supernope': 'Super Nope',
    'catermelon': 'Catermelon',
    'rainbowcat': 'Rainbow Cat',
    'potatocat': 'Potato Cat',
    'zombiecat': 'Zombie Cat',
    'tacocat': 'Taco Cat',
    'golemcat': 'Golem Cat',
    'cattea': 'Cattea',
    'vampirecat': 'Vampire Cat',
    'streaking': 'streaking',
    'drawbottom': 'drawbottom',
    'nhintruoctuonglai5': 'See 5 Future',
    'everywhere': 'everywhere',
    'whatcat': 'whatcat',
    'freeze': 'Freeze',
    'afterthefuture': 'afterthefuture',
    'afterthefuture5': 'afterthefuture5',
    'clone': 'clone',
    'locking': 'LOCKING',
    'locking5': 'LOCKING 5',
    'swap': 'Hoán Đổi',
    'reverse': 'Đổi Chiều',
    'switch': 'Switch',
    'chest': 'Rương thưởng',
    'garbage_collection': 'Dọn rác'
};

socket.on('game_switch_completed', ({ roomId, attackerSocketId, attackerUid, attackerUsername, targetSocketId, targetUid, targetUsername, attackerNewHand, targetNewHand, attackerOldCards, targetOldCards, attackerOldCount, targetOldCount, attackerNewCount, targetNewCount }) => {
    if (!matchState.active) return;
    
    comboTargetSelectModal.classList.remove('show');
    
    const isAttacker = isMeUid(attackerUid) || (attackerSocketId === socket.id) || isSelfUsername(attackerUsername);
    const isTarget = isMeUid(targetUid) || (targetSocketId === socket.id) || isSelfUsername(targetUsername);

    const oppAttacker = findPlayerInState(attackerSocketId, attackerUid, attackerUsername);
    if (oppAttacker) oppAttacker.cardCount = attackerNewCount;
    const oppTarget = findPlayerInState(targetSocketId, targetUid, targetUsername);
    if (oppTarget) oppTarget.cardCount = targetNewCount;

    if (isAttacker || isTarget) {
        handCards = [];
        matchState.myLockedCardUids = [];
        renderHand(false);
    }
    
    renderOpponentsMultiplayer();

    const countAttacker = attackerOldCount || 0;
    const countTarget = targetOldCount || 0;
    const maxCards = Math.max(countAttacker, countTarget);

    // Toàn bộ bài từ Attacker lướt lần lượt vào Target
    for (let i = 0; i < countAttacker; i++) {
        const cardItem = (attackerOldCards && attackerOldCards[i]) ? attackerOldCards[i] : null;
        setTimeout(() => {
            animateCardTransfer(attackerSocketId, targetSocketId, cardItem, null, attackerUid, targetUid, attackerUsername, targetUsername);
        }, i * 90);
    }

    // Toàn bộ bài từ Target lướt lần lượt vào Attacker
    for (let j = 0; j < countTarget; j++) {
        const cardItem = (targetOldCards && targetOldCards[j]) ? targetOldCards[j] : null;
        setTimeout(() => {
            animateCardTransfer(targetSocketId, attackerSocketId, cardItem, null, targetUid, attackerUid, targetUsername, attackerUsername);
        }, j * 90);
    }

    // Sau khi toàn bộ hoạt ảnh lướt bài xong, gán lại bài trên tay hoàn tất
    const waitTime = maxCards > 0 ? (maxCards * 90 + 550) : 100;
    setTimeout(() => {
        if (isAttacker && attackerNewHand) {
            handCards = [...attackerNewHand];
            matchState.myLockedCardUids = [];
            renderHand(false);
            try { soundManager.playSfx('draw_card'); } catch(e){}
        } else if (isTarget && targetNewHand) {
            handCards = [...targetNewHand];
            matchState.myLockedCardUids = [];
            renderHand(false);
            try { soundManager.playSfx('draw_card'); } catch(e){}
        }
        renderOpponentsMultiplayer();
    }, waitTime);
});

socket.on('game_combo_3_completed', ({ roomId, success, targetCardId, giverSocketId, giverUsername, giverUid, receiverSocketId, receiverUsername, receiverUid, card, giverCardCount, receiverCardCount }) => {
    if (!matchState.active) return;
    
    if (success) {
        let rawId = card ? card.id : targetCardId;
        let cardName = CARD_NAMES_MAP[rawId] || rawId;
        showGameToast('COMBO 3 LÁ', `<span class="toast-username">${giverUsername}</span> buộc phải đưa lá <b>${cardName}</b> cho <span class="toast-username">${receiverUsername}</span>`, 'success');
        
        const isGiver = isMeUid(giverUid) || (giverSocketId === socket.id) || isSelfUsername(giverUsername);
        const isReceiver = isMeUid(receiverUid) || (receiverSocketId === socket.id) || isSelfUsername(receiverUsername);

        const oppPlayer = findPlayerInState(giverSocketId, giverUid, giverUsername);
        if (oppPlayer) oppPlayer.cardCount = giverCardCount;
        
        if (isGiver && card) {
            handCards = handCards.filter(c => c.uid !== card.uid);
            renderHand(false);
        }
        
        renderOpponentsMultiplayer();
        
        animateCardTransfer(giverSocketId, receiverSocketId, card, () => {
            if (isReceiver && card) {
                handCards.push(card);
                renderHand(false);
                soundManager.playSfx('draw_card');
            }
        }, giverUid, receiverUid, giverUsername, receiverUsername);
    } else {
        showGameToast('COMBO 3 LÁ', `<span class="toast-username">${giverUsername}</span> không có lá bài mà <span class="toast-username">${receiverUsername}</span> yêu cầu! Combo thất bại!`, 'warning');
    }
});

socket.on('game_combo_5_completed', ({ roomId, targetCardId, receiverSocketId, receiverUsername, receiverUid, card, receiverCardCount }) => {
    if (!matchState.active) return;
    
    let rawId = card ? card.id : targetCardId;
    let cardName = CARD_NAMES_MAP[rawId] || rawId;
    showGameToast('COMBO 5 LÁ', `<span class="toast-username">${receiverUsername}</span> đã dùng 5 lá khác nhau để có được <b>${cardName}</b>`, 'success');
    
    const isReceiver = isMeUid(receiverUid) || (receiverSocketId === socket.id) || isSelfUsername(receiverUsername);
    if (isReceiver && card) {
        handCards.push(card);
        // Render hand first to create the DOM element
        renderHand(true);
        soundManager.playSfx('draw_card');
        
        // Find the new element and apply animation
        setTimeout(() => {
            const newlyAddedEl = document.querySelector(`.card[data-uid="${card.uid}"]`);
            if (newlyAddedEl) {
                newlyAddedEl.classList.add('combo-card-glow');
                newlyAddedEl.style.animation = 'shake 0.5s ease-in-out 2';
                setTimeout(() => {
                    newlyAddedEl.classList.remove('combo-card-glow');
                    newlyAddedEl.style.animation = '';
                }, 2000);
            }
        }, 50); // slight delay to ensure DOM is updated
    } else {
        const oppPlayer = findPlayerInState(receiverSocketId, receiverUid, receiverUsername);
        if (oppPlayer) oppPlayer.cardCount = receiverCardCount;
        renderOpponentsMultiplayer();
    }
});

socket.on('game_chest_reward_resolved', ({ roomId, playerSocketId, playerUid, playerUsername, points, rewardCount, cards }) => {
    if (!matchState.active) return;
    if (!Array.isArray(cards) || cards.length === 0 || rewardCount <= 0) return;

    const isRecipient = isMeUid(playerUid) || (playerSocketId === socket.id) || isSelfUsername(playerUsername);
    const appScale = window._appScale || 1;

    // Kích thước lá bài bằng đúng kích thước gốc của lá bài trên bàn/chồng bài đã đánh
    const cardW = 195 * appScale;
    const cardH = 278 * appScale;

    // Bước 0: Tạo backdrop làm tối đen nền mọi thứ khác
    const oldBackdrop = document.querySelector('.chest-darken-backdrop');
    if (oldBackdrop) oldBackdrop.remove();

    const backdropEl = document.createElement('div');
    backdropEl.className = 'chest-darken-backdrop';
    document.body.appendChild(backdropEl);
    document.body.classList.add('chest-darken-active');

    requestAnimationFrame(() => {
        backdropEl.classList.add('show');
    });

    // Xác định vị trí lá bài Rương (ở chồng bài đã đánh)
    const chestInDiscard = discardPile ? (discardPile.querySelector('.card-chest:last-of-type') || discardPile.lastElementChild) : null;
    const dpRect = chestInDiscard
        ? chestInDiscard.getBoundingClientRect()
        : (discardPile ? discardPile.getBoundingClientRect() : { left: (window.innerWidth - cardW) / 2, top: (window.innerHeight - cardH) / 2, width: cardW, height: cardH });

    // Bước 1: Tạo lá Rương phát ánh sáng cam rực rỡ tại vị trí lá chest đã đánh (Đứng yên phát sáng, không rung lắc)
    const glowingChestEl = document.createElement('div');
    glowingChestEl.className = 'card card-chest chest-art-1 chest-glow-opening';
    setupCardContent(glowingChestEl, { id: 'chest', chestPoints: points });
    glowingChestEl.style.position = 'fixed';
    glowingChestEl.style.left = `${dpRect.left}px`;
    glowingChestEl.style.top = `${dpRect.top}px`;
    glowingChestEl.style.width = `${dpRect.width || cardW}px`;
    glowingChestEl.style.height = `${dpRect.height || cardH}px`;
    glowingChestEl.style.borderRadius = `${16 * appScale}px`;
    glowingChestEl.style.zIndex = '85500';
    glowingChestEl.style.pointerEvents = 'none';
    glowingChestEl.style.opacity = '0';
    glowingChestEl.style.transform = 'none';
    glowingChestEl.style.transition = 'opacity 0.2s ease';

    document.body.appendChild(glowingChestEl);

    requestAnimationFrame(() => {
        glowingChestEl.style.opacity = '1';
        try { soundManager.playSfx('card'); } catch(e){}
    });

    // Tính toán khoảng cách và căn giữa hoàn hảo hàng bài thưởng trên màn hình
    let spacing = 20 * appScale;
    let totalW = cards.length * cardW + (cards.length - 1) * spacing;
    const maxAllowedW = window.innerWidth * 0.94;
    if (totalW > maxAllowedW && cards.length > 1) {
        spacing = (maxAllowedW - cards.length * cardW) / (cards.length - 1);
        totalW = maxAllowedW;
    }
    const startLeft = (window.innerWidth - totalW) / 2;
    const tableTop = (window.innerHeight / 2) - (cardH / 2) - (20 * appScale);

    const cardElements = [];

    // Bước 2: Sau khi lá Rương phát sáng cam (200ms), các lá thưởng lướt từ vị trí lá chest này ra xếp thành hàng ngang
    const chestGlowDuration = 200;
    const emergeStagger = 35;
    const emergeDuration = 240;

    cards.forEach((card, idx) => {
        const cardEl = document.createElement('div');
        cardEl.className = getCardClass('card', card) + ' chest-reveal-card';
        setupCardContent(cardEl, card);

        const cardLeft = startLeft + idx * (cardW + spacing);
        const cardTop = tableTop;

        // Bắt đầu ngay tại vị trí lá Rương đang phát sáng cam
        cardEl.style.position = 'fixed';
        cardEl.style.left = `${dpRect.left}px`;
        cardEl.style.top = `${dpRect.top}px`;
        cardEl.style.width = `${cardW}px`;
        cardEl.style.height = `${cardH}px`;
        cardEl.style.borderRadius = `${16 * appScale}px`;
        cardEl.style.zIndex = (999990 + idx).toString();
        cardEl.style.transform = 'scale(0.25) rotate(-6deg)';
        cardEl.style.opacity = '0';
        cardEl.style.transition = `all ${emergeDuration}ms cubic-bezier(0.175, 0.885, 0.32, 1.275)`;

        document.body.appendChild(cardEl);
        cardElements.push(cardEl);

        setTimeout(() => {
            cardEl.style.left = `${cardLeft}px`;
            cardEl.style.top = `${cardTop}px`;
            cardEl.style.transform = 'scale(1) rotate(0deg)';
            cardEl.style.opacity = '1';
            try { soundManager.playSfx('card'); } catch(e){}
        }, chestGlowDuration + idx * emergeStagger);
    });

    // Bước 3: Giữ các lá bài ngửa mặt trên bàn 0.5s (500ms) sau khi toàn bộ lá đã bung ra xong
    const allEmergedTime = chestGlowDuration + (cards.length - 1) * emergeStagger + emergeDuration;
    const holdDuration = 500;
    const startFlightTime = allEmergedTime + holdDuration;
    const flyStagger = 40;
    const flyDuration = 220;

    setTimeout(() => {
        // Bước 4: Lướt lần lượt từng lá bài từ vị trí ngửa trên bàn về phía Avatar đối thủ hoặc lá cuối bên phải bộ bài trên tay bản thân
        cardElements.forEach((cardEl, idx) => {
            setTimeout(() => {
                let destX, destY, destTransform, destOpacity;

                if (isRecipient) {
                    // Lướt về lá cuối cùng bên phải bộ bài trên tay mình
                    const handContainer = document.getElementById('handContainer') || document.querySelector('.hand-container');
                    const currentCards = handContainer ? Array.from(handContainer.querySelectorAll('.card:not(.chest-reveal-card)')) : [];

                    if (currentCards.length > 0) {
                        const lastCardEl = currentCards[currentCards.length - 1];
                        const lastRect = lastCardEl.getBoundingClientRect();
                        destX = lastRect.left;
                        destY = lastRect.top;
                    } else if (handContainer) {
                        const hcRect = handContainer.getBoundingClientRect();
                        destX = hcRect.left + (hcRect.width / 2) - (cardW / 2);
                        destY = hcRect.bottom - cardH - 25;
                    } else {
                        destX = (window.innerWidth - cardW) / 2;
                        destY = window.innerHeight - cardH - 25;
                    }
                    destTransform = 'scale(1) rotate(0deg)';
                    destOpacity = '1';
                } else {
                    // Lướt về avatar đối thủ
                    const oppEl = findOpponentElement(playerSocketId, playerUsername, playerUid);
                    const avatarCircle = oppEl ? (oppEl.querySelector('.opponent-avatar-circle') || oppEl) : null;
                    if (avatarCircle) {
                        const aRect = avatarCircle.getBoundingClientRect();
                        destX = aRect.left + (aRect.width / 2) - (cardW / 2);
                        destY = aRect.top + (aRect.height / 2) - (cardH / 2);
                    } else {
                        destX = (window.innerWidth - cardW) / 2;
                        destY = 40;
                    }
                    destTransform = `scale(0.25) rotate(${(idx - (cards.length - 1) / 2) * 15}deg)`;
                    destOpacity = '0.35';
                }

                cardEl.style.transition = `all ${flyDuration}ms cubic-bezier(0.2, 0.8, 0.2, 1)`;
                cardEl.style.left = `${destX}px`;
                cardEl.style.top = `${destY}px`;
                cardEl.style.transform = destTransform;
                cardEl.style.opacity = destOpacity;

                setTimeout(() => {
                    try { soundManager.playSfx('draw_card'); } catch(e){}
                    if (cardEl.parentNode) cardEl.remove();

                    if (isRecipient) {
                        handCards.push(cards[idx]);
                        // Render trực tiếp lá bài xuất hiện ngay vào bộ bài trên tay (không có hiệu ứng bay từ chồng bài rút, không phát sáng)
                        renderHand(false);
                    } else {
                        const oppPlayer = findPlayerInState(playerSocketId, playerUid, playerUsername);
                        if (oppPlayer) {
                            oppPlayer.cardCount = (oppPlayer.cardCount || 0) + 1;
                            renderOpponentsMultiplayer();
                        }
                    }
                }, flyDuration);
            }, idx * flyStagger);
        });

        // Bước 5: Sau khi tất cả các lá bài đã lướt xong, làm mờ và dọn dẹp ánh sáng Rương và nền tối
        const totalFlyTime = (cards.length - 1) * flyStagger + flyDuration + 40;
        setTimeout(() => {
            if (glowingChestEl && glowingChestEl.parentNode) {
                glowingChestEl.style.opacity = '0';
                glowingChestEl.style.transform = 'scale(0.9)';
            }
            if (backdropEl && backdropEl.parentNode) {
                backdropEl.classList.remove('show');
            }
            setTimeout(() => {
                if (glowingChestEl && glowingChestEl.parentNode) glowingChestEl.remove();
                if (backdropEl && backdropEl.parentNode) backdropEl.remove();
                document.body.classList.remove('chest-darken-active');
            }, 200);
        }, totalFlyTime);
    }, startFlightTime);
});

// --- FAVOR (XIN XỎ) LOGIC ---
const favorSelectModal = document.getElementById('favorSelectModal');
const favorAvatarContainer = document.getElementById('favorAvatarContainer');

// Bước 1: Server gửi danh sách người chơi có thể xin bài -> Hiện modal chọn
socket.on('game_favor_select_target', ({ roomId, targets }) => {
    if (!matchState.active) return;
    favorAvatarContainer.innerHTML = '';
    
    if (targets.length === 0) {
        showGameToast('XIN XỎ', 'Không có ai có bài để tặng cho bạn!', 'warning');
        return;
    }
    
    targets.forEach(t => {
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'favor-avatar';
        
        avatarDiv.innerHTML = `
            ${renderTargetAvatarHtml(t)}
            <span class="favor-avatar-name">${t.username}</span>
        `;
        
        avatarDiv.addEventListener('click', () => {
            try { soundManager.playSfx('card'); } catch(e){}
            avatarDiv.classList.add('selected');
            socket.emit('game_favor_pick_target', { roomId: matchState.roomId, targetSocketId: t.socketId, targetUsername: t.username, targetUid: t.uid });
            favorSelectModal.classList.remove('show');
        });
        
        favorAvatarContainer.appendChild(avatarDiv);
    });
    
    favorSelectModal.classList.add('show');
});

// --- SLAP LOGIC ---
const slapTargetSelectModal = document.getElementById('slapTargetSelectModal');
const slapTargetAvatarContainer = document.getElementById('slapTargetAvatarContainer');
const slapTargetSelectTitle = document.getElementById('slapTargetSelectTitle');

socket.on('game_slap_select_target', ({ roomId, targets, bonusTurns, cardId }) => {
    if (!matchState.active) return;
    if (!slapTargetAvatarContainer) return;
    slapTargetAvatarContainer.innerHTML = '';

    if (slapTargetSelectTitle) {
        let label = 'SLAP';
        if (cardId === 'slap2') label = 'SLAP X2';
        if (cardId === 'slap3') label = 'SLAP X3';
        slapTargetSelectTitle.textContent = `CHỌN NGƯỜI CHƠI ĐỂ ${label}`;
    }

    if (!targets || targets.length === 0) {
        showGameToast('SLAP', 'Không có mục tiêu hợp lệ!', 'warning');
        return;
    }

    targets.forEach(t => {
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'favor-avatar';

        const isSelf = (t.socketId === socket.id);

        avatarDiv.innerHTML = `
            ${renderTargetAvatarHtml(t)}
            <span class="favor-avatar-name">${t.username}</span>
        `;

        avatarDiv.addEventListener('click', () => {
            try { soundManager.playSfx('card'); } catch(e){}
            avatarDiv.classList.add('selected');
            socket.emit('game_slap_pick_target', {
                roomId: matchState.roomId,
                targetSocketId: t.socketId,
                targetUsername: t.username,
                targetUid: t.uid
            });
            if (slapTargetSelectModal) slapTargetSelectModal.classList.remove('show');
        });

        slapTargetAvatarContainer.appendChild(avatarDiv);
    });

    if (slapTargetSelectModal) slapTargetSelectModal.classList.add('show');
});

socket.on('game_slap_completed', ({ roomId, attackerSocketId, attackerUsername, targetSocketId, targetUsername, turnsRemaining, isSelf, cardId }) => {
    if (!matchState.active) return;
    if (slapTargetSelectModal) slapTargetSelectModal.classList.remove('show');

    let toastText = '';
    if (isSelf) {
        toastText = `<span class="toast-username">${attackerUsername}</span> tự slap bản thân mình: <b>${turnsRemaining}</b> lượt bốc bài`;
    } else {
        toastText = `<span class="toast-username">${attackerUsername}</span> đã slap <span class="toast-username">${targetUsername}</span>: <b>${turnsRemaining}</b> lượt bốc bài`;
    }
    showGameToast('SLAP', toastText, 'danger');
});

// --- SEETHEOTHERS (NHÌN BÀI) LOGIC ---
const seetheothersTargetSelectModal = document.getElementById('seetheothersTargetSelectModal');
const seetheothersTargetAvatarContainer = document.getElementById('seetheothersTargetAvatarContainer');
const seetheothersTargetSelectTitle = document.getElementById('seetheothersTargetSelectTitle');

socket.on('game_seetheothers_select_target', ({ roomId, targets }) => {
    if (!matchState.active) return;
    if (!seetheothersTargetAvatarContainer) return;
    seetheothersTargetAvatarContainer.innerHTML = '';

    if (!targets || targets.length === 0) {
        showGameToast('NHÌN BÀI', 'Không có ai có bài để nhìn!', 'warning');
        return;
    }

    targets.forEach(t => {
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'favor-avatar';
        avatarDiv.innerHTML = `
            ${renderTargetAvatarHtml(t)}
            <span class="favor-avatar-name">${t.username}</span>
            <span style="font-size: 11px; color: #a1a1aa; margin-top: 2px;">(${t.cardCount || 0} lá)</span>
        `;

        avatarDiv.addEventListener('click', () => {
            try { soundManager.playSfx('card'); } catch(e){}
            avatarDiv.classList.add('selected');
            socket.emit('game_seetheothers_pick_target', {
                roomId: matchState.roomId,
                targetSocketId: t.socketId,
                targetUsername: t.username,
                targetUid: t.uid
            });
            if (seetheothersTargetSelectModal) seetheothersTargetSelectModal.classList.remove('show');
        });

        seetheothersTargetAvatarContainer.appendChild(avatarDiv);
    });

    if (seetheothersTargetSelectModal) seetheothersTargetSelectModal.classList.add('show');
});

// --- INFERNO LOGIC ---
socket.on('game_inferno_select_target', ({ roomId, targets, countToDestroy, cardId }) => {
    if (!matchState.active) return;
    if (!comboTargetSelectModal || !comboTargetAvatarContainer) return;
    comboTargetAvatarContainer.innerHTML = '';

    if (comboTargetSelectTitle) {
        const titleText = (cardId === 'inferno4') ? 'CHỌN MỤC TIÊU THIÊU CHÁY 4 LÁ BÀI' : 'CHỌN MỤC TIÊU THIÊU CHÁY 2 LÁ BÀI';
        comboTargetSelectTitle.textContent = titleText;
    }

    if (!targets || targets.length === 0) {
        showGameToast('INFERNO', 'Không có đối thủ nào có bài để thiêu cháy!', 'warning');
        return;
    }

    targets.forEach(t => {
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'favor-avatar';

        avatarDiv.innerHTML = `
            ${renderTargetAvatarHtml(t)}
            <span class="favor-avatar-name">${t.username}</span>
        `;

        avatarDiv.addEventListener('click', () => {
            try { soundManager.playSfx('card'); } catch(e){}
            avatarDiv.classList.add('selected');
            socket.emit('game_inferno_pick_target', {
                roomId: matchState.roomId,
                targetSocketId: t.socketId,
                targetUsername: t.username,
                targetUid: t.uid
            });
            comboTargetSelectModal.classList.remove('show');
        });

        comboTargetAvatarContainer.appendChild(avatarDiv);
    });

    comboTargetSelectModal.classList.add('show');
});

socket.on('game_inferno_applied', ({ roomId, attackerSocketId, attackerUsername, victimSocketId, victimUsername, victimUid, destroyedCardUids, destroyedCount, targetCardCount, cardId }) => {
    if (!matchState.active) return;
    if (comboTargetSelectModal) comboTargetSelectModal.classList.remove('show');

    // Phát âm thanh inferno.mp3 cho tất cả mọi người khi ngọn lửa sprites1 bắt đầu xuất hiện
    try { soundManager.playSfx('inferno'); } catch(e){}

    // Khóa hành động rút bài/đánh bài cục bộ trong lúc ngọn lửa bùng cháy
    matchState.infernoAnimating = true;

    showGameToast('INFERNO', `<span class="toast-username">${attackerUsername}</span> đã dùng INFERNO thiêu cháy <b>${destroyedCount}</b> lá bài của <span class="toast-username">${victimUsername}</span>!`, 'danger', 4000);

    const isVictim = (victimSocketId === socket.id);

    if (isVictim && Array.isArray(destroyedCardUids) && destroyedCardUids.length > 0) {
        // --- NẠN NHÂN: Hoạt ảnh 1-12 frame ngọn lửa bùng cháy đè background-image y hệt lá Locking ---
        const handContainer = document.getElementById('handContainer');
        if (handContainer) {
            const cardElements = Array.from(handContainer.querySelectorAll('.card'));
            const victimTargetEls = cardElements.filter(el => destroyedCardUids.includes(el.dataset.uid));

            victimTargetEls.forEach(cardEl => {
                const currentBg = getComputedStyle(cardEl).backgroundImage;
                cardEl.dataset.artBg = currentBg;
            });

            animateInfernoSprite(victimTargetEls, 1000, 12, () => {
                handCards = handCards.filter(c => !destroyedCardUids.includes(c.uid));
                renderHand(false);
                matchState.infernoAnimating = false;
            });
        } else {
            handCards = handCards.filter(c => !destroyedCardUids.includes(c.uid));
            renderHand(false);
            matchState.infernoAnimating = false;
        }
    } else {
        // --- NGƯỜI KHÁC: Hoạt ảnh 1-12 frame ngọn lửa bùng cháy trên avatar tròn của nạn nhân ---
        let oppEl = findOpponentElement(victimSocketId, victimUsername, victimUid);
        if (oppEl) {
            const avatarCircle = oppEl.querySelector('.opponent-avatar-circle') || oppEl;
            animateInfernoAvatarSprite(avatarCircle, 1000, 12);
        }

        const victimPlayer = findPlayerInState(victimSocketId, victimUid, victimUsername);
        if (victimPlayer) victimPlayer.cardCount = targetCardCount;

        setTimeout(() => {
            matchState.infernoAnimating = false;
        }, 1150);
    }
});

// --- CONTRAST REFLECTION LOGIC ---
socket.on('game_contrast_reflected', ({ roomId, attackerSocketId, attackerUsername, victimSocketId, victimUsername, attackType, contrastCardUid, attackerUid, victimUid }) => {
    if (!matchState.active) return;

    const contrastCard = { id: 'contrast', name: 'Đảo Nghịch', artIndex: 1 };
    let startRect = null;

    const isVictim = isMeUid(victimUid) || (victimSocketId === socket.id) || isSelfUsername(victimUsername);

    if (isVictim && contrastCardUid) {
        // NẠN NHÂN: Lấy vị trí chính xác của lá contrast trên tay bài để đánh xuống chồng bài
        const handContainer = document.getElementById('handContainer');
        if (handContainer) {
            const cardEl = handContainer.querySelector(`.card[data-uid="${contrastCardUid}"]`);
            if (cardEl) {
                startRect = cardEl.getBoundingClientRect();
            }
        }
        // Xóa lá contrast khỏi tay bài & render lại
        handCards = handCards.filter(c => c.uid !== contrastCardUid);
        saveContrastStates();
        renderHand(false);
    } else {
        // NGƯỜI KHÁC: Lấy vị trí từ avatar của nạn nhân
        const oppEl = findOpponentElement(victimSocketId, victimUsername, victimUid);
        if (oppEl) {
            const avatarCircle = oppEl.querySelector('.opponent-avatar-circle') || oppEl;
            startRect = avatarCircle.getBoundingClientRect();
        }
    }

    // Tự động đánh lá Contrast từ trên tay/avatar xuống chồng bài đã đánh
    animateCardToDiscard(contrastCard, Math.random() * 20 - 10, Math.random() * 20 - 10, startRect);
    try { soundManager.playSfx('contrast'); } catch(e){}

    const attackNames = {
        'locking': 'Khóa bài (Locking)',
        'inferno': 'Thiêu cháy (Inferno)',
        'slap': 'Slap',
        'favor': 'Xin Xỏ',
        'superfavor': 'Super Favor',
        'switch': 'Switch',
        'seetheothers': 'Nhìn Bài',
        'combo_2': 'Combo 2 lá',
        'combo_3': 'Combo 3 lá',
        'attack': 'Tấn Công',
        'tancong': 'Tấn Công'
    };
    const attackText = attackNames[attackType] || attackType;

    showGameToast('ĐẢO NGHỊCH', `<span class="toast-username">${victimUsername}</span> đã đánh <b style="color:#fbbf24;">ĐẢO NGHỊCH</b> phản lại đòn <b>${attackText}</b> của <span class="toast-username">${attackerUsername}</span>!`, 'warning', 5500);
});

// Bước 2a: Nếu tôi là người bị xin -> Bật chế độ chọn bài tặng
socket.on('game_favor_give_card_req', ({ roomId, requesterUsername, isSuperFavor }) => {
    if (!matchState.active) return;
    matchState.favorPickMode = true;
    
    // Thêm viền đỏ phát sáng vào tay bài
    const handWrapper = document.querySelector('.hand-wrapper');
    if (handWrapper) handWrapper.classList.add('favor-hand-glow');
    
    startClientTurnTimer(20, socket.id, matchState.myUsername);
    updateTurnsRemainingBanner(1, null, `Hãy chọn 1 lá bài trên tay để tặng <span class="toast-username">${requesterUsername}</span>! <span class="turn-timer-badge" id="turnTimerBadge"><span id="turnTimerSec">20</span>s</span>`);
    const title = isSuperFavor ? 'SUPER FAVOR' : 'XIN XỎ';
    const msg = isSuperFavor ? `<span class="toast-username">${requesterUsername}</span> dùng Super Favor! Hãy chọn 1 lá để tặng trong 20s.` : `<span class="toast-username">${requesterUsername}</span> xin bạn 1 lá bài! Hãy chọn 1 lá để tặng trong 20s.`;
    showGameToast(title, msg, 'warning');
});

// Bước 2b: Nếu tôi là người xin hoặc người xem -> Dừng đếm ngược, hiện banner chờ đối phương
socket.on('game_favor_waiting', ({ roomId, targetUsername, requesterUsername, isSuperFavor, givenCount, totalCount, remainingCount }) => {
    if (!matchState.active) return;
    favorSelectModal.classList.remove('show'); // Đóng modal nếu đang mở
    stopClientTurnTimer();
    const title = isSuperFavor ? 'SUPER FAVOR' : 'XIN XỎ';

    if (isSuperFavor && typeof totalCount === 'number' && totalCount > 0) {
        const countText = `(<b style="color:#fbbf24;">${givenCount || 0}/${totalCount}</b> đã đưa)`;
        updateTurnsRemainingBanner(1, null, `Đang chờ tất cả người chơi tặng bài cho <span class="toast-username">${requesterUsername}</span> ${countText}...`);
        showGameToast(title, `Đang chờ tất cả người chơi tặng bài cho <span class="toast-username">${requesterUsername}</span> ${countText}`, 'info', 0, 'favor-waiting-toast');
    } else {
        updateTurnsRemainingBanner(1, null, `Đang chờ <span class="toast-username">${targetUsername}</span> tặng 1 lá bài cho <span class="toast-username">${requesterUsername}</span>...`);
        showGameToast(title, `Đang chờ <span class="toast-username">${targetUsername}</span> tặng 1 lá bài cho <span class="toast-username">${requesterUsername}</span>`, 'info', 0, 'favor-waiting-toast');
    }
});

// Bước 3: Hoàn tất -> Hoạt ảnh bài bay
socket.on('game_favor_completed', ({ roomId, giverSocketId, giverUsername, giverUid, receiverSocketId, receiverUsername, receiverUid, card, giverCardCount, receiverCardCount, isSuperFavor, givenCount, totalCount, remainingCount }) => {
    if (!matchState.active) return;
    
    const isGiver = isMeUid(giverUid) || (giverSocketId === socket.id) || isSelfUsername(giverUsername);
    const isReceiver = isMeUid(receiverUid) || (receiverSocketId === socket.id) || isSelfUsername(receiverUsername);
    
    // Tắt chế độ favor nếu là người tặng bài
    if (isGiver) {
        matchState.favorPickMode = false;
        const handWrapper = document.querySelector('.hand-wrapper');
        if (handWrapper) handWrapper.classList.remove('favor-hand-glow');
        stopClientTurnTimer();
    }
    favorSelectModal.classList.remove('show');
    
    // Cập nhật số lượng bài đối thủ
    const giverPlayer = findPlayerInState(giverSocketId, giverUid, giverUsername);
    const receiverPlayer = findPlayerInState(receiverSocketId, receiverUid, receiverUsername);
    if (giverPlayer) giverPlayer.cardCount = giverCardCount;
    if (receiverPlayer) receiverPlayer.cardCount = receiverCardCount;
    
    const title = isSuperFavor ? 'SUPER FAVOR' : 'XIN XỎ';

    if (isSuperFavor && typeof totalCount === 'number' && totalCount > 0) {
        if (remainingCount && remainingCount > 0) {
            const countText = `(<b style="color:#fbbf24;">${givenCount || 0}/${totalCount}</b> đã đưa)`;
            updateTurnsRemainingBanner(1, null, `Đang chờ tất cả người chơi tặng bài cho <span class="toast-username">${receiverUsername}</span> ${countText}...`);
            showGameToast(title, `Đang chờ tất cả người chơi tặng bài cho <span class="toast-username">${receiverUsername}</span> ${countText}`, 'info', 0, 'favor-waiting-toast');
        } else {
            removeGameToast('favor-waiting-toast');
            showGameToast(title, `<span class="toast-username">${receiverUsername}</span> đã nhận đủ tất cả <b>${totalCount}</b> lá bài từ mọi người!`, 'success', 4000);
        }
    } else {
        removeGameToast('favor-waiting-toast');
    }
    
    // Nếu là người tặng: Xóa bài khỏi tay
    if (isGiver) {
        handCards = handCards.filter(c => c.uid !== card.uid);
        renderHand(false);
    }
    
    // Render lại opponent
    renderOpponentsMultiplayer();
    
    // --- HOẠT ẢNH BÀI BAY ---
    animateCardTransfer(giverSocketId, receiverSocketId, card, () => {
        if (isReceiver) {
            handCards.push(card);
            renderHand(false); // Render bài thật
            const newCardEl = document.querySelector('#handContainer > .card:last-child');
            if (newCardEl) {
                newCardEl.classList.add('shake-twice');
            }
        }
    }, giverUid, receiverUid, giverUsername, receiverUsername);
    
    showGameToast(title, `<span class="toast-username">${giverUsername}</span> đã tặng 1 lá bài cho <span class="toast-username">${receiverUsername}</span>`, 'success');
});

socket.on('game_favor_cancelled', () => {
    matchState.favorPickMode = false;
    const handWrapper = document.querySelector('.hand-wrapper');
    if (handWrapper) handWrapper.classList.remove('favor-hand-glow');
    stopClientTurnTimer();
    removeGameToast('favor-waiting-toast');
    if (favorSelectModal) favorSelectModal.classList.remove('show');
});

// --- SEE THE FUTURE LOGIC ---
const seeFutureOverlay = document.getElementById('seeFutureOverlay');
const seeFutureCardsContainer = document.getElementById('seeFutureCardsContainer');
const btnSeeFutureDone = document.getElementById('btnSeeFutureDone');

let seeFutureMiniCards = [];

socket.on('game_see_future', ({ top3, cards }) => {
    matchState.isSeeingFuture = true;
    const seeFutureOverlay = document.getElementById('seeFutureOverlay');
    const seeFutureCardsContainer = document.getElementById('seeFutureCardsContainer');
    const seeFutureCloseBtn = document.getElementById('btnSeeFutureDone');
    
    seeFutureCardsContainer.classList.remove('see-the-others-mode');
    seeFutureCardsContainer.innerHTML = '';
    
    const displayCards = cards || top3 || [];
    const offsetCenter = (displayCards.length - 1) / 2;
    
    displayCards.forEach((cardData, index) => {
        const cardDOM = document.createElement('div');
        // Sử dụng logic render bài hoàn chỉnh với class see-future-card
        cardDOM.className = getCardClass('see-future-card anim-enter', cardData);
        setupCardContent(cardDOM, cardData);
        
        seeFutureCardsContainer.appendChild(cardDOM);
        
        // Remove anim-enter to trigger CSS transition
        setTimeout(() => {
            cardDOM.classList.remove('anim-enter');
        }, 10 + index * 40);
    });
    
    seeFutureOverlay.classList.remove('hidden');
    
    // Gỡ event cũ nếu có, sau đó gán lại
    seeFutureCloseBtn.replaceWith(seeFutureCloseBtn.cloneNode(true));
    document.getElementById('btnSeeFutureDone').addEventListener('click', () => {
        const overlay = document.getElementById('seeFutureOverlay');
        overlay.classList.add('hidden');
        seeFutureCardsContainer.classList.remove('see-the-others-mode');
        matchState.isSeeingFuture = false;
        
        // Phát sự kiện báo server biết đã xem xong
        socket.emit('game_see_future_done', { roomId: matchState.roomId });
    });
});

let alterFutureCardsState = [];
let isInitialAlterRender = false;

socket.on('game_alter_future', ({ top3, cards }) => {
    matchState.isSeeingFuture = true;
    const seeFutureOverlay = document.getElementById('seeFutureOverlay');
    const seeFutureCardsContainer = document.getElementById('seeFutureCardsContainer');
    const seeFutureCloseBtn = document.getElementById('btnSeeFutureDone');
    
    seeFutureCardsContainer.classList.remove('see-the-others-mode');
    seeFutureCardsContainer.innerHTML = '';
    const displayCards = cards || top3 || [];
    alterFutureCardsState = [...displayCards];
    isInitialAlterRender = true;
    let alterFutureDOM = [];
    
    function performSwapAnimation(pos1, pos2) {
        if (pos1 < 0 || pos2 >= alterFutureDOM.length || pos1 === pos2) return;
        
        const card1 = alterFutureDOM[pos1];
        const card2 = alterFutureDOM[pos2];
        
        // 1. First (read initial positions)
        const rect1 = card1.getBoundingClientRect();
        const rect2 = card2.getBoundingClientRect();
        
        // Update state
        const tempState = alterFutureCardsState[pos1];
        alterFutureCardsState[pos1] = alterFutureCardsState[pos2];
        alterFutureCardsState[pos2] = tempState;
        
        const tempDOM = alterFutureDOM[pos1];
        alterFutureDOM[pos1] = alterFutureDOM[pos2];
        alterFutureDOM[pos2] = tempDOM;
        
        // Swap DOM elements
        const sibling1 = card1.nextSibling;
        const sibling2 = card2.nextSibling;
        card1.parentNode.insertBefore(card2, sibling1);
        card2.parentNode.insertBefore(card1, sibling2);
        
        // 2. Last (read new positions)
        const newRect1 = card1.getBoundingClientRect();
        const newRect2 = card2.getBoundingClientRect();
        
        // 3. Invert (calculate differences)
        const deltaX1 = rect1.left - newRect1.left;
        const deltaY1 = rect1.top - newRect1.top;
        const deltaX2 = rect2.left - newRect2.left;
        const deltaY2 = rect2.top - newRect2.top;
        
        // Apply instant transform to old positions
        card1.style.transition = 'none';
        card1.style.transform = `translate(${deltaX1}px, ${deltaY1}px)`;
        card2.style.transition = 'none';
        card2.style.transform = `translate(${deltaX2}px, ${deltaY2}px)`;
        
        // Force reflow
        card1.offsetHeight;
        
        // 4. Play (animate to new positions)
        card1.style.transition = 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)';
        card1.style.transform = 'translate(0, 0)';
        card2.style.transition = 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)';
        card2.style.transform = 'translate(0, 0)';
        
        // Clean up transition after animation
        setTimeout(() => {
            card1.style.transition = 'none';
            card2.style.transition = 'none';
        }, 400);
    }
    
    function renderAlterCards() {
        seeFutureCardsContainer.innerHTML = '';
        alterFutureDOM = [];
        
        alterFutureCardsState.forEach((cardData, index) => {
            const cardDOM = document.createElement('div');
            cardDOM.className = getCardClass('see-future-card anim-enter', cardData);
            setupCardContent(cardDOM, cardData);
            
            setTimeout(() => {
                cardDOM.classList.remove('anim-enter');
            }, 50 + index * 150);
            
            alterFutureDOM.push(cardDOM);
            seeFutureCardsContainer.appendChild(cardDOM);
            
            if (index < alterFutureCardsState.length - 1) {
                const swapBtn = document.createElement('button');
                swapBtn.innerHTML = '&#8644;'; // Mũi tên hai chiều ⇆
                swapBtn.className = 'btn-swap-anim'; // Style qua CSS media queries
                
                swapBtn.onmouseover = () => {
                    swapBtn.style.transform = 'scale(1.15)';
                    swapBtn.style.backgroundColor = '#333';
                    swapBtn.style.boxShadow = '0 0 15px rgba(255, 235, 59, 0.8)';
                };
                swapBtn.onmouseout = () => {
                    swapBtn.style.transform = 'scale(1)';
                    swapBtn.style.backgroundColor = '#1a1a1a';
                    swapBtn.style.boxShadow = '0 0 10px rgba(255, 235, 59, 0.5)';
                };
                
                // The button represents the gap AFTER this index
                // We pass the absolute visual DOM index which is dynamic, but wait!
                // If we bind `index`, it refers to the INITIAL index.
                // It's much safer to find the current pos in alterFutureDOM!
                swapBtn.onclick = () => {
                    // Find the card directly before this button
                    const currentPos = alterFutureDOM.findIndex(c => c.nextSibling === swapBtn);
                    if (currentPos !== -1 && currentPos < alterFutureDOM.length - 1) {
                        performSwapAnimation(currentPos, currentPos + 1);
                    }
                };
                seeFutureCardsContainer.appendChild(swapBtn);
            }
        });
    }

    renderAlterCards();
    seeFutureOverlay.classList.remove('hidden');
    
    seeFutureCloseBtn.replaceWith(seeFutureCloseBtn.cloneNode(true));
    document.getElementById('btnSeeFutureDone').addEventListener('click', () => {
        const overlay = document.getElementById('seeFutureOverlay');
        overlay.classList.add('hidden');
        seeFutureCardsContainer.innerHTML = '';
        matchState.isSeeingFuture = false;
        
        socket.emit('game_alter_future_done', { 
            roomId: matchState.roomId,
            orderedUids: alterFutureCardsState.map(c => c.uid)
        });
    });
});

function spawnSeeFutureMiniCards(playerSocketId, username, count = 3, uid = null) {
    const deckElem = document.getElementById('deckStackElem') || document.getElementById('deckStack') || document.getElementById('centerDeck');
    const startRect = deckElem ? deckElem.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 120, height: 170 };
    
    let oppEl = findOpponentElement(playerSocketId, username, uid);
    
    if (!oppEl) return;
    const avatarCircle = oppEl.querySelector('.opponent-avatar-circle') || oppEl;
    const targetRect = avatarCircle.getBoundingClientRect();
    
    const cardCount = count || 3;
    const step = 20;
    const startOffset = - ((cardCount - 1) * step) / 2;
    
    for (let i = 0; i < cardCount; i++) {
        const flyCard = document.createElement('div');
        flyCard.className = 'card see-future-mini-card-instance';
        flyCard.style.position = 'fixed';
        flyCard.style.left = `${startRect.left}px`;
        flyCard.style.top = `${startRect.top}px`;
        flyCard.style.width = `${startRect.width || 120}px`;
        flyCard.style.height = `${startRect.height || 170}px`;
        
        // Đảm bảo không bị lệch tâm khi thu nhỏ do .card có transform-origin: bottom center
        flyCard.style.transformOrigin = 'center center';
        
        flyCard.style.backgroundImage = `url('${resolveAsset("assets/cards/matsau.jpg")}')`;
        flyCard.style.backgroundSize = 'cover';
        flyCard.style.backgroundPosition = 'center';
        flyCard.style.border = '2px solid #ffffff';
        flyCard.style.borderRadius = window.innerWidth <= 1024 ? '4px' : '12px';
        flyCard.style.boxShadow = '0 10px 25px rgba(0,0,0,0.5)';
        flyCard.style.zIndex = '999999';
        flyCard.style.pointerEvents = 'none';
        flyCard.style.transition = 'none';
        document.body.appendChild(flyCard);
        
        seeFutureMiniCards.push({ el: flyCard, ownerId: playerSocketId, ownerUsername: username, ownerUid: uid });
        
        setTimeout(() => {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    const offset = startOffset + (i * step);
                    const targetX = targetRect.left + (targetRect.width / 2) - ((startRect.width || 120) / 2) + offset;
                    const targetY = targetRect.top + (targetRect.height / 2) - ((startRect.height || 170) / 2);
                    
                    flyCard.style.transition = 'all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)';
                    flyCard.style.left = `${targetX}px`;
                    flyCard.style.top = `${targetY}px`;
                    flyCard.style.transform = 'scale(0.35)';
                });
            });
        }, 150 * i);
    }
}

socket.on('game_see_future_others', ({ playerSocketId, username, count, uid }) => {
    spawnSeeFutureMiniCards(playerSocketId, username, count || 3, uid);
});

socket.on('game_see_future_done_others', ({ playerSocketId, username, uid }) => {
    const deckElem = document.getElementById('deckStackElem') || document.getElementById('deckStack') || document.getElementById('centerDeck');
    const startRect = deckElem ? deckElem.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 120, height: 170 };
    
    const cardsToReturn = seeFutureMiniCards.filter(c => 
        (uid && c.ownerUid === uid) || 
        c.ownerId === playerSocketId || 
        (username && c.ownerUsername === username)
    );
    
    cardsToReturn.forEach((cItem, index) => {
        setTimeout(() => {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    cItem.el.style.transition = 'all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)';
                    cItem.el.style.left = `${startRect.left}px`;
                    cItem.el.style.top = `${startRect.top}px`;
                    cItem.el.style.transform = 'scale(1) rotate(0deg)';
                    cItem.el.style.opacity = '0';
                    
                    setTimeout(() => {
                        if (cItem.el.parentNode) cItem.el.parentNode.removeChild(cItem.el);
                    }, 500);
                });
            });
        }, 100 * index);
    });
    
    seeFutureMiniCards = seeFutureMiniCards.filter(c => 
        (!uid || c.ownerUid !== uid) && 
        c.ownerId !== playerSocketId && 
        (!username || c.ownerUsername !== username)
    );
});

// --- SEE THE OTHERS VIEWING & MINI CARDS ---
let seeTheOthersMiniCards = [];

socket.on('game_see_the_others', ({ targetUsername, targetSocketId, targetUid, cards }) => {
    matchState.isSeeingFuture = true;
    matchState.isSeeingOthers = true;
    const seeFutureOverlay = document.getElementById('seeFutureOverlay');
    const seeFutureCardsContainer = document.getElementById('seeFutureCardsContainer');
    const seeFutureCloseBtn = document.getElementById('btnSeeFutureDone');

    seeFutureCardsContainer.classList.add('see-the-others-mode');
    seeFutureCardsContainer.innerHTML = '';

    const displayCards = cards || [];
    const cardCount = displayCards.length;
    showGameToast('NHÌN BÀI', `Đang xem toàn bộ bài trên tay của <span class="toast-username">${targetUsername}</span> (${cardCount} lá)`, 'info', 4000);

    // Tính kích thước và mức độ đè 60%
    const isMobile = window.innerWidth <= 768;
    const isTablet = window.innerWidth <= 1024;
    let cardW = isMobile ? 120 : (isTablet ? 160 : 200);
    let cardH = Math.round(cardW * 1.4);
    let overlapMargin = -Math.round(cardW * 0.60); // Đè lên nhau 60%

    // Nếu số lượng bài quá nhiều khiến tổng chiều rộng vượt quá màn hình, scale nhẹ lại
    const maxAvailableWidth = window.innerWidth * 0.90;
    const neededWidth = cardW + (cardCount - 1) * (cardW + overlapMargin);
    if (neededWidth > maxAvailableWidth && cardCount > 1) {
        const step = (maxAvailableWidth - cardW) / (cardCount - 1);
        if (step < cardW * 0.2) {
            cardW = Math.max(90, Math.round(cardW * 0.8));
            cardH = Math.round(cardW * 1.4);
            overlapMargin = -Math.round(cardW * 0.60);
        }
    }

    displayCards.forEach((cardData, index) => {
        const cardDOM = document.createElement('div');
        cardDOM.className = getCardClass('see-future-card anim-enter', cardData);
        setupCardContent(cardDOM, cardData);

        cardDOM.style.width = `${cardW}px`;
        cardDOM.style.height = `${cardH}px`;
        cardDOM.style.zIndex = index + 1;
        if (index > 0) {
            cardDOM.style.marginLeft = `${overlapMargin}px`;
        }

        seeFutureCardsContainer.appendChild(cardDOM);

        setTimeout(() => {
            cardDOM.classList.remove('anim-enter');
        }, 10 + index * 30);
    });

    seeFutureOverlay.classList.remove('hidden');

    seeFutureCloseBtn.replaceWith(seeFutureCloseBtn.cloneNode(true));
    document.getElementById('btnSeeFutureDone').addEventListener('click', () => {
        const overlay = document.getElementById('seeFutureOverlay');
        overlay.classList.add('hidden');
        seeFutureCardsContainer.classList.remove('see-the-others-mode');
        seeFutureCardsContainer.innerHTML = '';
        matchState.isSeeingFuture = false;
        matchState.isSeeingOthers = false;

        socket.emit('game_see_the_others_done', { roomId: matchState.roomId });
    });
});

function spawnSeeTheOthersMiniCards(requesterSocketId, requesterUsername, requesterUid, targetSocketId, targetUsername, targetUid, count = 3, isReconnect = false) {
    const isTargetMe = isMePlayer(targetSocketId, targetUid, targetUsername);
    const handCardElements = isTargetMe ? Array.from(document.querySelectorAll('#handContainer > .card')) : [];
    const cardCount = isTargetMe ? Math.max(handCardElements.length, count || 1) : Math.max(1, count || 3);

    // 1. Nếu tôi là người bị xem bài -> ẩn toàn bộ bài trên tay ngay lập tức
    if (isTargetMe) {
        document.body.classList.add('my-hand-being-viewed');
    }

    // 2. Điểm đến: Avatar của người yêu cầu (requester)
    let destRect;
    if (isMePlayer(requesterSocketId, requesterUid, requesterUsername)) {
        const myAvatar = document.querySelector('.my-avatar-circle') || document.getElementById('myAvatar');
        destRect = myAvatar ? myAvatar.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight - 80, width: 60, height: 60 };
    } else {
        const reqOppEl = findOpponentElement(requesterSocketId, requesterUsername, requesterUid);
        if (reqOppEl) {
            const avatarCircle = reqOppEl.querySelector('.opponent-avatar-circle') || reqOppEl;
            destRect = avatarCircle.getBoundingClientRect();
        } else {
            destRect = { left: window.innerWidth / 2, top: 40, width: 60, height: 60 };
        }
    }

    const isMobile = window.innerWidth <= 1024;
    const miniTargetW = isMobile ? 36 : 48;
    const miniTargetH = Math.round(miniTargetW * 1.4);

    for (let i = 0; i < cardCount; i++) {
        let startRect;
        if (isTargetMe) {
            const originalCardEl = handCardElements[i];
            if (originalCardEl) {
                startRect = originalCardEl.getBoundingClientRect();
            } else {
                const hc = document.getElementById('handContainer');
                const hcRect = hc ? hc.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight - 100, width: 120, height: 170 };
                startRect = { left: hcRect.left + i * 30, top: hcRect.top, width: 120, height: 170 };
            }
        } else {
            const targetOppEl = findOpponentElement(targetSocketId, targetUsername, targetUid);
            if (targetOppEl) {
                const cardStack = targetOppEl.querySelector('.cards-stack') || targetOppEl.querySelector('.opponent-avatar-circle') || targetOppEl;
                startRect = cardStack.getBoundingClientRect();
            } else {
                startRect = { left: window.innerWidth / 2, top: 40, width: 40, height: 56 };
            }
        }

        const step = Math.min(15, 80 / cardCount);
        const startOffset = - ((cardCount - 1) * step) / 2;
        const offset = startOffset + (i * step);
        const targetX = destRect.left + (destRect.width / 2) - (miniTargetW / 2) + offset;
        const targetY = destRect.top + (destRect.height / 2) - (miniTargetH / 2);

        const flyCard = document.createElement('div');
        flyCard.className = 'card see-the-others-mini-card-instance';
        flyCard.style.position = 'fixed';
        flyCard.style.transformOrigin = 'center center';
        flyCard.style.backgroundImage = `url('${resolveAsset("assets/cards/matsau.jpg")}')`;
        flyCard.style.backgroundSize = 'cover';
        flyCard.style.backgroundPosition = 'center';
        flyCard.style.border = '2px solid #ffffff';
        flyCard.style.borderRadius = isMobile ? '6px' : '12px';
        flyCard.style.boxShadow = '0 10px 25px rgba(0,0,0,0.6)';
        flyCard.style.zIndex = '999999';
        flyCard.style.pointerEvents = 'none';

        if (isReconnect) {
            // Nếu là F5 reconnect -> đặt bài bay sẵn tại avatar người xem luôn không cần transition
            flyCard.style.left = `${targetX}px`;
            flyCard.style.top = `${targetY}px`;
            flyCard.style.width = `${miniTargetW}px`;
            flyCard.style.height = `${miniTargetH}px`;
            flyCard.style.transform = 'scale(1)';
            flyCard.style.transition = 'none';
        } else {
            // Hiệu ứng bay bình thường từ tay/avatar người bị xem
            flyCard.style.left = `${startRect.left}px`;
            flyCard.style.top = `${startRect.top}px`;
            flyCard.style.width = `${startRect.width || 120}px`;
            flyCard.style.height = `${startRect.height || 170}px`;
            flyCard.style.transition = 'none';
        }

        document.body.appendChild(flyCard);

        seeTheOthersMiniCards.push({
            el: flyCard,
            handCardIndex: i,
            requesterSocketId,
            requesterUsername,
            requesterUid,
            targetSocketId,
            targetUsername,
            targetUid
        });

        if (!isReconnect) {
            setTimeout(() => {
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        flyCard.style.transition = 'all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)';
                        flyCard.style.left = `${targetX}px`;
                        flyCard.style.top = `${targetY}px`;
                        flyCard.style.width = `${miniTargetW}px`;
                        flyCard.style.height = `${miniTargetH}px`;
                        flyCard.style.transform = 'scale(1)';
                    });
                });
            }, 40 * i);
        }
    }
}

socket.on('game_see_the_others_others', ({ requesterSocketId, requesterUsername, requesterUid, targetSocketId, targetUsername, targetUid, count }) => {
    spawnSeeTheOthersMiniCards(requesterSocketId, requesterUsername, requesterUid, targetSocketId, targetUsername, targetUid, count, false);
});

socket.on('game_see_the_others_done_others', ({ requesterSocketId, requesterUsername, requesterUid, targetSocketId, targetUsername, targetUid }) => {
    const isTargetMe = isMePlayer(targetSocketId, targetUid, targetUsername);
    const handCardElements = isTargetMe ? Array.from(document.querySelectorAll('#handContainer > .card')) : [];

    const cardsToReturn = seeTheOthersMiniCards.filter(c => 
        (requesterUid && c.requesterUid === requesterUid) || 
        c.requesterSocketId === requesterSocketId || 
        (requesterUsername && isSelfUsername(requesterUsername) ? isSelfUsername(c.requesterUsername) : c.requesterUsername === requesterUsername)
    );

    cardsToReturn.forEach((cItem, index) => {
        let returnRect;
        if (isTargetMe) {
            const cardEl = handCardElements[cItem.handCardIndex !== undefined ? cItem.handCardIndex : index];
            if (cardEl) {
                returnRect = cardEl.getBoundingClientRect();
            } else {
                const hc = document.getElementById('handContainer');
                returnRect = hc ? hc.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight - 100, width: 120, height: 170 };
            }
        } else {
            const targetOppEl = findOpponentElement(targetSocketId, targetUsername, targetUid);
            if (targetOppEl) {
                const cardStack = targetOppEl.querySelector('.cards-stack') || targetOppEl.querySelector('.opponent-avatar-circle') || targetOppEl;
                returnRect = cardStack.getBoundingClientRect();
            } else {
                returnRect = { left: window.innerWidth / 2, top: 40, width: 40, height: 56 };
            }
        }

        setTimeout(() => {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    cItem.el.style.transition = 'all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)';
                    cItem.el.style.left = `${returnRect.left}px`;
                    cItem.el.style.top = `${returnRect.top}px`;
                    cItem.el.style.width = `${returnRect.width || 120}px`;
                    cItem.el.style.height = `${returnRect.height || 170}px`;
                    cItem.el.style.transform = 'scale(1) rotate(0deg)';
                    if (!isTargetMe) {
                        cItem.el.style.opacity = '0';
                    }

                    setTimeout(() => {
                        if (cItem.el.parentNode) cItem.el.parentNode.removeChild(cItem.el);
                        if (index === cardsToReturn.length - 1) {
                            if (isTargetMe) {
                                document.body.classList.remove('my-hand-being-viewed');
                                renderHand(false);
                            }
                        }
                    }, 500);
                });
            });
        }, 40 * index);
    });

    seeTheOthersMiniCards = seeTheOthersMiniCards.filter(c => 
        (!requesterUid || c.requesterUid !== requesterUid) && 
        c.requesterSocketId !== requesterSocketId && 
        (!requesterUsername || c.requesterUsername !== requesterUsername)
    );
});

// ═══════════════════════════════════════════════
// THE END: Lấy toàn bộ EK lên đầu chồng bài
// ═══════════════════════════════════════════════
socket.on('game_theend', async ({ playerSocketId, username, bombCount, bombList, drawPileCount }) => {
    isCeremonyPlaying = true;
    const isMe = playerSocketId === socket.id;
    const who = isMe ? 'Bạn' : (username || 'Đối thủ');
    showGameToast('THE END!', `${who} đã đặt ${bombCount} lá Mèo Cảm Tử lên đầu chồng bài!`, 'danger', 4000);
    soundManager.playSfx('exploding_kitten');

    const deckElem = document.getElementById('deckStackElem') || document.getElementById('deckStack') || document.getElementById('centerDeck');
    const discardPileElem = document.getElementById('discardPile');
    if (!deckElem || bombCount <= 0) {
        remainingDeckCount = drawPileCount;
        updateStats();
        isCeremonyPlaying = false;
        return;
    }

    const bombs = (Array.isArray(bombList) && bombList.length > 0)
        ? bombList
        : Array.from({ length: bombCount }, () => ({ id: 'exploding_kitten', artIndex: Math.floor(Math.random() * 4) + 1 }));

    const actualCount = bombs.length;

    // Kích thước chuẩn bằng với các lá bài được đánh xuống (Discard Pile / CSS Variable)
    const dpRect = discardPileElem ? discardPileElem.getBoundingClientRect() : null;
    const cardW = (dpRect && dpRect.width > 0)
        ? dpRect.width
        : (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--card-width')) || 120);
    const cardH = (dpRect && dpRect.height > 0)
        ? dpRect.height
        : (parseInt(getComputedStyle(document.documentElement).getPropertyValue('--card-height')) || 168);

    const deckRect = deckElem.getBoundingClientRect();
    const screenCenterX = window.innerWidth / 2;
    const screenCenterY = window.innerHeight / 2;
    
    // Tính toán vị trí xếp mảng bài giữa màn hình
    const maxAllowedW = Math.min(window.innerWidth - 30, 900);
    let stepX = cardW + 12;
    if (actualCount > 1 && (actualCount * cardW + (actualCount - 1) * 12 > maxAllowedW)) {
        stepX = (maxAllowedW - cardW) / (actualCount - 1);
    }
    const totalW = actualCount === 1 ? cardW : (cardW + (actualCount - 1) * stepX);
    const startX = screenCenterX - totalW / 2;
    const bombEls = [];

    // Bước 1: Ngay từ đầu lấy ra từ chồng bài đã HIỆN MẶT TRƯỚC theo ĐÚNG artIndex của từng lá bài
    for (let i = 0; i < actualCount; i++) {
        const bombInfo = bombs[i];
        const artIndex = bombInfo.artIndex || 1;
        const el = document.createElement('div');
        el.className = `card card-exploding_kitten exploding_kitten-art-${artIndex}`;
        el.style.cssText = `position:fixed;left:${deckRect.left}px;top:${deckRect.top}px;width:${cardW}px;height:${cardH}px;z-index:${9000+i};pointer-events:none;border-radius:10px;box-shadow:0 6px 20px rgba(0,0,0,0.4);background-image:url('cards/exploding_kitten/art/${artIndex}.png');background-size:100% 100%;background-position:center;background-repeat:no-repeat;opacity:0;transition:none;`;
        document.body.appendChild(el);
        bombEls.push(el);
        remainingDeckCount = Math.max(0, remainingDeckCount - 1);
        updateStats();

        await new Promise(r => setTimeout(r, 70));
        requestAnimationFrame(() => requestAnimationFrame(() => {
            el.style.transition = 'all 0.5s cubic-bezier(0.2,0.8,0.2,1)';
            el.style.left = (startX + i * stepX) + 'px';
            el.style.top = (screenCenterY - cardH / 2) + 'px';
            el.style.opacity = '1';
            soundManager.playSfx('card');
        }));
    }
    // Giữ nguyên mặt trước ở giữa màn hình cho người chơi quan sát từng hình lá bom
    await new Promise(r => setTimeout(r, 900));

    // Bước 2: Lật úp lại thành mặt sau (assets/cards/matsau.jpg)
    for (const el of bombEls) {
        el.style.transition = 'transform 0.22s ease';
        el.style.transform = 'rotateY(90deg)';
    }
    await new Promise(r => setTimeout(r, 220));
    for (const el of bombEls) {
        el.className = 'card card-back';
        el.style.backgroundImage = `url('${resolveAsset("assets/cards/matsau.jpg")}')`;
        el.style.border = 'none';
        el.style.boxShadow = '0 6px 20px rgba(0,0,0,0.5)';
        el.style.transform = 'rotateY(0deg)';
    }
    await new Promise(r => setTimeout(r, 350));

    // Bước 3: Bay nhét lại vào đầu chồng bài rút
    const freshRect = deckElem.getBoundingClientRect();
    for (let i = 0; i < bombEls.length; i++) {
        const el = bombEls[i];
        el.style.transition = 'all 0.5s cubic-bezier(0.2,0.8,0.2,1)';
        el.style.left = freshRect.left + 'px';
        el.style.top = freshRect.top + 'px';
        el.style.width = (freshRect.width || cardW) + 'px';
        el.style.height = (freshRect.height || cardH) + 'px';
        el.style.opacity = '0.2';
        remainingDeckCount++;
        updateStats();
        soundManager.playSfx('card');
        setTimeout(() => { if (el.parentNode) el.remove(); }, 500);
        await new Promise(r => setTimeout(r, 90));
    }
    // Chờ lá bom cuối cùng bay nhét xong 100% vào chồng bài
    await new Promise(r => setTimeout(r, 500));
    remainingDeckCount = drawPileCount;
    updateStats();

    // Chờ 0.5 giây (500ms) sau khi nhét xong hoàn toàn mới cho phép rút bài
    await new Promise(r => setTimeout(r, 500));
    isCeremonyPlaying = false;
});


let turnTimerInterval = null;
let turnTimerTotalMs = 20000;
let turnTimerRemainingMs = 20000;

function startClientTurnTimer(seconds, socketId, username) {
    if (turnTimerInterval) {
        clearInterval(turnTimerInterval);
        turnTimerInterval = null;
    }

    const totalSeconds = seconds || 20;
    turnTimerTotalMs = totalSeconds * 1000;
    turnTimerRemainingMs = turnTimerTotalMs;

    const renderTimer = () => {
        const secEl = document.getElementById('turnTimerSec');
        const badgeEl = document.getElementById('turnTimerBadge');
        const barEl = document.getElementById('turnTimerProgressBar');

        const currentSec = Math.max(0, Math.ceil(turnTimerRemainingMs / 1000));
        if (secEl) secEl.textContent = currentSec;

        const progressPercent = Math.max(0, Math.min(100, (turnTimerRemainingMs / turnTimerTotalMs) * 100));
        if (barEl) {
            barEl.style.width = progressPercent + '%';
            if (currentSec <= 5) {
                barEl.style.backgroundColor = '#ef4444';
            } else if (currentSec <= 10) {
                barEl.style.backgroundColor = '#facc15';
            } else {
                barEl.style.backgroundColor = '#22c55e';
            }
        }

        if (badgeEl) {
            if (currentSec <= 5) {
                badgeEl.classList.add('urgent');
            } else {
                badgeEl.classList.remove('urgent');
            }
        }
    };

    renderTimer();

    const intervalStep = 100;
    turnTimerInterval = setInterval(() => {
        turnTimerRemainingMs -= intervalStep;
        if (turnTimerRemainingMs <= 0) {
            turnTimerRemainingMs = 0;
            renderTimer();
            clearInterval(turnTimerInterval);
            turnTimerInterval = null;
        } else {
            renderTimer();
        }
    }, intervalStep);
}

function stopClientTurnTimer() {
    if (turnTimerInterval) {
        clearInterval(turnTimerInterval);
        turnTimerInterval = null;
    }
    const secEl = document.getElementById('turnTimerSec');
    const badgeEl = document.getElementById('turnTimerBadge');
    const barEl = document.getElementById('turnTimerProgressBar');
    if (secEl) secEl.textContent = '--';
    if (barEl) {
        barEl.style.width = '100%';
        barEl.style.backgroundColor = '#38bdf8';
    }
    if (badgeEl) badgeEl.classList.remove('urgent');
}

function closeAllTargetModals() {
    const comboTarget = document.getElementById('comboTargetSelectModal');
    const cardType = document.getElementById('cardTypeSelectModal');
    const favorModal = document.getElementById('favorSelectModal');
    const slapModal = document.getElementById('slapTargetSelectModal');
    const seetheothersModal = document.getElementById('seetheothersTargetSelectModal');
    if (comboTarget) comboTarget.classList.remove('show');
    if (cardType) cardType.classList.remove('show');
    if (favorModal) favorModal.classList.remove('show');
    if (slapModal) slapModal.classList.remove('show');
    if (seetheothersModal) seetheothersModal.classList.remove('show');
}

function updateTurnsRemainingBanner(turns, username, customText) {
    const banner = document.getElementById('turnsRemainingBanner');
    if (!banner) return;
    
    if (customText) {
        let content = document.getElementById('turnBannerContent');
        let bar = document.getElementById('turnTimerProgressBar');
        if (!content || !bar) {
            banner.innerHTML = `<div class="turn-banner-content" id="turnBannerContent">${customText}</div><div class="turn-timer-progress-track"><div class="turn-timer-progress-bar" id="turnTimerProgressBar"></div></div>`;
        } else {
            content.innerHTML = customText;
        }
        banner.classList.remove('hidden');
        return;
    }

    if (username) {
        const isSelf = isSelfUsername(username);
        const colorClass = isSelf ? 'toast-username-self' : 'toast-username-opponent';
        
        let turnsHtml = '';
        if (turns > 1) {
            turnsHtml = ` (Còn <span style="color: #ef4444; font-weight: bold; font-size: 1.1rem;">${turns}</span> lượt)`;
        }

        const timerBadgeHtml = `<span class="turn-timer-badge" id="turnTimerBadge"><span id="turnTimerSec">20</span>s</span>`;
        const html = `Tới lượt <span class="${colorClass}">${username}</span> rút bài${turnsHtml} ${timerBadgeHtml}`;
        
        let content = document.getElementById('turnBannerContent');
        let bar = document.getElementById('turnTimerProgressBar');
        if (!content || !bar) {
            banner.innerHTML = `<div class="turn-banner-content" id="turnBannerContent">${html}</div><div class="turn-timer-progress-track"><div class="turn-timer-progress-bar" id="turnTimerProgressBar"></div></div>`;
        } else {
            content.innerHTML = html;
        }
        banner.classList.remove('hidden');
    } else {
        banner.classList.add('hidden');
        stopClientTurnTimer();
    }
}


// --- HỆ THỐNG XẾP HẠNG RANK ---
function getRankInfo(points) {
    const pts = parseInt(points) || 0;
    if (pts >= 1500) return { name: 'Bất bại', icon: 'assets/ranker/batbai.png' };
    if (pts >= 1000) return { name: 'Huyền thoại', icon: 'assets/ranker/huyenthoai.png' };
    if (pts >= 600) return { name: 'Cao thủ', icon: 'assets/ranker/caothu.png' };
    if (pts >= 300) return { name: 'Pro', icon: 'assets/ranker/pro.png' };
    if (pts >= 100) return { name: 'Biết chơi', icon: 'assets/ranker/bietchoi.png' };
    return { name: 'Gà mờ', icon: 'assets/ranker/gamo.png' };
}

function renderPostMatchRankOverlay(rankResults) {
    const overlay = document.getElementById('postMatchRankOverlay');
    const container = document.getElementById('rankPlayersRow');
    if (!overlay || !container) return;
    
    container.innerHTML = '';
    
    const list = (rankResults && Array.isArray(rankResults)) ? rankResults : [];
    if (list.length === 0) {
        // Tuyệt đối không mở overlay Tổng kết nếu không có kết quả Rank (Phòng thường)
        overlay.classList.add('hidden');
        return;
    }
    const sorted = [...list].sort((a, b) => (a.placement || 0) - (b.placement || 0));
    
    sorted.forEach(p => {
        const isSelf = isMeUid(p.uid) || p.socketId === socket.id || isSelfUsername(p.username);
        const finalScore = (p.newScore !== undefined && p.newScore !== null) ? p.newScore : (p.oldScore || 0);
        const rankInfo = getRankInfo(finalScore);
        const deltaVal = p.deltaScore || 0;
        const deltaFormatted = deltaVal >= 0 ? `+${deltaVal}` : `${deltaVal}`;
        const deltaClass = deltaVal >= 0 ? 'delta-plus' : 'delta-minus';
        
        if (isSelf) {
            try {
                localStorage.setItem('cached_rank_score', finalScore.toString());
                localStorage.setItem('cached_rank_title', rankInfo.name);
                localStorage.setItem('cached_rank_icon', rankInfo.icon);
            } catch(e){}
        }

        const card = document.createElement('div');
        card.className = `rank-player-card ${isSelf ? 'is-self' : ''}`;
        
        const avatarHtml = p.avatar ? 
            `<img src="${p.avatar}" class="rank-avatar-img" />` : 
            `<div class="rank-avatar-img rank-avatar-default">
                <svg width="50%" height="50%" viewBox="0 0 24 24" fill="none" stroke="#fffdeb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                </svg>
            </div>`;
        
        card.innerHTML = `
            <div class="rank-avatar-box">
                ${avatarHtml}
                ${p.placement === 1 ? '<span class="rank-winner-tag">WIN</span>' : ''}
            </div>
            <div class="rank-player-name ${isSelf ? 'toast-username-self' : 'toast-username-opponent'}">${p.username || 'Người chơi'}</div>
            <div class="rank-badge-box">
                <img src="${rankInfo.icon}" class="rank-logo-img" alt="${rankInfo.name}" />
                <span class="rank-tier-title">${rankInfo.name}</span>
            </div>
            <div class="rank-score-box">
                <span class="rank-base-score">${finalScore} pts</span>
                <span class="rank-delta-score ${deltaClass}">${deltaFormatted}</span>
            </div>
        `;
        
        container.appendChild(card);
    });
    
    overlay.classList.remove('hidden');
}

function closeRankOverlayAndExit() {
    const overlay = document.getElementById('postMatchRankOverlay');
    if (overlay) overlay.classList.add('hidden');
    // Rời phòng cá nhân độc lập và quay về home.html (không làm ảnh hưởng tới người chơi khác)
    try { socket.emit('leave_room'); } catch(e){}
    returnToHome();
}

const btnCloseRankOverlay = document.getElementById('btnCloseRankOverlay');
if (btnCloseRankOverlay) {
    btnCloseRankOverlay.addEventListener('click', closeRankOverlayAndExit);
}

const btnBottomCloseRankOverlay = document.getElementById('btnBottomCloseRankOverlay');
if (btnBottomCloseRankOverlay) {
    btnBottomCloseRankOverlay.addEventListener('click', closeRankOverlayAndExit);
}

// Tự động phát nhạc nền khi người dùng tương tác lần đầu (fix lỗi browser block autoplay)
const unlockAudioContext = () => {
    if (soundManager.ctx && soundManager.ctx.state === 'suspended') {
        soundManager.ctx.resume().catch(e => {});
    }
    if (settings && settings.music) {
        const p = soundManager.bgmAudio.play();
        if (p !== undefined) {
            p.then(() => {
                document.removeEventListener('click', unlockAudioContext, true);
                document.removeEventListener('touchstart', unlockAudioContext, true);
                document.removeEventListener('keydown', unlockAudioContext, true);
            }).catch(e => {
                console.warn('BGM play still blocked, will retry on next interaction:', e);
            });
        }
    }
};
document.addEventListener('click', unlockAudioContext, true);
document.addEventListener('touchstart', unlockAudioContext, true);
document.addEventListener('keydown', unlockAudioContext, true);

socket.on('game_freeze_activated', ({ roomId, playerSocketId, playerUid, username }) => {
    if (!matchState.active) return;
    try { soundManager.playSfx('freeze_avatar'); } catch(e){}
    const p = findPlayerInState(playerSocketId, playerUid, username);
    if (p) p.isFrozen = true;

    if (isMeUid(playerUid) || playerSocketId === socket.id || isSelfUsername(username)) {
        matchState.isMeFrozen = true;
        renderHand(false);
    } else {
        renderOpponentsMultiplayer();
        // Fallback: đảm bảo overlay hiển thị nếu render bị ghi đè
        const oppEl = findOpponentElement(playerSocketId, username, playerUid);
        if (oppEl) {
            const avatarCircle = oppEl.querySelector('.opponent-avatar-circle');
            if (avatarCircle && !avatarCircle.querySelector('.frozen-avatar-overlay')) {
                avatarCircle.insertAdjacentHTML('beforeend', '<div class="frozen-avatar-overlay"></div>');
            }
        }
    }
});

socket.on('game_freeze_deactivated', ({ roomId, playerSocketId, playerUid, username }) => {
    if (!matchState.active) return;
    try { soundManager.playSfx('freeze_avatar'); } catch(e){}
    const p = findPlayerInState(playerSocketId, playerUid, username);
    if (p) p.isFrozen = false;

    if (isMeUid(playerUid) || playerSocketId === socket.id || isSelfUsername(username)) {
        matchState.isMeFrozen = false;
        renderHand(false);
    } else {
        renderOpponentsMultiplayer();
        // Fallback: đảm bảo overlay biến mất
        const oppEl = findOpponentElement(playerSocketId, username, playerUid);
        if (oppEl) {
            const overlay = oppEl.querySelector('.frozen-avatar-overlay');
            if (overlay) overlay.remove();
        }
    }
});

// --- HOÁN ĐỔI (SWAP) DECK ANIMATION ---
function playSwapDeckAnimation() {
    const deckStack = document.getElementById('deckStackElem');
    if (!deckStack) return;

    // Xóa animation cũ nếu có để tránh trùng lặp
    const oldFlying = deckStack.querySelectorAll('.swap-flying-card');
    oldFlying.forEach(el => el.remove());

    const cardBottom = document.createElement('div');
    cardBottom.className = 'swap-flying-card swap-card-bottom';

    const cardTop = document.createElement('div');
    cardTop.className = 'swap-flying-card swap-card-top';

    // cardBottom được append trước (nằm sau layer deck top), sau đó là cardTop (nằm trước layer deck top)
    deckStack.appendChild(cardBottom);
    deckStack.appendChild(cardTop);

    setTimeout(() => {
        if (cardBottom.parentNode) cardBottom.remove();
        if (cardTop.parentNode) cardTop.remove();

        const countVal = document.getElementById('deckCountVal');
        if (countVal) {
            countVal.classList.remove('count-updated-pulse');
            void countVal.offsetWidth;
            countVal.classList.add('count-updated-pulse');
        }
    }, 520);
}

// ═══════════════════════════════════════════════
// LÁ BÀI DỌN RÁC (GARBAGE COLLECTION)
// ═══════════════════════════════════════════════
socket.on('game_garbage_collection_trigger', async ({ roomId, playerSocketId, username, discardData, totalDiscarded, discardPileCount }) => {
    if (!matchState.active) return;
    isCeremonyPlaying = true;

    const isMe = (playerSocketId === socket.id) || isMeUid(playerSocketId);
    const who = isMe ? 'Bạn' : (username || 'Đối thủ');

    if (totalDiscarded > 0) {
        showGameToast('DỌN RÁC!', `<span class="toast-username">${who}</span> đã kích hoạt Dọn Rác! Đã dọn sạch <b>${totalDiscarded}</b> lá bài vô chức năng!`, 'success', 4000);
    } else {
        showGameToast('DỌN RÁC!', `<span class="toast-username">${who}</span> đã kích hoạt Dọn Rác nhưng không có ai có bài vô chức năng trên tay!`, 'info', 3000);
    }

    const overlay = document.getElementById('garbageCollectionOverlay');
    const trashCan = document.getElementById('garbageTrashCan');
    const trashImg = document.getElementById('garbageTrashImg');

    document.body.classList.add('garbage-collection-active');

    if (overlay) {
        overlay.classList.remove('hidden');
        requestAnimationFrame(() => {
            overlay.style.opacity = '1';
        });
    }

    const NON_FUNCTIONAL_CAT_IDS = [
        'catermelon',
        'rainbowcat',
        'potatocat',
        'zombiecat',
        'tacocat',
        'golemcat',
        'cattea',
        'vampirecat'
    ];

    const trashRect = trashCan
        ? trashCan.getBoundingClientRect()
        : { left: window.innerWidth / 2 - 80, top: window.innerHeight / 2 - 90, width: 160, height: 180 };
    const targetCenterX = trashRect.left + trashRect.width / 2;
    const targetCenterY = trashRect.top + trashRect.height / 2;

    try {
        // 1. Hiệu ứng bài của BẢN THÂN bay vào thùng rác
        const myDiscardCards = handCards.filter(c => c && NON_FUNCTIONAL_CAT_IDS.includes(c.id));
        const handCardElements = Array.from(document.querySelectorAll('#handContainer .card'));
        const usedElements = new Set();

        myDiscardCards.forEach((c, i) => {
            let el = handCardElements.find(elem => elem.dataset.uid === c.uid && !usedElements.has(elem));
            if (!el) {
                el = handCardElements.find(elem => elem.classList.contains(`card-${c.id}`) && !usedElements.has(elem));
            }
            if (el) usedElements.add(el);

            const handWrapper = document.querySelector('.hand-wrapper');
            const startRect = el ? el.getBoundingClientRect() : (handWrapper ? handWrapper.getBoundingClientRect() : { left: window.innerWidth / 2 - 60, top: window.innerHeight - 180, width: 120, height: 168 });

            if (el) {
                el.style.transition = 'opacity 0.2s ease';
                el.style.opacity = '0';
            }

            const clone = document.createElement('div');
            clone.className = `card card-${c.id} ${c.id}-art-${c.artIndex || 1}`;
            clone.style.cssText = `
                position: fixed;
                left: ${startRect.left}px;
                top: ${startRect.top}px;
                width: ${startRect.width}px;
                height: ${startRect.height}px;
                z-index: 10010;
                pointer-events: none;
                box-shadow: 0 8px 24px rgba(0,0,0,0.6);
                border-radius: 10px;
                transition: all 0.75s cubic-bezier(0.22, 1, 0.36, 1);
            `;
            document.body.appendChild(clone);

            setTimeout(() => {
                clone.style.left = `${targetCenterX - startRect.width * 0.25}px`;
                clone.style.top = `${targetCenterY - startRect.height * 0.25}px`;
                clone.style.transform = `scale(0.2) rotate(${Math.random() * 40 - 20}deg)`;
                clone.style.opacity = '0';
            }, i * 120 + 50);

            setTimeout(() => {
                clone.remove();
                if (trashImg) {
                    trashImg.classList.remove('bounce');
                    void trashImg.offsetWidth;
                    trashImg.classList.add('bounce');
                }
                try { soundManager.playSfx('card'); } catch(e){}
            }, i * 120 + 800);
        });

        if (myDiscardCards.length > 0) {
            handCards = handCards.filter(c => !NON_FUNCTIONAL_CAT_IDS.includes(c.id));
            setTimeout(() => {
                renderHand(false);
            }, myDiscardCards.length * 120 + 850);
        }

        // 2. Hiệu ứng bài của ĐỐI THỦ bay vào thùng rác
        if (discardData && typeof discardData === 'object') {
            Object.entries(discardData).forEach(([sid, info]) => {
                const isOppMe = (sid === socket.id) || isMeUid(info.uid) || isSelfUsername(info.username);
                if (isOppMe) return;

                const oppEl = findOpponentElement(sid, info.username, info.uid);
                const oppRect = oppEl ? oppEl.getBoundingClientRect() : null;
                const startX = oppRect ? (oppRect.left + oppRect.width / 2) : (window.innerWidth / 2);
                const startY = oppRect ? (oppRect.top + oppRect.height / 2) : 60;

                const cardsToAnimate = Array.isArray(info.cards) && info.cards.length > 0
                    ? info.cards
                    : Array.from({ length: info.count || 0 }, () => ({ id: 'catermelon', artIndex: 1 }));

                cardsToAnimate.forEach((c, idx) => {
                    const miniCard = document.createElement('div');
                    miniCard.className = `card card-${c.id || 'catermelon'} ${c.id || 'catermelon'}-art-${c.artIndex || 1}`;
                    miniCard.style.cssText = `
                        position: fixed;
                        left: ${startX - 30}px;
                        top: ${startY - 40}px;
                        width: 60px;
                        height: 84px;
                        z-index: 10010;
                        pointer-events: none;
                        box-shadow: 0 4px 16px rgba(0,0,0,0.5);
                        border-radius: 6px;
                        transition: all 0.7s cubic-bezier(0.22, 1, 0.36, 1);
                    `;
                    document.body.appendChild(miniCard);

                    setTimeout(() => {
                        miniCard.style.left = `${targetCenterX - 15}px`;
                        miniCard.style.top = `${targetCenterY - 21}px`;
                        miniCard.style.transform = `scale(0.2) rotate(${Math.random() * 50 - 25}deg)`;
                        miniCard.style.opacity = '0';
                    }, idx * 120 + 60);

                    setTimeout(() => {
                        miniCard.remove();
                        if (trashImg) {
                            trashImg.classList.remove('bounce');
                            void trashImg.offsetWidth;
                            trashImg.classList.add('bounce');
                        }
                        try { soundManager.playSfx('card'); } catch(e){}
                    }, idx * 120 + 780);
                });

                const opp = findPlayerInState(sid, info.uid, info.username);
                if (opp) opp.cardCount = info.remainingCount;
            });

            renderOpponentsMultiplayer();
        }
    } catch (err) {
        console.error('[GarbageCollection] Lỗi hoạt ảnh dọn rác:', err);
    }

    // 3. Kết thúc hiệu ứng dọn rác (luôn chạy sau thời gian hoạt ảnh)
    const animDuration = Math.max(1800, (totalDiscarded || 0) * 120 + 1000);
    setTimeout(() => {
        if (overlay) {
            overlay.style.opacity = '0';
            setTimeout(() => {
                overlay.classList.add('hidden');
            }, 300);
        }
        document.body.classList.remove('garbage-collection-active');
        if (typeof discardPileCount === 'number') {
            discardCount = discardPileCount;
        }
        isCeremonyPlaying = false;
    }, animDuration);
});


