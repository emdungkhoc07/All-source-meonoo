// app.js - Logic cho Trình Biên Tập Decks Rankmatch Meono Studio

// Dữ liệu mặc định ban đầu (Embedded fallback chuẩn N x 12 lá)
const DEFAULT_DECKS_DATA = {
  "2": {
    "waitNope": 2,
    "deck": {
      "exploding_kitten": 2,
      "defuse": 3,
      "nope": 2,
      "nhintruoctuonglai": 2,
      "xaobai": 2,
      "tancong": 1,
      "skip": 2,
      "favor": 1,
      "tacocat": 3,
      "zombiecat": 3,
      "rainbowcat": 3
    }
  },
  "3": {
    "waitNope": 2,
    "deck": {
      "exploding_kitten": 3,
      "defuse": 4,
      "nope": 3,
      "nhintruoctuonglai": 3,
      "xaobai": 2,
      "tancong": 2,
      "skip": 3,
      "favor": 2,
      "tacocat": 4,
      "zombiecat": 4,
      "rainbowcat": 3,
      "catermelon": 3
    }
  },
  "4": {
    "waitNope": 2,
    "deck": {
      "exploding_kitten": 4,
      "defuse": 6,
      "nope": 4,
      "nhintruoctuonglai": 3,
      "nhintruoctuonglai1": 2,
      "xaobai": 2,
      "tancong": 2,
      "skip": 3,
      "favor": 4,
      "tacocat": 4,
      "zombiecat": 4,
      "rainbowcat": 4,
      "catermelon": 3,
      "potatocat": 3
    }
  },
  "5": {
    "waitNope": 2,
    "deck": {
      "exploding_kitten": 5,
      "streaking": 1,
      "defuse": 7,
      "nope": 2,
      "nhintruoctuonglai": 2,
      "xaobai": 2,
      "tancong": 1,
      "skip": 2,
      "favor": 2,
      "clone": 1,
      "drawbottom": 1,
      "everywhere": 1,
      "whatcat": 1,
      "theend": 1,
      "locking": 1,
      "slap": 1,
      "inferno": 1,
      "contrast": 1,
      "freeze": 1,
      "swap": 1,
      "reverse": 1,
      "switch": 1,
      "chest": 1,
      "garbage_collection": 1,
      "tacocat": 5,
      "zombiecat": 5,
      "rainbowcat": 5,
      "catermelon": 4,
      "potatocat": 4
    }
  },
  "6": {
    "waitNope": 2,
    "deck": {
      "exploding_kitten": 6,
      "streaking": 1,
      "defuse": 8,
      "nope": 3,
      "nhintruoctuonglai": 2,
      "nhintruoctuonglai1": 1,
      "afterthefuture": 1,
      "xaobai": 2,
      "tancong": 2,
      "skip": 2,
      "favor": 2,
      "clone": 1,
      "drawbottom": 1,
      "everywhere": 1,
      "whatcat": 1,
      "theend": 1,
      "locking": 1,
      "slap": 1,
      "slap2": 1,
      "inferno": 1,
      "contrast": 1,
      "freeze": 1,
      "swap": 1,
      "reverse": 1,
      "switch": 1,
      "chest": 1,
      "seetheothers": 1,
      "garbage_collection": 1,
      "tacocat": 5,
      "zombiecat": 5,
      "rainbowcat": 5,
      "catermelon": 4,
      "potatocat": 4,
      "golemcat": 4
    }
  },
  "7": {
    "waitNope": 3,
    "deck": {
      "exploding_kitten": 7,
      "atomicbom": 1,
      "streaking": 1,
      "defuse": 9,
      "nope": 3,
      "nhintruoctuonglai": 2,
      "nhintruoctuonglai1": 1,
      "nhintruoctuonglai5": 1,
      "afterthefuture": 1,
      "xaobai": 2,
      "tancong": 2,
      "skip": 2,
      "favor": 2,
      "clone": 2,
      "drawbottom": 2,
      "everywhere": 1,
      "whatcat": 1,
      "theend": 1,
      "locking": 1,
      "locking5": 1,
      "slap": 1,
      "slap2": 1,
      "inferno": 1,
      "contrast": 2,
      "freeze": 1,
      "swap": 1,
      "reverse": 1,
      "switch": 1,
      "chest": 1,
      "seetheothers": 1,
      "garbage_collection": 1,
      "tacocat": 5,
      "zombiecat": 5,
      "rainbowcat": 5,
      "catermelon": 4,
      "potatocat": 4,
      "golemcat": 4,
      "cattea": 4
    }
  },
  "8": {
    "waitNope": 3,
    "deck": {
      "exploding_kitten": 7,
      "super_exploding_kitten": 1,
      "atomicbom": 1,
      "streaking": 1,
      "defuse": 10,
      "nope": 3,
      "supernope": 1,
      "nhintruoctuonglai": 1,
      "nhintruoctuonglai1": 1,
      "nhintruoctuonglai5": 1,
      "afterthefuture": 1,
      "afterthefuture5": 1,
      "xaobai": 2,
      "tancong": 2,
      "skip": 2,
      "superskip": 1,
      "favor": 2,
      "superfavor": 1,
      "clone": 2,
      "drawbottom": 1,
      "everywhere": 1,
      "whatcat": 1,
      "theend": 1,
      "locking": 1,
      "locking5": 1,
      "slap": 1,
      "slap2": 1,
      "slap3": 1,
      "inferno": 1,
      "inferno4": 1,
      "contrast": 2,
      "freeze": 1,
      "swap": 1,
      "reverse": 1,
      "switch": 1,
      "chest": 1,
      "seetheothers": 1,
      "garbage_collection": 1,
      "tacocat": 5,
      "zombiecat": 5,
      "rainbowcat": 5,
      "catermelon": 5,
      "potatocat": 5,
      "golemcat": 5,
      "cattea": 5
    }
  },
  "9": {
    "waitNope": 3,
    "deck": {
      "exploding_kitten": 8,
      "super_exploding_kitten": 1,
      "atomicbom": 1,
      "streaking": 1,
      "defuse": 11,
      "nope": 3,
      "supernope": 1,
      "nhintruoctuonglai": 2,
      "nhintruoctuonglai1": 1,
      "nhintruoctuonglai5": 1,
      "afterthefuture": 1,
      "afterthefuture5": 1,
      "xaobai": 2,
      "tancong": 2,
      "skip": 3,
      "superskip": 2,
      "favor": 2,
      "superfavor": 1,
      "clone": 2,
      "drawbottom": 2,
      "everywhere": 2,
      "whatcat": 1,
      "theend": 1,
      "locking": 1,
      "locking5": 1,
      "slap": 1,
      "slap2": 2,
      "slap3": 1,
      "inferno": 1,
      "inferno4": 1,
      "contrast": 2,
      "freeze": 1,
      "swap": 1,
      "reverse": 1,
      "switch": 1,
      "chest": 1,
      "seetheothers": 1,
      "garbage_collection": 1,
      "tacocat": 6,
      "zombiecat": 6,
      "rainbowcat": 6,
      "catermelon": 6,
      "potatocat": 6,
      "golemcat": 5,
      "cattea": 5
    }
  },
  "10": {
    "waitNope": 3,
    "deck": {
      "exploding_kitten": 10,
      "super_exploding_kitten": 1,
      "atomicbom": 1,
      "streaking": 2,
      "defuse": 13,
      "nope": 3,
      "supernope": 1,
      "nhintruoctuonglai": 2,
      "nhintruoctuonglai1": 1,
      "nhintruoctuonglai5": 1,
      "afterthefuture": 1,
      "afterthefuture5": 1,
      "xaobai": 2,
      "tancong": 2,
      "skip": 3,
      "superskip": 2,
      "favor": 2,
      "superfavor": 1,
      "clone": 2,
      "drawbottom": 2,
      "everywhere": 2,
      "whatcat": 1,
      "theend": 1,
      "locking": 1,
      "locking5": 1,
      "slap": 1,
      "slap2": 2,
      "slap3": 1,
      "inferno": 1,
      "inferno4": 1,
      "contrast": 2,
      "freeze": 1,
      "swap": 2,
      "reverse": 2,
      "switch": 1,
      "chest": 1,
      "seetheothers": 1,
      "garbage_collection": 1,
      "tacocat": 6,
      "zombiecat": 6,
      "rainbowcat": 6,
      "catermelon": 6,
      "potatocat": 5,
      "golemcat": 5,
      "cattea": 5,
      "vampirecat": 5
    }
  },
  "_CARD_IDS": {
    "defuse": "Gỡ Bom",
    "exploding_kitten": "Mèo Cảm Tử (Bom)",
    "super_exploding_kitten": "Siêu Mèo Cảm Tử",
    "atomicbom": "Bom Hạt Nhân",
    "nope": "Nope (Hủy Lệnh)",
    "supernope": "Super Nope",
    "nhintruoctuonglai1": "Nhìn Trước 1 Lá",
    "nhintruoctuonglai": "Nhìn Trước 3 Lá",
    "nhintruoctuonglai5": "Nhìn Trước 5 Lá",
    "afterthefuture": "Can Thiệp 3 Lá",
    "afterthefuture5": "Can Thiệp 5 Lá",
    "xaobai": "Xáo Bài",
    "tancong": "Tấn Công",
    "skip": "Bỏ Lượt",
    "superskip": "Siêu Bỏ Lượt",
    "favor": "Xin Bài",
    "superfavor": "Super Favor",
    "clone": "Sao Chép",
    "streaking": "Mèo Ôm Bom",
    "drawbottom": "Rút Dưới Đáy",
    "everywhere": "Ở Khắp Mọi Nơi",
    "whatcat": "Mèo Gì Đây",
    "tacocat": "Mèo Taco",
    "zombiecat": "Mèo Zombie",
    "rainbowcat": "Mèo Cầu Vồng",
    "catermelon": "Mèo Dưa Hấu",
    "potatocat": "Mèo Khoai Tây",
    "golemcat": "Mèo Golem",
    "cattea": "Mèo Trà",
    "vampirecat": "Mèo Ma Cà Rồng",
    "theend": "The End",
    "locking": "Khóa Bài",
    "locking5": "Khóa 5 Lá",
    "slap": "Slap",
    "slap2": "Slap x2",
    "slap3": "Slap x3",
    "inferno": "Thiêu Cháy 2",
    "inferno4": "Thiêu Cháy 4",
    "contrast": "Đảo Nghịch",
    "freeze": "Đóng Băng",
    "swap": "Hoán Đổi",
    "reverse": "Đổi Chiều",
    "switch": "Switch",
    "chest": "Rương thưởng",
    "seetheothers": "Nhìn bài",
    "garbage_collection": "Dọn rác"
  }
};

