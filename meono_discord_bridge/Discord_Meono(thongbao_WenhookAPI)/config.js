require('dotenv').config();

module.exports = {
  DISCORD_WEBHOOK_URL: process.env.DISCORD_WEBHOOK_URL || 'https://discord.com/api/webhooks/1552391179486892092/9L0zh_OVFOgfvtNLN8jPcQbwFMbJxhm7PHmdDk51-e_sq2JWLuOfdqypeUZjmnQFD0up',
  GAME_SERVER_URL: process.env.GAME_SERVER_URL || 'https://explodingkitten-sever.onrender.com',
  GAME_WEB_URL: process.env.GAME_WEB_URL || 'http://meono.vercel.app/home.html',
  DISCORD_ROLE_TAG: process.env.DISCORD_ROLE_TAG || '@exp',
  BOT_NAME: process.env.BOT_NAME || '',
  BOT_AVATAR: process.env.BOT_AVATAR || '',
  DISCORD_PROXY_URL: process.env.DISCORD_PROXY_URL || 'https://meono-discord-proxy.nguyenthevi22122k7.workers.dev/api/webhooks/1552391179486892092/9L0zh_OVFOgfvtNLN8jPcQbwFMbJxhm7PHmdDk51-e_sq2JWLuOfdqypeUZjmnQFD0up'
};
