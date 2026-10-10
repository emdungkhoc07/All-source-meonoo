// services/discord_service.js - Xử lý gửi các bản tin Webhook lên Discord
const config = require('../config');

// Lưu thời điểm ưu tiên sử dụng proxy khi IP Render bị Discord 429
let preferProxyUntil = 0;

/**
 * Gửi HTTP POST payload lên Discord Webhook
 * @param {object} payload - Dữ liệu JSON gửi đi
 */
async function sendWebhook(payload) {
  if (!config.DISCORD_WEBHOOK_URL) {
    console.warn('[Discord Service] Chưa cấu hình DISCORD_WEBHOOK_URL!');
    return;
  }

  try {
    const body = {
      allowed_mentions: {
        parse: ['roles', 'users', 'everyone']
      },
      ...payload
    };
    if (config.BOT_NAME) body.username = config.BOT_NAME;
    if (config.BOT_AVATAR) body.avatar_url = config.BOT_AVATAR;

    const directUrl = config.DISCORD_WEBHOOK_URL;
    let proxyUrl = config.DISCORD_PROXY_URL || '';
    if (!proxyUrl && directUrl.includes('discord.com')) {
      proxyUrl = directUrl.replace('discord.com', 'webhook.lewisakura.moe');
    }

    // Ưu tiên gửi qua Cloudflare Proxy để Render vĩnh viễn không bị lỗi 429
    let urlsToTry = [];
    if (proxyUrl && proxyUrl !== directUrl) {
      urlsToTry = [proxyUrl, directUrl];
    } else {
      urlsToTry = [directUrl];
    }

    for (let i = 0; i < urlsToTry.length; i++) {
      const targetUrl = urlsToTry[i];
      const isProxy = (targetUrl === proxyUrl);
      try {
        const res = await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });

        if (res.status === 429) {
          const errText = await res.text().catch(() => '');
          console.warn(`[Discord Service] Gặp Status 429 (Discord chặn IP Render):`, errText);
          // Đánh dấu ưu tiên dùng Proxy trong 15 phút tới để không bị gián đoạn thông báo
          preferProxyUntil = Date.now() + 15 * 60 * 1000;
          if (i < urlsToTry.length - 1) {
            console.log('[Discord Service] Tự động chuyển hướng gửi qua Webhook Proxy...');
            continue;
          }
        }

        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          console.error(`[Discord Service] Gửi webhook thất bại (Status ${res.status}):`, errText);
        } else {
          console.log(`[Discord Service] Đã gửi thông báo lên Discord thành công!${isProxy ? ' (qua Proxy)' : ''}`);
          return;
        }
      } catch (err) {
        console.error(`[Discord Service] Lỗi kết nối gửi webhook (${targetUrl}):`, err.message);
      }
    }
  } catch (err) {
    console.error('[Discord Service] Lỗi chuẩn bị gửi webhook Discord:', err.message);
  }
}

// Màu cam cho khung viền thông báo Discord
const ORANGE_COLOR = 0xe67e22;

/**
 * 1. Khi có 1 người truy cập và mở/chọn vào 1 phòng
 */
async function sendRoomOpened({ hostName, mode, playerCount, maxSeats, roomUrl }) {
  const targetUrl = roomUrl || config.GAME_WEB_URL;
  const roleMention = config.DISCORD_ROLE_TAG ? `${config.DISCORD_ROLE_TAG}` : '';
  const modeText = mode === 'RANK' ? `Đấu Rank ${maxSeats}P` : 'Phòng Thường';

  const text = [
    `🎮 **${hostName}** vừa mở phòng Mèo Nổ!`,
    `👥 Chế độ: **${modeText}** | Số lượng: **${playerCount}/${maxSeats} người**`,
    `🔗 [👉 BẤM VÀO ĐÂY ĐỂ VÀO PHÒNG NGAY](${targetUrl})`
  ].join('\n');

  await sendWebhook({
    content: roleMention || undefined,
    embeds: [
      {
        description: text,
        color: ORANGE_COLOR
      }
    ]
  });
}

/**
 * 2. Mỗi khi có thêm 1 người truy cập web và vào phòng
 */
