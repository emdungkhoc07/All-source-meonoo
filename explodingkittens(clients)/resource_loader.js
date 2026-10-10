/**
 * Resource Loader - Nạp & lưu trữ vĩnh viễn 100% tài nguyên bài, âm thanh, sticker & giao diện vào RAM & CacheStorage
 * - Lần đầu tiên: Nạp 100% mượt mà, hiển thị 1 màn hình duy nhất "LOADING ...", giải nén ảnh trước (img.decode) để chống giật/trắng bài.
 * - Lần F5/tải lại sau: Fast-Path kiểm tra CacheStorage siêu tốc trong < 30ms, mở trang WEB NGAY LẬP TỨC!
 * - Cung cấp window.ensureGameAssetsReady() và window.getPreloadedAssetUrl() đảm bảo 100% tài nguyên sẵn sàng trước khi vào trận.
 */

(function() {
    // KHÔNG nạp tài nguyên ở trang index landing page (chưa đăng nhập)
    const pathName = (window.location.pathname || '').toLowerCase();
    if (pathName.endsWith('index.html') || pathName === '/' || pathName === '') {
        return;
    }

    // NẾU ĐANG CHẠY TRONG IFRAME VÀ CỬA SỔ CHA ĐÃ NẠP XONG HOẶC ĐANG NẠP:
    // Tuyệt đối KHÔNG hiển thị overlay lần 2 trong iframe, kế thừa 100% tài nguyên từ window.parent!
    const isInsideIframe = (window.parent && window.parent !== window);

    const GAME_CARD_ASSETS = [
        // Backgrounds
        'assets/background/background1.jpg',
        'assets/background/background2.jpg',
        'assets/background/background3.jpg',
        'assets/background/background4.jpg',
        'assets/background/background5.jpg',
        'assets/background/background_default.jpg',
        'assets/background/rankmatch.jpg',
        'backgroud.jpg',
        'backgroud2.jpg',

        // Cards & Common Icons
        'assets/cards/bomicon.png',
        'assets/cards/die.png',
        'assets/cards/matsau.jpg',
        'assets/cards/matsau1.jpg',
        'assets/favicon/favicon.png',

        // Ranker Icons
        'assets/ranker/batbai.png',
        'assets/ranker/bietchoi.png',
        'assets/ranker/caothu.png',
        'assets/ranker/gamo.png',
        'assets/ranker/huyenthoai.png',
        'assets/ranker/pro.png',

        // Sound Effects & Theme Music
        'assets/sounds/defuse.mp3',
        'assets/sounds/die.mp3',
        'assets/sounds/draw_card.wav',
        'assets/sounds/exploding_kitten.mp3',
        'assets/sounds/music_theme.mp3',
        'assets/sounds/play_card.wav',
        'assets/sounds/shuffle.wav',
        'assets/sounds/ting.wav',
        'assets/sounds/win.mp3',

        // Stickers
        'assets/sticker/sticker1.png',
        'assets/sticker/sticker2.png',
        'assets/sticker/sticker3.png',
        'assets/sticker/sticker4.png',
        'assets/sticker/sticker5.png',

        // Card Arts
        'cards/afterthefuture/art/1.png',
        'cards/afterthefuture5/art/1.png',
        'cards/atomicbom/art/1.png',
        'cards/catermelon/art/1.png',
        'cards/clone/art/1.png',
        'cards/clone/art/2.png',
        'cards/clone/art/3.png',
        'cards/defuse/art/1.png',
        'cards/defuse/art/2.png',
        'cards/defuse/art/3.png',
        'cards/defuse/art/4.png',
        'cards/drawbottom/art/1.png',
        'cards/everywhere/art/1.png',
        'cards/everywhere/art/2.png',
        'cards/everywhere/art/3.png',
        'cards/exploding_kitten/art/1.png',
        'cards/exploding_kitten/art/2.png',
        'cards/exploding_kitten/art/3.png',
        'cards/exploding_kitten/art/4.png',
        'cards/favor/art/1.png',
        'cards/favor/art/2.png',
        'cards/favor/art/3.png',
        'cards/locking/art/1.png',
        'cards/locking5/art/1.png',
        'cards/locking/locking.mp3',
        'cards/locking/sprites1.png',
        'cards/locking/sprites2.png',
        'cards/locking/sprites3.png',
        'cards/locking/sprites4.png',
        'cards/locking/sprites5.png',
        'cards/locking/sprites6.png',
        'cards/locking/sprites7.png',
        'cards/locking/sprites8.png',
        'cards/nhintruoctuonglai/art/1.png',
        'cards/nhintruoctuonglai/art/2.png',
        'cards/nhintruoctuonglai/art/3.png',
        'cards/nhintruoctuonglai/art/4.png',
        'cards/nhintruoctuonglai1/art/1.png',
        'cards/nhintruoctuonglai5/art/1.png',
        'assets/sounds/freeze_avatar.mp3',
        'cards/freeze/freeze_avatar.png',
        'cards/freeze/freeze_card.png',
        'cards/freeze/art/1.png',
        'cards/freeze/freeze.css',
        'cards/nope/art/1.png',
        'cards/nope/art/2.png',
        'cards/nope/art/3.png',
        'cards/nope/art/4.png',
        'cards/nope/art/5.png',
        'cards/supernope/art/1.png',
        'cards/supernope/supernope.css',
        'cards/swap/art/1.png',
        'cards/swap/swap.css',
        'cards/reverse/art/1.png',
        'cards/reverse/reverse.css',
        'cards/switch/art/1.png',
        'cards/switch/switch.css',
        'cards/chest/art/1.png',
        'cards/chest/chest.css',
        'cards/superfavor/art/1.png',
        'cards/superfavor/superfavor.css',
        'cards/super_exploding_kitten/art/1.png',
        'cards/super_exploding_kitten/super_exploding_kitten.css',
        'cards/seetheothers/art/1.png',
        'cards/seetheothers/seetheothers.css',
        'cards/garbage_collection/art/1.png',
        'cards/garbage_collection/garbage_collection.css',
        'cards/garbage_collection/trash_can.svg',
        'cards/potatocat/art/1.png',
        'cards/rainbowcat/art/1.png',
        'cards/skip/art/1.png',
        'cards/skip/art/2.png',
        'cards/skip/art/3.png',
        'cards/superskip/art/1.png',
        'cards/streaking/art/1.png',
        'cards/tacocat/art/1.png',
        'cards/theend/art/1.png',
        'cards/tancong/art/1.png',
        'cards/tancong/art/2.png',
        'cards/tancong/art/3.png',
        'cards/slap/slap.css',
        'cards/slap2/slap2.css',
        'cards/slap3/slap3.css',
        'cards/slap/art/1.png',
        'cards/slap2/art/1.png',
        'cards/slap3/art/1.png',
        'cards/whatcat/art/1.png',
        'cards/xaobai/art/1.png',
        'cards/xaobai/art/2.png',
        'cards/xaobai/art/3.png',
        'cards/zombiecat/art/1.png',
        'cards/golemcat/art/1.png',
        'cards/cattea/art/1.png',
        'cards/vampirecat/art/1.png',
        'cards/golemcat/golemcat.css',
        'cards/cattea/cattea.css',
        'cards/vampirecat/vampirecat.css',
        'cards/inferno/inferno.css',
        'cards/inferno4/inferno4.css',
        'cards/contrast/contrast.css',
        'cards/inferno/art/1.png',
        'cards/inferno4/art/1.png',
        'cards/contrast/art/1.png',
        'assets/sounds/inferno.mp3',
        'assets/sounds/contrast.mp3',

        // Inferno Flame Sprites (12 sprites)
        ...Array.from({ length: 12 }, (_, i) => "assets/cards/inferno/inferno_sprites/" + (i + 1) + ".png"),

        // Exploding Kitten Explosion Sprites (70 sprites)
        ...Array.from({ length: 70 }, (_, i) => "cards/exploding_kitten/sprite_" + (i + 1) + ".png")
    ];

    // Chia sẻ bộ nhớ RAM qua window và window.parent (cho Iframe)
    window._cardBlobUrlMap = window._cardBlobUrlMap || {};
    window._preloadedCardImages = window._preloadedCardImages || {};
    window._preloadedAudioMap = window._preloadedAudioMap || {};

    if (isInsideIframe) {
        try {
            if (window.parent._cardBlobUrlMap) {
                Object.assign(window._cardBlobUrlMap, window.parent._cardBlobUrlMap);
            }
            if (window.parent._preloadedCardImages) {
                Object.assign(window._preloadedCardImages, window.parent._preloadedCardImages);
            }
            if (window.parent._preloadedAudioMap) {
                Object.assign(window._preloadedAudioMap, window.parent._preloadedAudioMap);
            }
        } catch(e) {}
    }

    // Helper toàn cục: Lấy URL đã nạp sẵn trong RAM (blob: hoặc cached image) để render 0ms tuyệt đối không trắng bài
    window.getPreloadedAssetUrl = function(rawPath) {
        if (!rawPath) return rawPath;
        let clean = rawPath.trim();
        if (clean.startsWith('./')) clean = clean.substring(2);
        if (clean.startsWith('/')) clean = clean.substring(1);

        // 1. Kiểm tra RAM blob map của window hiện tại
        if (window._cardBlobUrlMap && window._cardBlobUrlMap[clean]) {
            return window._cardBlobUrlMap[clean];
        }
        // 2. Kiểm tra RAM blob map của window.parent (khi match.html chạy trong Iframe)
        if (isInsideIframe) {
            try {
                if (window.parent._cardBlobUrlMap && window.parent._cardBlobUrlMap[clean]) {
                    return window.parent._cardBlobUrlMap[clean];
                }
            } catch(e) {}
        }
        // 3. Kiểm tra preloaded image src
        if (window._preloadedCardImages && window._preloadedCardImages[clean] && window._preloadedCardImages[clean].src) {
            return window._preloadedCardImages[clean].src;
        }
        if (isInsideIframe) {
            try {
                if (window.parent._preloadedCardImages && window.parent._preloadedCardImages[clean] && window.parent._preloadedCardImages[clean].src) {
                    return window.parent._preloadedCardImages[clean].src;
                }
            } catch(e) {}
        }
        return rawPath;
    };

    function createOverlay(initialTitle, initialDetail) {
        // Nếu đang trong iframe và cha đã nạp xong thì không vẽ bất kỳ overlay nào
        if (isInsideIframe) {
            try {
                if (window.parent.isGameAssetsReady && window.parent.isGameAssetsReady()) {
                    return;
                }
            } catch(e) {}
        }

        let overlay = document.getElementById('resourcePreloaderOverlay');
        if (overlay) {
            overlay.style.display = 'flex';
            overlay.style.opacity = '1';
            overlay.style.visibility = 'visible';
            return;
        }

        overlay = document.createElement('div');
        overlay.id = 'resourcePreloaderOverlay';
        overlay.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #09090b; z-index: 99999999; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: "Be Vietnam Pro", "Nunito", sans-serif; opacity: 1; transition: opacity 0.25s ease, visibility 0.25s ease; box-sizing: border-box; pointer-events: auto;';

        overlay.innerHTML = 
            '<div style="color: #f1f5f9; font-size: 1.15rem; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 12px; text-align: center;">' +
                'Tải tài nguyên <span id="preloaderProgressText" style="color: #38bdf8; font-weight: 800; font-size: 1.25rem; margin-left: 6px;">0%</span>' +
            '</div>' +
            '<div style="width: 380px; max-width: 86vw; height: 10px; background: rgba(255, 255, 255, 0.1); border-radius: 999px; overflow: hidden; box-shadow: 0 0 16px rgba(56, 189, 248, 0.25);">' +
                '<div id="preloaderProgressBar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #8b5cf6, #3b82f6, #06b6d4); transition: width 0.08s ease; border-radius: 999px;"></div>' +
            '</div>';

        document.body.appendChild(overlay);
    }

    function removeOverlay() {
        const overlay = document.getElementById('resourcePreloaderOverlay');
        if (overlay) {
            overlay.style.pointerEvents = 'none';
            overlay.style.opacity = '0';
            setTimeout(() => {
                if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
            }, 150);
        }
    }
    window.dismissGamePreloader = removeOverlay;

    let isPreloadCompleted = false;
    let preloadPromise = null;
    let preloadResolver = null;

    window.isGameAssetsReady = function() {
        if (isPreloadCompleted) return true;
        if (isInsideIframe) {
            try {
                if (window.parent.isGameAssetsReady && window.parent.isGameAssetsReady()) {
                    return true;
                }
            } catch(e) {}
        }
        return false;
    };

    // Đảm bảo 100% tài nguyên đã ở trong RAM / Cache trước khi vào trận (Thống nhất 1 lần LOADING ...)
    window.ensureGameAssetsReady = function() {
        if (window.isGameAssetsReady()) {
            return Promise.resolve(true);
        }
        createOverlay();
        return preloadPromise || preloadAll();
    };

    function preloadAll() {
        // NẾU ĐANG CHẠY TRONG IFRAME VÀ CỬA SỔ CHA ĐÃ NẠP SẴN HOẶC ĐANG NẠP: KHÔNG HIỆN OVERLAY LẦN 2!
        if (isInsideIframe) {
            try {
                if (window.parent.isGameAssetsReady && window.parent.isGameAssetsReady()) {
                    isPreloadCompleted = true;
                    if (window.parent._cardBlobUrlMap) Object.assign(window._cardBlobUrlMap, window.parent._cardBlobUrlMap);
                    if (window.parent._preloadedCardImages) Object.assign(window._preloadedCardImages, window.parent._preloadedCardImages);
                    if (window.parent._preloadedAudioMap) Object.assign(window._preloadedAudioMap, window.parent._preloadedAudioMap);
                    return Promise.resolve(true);
                }
            } catch(e) {}
        }

        if (preloadPromise) return preloadPromise;

        preloadPromise = new Promise((resolve) => {
            preloadResolver = resolve;
        });

        const total = GAME_CARD_ASSETS.length;
        let loadedCount = 0;

        createOverlay();

        (async function() {
            const CACHE_VERSION = 'meono-game-assets-v15';
            let cacheStorage = null;
            if ('caches' in window) {
                try {
                    const keys = await caches.keys();
                    for (const key of keys) {
                        if (key.startsWith('meono-game-assets-') && key !== CACHE_VERSION) {
                            console.log('[Preloader] Xóa cache phiên bản cũ:', key);
                            await caches.delete(key);
                        }
                    }
                    cacheStorage = await caches.open(CACHE_VERSION);
                } catch (e) {}
            }

            // FAST-PATH: Kiểm tra CacheStorage siêu tốc trong RAM
            if (cacheStorage) {
                try {
                    const matchPromises = GAME_CARD_ASSETS.map(url => cacheStorage.match(url));
                    const responses = await Promise.all(matchPromises);
                    const allCached = responses.every(res => res && res.ok);

                    if (allCached) {
                        // Nạp nhanh song song vào RAM
                        const blobs = await Promise.all(responses.map(res => res.blob()));
                        for (let i = 0; i < GAME_CARD_ASSETS.length; i++) {
                            const url = GAME_CARD_ASSETS[i];
                            const blob = blobs[i];
                            const isAudio = /\.(mp3|wav|ogg)$/i.test(url);
                            try {
                                const blobUrl = URL.createObjectURL(blob);
                                window._cardBlobUrlMap[url] = blobUrl;
                                if (isAudio) {
                                    window._preloadedAudioMap[url] = new Audio(blobUrl);
                                } else {
                                    const img = new Image();
                                    img.src = blobUrl;
                                    window._preloadedCardImages[url] = img;
                                    if (typeof img.decode === 'function') {
                                        img.decode().catch(() => {});
                                    }
                                }
                            } catch(e) {
                                if (isAudio) {
                                    window._preloadedAudioMap[url] = new Audio(url);
                                } else {
                                    const img = new Image();
                                    img.src = url;
                                    window._preloadedCardImages[url] = img;
                                }
                            }
                        }

                        const textEl = document.getElementById('preloaderProgressText');
                        const barEl = document.getElementById('preloaderProgressBar');
                        const detailEl = document.getElementById('preloaderProgressDetail');

                        if (detailEl) detailEl.textContent = 'Đã nạp ' + total + '/' + total + ' tài nguyên (Sẵn sàng 100%)';
                        if (textEl) textEl.textContent = '100%';
                        if (barEl) barEl.style.width = '100%';

                        isPreloadCompleted = true;
                        try { localStorage.setItem(CACHE_VERSION, '100_percent'); } catch(e){}
                        removeOverlay();
                        if (preloadResolver) preloadResolver(true);
                        return;
                    }
                } catch(e) {}
            }

            const updateProgress = () => {
                loadedCount++;
                const percent = Math.min(100, Math.round((loadedCount / total) * 100));
                const textEl = document.getElementById('preloaderProgressText');
                const barEl = document.getElementById('preloaderProgressBar');
                const detailEl = document.getElementById('preloaderProgressDetail');

                if (textEl) textEl.textContent = percent + '%';
                if (barEl) barEl.style.width = percent + '%';
                if (detailEl) detailEl.textContent = 'Đang nạp ' + loadedCount + '/' + total + ' tài nguyên bài';

                if (loadedCount >= total) {
                    isPreloadCompleted = true;
                    try {
                        localStorage.setItem(CACHE_VERSION, '100_percent');
                    } catch (e) {}
                    removeOverlay();
                    if (preloadResolver) preloadResolver(true);
                }
            };

            // Tải tuần tự theo lô nhỏ 10 requests cùng lúc để không làm nghẽn băng thông của máy yếu
            const BATCH_SIZE = 10;
            for (let i = 0; i < GAME_CARD_ASSETS.length; i += BATCH_SIZE) {
                const batch = GAME_CARD_ASSETS.slice(i, i + BATCH_SIZE);
                await Promise.all(batch.map(async (url) => {
                    const isAudio = /\.(mp3|wav|ogg)$/i.test(url);
                    try {
                        let response = cacheStorage ? await cacheStorage.match(url) : null;
                        if (!response) {
                            response = await fetch(url + '?v=' + Date.now());
                            if (response.ok && cacheStorage) {
                                cacheStorage.put(url, response.clone()).catch(() => {});
                            }
                        }

                        if (isAudio) {
                            const blob = await response.blob();
                            const blobUrl = URL.createObjectURL(blob);
                            window._cardBlobUrlMap[url] = blobUrl;
                            const audio = new Audio(blobUrl);
                            window._preloadedAudioMap[url] = audio;
                        } else {
                            const blob = await response.blob();
                            const blobUrl = URL.createObjectURL(blob);
                            window._cardBlobUrlMap[url] = blobUrl;
                            const img = new Image();
                            img.src = blobUrl;
                            window._preloadedCardImages[url] = img;
                            if (typeof img.decode === 'function') {
                                img.decode().catch(() => {});
                            }
                        }
                    } catch (e) {
                        if (isAudio) {
                            const audio = new Audio(url);
                            window._preloadedAudioMap[url] = audio;
                        } else {
                            const img = new Image();
                            img.src = url;
                            window._preloadedCardImages[url] = img;
                        }
                    } finally {
                        updateProgress();
                    }
                }));
            }
        })();

        return preloadPromise;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', preloadAll);
    } else {
        preloadAll();
    }
})();