// Danh sách các loại nhãn phân loại lá bài hỗ trợ trong hệ thống
const AVAILABLE_TAGS = [
  { id: 'BOMBS', name: 'Bom', class: 'tag-bomb', chipClass: 'chip-bomb' },
  { id: 'DEFUSE', name: 'Gỡ Bom', class: 'tag-defuse', chipClass: 'chip-defuse' },
  { id: 'ATTACK', name: 'Tấn Công', class: 'tag-attack', chipClass: 'chip-attack' },
  { id: 'PROTECT', name: 'Bảo Vệ', class: 'tag-protect', chipClass: 'chip-protect' },
  { id: 'TACTICAL', name: 'Chiến Thuật', class: 'tag-tactical', chipClass: 'chip-tactical' },
  { id: 'SAFE', name: 'An Toàn', class: 'tag-safe', chipClass: 'chip-safe' },
  { id: 'VANILLA', name: 'Mèo Thường', class: 'tag-vanilla', chipClass: 'chip-vanilla' },
  { id: 'SUPER', name: 'Super', class: 'tag-super', chipClass: 'chip-super' }
];

// Mẫu phân loại nhãn mặc định ban đầu
const DEFAULT_CARD_TAGS = {
  "defuse": ["DEFUSE", "SAFE"],
  "exploding_kitten": ["BOMBS"],
  "super_exploding_kitten": ["BOMBS", "SUPER"],
  "atomicbom": ["BOMBS"],
  "nope": ["PROTECT"],
  "supernope": ["PROTECT", "SUPER"],
  "nhintruoctuonglai1": ["TACTICAL", "SAFE"],
  "nhintruoctuonglai": ["TACTICAL", "SAFE"],
  "nhintruoctuonglai5": ["TACTICAL", "SAFE", "SUPER"],
  "afterthefuture": ["TACTICAL", "SAFE"],
  "afterthefuture5": ["TACTICAL", "SAFE", "SUPER"],
  "xaobai": ["TACTICAL", "SAFE"],
  "tancong": ["ATTACK"],
  "skip": ["SAFE"],
  "superskip": ["SAFE", "SUPER"],
  "favor": ["ATTACK"],
  "superfavor": ["ATTACK", "SUPER"],
  "clone": ["TACTICAL", "SAFE"],
  "streaking": ["TACTICAL", "SAFE"],
  "drawbottom": ["TACTICAL", "SAFE"],
  "everywhere": ["TACTICAL", "SAFE"],
  "whatcat": ["TACTICAL", "SAFE"],
  "tacocat": ["VANILLA", "ATTACK"],
  "zombiecat": ["VANILLA", "ATTACK"],
  "rainbowcat": ["VANILLA", "ATTACK"],
  "catermelon": ["VANILLA", "ATTACK"],
  "potatocat": ["VANILLA", "ATTACK"],
  "golemcat": ["VANILLA", "ATTACK"],
  "cattea": ["VANILLA", "ATTACK"],
  "vampirecat": ["VANILLA", "ATTACK"],
  "theend": ["TACTICAL", "SAFE"],
  "locking": ["ATTACK"],
  "locking5": ["ATTACK", "SUPER"],
  "slap": ["ATTACK"],
  "slap2": ["ATTACK"],
  "slap3": ["ATTACK", "SUPER"],
  "inferno": ["ATTACK"],
  "inferno4": ["ATTACK", "SUPER"],
  "contrast": ["PROTECT"],
  "freeze": ["TACTICAL", "ATTACK"],
  "swap": ["TACTICAL", "ATTACK"],
  "reverse": ["TACTICAL", "SAFE"],
  "switch": ["TACTICAL", "ATTACK"],
  "chest": ["TACTICAL", "SAFE"],
  "seetheothers": ["TACTICAL", "ATTACK"],
  "garbage_collection": ["TACTICAL", "SAFE"]
};

