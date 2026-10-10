// Cấu hình các biến môi trường cho Web Client (Frontend)
window.ENV = {
    // Địa chỉ Server kết nối (Localhost hoặc Domain khi deploy)
    SOCKET_URL: 'https://explodingkitten-sever.onrender.com',
    DISCORD_BRIDGE_URL: 'https://discord-meono-thongbao-wenhookapi.onrender.com'
};

// Tự động gửi HTTP Ping kích hoạt cả Game Server và Discord Bot trên Render.com
(function autoWakeupRenderServer() {
    const serverUrl = (window.ENV && window.ENV.SOCKET_URL) ? window.ENV.SOCKET_URL : 'https://explodingkitten-sever.onrender.com';
    const bridgeUrl = (window.ENV && window.ENV.DISCORD_BRIDGE_URL) ? window.ENV.DISCORD_BRIDGE_URL : '';

    function pingTarget(url, name) {
        if (!url || url.includes('localhost') || url.includes('127.0.0.1')) return;
        let attempts = 0;
        const pingUrl = url.endsWith('/') ? url + 'ping' : url + '/ping';

        async function doPing() {
            attempts++;
            try {
                const res = await fetch(pingUrl, { cache: 'no-store' });
                if (res.ok) {
                    console.log(`[WakeUp] ${name} Render đã thức dậy thành công!`);
                    if (name === 'Game Server') {
                        window._isServerAwake = true;
                        window.dispatchEvent(new CustomEvent('server_awake'));
                    }
                    return;
                }
            } catch (e) {
                // Đang gửi tín hiệu đánh thức
            }

            if (attempts < 30) {
                setTimeout(doPing, 3000);
            }
        }
        doPing();
    }

    pingTarget(serverUrl, 'Game Server');
    if (bridgeUrl) {
        pingTarget(bridgeUrl, 'Discord Bridge');
    }

    // Duy trì gửi ping định kỳ mỗi 5 phút để cả Game Server và Discord Bot trên Render không bao giờ bị ngủ khi người chơi đang mở Web
    setInterval(() => {
        if (bridgeUrl) {
            fetch(bridgeUrl.endsWith('/') ? bridgeUrl + 'ping' : bridgeUrl + '/ping', { cache: 'no-store' }).catch(() => {});
        }
        if (serverUrl) {
            fetch(serverUrl.endsWith('/') ? serverUrl + 'ping' : serverUrl + '/ping', { cache: 'no-store' }).catch(() => {});
        }
    }, 5 * 60 * 1000);
})();