async function sendPlayerJoined({ newPlayerName, hostName, currentCount, maxSeats }) {
  const text = `🚪 **${newPlayerName}** đã tham gia phòng của **${hostName}** (${currentCount}/${maxSeats} người)`;

  await sendWebhook({
    embeds: [
      {
        description: text,
        color: ORANGE_COLOR
      }
    ]
  });
}

// Cache chống gửi trùng lặp tin nhắn
let lastExplosionKey = '';
let lastExplosionTime = 0;
let lastGameOverMessage = '';
let lastGameOverTime = 0;

/**
 * 3. Mỗi khi có 1 người bị nổ loại trong trận đấu
 */
async function sendPlayerExploded({ playerName, bombCard }) {
  const now = Date.now();
  const dedupKey = `${playerName}`;
  if (lastExplosionKey === dedupKey && (now - lastExplosionTime < 5000)) {
    return;
  }
  lastExplosionKey = dedupKey;
  lastExplosionTime = now;

  const text = [
    `💣 **Quá đớn đau!**`,
    `Người chơi **${playerName}** vừa bị nổ tung!`
  ].join('\n');

  await sendWebhook({
    embeds: [
      {
        description: text,
        color: ORANGE_COLOR
      }
    ]
  });
}

/**
 * 4. Sau mỗi trận đấu kết thúc
 */
async function sendGameOver({ winnerName, winnerDelta, winnerScore, casualties, totalBombsExploded, isRankmatch, participants }) {
  const now = Date.now();
  const dedupKey = `${winnerName}_${winnerScore}_${(casualties || []).map(c => c.username || c).join(',')}`;
  if (lastGameOverMessage === dedupKey && (now - lastGameOverTime < 15000)) {
    console.log('[Discord Service] Bỏ qua gửi trùng lặp Game Over trong 15s');
    return;
  }
  lastGameOverMessage = dedupKey;
  lastGameOverTime = now;

  // Nếu là phòng thường và không có người thắng cụ thể
  if (!isRankmatch && (!winnerName || winnerName === 'Vô danh')) {
    const playersList = Array.isArray(participants) && participants.length > 0 
      ? participants.map(p => `• **${p}**`).join('\n')
      : '';
    const content = [
      `**TRẬN ĐẤU KẾT THÚC**`,
      `Trận đấu đã khép lại an toàn sau những màn tranh tài nảy lửa!`,
      playersList ? `👥 **Người chơi tham gia:**\n${playersList}` : ''
    ].filter(Boolean).join('\n');

    await sendWebhook({
      embeds: [
        {
          description: content,
          color: ORANGE_COLOR
        }
      ]
    });
    return;
  }

  const formatDelta = (d) => {
    if (d === undefined || d === null) return '+0';
    return d >= 0 ? `+${d}` : `${d}`;
  };

  const winnerDeltaStr = formatDelta(winnerDelta);
  const winnerLine = winnerScore !== undefined 
    ? `🥇 Người sống sót : **${winnerName}** ( ${winnerScore} ${winnerDeltaStr} )`
    : `🥇 Người sống sót : **${winnerName}**`;

  // Format danh sách "bị nổ chết" (liệt sĩ)
  let casualtiesLines = [];
  if (Array.isArray(casualties) && casualties.length > 0) {
    casualtiesLines = casualties.map((c) => {
      const name = c.username || c;
      if (c.newScore !== undefined) {
        const cDelta = formatDelta(c.deltaScore);
        return `**${name}** ( ${c.newScore} ${cDelta} )`;
      }
      return `**${name}**`;
    });
  }

  const contentParts = [
    `**TRẬN ĐẤU KẾT THÚC**`,
    winnerLine,
    `💀 Bị nổ chết: `,
    casualtiesLines.length > 0 ? casualtiesLines.join('\n') : '(Không có)'
  ];

  const content = contentParts.join('\n');

  await sendWebhook({
    embeds: [
      {
        description: content,
        color: ORANGE_COLOR
      }
    ]
  });
}

module.exports = {
  sendWebhook,
  sendRoomOpened,
  sendPlayerJoined,
  sendPlayerExploded,
  sendGameOver
};