// Lấy danh sách các nhãn hiện tại của 1 lá bài
function getCardTags(cardId) {
  if (appData && appData._CARD_TAGS && Array.isArray(appData._CARD_TAGS[cardId])) {
    return appData._CARD_TAGS[cardId];
  }
  return DEFAULT_CARD_TAGS[cardId] ? [...DEFAULT_CARD_TAGS[cardId]] : [];
}

// Bật/Tắt 1 nhãn phân loại của 1 lá bài
function toggleCardTag(cardId, tagId) {
  if (!appData._CARD_TAGS || typeof appData._CARD_TAGS !== 'object') {
    appData._CARD_TAGS = JSON.parse(JSON.stringify(DEFAULT_CARD_TAGS));
  }
  if (!Array.isArray(appData._CARD_TAGS[cardId])) {
    appData._CARD_TAGS[cardId] = DEFAULT_CARD_TAGS[cardId] ? [...DEFAULT_CARD_TAGS[cardId]] : [];
  }

  const tags = appData._CARD_TAGS[cardId];
  const idx = tags.indexOf(tagId);
  if (idx >= 0) {
    tags.splice(idx, 1);
  } else {
    tags.push(tagId);
  }

  updateJsonEditorContent();
  renderCardGrid();
  updateStats();
}

// Lấy danh sách badge hiển thị cho từng lá bài theo nhãn tùy chỉnh
function getCardBadges(cardId) {
  const tags = getCardTags(cardId);
  return tags.map(tagId => {
    const tagObj = AVAILABLE_TAGS.find(t => t.id === tagId);
    if (!tagObj) return null;
    return {
      text: tagObj.name.toUpperCase(),
      class: tagObj.class
    };
  }).filter(Boolean);
}

// Danh sách cố định 9 mức số lượng người chơi (2 -> 10 người)
const FIXED_PLAYER_KEYS = ["2", "3", "4", "5", "6", "7", "8", "9", "10"];

// State toàn cục
let appData = JSON.parse(JSON.stringify(DEFAULT_DECKS_DATA));
let currentPlayerKey = "2";
let currentFilter = "all";
let searchQuery = "";
let dbSearchQuery = "";
let newCardSelectedTags = [];

// Đảm bảo dữ liệu luôn đầy đủ cố định 2 -> 10 người chơi, không thừa không thiếu
function ensureFixedPlayerKeys() {
  if (!appData || typeof appData !== 'object') {
    appData = JSON.parse(JSON.stringify(DEFAULT_DECKS_DATA));
  }
  if (!appData._CARD_IDS) {
    appData._CARD_IDS = JSON.parse(JSON.stringify(DEFAULT_DECKS_DATA._CARD_IDS));
  }
  if (!appData._CARD_TAGS || typeof appData._CARD_TAGS !== 'object') {
    appData._CARD_TAGS = JSON.parse(JSON.stringify(DEFAULT_CARD_TAGS));
  }
  // Đảm bảo tất cả các ID lá bài đều có mảng tags
  Object.keys(appData._CARD_IDS).forEach(id => {
    if (!Array.isArray(appData._CARD_TAGS[id])) {
      appData._CARD_TAGS[id] = DEFAULT_CARD_TAGS[id] ? [...DEFAULT_CARD_TAGS[id]] : [];
    }
  });

  FIXED_PLAYER_KEYS.forEach(key => {
    if (!appData[key] || typeof appData[key] !== 'object') {
      const fallbackDeck = (DEFAULT_DECKS_DATA[key] && DEFAULT_DECKS_DATA[key].deck) ? DEFAULT_DECKS_DATA[key].deck : {};
      const fallbackWait = (DEFAULT_DECKS_DATA[key] && DEFAULT_DECKS_DATA[key].waitNope) ? DEFAULT_DECKS_DATA[key].waitNope : 2;
      appData[key] = {
        waitNope: fallbackWait,
        deck: JSON.parse(JSON.stringify(fallbackDeck))
      };
    } else {
      if (typeof appData[key].waitNope !== 'number') appData[key].waitNope = 2;
      if (!appData[key].deck || typeof appData[key].deck !== 'object') appData[key].deck = {};
    }
  });

  // Loại bỏ các key số người chơi ngoại lai ngoài 2..10
  Object.keys(appData).forEach(k => {
    if (k !== '_CARD_IDS' && k !== '_CARD_TAGS' && !FIXED_PLAYER_KEYS.includes(k)) {
      delete appData[k];
    }
  });

  if (!FIXED_PLAYER_KEYS.includes(currentPlayerKey)) {
    currentPlayerKey = "2";
  }
}

// Phân biệt màu sắc thành phần cú pháp JSON chuẩn Code (VS Code / GitHub theme)
function syntaxHighlightJson(jsonStr) {
  if (!jsonStr) return '';
  // 1. Escape các ký tự HTML
  const escaped = jsonStr
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // 2. Tokenize regex chuẩn cho JSON
  return escaped.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?|[{}[\],:])/g, function (match) {
    if (/^"/.test(match)) {
      if (/:$/.test(match)) {
        const keyPart = match.slice(0, match.lastIndexOf(':'));
        return `<span class="json-key">${keyPart}</span><span class="json-colon">:</span>`;
      } else {
        return `<span class="json-string">${match}</span>`;
      }
    } else if (/true|false/.test(match)) {
      return `<span class="json-boolean">${match}</span>`;
    } else if (/null/.test(match)) {
      return `<span class="json-null">${match}</span>`;
    } else if (/[{}[\]]/.test(match)) {
      return `<span class="json-bracket">${match}</span>`;
    } else if (match === ':') {
      return `<span class="json-colon">${match}</span>`;
    } else if (match === ',') {
      return `<span class="json-comma">${match}</span>`;
    } else {
      return `<span class="json-number">${match}</span>`;
    }
  });
}

// Khởi chạy
document.addEventListener('DOMContentLoaded', async () => {
  const statusBadge = document.getElementById('serverStatusBadge');
  const statusText = document.getElementById('serverStatusText');
  const statusDot = document.querySelector('.status-dot');

  // Thử fetch dữ liệu trực tiếp từ server
  try {
    const res = await fetch('/api/deck');
    if (res.ok) {
      const data = await res.json();
      if (data && data._CARD_IDS) {
        appData = data;
        ensureFixedPlayerKeys();
        if (statusText) statusText.textContent = 'Server: Đã kết nối (Port 3333)';
        if (statusDot) statusDot.style.background = 'var(--accent-green)';
        showToast('Đã tải dữ liệu trực tiếp từ Server!', 'success');
      }
    } else {
      if (statusText) statusText.textContent = 'Chế độ ngoại tuyến (Offline)';
      if (statusDot) statusDot.style.background = 'var(--accent-gold)';
    }
  } catch (e) {
    if (statusText) statusText.textContent = 'Chế độ ngoại tuyến (Offline)';
    if (statusDot) statusDot.style.background = 'var(--accent-gold)';
  }

  ensureFixedPlayerKeys();
  setupEventListeners();
  renderAll();
});

function setupEventListeners() {
  // Header Actions
  document.getElementById('btnExport').addEventListener('click', exportJsonFile);
  document.getElementById('btnCopyHeader').addEventListener('click', copyJsonToClipboard);
  document.getElementById('btnImport').addEventListener('click', () => {
    document.getElementById('fileInput').click();
  });
  document.getElementById('fileInput').addEventListener('change', handleFileImport);
  document.getElementById('btnSaveDirect').addEventListener('click', saveDirectToServer);
  
  const btnSaveAndPush = document.getElementById('btnSaveAndPush');
  if (btnSaveAndPush) {
    btnSaveAndPush.addEventListener('click', saveAndPushToGitHub);
  }

  // Toggle JSON Sidebar Button
  const btnToggleSidebar = document.getElementById('btnToggleSidebar');
  const studioWrapper = document.querySelector('.studio-wrapper');
  if (btnToggleSidebar && studioWrapper) {
    if (localStorage.getItem('deck_editor_sidebar_collapsed') === 'true') {
      studioWrapper.classList.add('sidebar-collapsed');
      btnToggleSidebar.classList.add('active');
    }
    btnToggleSidebar.addEventListener('click', () => {
      studioWrapper.classList.toggle('sidebar-collapsed');
      const isCollapsed = studioWrapper.classList.contains('sidebar-collapsed');
      btnToggleSidebar.classList.toggle('active', isCollapsed);
      localStorage.setItem('deck_editor_sidebar_collapsed', isCollapsed ? 'true' : 'false');
    });
  }

  // Theme Toggle Button
  const btnToggleTheme = document.getElementById('btnToggleTheme');
  const savedTheme = localStorage.getItem('deck_editor_theme') || 'light';
  document.documentElement.className = savedTheme === 'dark' ? 'dark-theme' : 'light-theme';
  updateThemeButtonUI();

  if (btnToggleTheme) {
    btnToggleTheme.addEventListener('click', () => {
      const isDark = document.documentElement.classList.contains('dark-theme');
      const newTheme = isDark ? 'light' : 'dark';
      document.documentElement.className = newTheme === 'dark' ? 'dark-theme' : 'light-theme';
      localStorage.setItem('deck_editor_theme', newTheme);
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

  // Filter Toolbar Buttons
  document.querySelectorAll('.filter-pill, .filter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-pill, .filter-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderCardGrid();
    });
  });

  // Search Input
  const searchInput = document.getElementById('inputSearchCards');
  const btnClearSearch = document.getElementById('btnClearSearch');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      if (btnClearSearch) {
        btnClearSearch.style.display = searchQuery ? 'block' : 'none';
      }
      renderCardGrid();
    });
  }
  if (btnClearSearch) {
    btnClearSearch.addEventListener('click', () => {
      if (searchInput) {
        searchInput.value = '';
        searchQuery = '';
        btnClearSearch.style.display = 'none';
        renderCardGrid();
      }
    });
  }

  // waitNope Stepper
  const waitInput = document.getElementById('inputWaitNope');
  const btnDecWait = document.getElementById('btnDecWaitNope');
  const btnIncWait = document.getElementById('btnIncWaitNope');

  if (btnDecWait && waitInput) {
    btnDecWait.addEventListener('click', () => {
      const val = Math.max(1, (parseInt(waitInput.value) || 2) - 1);
      waitInput.value = val;
      if (appData[currentPlayerKey]) appData[currentPlayerKey].waitNope = val;
      updateJsonEditorContent();
    });
  }
  if (btnIncWait && waitInput) {
    btnIncWait.addEventListener('click', () => {
      const val = Math.min(10, (parseInt(waitInput.value) || 2) + 1);
      waitInput.value = val;
      if (appData[currentPlayerKey]) appData[currentPlayerKey].waitNope = val;
      updateJsonEditorContent();
    });
  }
  if (waitInput) {
    waitInput.addEventListener('change', (e) => {
      const val = Math.max(1, Math.min(10, parseInt(e.target.value) || 2));
      e.target.value = val;
      if (appData[currentPlayerKey]) appData[currentPlayerKey].waitNope = val;
      updateJsonEditorContent();
    });
  }

  // Clone Player Modal
  document.getElementById('btnClonePlayer').addEventListener('click', openCloneModal);
  document.getElementById('btnCloseCloneModal').addEventListener('click', closeCloneModal);
  document.getElementById('btnConfirmClone').addEventListener('click', confirmClonePlayer);

  // Delete Player
  document.getElementById('btnDeletePlayer').addEventListener('click', deleteCurrentPlayer);

  // DB Manager Modal
  document.getElementById('btnManageDb').addEventListener('click', openDbModal);
  document.getElementById('btnCloseDbModal').addEventListener('click', closeDbModal);
  document.getElementById('btnAddNewCardId').addEventListener('click', openAddCardIdModal);
  document.getElementById('btnCloseAddCardModal').addEventListener('click', closeAddCardIdModal);
  document.getElementById('btnConfirmAddCardId').addEventListener('click', confirmAddCardId);

  const inputSearchDb = document.getElementById('inputSearchDbCards');
  if (inputSearchDb) {
    inputSearchDb.addEventListener('input', (e) => {
      dbSearchQuery = e.target.value.toLowerCase().trim();
      renderDbCardsGrid();
    });
  }

  // Live JSON Editor Events & Highlight Sync
  const editor = document.getElementById('jsonEditor');
  const highlightCode = document.getElementById('jsonHighlightCode');
  const highlightPre = document.getElementById('jsonHighlight');

  if (editor) {
    editor.addEventListener('input', () => {
      if (highlightCode) {
        highlightCode.innerHTML = syntaxHighlightJson(editor.value) + '\n';
      }
      const charCountEl = document.getElementById('jsonCharCount');
      if (charCountEl) {
        charCountEl.textContent = `${new Blob([editor.value]).size} bytes`;
      }
    });

    editor.addEventListener('scroll', () => {
      if (highlightPre) {
        highlightPre.scrollTop = editor.scrollTop;
        highlightPre.scrollLeft = editor.scrollLeft;
      }
    });

    editor.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        editor.value = editor.value.substring(0, start) + '  ' + editor.value.substring(end);
        editor.selectionStart = editor.selectionEnd = start + 2;
        if (highlightCode) {
          highlightCode.innerHTML = syntaxHighlightJson(editor.value) + '\n';
        }
      }
    });
  }

  // Sidebar Live JSON Actions
  document.getElementById('btnFormatJson').addEventListener('click', () => {
    try {
      const obj = JSON.parse(document.getElementById('jsonEditor').value);
      const str = JSON.stringify(obj, null, 2);
      document.getElementById('jsonEditor').value = str;
      if (highlightCode) {
        highlightCode.innerHTML = syntaxHighlightJson(str) + '\n';
      }
      showToast('Đã định dạng JSON chuẩn!', 'success');
    } catch (e) {
      showToast('JSON đang có lỗi cú pháp!', 'danger');
    }
  });

  document.getElementById('btnCopyJson').addEventListener('click', copyJsonToClipboard);

  document.getElementById('btnApplyJson').addEventListener('click', () => {
    try {
      const obj = JSON.parse(document.getElementById('jsonEditor').value);
      if (!obj._CARD_IDS) throw new Error('Thiếu trường _CARD_IDS');
      appData = obj;
      ensureFixedPlayerKeys();
      renderAll();
      showToast('Đã áp dụng thay đổi từ JSON thành công!', 'success');
    } catch (err) {
      showToast('Lỗi cú pháp JSON: ' + err.message, 'danger');
    }
  });
}

function renderAll() {
  ensureFixedPlayerKeys();
  renderPlayerPills();
  renderCurrentPlayerSettings();
  renderCardGrid();
  renderDbCardsGrid();
  updateStats();
  updateJsonEditorContent();
}

// Render các nút chọn số người chơi (Luôn cố định chính xác 9 mức từ 2P đến 10P)
function renderPlayerPills() {
  const container = document.getElementById('playerPillsContainer');
  if (!container) return;
  container.innerHTML = '';

  ensureFixedPlayerKeys();

  FIXED_PLAYER_KEYS.forEach(key => {
    const pill = document.createElement('button');
    pill.className = `player-pill ${key === currentPlayerKey ? 'active' : ''}`;
    const cardTotal = Object.values((appData[key] && appData[key].deck) || {}).reduce((s, v) => s + (parseInt(v) || 0), 0);
    pill.innerHTML = `<span>${key}P</span> <span class="pill-count">(${cardTotal})</span>`;
    pill.title = `Bộ bài ${key} người chơi (${cardTotal} lá)`;
    pill.addEventListener('click', () => {
      currentPlayerKey = key;
      renderPlayerPills();
      renderCurrentPlayerSettings();
      renderCardGrid();
      updateStats();
      updateJsonEditorContent();
    });
    container.appendChild(pill);
  });
}

function renderCurrentPlayerSettings() {
  const currentConfig = appData[currentPlayerKey] || { waitNope: 2, deck: {} };
  const waitInput = document.getElementById('inputWaitNope');
  if (waitInput) {
    waitInput.value = currentConfig.waitNope !== undefined ? currentConfig.waitNope : 2;
  }
  const badge = document.getElementById('jsonCurrentPlayerBadge');
  if (badge) {
    badge.textContent = `Deck ${currentPlayerKey}P`;
  }
}

// Render danh sách lá bài trong grid (Dạng thẻ compact thu gọn, không có nút 0,1,2,3,4)
function renderCardGrid() {
  const grid = document.getElementById('cardGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const cardIds = appData._CARD_IDS || {};
  const currentDeck = (appData[currentPlayerKey] && appData[currentPlayerKey].deck) ? appData[currentPlayerKey].deck : {};

  let allCardEntries = Object.entries(cardIds).map(([id, name]) => ({
    id,
    name,
    count: currentDeck[id] || 0,
    badges: getCardBadges(id)
  }));

  // Cập nhật số lượng đếm trên các filter button
  const inDeckCount = allCardEntries.filter(c => c.count > 0).length;
  document.getElementById('countAll').textContent = allCardEntries.length;
  document.getElementById('countInDeck').textContent = inDeckCount;

  // Lọc theo search query
  if (searchQuery) {
    allCardEntries = allCardEntries.filter(c => 
      c.name.toLowerCase().includes(searchQuery) || c.id.toLowerCase().includes(searchQuery)
    );
  }

  // Lọc theo danh mục
  if (currentFilter === 'in-deck') {
    allCardEntries = allCardEntries.filter(c => c.count > 0);
  } else if (currentFilter === 'bomb-defuse') {
    allCardEntries = allCardEntries.filter(c => {
      const tags = getCardTags(c.id);
      return tags.includes('BOMBS') || tags.includes('DEFUSE') || c.id === 'defuse';
    });
  } else if (currentFilter === 'attack') {
    allCardEntries = allCardEntries.filter(c => getCardTags(c.id).includes('ATTACK'));
  } else if (currentFilter === 'protect') {
    allCardEntries = allCardEntries.filter(c => getCardTags(c.id).includes('PROTECT'));
  } else if (currentFilter === 'safe') {
    allCardEntries = allCardEntries.filter(c => getCardTags(c.id).includes('SAFE'));
  } else if (currentFilter === 'tactical') {
    allCardEntries = allCardEntries.filter(c => getCardTags(c.id).includes('TACTICAL'));
  } else if (currentFilter === 'super') {
    allCardEntries = allCardEntries.filter(c => getCardTags(c.id).includes('SUPER'));
  } else if (currentFilter === 'vanilla') {
    allCardEntries = allCardEntries.filter(c => getCardTags(c.id).includes('VANILLA'));
  }

  if (allCardEntries.length === 0) {
    grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 50px 20px; color: var(--text-dim); font-size: 13px;">Không tìm thấy lá bài nào phù hợp bộ lọc!</div>`;
    return;
  }

  allCardEntries.forEach(card => {
    const cardEl = document.createElement('div');
    const isInDeck = card.count > 0;
    const tags = getCardTags(card.id);
    const isBomb = tags.includes('BOMBS') || card.id === 'exploding_kitten' || card.id === 'atomicbom';
    const isSuper = tags.includes('SUPER');
    const isDefuse = tags.includes('DEFUSE') || card.id === 'defuse';

    let extraClass = '';
    if (isInDeck) extraClass += ' in-deck';
    if (isBomb && isInDeck) extraClass += ' highlight-bomb';
    if (isDefuse && isInDeck) extraClass += ' highlight-defuse';
    if (isSuper && isInDeck) extraClass += ' highlight-super';

    cardEl.className = `card-tile${extraClass}`;

    // Đường dẫn ảnh thumbnail
    const artPath = `../explodingkittens(clients)/cards/${card.id}/art/1.png`;

    // Render badges HTML
    const badgesHtml = card.badges.map(b => `<span class="badge-tag ${b.class}">${b.text}</span>`).join('');

    cardEl.innerHTML = `
      <div class="card-left-meta">
        <div class="card-thumb-compact" style="background-image: url('${artPath}'), url('cards/${card.id}/art/1.png');"></div>
        <div class="card-details">
          <div class="card-title-text" title="${card.name}">${card.name}</div>
          <div class="card-id-text">${card.id}</div>
          <div class="card-badges-row">${badgesHtml}</div>
        </div>
      </div>

      <div class="card-stepper-compact">
        <button class="btn-step-sm btn-minus" data-id="${card.id}">-</button>
        <input type="number" class="input-qty-sm" data-id="${card.id}" min="0" max="99" value="${card.count}">
        <button class="btn-step-sm btn-plus" data-id="${card.id}">+</button>
      </div>
    `;

    // Event listeners
    const minusBtn = cardEl.querySelector('.btn-minus');
    const plusBtn = cardEl.querySelector('.btn-plus');
    const qtyInput = cardEl.querySelector('.input-qty-sm');

    minusBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      updateCardCount(card.id, Math.max(0, card.count - 1));
    });

    plusBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      updateCardCount(card.id, card.count + 1);
    });

    qtyInput.addEventListener('change', (e) => {
      const val = Math.max(0, parseInt(e.target.value) || 0);
      updateCardCount(card.id, val);
    });

    qtyInput.addEventListener('click', (e) => e.stopPropagation());

    grid.appendChild(cardEl);
  });
}

function updateCardCount(cardId, newCount) {
  if (!appData[currentPlayerKey]) {
    appData[currentPlayerKey] = { waitNope: 2, deck: {} };
  }
  if (!appData[currentPlayerKey].deck) {
    appData[currentPlayerKey].deck = {};
  }

  if (newCount > 0) {
    appData[currentPlayerKey].deck[cardId] = newCount;
  } else {
    delete appData[currentPlayerKey].deck[cardId];
  }

  renderCardGrid();
  updateStats();
  updateJsonEditorContent();
  renderPlayerPills();
}

function updateStats() {
  const currentDeck = (appData[currentPlayerKey] && appData[currentPlayerKey].deck) ? appData[currentPlayerKey].deck : {};
  let total = 0;
  let bombs = 0;
  let explodingOnly = 0;
  let defuses = 0;
  let attacks = 0;
  let protects = 0;
  let safes = 0;
  let vanillas = 0;
  let tacticals = 0;

  Object.entries(currentDeck).forEach(([id, qty]) => {
    const count = parseInt(qty) || 0;
    total += count;
    const tags = getCardTags(id);

    if (tags.includes('BOMBS') || id === 'exploding_kitten' || id === 'atomicbom' || id === 'super_exploding_kitten') {
      bombs += count;
      if (id === 'exploding_kitten' || id === 'super_exploding_kitten') explodingOnly += count;
    }
    if (tags.includes('DEFUSE') || id === 'defuse') defuses += count;
    if (tags.includes('ATTACK')) attacks += count;
    if (tags.includes('PROTECT')) protects += count;
    if (tags.includes('SAFE')) safes += count;
    if (tags.includes('VANILLA')) vanillas += count;
    if (tags.includes('TACTICAL')) tacticals += count;
  });

  const targetCards = (parseInt(currentPlayerKey) || 2) * 12;

  const formatPct = (val) => {
    if (!total || total === 0) return '(0%)';
    const p = ((val / total) * 100).toFixed(1).replace(/\.0$/, '');
    return `(${p}%)`;
  };

  const statTotalEl = document.getElementById('statTotalCards');
  if (statTotalEl) statTotalEl.textContent = total;

  const statTargetEl = document.getElementById('statTargetCompare');
  if (statTargetEl) statTargetEl.textContent = `Mục tiêu: ~${targetCards} lá (${total >= targetCards - 2 && total <= targetCards + 2 ? 'Chuẩn' : total})`;

  const statBombEl = document.getElementById('statBombCards');
  if (statBombEl) statBombEl.textContent = bombs;
  const statBombPctEl = document.getElementById('statBombPercent');
  if (statBombPctEl) statBombPctEl.textContent = formatPct(bombs);

  const statBombsSubEl = document.getElementById('statBombsSub');
  if (statBombsSubEl) statBombsSubEl.textContent = `${explodingOnly}/${currentPlayerKey} Exploding`;

  const statDefuseEl = document.getElementById('statDefuseCards');
  if (statDefuseEl) statDefuseEl.textContent = defuses;
  const statDefusePctEl = document.getElementById('statDefusePercent');
  if (statDefusePctEl) statDefusePctEl.textContent = formatPct(defuses);

  const statAttackEl = document.getElementById('statAttackCards');
  if (statAttackEl) statAttackEl.textContent = attacks;
  const statAttackPctEl = document.getElementById('statAttackPercent');
  if (statAttackPctEl) statAttackPctEl.textContent = formatPct(attacks);

  const statProtectEl = document.getElementById('statProtectCards');
  if (statProtectEl) statProtectEl.textContent = protects;
  const statProtectPctEl = document.getElementById('statProtectPercent');
  if (statProtectPctEl) statProtectPctEl.textContent = formatPct(protects);

  const statSafeEl = document.getElementById('statSafeCards');
  if (statSafeEl) statSafeEl.textContent = safes;
  const statSafePctEl = document.getElementById('statSafePercent');
  if (statSafePctEl) statSafePctEl.textContent = formatPct(safes);

  const statVanillaEl = document.getElementById('statVanillaCards');
  if (statVanillaEl) statVanillaEl.textContent = vanillas;
  const statVanillaPctEl = document.getElementById('statVanillaPercent');
  if (statVanillaPctEl) statVanillaPctEl.textContent = formatPct(vanillas);

  const statTacticalEl = document.getElementById('statTacticalCards');
  if (statTacticalEl) statTacticalEl.textContent = tacticals;
  const statTacticalPctEl = document.getElementById('statTacticalPercent');
  if (statTacticalPctEl) statTacticalPctEl.textContent = formatPct(tacticals);

  // Update Mini Progress Bar Widths in Left Sidebar
  const updateBar = (barId, val) => {
    const el = document.getElementById(barId);
    if (el) {
      const pctNum = total > 0 ? ((val / total) * 100) : 0;
      el.style.width = `${Math.min(100, Math.max(0, pctNum))}%`;
    }
  };

  updateBar('statBombBar', bombs);
  updateBar('statDefuseBar', defuses);
  updateBar('statAttackBar', attacks);
  updateBar('statProtectBar', protects);
  updateBar('statTacticalBar', tacticals);
  updateBar('statSafeBar', safes);
  updateBar('statVanillaBar', vanillas);
}

// Live JSON Editor Content Sync & Syntax Highlight
function updateJsonEditorContent() {
  const editor = document.getElementById('jsonEditor');
  const highlightCode = document.getElementById('jsonHighlightCode');
  const highlightPre = document.getElementById('jsonHighlight');

  if (editor) {
    const str = JSON.stringify(appData, null, 2);
    editor.value = str;
    if (highlightCode) {
      highlightCode.innerHTML = syntaxHighlightJson(str) + '\n';
    }
    if (highlightPre) {
      highlightPre.scrollTop = editor.scrollTop;
      highlightPre.scrollLeft = editor.scrollLeft;
    }
    const charCountEl = document.getElementById('jsonCharCount');
    if (charCountEl) {
      charCountEl.textContent = `${new Blob([str]).size} bytes`;
    }
  }
}

// Tab DB Manager (_CARD_IDS)
function openDbModal() {
  renderDbCardsGrid();
  document.getElementById('dbModal').classList.add('show');
}
function closeDbModal() {
  document.getElementById('dbModal').classList.remove('show');
}

function renderDbCardsGrid() {
  const grid = document.getElementById('dbCardsGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const cardIds = appData._CARD_IDS || {};
  let entries = Object.entries(cardIds);

  if (dbSearchQuery) {
    entries = entries.filter(([id, name]) => 
      name.toLowerCase().includes(dbSearchQuery) || id.toLowerCase().includes(dbSearchQuery)
    );
  }

  if (entries.length === 0) {
    grid.innerHTML = `<div style="text-align:center; padding: 25px; color: var(--text-dim); font-size: 12px;">Không tìm thấy lá bài nào khớp với từ khóa tìm kiếm.</div>`;
    return;
  }

  entries.forEach(([id, name]) => {
    const row = document.createElement('div');
    row.className = 'db-card-row';

    const artPath = `../explodingkittens(clients)/cards/${id}/art/1.png`;
    const cardTags = getCardTags(id);

    const tagChipsHtml = AVAILABLE_TAGS.map(t => {
      const isActive = cardTags.includes(t.id);
      return `<button type="button" class="db-tag-chip ${t.chipClass} ${isActive ? 'active' : ''}" data-id="${id}" data-tag="${t.id}">${t.name}</button>`;
    }).join('');

    row.innerHTML = `
      <div class="db-card-left">
        <div class="db-card-thumb" style="background-image: url('${artPath}'), url('cards/${id}/art/1.png');"></div>
        <div class="db-card-inputs">
          <input type="text" class="db-input id-input" value="${id}" readonly title="Mã ID nội bộ">
          <input type="text" class="db-input name-input" data-id="${id}" value="${name}" title="Tên hiển thị tiếng Việt">
        </div>
      </div>
      <div class="db-tag-chips-wrap">
        ${tagChipsHtml}
      </div>
      <div>
        <button class="btn-action-sm btn-danger btn-delete-card-id" data-id="${id}" title="Xóa lá bài khỏi hệ thống">
          <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
        </button>
      </div>
    `;

    row.querySelectorAll('.db-tag-chip').forEach(chip => {
      chip.addEventListener('click', (e) => {
        e.preventDefault();
        const tagId = chip.dataset.tag;
        toggleCardTag(id, tagId);
        chip.classList.toggle('active');
      });
    });

    const nameInput = row.querySelector('.name-input');
    nameInput.addEventListener('change', (e) => {
      appData._CARD_IDS[id] = e.target.value.trim();
      updateJsonEditorContent();
      renderCardGrid();
      showToast(`Đã đổi tên lá "${id}" thành "${appData._CARD_IDS[id]}"`, 'success');
    });

    const deleteBtn = row.querySelector('.btn-delete-card-id');
    deleteBtn.addEventListener('click', () => {
      if (confirm(`Bạn có chắc muốn xóa lá bài "${id}" (${name}) khỏi toàn bộ hệ thống?`)) {
        delete appData._CARD_IDS[id];
        if (appData._CARD_TAGS && appData._CARD_TAGS[id]) {
          delete appData._CARD_TAGS[id];
        }
        Object.keys(appData).forEach(k => {
          if (k !== '_CARD_IDS' && k !== '_CARD_TAGS' && appData[k].deck && appData[k].deck[id]) {
            delete appData[k].deck[id];
          }
        });
        renderAll();
        showToast(`Đã xóa lá bài "${id}" thành công!`, 'success');
      }
    });

    grid.appendChild(row);
  });
}

// Sao chép và xuất file
function exportJsonFile() {
  const jsonStr = JSON.stringify(appData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'decks_rankmatch.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Đã tải xuống file decks_rankmatch.json thành công!', 'success');
}

function copyJsonToClipboard() {
  const jsonStr = JSON.stringify(appData, null, 2);
  navigator.clipboard.writeText(jsonStr).then(() => {
    showToast('Đã sao chép toàn bộ JSON vào Clipboard!', 'success');
  }).catch(() => {
    showToast('Không thể sao chép tự động!', 'danger');
  });
}

function handleFileImport(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const obj = JSON.parse(event.target.result);
      if (!obj._CARD_IDS) throw new Error('File JSON không hợp lệ hoặc thiếu _CARD_IDS');
      appData = obj;
      ensureFixedPlayerKeys();
      renderAll();
      showToast('Đã nhập file decks_rankmatch.json thành công!', 'success');
    } catch (err) {
      showToast('Lỗi đọc file JSON: ' + err.message, 'danger');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

// Lưu thẳng vào Server
async function saveDirectToServer() {
  try {
    const res = await fetch('/api/deck', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(appData)
    });

    if (res.ok) {
      showToast('Đã lưu trực tiếp vào file decks_rankmatch.json trên Server!', 'success');
    } else {
      throw new Error('Server trả về lỗi');
    }
  } catch (err) {
    exportJsonFile();
    showToast('Đang chạy ở chế độ offline, đã tự động tải file decks_rankmatch.json cho bạn!', 'info');
  }
}

// Lưu vào file và tự động Push lên GitHub
async function saveAndPushToGitHub() {
  const btn = document.getElementById('btnSaveAndPush');
  const originalHtml = btn ? btn.innerHTML : '';
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<svg class="spin" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v4m0 12v4m-7.07-15.07l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/></svg> Đang Push...`;
  }
  showToast('Đang lưu và đẩy file lên GitHub...', 'info');

  try {
    const res = await fetch('/api/save-and-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(appData)
    });

    if (res.ok) {
      const data = await res.json();
      if (data.gitPushed) {
        showToast(data.message || 'Đã lưu và Push lên GitHub thành công!', 'success');
      } else {
        showToast(data.message || 'Đã lưu vào máy nhưng chưa push được lên GitHub.', 'warning');
      }
    } else {
      throw new Error('Server trả về lỗi');
    }
  } catch (err) {
    exportJsonFile();
    showToast('Không kết nối được server cục bộ để push GitHub. Đã tải file decks_rankmatch.json về máy!', 'warning');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }
  }
}

// Modal Clone
function openCloneModal() {
  const select = document.getElementById('selectSourcePlayer');
  select.innerHTML = '';
  const playerKeys = FIXED_PLAYER_KEYS.filter(k => k !== currentPlayerKey);

  playerKeys.forEach(k => {
    const opt = document.createElement('option');
    opt.value = k;
    const cardCount = Object.values((appData[k] && appData[k].deck) || {}).reduce((s, v) => s + (parseInt(v) || 0), 0);
    opt.textContent = `${k}P - ${k} Người chơi (${cardCount} lá bài)`;
    select.appendChild(opt);
  });

  document.getElementById('cloneModal').classList.add('show');
}
function closeCloneModal() {
  document.getElementById('cloneModal').classList.remove('show');
}
function confirmClonePlayer() {
  const sourceKey = document.getElementById('selectSourcePlayer').value;
  if (sourceKey && appData[sourceKey]) {
    appData[currentPlayerKey] = JSON.parse(JSON.stringify(appData[sourceKey]));
    renderAll();
    closeCloneModal();
    showToast(`Đã sao chép cấu hình từ ${sourceKey}P sang ${currentPlayerKey}P!`, 'success');
  }
}

// Dọn dẹp làm rỗng mảng lá bài của số người chơi hiện tại (không xóa deck key)
function deleteCurrentPlayer() {
  const currentDeck = (appData[currentPlayerKey] && appData[currentPlayerKey].deck) ? appData[currentPlayerKey].deck : {};
  const cardCount = Object.values(currentDeck).reduce((s, v) => s + (parseInt(v) || 0), 0);

  if (cardCount === 0) {
    showToast(`Bộ bài ${currentPlayerKey}P hiện tại đã trống (0 lá)!`, 'info');
    return;
  }

  if (confirm(`Bạn có chắc muốn làm rỗng (xóa toàn bộ ${cardCount} lá bài) trong bộ bài ${currentPlayerKey} người chơi?`)) {
    if (!appData[currentPlayerKey]) {
      appData[currentPlayerKey] = { waitNope: 2, deck: {} };
    } else {
      appData[currentPlayerKey].deck = {};
    }
    renderAll();
    showToast(`Đã dọn dẹp làm rỗng toàn bộ lá bài trong bộ ${currentPlayerKey}P thành công!`, 'success');
  }
}

// Modal Add Card ID
function openAddCardIdModal() {
  document.getElementById('inputNewCardId').value = '';
  document.getElementById('inputNewCardName').value = '';
  newCardSelectedTags = [];
  renderNewCardTagChips();
  document.getElementById('addCardIdModal').classList.add('show');
}

function renderNewCardTagChips() {
  const container = document.getElementById('newCardTagChips');
  if (!container) return;
  container.innerHTML = '';

  AVAILABLE_TAGS.forEach(t => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `db-tag-chip ${t.chipClass} ${newCardSelectedTags.includes(t.id) ? 'active' : ''}`;
    chip.textContent = t.name;
    chip.addEventListener('click', (e) => {
      e.preventDefault();
      const idx = newCardSelectedTags.indexOf(t.id);
      if (idx >= 0) {
        newCardSelectedTags.splice(idx, 1);
        chip.classList.remove('active');
      } else {
        newCardSelectedTags.push(t.id);
        chip.classList.add('active');
      }
    });
    container.appendChild(chip);
  });
}

function closeAddCardIdModal() {
  document.getElementById('addCardIdModal').classList.remove('show');
}

function confirmAddCardId() {
  const cardId = document.getElementById('inputNewCardId').value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  const cardName = document.getElementById('inputNewCardName').value.trim();

  if (!cardId) {
    showToast('Vui lòng nhập mã ID lá bài (chỉ chứa chữ cái thường, số và dấu _)!', 'danger');
    return;
  }
  if (!cardName) {
    showToast('Vui lòng nhập tên hiển thị tiếng Việt!', 'danger');
    return;
  }
  if (appData._CARD_IDS && appData._CARD_IDS[cardId]) {
    showToast(`Mã ID lá bài "${cardId}" đã tồn tại!`, 'warning');
    return;
  }

  if (!appData._CARD_IDS) appData._CARD_IDS = {};
  appData._CARD_IDS[cardId] = cardName;

  if (!appData._CARD_TAGS) appData._CARD_TAGS = {};
  appData._CARD_TAGS[cardId] = [...newCardSelectedTags];

  closeAddCardIdModal();
  renderAll();
  showToast(`Đã thêm lá bài "${cardName}" (${cardId}) vào danh mục!`, 'success');
}

// Toast Notification
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  const typeClass = type === 'danger' ? 'toast-error' : `toast-${type}`;
  toast.className = `toast ${typeClass} ${type}`;

  let icon = 'ℹ️';
  if (type === 'success') icon = '✓';
  else if (type === 'warning') icon = '⚠️';
  else if (type === 'danger' || type === 'error') icon = '✕';

  toast.innerHTML = `<span class="toast-icon">${icon}</span> <span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.2s ease';
    setTimeout(() => toast.remove(), 200);
  }, 3500);
}