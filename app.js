/**
 * Collection Book - app.js
 * 
 * 專案目標：Notion + Apple 風格收藏管理系統 (資料持久化與 LocalStorage 動態資料版)。
 * 
 * 特色：
 * 1. 本地 LocalStorage 持久化，並在首次啟動時自動寫入 data.js 的預設 JSON 資料模型。
 * 2. 側邊欄 (Sidebar) 及大分類導覽與篩選，完美保留原版 Apple 風格 UI 及過濾效果。
 * 3. 點擊任何藏品卡片，右側 Drawer (抽屜) 改為從 LocalStorage 讀取即時資料，完全動態生成。
 * 4. 統計看板與首頁卡片件數、金額均由 Storage 計算得來，無寫死資料。
 * 5. 實現完整的藏品新增、編輯、刪除、多圖拖曳上傳與預覽、備份 JSON 匯入/匯出、出廠重設。
 */

// ===== App 資訊 =====
const APP_NAME = "Collection Book";
const APP_VERSION = "2.9.0";
const APP_BUILD = "2026-08-15";

// 1. 側邊欄與首頁系列定義對照表 - 動態獲取 (用於將側邊欄 data-series 對應到 Item.series 欄位)
function getDynamicSeriesMap() {
  const seriesList = CollectionStorage.getAllSeries();
  const map = {};
  seriesList.forEach(s => {
    map[s.id] = { title: s.name, emoji: s.emoji || '📦' };
  });
  return map;
}

// 2. 首頁大分類映射關係
const CATEGORY_MAP = {
  'category-娃娃': {
    title: '娃娃',
    emoji: '🧸'
  },
  'category-周邊': {
    title: '周邊',
    emoji: '🎁'
  },
  'category-旅遊': {
    title: '旅遊',
    emoji: '✈️'
  }
};

/**
 * 格式化標籤為統一 Chips 樣式 (卡片版)
 */
function formatTagToChip(tag) {
  let tagName = tag.replace(/^#/, '').trim();
  const tagEmojiMap = {
    '生日': '🎂',
    '日本': '🇯🇵',
    '韓國': '🇰🇷',
    '香港': '🇭🇰',
    '台灣': '🇹🇼',
    '迪士尼': '🏰',
    '櫻花': '🌸',
    '富士山': '🗻',
    '橘子': '🍊',
    '經典': '⭐️',
    '預購': '📦',
    '限定': '✨',
    '玩具': '🧸',
    '娃娃': '🧸',
    '伴手禮': '🎁',
    '御守': '⛩️',
    '叮叮車': '🚃',
    '應援': '🔦',
    '紀念': '🏅',
    '開箱': '📦'
  };
  
  let emoji = '🏷️';
  for (const [key, value] of Object.entries(tagEmojiMap)) {
    if (tagName.includes(key)) {
      emoji = value;
      break;
    }
  }
  return `<span class="card-tag-item">${emoji} ${tagName}</span>`;
}

/**
 * 格式化標籤為統一 Chips 樣式 (詳情 Drawer 版)
 */
function formatTagToDrawerChip(tag) {
  let tagName = tag.replace(/^#/, '').trim();
  const tagEmojiMap = {
    '生日': '🎂',
    '日本': '🇯🇵',
    '韓國': '🇰🇷',
    '香港': '🇭🇰',
    '台灣': '🇹🇼',
    '迪士尼': '🏰',
    '櫻花': '🌸',
    '富士山': '🗻',
    '橘子': '🍊',
    '經典': '⭐️',
    '預購': '📦',
    '限定': '✨',
    '玩具': '🧸',
    '娃娃': '🧸',
    '伴手禮': '🎁',
    '御守': '⛩️',
    '叮叮車': '🚃',
    '應援': '🔦',
    '紀念': '🏅',
    '開箱': '📦'
  };
  
  let emoji = '🏷️';
  for (const [key, value] of Object.entries(tagEmojiMap)) {
    if (tagName.includes(key)) {
      emoji = value;
      break;
    }
  }
  return `<span class="drawer-tag">${emoji} ${tagName}</span>`;
}

// ----------------------------------------------------------
// 系統核心升級：空間監控、自動壓縮、Toast 提示與自訂確認對話框
// ----------------------------------------------------------

/**
 * 計算 LocalStorage 目前已使用的位元組大小
 */
/**
 * 計算 LocalStorage 目前已使用的位元組大小
 */
function getLocalStorageUsage() {
  let totalChars = 0;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;

    const value = localStorage.getItem(key) || '';
    totalChars += key.length + value.length;
  }

  const usedBytes = totalChars * 2;
  const maxBytes = 5 * 1024 * 1024;
  const percentage = (usedBytes / maxBytes) * 100;

  return {
    usedBytes,
    maxBytes,
    percentage: Math.min(percentage, 100)
  };
}

/**
 * 彈出儲存空間耗盡警告視窗
 */
function showCapacityWarningDialog(percentage) {
  let oldDialog = document.getElementById('capacity-warning-dialog');
  if (oldDialog) oldDialog.remove();

  const dialog = document.createElement('div');
  dialog.id = 'capacity-warning-dialog';
  dialog.className = 'custom-dialog-overlay';
  
  dialog.innerHTML = `
    <div class="custom-dialog-card" style="max-width: 420px; border-top: 4px solid #ff9500;">
      <div class="custom-dialog-content">
        <div style="font-size: 2.5rem; text-align: center; margin-bottom: 12px;">⚠️</div>
        <h3 style="font-size: var(--fs-md); font-weight: 700; text-align: center; margin-bottom: 12px; color: #ff9500;">本機儲存空間即將耗盡</h3>
        <p style="font-size: var(--fs-xs); color: var(--text-muted); text-align: center; margin-bottom: 16px;">
          當前瀏覽器本機儲存空間使用率已達 <strong>${percentage.toFixed(1)}%</strong>。<br>
          為防資料遺失，建議您立即匯出資料進行備份，並清理部分大容量圖片或舊收藏品。
        </p>
        <div style="background: var(--bg-sidebar); border-radius: var(--radius-sm); padding: 12px; border: 1px solid var(--border-light); margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px;">
            <span>儲存空間使用率</span>
            <span style="font-weight: 600;">${percentage.toFixed(1)}%</span>
          </div>
          <div style="height: 6px; background-color: rgba(0, 0, 0, 0.1); border-radius: 3px; overflow: hidden;">
            <div style="width: ${percentage}%; height: 100%; background-color: #ff9500; border-radius: 3px;"></div>
          </div>
        </div>
      </div>
      <div class="custom-dialog-actions" style="grid-template-columns: 1fr 1.2fr;">
        <button class="custom-dialog-btn cancel-btn" id="capacity-dialog-close">稍後再說</button>
        <button class="custom-dialog-btn confirm-btn" style="background-color: var(--accent);" id="capacity-dialog-export">📦 立即匯出備份</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(dialog);
  setTimeout(() => dialog.classList.add('active'), 10);
  
  dialog.querySelector('#capacity-dialog-close').addEventListener('click', () => {
    dialog.classList.remove('active');
    setTimeout(() => dialog.remove(), 250);
  });
  
  dialog.querySelector('#capacity-dialog-export').addEventListener('click', () => {
    dialog.classList.remove('active');
    setTimeout(() => dialog.remove(), 250);
    const btnExport = document.getElementById('btn-export-json');
    if (btnExport) btnExport.click();
  });
}

/**
 * 檢查空間剩餘容量 (若容量大於 85% 則進行警示)
 */
function checkAndWarnStorageCapacity(estimatedSizeNeed = 0) {
  const { usedBytes, maxBytes, percentage } = getLocalStorageUsage();
  if (percentage >= 85 || (usedBytes + estimatedSizeNeed > maxBytes)) {
    showCapacityWarningDialog(percentage);
    return true;
  }
  return false;
}

/**
 * 顯示 Toast 提示訊息
 */
function showToast(message) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast-item';
  toast.innerHTML = `<span style="font-size: 1.1rem;">✨</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => toast.classList.add('show'), 10);

  setTimeout(() => {
    toast.classList.add('hide');
    setTimeout(() => toast.remove(), 300);
  }, 2200);
}

/**
 * 自訂 Apple/Notion 極簡風 RWD 確認視窗
 */
function showConfirmDialog(message, confirmText = '確認', cancelText = '取消', isDelete = false) {
  return new Promise((resolve) => {
    let oldDialog = document.getElementById('custom-confirm-dialog');
    if (oldDialog) oldDialog.remove();

    const dialog = document.createElement('div');
    dialog.id = 'custom-confirm-dialog';
    dialog.className = 'custom-dialog-overlay';
    
    dialog.innerHTML = `
      <div class="custom-dialog-card">
        <div class="custom-dialog-content">
          <p class="custom-dialog-message">${message.replace(/\n/g, '<br>')}</p>
        </div>
        <div class="custom-dialog-actions">
          <button class="custom-dialog-btn cancel-btn" id="confirm-dialog-cancel">${cancelText}</button>
          <button class="custom-dialog-btn confirm-btn ${isDelete ? 'delete-btn' : ''}" id="confirm-dialog-confirm">${confirmText}</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(dialog);
    setTimeout(() => dialog.classList.add('active'), 10);
    
    const cleanup = (value) => {
      dialog.classList.remove('active');
      setTimeout(() => dialog.remove(), 250);
      resolve(value);
    };
    
    dialog.querySelector('#confirm-dialog-cancel').addEventListener('click', () => cleanup(false));
    dialog.querySelector('#confirm-dialog-confirm').addEventListener('click', () => cleanup(true));
  });
}

/**
 * 自動等比例壓縮圖片至 JPEG 80% (最長邊不超過 1600px)
 */
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxSide = 1600;

        if (width > maxSide || height > maxSide) {
          if (width > height) {
            height = Math.round((height * maxSide) / width);
            width = maxSide;
          } else {
            width = Math.round((width * maxSide) / height);
            height = maxSide;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

// 當前視圖狀態暫存
let currentView = 'dashboard';
let currentSeries = 'chicken';
let currentFilter = 'all';

// 全域狀態：當前表單正在上傳的照片 Base64 陣列
let formUploadedImages = [];

// 全域狀態：詳情抽屜中的照片輪播狀態
let detailDrawerImages = [];
let currentDetailImageIndex = 0;
let lightboxImageIndex = 0;

function getCurrencySymbol(code) {
  const currencies = CollectionStorage.getAllCurrencies();
  const found = currencies.find(c => c.code === code);
  return found ? found.symbol : (code === 'JPY' || code === 'CNY' ? '¥' : (code === 'EUR' ? '€' : (code === 'KRW' ? '₩' : 'NT$')));
}

/**
 * 取得藏品的統計價格與幣別
 */
function getItemStatsPriceAndCurrency(item) {
  // 優先權 1：當地價格 (當地幣別)
  if (item.localPrice !== undefined && item.localPrice !== null && item.localPrice !== '') {
    return {
      price: Number(item.localPrice),
      currency: item.localCurrency || 'TWD'
    };
  }
  // 相容於舊資料 (直接儲存在 .price & .currency 中的資料)
  if (item.price !== undefined && item.price !== null && item.price !== '') {
    return {
      price: Number(item.price),
      currency: item.currency || 'TWD'
    };
  }
  return {
    price: 0,
    currency: 'TWD'
  };
}

/**
 * 取得狀態為「已收藏 (collected)」的項目
 */
function getCollectedItems(items) {
  return (items || []).filter(item => (item.status || 'collected') === 'collected');
}

/**
 * 取得狀態為「已收藏 (collected)」的項目數量
 */
function getCollectedCount(items) {
  return getCollectedItems(items).length;
}

/**
 * 取得狀態為「已收藏 (collected)」的項目總金額 (依幣別統計)
 */
function getCollectedValue(items) {
  const collected = getCollectedItems(items);
  const totals = {};
  collected.forEach(item => {
    const stats = getItemStatsPriceAndCurrency(item);
    if (stats.price > 0) {
      totals[stats.currency] = (totals[stats.currency] || 0) + stats.price;
    }
  });
  return totals;
}

/**
 * 取得卡片顯示用之價格字串
 */
function getItemDisplayPriceString(item) {
  const stats = getItemStatsPriceAndCurrency(item);
  if (stats.price > 0) {
    const symbol = getCurrencySymbol(stats.currency);
    return `${symbol} ${stats.price.toLocaleString()}`;
  }
  return '';
}

/**
 * 取得數值型態的計算價格 (用於排序)
 */
function getItemComputedPrice(item) {
  const stats = getItemStatsPriceAndCurrency(item);
  return stats.price;
}

function getMultiCurrencyAmountString(items) {
  const currencyTotals = getCollectedValue(items);
  const keys = Object.keys(currencyTotals);
  if (keys.length === 0) return 'NT$ 0';
  
  return keys.map(cur => {
    const symbol = getCurrencySymbol(cur);
    const val = currencyTotals[cur];
    return `${symbol}${val.toLocaleString()}`;
  }).join(' / ');
}

function getAnyStatusValueString(items) {
  const totals = {};
  (items || []).forEach(item => {
    const stats = getItemStatsPriceAndCurrency(item);
    if (stats.price > 0) {
      totals[stats.currency] = (totals[stats.currency] || 0) + stats.price;
    }
  });
  const keys = Object.keys(totals);
  if (keys.length === 0) return 'NT$ 0';
  return keys.map(cur => {
    const symbol = getCurrencySymbol(cur);
    const val = totals[cur];
    return `${symbol}${val.toLocaleString()}`;
  }).join(' / ');
}

function populateCurrencySelects() {
  const localSelect = document.getElementById('form-local-currency');
  const chargeSelect = document.getElementById('form-charge-currency');
  const filterSelect = document.getElementById('filter-currency-select');

  const currencies = CollectionStorage
    .getAllCurrencies()
    .filter(currency => currency.enabled !== false);

  const optionsHtml = currencies.map(currency => {
    const code = String(currency.code || '').trim();
    const name = String(currency.name || '').trim();

    const displayName = name.toUpperCase().startsWith(code.toUpperCase())
      ? name
      : `${code}（${name}）`;

    return `<option value="${code}">${displayName}</option>`;
  }).join('');

  const emptyAndOptionsHtml =
    '<option value="">-- 幣別 --</option>' + optionsHtml;

  if (localSelect) {
    const currentValue = localSelect.value;
    localSelect.innerHTML = emptyAndOptionsHtml;

    if (
      currentValue &&
      currencies.some(currency => currency.code === currentValue)
    ) {
      localSelect.value = currentValue;
    }
  }

  if (chargeSelect) {
    const currentValue = chargeSelect.value;
    chargeSelect.innerHTML = emptyAndOptionsHtml;

    if (
      currentValue &&
      currencies.some(currency => currency.code === currentValue)
    ) {
      chargeSelect.value = currentValue;
    }
  }

  if (filterSelect) {
    const currentValue = filterSelect.value;

    filterSelect.innerHTML =
      '<option value="all">🪙 幣別：全部</option>' +
      optionsHtml;

    if (
      currentValue &&
      (
        currentValue === 'all' ||
        currencies.some(currency => currency.code === currentValue)
      )
    ) {
      filterSelect.value = currentValue;
    } else {
      filterSelect.value = 'all';
    }
  }
}

function populatePaymentSelects() {
  const methodSelect = document.getElementById('form-payment-method');
  const toolSelect = document.getElementById('form-payment-tool');
  const filterMethodSelect = document.getElementById('filter-payment-method-select');

  const methods = CollectionStorage.getAllPaymentMethods();
  const tools = CollectionStorage.getAllPaymentTools();

  // 新增 / 編輯收藏
  if (methodSelect) {
    const currentValue = methodSelect.value;

    methodSelect.innerHTML =
      '<option value="">-- 未選擇付款方式 --</option>' +
      methods.map(method => `<option value="${method}">${method}</option>`).join('');

    if (methods.includes(currentValue)) {
      methodSelect.value = currentValue;
    }
  }

  // 付款工具
  if (toolSelect) {
    const currentValue = toolSelect.value;

    toolSelect.innerHTML =
      '<option value="">-- 未選擇付款工具 --</option>' +
      tools.map(tool => `<option value="${tool}">${tool}</option>`).join('');

    if (tools.includes(currentValue)) {
      toolSelect.value = currentValue;
    }
  }

  // ⭐ 篩選付款方式
  if (filterMethodSelect) {
    const currentValue = filterMethodSelect.value;

    filterMethodSelect.innerHTML =
      '<option value="all">💳 付款：全部</option>' +
      methods.map(method => `<option value="${method}">${method}</option>`).join('');

    if (currentValue === 'all' || methods.includes(currentValue)) {
      filterMethodSelect.value = currentValue;
    } else {
      filterMethodSelect.value = 'all';
    }
  }
}

/**
 * 依據付款方式是否為「現金」動態隱藏/顯示「付款工具」與「刷卡實際扣款」
 */
function updatePaymentFieldsVisibility() {
  const methodSelect = document.getElementById('form-payment-method');
  const cardChargeGroup = document.getElementById('form-group-card-charge');
  const toolGroup = document.getElementById('form-group-payment-tool');
  
  if (!methodSelect) return;
  const val = methodSelect.value || '';
  
  if (val === '現金') {
    if (cardChargeGroup) cardChargeGroup.style.display = 'none';
    if (toolGroup) toolGroup.style.display = 'none';
  } else {
    if (cardChargeGroup) cardChargeGroup.style.display = 'flex';
    if (toolGroup) toolGroup.style.display = 'flex';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // A. 初始化 LocalStorage 資料 (如果沒有的話會自動載入 data.js)
  CollectionStorage.init();

    // 顯示版本資訊
  const footerVersion = document.getElementById('footer-version');
  if (footerVersion) {
    footerVersion.textContent =
      `Version ${APP_VERSION} · Build ${APP_BUILD}`;
  }

  // B. 動態填充幣別選單
  populateCurrencySelects();
  populateFormSourceSelect();
  populatePaymentSelects();

  // C. 刷新資料
  refreshAppSeriesData();

  // C. 初始化網站 UI 與統計數據
  initApp();

  // D. 設定事件監聽
  setupEventListeners();

  // E. 收藏分析展開／收合
  const analysisCard = document.getElementById('stat-analysis');
  const analysisPanel = document.getElementById('analysis-details-panel');
  const analysisArrow = document.getElementById('analysis-expand-arrow');

  if (analysisCard && analysisPanel && analysisArrow) {
    analysisCard.addEventListener('click', () => {
      const isOpen = analysisPanel.style.display === 'block';

      analysisPanel.style.display = isOpen ? 'none' : 'block';
      analysisArrow.textContent = isOpen ? '▼ 展開' : '▲ 收合';
    });
  }

});

/**
 * 系統初始化
 */
function initApp() {
  console.log('Collection Book 系統載入完畢，已連接 LocalStorage 動態資料庫。');
  
  // 動態計算並更新 Dashboard 的統計數據與三個大分類卡片
  updateDashboardStats();

  // 顯示預設 Dashboard 視圖
  switchView('dashboard');
  
  // 高亮側欄首頁
  document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
  const homeMenu = document.getElementById('menu-home');
  if (homeMenu) homeMenu.classList.add('active');
}

/**
 * 根據藏品 ID 或屬性，動態分配其最具代表性的 Emoji
 */
function getItemEmoji(item) {
  const emojiMap = {
    'chk-01': '🐤',
    'chk-02': '🕵️‍♂️',
    'chk-03': '🍓',
    'dck-01': '🦆',
    'dck-02': '🌸',
    'yuk-01': '🗻',
    'yuk-02': '🌸',
    'sj-01': '⚡',
    'sj-02': '🏅',
    'exo-01': '🪐',
    'jp-01': '🍿',
    'jp-02': '🌸',
    'jp-03': '🏎️',
    'kr-01': '🧸',
    'kr-02': '🍊',
    'hk-01': '🚃',
    'hk-02': '🪙'
  };
  
  if (emojiMap[item.id]) {
    return emojiMap[item.id];
  }
  
  // 資料驅動：從 LocalStorage 中的系列中，尋找對應的 emoji
  const seriesList = CollectionStorage.getAllSeries();
  const found = seriesList.find(s => s.name === item.series);
  if (found) {
    return found.emoji || '📦';
  }
  
  return '📦';
}

/**
 * 動態計算並更新 Dashboard 的統計數據與三個大分類卡片
 */
/**
 * 動態渲染側邊欄系列清單
 */
/**
 * 動態渲染側邊欄系列清單
 */
function renderSidebarSeries() {
  const seriesList = CollectionStorage.getAllSeries();
  const allItems = CollectionStorage.getAll();
  
  const dollsContainer = document.getElementById('sidebar-series-dolls');
  const merchContainer = document.getElementById('sidebar-series-merch');
  const travelContainer = document.getElementById('sidebar-series-travel');
  
  if (dollsContainer) dollsContainer.innerHTML = '';
  if (merchContainer) merchContainer.innerHTML = '';
  
  seriesList.forEach(s => {
    const a = document.createElement('a');
    a.href = '#';
    a.className = 'menu-item sub-item';
    a.setAttribute('data-view', 'series');
    a.setAttribute('data-series', s.id);
    
    // 統計該系列中 status 為 collected 的數量
    const count = getCollectedCount(allItems.filter(item => item.series === s.name));
    a.innerHTML = `<span class="menu-icon">${s.emoji || '📦'}</span> ${s.name}`;
    
    // 如果目前選中此系列
    if (currentView === 'series' && currentSeries === s.id) {
      a.classList.add('active');
    }
    
    if (s.category === '娃娃' && dollsContainer) {
      dollsContainer.appendChild(a);
    } else if (s.category === '周邊' && merchContainer) {
      merchContainer.appendChild(a);
    }
  });

  // 3. 旅遊大分類 (Country -> Trip 樹狀階層結構)
  if (travelContainer) {
    travelContainer.innerHTML = '';
    
    const countries = CollectionStorage.getAllCountries();
    const trips = CollectionStorage.getAllTrips();

    countries.forEach(country => {
      // 國家群組
      const countryWrapper = document.createElement('div');
      countryWrapper.className = 'sidebar-country-group';
      countryWrapper.style.margin = '4px 0';
      
      const countryHeader = document.createElement('a');
      countryHeader.href = '#';
      countryHeader.className = 'menu-item sidebar-country-header';
      countryHeader.setAttribute('data-view', 'series');
      countryHeader.setAttribute('data-series', `country-${country.name}`);
      countryHeader.style.display = 'flex';
      countryHeader.style.alignItems = 'center';
      countryHeader.style.justifyContent = 'space-between';
      countryHeader.style.padding = '6px 12px 6px 16px';
      countryHeader.style.fontSize = 'var(--fs-xs)';
      countryHeader.style.fontWeight = '600';
      countryHeader.style.color = 'var(--text-muted)';
      countryHeader.style.textDecoration = 'none';
      countryHeader.style.cursor = 'pointer';
      
      const countryTitle = document.createElement('div');
      countryTitle.style.display = 'flex';
      countryTitle.style.alignItems = 'center';
      countryTitle.style.gap = '6px';
      countryTitle.innerHTML = `<span>${country.emoji || '🗺️'}</span> <span>${country.name}</span>`;
      countryHeader.appendChild(countryTitle);

      countryWrapper.appendChild(countryHeader);

      // 國家底下的旅程
      const countryTrips = trips.filter(t => t.countryId === country.id);
      if (countryTrips.length === 0) {
        const noTripEl = document.createElement('div');
        noTripEl.style.paddingLeft = '32px';
        noTripEl.style.fontSize = '11px';
        noTripEl.style.color = 'var(--text-muted)';
        noTripEl.style.fontStyle = 'italic';
        noTripEl.style.margin = '2px 0 6px 0';
        noTripEl.textContent = '暫無旅程';
        countryWrapper.appendChild(noTripEl);
      } else {
        const tripsListContainer = document.createElement('div');
        tripsListContainer.className = 'sidebar-trips-list';
        
        countryTrips.forEach(trip => {
          const tripLink = document.createElement('a');
          tripLink.href = '#';
          tripLink.className = 'menu-item sub-item travel-trip-item';
          tripLink.style.paddingLeft = '32px';
          tripLink.setAttribute('data-view', 'trip');
          tripLink.setAttribute('data-trip', trip.id);
          
          tripLink.innerHTML = `<span class="menu-icon">✈️</span> ${trip.name}`;
          
          if (currentView === 'trip' && currentTrip === trip.id) {
            tripLink.classList.add('active');
          }
          
          tripLink.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
            tripLink.classList.add('active');
            currentTrip = trip.id;
            switchView('trip');
            renderTripPage(trip.id);
          });

          tripsListContainer.appendChild(tripLink);
        });
        countryWrapper.appendChild(tripsListContainer);
      }

      travelContainer.appendChild(countryWrapper);
    });
  }

  // 4. 統計靜態標籤
  const tagsInSidebar = document.querySelectorAll('.menu-item[data-series^="tag-"]');
  tagsInSidebar.forEach(el => {
    const seriesKey = el.getAttribute('data-series');
    const tagName = '#' + seriesKey.replace('tag-', '');
    const count = getCollectedCount(allItems.filter(item => (item.tags || []).includes(tagName)));
    el.innerHTML = `<span class="menu-icon">🏷️</span> ${tagName} (${count})`;
  });
  
  // 同步高亮側邊欄 Active 狀態
  syncSidebarActiveState();

  // 重新綁定新生成的側欄事件
  bindNavigationElements();
}

/**
 * 同步高亮側邊欄 Active 狀態
 */
function syncSidebarActiveState() {
  // 移除所有側邊欄選單的 active 樣式
  document.querySelectorAll('#app-sidebar .menu-item, #app-sidebar .sidebar-country-header, #app-sidebar .menu-section-title').forEach(el => {
    el.classList.remove('active');
  });

  if (currentView === 'dashboard') {
    const homeMenu = document.getElementById('menu-home');
    if (homeMenu) homeMenu.classList.add('active');
  } else if (currentView === 'settings') {
    const settingsMenu = document.getElementById('menu-settings');
    if (settingsMenu) settingsMenu.classList.add('active');
  } else if (currentView === 'series') {
    if (currentSeries === 'category-娃娃') {
      const el = document.getElementById('menu-dolls');
      if (el) el.classList.add('active');
    } else if (currentSeries === 'category-周邊') {
      const el = document.getElementById('menu-merch');
      if (el) el.classList.add('active');
    } else if (currentSeries === 'category-旅遊') {
      const el = document.getElementById('menu-travel');
      if (el) el.classList.add('active');
    } else if (currentSeries && currentSeries.startsWith('country-')) {
      const countryName = currentSeries.replace('country-', '');
      const el = document.querySelector(`#app-sidebar .sidebar-country-header[data-series="country-${countryName}"]`);
      if (el) el.classList.add('active');
    } else if (currentSeries) {
      const el = document.querySelector(`#app-sidebar .menu-item[data-series="${currentSeries}"]`);
      if (el) el.classList.add('active');
    }
  } else if (currentView === 'trip') {
    if (currentTrip) {
      const el = document.querySelector(`#app-sidebar .menu-item[data-trip="${currentTrip}"]`);
      if (el) el.classList.add('active');
    }
  }
}

/**
 * 動態渲染新增收藏品表單中的系列下拉選單
 */
function renderFormSeriesSelect() {
  const seriesSelect = document.getElementById('form-series');
  if (!seriesSelect) return;

  const seriesList = CollectionStorage.getAllSeries();

  const dolls = seriesList.filter(series => series.category === '娃娃');
  const merch = seriesList.filter(series => series.category === '周邊');

  let html = '';

  if (dolls.length > 0) {
    html += `<optgroup label="🧸 娃娃">`;

    dolls.forEach(series => {
      html += `<option value="${series.name}">${series.name}</option>`;
    });

    html += `</optgroup>`;
  }

  if (merch.length > 0) {
    html += `<optgroup label="🎁 周邊">`;

    merch.forEach(series => {
      html += `<option value="${series.name}">${series.name}</option>`;
    });

    html += `</optgroup>`;
  }

  seriesSelect.innerHTML = html;
}
function updateMemberSelect(preferredValue = null) {
  const seriesSelect = document.getElementById('form-series');
  const memberGroup = document.getElementById('form-member-group');
  const memberList = document.getElementById('form-member-list');
  const allButton = document.getElementById('btn-member-all');
  const clearButton = document.getElementById('btn-member-clear');

  if (!seriesSelect || !memberGroup || !memberList) return;

  const series = seriesSelect.value;

  const merchSeries = CollectionStorage
    .getAllSeries()
    .find(item => item.category === '周邊' && item.name === series);

  // 不是周邊系列時，隱藏成員欄位
  if (!merchSeries) {
    memberGroup.style.display = 'none';
    memberList.innerHTML = '';
    return;
  }

  const group = CollectionStorage.getGroupByName(series);

  const members = (group?.members || [])
    .map(member => {
      if (typeof member === 'string') return member;

      return member?.name ||
        member?.label ||
        member?.value ||
        '';
    })
    .map(member => String(member).trim())
    .filter(member => member && member !== '全員');

  /*
   * 決定目前要帶入哪些成員：
   * 1. preferredValue 可以是字串，例如「東海」
   * 2. 也可以是陣列，例如 ["東海", "銀赫"]
   * 3. 沒有傳值時，保留畫面目前已勾選的成員
   */
  let selectedMembers = [];

  if (preferredValue !== null && preferredValue !== undefined) {
    if (Array.isArray(preferredValue)) {
      selectedMembers = preferredValue;
    } else if (typeof preferredValue === 'string' && preferredValue.trim()) {
      selectedMembers = preferredValue
        .split(/[、,，]/)
        .map(value => value.trim())
        .filter(Boolean);
    }
  } else {
    selectedMembers = Array.from(
      memberList.querySelectorAll('input[type="checkbox"]:checked')
    ).map(input => input.value);
  }

  selectedMembers = selectedMembers
    .map(member => {
      if (typeof member === 'string') return member;

      return member?.name ||
        member?.label ||
        member?.value ||
        '';
    })
    .map(member => String(member).trim())
    .filter(Boolean);

  // 選了全員時，只保留全員
  if (selectedMembers.includes('全員')) {
    selectedMembers = ['全員'];
  }

  memberGroup.style.display = '';
  memberList.innerHTML = '';

  const createMemberCheckbox = memberName => {
    const item = document.createElement('label');
    item.className = 'member-checkbox-item';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.name = 'form-members';
    checkbox.value = memberName;
    checkbox.checked =
      selectedMembers.includes('全員') ||
      selectedMembers.includes(memberName);

    const text = document.createElement('span');
    text.textContent = memberName;

    item.appendChild(checkbox);
    item.appendChild(text);
    memberList.appendChild(item);

    return checkbox;
  };

  // 不建立「全員」checkbox
  const allCheckbox = createMemberCheckbox('全員');
  allCheckbox.parentElement.style.display = 'none';

  // 建立各成員選項
  const memberCheckboxes = members.map(member => {
    return createMemberCheckbox(member);
  });

const updateCheckboxState = () => {
  const allSelected =
    memberCheckboxes.length > 0 &&
    memberCheckboxes.every(checkbox => checkbox.checked);

  allCheckbox.checked = allSelected;

  memberCheckboxes.forEach(checkbox => {
    checkbox.disabled = false;
  });
};

  memberCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', () => {
      // 勾選個別成員時，自動取消「全員」
      if (checkbox.checked) {
        allCheckbox.checked = false;
      }

      updateCheckboxState();
    });
  });

  // 「全員」按鈕
  if (allButton) {
    allButton.onclick = () => {
      allCheckbox.checked = true;

      memberCheckboxes.forEach(checkbox => {
        checkbox.checked = true;
      });

      updateCheckboxState();
    };
  }

  // 「清除」按鈕
  if (clearButton) {
    clearButton.onclick = () => {
      allCheckbox.checked = false;

      memberCheckboxes.forEach(checkbox => {
        checkbox.checked = false;
        checkbox.disabled = false;
      });
    };
  }

  updateCheckboxState();
}

/**
 * 動態填充收藏品表單中的旅程下拉選單 (旅遊模組)
 */
function populateFormTravelTripSelect() {
  const tripSelect = document.getElementById('form-travel-trip');
  if (!tripSelect) return;
  
  const trips = CollectionStorage.getAllTrips();
  const countries = CollectionStorage.getAllCountries();

  let html = '';
  countries.forEach(country => {
    const countryTrips = trips.filter(t => t.countryId === country.id);
    if (countryTrips.length > 0) {
      html += `<optgroup label="${country.emoji || '🗺️'} ${country.name}">`;
      countryTrips.forEach(t => {
        html += `<option value="${t.id}">${t.name}</option>`;
      });
      html += `</optgroup>`;
    }
  });

  if (html === '') {
    html = '<option value="">(尚未建立任何旅程，請先新增旅程)</option>';
  }
  tripSelect.innerHTML = html;
}

/**
 * 刷新所有系列資料
 */
function refreshAppSeriesData() {
  renderSidebarSeries();
  renderFormSeriesSelect();
  populateFormTravelTripSelect();
  updateDashboardStats();
}

window.removeTripCoverPreview = function() {
  tripFormCoverImage = '';
  const previewContainer = document.getElementById('form-trip-cover-preview-container');
  if (previewContainer) previewContainer.innerHTML = '';
};

/**
 * 開啟旅程新增/編輯表單 (旅遊模組)
 */
function openTripFormDrawer(tripId = null, prefilledCountryId = null) {
  const formDrawer = document.getElementById('item-form-drawer');
  const backdrop = document.getElementById('drawer-backdrop');
  if (!formDrawer || !backdrop) return;
  
  // 顯示旅程表單，隱藏一般藏品和系列表單
  document.getElementById('collection-form').style.display = 'none';
  document.getElementById('series-form').style.display = 'none';
  document.getElementById('trip-form').style.display = 'block';
  
  const titleEl = document.getElementById('form-drawer-title');
  const idInput = document.getElementById('form-trip-id');
  
  const nameInput = document.getElementById('form-trip-name');
  const startDateInput = document.getElementById('form-trip-start-date');
  const endDateInput = document.getElementById('form-trip-end-date');
  const citiesInput = document.getElementById('form-trip-cities-input');
  const accommodationInput = document.getElementById('form-trip-accommodation');
  const companionsInput = document.getElementById('form-trip-companions');
  const noteInput = document.getElementById('form-trip-note');
  const previewContainer = document.getElementById('form-trip-cover-preview-container');
  
  // 初始化/重設封面圖片變數
  tripFormCoverImage = '';
  if (previewContainer) previewContainer.innerHTML = '';
  
  if (tripId) {
    // 編輯模式
    titleEl.textContent = '編輯旅程';
    const trip = CollectionStorage.getAllTrips().find(t => t.id === tripId);
    if (trip) {
      idInput.value = trip.id;
      nameInput.value = trip.name || '';
      startDateInput.value = trip.startDate || '';
      endDateInput.value = trip.endDate || '';
      citiesInput.value = (trip.cities || []).join(' ');
      accommodationInput.value = trip.accommodation || '';
      companionsInput.value = trip.companions || '';
      noteInput.value = trip.note || '';
      
      populateTripFormCountrySelect(trip.countryId);
      
      if (trip.coverImage) {
        tripFormCoverImage = trip.coverImage;
        if (previewContainer) {
          previewContainer.innerHTML = `
            <div class="preview-img-wrapper" style="position: relative; width: 100%; height: 120px; border-radius: var(--radius-sm); overflow: hidden; margin-top: 8px;">
              <img src="${trip.coverImage}" style="width: 100%; height: 100%; object-fit: cover;">
              <button type="button" class="btn-remove-preview-img" style="position: absolute; top: 4px; right: 4px; background: rgba(0,0,0,0.6); color: white; border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 12px;" onclick="removeTripCoverPreview()">✕</button>
            </div>
          `;
        }
      }
    }
  } else {
    // 新增模式
    titleEl.textContent = '新增旅程';
    idInput.value = '';
    nameInput.value = '';
    
    const todayStr = new Date().toISOString().substring(0, 10);
    startDateInput.value = todayStr;
    endDateInput.value = todayStr;
    
    citiesInput.value = '';
    accommodationInput.value = '';
    companionsInput.value = '';
    noteInput.value = '';
    
    populateTripFormCountrySelect(prefilledCountryId);
  }
  
  // 展開 Drawer
  formDrawer.classList.add('open');
  backdrop.classList.add('show');
  document.body.style.overflow = 'hidden';
}

/**
 * 動態填充旅程表單中的國家下拉選單
 */
function populateTripFormCountrySelect(selectedCountryId = null) {
  const countrySelect = document.getElementById('form-trip-country-select');
  if (!countrySelect) return;
  
  const countries = CollectionStorage.getAllCountries();
  let html = countries.map(c => 
    `<option value="${c.id}" ${selectedCountryId === c.id ? 'selected' : ''}>${c.emoji || '🗺️'} ${c.name}</option>`
  ).join('');
  
  if (html === '') {
    html = '<option value="">(請先在設定中建立國家)</option>';
  }
  countrySelect.innerHTML = html;
}

/**
 * 儲存旅程表單
 */
async function saveTripForm() {
  const id = document.getElementById('form-trip-id').value;
  const name = document.getElementById('form-trip-name').value.trim();
  const startDate = document.getElementById('form-trip-start-date').value;
  const endDate = document.getElementById('form-trip-end-date').value;
  const countryId = document.getElementById('form-trip-country-select').value;
  const citiesRaw = document.getElementById('form-trip-cities-input').value.trim();
  const accommodation = document.getElementById('form-trip-accommodation').value.trim();
  const companions = document.getElementById('form-trip-companions').value.trim();
  const note = document.getElementById('form-trip-note').value.trim();
  
  if (!name) {
    alert('請填寫旅程名稱！');
    return;
  }
  if (!startDate || !endDate) {
    alert('請填寫開始與結束日期！');
    return;
  }
  if (!countryId) {
    alert('請選擇國家！如果沒有可選國家，請先至系統設定中建立國家。');
    return;
  }
  
  const cities = citiesRaw ? citiesRaw.split(/[\s,，]+/).filter(Boolean) : [];
  
  const tripData = {
    name,
    startDate,
    endDate,
    countryId,
    cities,
    accommodation,
    companions,
    note,
    coverImage: tripFormCoverImage || ''
  };

  const isEdit = !!id;
  const confirmMsg = isEdit ? `是否修改此旅程「${name}」？` : `是否新增此旅程「${name}」？`;
  const isConfirmed = await showConfirmDialog(confirmMsg, isEdit ? '確認修改' : '確認新增');
  if (!isConfirmed) return;
  
  if (id) {
    // 編輯
    CollectionStorage.updateTrip(id, tripData);
    showToast(`✏️ 旅程「${name}」修改成功！`);
    if (currentView === 'trip' && currentTrip === id) {
      renderTripPage(id);
    }
  } else {
    // 新增
    const newTripId = 'trip-' + Date.now();
    CollectionStorage.addTrip({
      id: newTripId,
      ...tripData
    });
    showToast(`🎉 旅程「${name}」建立成功！`);
    
    // 自動導向新旅程
    currentTrip = newTripId;
    switchView('trip');
    renderTripPage(newTripId);
  }
  
  closeFormDrawer();
  refreshAppSeriesData();
}

/**
 * 刪除旅程
 */
async function deleteTripAction(tripId) {
  const trip = CollectionStorage.getAllTrips().find(t => t.id === tripId);
  if (!trip) return;
  
  // 檢查是否有隸屬此旅程的收藏
  const hasItems = CollectionStorage.getAll().some(item => item.tripId === tripId);
  if (hasItems) {
    alert(`❌ 禁止刪除！\n\n此旅程底下仍有關聯的收藏品。請先刪除或移開這些收藏。`);
    return;
  }
  
  const isConfirmed = await showConfirmDialog(`⚠️ 是否確定刪除旅程「${trip.name}」？此動作將無法復原。`, '確定刪除', '取消', true);
  if (isConfirmed) {
    CollectionStorage.deleteTrip(tripId);
    showToast(`🗑️ 旅程「${trip.name}」已成功刪除！`);
    switchView('dashboard');
    refreshAppSeriesData();
  }
}

/**
 * 渲染特定旅程詳細頁面 (旅遊模組)
 */
function renderTripPage(tripId) {
  const trip = CollectionStorage.getAllTrips().find(t => t.id === tripId);
  if (!trip) {
    switchView('dashboard');
    return;
  }
  
  const countries = CollectionStorage.getAllCountries();
  const country = countries.find(c => c.id === trip.countryId);
  
  // A. 填充基本屬性
  const coverBanner = document.getElementById('trip-cover-banner');
  const coverImg = document.getElementById('trip-cover-img');
  
  if (trip.coverImage) {
    if (coverImg) {
      coverImg.src = trip.coverImage;
      coverImg.style.display = 'block';
    }
    if (coverBanner) {
      coverBanner.style.display = 'flex';
    }
  } else {
    if (coverImg) {
      coverImg.src = '';
      coverImg.style.display = 'none';
    }
    if (coverBanner) {
      coverBanner.style.display = 'none';
    }
  }
  
  const emojiIcon = document.getElementById('trip-emoji-icon');
  if (emojiIcon) emojiIcon.textContent = (country && country.emoji) ? country.emoji : '🗺️';
  
  const detailName = document.getElementById('trip-detail-name');
  if (detailName) detailName.textContent = trip.name;
  
  const detailDate = document.getElementById('trip-detail-date');
  if (detailDate) detailDate.textContent = `${trip.startDate} ~ ${trip.endDate}`;
  
  const detailCountry = document.getElementById('trip-detail-country');
  if (detailCountry) detailCountry.textContent = country ? `${country.emoji || ''} ${country.name}` : '---';
  
  const detailCities = document.getElementById('trip-detail-cities');
  if (detailCities) {
    detailCities.textContent = (trip.cities && trip.cities.length > 0) ? trip.cities.join(', ') : '---';
  }
  
  const accommodationRow = document.getElementById('trip-accommodation-row');
  const detailAccommodation = document.getElementById('trip-detail-accommodation');
  if (trip.accommodation) {
    if (accommodationRow) accommodationRow.style.display = 'block';
    if (detailAccommodation) detailAccommodation.textContent = trip.accommodation;
  } else {
    if (accommodationRow) accommodationRow.style.display = 'none';
  }
  
  const companionsRow = document.getElementById('trip-companions-row');
  const detailCompanions = document.getElementById('trip-detail-companions');
  if (trip.companions) {
    if (companionsRow) companionsRow.style.display = 'block';
    if (detailCompanions) detailCompanions.textContent = trip.companions;
  } else {
    if (companionsRow) companionsRow.style.display = 'none';
  }
  
  const noteRow = document.getElementById('trip-note-row');
  const detailNote = document.getElementById('trip-detail-note');
  if (trip.note) {
    if (noteRow) noteRow.style.display = 'block';
    if (detailNote) detailNote.textContent = trip.note;
  } else {
    if (noteRow) noteRow.style.display = 'none';
  }
  
  // B. 旅程底下的藏品與統計數據
  const allItems = CollectionStorage.getAll();
  const tripItems = allItems.filter(item => item.tripId === tripId);
  const tripCollectedItems = getCollectedItems(tripItems);
  
  // 更新統計標籤
  const itemsCountEl = document.getElementById('trip-stat-items-count');
  if (itemsCountEl) itemsCountEl.textContent = tripCollectedItems.length;
  
  let imgCount = 0;
  tripItems.forEach(item => {
    if (item.images && item.images.length > 0) {
      imgCount += item.images.length;
    }
  });
  const imagesCountEl = document.getElementById('trip-stat-images-count');
  if (imagesCountEl) imagesCountEl.textContent = imgCount;
  
  const totalAmountEl = document.getElementById('trip-stat-total-amount');
  if (totalAmountEl) {
    totalAmountEl.textContent = getMultiCurrencyAmountString(tripItems);
  }

  // 統計旅程下各狀態的數量并更新 HTML
  const tripStatusCounts = {
    collected: 0,
    uncollected: 0,
    preorder: 0,
    ordered: 0,
    cancelled: 0
  };

  tripItems.forEach(item => {
    const status = item.status || 'collected';
    if (tripStatusCounts[status] !== undefined) {
      tripStatusCounts[status]++;
    }
  });

  const tripStatusCollected = document.getElementById('trip-status-val-collected');
  const tripStatusUncollected = document.getElementById('trip-status-val-uncollected');
  const tripStatusPreorder = document.getElementById('trip-status-val-preorder');
  const tripStatusOrdered = document.getElementById('trip-status-val-ordered');
  const tripStatusCancelled = document.getElementById('trip-status-val-cancelled');

  if (tripStatusCollected) tripStatusCollected.textContent = tripStatusCounts.collected;
  if (tripStatusUncollected) tripStatusUncollected.textContent = tripStatusCounts.uncollected;
  if (tripStatusPreorder) tripStatusPreorder.textContent = tripStatusCounts.preorder;
  if (tripStatusOrdered) tripStatusOrdered.textContent = tripStatusCounts.ordered;
  if (tripStatusCancelled) tripStatusCancelled.textContent = tripStatusCounts.cancelled;
  
  // C. 搜尋、篩選與排序藏品
  const searchInput = document.getElementById('trip-search-input');
  const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
  
  const activeFilters = [];
  const checkboxes = document.querySelectorAll('.trip-status-filter-checkbox');
  checkboxes.forEach(cb => {
    if (cb.checked) activeFilters.push(cb.value);
  });
  
  // 更新篩選徽章
  const badgeEl = document.getElementById('trip-filter-badge-count');
  if (badgeEl) {
    const totalStatusFilters = 5; // collected, uncollected, preorder, ordered, cancelled
    const unselectedCount = totalStatusFilters - activeFilters.length;
    if (unselectedCount > 0) {
      badgeEl.textContent = unselectedCount;
      badgeEl.style.display = 'inline-flex';
    } else {
      badgeEl.style.display = 'none';
    }
  }
  
  let filtered = tripItems.filter(item => {
    // 1. 搜尋
    let matchSearch = true;
    if (query) {
      const nameMatch = (item.name || '').toLowerCase().includes(query);
      const seriesMatch = (item.series || '').toLowerCase().includes(query);
      const noteMatch = (item.note || '').toLowerCase().includes(query);
      const sourceMatch = (item.source || '').toLowerCase().includes(query);
      const tagMatch = (item.tags || []).some(t => t.toLowerCase().includes(query));
      
      let travelMatch = false;
      if (item.category === '旅遊') {
        const countryMatch = (item.country || '').toLowerCase().includes(query);
        const cityMatch = (item.city || '').toLowerCase().includes(query);
        const shopMatch = (item.shop || '').toLowerCase().includes(query);
        const locationMatch = (item.location || '').toLowerCase().includes(query);
        travelMatch = countryMatch || cityMatch || shopMatch || locationMatch;
      }
      
      matchSearch = nameMatch || seriesMatch || noteMatch || sourceMatch || tagMatch || travelMatch;
    }
    
    // 2. 狀態
    const matchStatus = activeFilters.includes(item.status || 'collected');
    
    return matchSearch && matchStatus;
  });
  
  // 3. 排序
  const sortSelect = document.getElementById('trip-sort-select');
  const sortBy = sortSelect ? sortSelect.value : 'latest_added';
  
  filtered.sort((a, b) => {
    if (sortBy === 'latest_added') {
      const dateA = a.createdDate ? new Date(a.createdDate).getTime() : 0;
      const dateB = b.createdDate ? new Date(b.createdDate).getTime() : 0;
      return dateB - dateA;
    } else if (sortBy === 'oldest_added') {
      const dateA = a.createdDate ? new Date(a.createdDate).getTime() : 0;
      const dateB = b.createdDate ? new Date(b.createdDate).getTime() : 0;
      return dateA - dateB;
    } else if (sortBy === 'price_desc') {
      return getItemComputedPrice(b) - getItemComputedPrice(a);
    } else if (sortBy === 'price_asc') {
      return getItemComputedPrice(a) - getItemComputedPrice(b);
    } else if (sortBy === 'name_asc') {
      return (a.name || '').localeCompare(b.name || '', 'zh-Hant');
    } else if (sortBy === 'name_desc') {
      return (b.name || '').localeCompare(a.name || '', 'zh-Hant');
    } else if (sortBy === 'date_desc') {
      const valA = a.purchaseDate || '';
      const valB = b.purchaseDate || '';
      if (!valA && !valB) return 0;
      if (!valA) return 1;
      if (!valB) return -1;
      return valB.localeCompare(valA);
    } else if (sortBy === 'date_asc') {
      const valA = a.purchaseDate || '';
      const valB = b.purchaseDate || '';
      if (!valA && !valB) return 0;
      if (!valA) return 1;
      if (!valB) return -1;
      return valA.localeCompare(valB);
    }
    return 0;
  });
  
  // D. 渲染卡片
  const cardsContainer = document.getElementById('trip-cards-container');
  if (!cardsContainer) return;
  
  cardsContainer.innerHTML = '';
  
  if (filtered.length === 0) {
    cardsContainer.innerHTML = `
      <div style="grid-column: 1/-1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 20px; color: var(--text-muted); text-align: center;">
        <span style="font-size: 2.5rem; margin-bottom: 12px;">🏖️</span>
        <h4 style="font-size: var(--fs-sm); font-weight: 600; color: var(--text-main); margin-bottom: 6px;">此旅程尚無符合的收藏</h4>
        <p style="font-size: var(--fs-xs);">點擊右下角「➕」新增此旅程中的第一筆戰利品或景點吧！</p>
      </div>
    `;
    return;
  }
  
  const statusLabels = {
    collected: '已收藏',
    uncollected: '未收藏',
    preorder: '預購中',
    ordered: '已下單',
    cancelled: '已取消'
  };

  filtered.forEach(item => {
    const cardEl = document.createElement('div');
    cardEl.className = 'collection-card';
    cardEl.id = `item-card-${item.id}`;
    
    const cardBgColor = item.status === 'collected' 
      ? 'linear-gradient(135deg, #f5f5f7 0%, #e8e8ed 100%)' 
      : 'linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%)';

    const itemTags = item.tags || [];
    const displayedTags = itemTags.slice(0, 3);
    const hasMoreTags = itemTags.length > 3;
    const moreTagsCount = itemTags.length - 3;
    const statusText = statusLabels[item.status] || '已收藏';
    const displayPrice = getItemDisplayPriceString(item);
    const hasPrice = displayPrice !== '';
    const displayDate = item.purchaseDate || '無';
    const dateRowLabel = item.status === 'collected' ? `購入: ${displayDate}` : statusLabels[item.status] || '未收藏';

    const memberList = Array.isArray(item.members) && item.members.length
      ? item.members
      : item.member
        ? [item.member]
        : [];

const cardMemberText = memberList.length ? memberList.join('、') : '';

const emoji = getItemEmoji(item);

    let mediaHTML = `<span class="card-media-emoji">${emoji}</span>`;
    if (item.images && item.images.length > 0) {
      mediaHTML = `<img src="${item.images[0]}" alt="${item.name}" style="width: 100%; height: 100%; object-fit: cover;">`;
    }

    cardEl.innerHTML = `
      <div class="card-media" style="background: ${cardBgColor};">
        ${mediaHTML}
        <div class="card-status-badge ${item.status}">${statusText}</div>
      </div>
      <div class="card-info">
        <div class="card-tags">
          ${displayedTags.map(tag => formatTagToChip(tag)).join('')}
          ${hasMoreTags ? `<span class="card-tag-item more" style="background-color: var(--border-light); color: var(--text-muted);">+${moreTagsCount}</span>` : ''}
        </div>

      ${cardMemberText ? `<div class="card-item-member">👤 ${cardMemberText}</div>` : ''}

        <h3 class="card-item-name">${item.name}</h3>
        <div class="card-item-meta-row">
          ${hasPrice ? `<span class="card-item-price">${displayPrice}</span>` : '<span></span>'}
          <span class="card-item-date">${dateRowLabel}</span>
        </div>
      </div>
    `;

    cardEl.addEventListener('click', () => {
      const currentItem = CollectionStorage.getById(item.id) || item;
      openDrawer(currentItem);
    });

    cardsContainer.appendChild(cardEl);
  });
}

/**
 * 開啟系列新增/編輯表單
 */
function openSeriesFormDrawer(category, seriesItem = null) {
  const formDrawer = document.getElementById('item-form-drawer');
  const backdrop = document.getElementById('drawer-backdrop');
  if (!formDrawer || !backdrop) return;
  
  // 隱藏一般藏品表單，顯示系列表單
  document.getElementById('collection-form').style.display = 'none';
  document.getElementById('series-form').style.display = 'block';
  
  const titleEl = document.getElementById('form-drawer-title');
  const idInput = document.getElementById('form-series-id');
  const categorySelect = document.getElementById('form-series-category');
  const nameInput = document.getElementById('form-series-name');
  
  if (seriesItem) {
    // 重新命名/編輯模式
    titleEl.textContent = '編輯系列名稱';
    idInput.value = seriesItem.id;
    categorySelect.value = seriesItem.category;
    nameInput.value = seriesItem.name;
    categorySelect.disabled = true; // 編輯時不可更改分類
  } else {
    // 新建模式
    titleEl.textContent = '新增系列';
    idInput.value = '';
    categorySelect.value = category || '娃娃';
    nameInput.value = '';
    categorySelect.disabled = false;
  }
  
  // 展開 Drawer
  formDrawer.classList.add('open');
  backdrop.classList.add('show');
  document.body.style.overflow = 'hidden';
}

/**
 * 儲存系列表單
 */
async function saveSeriesForm() {
  const id = document.getElementById('form-series-id').value;
  const category = document.getElementById('form-series-category').value;
  const name = document.getElementById('form-series-name').value.trim();
  
  if (!name) {
    alert('請填寫系列名稱！');
    return;
  }
  
  // 智慧配對 Emoji
  let emoji = '📦';
  if (category === '娃娃') emoji = '🧸';
  else if (category === '周邊') emoji = '🎁';
  else if (category === '旅遊') emoji = '✈️';
  
  const customEmojis = {
    '雞': '🐤', '鴨': '🦆', '兔': '🐰', '貓': '🐱', '狗': '🐶',
    '日本': '🇯🇵', '韓國': '🇰🇷', '香港': '🇭🇰', '台灣': '🇹🇼', '美國': '🇺🇸', '泰國': '🇹🇭',
    'SJ': '⚡', 'EXO': '🪐', 'BTS': '💜', 'BLACK': '💗'
  };
  Object.keys(customEmojis).forEach(k => {
    if (name.toUpperCase().includes(k)) {
      emoji = customEmojis[k];
    }
  });

  const isEdit = !!id;
  const confirmMsg = isEdit ? `是否修改此系列「${name}」？` : `是否新增此系列「${name}」？`;
  const isConfirmed = await showConfirmDialog(confirmMsg, isEdit ? '確認修改' : '確認新增');
  if (!isConfirmed) return;
  
  if (isEdit) {
    // 編輯系列 / 重新命名模式
    const oldSeries = CollectionStorage.getSeriesById(id);
    if (oldSeries) {
      const oldName = oldSeries.name;
      if (oldName !== name) {
        // 同步修改藏品所屬系列
        const allItems = CollectionStorage.getAll();
        let updatedCount = 0;
        allItems.forEach(item => {
          if (item.series === oldName) {
            item.series = name;
            updatedCount++;
          }
        });
        if (updatedCount > 0) {
          CollectionStorage.save(allItems);
        }
        console.log(`同步更新了 ${updatedCount} 個收藏品的系列自「${oldName}」為「${name}」`);
      }
      
      CollectionStorage.updateSeries(id, { name: name, emoji: emoji });
      showToast(`✏️ 系列「${name}」修改成功！`);
    }
  } else {
    // 新增系列模式
    const allSeries = CollectionStorage.getAllSeries();
    if (allSeries.some(s => s.category === category && s.name.toLowerCase() === name.toLowerCase())) {
      alert('❌ 該分類下已存在同名系列！');
      return;
    }
    
    CollectionStorage.addSeries({
      id: 'series-' + Date.now(),
      category: category,
      name: name,
      emoji: emoji
    });
    showToast(`🎉 系列「${name}」新增成功！`);
  }
  
  closeFormDrawer();
  refreshAppSeriesData();
  
  // 如果此時是在該系列頁面中，直接重新渲染系列頁面
  if (currentView === 'series') {
    if (id) {
      renderSeriesPage(id);
    }
  }
}

function updateDashboardStats() {
  const allItems = CollectionStorage.getAll();
  const collectedItems = getCollectedItems(allItems);

  // 1. 收藏總數
  const totalCount = getCollectedCount(allItems);

  // 2. 收藏總金額 (依幣別統計)
  const currencyTotals = getCollectedValue(allItems);

  // 3. 本月新增 (篩選 2026 年 7 月新增且狀態為已收藏的項目)
  const systemNow = new Date('2026-07-14T01:36:39-07:00');
  const targetYear = systemNow.getFullYear();
  const targetMonth = systemNow.getMonth(); // 7 月是 6 (0-indexed)

  const monthlyNewCount = collectedItems.filter(item => {
    if (!item.createdDate) return false;
    const created = new Date(item.createdDate);
    return created.getFullYear() === targetYear && created.getMonth() === targetMonth;
  }).length;

  // 統計 5 種狀態的件數與金額
  const statusCounts = {
    collected: 0,
    uncollected: 0,
    preorder: 0,
    ordered: 0,
    cancelled: 0
  };

  const statusAmounts = {
    collected: {},
    uncollected: {},
    preorder: {},
    ordered: {},
    cancelled: {}
  };

  allItems.forEach(item => {
    const status = item.status || 'collected';
    if (statusCounts[status] !== undefined) {
      statusCounts[status]++;
    }
    const stats = getItemStatsPriceAndCurrency(item);
    if (stats.price > 0) {
      statusAmounts[status][stats.currency] = (statusAmounts[status][stats.currency] || 0) + stats.price;
    }
  });

  // 初始化大類統計
  const categoryStats = {
    '娃娃': { count: 0, currencyAmounts: {} },
    '周邊': { count: 0, currencyAmounts: {} },
    '旅遊': { count: 0, currencyAmounts: {} }
  };

  // 統計各大分類
  collectedItems.forEach(item => {
    const cat = item.category;
    if (categoryStats[cat] !== undefined) {
      categoryStats[cat].count++;
      const stats = getItemStatsPriceAndCurrency(item);
      if (stats.price > 0) {
        categoryStats[cat].currencyAmounts[stats.currency] = (categoryStats[cat].currencyAmounts[stats.currency] || 0) + stats.price;
      }
    }
  });

  // 更新 Dashboard 統計 HTML
  const totalEl = document.getElementById('stat-val-total');
  const amountEl = document.getElementById('stat-val-amount');
  const monthlyEl = document.getElementById('stat-val-monthly');

  if (totalEl) totalEl.textContent = totalCount;
  
  if (amountEl) {
    const activeCurrencies = Object.keys(currencyTotals);
    if (activeCurrencies.length === 0) {
      amountEl.innerHTML = 'NT$ 0';
    } else {
      amountEl.innerHTML = activeCurrencies.map(cur => {
        const symbol = getCurrencySymbol(cur);
        const val = currencyTotals[cur];
        return `<div class="currency-stat-row" style="margin-top:4px;display:flex;align-items:baseline;gap:8px;">
                  <span style="display:inline-block;width:40px;font-size:var(--fs-xs);color:var(--text-muted);font-weight:500;">${cur}</span>
                    <span style="font-size:var(--fs-lg);font-weight:800;">${symbol}${val.toLocaleString()}</span>
                </div>`;
      }).join('');
    }
  }
  
  if (monthlyEl) monthlyEl.textContent = monthlyNewCount;
// ===== 收藏分析 =====
const analysisSeriesList = document.getElementById('analysis-series-list');
const analysisCountryList = document.getElementById('analysis-country-list');

// 1. 收藏系列排行：只統計「已收藏」
if (analysisSeriesList) {
  const seriesCounts = {};

collectedItems.forEach(item => {
  // 收藏系列只統計娃娃與周邊，不包含旅遊
  if (item.category === '旅遊') return;

  const seriesName = (item.series || '').trim();
  if (!seriesName) return;

  seriesCounts[seriesName] = (seriesCounts[seriesName] || 0) + 1;
});

const sortedSeries = Object.entries(seriesCounts)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 3);

  if (sortedSeries.length === 0) {
    analysisSeriesList.textContent = '暫無資料';
  } else {
analysisSeriesList.innerHTML = sortedSeries
  .map(([name, count]) => `
    <div class="analysis-item">
      <span class="analysis-name">${name}</span>
      <span class="analysis-value">${count} 件</span>
    </div>
  `)
  .join('');
  }
}

// 2. 去過國家：依旅程數量統計
if (analysisCountryList) {
  const allTrips = CollectionStorage.getAllTrips();
  const allCountries = CollectionStorage.getAllCountries();
  const countryCounts = {};

  allTrips.forEach(trip => {
    const country = allCountries.find(c => c.id === trip.countryId);
    if (!country) return;

    const countryName = country.name || '未命名國家';

    if (!countryCounts[countryName]) {
      countryCounts[countryName] = {
        count: 0,
        emoji: country.emoji || '🗺️'
      };
    }

    countryCounts[countryName].count += 1;
  });

  const sortedCountries = Object.entries(countryCounts)
    .sort((a, b) => b[1].count - a[1].count);

  if (sortedCountries.length === 0) {
    analysisCountryList.textContent = '暫無資料';
  } else {
    analysisCountryList.innerHTML = sortedCountries
      .map(([name, data]) => `
        <div class="analysis-item">
          <span class="analysis-name">${data.emoji} ${name}</span>
          <span class="analysis-value">${data.count} 次</span>
        </div>
      `)
      .join('');
  }
}

  // 更新 Dashboard 狀態統計數字 HTML
  const statusElCollected = document.getElementById('status-val-collected');
  const statusElUncollected = document.getElementById('status-val-uncollected');
  const statusElPreorder = document.getElementById('status-val-preorder');
  const statusElOrdered = document.getElementById('status-val-ordered');
  const statusElCancelled = document.getElementById('status-val-cancelled');

  if (statusElCollected) statusElCollected.textContent = statusCounts.collected;
  if (statusElUncollected) statusElUncollected.textContent = statusCounts.uncollected;
  if (statusElPreorder) statusElPreorder.textContent = statusCounts.preorder;
  if (statusElOrdered) statusElOrdered.textContent = statusCounts.ordered;
  if (statusElCancelled) statusElCancelled.textContent = statusCounts.cancelled;

  // 更新預算明細
  const detailsEl = document.getElementById('stat-amount-details');
  if (detailsEl) {
    const renderAmountStr = (amountsObj) => {
      const currencies = Object.keys(amountsObj);
      if (currencies.length === 0) return 'NT$ 0';
      return currencies.map(cur => `${getCurrencySymbol(cur)}${amountsObj[cur].toLocaleString()}`).join(' / ');
    };

    detailsEl.innerHTML = `
      <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
        <span>🔵 預購中總額:</span>
        <span style="font-weight: 600; color: #0071e3;">${renderAmountStr(statusAmounts.preorder)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
        <span>🟡 已下單總額:</span>
        <span style="font-weight: 600; color: #b8860b;">${renderAmountStr(statusAmounts.ordered)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
        <span>🔴 已取消總額:</span>
        <span style="font-weight: 600; color: #ff3b30;">${renderAmountStr(statusAmounts.cancelled)}</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span>⭕ 未收藏總額:</span>
        <span style="font-weight: 600; color: #8e8e93;">${renderAmountStr(statusAmounts.uncollected)}</span>
      </div>
    `;
  }

  // 更新首頁大類別卡片 (娃娃、周邊、旅遊)
  Object.keys(categoryStats).forEach(catName => {
    const countEl = document.getElementById(`home-cat-count-${catName}`);
    const catAmountEl = document.getElementById(`home-cat-amount-${catName}`);
    if (countEl) countEl.textContent = `目前收藏：${categoryStats[catName].count} 件`;
    
    if (catAmountEl) {
      const catCurrencies = Object.keys(categoryStats[catName].currencyAmounts);
      if (catCurrencies.length === 0) {
        catAmountEl.textContent = `總收藏金額：NT$ 0`;
      } else {
        const amountStr = catCurrencies.map(cur => {
          const symbol = getCurrencySymbol(cur);
          const val = categoryStats[catName].currencyAmounts[cur];
          return `${symbol}${val.toLocaleString()}`;
        }).join(' / ');
        catAmountEl.textContent = `總收藏金額：${amountStr}`;
      }
    }
  });
}

/**
 * 全域綁定導覽
 */
function bindNavigationElements() {
  const navItems = document.querySelectorAll('.menu-item, .home-category-card');
  navItems.forEach(item => {
    item.removeEventListener('click', handleNavigationClick);
    item.addEventListener('click', handleNavigationClick);
  });
}

function handleNavigationClick(e) {
  e.preventDefault();
  const item = e.currentTarget;
  const targetView = item.getAttribute('data-view');
  const targetSeries = item.getAttribute('data-series');
  
  // 移除所有側邊欄選單的 active 樣式
  document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
  
  // 如果點擊的是側邊欄選單
  if (item.classList.contains('menu-item')) {
    item.classList.add('active');
  }

  if (targetView === 'series' && targetSeries) {
    currentSeries = targetSeries;
    switchView('series');
    
    // 重設搜尋、篩選與排序控制項
    const searchInput = document.getElementById('series-search-input');
    if (searchInput) searchInput.value = '';
    
    const sortSelect = document.getElementById('series-sort-select');
    if (sortSelect) sortSelect.value = 'latest_added';

    // 重設所有多條件篩選下拉選單
    const statusSelect = document.getElementById('filter-status-select');
    if (statusSelect) statusSelect.value = 'all';

    const categorySelect = document.getElementById('filter-category-select');
    if (categorySelect) {
      categorySelect.value = 'all';
    }

    const paymentSelect = document.getElementById('filter-payment-method-select');
    if (paymentSelect) paymentSelect.value = 'all';

    const currencySelect = document.getElementById('filter-currency-select');
    if (currencySelect) currencySelect.value = 'all';

    const tagSelect = document.getElementById('filter-tag-select');
    if (tagSelect) {
      if (targetSeries.startsWith('tag-')) {
        tagSelect.value = '#' + targetSeries.replace('tag-', '');
      } else {
        tagSelect.value = 'all';
      }
    }

    const sourceSelect = document.getElementById('filter-source-select');
    if (sourceSelect) sourceSelect.value = 'all';

    const memberSelect = document.getElementById('filter-member-select');
    if (memberSelect) memberSelect.value = 'all';
    
    const countrySelect = document.getElementById('filter-country-select');
    if (countrySelect) countrySelect.value = 'all';

    const citySelect = document.getElementById('filter-city-select');
    if (citySelect) citySelect.value = 'all';

    const tripSelect = document.getElementById('filter-trip-select');
    if (tripSelect) tripSelect.value = 'all';

    // 填充選項並渲染
    populateFilterSelects();
    renderSeriesPage(targetSeries);
    
    // 同步高亮側邊欄對應的系列
    const sidebarSubItem = document.querySelector(`.menu-item[data-series="${targetSeries}"]`);
    if (sidebarSubItem) {
      sidebarSubItem.classList.add('active');
    }
  } else if (targetView === 'dashboard') {
    switchView('dashboard');
    const homeMenu = document.getElementById('menu-home');
    if (homeMenu) homeMenu.classList.add('active');
    updateDashboardStats();
  } else if (targetView === 'settings') {
    switchView('settings');
    const settingsMenu = document.getElementById('menu-settings');
    if (settingsMenu) settingsMenu.classList.add('active');
  } else if (targetView === 'placeholder') {
    const pageTitle = item.getAttribute('data-title') || '功能建設中';
    switchView('placeholder');
    document.getElementById('placeholder-page-title').textContent = pageTitle;
  }
  
  // 在 Mobile 上點擊選單後自動收合 Sidebar
  closeMobileSidebar();
}

/**
 * 綁定 UI 各種控制事件
 */
function setupEventListeners() {
  // A. 側邊欄及行動選單點擊事件 (呼叫全域函數)
  bindNavigationElements();

  // 系列管理相關事件
  // 1. 綁定「＋ 新增系列」按鈕
  document.querySelectorAll('.add-series-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const category = btn.getAttribute('data-category');
      openSeriesFormDrawer(category);
    });
  });

  // 2. 儲存系列
  const btnSaveSeries = document.getElementById('btn-save-series');
  if (btnSaveSeries) {
    btnSaveSeries.addEventListener('click', saveSeriesForm);
  }

  // 3. 取消系列
  const btnCancelSeries = document.getElementById('btn-cancel-series');
  if (btnCancelSeries) {
    btnCancelSeries.addEventListener('click', closeFormDrawer);
  }

  // 4. 重新命名系列
  const btnRenameSeries = document.getElementById('btn-rename-series');
  if (btnRenameSeries) {
    btnRenameSeries.addEventListener('click', () => {
      if (currentView === 'series' && currentSeries && !currentSeries.startsWith('tag-') && !currentSeries.startsWith('category-') && !currentSeries.startsWith('country-')) {
        const found = CollectionStorage.getSeriesById(currentSeries);
        if (found) {
          openSeriesFormDrawer(found.category, found);
        }
      }
    });
  }

  // 5. 刪除系列
  const btnDeleteSeries = document.getElementById('btn-delete-series');
  if (btnDeleteSeries) {
    btnDeleteSeries.addEventListener('click', async () => {
      if (currentView === 'series' && currentSeries && !currentSeries.startsWith('tag-') && !currentSeries.startsWith('category-') && !currentSeries.startsWith('country-')) {
        const found = CollectionStorage.getSeriesById(currentSeries);
        if (found) {
          // 檢查是否該系列底下還有藏品
          const allItems = CollectionStorage.getAll();
          const hasItems = allItems.some(item => item.series === found.name);
          
          if (hasItems) {
            alert(`❌ 禁止刪除！\n\n「${found.name}」系列中仍有收藏。請先移動或刪除該系列的收藏品。`);
            return;
          }
          
          const isConfirmed = await showConfirmDialog(`⚠️ 是否刪除此系列「${found.name}」？此動作將無法復原。`, '確定刪除', '取消', true);
          if (isConfirmed) {
            CollectionStorage.deleteSeries(currentSeries);
            showToast(`🗑️ 系列「${found.name}」已成功刪除！`);
            switchView('dashboard');
            refreshAppSeriesData();
          }
        }
      }
    });
  }

  // B. 行動端 Sidebar 切換按鈕
  const sidebarToggle = document.getElementById('mobile-sidebar-toggle');
  const sidebar = document.getElementById('app-sidebar');
  const sidebarOverlay = document.getElementById('sidebar-overlay');
  
  if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }
  
  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', closeMobileSidebar);
  }

  // C. 關閉詳情 Drawer
  const closeDrawerBtn = document.getElementById('close-drawer-btn');
  const drawerBackdrop = document.getElementById('drawer-backdrop');
  if (closeDrawerBtn) {
    closeDrawerBtn.addEventListener('click', closeDrawer);
  }
  if (drawerBackdrop) {
    drawerBackdrop.addEventListener('click', () => {
      closeDrawer();
      closeFormDrawer();
    });
  }

  // D. 新增收藏按鈕 (Desktop & Mobile)
  const desktopAddBtn = document.getElementById('desktop-add-btn');
  const mobileFabBtn = document.getElementById('mobile-fab-btn');
  if (desktopAddBtn) {
    desktopAddBtn.addEventListener('click', () => openFormDrawer(null));
  }
  if (mobileFabBtn) {
    mobileFabBtn.addEventListener('click', () => openFormDrawer(null));
  }

  // E. 表單抽屜關閉與取消
  const closeFormBtn = document.getElementById('close-form-btn');
  const btnCancelForm = document.getElementById('btn-cancel-form');
  if (closeFormBtn) {
    closeFormBtn.addEventListener('click', closeFormDrawer);
  }
  if (btnCancelForm) {
    btnCancelForm.addEventListener('click', closeFormDrawer);
  }

  // F. 表單分類切換
  const categorySelect = document.getElementById('form-category');
  if (categorySelect) {
    categorySelect.addEventListener('change', (e) => {
      toggleFormFields(e.target.value);
    });
  }

  // F-2. 付款方式切換 RWD 聯動
  const formPaymentMethodSelect = document.getElementById('form-payment-method');
  if (formPaymentMethodSelect) {
    formPaymentMethodSelect.addEventListener('change', () => {
      updatePaymentFieldsVisibility();
    });
  }

  // G. 表單圖片上傳與預覽
  const uploadZone = document.getElementById('file-upload-zone');
  const imagesInput = document.getElementById('form-images-input');
  if (uploadZone && imagesInput) {
    uploadZone.addEventListener('click', () => {
      imagesInput.click();
    });
    imagesInput.addEventListener('change', (e) => {
      handleImageUpload(e.target.files);
    });
    
    // 拖曳上傳
    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.classList.add('dragover');
    });
    uploadZone.addEventListener('dragleave', () => {
      uploadZone.classList.remove('dragover');
    });
    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('dragover');
      handleImageUpload(e.dataTransfer.files);
    });
  }

  // H. 表單儲存提交
  const btnSaveForm = document.getElementById('btn-save-form');
  if (btnSaveForm) {
    btnSaveForm.addEventListener('click', saveForm);
  }

  // I. 詳情抽屜中的編輯與刪除
  const btnEditItem = document.getElementById('btn-edit-item');
  const btnDeleteItem = document.getElementById('btn-delete-item');
  
  if (btnEditItem) {
    btnEditItem.addEventListener('click', () => {
      if (window.currentDetailItemId) {
        const item = CollectionStorage.getById(window.currentDetailItemId);
        if (item) {
          openFormDrawer(item);
        }
      }
    });
  }
  
  if (btnDeleteItem) {
    btnDeleteItem.addEventListener('click', async () => {
      if (window.currentDetailItemId) {
        const item = CollectionStorage.getById(window.currentDetailItemId);
        if (item) {
          const isConfirmed = await showConfirmDialog(`⚠️ 是否確定刪除收藏「${item.name}」？此動作將無法復原。`, '確定刪除', '取消', true);
          if (isConfirmed) {
            CollectionStorage.delete(item.id);
            closeDrawer();
            refreshAppSeriesData();
            if (currentView === 'series') {
              renderSeriesPage(currentSeries);
            } else if (currentView === 'trip' && currentTrip) {
              renderTripPage(currentTrip);
            } else if (currentView === 'dashboard') {
              updateDashboardStats();
            }
            showToast(`🗑️ 收藏「${item.name}」已成功刪除！`);
          }
        }
      }
    });
  }

  // I-2. 表單抽屜中的刪除收藏
  const btnFormDeleteItem = document.getElementById('btn-form-delete-item');
  if (btnFormDeleteItem) {
    btnFormDeleteItem.addEventListener('click', async () => {
      const itemId = document.getElementById('form-item-id').value;
      if (itemId) {
        const item = CollectionStorage.getById(itemId);
        if (item) {
          const isConfirmed = await showConfirmDialog(`⚠️ 是否確定刪除收藏「${item.name}」？此動作將無法復原。`, '確定刪除', '取消', true);
          if (isConfirmed) {
            CollectionStorage.delete(itemId);
            closeFormDrawer();
            refreshAppSeriesData();
            if (currentView === 'series') {
              renderSeriesPage(currentSeries);
            } else if (currentView === 'trip' && currentTrip) {
              renderTripPage(currentTrip);
            } else if (currentView === 'dashboard') {
              updateDashboardStats();
            }
            showToast(`🗑️ 收藏「${item.name}」已成功刪除！`);
          }
        }
      }
    });
  }

  // J. 圖片輪播與放大 / 封面設定 (含行動端左右滑動)
  const prevImgBtn = document.getElementById('drawer-prev-img');
  const nextImgBtn = document.getElementById('drawer-next-img');
  const mediaPlaceholder = document.getElementById('drawer-media-placeholder');
  const btnSetDrawerCover = document.getElementById('btn-set-drawer-cover');
  const carouselContainer = document.querySelector('.carousel-container');

  if (prevImgBtn) {
    prevImgBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (detailDrawerImages.length > 1) {
        currentDetailImageIndex = (currentDetailImageIndex - 1 + detailDrawerImages.length) % detailDrawerImages.length;
        renderDetailDrawerImage();
      }
    });
  }
  
  if (nextImgBtn) {
    nextImgBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (detailDrawerImages.length > 1) {
        currentDetailImageIndex = (currentDetailImageIndex + 1) % detailDrawerImages.length;
        renderDetailDrawerImage();
      }
    });
  }

  // 點擊圖片放大 (開啟 Lightbox)
  if (mediaPlaceholder) {
    mediaPlaceholder.addEventListener('click', () => {
      if (detailDrawerImages && detailDrawerImages.length > 0) {
        openLightbox(currentDetailImageIndex);
      }
    });
  }

  // 設為封面按鈕點擊
  if (btnSetDrawerCover) {
    btnSetDrawerCover.addEventListener('click', (e) => {
      e.stopPropagation();
      const itemId = window.currentDetailItemId;
      if (itemId && detailDrawerImages && detailDrawerImages.length > 1 && currentDetailImageIndex > 0) {
        const item = CollectionStorage.getById(itemId);
        if (item && item.images && item.images.length > 1) {
          const imgs = [...item.images];
          // 把選中的圖片移到第 0 位
          const selectedImg = imgs.splice(currentDetailImageIndex, 1)[0];
          imgs.unshift(selectedImg);
          
          // 儲存至資料庫
          CollectionStorage.update(itemId, { images: imgs });
          
          // 更新全域狀態
          detailDrawerImages = imgs;
          currentDetailImageIndex = 0;
          
          // 重新渲染輪播與封面標記
          renderDetailDrawerImage();
          
          // 立即更新主頁面卡片
          if (currentView === 'series') {
            renderSeriesPage(currentSeries);
          }
          console.log('封面已成功更新，並刷新卡片！');
        }
      }
    });
  }

  // 行動裝置觸控滑動支援 (Swipe Gestures for Details Carousel)
  if (carouselContainer) {
    let touchStartX = 0;
    let touchEndX = 0;
    
    carouselContainer.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    
    carouselContainer.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      const swipeThreshold = 50;
      if (touchStartX - touchEndX > swipeThreshold) {
        // swipe left -> next image
        if (detailDrawerImages.length > 1) {
          currentDetailImageIndex = (currentDetailImageIndex + 1) % detailDrawerImages.length;
          renderDetailDrawerImage();
        }
      } else if (touchEndX - touchStartX > swipeThreshold) {
        // swipe right -> prev image
        if (detailDrawerImages.length > 1) {
          currentDetailImageIndex = (currentDetailImageIndex - 1 + detailDrawerImages.length) % detailDrawerImages.length;
          renderDetailDrawerImage();
        }
      }
    }, { passive: true });
  }

  // J-2. Lightbox 燈箱事件監聽 (點擊關閉、切換、左右滑動)
  const lightbox = document.getElementById('image-lightbox');
  const lightboxClose = document.querySelector('.lightbox-close');
  const lightboxPrev = document.getElementById('lightbox-prev');
  const lightboxNext = document.getElementById('lightbox-next');

  if (lightboxClose) {
    lightboxClose.addEventListener('click', closeLightbox);
  }
  if (lightbox) {
    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox || e.target.classList.contains('lightbox-content-container')) {
        closeLightbox();
      }
    });

    // Lightbox 觸控滑動 (Swipe Gestures)
    let lbTouchStartX = 0;
    let lbTouchEndX = 0;
    lightbox.addEventListener('touchstart', (e) => {
      lbTouchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    lightbox.addEventListener('touchend', (e) => {
      lbTouchEndX = e.changedTouches[0].screenX;
      const swipeThreshold = 50;
      if (lbTouchStartX - lbTouchEndX > swipeThreshold) {
        // swipe left -> next
        if (detailDrawerImages.length > 1) {
          lightboxImageIndex = (lightboxImageIndex + 1) % detailDrawerImages.length;
          renderLightboxImage();
        }
      } else if (lbTouchEndX - lbTouchStartX > swipeThreshold) {
        // swipe right -> prev
        if (detailDrawerImages.length > 1) {
          lightboxImageIndex = (lightboxImageIndex - 1 + detailDrawerImages.length) % detailDrawerImages.length;
          renderLightboxImage();
        }
      }
    }, { passive: true });
  }

  if (lightboxPrev) {
    lightboxPrev.addEventListener('click', (e) => {
      e.stopPropagation();
      if (detailDrawerImages.length > 1) {
        lightboxImageIndex = (lightboxImageIndex - 1 + detailDrawerImages.length) % detailDrawerImages.length;
        renderLightboxImage();
      }
    });
  }

  if (lightboxNext) {
    lightboxNext.addEventListener('click', (e) => {
      e.stopPropagation();
      if (detailDrawerImages.length > 1) {
        lightboxImageIndex = (lightboxImageIndex + 1) % detailDrawerImages.length;
        renderLightboxImage();
      }
    });
  }

  // K. 多條件篩選與排序、搜尋事件監聽
  const seriesSortSelect = document.getElementById('series-sort-select');
  const seriesSearchInput = document.getElementById('series-search-input');
  const btnClearFilters = document.getElementById('btn-clear-filters');

  if (seriesSortSelect) {
    seriesSortSelect.addEventListener('change', () => {
      renderSeriesPage(currentSeries);
    });
  }

  if (seriesSearchInput) {
    seriesSearchInput.addEventListener('input', () => {
      renderSeriesPage(currentSeries);
    });
  }

  // 綁定所有新下拉選單 change 事件
  const filterSelects = [
    'filter-status-select',
    'filter-category-select',
    'filter-payment-method-select',
    'filter-currency-select',
    'filter-tag-select',
    'filter-source-select',
    'filter-country-select',
    'filter-city-select',
    'filter-member-select',
    'filter-trip-select'
  ];

  filterSelects.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', () => {
        // 如果變更的是 category select
        if (id === 'filter-category-select') {
          const val = el.value;
          if (currentSeries === 'category-旅遊') {
            const countryEl = document.getElementById('filter-country-select');
            if (countryEl) countryEl.value = val;
          } else {
            if (val !== '旅遊') {
              const countryEl = document.getElementById('filter-country-select');
              const cityEl = document.getElementById('filter-city-select');
              const tripEl = document.getElementById('filter-trip-select');
              if (countryEl) countryEl.value = 'all';
              if (cityEl) cityEl.value = 'all';
              if (tripEl) tripEl.value = 'all';
            }
          }
        }
        // 如果變更的是 country select
        if (id === 'filter-country-select') {
          const val = el.value;
          if (currentSeries === 'category-旅遊') {
            const categorySelectEl = document.getElementById('filter-category-select');
            if (categorySelectEl) categorySelectEl.value = val;
          }
        }
        if (currentSeries) {
          renderSeriesPage(currentSeries);
        }
      });
    }
  });

  if (btnClearFilters) {
    btnClearFilters.addEventListener('click', () => {
      // 重設所有下拉選單
      filterSelects.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.value = 'all';
        }
      });

      // 重新渲染頁面 (保留搜尋文字)
      if (currentSeries) {
        renderSeriesPage(currentSeries);
      }
    });
  }

  // K2. 旅程頁狀態篩選與排序、搜尋事件監聽
  const btnTripFilterTrigger = document.getElementById('btn-trip-filter-trigger');
  const tripFilterPopover = document.getElementById('trip-filter-popover');
  const btnTripFilterReset = document.getElementById('btn-trip-filter-reset');
  const btnTripFilterApply = document.getElementById('btn-trip-filter-apply');
  const tripCheckboxes = document.querySelectorAll('.trip-status-filter-checkbox');
  const tripSortSelect = document.getElementById('trip-sort-select');
  const tripSearchInput = document.getElementById('trip-search-input');

  if (btnTripFilterTrigger && tripFilterPopover) {
    btnTripFilterTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = tripFilterPopover.style.display === 'none' || tripFilterPopover.style.display === '';
      tripFilterPopover.style.display = isHidden ? 'flex' : 'none';
    });
  }

  if (btnTripFilterReset) {
    btnTripFilterReset.addEventListener('click', (e) => {
      e.stopPropagation();
      tripCheckboxes.forEach(cb => cb.checked = true);
      if (currentTrip) renderTripPage(currentTrip);
    });
  }

  if (btnTripFilterApply) {
    btnTripFilterApply.addEventListener('click', (e) => {
      e.stopPropagation();
      tripFilterPopover.style.display = 'none';
      if (currentTrip) renderTripPage(currentTrip);
    });
  }

  tripCheckboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      if (currentTrip) renderTripPage(currentTrip);
    });
  });

  if (tripSortSelect) {
    tripSortSelect.addEventListener('change', () => {
      if (currentTrip) renderTripPage(currentTrip);
    });
  }

  if (tripSearchInput) {
    tripSearchInput.addEventListener('input', () => {
      if (currentTrip) renderTripPage(currentTrip);
    });
  }

  // M. 佔位頁的返回首頁按鈕
  const backHomeBtn = document.getElementById('btn-back-home');
  if (backHomeBtn) {
    backHomeBtn.addEventListener('click', () => {
      document.querySelectorAll('.menu-item').forEach(el => el.classList.remove('active'));
      const homeMenu = document.getElementById('menu-home');
      if (homeMenu) homeMenu.classList.add('active');
      switchView('dashboard');
      updateDashboardStats();
    });
  }


  // O. 系統設定面板按鈕事件
  // 1. 匯出備份 JSON
  const btnExport = document.getElementById('btn-export-json');
  if (btnExport) {
    btnExport.addEventListener('click', async () => {
      const isConfirmed = await showConfirmDialog('是否要匯出當前所有收藏、國家、旅程與設定資料？', '確認匯出', '取消');
      if (!isConfirmed) return;

      const backupData = {
        version: "1.2",
        items: CollectionStorage.getAll(),
        series: CollectionStorage.getAllSeries(),
        tags: CollectionStorage.getAllTags(),
        sources: CollectionStorage.getAllSources(),
        currencies: CollectionStorage.getAllCurrencies(),
        countries: CollectionStorage.getAllCountries(),
        trips: CollectionStorage.getAllTrips(),
        paymentMethods: CollectionStorage.getAllPaymentMethods(),
        paymentTools: CollectionStorage.getAllPaymentTools(),
        groups: CollectionStorage.getAllGroups()
      };
      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'collection_book_backup.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('📦 備份檔案已成功匯出！');
    });
  }

  // 2. 選擇還原檔案
  const importInput = document.getElementById('import-json-file');
  const importLabel = document.querySelector('.import-file-label');
  const importFileName = document.getElementById('import-file-name');
  const btnImport = document.getElementById('btn-import-json');

  if (importLabel && importInput) {
    importLabel.addEventListener('click', () => {
      importInput.click();
    });
  }

  if (importInput) {
    importInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        importFileName.textContent = `📁 ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
        if (btnImport) btnImport.disabled = false;
      } else {
        importFileName.textContent = '尚未選擇檔案';
        if (btnImport) btnImport.disabled = true;
      }
    });
  }

function sanitizeImportedItems(items) {
  if (!Array.isArray(items)) return [];
  return items.map(item => {
    // 1. 如果 item 有 price/currency，但沒有 localPrice/localCurrency
    if (item.price !== undefined && item.price !== null && item.price !== '') {
      if (item.localPrice === undefined || item.localPrice === null || item.localPrice === '') {
        item.localPrice = Number(item.price);
        item.localCurrency = item.currency || 'TWD';
      }
    }
    // 2. 如果 item 有 paymentCurrency/paymentAmount 且無 chargeCurrency/cardCharge
    if (item.paymentCurrency !== undefined && item.paymentCurrency !== null && item.paymentCurrency !== '') {
      if (item.chargeCurrency === undefined || item.chargeCurrency === null || item.chargeCurrency === '') {
        item.chargeCurrency = item.paymentCurrency;
      }
    }
    if (item.paymentAmount !== undefined && item.paymentAmount !== null && item.paymentAmount !== '') {
      if (item.cardCharge === undefined || item.cardCharge === null || item.cardCharge === '') {
        item.cardCharge = Number(item.paymentAmount);
      }
    }
    
    // 確保 price & currency 與 收藏價格 (localPrice) 一致
    const calculatedStats = getItemStatsPriceAndCurrency(item);
    item.price = calculatedStats.price > 0 ? calculatedStats.price : null;
    item.currency = calculatedStats.currency || 'TWD';
    
    // 也確保 paymentAmount & paymentCurrency 保持同步
    item.paymentCurrency = item.chargeCurrency || 'TWD';
    item.paymentAmount = item.cardCharge !== undefined && item.cardCharge !== null ? item.cardCharge : null;
    
    return item;
  });
}

  // 3. 確認匯入還原
  if (btnImport) {
    btnImport.addEventListener('click', async () => {
      const file = importInput ? importInput.files[0] : null;
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const imported = JSON.parse(e.target.result);
          
          const isConfirmed = await showConfirmDialog('⚠️ 匯入備份檔將會完全覆蓋當前瀏覽器中的所有收藏與設定紀錄（包含國家與旅程）。\n\n此操作無法復原，您確定要繼續嗎？', '確定匯入並覆蓋', '取消');
          if (isConfirmed) {
            if (imported && imported.items && Array.isArray(imported.items)) {
              // 完整備份包格式
              CollectionStorage.save(sanitizeImportedItems(imported.items));
              if (imported.series && Array.isArray(imported.series)) CollectionStorage.saveSeries(imported.series);
              if (imported.tags && Array.isArray(imported.tags)) CollectionStorage.saveTags(imported.tags);
              if (imported.sources && Array.isArray(imported.sources)) CollectionStorage.saveSources(imported.sources);
              if (imported.currencies && Array.isArray(imported.currencies)) CollectionStorage.saveCurrencies(imported.currencies);
              if (imported.countries && Array.isArray(imported.countries)) CollectionStorage.saveCountries(imported.countries);
              if (imported.trips && Array.isArray(imported.trips)) CollectionStorage.saveTrips(imported.trips);
              if (imported.paymentMethods && Array.isArray(imported.paymentMethods)) CollectionStorage.savePaymentMethods(imported.paymentMethods);
              if (imported.paymentTools && Array.isArray(imported.paymentTools)) CollectionStorage.savePaymentTools(imported.paymentTools);
              if (imported.groups && Array.isArray(imported.groups)) CollectionStorage.saveGroups(imported.groups);
            } else if (Array.isArray(imported)) {
              // 僅收藏品陣列格式
              CollectionStorage.save(sanitizeImportedItems(imported));
            } else {
              alert('❌ 匯入失敗：備份檔案結構不正確。');
              return;
            }
            
            showToast('🎉 資料還原成功！已寫入您的瀏覽器。');
            
            // 重新載入系統
            initApp();
            
            // 如果在設定頁，同步刷新設定清單
            if (currentView === 'settings') {
              renderSettingSeriesList();
              renderSettingGroupsList();
              renderSettingTagsList();
              renderSettingSourcesList();
              renderSettingCurrenciesList();
              renderSettingCountriesList();
              renderSettingTripsList();
              renderSettingPaymentMethodsList();
              renderSettingPaymentToolsList();
            }
            
            // 重置還原欄位
            if (importInput) importInput.value = '';
            if (importFileName) importFileName.textContent = '尚未選擇檔案';
            btnImport.disabled = true;
          }
        } catch (err) {
          alert('❌ 匯入失敗：無法解析 JSON 檔案。');
        }
      };
      reader.readAsText(file);
    });
  }

  // 4. 重設資料
  const btnReset = document.getElementById('btn-reset-data');
  if (btnReset) {
    btnReset.addEventListener('click', async () => {
      const isConfirmed = await showConfirmDialog('⚠️ 您確定要將所有資料重置為出廠預設值嗎？\n\n這將完全清除您自己新增、編輯的所有收藏、設定、國家與旅程！此操作無法復原！', '確定重置', '取消', true);
      if (isConfirmed) {
        localStorage.removeItem('collection_items');
        localStorage.removeItem('collection_series');
        localStorage.removeItem('collection_tags');
        localStorage.removeItem('collection_sources');
        localStorage.removeItem('collection_currencies');
        localStorage.removeItem('collection_countries');
        localStorage.removeItem('collection_trips');
        localStorage.removeItem('collection_groups');
        localStorage.removeItem('collection_payment_methods');
        localStorage.removeItem('collection_payment_tools');
        CollectionStorage.init();
        showToast('🔄 系統已重設為出廠預設值！');
        initApp();
        if (currentView === 'settings') {
          renderSettingSeriesList();
          renderSettingGroupsList();
          renderSettingTagsList();
          renderSettingSourcesList();
          renderSettingCurrenciesList();
          renderSettingCountriesList();
          renderSettingTripsList();
          renderSettingPaymentMethodsList();
          renderSettingPaymentToolsList();
        }
      }
    });
  }

  // 5. 旅程表單封面圖片上傳與點擊事件
  const tripCoverUploadZone = document.getElementById('trip-cover-upload-zone');
  const formTripCoverInput = document.getElementById('form-trip-cover-input');
  if (tripCoverUploadZone && formTripCoverInput) {
    tripCoverUploadZone.addEventListener('click', () => {
      formTripCoverInput.click();
    });
    formTripCoverInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          tripFormCoverImage = event.target.result;
          const previewContainer = document.getElementById('form-trip-cover-preview-container');
          if (previewContainer) {
            previewContainer.innerHTML = `
              <div class="preview-img-wrapper" style="position: relative; width: 100%; height: 120px; border-radius: var(--radius-sm); overflow: hidden; margin-top: 8px;">
                <img src="${tripFormCoverImage}" style="width: 100%; height: 100%; object-fit: cover;">
                <button type="button" class="btn-remove-preview-img" style="position: absolute; top: 4px; right: 4px; background: rgba(0,0,0,0.6); color: white; border: none; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 12px;" onclick="removeTripCoverPreview()">✕</button>
              </div>
            `;
          }
        };
        reader.readAsDataURL(file);
      }
    });
  }

// 6. 旅程表單儲存與關閉
const btnSaveTripForm = document.getElementById('btn-save-trip-form');
if (btnSaveTripForm) {
  btnSaveTripForm.addEventListener('click', saveTripForm);
}

const btnCancelTripForm = document.getElementById('btn-cancel-trip-form');
if (btnCancelTripForm) {
  btnCancelTripForm.addEventListener('click', closeFormDrawer);
}

// 周邊系列切換時，更新成員下拉
const formSeries = document.getElementById('form-series');
if (formSeries) {
  formSeries.addEventListener('change', updateMemberSelect);
}

  // 旅程詳細頁：編輯旅程
  const btnEditTrip = document.getElementById('btn-edit-trip');
  if (btnEditTrip) {
    btnEditTrip.addEventListener('click', () => {
    if (!currentTrip) return;
    openTripFormDrawer(currentTrip);
  });
  }
  // 旅程詳細頁：刪除旅程
const btnDeleteTrip = document.getElementById('btn-delete-trip');
if (btnDeleteTrip) {
  btnDeleteTrip.addEventListener('click', () => {
    if (!currentTrip) return;
    deleteTripAction(currentTrip);
  });
}
  // 註冊全新的設定管理事件監聽
  setupSettingsEventListeners();

  // 綁定「收藏總金額 (已收藏)」卡片之展開/收合預算明細點擊事件
  const statAmountCard = document.getElementById('stat-amount');
  const amountDetailsEl = document.getElementById('stat-amount-details');
  const amountArrowEl = document.getElementById('amount-expand-arrow');
  if (statAmountCard && amountDetailsEl && amountArrowEl) {
    statAmountCard.addEventListener('click', (e) => {
      e.preventDefault();
      const isHidden = amountDetailsEl.style.display === 'none' || amountDetailsEl.style.display === '';
      if (isHidden) {
        amountDetailsEl.style.display = 'flex';
        amountArrowEl.textContent = '▲ 收合預算明細';
      } else {
        amountDetailsEl.style.display = 'none';
        amountArrowEl.textContent = '▼ 展開預算明細';
      }
    });
  }
}

/**
 * 視圖切換
 */
function switchView(viewName) {
  currentView = viewName;
  
  // 隱藏所有視圖
  document.querySelectorAll('.content-view').forEach(view => {
    view.classList.remove('active');
  });
  
  // 顯示指定視圖
  const activeView = document.getElementById(`view-${viewName}`);
  if (activeView) {
    activeView.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    if (viewName === 'dashboard') {
      const categorySelectEl = document.getElementById('filter-category-select');
      if (categorySelectEl) {
        categorySelectEl.innerHTML = `
          <option value="all">📦 分類: 全部</option>
          <option value="娃娃">🧸 娃娃</option>
          <option value="周邊">✨ 周邊</option>
          <option value="旅遊">✈️ 旅遊</option>
        `;
        categorySelectEl.value = 'all';
      }
    }
    
    if (viewName === 'settings') {
      renderSettingSeriesList();
      renderSettingGroupsList();
      renderSettingTagsList();
      renderSettingSourcesList();
      renderSettingCurrenciesList();
      renderSettingCountriesList();
      renderSettingTripsList();
      renderSettingPaymentMethodsList();
      renderSettingPaymentToolsList();
    }
  }

  // 重設搜尋框與篩選頁籤
  const searchInput = document.querySelector('.series-search-input');
  if (searchInput) searchInput.value = '';
  currentFilter = 'all';
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.classList.remove('active');
    if (tab.getAttribute('data-filter') === 'all') {
      tab.classList.add('active');
    }
  });

  // 同步高亮側邊欄 Active 狀態
  syncSidebarActiveState();
}

/**
 * 關閉行動端選單
 */
function closeMobileSidebar() {
  const sidebar = document.getElementById('app-sidebar');
  if (sidebar && sidebar.classList.contains('open')) {
    sidebar.classList.remove('open');
  }
}

/**
 * 開啟表單抽屜 (Form Drawer)
 * @param {object|null} item - 當傳入項目時代表「編輯」，否則代表「新增」
 */
function openFormDrawer(item = null) {
  const formDrawer = document.getElementById('item-form-drawer');
  const backdrop = document.getElementById('drawer-backdrop');
  if (!formDrawer || !backdrop) return;

  // 確保顯示藏品表單，隱藏系列及旅程表單
  document.getElementById('collection-form').style.display = 'block';
  document.getElementById('series-form').style.display = 'none';
  document.getElementById('trip-form').style.display = 'none';

  // 確保下拉選單資料為最新
  renderFormSeriesSelect();
  populateFormTravelTripSelect();
  populateFormSourceSelect();

  // 重設表單
  const form = document.getElementById('collection-form');
  form.reset();
  formUploadedImages = [];
  document.getElementById('form-image-preview-container').innerHTML = '';

  const categorySelect = document.getElementById('form-category');

  if (item) {
    // 編輯模式
    document.getElementById('form-drawer-title').textContent = '編輯收藏品';
    document.getElementById('form-item-id').value = item.id;
    
    // 設定分類
    categorySelect.value = item.category;
    toggleFormFields(item.category);

    // 載入自訂圖片
    if (item.images && item.images.length > 0) {
      formUploadedImages = [...item.images];
      renderFormImagePreviews();
    }

    // 載入標籤
    document.getElementById('form-tags-input').value = (item.tags || []).join(' ');

    // 載入備註
    document.getElementById('form-note').value = item.note || '';

    // 依據不同分類填寫欄位
    if (item.category === '旅遊') {
      document.getElementById('form-name').value = item.name || '';
      const tripSelect = document.getElementById('form-travel-trip');
      if (tripSelect) tripSelect.value = item.tripId || '';
      document.getElementById('form-travel-location').value = item.location || '';
      document.getElementById('form-travel-shop').value = item.shop || '';
      document.getElementById('form-travel-city-val').value = item.city || '';
      
      document.getElementById('form-travel-item-date').value = item.purchaseDate || '';
      document.getElementById('form-travel-item-status').value = item.status || 'collected';
    } else {
      document.getElementById('form-name').value = item.name || '';
      document.getElementById('form-series').value = item.series || '雞';

      const memberList = document.getElementById('form-member-list');
      if (memberList) {
        updateMemberSelect(
          Array.isArray(item.members) && item.members.length > 0
           ? item.members
           : (item.member || '')
       );
      }
      
      document.getElementById('form-date').value = item.purchaseDate || '';
      document.getElementById('form-status').value = item.status || 'collected';
      document.getElementById('form-source').value = item.source || '';
    }

    // 載入新付款與購買詳情欄位
    document.getElementById('form-local-price').value = item.localPrice !== undefined && item.localPrice !== null ? item.localPrice : '';
    document.getElementById('form-local-currency').value = item.localCurrency || '';
    document.getElementById('form-card-charge').value = item.cardCharge !== undefined && item.cardCharge !== null ? item.cardCharge : '';
    document.getElementById('form-charge-currency').value = item.chargeCurrency || 'TWD';
    document.getElementById('form-payment-method').value = item.paymentMethod || '';
    document.getElementById('form-payment-tool').value = item.paymentTool || '';

    // 顯示刪除按鈕
    const deleteContainer = document.getElementById('form-delete-container');
    if (deleteContainer) deleteContainer.style.display = 'block';
  } else {
    // 新增模式
    document.getElementById('form-drawer-title').textContent = '新增收藏品';
    document.getElementById('form-item-id').value = '';
    
    // 預設今日日期
    const todayStr = new Date().toISOString().substring(0, 10);
    document.getElementById('form-date').value = todayStr;
    document.getElementById('form-travel-item-date').value = todayStr;

    // 初始化新付款與購買詳情欄位
    document.getElementById('form-local-price').value = '';
    document.getElementById('form-local-currency').value = '';
    document.getElementById('form-card-charge').value = '';
    document.getElementById('form-charge-currency').value = 'TWD';
    document.getElementById('form-payment-method').value = '';
    document.getElementById('form-payment-tool').value = '';

    // 預設分類與欄位切換
    if (currentView === 'trip' && currentTrip) {
      categorySelect.value = '旅遊';
      toggleFormFields('旅遊');
      const travelTripSelect = document.getElementById('form-travel-trip');
      if (travelTripSelect) travelTripSelect.value = currentTrip;
    } else {
      categorySelect.value = '娃娃';
      toggleFormFields('娃娃');
    }

    // 隱藏刪除按鈕
    const deleteContainer = document.getElementById('form-delete-container');
    if (deleteContainer) deleteContainer.style.display = 'none';
  }

  // 更新付款與購買詳情欄位顯示隱藏狀態
  updatePaymentFieldsVisibility();

  // 關閉詳情 Drawer 以防衝突
  const detailDrawer = document.getElementById('item-detail-drawer');
  if (detailDrawer) detailDrawer.classList.remove('open');

  // 展開表單 Drawer
  formDrawer.classList.add('open');
  backdrop.classList.add('show');
  document.body.style.overflow = 'hidden';
}

/**
 * 關閉表單抽屜
 */
function closeFormDrawer() {
  const formDrawer = document.getElementById('item-form-drawer');
  const backdrop = document.getElementById('drawer-backdrop');
  if (formDrawer) formDrawer.classList.remove('open');
  if (backdrop && !document.getElementById('item-detail-drawer').classList.contains('open')) {
    backdrop.classList.remove('show');
  }
  document.body.style.overflow = '';
  
  // 延遲重置表單顯示，避免動畫期間發生閃爍
  setTimeout(() => {
    const colForm = document.getElementById('collection-form');
    const serForm = document.getElementById('series-form');
    const tripForm = document.getElementById('trip-form');
    if (colForm) colForm.style.display = 'block';
    if (serForm) serForm.style.display = 'none';
    if (tripForm) tripForm.style.display = 'none';
  }, 300);
}

/**
 * 切換表單欄位顯示 (一般 vs 旅遊)
 */
function toggleFormFields(category) {
  const normalFields = document.getElementById('form-normal-fields');
  const travelFields = document.getElementById('form-travel-fields');

  if (category === '旅遊') {
    if (normalFields) normalFields.style.display = 'none';
    if (travelFields) travelFields.style.display = 'block';
  } else {
    if (normalFields) normalFields.style.display = 'block';
    if (travelFields) travelFields.style.display = 'none';
  }
}

/**
 * 處理多張圖片上傳，轉為 Base64 限制大小防爆 LocalStorage
 */
async function handleImageUpload(files) {
  if (!files || files.length === 0) return;

  // 1. 檢查 LocalStorage 空間容量 (先預警)
  checkAndWarnStorageCapacity();

  const maxTotalSize = 4 * 1024 * 1024; // 4MB
  let currentTotalSize = formUploadedImages.reduce((sum, img) => sum + img.length, 0);

  const newImages = [];
  for (const file of Array.from(files)) {
    if (!file.type.startsWith('image/')) {
      alert('請只上傳圖片檔案！');
      continue;
    }
    
    // 2. 檢查多圖限制，單一項目上限 20 張
    if (formUploadedImages.length + newImages.length >= 20) {
      alert('⚠️ 單一收藏品相片數量上限為 20 張。');
      break;
    }

    try {
      // 3. 背景自動 Canvas 比例壓縮至 JPEG 80%
      const compressedBase64 = await compressImage(file);
      
      if (currentTotalSize + compressedBase64.length > maxTotalSize) {
        alert('警告：總圖片儲存空間即將超出瀏覽器儲存上限 (4MB)，部分圖片未被加入。');
        break;
      }
      
      newImages.push(compressedBase64);
      currentTotalSize += compressedBase64.length;
    } catch (err) {
      console.error('圖片壓縮失敗:', err);
      alert(`❌ 圖片 「${file.name}」 壓縮或讀取失敗。`);
    }
  }

  if (newImages.length > 0) {
    formUploadedImages.push(...newImages);
    renderFormImagePreviews();
    showToast(`📸 成功匯入並壓縮 ${newImages.length} 張圖片！`);
  }
}

/**
 * 渲染表單上傳圖片預覽
 */
function renderFormImagePreviews() {
  const container = document.getElementById('form-image-preview-container');
  container.innerHTML = '';

  formUploadedImages.forEach((base64, index) => {
    const previewItem = document.createElement('div');
    previewItem.className = 'preview-item';
    
    // index 為 0 即為封面
    const isCover = index === 0;
    
    previewItem.innerHTML = `
      <img src="${base64}" alt="預覽圖">
      <div class="preview-item-delete" data-index="${index}" title="刪除圖片">❌</div>
      ${isCover 
        ? `<div class="preview-item-cover-tag" style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0, 113, 227, 0.85); color: white; font-size: 10px; text-align: center; padding: 2px 0; font-weight: 600;">⭐ 封面</div>`
        : `<div class="preview-item-set-cover" data-index="${index}" style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0, 0, 0, 0.65); color: white; font-size: 10px; text-align: center; padding: 2px 0; cursor: pointer; transition: all 0.2s; opacity: 0; transform: translateY(4px);" title="設為封面">設為封面</div>`
      }
    `;

    // hover 顯示「設為封面」按鈕
    if (!isCover) {
      previewItem.addEventListener('mouseenter', () => {
        const setCoverBtn = previewItem.querySelector('.preview-item-set-cover');
        if (setCoverBtn) {
          setCoverBtn.style.opacity = '1';
          setCoverBtn.style.transform = 'translateY(0)';
        }
      });
      previewItem.addEventListener('mouseleave', () => {
        const setCoverBtn = previewItem.querySelector('.preview-item-set-cover');
        if (setCoverBtn) {
          setCoverBtn.style.opacity = '0';
          setCoverBtn.style.transform = 'translateY(4px)';
        }
      });

      // 設為封面點擊
      previewItem.querySelector('.preview-item-set-cover').addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(e.currentTarget.getAttribute('data-index'));
        const selectedImage = formUploadedImages.splice(idx, 1)[0];
        formUploadedImages.unshift(selectedImage);
        renderFormImagePreviews();
      });
    }

    // 刪除圖片點擊
    previewItem.querySelector('.preview-item-delete').addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = parseInt(e.target.getAttribute('data-index'));
      formUploadedImages.splice(idx, 1);
      renderFormImagePreviews();
    });

    container.appendChild(previewItem);
  });
}

/**
 * 儲存表單資料 (新增 / 編輯)
 */
async function saveForm() {
  const itemId = document.getElementById('form-item-id').value;
  const category = document.getElementById('form-category').value;

  if (!category) {
    alert('❌ 請選擇藏品分類！');
    return;
  }

  let itemData = {
    category: category,
    images: [...formUploadedImages],
    note: document.getElementById('form-note').value.trim(),
    createdDate: new Date().toISOString()
  };

  // 解析並統一格式化標籤
  const tagsInput = document.getElementById('form-tags-input').value;
  const rawTags = tagsInput.split(/[\s,，]+/).filter(t => t.trim() !== '');
  itemData.tags = rawTags.map(tag => {
    let t = tag.trim();
    if (!t.startsWith('#')) {
      t = '#' + t;
    }
    return t;
  });

  if (category === '旅遊') {
    const travelName = document.getElementById('form-name').value.trim();
    if (!travelName) {
      alert('❌ 請填寫收藏品名稱！');
      return;
    }
    const tripId = document.getElementById('form-travel-trip').value;
    if (!tripId) {
      alert('❌ 請選擇所屬旅程！如果沒有旅程，請先至側邊欄「旅遊」區塊中新增旅程。');
      return;
    }
    
    // 獲取該旅程，並將它的國家名稱作為 series（用作相容性/系列檢索）
    const trip = CollectionStorage.getAllTrips().find(t => t.id === tripId);
    const country = trip ? CollectionStorage.getAllCountries().find(c => c.id === trip.countryId) : null;
    
    itemData.name = travelName;
    itemData.tripId = tripId;
    itemData.series = country ? country.name : '旅遊'; // 國家名作為系列相容
    itemData.location = document.getElementById('form-travel-location').value.trim();
    itemData.shop = document.getElementById('form-travel-shop').value.trim();
    itemData.city = document.getElementById('form-travel-city-val').value.trim();
    itemData.source = itemData.location; // 將 source 對應為地點，相容舊有 UI
    
    itemData.purchaseDate = document.getElementById('form-travel-item-date').value || '';
    itemData.status = document.getElementById('form-travel-item-status').value || 'collected';
  } else {
    const normalName = document.getElementById('form-name').value.trim();
    if (!normalName) {
      alert('❌ 請填寫藏品名稱！');
      return;
    }
    const series = document.getElementById('form-series').value;
    if (!series) {
      alert('❌ 請選擇所屬系列！若無系列請點選側邊欄該分類下的「＋ 新增系列」或前往設定新增。');
      return;
    }

    itemData.name = normalName;
    itemData.series = series;

const memberCheckboxes = Array.from(
  document.querySelectorAll(
    '#form-member-list input[name="form-members"]:not([value="全員"])'
  )
);

const allMembersSelected =
  memberCheckboxes.length > 0 &&
  memberCheckboxes.every(checkbox => checkbox.checked);

const selectedMembers = allMembersSelected
  ? ['全員']
  : memberCheckboxes
      .filter(checkbox => checkbox.checked)
      .map(checkbox => checkbox.value);

itemData.members = selectedMembers;
itemData.member = selectedMembers.join('、');
    
    itemData.purchaseDate = document.getElementById('form-date').value;
    itemData.status = document.getElementById('form-status').value;
    itemData.source = document.getElementById('form-source').value.trim();
  }

  // 獲取新付款與購買詳情欄位
  const localPriceVal = document.getElementById('form-local-price').value;
  itemData.localPrice = localPriceVal === '' ? null : Number(localPriceVal);
  itemData.localCurrency = document.getElementById('form-local-currency').value;
  
  itemData.paymentMethod = document.getElementById('form-payment-method').value;

  if (itemData.paymentMethod === '現金') {
    itemData.paymentTool = '';
    itemData.cardCharge = null;
    itemData.chargeCurrency = '';
  } else {
    const cardChargeVal = document.getElementById('form-card-charge').value;
    itemData.cardCharge = cardChargeVal === '' ? null : Number(cardChargeVal);
    itemData.chargeCurrency = document.getElementById('form-charge-currency').value || 'TWD';
    itemData.paymentTool = document.getElementById('form-payment-tool').value;
  }

  // 為了相容於任何可能存取 .price 和 .currency 的舊代碼：
  const calculatedStats = getItemStatsPriceAndCurrency(itemData);
  itemData.price = calculatedStats.price > 0 ? calculatedStats.price : null;
  itemData.currency = calculatedStats.currency || 'TWD';

  // 同步 paymentCurrency & paymentAmount 供相容性與備份 JSON 使用
  itemData.paymentCurrency = itemData.chargeCurrency || 'TWD';
  itemData.paymentAmount = itemData.cardCharge !== undefined && itemData.cardCharge !== null ? itemData.cardCharge : null;

  // 防呆提醒：如果狀態設為「未收藏」或「已取消」
  if (itemData.status === 'uncollected' || itemData.status === 'cancelled') {
    const statusLabelText = itemData.status === 'uncollected' ? '未收藏' : '已取消';
    const isWarningConfirmed = await showConfirmDialog(
      `⚠️ 狀態設為［${statusLabelText}］將不計入統計數據與金額中，是否確定？`,
      '確定',
      '取消'
    );
    if (!isWarningConfirmed) return;
  }

  // 4. 自訂彈出式 RWD 確認視窗
  const isEdit = !!itemId;
  const confirmMsg = isEdit ? `是否修改此收藏「${itemData.name}」？` : `是否新增此收藏「${itemData.name}」？`;
  const isConfirmed = await showConfirmDialog(confirmMsg, isEdit ? '確認修改' : '確認新增');
  if (!isConfirmed) return;

  let oldStatus = null;
  if (isEdit) {
    // 編輯模式
    const oldItem = CollectionStorage.getById(itemId);
    if (oldItem) {
      oldStatus = oldItem.status;
      itemData.createdDate = oldItem.createdDate; // 繼承原本建立日期
    }
    CollectionStorage.update(itemId, itemData);
    console.log('藏品更新成功：', itemId);
    showToast(`✏️ 收藏「${itemData.name}」修改成功！`);
  } else {
    // 新增模式
    itemData.id = 'item-' + Date.now();
    CollectionStorage.add(itemData);
    console.log('藏品新增成功：', itemData.id);
    showToast(`🎉 收藏「${itemData.name}」新增成功！`);
  }

  // ⭐ 重新同步標籤管理（依目前所有收藏）
  const usedTags = [
    ...new Set(
      CollectionStorage.getAll()
        .flatMap(item => item.tags || [])
        .filter(Boolean)
    )
  ].sort();

  CollectionStorage.saveTags(usedTags);
  renderSettingTagsList();
  populateFilterSelects();

  // 當成功修改狀態時，顯示狀態 Toast 提示
  const statusMap = {
    collected: '✔ 已收藏',
    uncollected: '⭕ 未收藏',
    preorder: '🔵 預購中',
    ordered: '🟡 已下單',
    cancelled: '🔴 已取消'
  };
  const statusText = statusMap[itemData.status] || '已收藏';
  if (!isEdit || oldStatus !== itemData.status) {
    setTimeout(() => {
      showToast(`✔ 狀態已更新為：${statusText}`);
    }, 1000);
  }

  // 關閉表單
  closeFormDrawer();
  
  // 刷新統計與系列資料
  refreshAppSeriesData();

  // 若當前在系列頁，立即重新渲染卡片
  if (currentView === 'series') {
    renderSeriesPage(currentSeries);
  } else if (currentView === 'trip' && currentTrip) {
    renderTripPage(currentTrip);
  } else if (currentView === 'dashboard') {
    updateDashboardStats();
  }

  // 5. 儲存完後，主動檢查剩餘儲存容量 (高於 85% 提示用戶備份)
  checkAndWarnStorageCapacity();
}

/**
 * 動態填充多條件篩選下拉選單的選項 (標籤、來源、旅遊欄位等)
 */
function populateFilterSelects() {
  const allItems = CollectionStorage.getAll();

  // 1. 取得所有不重複標籤
  const tagsSet = new Set();
  allItems.forEach(item => {
    if (Array.isArray(item.tags)) {
      item.tags.forEach(t => {
        if (t && t.trim()) {
          tagsSet.add(t.trim());
        }
      });
    }
  });
  const sortedTags = Array.from(tagsSet).sort((a, b) => a.localeCompare(b, 'zh-Hant'));

  // 2. 取得所有不重複來源
  const sourcesSet = new Set();
  allItems.forEach(item => {
    if (item.source && item.source.trim()) {
      sourcesSet.add(item.source.trim());
    }
  });
  const sortedSources = Array.from(sourcesSet).sort((a, b) => a.localeCompare(b, 'zh-Hant'));

// 3. 取得所有不重複國家、城市、旅程
// 國家與旅程從系統設定資料讀取，避免依賴收藏品中不存在的 item.country / item.tripName
const countriesSet = new Set();
const citiesSet = new Set();
const tripsSet = new Set();

const allCountries = CollectionStorage.getAllCountries();
const allTrips = CollectionStorage.getAllTrips();

// 國家：直接從國家管理資料取得
allCountries.forEach(country => {
  if (country.name && country.name.trim()) {
    countriesSet.add(country.name.trim());
  }
});

// 旅程：直接從旅程管理資料取得
allTrips.forEach(trip => {
  if (trip.name && trip.name.trim()) {
    tripsSet.add(trip.name.trim());
  }

  // 旅程設定內的城市
  if (Array.isArray(trip.cities)) {
    trip.cities.forEach(city => {
      if (city && city.trim()) {
        citiesSet.add(city.trim());
      }
    });
  }
});

// 收藏品實際填寫的城市也一起加入
allItems.forEach(item => {
  if (
    item.category === '旅遊' &&
    item.city &&
    item.city.trim()
  ) {
    citiesSet.add(item.city.trim());
  }
});

const sortedCountries = Array.from(countriesSet)
  .sort((a, b) => a.localeCompare(b, 'zh-Hant'));

const sortedCities = Array.from(citiesSet)
  .sort((a, b) => a.localeCompare(b, 'zh-Hant'));

const sortedTrips = Array.from(tripsSet)
  .sort((a, b) => a.localeCompare(b, 'zh-Hant'));

  // 輔助填充函式
  const fillSelect = (id, options, labelPrefix) => {
    const selectEl = document.getElementById(id);
    if (!selectEl) return;
    const currentVal = selectEl.value;
    
    // 清空並保留預設 'all'
    selectEl.innerHTML = `<option value="all">${labelPrefix}: 全部</option>`;
    
    options.forEach(opt => {
      const optionEl = document.createElement('option');
      optionEl.value = opt;
      optionEl.textContent = opt;
      selectEl.appendChild(optionEl);
    });

    // 嘗試恢復先前的選中值，如果新選項裡還有
    if (options.includes(currentVal)) {
      selectEl.value = currentVal;
    } else {
      selectEl.value = 'all';
    }
  };

  fillSelect('filter-tag-select', sortedTags, '🏷️ 標籤');
  fillSelect('filter-source-select', sortedSources, '🛒 來源');
  const memberOptions = [];
  fillSelect('filter-member-select', memberOptions, '👤 成員');
  fillSelect('filter-country-select', sortedCountries, '🗺️ 國家');
  fillSelect('filter-city-select', sortedCities, '🏙️ 城市');
  fillSelect('filter-trip-select', sortedTrips, '📅 旅程');
}

/**
 * 根據系列名稱 (Key) 渲染系列頁面卡片
 * @param {string} seriesKey - 系列鍵值
 */
function renderSeriesPage(seriesKey) {
  let seriesInfo = null;
  let itemsList = [];
  const allItems = CollectionStorage.getAll();

  // 情況 1. 點擊「標籤分類」項目 (e.g., tag-限定款)
  if (seriesKey.startsWith('tag-')) {
    const tagName = '#' + seriesKey.replace('tag-', '');
    
    itemsList = allItems.filter(item => (item.tags || []).includes(tagName));
    
    seriesInfo = {
      title: tagName,
      emoji: '🏷️',
      count: getCollectedCount(itemsList),
      amount: getMultiCurrencyAmountString(itemsList)
    };
  } 
  // 情況 2. 點擊首頁「大分類」卡片 (e.g., category-娃娃)
  else if (seriesKey.startsWith('category-')) {
    const categoryInfo = CATEGORY_MAP[seriesKey];
    
    if (categoryInfo) {
      itemsList = allItems.filter(item => item.category === categoryInfo.title);
      
      seriesInfo = {
        title: categoryInfo.title,
        emoji: categoryInfo.emoji,
        count: getCollectedCount(itemsList),
        amount: getMultiCurrencyAmountString(itemsList)
      };
    }
  } 
  // 情況 2.5. 點擊側邊欄「國家」項目 (e.g., country-日本)
  else if (seriesKey.startsWith('country-')) {
    const countryName = seriesKey.replace('country-', '');
    itemsList = allItems.filter(item => item.country === countryName);
    
    const countries = CollectionStorage.getAllCountries();
    const countryObj = countries.find(c => c.name === countryName);
    
    seriesInfo = {
      title: countryName,
      emoji: countryObj ? (countryObj.emoji || '🗺️') : '🗺️',
      count: getCollectedCount(itemsList),
      amount: getMultiCurrencyAmountString(itemsList)
    };
  }
  // 情況 3. 點擊一般子系列項目 (e.g., chicken, japan)
  else {
    const seriesList = CollectionStorage.getAllSeries();
    const foundSeries = seriesList.find(s => s.id === seriesKey);
    if (foundSeries) {
      itemsList = allItems.filter(item => item.series === foundSeries.name);
      
      seriesInfo = {
        title: foundSeries.name,
        emoji: foundSeries.emoji || '📦',
        count: getCollectedCount(itemsList),
        amount: getMultiCurrencyAmountString(itemsList)
      };
    }
  }
  
  if (!seriesInfo) return;

  // 控制系列重新命名/刪除按鈕顯示
  const manageActions = document.getElementById('series-manage-actions');
  if (manageActions) {
    if (!seriesKey.startsWith('tag-') && !seriesKey.startsWith('category-') && !seriesKey.startsWith('country-')) {
      manageActions.style.display = 'flex';
    } else {
      manageActions.style.display = 'none';
    }
  }

  // 1. 讀取搜尋、多條件篩選與排序控制項
  const searchInput = document.getElementById('series-search-input');
  const searchKeyword = searchInput ? searchInput.value.toLowerCase().trim() : '';

  const statusFilter = document.getElementById('filter-status-select')?.value || 'all';
  const categoryFilter = document.getElementById('filter-category-select')?.value || 'all';
  const paymentFilter = document.getElementById('filter-payment-method-select')?.value || 'all';
  const currencyFilter = document.getElementById('filter-currency-select')?.value || 'all';
  const tagFilter = document.getElementById('filter-tag-select')?.value || 'all';
  const sourceFilter = document.getElementById('filter-source-select')?.value || 'all';
  const memberFilter = document.getElementById('filter-member-select')?.value || 'all';
  const countryFilter = document.getElementById('filter-country-select')?.value || 'all';
  const cityFilter = document.getElementById('filter-city-select')?.value || 'all';
  const tripFilter = document.getElementById('filter-trip-select')?.value || 'all';

  const sortSelect = document.getElementById('series-sort-select');
  const sortOrder = sortSelect ? sortSelect.value : 'latest_added';

  // 顯示/隱藏 分類 篩選 (依目前頁面自動切換內容)
  const categorySelectEl = document.getElementById('filter-category-select');
  if (categorySelectEl) {
    if (seriesKey === 'category-娃娃') {
      categorySelectEl.style.display = '';
      
      // 動態產生娃娃系列篩選內容
      const seriesList = CollectionStorage.getAllSeries();
      const dollSeries = seriesList.filter(s => s.category === '娃娃');
      const sortedDollSeries = dollSeries.sort((a, b) => a.name.localeCompare(b, 'zh-Hant'));
      
      const currentVal = categorySelectEl.value;
      const existingOptions = Array.from(categorySelectEl.options).map(o => o.value);
      const isSame = existingOptions.length === sortedDollSeries.length + 1 &&
                     existingOptions[0] === 'all' &&
                     sortedDollSeries.every((s, i) => existingOptions[i + 1] === s.name);
                     
      if (!isSame) {
        categorySelectEl.innerHTML = `<option value="all">🧸 娃娃: 全部</option>`;
        sortedDollSeries.forEach(s => {
          const optionEl = document.createElement('option');
          optionEl.value = s.name;
          optionEl.textContent = `${s.emoji || '🧸'} ${s.name}`;
          categorySelectEl.appendChild(optionEl);
        });
        
        const validValues = ['all', ...sortedDollSeries.map(s => s.name)];
        if (validValues.includes(currentVal)) {
          categorySelectEl.value = currentVal;
        } else {
          categorySelectEl.value = 'all';
        }
      }
    } else if (seriesKey === 'category-周邊') {
      categorySelectEl.style.display = '';
      
      // 動態產生周邊系列篩選內容
      const seriesList = CollectionStorage.getAllSeries();
      const merchSeries = seriesList.filter(s => s.category === '周邊');
      const sortedMerchSeries = merchSeries.sort((a, b) => a.name.localeCompare(b, 'zh-Hant'));
      
      const currentVal = categorySelectEl.value;
      const existingOptions = Array.from(categorySelectEl.options).map(o => o.value);
      const isSame = existingOptions.length === sortedMerchSeries.length + 1 &&
                     existingOptions[0] === 'all' &&
                     sortedMerchSeries.every((s, i) => existingOptions[i + 1] === s.name);
                     
      if (!isSame) {
        categorySelectEl.innerHTML = `<option value="all">🎁 周邊: 全部</option>`;
        sortedMerchSeries.forEach(s => {
          const optionEl = document.createElement('option');
          optionEl.value = s.name;
          optionEl.textContent = `${s.emoji || '🎁'} ${s.name}`;
          categorySelectEl.appendChild(optionEl);
        });
        
        const validValues = ['all', ...sortedMerchSeries.map(s => s.name)];
        if (validValues.includes(currentVal)) {
          categorySelectEl.value = currentVal;
        } else {
          categorySelectEl.value = 'all';
        }
      }
    } else if (seriesKey === 'category-旅遊') {
      categorySelectEl.style.display = 'none';
      
      // 動態產生國家篩選內容
      const countriesSet = new Set();
      allItems.forEach(item => {
        if (item.category === '旅遊') {
          if (item.country && item.country.trim()) {
            countriesSet.add(item.country.trim());
          }
        }
      });
      const sortedCountries = Array.from(countriesSet).sort((a, b) => a.localeCompare(b, 'zh-Hant'));
      
      const currentVal = categorySelectEl.value;
      const existingOptions = Array.from(categorySelectEl.options).map(o => o.value);
      const isSame = existingOptions.length === sortedCountries.length + 1 &&
                     existingOptions[0] === 'all' &&
                     sortedCountries.every((c, i) => existingOptions[i + 1] === c);
                     
      if (!isSame) {
        categorySelectEl.innerHTML = `<option value="all">🗺️ 國家: 全部</option>`;
        sortedCountries.forEach(c => {
          const optionEl = document.createElement('option');
          optionEl.value = c;
          optionEl.textContent = `🗺️ ${c}`;
          categorySelectEl.appendChild(optionEl);
        });
        
        if (sortedCountries.includes(currentVal) || currentVal === 'all') {
          categorySelectEl.value = currentVal;
        } else {
          categorySelectEl.value = 'all';
        }
      }
    } else {
      // 進入最底層系列或 Tag 頁等，直接隱藏分類下拉
      categorySelectEl.style.display = 'none';
      
      // 還原為預設全站分類選項，僅在不是預設全站分類時才重置
      if (!categorySelectEl.options[1] || categorySelectEl.options[1].value !== '娃娃') {
        categorySelectEl.innerHTML = `
          <option value="all">📦 分類: 全部</option>
          <option value="娃娃">🧸 娃娃</option>
          <option value="周邊">✨ 周邊</option>
          <option value="旅遊">✈️ 旅遊</option>
        `;
        categorySelectEl.value = 'all';
      }
    }
  }

  // 判斷是否為旅遊系列
  let isTravelMode = (categoryFilter === '旅遊');
  if (!isTravelMode) {
    if (seriesKey === 'category-旅遊' || seriesKey.startsWith('country-')) {
      isTravelMode = true;
    } else if (!seriesKey.startsWith('category-') && !seriesKey.startsWith('tag-')) {
      const seriesList = CollectionStorage.getAllSeries();
      const foundSeries = seriesList.find(s => s.id === seriesKey);
      if (foundSeries && foundSeries.category === '旅遊') {
        isTravelMode = true;
      }
    }
  }

  // 顯示/隱藏旅遊專屬篩選
  const travelFiltersGroup = document.getElementById('travel-filters-group');
  if (travelFiltersGroup) {
    travelFiltersGroup.style.display = isTravelMode ? 'flex' : 'none';
  }

  // 顯示／隱藏周邊成員篩選
  const memberFilterSelect = document.getElementById('filter-member-select');

  if (memberFilterSelect) {
    const seriesTitle = seriesInfo?.title || '';

  const group = CollectionStorage.getAllGroups().find(g => g.name === seriesTitle);
  const members = group ? ['全員', ...(group.members || [])] : [];

  if (members.length > 0) {
    memberFilterSelect.style.display = '';

    const currentValue = memberFilterSelect.value;

    memberFilterSelect.innerHTML =
      '<option value="all">👤 成員: 全部</option>';

    members.forEach(member => {
      const option = document.createElement('option');
      option.value = member;
      option.textContent = member;
      memberFilterSelect.appendChild(option);
    });

    memberFilterSelect.value = members.includes(currentValue)
      ? currentValue
      : 'all';
  } else {
    memberFilterSelect.style.display = 'none';
    memberFilterSelect.value = 'all';
  }
}

  // 2. 過濾與搜尋 (AND 多條件篩選)
  let filteredItems = [...itemsList];

  // A. 狀態篩選
  if (statusFilter !== 'all') {
    filteredItems = filteredItems.filter(item => (item.status || 'collected') === statusFilter);
  }

  // B. 分類篩選
  if (categoryFilter !== 'all') {
    if (seriesKey === 'category-旅遊') {
      filteredItems = filteredItems.filter(item => item.country === categoryFilter);
    } else if (seriesKey === 'category-娃娃' || seriesKey === 'category-周邊') {
      filteredItems = filteredItems.filter(item => item.series === categoryFilter);
    } else {
      filteredItems = filteredItems.filter(item => item.category === categoryFilter);
    }
  }

  // C. 付款方式篩選
  if (paymentFilter !== 'all') {
    filteredItems = filteredItems.filter(item => item.paymentMethod === paymentFilter);
  }

  // D. 幣別篩選
  if (currencyFilter !== 'all') {
    filteredItems = filteredItems.filter(item => item.currency === currencyFilter);
  }

  // E. 標籤篩選
  if (tagFilter !== 'all') {
    filteredItems = filteredItems.filter(item => Array.isArray(item.tags) && item.tags.includes(tagFilter));
  }

  // F. 來源篩選
  if (sourceFilter !== 'all') {
    filteredItems = filteredItems.filter(item => item.source === sourceFilter);
  }

  // G. 成員篩選
  if (memberFilter !== 'all') {
    filteredItems = filteredItems.filter(item => {
        if (Array.isArray(item.members)) {
            return item.members.includes(memberFilter);
        }
        return item.member === memberFilter;
    });
}

// G. 旅遊專屬欄位篩選（依 tripId → trip → countryId 正確判斷）
if (isTravelMode) {
  const allTrips = CollectionStorage.getAllTrips();
  const allCountries = CollectionStorage.getAllCountries();

  const getTripByItem = (item) => {
    if (!item.tripId) return null;
    return allTrips.find(trip => trip.id === item.tripId) || null;
  };

  const getCountryByTrip = (trip) => {
    if (!trip) return null;
    return allCountries.find(country => country.id === trip.countryId) || null;
  };

  if (countryFilter !== 'all' && !seriesKey.startsWith('country-')) {
    filteredItems = filteredItems.filter(item => {
      const trip = getTripByItem(item);
      const country = getCountryByTrip(trip);

      return (
        (country && country.name === countryFilter) ||
        item.series === countryFilter ||
        item.country === countryFilter
      );
    });
  }

  if (cityFilter !== 'all') {
    filteredItems = filteredItems.filter(item => {
      const trip = getTripByItem(item);
      const tripCities = trip && Array.isArray(trip.cities) ? trip.cities : [];

      return item.city === cityFilter || tripCities.includes(cityFilter);
    });
  }

  if (tripFilter !== 'all') {
    filteredItems = filteredItems.filter(item => {
      const trip = getTripByItem(item);

      return (
        item.tripId === tripFilter ||
        (trip && trip.name === tripFilter)
      );
    });
  }
}

  // H. 搜尋關鍵字過濾 (搜尋內容：名稱、系列、標籤、備註、來源。若為旅遊，再額外搜尋國家、城市、購入商店、購入地點)
  if (searchKeyword) {
    filteredItems = filteredItems.filter(item => {
      const nameMatch = (item.name || '').toLowerCase().includes(searchKeyword);
      const seriesMatch = (item.series || '').toLowerCase().includes(searchKeyword);
      const noteMatch = (item.note || '').toLowerCase().includes(searchKeyword);
      const sourceMatch = (item.source || '').toLowerCase().includes(searchKeyword);
      const tagMatch = (item.tags || []).some(tag => tag.toLowerCase().includes(searchKeyword));
      
      let travelMatch = false;
      if (item.category === '旅遊') {
        const countryMatch = (item.country || '').toLowerCase().includes(searchKeyword);
        const cityMatch = (item.city || '').toLowerCase().includes(searchKeyword);
        const shopMatch = (item.shop || '').toLowerCase().includes(searchKeyword);
        const locationMatch = (item.location || '').toLowerCase().includes(searchKeyword);
        travelMatch = countryMatch || cityMatch || shopMatch || locationMatch;
      }
      
      return nameMatch || seriesMatch || noteMatch || sourceMatch || tagMatch || travelMatch;
    });
  }

  // I. 排序
  if (sortOrder === 'latest_added') {
    filteredItems.sort((a, b) => {
      const dateA = a.createdDate ? new Date(a.createdDate).getTime() : 0;
      const dateB = b.createdDate ? new Date(b.createdDate).getTime() : 0;
      return dateB - dateA;
    });
  } else if (sortOrder === 'oldest_added') {
    filteredItems.sort((a, b) => {
      const dateA = a.createdDate ? new Date(a.createdDate).getTime() : 0;
      const dateB = b.createdDate ? new Date(b.createdDate).getTime() : 0;
      return dateA - dateB;
    });
  } else if (sortOrder === 'price_desc') {
    filteredItems.sort((a, b) => getItemComputedPrice(b) - getItemComputedPrice(a));
  } else if (sortOrder === 'price_asc') {
    filteredItems.sort((a, b) => getItemComputedPrice(a) - getItemComputedPrice(b));
  } else if (sortOrder === 'name_asc') {
    filteredItems.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'zh-Hant'));
  } else if (sortOrder === 'name_desc') {
    filteredItems.sort((a, b) => (b.name || '').localeCompare(a.name || '', 'zh-Hant'));
  } else if (sortOrder === 'date_desc') {
    filteredItems.sort((a, b) => {
      const valA = a.purchaseDate || '';
      const valB = b.purchaseDate || '';
      if (!valA && !valB) return 0;
      if (!valA) return 1;
      if (!valB) return -1;
      return valB.localeCompare(valA);
    });
  } else if (sortOrder === 'date_asc') {
    filteredItems.sort((a, b) => {
      const valA = a.purchaseDate || '';
      const valB = b.purchaseDate || '';
      if (!valA && !valB) return 0;
      if (!valA) return 1;
      if (!valB) return -1;
      return valA.localeCompare(valB);
    });
  }

  // 1. 更新頁面標題、Emoji、數量與總金額 (動態即時計算)
  document.getElementById('dynamic-series-emoji').textContent = seriesInfo.emoji;
  document.getElementById('dynamic-series-title').textContent = seriesInfo.title;

  const metaTextEl = document.querySelector('.series-meta-text');
  if (metaTextEl) {
    let labelCount = '目前收藏';
    let labelAmount = '總收藏金額';
    let displayCount = 0;
    let displayAmountStr = 'NT$ 0';

    if (statusFilter === 'all') {
      displayCount = getCollectedCount(filteredItems);
      displayAmountStr = getMultiCurrencyAmountString(filteredItems) || 'NT$ 0';
    } else {
      displayCount = filteredItems.length;
      displayAmountStr = getAnyStatusValueString(filteredItems) || 'NT$ 0';
      
      const statusLabels = {
        collected: '目前收藏',
        uncollected: '目前未收藏',
        preorder: '目前預購中',
        ordered: '目前已下單',
        cancelled: '目前已取消'
      };
      const amountLabels = {
        collected: '總收藏金額',
        uncollected: '總未收藏金額',
        preorder: '總預購金額',
        ordered: '總已下單金額',
        cancelled: '總已取消金額'
      };
      labelCount = statusLabels[statusFilter] || '目前數量';
      labelAmount = amountLabels[statusFilter] || '總金額';
    }

    metaTextEl.innerHTML = `
      ${labelCount}：<span id="dynamic-series-count" style="font-weight: 600;">${displayCount}</span> 件
      <span class="series-meta-divider">|</span> 
      ${labelAmount}：<span id="dynamic-series-amount" style="font-weight: 600;">${displayAmountStr}</span>
    `;
  }

  // 3. 渲染卡片 HTML
  const cardsContainer = document.getElementById('dynamic-cards-container');
  cardsContainer.innerHTML = '';

  if (filteredItems.length === 0) {
    cardsContainer.innerHTML = `
      <div class="no-results" style="grid-column: 1 / -1; text-align: center; padding: 60px 24px; color: var(--text-muted);">
        <p style="font-size: 2rem; margin-bottom: 8px;">🔍</p>
        <p style="font-size: var(--fs-sm);">找不到符合條件的收藏品項目</p>
      </div>
    `;
    return;
  }

  const statusLabels = {
    collected: '已收藏',
    uncollected: '未收藏',
    preorder: '預購中',
    ordered: '已下單',
    cancelled: '已取消'
  };

  filteredItems.forEach(item => {
    const cardEl = document.createElement('div');
    cardEl.className = 'collection-card';
    cardEl.id = `item-card-${item.id}`;
    
    const cardBgColor = item.status === 'collected' 
      ? 'linear-gradient(135deg, #f5f5f7 0%, #e8e8ed 100%)' 
      : 'linear-gradient(135deg, #fafafa 0%, #f0f0f0 100%)';

    const itemTags = item.tags || [];
    const displayedTags = itemTags.slice(0, 3);
    const hasMoreTags = itemTags.length > 3;
    const moreTagsCount = itemTags.length - 3;
    const statusText = statusLabels[item.status] || '已收藏';
    const displayPrice = getItemDisplayPriceString(item);
    const hasPrice = displayPrice !== '';
    const displayDate = item.purchaseDate || '無';
    const dateRowLabel = item.status === 'collected' ? `購入: ${displayDate}` : statusLabels[item.status] || '未收藏';
    const memberList = Array.isArray(item.members) && item.members.length
      ? item.members
      : item.member
        ? [item.member]
        : [];
    
    const cardMemberText = memberList.length
      ? memberList.join('、')
      : '';

    const emoji = getItemEmoji(item);

    // 檢查卡片封面：若有自訂上傳相片則使用第一張，否則使用預設 Emoji 漸層
    let mediaHTML = `<span class="card-media-emoji">${emoji}</span>`;
    if (item.images && item.images.length > 0) {
      mediaHTML = `<img src="${item.images[0]}" alt="${item.name}" style="width: 100%; height: 100%; object-fit: cover;">`;
    }

    cardEl.innerHTML = `
      <div class="card-media" style="background: ${cardBgColor};">
        ${mediaHTML}
        <div class="card-status-badge ${item.status}">${statusText}</div>
      </div>
      <div class="card-info">
        <div class="card-tags">
          ${displayedTags.map(tag => formatTagToChip(tag)).join('')}
          ${hasMoreTags ? `<span class="card-tag-item more" style="background-color: var(--border-light); color: var(--text-muted);">+${moreTagsCount}</span>` : ''}
        </div>
        ${cardMemberText ? `<div class="card-item-member">👤 ${cardMemberText}</div>` : ''}

        <h3 class="card-item-name">${item.name}</h3>
        <div class="card-item-meta-row">
          ${hasPrice ? `<span class="card-item-price">${displayPrice}</span>` : '<span></span>'}
          <span class="card-item-date">${dateRowLabel}</span>
        </div>
      </div>
    `;

    // 點擊卡片開啟側邊 Drawer (直接讀取 LocalStorage)
    cardEl.addEventListener('click', () => {
      const currentItem = CollectionStorage.getById(item.id) || item;
      openDrawer(currentItem);
    });

    cardsContainer.appendChild(cardEl);
  });
}

/**
 * 開啟右側 Drawer 抽屜顯示藏品細節 (讀取動態資料欄位)
 */
function openDrawer(item) {
  const drawer = document.getElementById('item-detail-drawer');
  const backdrop = document.getElementById('drawer-backdrop');

  if (!drawer || !backdrop) return;

  // 1. 儲存當前正開啟的 ID 到全域以供編輯/刪除使用
  window.currentDetailItemId = item.id;

  // 2. 判斷是否為旅遊，動態切換欄位標籤與樣式 (Apple/Notion 多視圖切換)
  const seriesLabel = document.getElementById('drawer-series-label');
  const priceLabel = document.getElementById('drawer-price-label');
  const dateLabel = document.getElementById('drawer-date-label');
  const sourceLabel = document.getElementById('drawer-source-label');

  if (item.category === '旅遊') {
    if (seriesLabel) seriesLabel.textContent = '🗺️ 國家';
    if (priceLabel) priceLabel.textContent = '💵 旅遊花費';
    if (dateLabel) dateLabel.textContent = '📅 旅程時間';
    if (sourceLabel) sourceLabel.textContent = '🏙️ 城市';
  } else {
    if (seriesLabel) seriesLabel.textContent = '🏷️ 系列';
    if (priceLabel) priceLabel.textContent = '💵 價格';
    if (dateLabel) dateLabel.textContent = '📅 購入日期';
    if (sourceLabel) sourceLabel.textContent = '🏪 來源管道';
  }

  // 3. 填入數據至抽屜
  document.getElementById('drawer-name').textContent = item.name;
  document.getElementById('drawer-series').textContent = item.series || '無';
  document.getElementById('drawer-category').textContent = item.category || '未分類';
  
  // 周邊成員顯示
  const memberRow = document.getElementById('drawer-member-row');
  const memberEl = document.getElementById('drawer-member');

  if (item.category === '周邊' && item.member) {
    if (memberRow) memberRow.style.display = 'grid';
    if (memberEl) memberEl.textContent = item.member;
  } else {
    if (memberRow) memberRow.style.display = 'none';
    if (memberEl) memberEl.textContent = '';
  }

  // 價格顯示
  const priceRow = document.getElementById('drawer-price-row');
  const hasPrice = item.price !== undefined && item.price !== null && item.price !== '';
  if (priceRow) {
    if (hasPrice) {
      priceRow.style.display = 'grid';
      const itemCurrency = item.currency || 'TWD';
      const currencySymbol = getCurrencySymbol(itemCurrency);
      document.getElementById('drawer-price').textContent = `${currencySymbol} ${Number(item.price).toLocaleString()}`;
      document.getElementById('drawer-currency').textContent = itemCurrency;
    } else {
      priceRow.style.display = 'none';
    }
  }

  // 當地價格顯示
  const localPriceRow = document.getElementById('drawer-local-price-row');
  if (localPriceRow) {
    const hasLocal = item.localPrice !== undefined && item.localPrice !== null && item.localPrice !== '';
    if (hasLocal) {
      localPriceRow.style.display = 'grid';
      const localCurrency = item.localCurrency || 'JPY';
      const localSymbol = getCurrencySymbol(localCurrency);
      const localAmount = Number(item.localPrice).toLocaleString();

      document.getElementById('drawer-local-price').textContent =
        localCurrency === 'TWD'
          ? `NT$ ${localAmount}`
          : `${localCurrency} ${localSymbol} ${localAmount}`;
    } else {
      localPriceRow.style.display = 'none';
    }
  }

  // 刷卡實際扣款顯示
  const cardChargeRow = document.getElementById('drawer-card-charge-row');
  if (cardChargeRow) {
    const hasCard = item.cardCharge !== undefined && item.cardCharge !== null && item.cardCharge !== '';
    if (hasCard) {
      cardChargeRow.style.display = 'grid';
      const chargeCurrency = item.chargeCurrency || 'TWD';
      const chargeSymbol = getCurrencySymbol(chargeCurrency);
      const chargeAmount = Number(item.cardCharge).toLocaleString();

     document.getElementById('drawer-card-charge').textContent =
       chargeCurrency === 'TWD'
         ? `NT$ ${chargeAmount}`
         : `${chargeCurrency} ${chargeSymbol} ${chargeAmount}`;
    } else {
      cardChargeRow.style.display = 'none';
    }
  }

  // 付款方式顯示
  const paymentMethodRow = document.getElementById('drawer-payment-method-row');
  if (paymentMethodRow) {
    if (item.paymentMethod) {
      paymentMethodRow.style.display = 'grid';
      document.getElementById('drawer-payment-method').textContent = item.paymentMethod;
    } else {
      paymentMethodRow.style.display = 'none';
    }
  }

  // 付款工具顯示
  const paymentToolRow = document.getElementById('drawer-payment-tool-row');
  if (paymentToolRow) {
    if (item.paymentTool) {
      paymentToolRow.style.display = 'grid';
      document.getElementById('drawer-payment-tool').textContent = item.paymentTool;
    } else {
      paymentToolRow.style.display = 'none';
    }
  }

  // 購入商店顯示
  const purchaseShopRow = document.getElementById('drawer-purchase-shop-row');
  if (purchaseShopRow) {
    if (item.shop) {
      purchaseShopRow.style.display = 'grid';
      document.getElementById('drawer-purchase-shop').textContent = item.shop;
    } else {
      purchaseShopRow.style.display = 'none';
    }
  }

  // 購入地點顯示
  const purchasePlaceRow = document.getElementById('drawer-purchase-place-row');
  if (purchasePlaceRow) {
    if (item.category === '旅遊' && item.location) {
      purchasePlaceRow.style.display = 'grid';
      const cityStr = item.city ? `${item.city} ` : '';
      document.getElementById('drawer-purchase-place').textContent = `${cityStr}${item.location}`;
    } else {
      purchasePlaceRow.style.display = 'none';
    }
  }

  document.getElementById('drawer-date').textContent = item.purchaseDate || '---';
  document.getElementById('drawer-source').textContent = item.source || '無';
  document.getElementById('drawer-notes').textContent = item.note || '無備註描述';

  // 標籤渲染
  const tagsContainer = document.getElementById('drawer-tags');
  tagsContainer.innerHTML = (item.tags || []).map(tag => formatTagToDrawerChip(tag)).join('');

  // 狀態徽章渲染
  const statusBadge = document.getElementById('drawer-status');
  const statusLabels = {
    collected: '已收藏',
    uncollected: '未收藏',
    preorder: '預購中',
    ordered: '已下單',
    cancelled: '已取消'
  };
  statusBadge.className = `drawer-status-badge ${item.status || 'collected'}`;
  statusBadge.textContent = statusLabels[item.status] || '已收藏';

  // 4. 初始化自訂圖片與輪播 (含 fallback 邏輯)
  const mediaPlaceholder = document.getElementById('drawer-media-placeholder');
  mediaPlaceholder.setAttribute('data-item-id', item.id);
  mediaPlaceholder.setAttribute('data-item-series', item.series || '');

  detailDrawerImages = item.images || [];
  currentDetailImageIndex = 0;
  renderDetailDrawerImage();

  // 5. 顯示抽屜與遮罩
  drawer.classList.add('open');
  backdrop.classList.add('show');
  
  // 防止主頁面跟著滾動
  document.body.style.overflow = 'hidden';
}

/**
 * 渲染詳情抽屜的圖片 (含輪播與預設漸層 fallback)
 */
function renderDetailDrawerImage() {
  const mediaPlaceholder = document.getElementById('drawer-media-placeholder');
  const prevArrow = document.getElementById('drawer-prev-img');
  const nextArrow = document.getElementById('drawer-next-img');
  const dotsContainer = document.getElementById('drawer-carousel-dots');
  const coverIndicator = document.getElementById('drawer-cover-indicator');
  const setCoverBtn = document.getElementById('btn-set-drawer-cover');

  if (!mediaPlaceholder) return;

  if (detailDrawerImages && detailDrawerImages.length > 0) {
    // 1. 顯示自訂圖片
    const imgUrl = detailDrawerImages[currentDetailImageIndex];
    mediaPlaceholder.innerHTML = `<img src="${imgUrl}" alt="藏品圖片" style="width: 100%; height: 100%; object-fit: cover;">`;
    mediaPlaceholder.style.background = '#f4f4f5';
    mediaPlaceholder.style.cursor = 'zoom-in';

    // 2. 輪播控制鍵 (只有一張時隱藏)
    if (detailDrawerImages.length > 1) {
      if (prevArrow) prevArrow.style.display = 'flex';
      if (nextArrow) nextArrow.style.display = 'flex';
      
      // 點點渲染
      if (dotsContainer) {
        dotsContainer.style.display = 'flex';
        dotsContainer.innerHTML = detailDrawerImages.map((_, idx) => `
          <span class="dot ${idx === currentDetailImageIndex ? 'active' : ''}"></span>
        `).join('');
      }

      // 封面指示器與按鈕
      if (currentDetailImageIndex === 0) {
        if (coverIndicator) coverIndicator.style.display = 'flex';
        if (setCoverBtn) setCoverBtn.style.display = 'none';
      } else {
        if (coverIndicator) coverIndicator.style.display = 'none';
        if (setCoverBtn) setCoverBtn.style.display = 'flex';
      }
    } else {
      if (prevArrow) prevArrow.style.display = 'none';
      if (nextArrow) nextArrow.style.display = 'none';
      if (dotsContainer) dotsContainer.style.display = 'none';
      if (coverIndicator) coverIndicator.style.display = 'none';
      if (setCoverBtn) setCoverBtn.style.display = 'none';
    }
  } else {
    // 3. Fallback 到 Emoji 及隨機漸層 (與原本保持一致，不破壞風格)
    mediaPlaceholder.style.cursor = 'default';
    if (prevArrow) prevArrow.style.display = 'none';
    if (nextArrow) nextArrow.style.display = 'none';
    if (dotsContainer) dotsContainer.style.display = 'none';
    if (coverIndicator) coverIndicator.style.display = 'none';
    if (setCoverBtn) setCoverBtn.style.display = 'none';

    // 取得動態 Emoji
    const currentItemId = mediaPlaceholder.getAttribute('data-item-id');
    const currentItemSeries = mediaPlaceholder.getAttribute('data-item-series');
    
    let emoji = '📦';
    const seriesList = CollectionStorage.getAllSeries();
    const foundSeries = seriesList.find(s => s.name === currentItemSeries);
    if (foundSeries) {
      emoji = foundSeries.emoji || '📦';
    }
    
    // 自訂特定的 Emoji
    const emojiMap = {
      'chk-01': '🐤', 'chk-02': '🕵️‍♂️', 'chk-03': '🍓',
      'dck-01': '🦆', 'dck-02': '🌸', 'yuk-01': '🗻', 'yuk-02': '🌸',
      'sj-01': '⚡', 'sj-02': '🏅', 'exo-01': '🪐', 'jp-01': '🍿',
      'jp-02': '🌸', 'jp-03': '🏎️', 'kr-01': '🧸', 'kr-02': '🍊',
      'hk-01': '🚃', 'hk-02': '🪙'
    };
    if (emojiMap[currentItemId]) emoji = emojiMap[currentItemId];

    mediaPlaceholder.innerHTML = `<span class="carousel-emoji">${emoji}</span>`;
    
    const gradients = [
      'linear-gradient(135deg, #f5f5f7 0%, #e8e8ed 100%)',
      'linear-gradient(135deg, #fff5e6 0%, #ffe0b2 100%)',
      'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
      'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)'
    ];
    // 透過 ID 雜湊取得固定的隨機漸層，防止每次重渲染都閃爍
    let hash = 0;
    if (currentItemId) {
      for (let i = 0; i < currentItemId.length; i++) {
        hash = currentItemId.charCodeAt(i) + ((hash << 5) - hash);
      }
    }
    const gradientIdx = Math.abs(hash) % gradients.length;
    mediaPlaceholder.style.background = gradients[gradientIdx];
  }
}

/**
 * 關閉右側 Drawer 抽屜
 */
function closeDrawer() {
  const drawer = document.getElementById('item-detail-drawer');
  const backdrop = document.getElementById('drawer-backdrop');

  if (drawer) drawer.classList.remove('open');
  if (backdrop && !document.getElementById('item-form-drawer').classList.contains('open')) {
    backdrop.classList.remove('show');
  }

  // 恢復主頁面滾動
  document.body.style.overflow = '';
}

/**
 * 放大圖片燈箱 (Lightbox)
 */
function openLightbox(index) {
  const lightbox = document.getElementById('image-lightbox');
  if (!lightbox) return;
  
  lightboxImageIndex = index;
  renderLightboxImage();
  
  lightbox.style.display = 'flex';
  setTimeout(() => {
    lightbox.classList.add('show');
  }, 10);
  
  // 避免底層背景滾動
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  const lightbox = document.getElementById('image-lightbox');
  if (!lightbox) return;
  
  lightbox.classList.remove('show');
  setTimeout(() => {
    lightbox.style.display = 'none';
  }, 300);
  
  // 恢復 Details Drawer 開啟時的 hidden，或者如果是完全關閉，就恢復預設
  const detailDrawer = document.getElementById('item-detail-drawer');
  if (detailDrawer && detailDrawer.classList.contains('open')) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
}

function renderLightboxImage() {
  const imgEl = document.getElementById('lightbox-img');
  const prevBtn = document.getElementById('lightbox-prev');
  const nextBtn = document.getElementById('lightbox-next');
  const dotsEl = document.getElementById('lightbox-dots');
  
  if (!imgEl) return;
  
  if (detailDrawerImages && detailDrawerImages.length > 0) {
    imgEl.src = detailDrawerImages[lightboxImageIndex];
    
    if (detailDrawerImages.length > 1) {
      if (prevBtn) prevBtn.style.display = 'flex';
      if (nextBtn) nextBtn.style.display = 'flex';
      
      if (dotsEl) {
        dotsEl.style.display = 'flex';
        dotsEl.innerHTML = detailDrawerImages.map((_, idx) => `
          <span class="dot ${idx === lightboxImageIndex ? 'active' : ''}"></span>
        `).join('');
      }
    } else {
      if (prevBtn) prevBtn.style.display = 'none';
      if (nextBtn) nextBtn.style.display = 'none';
      if (dotsEl) dotsEl.style.display = 'none';
    }
  }
}

/**
 * ==========================================================
 * 11. 全新系統設定：系列、標籤、來源、幣別管理核心功能
 * ==========================================================
 */

/**
 * 動態填充藏品表單的來源管道下拉選單
 */
function populateFormSourceSelect() {
  const sourceSelect = document.getElementById('form-source');
  if (!sourceSelect) return;
  const sources = CollectionStorage.getAllSources();
  let html = `<option value="">請選擇來源 (選填)</option>`;
  sources.forEach(s => {
    html += `<option value="${s}">${s}</option>`;
  });
  sourceSelect.innerHTML = html;
}

/**
 * 周邊團體與成員管理
 */
function renderSettingGroupsList() {
  const groupSelect = document.getElementById('setting-group-select');
  const container = document.getElementById('setting-members-list');
  if (!groupSelect || !container) return;

  const merchSeries = CollectionStorage.getAllSeries().filter(s => s.category === '周邊');
  const previous = groupSelect.value;
  groupSelect.innerHTML = merchSeries.length
    ? merchSeries.map(s => `<option value="${s.name}">${s.emoji || '🎁'} ${s.name}</option>`).join('')
    : '<option value="">尚未建立周邊系列</option>';

  if (merchSeries.some(s => s.name === previous)) groupSelect.value = previous;
  const selectedName = groupSelect.value;
  if (!selectedName) {
    container.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:16px;font-size:var(--fs-xs);">請先在系列管理新增「周邊」系列。</div>';
    return;
  }

  const group = CollectionStorage.getGroupByName(selectedName);
  const members = (group ? group.members || [] : [])
    .map(member => typeof member === 'string' ? member : (member && (member.name || member.label || member.value)) || '')
    .map(member => String(member).trim())
    .filter(Boolean);
  container.innerHTML = members.length ? members.map(member => `
    <div class="settings-list-item" data-member="${member.replace(/"/g, '&quot;')}">
      <div class="settings-item-info">
        <span class="settings-item-emoji">👤</span>
        <span class="settings-item-name">${member}</span>
      </div>
      <div class="settings-item-actions">
        <button class="settings-action-btn delete-member-btn" title="刪除成員">🗑️</button>
      </div>
    </div>`).join('') : '<div style="text-align:center;color:var(--text-muted);padding:16px;font-size:var(--fs-xs);">尚未新增成員；收藏表單仍可選擇「全員」或留空。</div>';
}

async function addSettingMember() {
  const groupName = document.getElementById('setting-group-select')?.value;
  const input = document.getElementById('setting-member-name');
  const memberName = input?.value.trim();
  if (!groupName) { alert('請先建立並選擇周邊系列！'); return; }
  if (!memberName) { alert('請輸入成員名稱！'); return; }
  if (memberName === '全員') { alert('「全員」為系統固定選項，不需要另外新增。'); return; }

  const groups = CollectionStorage.getAllGroups();
  let group = groups.find(g => g.name === groupName);
  if (!group) {
    group = { id: 'group-' + Date.now(), name: groupName, members: [] };
    groups.push(group);
  }
  group.members = (group.members || [])
    .map(member => typeof member === 'string' ? member : (member && (member.name || member.label || member.value)) || '')
    .map(member => String(member).trim())
    .filter(Boolean);
  if (group.members.some(m => m.toLowerCase() === memberName.toLowerCase())) {
    alert('此成員已存在！'); return;
  }
  group.members.push(memberName);
  CollectionStorage.saveGroups(groups);
  input.value = '';
  renderSettingGroupsList();
  updateMemberSelect();
  showToast(`👤 已新增成員「${memberName}」！`);
}

async function deleteSettingMember(groupName, memberName) {
  const used = CollectionStorage.getAll().some(item => {
    if (item.category !== '周邊' || item.series !== groupName) {
        return false;
    }

    if (Array.isArray(item.members)) {
        return item.members.includes(memberName);
    }

    return item.member === memberName;
});
  if (used) {
    alert(`❌ 無法刪除「${memberName}」：目前仍有收藏品使用此成員。請先修改那些收藏品。`);
    return;
  }
  const confirmed = await showConfirmDialog(`確定要刪除成員「${memberName}」嗎？`, '確定刪除', '取消', true);
  if (!confirmed) return;
  const groups = CollectionStorage.getAllGroups();
  const group = groups.find(g => g.name === groupName);
  if (group) group.members = (group.members || []).filter(m => m !== memberName);
  CollectionStorage.saveGroups(groups);
  renderSettingGroupsList();
  updateMemberSelect();
  showToast(`🗑️ 成員「${memberName}」已刪除！`);
}

/**
 * A. 系列管理
 */
function renderSettingSeriesList() {
  const seriesList = CollectionStorage.getAllSeries();
  const container = document.getElementById('setting-series-list');
  if (!container) return;
  container.innerHTML = seriesList.map(s => `
    <div class="settings-list-item" data-id="${s.id}">
      <div class="settings-item-info">
        <span class="settings-item-emoji">${s.emoji || '📦'}</span>
        <span class="settings-item-name">${s.name}</span>
        <span class="settings-item-category">${s.category}</span>
      </div>
      <div class="settings-item-actions">
        <button class="settings-action-btn edit-btn" title="編輯">🖊️</button>
        <button class="settings-action-btn delete-btn" title="刪除">🗑️</button>
      </div>
    </div>
  `).join('');
}

function startEditSettingSeries(id) {
  const s = CollectionStorage.getSeriesById(id);
  if (!s) return;
  document.getElementById('setting-series-id').value = s.id;
  document.getElementById('setting-series-category').value = s.category;
  document.getElementById('setting-series-name').value = s.name;
  document.getElementById('setting-series-emoji').value = s.emoji || '📦';
  document.getElementById('btn-setting-cancel-series').style.display = 'inline-flex';
}

function cancelEditSettingSeries() {
  document.getElementById('setting-series-id').value = '';
  document.getElementById('setting-series-category').value = '娃娃';
  document.getElementById('setting-series-name').value = '';
  document.getElementById('setting-series-emoji').value = '🧸';
  document.getElementById('btn-setting-cancel-series').style.display = 'none';
}

async function saveSettingSeries() {
  const id = document.getElementById('setting-series-id').value;
  const category = document.getElementById('setting-series-category').value;
  const name = document.getElementById('setting-series-name').value.trim();
  const emoji = document.getElementById('setting-series-emoji').value.trim() || '📦';
  
  if (!name) {
    alert('請填寫系列名稱！');
    return;
  }
  
  const allSeries = CollectionStorage.getAllSeries();

  const isEdit = !!id;
  const confirmMsg = isEdit ? `是否修改此系列「${name}」？` : `是否新增此系列「${name}」？`;
  const isConfirmed = await showConfirmDialog(confirmMsg, isEdit ? '確認修改' : '確認新增');
  if (!isConfirmed) return;
  
  if (id) {
    // 編輯模式
    if (allSeries.some(s => s.id !== id && s.category === category && s.name.toLowerCase() === name.toLowerCase())) {
      alert('❌ 該分類下已存在同名系列！');
      return;
    }
    const oldSeries = CollectionStorage.getSeriesById(id);
    if (oldSeries) {
      const oldName = oldSeries.name;
      if (oldName !== name) {
        // 同步更換所有已使用該系列的收藏品
        const allItems = CollectionStorage.getAll();
        allItems.forEach(item => {
          if (item.series === oldName) {
            item.series = name;
          }
        });
        CollectionStorage.save(allItems);
        const groups = CollectionStorage.getAllGroups();
        const group = groups.find(g => g.name === oldName);
        if (group) { group.name = name; CollectionStorage.saveGroups(groups); }
      }
      CollectionStorage.updateSeries(id, { category, name, emoji });
      showToast(`✏️ 系列「${name}」修改成功！`);
    }
  } else {
    // 新建模式
    if (allSeries.some(s => s.category === category && s.name.toLowerCase() === name.toLowerCase())) {
      alert('❌ 該分類下已存在同名系列！');
      return;
    }
    CollectionStorage.addSeries({
      id: 'series-' + Date.now(),
      category,
      name,
      emoji
    });
    showToast(`🎉 系列「${name}」新增成功！`);
  }
  
  cancelEditSettingSeries();
  renderSettingSeriesList();
  renderSettingGroupsList();
  refreshAppSeriesData();
  if (currentView === 'series') {
    renderSeriesPage(currentSeries);
  }
}

async function deleteSettingSeries(id) {
  const s = CollectionStorage.getSeriesById(id);
  if (!s) return;
  
  const allItems = CollectionStorage.getAll();
  const hasItems = allItems.some(item => item.series === s.name);
  if (hasItems) {
    alert(`❌ 禁止刪除！\n\n「${s.name}」系列中仍有收藏。請先移動或刪除該系列的收藏品。`);
    return;
  }
  
  const isConfirmed = await showConfirmDialog(`⚠️ 是否確定刪除系列「${s.name}」？此動作將無法復原。`, '確定刪除', '取消', true);
  if (isConfirmed) {
    CollectionStorage.deleteSeries(id);
    showToast(`🗑️ 系列「${s.name}」已成功刪除！`);
    renderSettingSeriesList();
    refreshAppSeriesData();
    if (currentSeries === id) {
      switchView('dashboard');
    }
  }
}

/**
 * A-2. 國家管理 (旅遊模組)
 */
function renderSettingCountriesList() {
  const countries = CollectionStorage.getAllCountries();
  const container = document.getElementById('setting-countries-list');
  if (!container) return;
  container.innerHTML = countries.map(c => `
    <div class="settings-list-item" data-id="${c.id}">
      <div class="settings-item-info">
        <span class="settings-item-emoji">${c.emoji || '🗺️'}</span>
        <span class="settings-item-name">${c.name}</span>
      </div>
      <div class="settings-item-actions">
        <button class="settings-action-btn edit-btn" title="編輯">🖊️</button>
        <button class="settings-action-btn delete-btn" title="刪除">🗑️</button>
      </div>
    </div>
  `).join('');
}

function startEditSettingCountry(id) {
  const c = CollectionStorage.getAllCountries().find(item => item.id === id);
  if (!c) return;
  document.getElementById('setting-country-id').value = c.id;
  document.getElementById('setting-country-emoji').value = c.emoji || '🗺️';
  document.getElementById('setting-country-name').value = c.name;
  document.getElementById('btn-setting-cancel-country').style.display = 'inline-flex';
}

function cancelEditSettingCountry() {
  document.getElementById('setting-country-id').value = '';
  document.getElementById('setting-country-emoji').value = '🗺️';
  document.getElementById('setting-country-name').value = '';
  document.getElementById('btn-setting-cancel-country').style.display = 'none';
}

async function saveSettingCountry() {
  const id = document.getElementById('setting-country-id').value;
  const emoji = document.getElementById('setting-country-emoji').value.trim() || '🗺️';
  const name = document.getElementById('setting-country-name').value.trim();
  
  if (!name) {
    alert('請填寫國家名稱！');
    return;
  }
  
  const countries = CollectionStorage.getAllCountries();

  const isEdit = !!id;
  const confirmMsg = isEdit ? `是否修改此國家「${name}」？` : `是否新增此國家「${name}」？`;
  const isConfirmed = await showConfirmDialog(confirmMsg, isEdit ? '確認修改' : '確認新增');
  if (!isConfirmed) return;
  
  if (id) {
    // 編輯模式
    if (countries.some(c => c.id !== id && c.name.toLowerCase() === name.toLowerCase())) {
      alert('❌ 國家名稱已存在！');
      return;
    }
    
    const oldCountry = countries.find(c => c.id === id);
    const oldName = oldCountry ? oldCountry.name : '';
    
    CollectionStorage.updateCountry(id, { name, emoji });
    
    // 如果修改了國家名稱，同步修改 legacy 的 series 屬性
    if (oldName && oldName !== name) {
      const allItems = CollectionStorage.getAll();
      allItems.forEach(item => {
        if (item.category === '旅遊' && item.series === oldName) {
          item.series = name;
        }
      });
      CollectionStorage.save(allItems);
    }
    
    showToast(`✏️ 國家「${name}」修改成功！`);
  } else {
    // 新增模式
    if (countries.some(c => c.name.toLowerCase() === name.toLowerCase())) {
      alert('❌ 國家名稱已存在！');
      return;
    }
    
    CollectionStorage.addCountry({
      id: 'country-' + Date.now(),
      name,
      emoji
    });
    
    showToast(`🎉 國家「${name}」新增成功！`);
  }
  
  cancelEditSettingCountry();
  renderSettingCountriesList();
  refreshAppSeriesData();
}

async function deleteSettingCountry(id) {
  const countries = CollectionStorage.getAllCountries();
  const country = countries.find(c => c.id === id);
  if (!country) return;
  
  // 檢查是否已有旅程隸屬此國家
  const hasTrips = CollectionStorage.getAllTrips().some(t => t.countryId === id);
  if (hasTrips) {
    alert(`❌ 禁止刪除！\n\n「${country.name}」底下仍有旅程規劃。請先刪除該國家的旅程。`);
    return;
  }
  
  const isConfirmed = await showConfirmDialog(`⚠️ 是否確定刪除國家「${country.name}」？此動作將無法復原。`, '確定刪除', '取消', true);
  if (isConfirmed) {
    CollectionStorage.deleteCountry(id);
    showToast(`🗑️ 國家「${country.name}」已成功刪除！`);
    renderSettingCountriesList();
    refreshAppSeriesData();
  }
}

/**
 * B. 標籤管理
 */
function renderSettingTagsList() {
  const tags = CollectionStorage.getAllTags();
  const container = document.getElementById('setting-tags-list');
  if (!container) return;
  container.innerHTML = tags.map(tag => `
    <div class="settings-list-item" data-tag="${tag}">
      <div class="settings-item-info">
        <span class="settings-item-emoji">🏷️</span>
        <span class="settings-item-name">${tag}</span>
      </div>
      <div class="settings-item-actions">
        <button class="settings-action-btn edit-btn" title="編輯">🖊️</button>
        <button class="settings-action-btn delete-btn" title="刪除">🗑️</button>
      </div>
    </div>
  `).join('');
}

function startEditSettingTag(tag) {
  document.getElementById('setting-tag-old-name').value = tag;
  document.getElementById('setting-tag-name').value = tag;
  document.getElementById('btn-setting-cancel-tag').style.display = 'inline-flex';
}

function cancelEditSettingTag() {
  document.getElementById('setting-tag-old-name').value = '';
  document.getElementById('setting-tag-name').value = '';
  document.getElementById('btn-setting-cancel-tag').style.display = 'none';
}

async function saveSettingTag() {
  const oldName = document.getElementById('setting-tag-old-name').value;
  let newName = document.getElementById('setting-tag-name').value.trim();
  
  if (!newName) {
    alert('請填寫標籤名稱！');
    return;
  }
  
  if (!newName.startsWith('#')) {
    newName = '#' + newName;
  }
  
  const tags = CollectionStorage.getAllTags();

  const isEdit = !!oldName;
  const confirmMsg = isEdit ? `是否修改此標籤「${newName}」？` : `是否新增此標籤「${newName}」？`;
  const isConfirmed = await showConfirmDialog(confirmMsg, isEdit ? '確認修改' : '確認新增');
  if (!isConfirmed) return;
  
  if (oldName) {
    // 編輯模式
    if (oldName === newName) {
      cancelEditSettingTag();
      return;
    }
    if (tags.some(t => t !== oldName && t.toLowerCase() === newName.toLowerCase())) {
      alert('❌ 標籤已存在！');
      return;
    }
    
    // 更新全域標籤陣列
    const updatedTags = tags.map(t => t === oldName ? newName : t);
    CollectionStorage.saveTags(updatedTags);
    
    // 同步修改所有已套用此標籤的收藏品
    const allItems = CollectionStorage.getAll();
    allItems.forEach(item => {
      if (item.tags && item.tags.includes(oldName)) {
        item.tags = item.tags.map(t => t === oldName ? newName : t);
      }
    });
    CollectionStorage.save(allItems);
    showToast(`✏️ 標籤「${newName}」修改成功！`);
  } else {
    // 新建模式
    if (tags.some(t => t.toLowerCase() === newName.toLowerCase())) {
      alert('❌ 標籤已存在！');
      return;
    }
    tags.push(newName);
    CollectionStorage.saveTags(tags);
    showToast(`🎉 標籤「${newName}」新增成功！`);
  }
  
  cancelEditSettingTag();
  renderSettingTagsList();
  if (currentView === 'series') {
    renderSeriesPage(currentSeries);
  }
}

async function deleteSettingTag(tag) {
  const isConfirmed = await showConfirmDialog(
    `⚠️ 是否確定刪除標籤「${tag}」？\n\n此操作將會從所有已套用的收藏品中移除此標籤！此動作無法復原。`,
    '確定刪除',
    '取消',
    true
  );

  if (isConfirmed) {
    const tags = CollectionStorage.getAllTags();
    CollectionStorage.saveTags(tags.filter(t => t !== tag));

    // 從收藏品中移除
    const allItems = CollectionStorage.getAll();
    allItems.forEach(item => {
      if (item.tags) {
        item.tags = item.tags.filter(t => t !== tag);
      }
    });

    CollectionStorage.save(allItems);

    showToast(`🗑️ 標籤「${tag}」已成功刪除！`);

    renderSettingTagsList();
    populateFilterSelects();
    updateDashboardStats();

    // 如果當前正在看此標籤，跳回 Dashboard
    const cleanTag = tag.replace('#', '');

    if (currentSeries === 'tag-' + cleanTag) {
      switchView('dashboard');
    } else if (currentView === 'series') {
      renderSeriesPage(currentSeries);
    }
  }
}

/**
 * C. 來源管道管理
 */
function renderSettingSourcesList() {
  const sources = CollectionStorage.getAllSources();
  const container = document.getElementById('setting-sources-list');
  if (!container) return;
  container.innerHTML = sources.map(source => `
    <div class="settings-list-item" data-source="${source}">
      <div class="settings-item-info">
        <span class="settings-item-emoji">🏪</span>
        <span class="settings-item-name">${source}</span>
      </div>
      <div class="settings-item-actions">
        <button class="settings-action-btn edit-btn" title="編輯">🖊️</button>
        <button class="settings-action-btn delete-btn" title="刪除">🗑️</button>
      </div>
    </div>
  `).join('');
}

function startEditSettingSource(source) {
  document.getElementById('setting-source-old-name').value = source;
  document.getElementById('setting-source-name').value = source;
  document.getElementById('btn-setting-cancel-source').style.display = 'inline-flex';
}

function cancelEditSettingSource() {
  document.getElementById('setting-source-old-name').value = '';
  document.getElementById('setting-source-name').value = '';
  document.getElementById('btn-setting-cancel-source').style.display = 'none';
}

async function saveSettingSource() {
  const oldName = document.getElementById('setting-source-old-name').value;
  const newName = document.getElementById('setting-source-name').value.trim();
  
  if (!newName) {
    alert('請填寫來源管道名稱！');
    return;
  }
  
  const sources = CollectionStorage.getAllSources();

  const isEdit = !!oldName;
  const confirmMsg = isEdit ? `是否修改此來源管道「${newName}」？` : `是否新增此來源管道「${newName}」？`;
  const isConfirmed = await showConfirmDialog(confirmMsg, isEdit ? '確認修改' : '確認新增');
  if (!isConfirmed) return;
  
  if (oldName) {
    // 編輯模式
    if (oldName === newName) {
      cancelEditSettingSource();
      return;
    }
    if (sources.some(s => s !== oldName && s.toLowerCase() === newName.toLowerCase())) {
      alert('❌ 來源管道已存在！');
      return;
    }
    
    const updated = sources.map(s => s === oldName ? newName : s);
    CollectionStorage.saveSources(updated);
    
    // 同步修改所有套用該來源的項目
    const allItems = CollectionStorage.getAll();
    allItems.forEach(item => {
      if (item.source === oldName) {
        item.source = newName;
      }
    });
    CollectionStorage.save(allItems);
    showToast(`✏️ 來源管道「${newName}」修改成功！`);
  } else {
    // 新建模式
    if (sources.some(s => s.toLowerCase() === newName.toLowerCase())) {
      alert('❌ 來源管道已存在！');
      return;
    }
    sources.push(newName);
    CollectionStorage.saveSources(sources);
    showToast(`🎉 來源管道「${newName}」新增成功！`);
  }
  
  cancelEditSettingSource();
  renderSettingSourcesList();
  populateFormSourceSelect();
  if (currentView === 'series') {
    renderSeriesPage(currentSeries);
  }
}

async function deleteSettingSource(source) {
  const allItems = CollectionStorage.getAll();
  const hasItems = allItems.some(item => item.source === source);
  if (hasItems) {
    alert(`❌ 禁止刪除！\n\n有收藏品正套用「${source}」管道，無法直接刪除。請先將收藏品更換為其他管道。`);
    return;
  }
  
  const isConfirmed = await showConfirmDialog(`⚠️ 是否確定刪除來源管道「${source}」？`, '確定刪除', '取消', true);
  if (isConfirmed) {
    const sources = CollectionStorage.getAllSources();
    CollectionStorage.saveSources(sources.filter(s => s !== source));
    showToast(`🗑️ 來源管道「${source}」已成功刪除！`);
    renderSettingSourcesList();
    populateFormSourceSelect();
  }
}

/**
 * D. 幣別管理
 */
function renderSettingCurrenciesList() {
  const currencies = CollectionStorage.getAllCurrencies();
  const container = document.getElementById('setting-currencies-list');
  if (!container) return;
  container.innerHTML = currencies.map(c => {
    const isEnabled = c.enabled !== false;
    const currencyName = String(c.name || '').trim();
    const code = String(c.code || '').trim();

    const displayName = currencyName.toUpperCase().startsWith(code.toUpperCase())
      ? currencyName
      : `${code}（${currencyName}）`;
    return `
      <div class="settings-list-item" data-code="${c.code}">
        <div class="settings-item-info">
          <span class="settings-item-emoji">🪙</span>
          <span class="settings-item-name">${displayName} (${c.symbol})</span>
          <span class="settings-item-badge ${isEnabled ? '' : 'disabled'}">${isEnabled ? '啟用中' : '已停用'}</span>
        </div>
        <div class="settings-item-actions">
          <button class="settings-action-btn edit-btn" title="編輯">🖊️</button>
          <button class="settings-action-btn toggle-btn ${isEnabled ? '' : 'off'}" title="${isEnabled ? '停用' : '啟用'}">
            ${isEnabled ? '⏸️' : '▶️'}
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function startEditSettingCurrency(code) {
  const currencies = CollectionStorage.getAllCurrencies();
  const c = currencies.find(curr => curr.code === code);
  if (!c) return;
  
  document.getElementById('setting-currency-is-edit').value = 'true';
  const codeInput = document.getElementById('setting-currency-code');
  codeInput.value = c.code;
  codeInput.disabled = true;
  document.getElementById('setting-currency-symbol').value = c.symbol;
  document.getElementById('setting-currency-name').value = c.name;
  document.getElementById('btn-setting-cancel-currency').style.display = 'inline-flex';
}

function cancelEditSettingCurrency() {
  document.getElementById('setting-currency-is-edit').value = 'false';
  const codeInput = document.getElementById('setting-currency-code');
  codeInput.value = '';
  codeInput.disabled = false;
  document.getElementById('setting-currency-symbol').value = '';
  document.getElementById('setting-currency-name').value = '';
  document.getElementById('btn-setting-cancel-currency').style.display = 'none';
}

async function saveSettingCurrency() {
  const isEdit = document.getElementById('setting-currency-is-edit').value === 'true';
  const code = document.getElementById('setting-currency-code').value.trim().toUpperCase();
  const symbol = document.getElementById('setting-currency-symbol').value.trim();
  const name = document.getElementById('setting-currency-name').value.trim();
  
  if (!code || !symbol || !name) {
    alert('請完整填寫幣別的所有欄位！');
    return;
  }
  
  const currencies = CollectionStorage.getAllCurrencies();

  const confirmMsg = isEdit ? `是否修改此幣別「${name}」？` : `是否新增此幣別「${name}」？`;
  const isConfirmed = await showConfirmDialog(confirmMsg, isEdit ? '確認修改' : '確認新增');
  if (!isConfirmed) return;
  
  if (isEdit) {
    const updated = currencies.map(c => c.code === code ? { ...c, symbol, name } : c);
    CollectionStorage.saveCurrencies(updated);
    showToast(`✏️ 幣別「${name}」修改成功！`);
  } else {
    if (currencies.some(c => c.code === code)) {
      alert(`❌ 幣別代碼 ${code} 已存在！`);
      return;
    }
    currencies.push({ code, symbol, name, enabled: true });
    CollectionStorage.saveCurrencies(currencies);
    showToast(`🎉 幣別「${name}」新增成功！`);
  }
  
  cancelEditSettingCurrency();
  renderSettingCurrenciesList();
  populateCurrencySelects();
  updateDashboardStats();
  if (currentView === 'series') {
    renderSeriesPage(currentSeries);
  }
}

async function toggleSettingCurrency(code) {
  const currencies = CollectionStorage.getAllCurrencies();
  const c = currencies.find(curr => curr.code === code);
  if (!c) return;
  
  const isCurrentlyEnabled = c.enabled !== false;
  
  if (isCurrentlyEnabled) {
    // 停用前檢查是否有任何項目在使用此幣別
    const allItems = CollectionStorage.getAll();
    const isUsed = allItems.some(item => item.currency === code);
    if (isUsed) {
      alert(`❌ 無法停用幣別！\n\n有收藏品正使用「${code}」此幣別，若要停用，請先更換那些收藏品的幣別。`);
      return;
    }
    
    const isConfirmed = await showConfirmDialog(`⚠️ 是否確定停用幣別「${c.name}」？`, '確定停用', '取消');
    if (!isConfirmed) return;
    
    c.enabled = false;
    showToast(`⏸️ 幣別「${c.name}」已停用`);
  } else {
    const isConfirmed = await showConfirmDialog(`是否確定啟用幣別「${c.name}」？`, '確定啟用', '取消');
    if (!isConfirmed) return;
    
    c.enabled = true;
    showToast(`▶️ 幣別「${c.name}」已啟用`);
  }
  
  CollectionStorage.saveCurrencies(currencies);
  renderSettingCurrenciesList();
  populateCurrencySelects();
  updateDashboardStats();
  if (currentView === 'series') {
    renderSeriesPage(currentSeries);
  }
}

/**
 * 註冊全新設定頁面的互動監聽事件
 */
function setupSettingsEventListeners() {
  // 國家管理事件
const btnSaveCountry = document.getElementById('btn-setting-save-country');
if (btnSaveCountry) {
  btnSaveCountry.addEventListener('click', saveSettingCountry);
}

const btnCancelCountry = document.getElementById('btn-setting-cancel-country');
if (btnCancelCountry) {
  btnCancelCountry.addEventListener('click', cancelEditSettingCountry);
}

const countriesListContainer = document.getElementById('setting-countries-list');
if (countriesListContainer) {
  countriesListContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.settings-action-btn');
    if (!btn) return;

    const itemEl = btn.closest('.settings-list-item');
    if (!itemEl) return;

    const id = itemEl.getAttribute('data-id');

    if (btn.classList.contains('edit-btn')) {
      startEditSettingCountry(id);
    } else if (btn.classList.contains('delete-btn')) {
      deleteSettingCountry(id);
    }
  });
}
  
  // 系列管理事件
  const btnSaveSeries = document.getElementById('btn-setting-save-series');
  if (btnSaveSeries) btnSaveSeries.addEventListener('click', saveSettingSeries);
  const btnCancelSeries = document.getElementById('btn-setting-cancel-series');
  if (btnCancelSeries) btnCancelSeries.addEventListener('click', cancelEditSettingSeries);
  
  const seriesListContainer = document.getElementById('setting-series-list');
  if (seriesListContainer) {
    seriesListContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.settings-action-btn');
      if (!btn) return;
      const itemEl = btn.closest('.settings-list-item');
      if (!itemEl) return;
      const id = itemEl.getAttribute('data-id');
      if (btn.classList.contains('edit-btn')) {
        startEditSettingSeries(id);
      } else if (btn.classList.contains('delete-btn')) {
        deleteSettingSeries(id);
      }
    });
  }

  // 周邊團體與成員事件
  const groupSelect = document.getElementById('setting-group-select');
  if (groupSelect) groupSelect.addEventListener('change', renderSettingGroupsList);
  const btnAddMember = document.getElementById('btn-setting-add-member');
  if (btnAddMember) btnAddMember.addEventListener('click', addSettingMember);
  const memberNameInput = document.getElementById('setting-member-name');
  if (memberNameInput) memberNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSettingMember();
    }
  });
  const membersList = document.getElementById('setting-members-list');
  if (membersList) {
    membersList.addEventListener('click', (e) => {
      const btn = e.target.closest('.delete-member-btn');
      if (!btn) return;
      const member = btn.closest('.settings-list-item')?.getAttribute('data-member');
      const groupName = document.getElementById('setting-group-select')?.value;
      if (groupName && member) deleteSettingMember(groupName, member);
    });
  }

  // 標籤管理事件
  const btnSaveTag = document.getElementById('btn-setting-save-tag');
  if (btnSaveTag) btnSaveTag.addEventListener('click', saveSettingTag);
  const btnCancelTag = document.getElementById('btn-setting-cancel-tag');
  if (btnCancelTag) btnCancelTag.addEventListener('click', cancelEditSettingTag);
  
  const tagsListContainer = document.getElementById('setting-tags-list');
  if (tagsListContainer) {
    tagsListContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.settings-action-btn');
      if (!btn) return;
      const itemEl = btn.closest('.settings-list-item');
      if (!itemEl) return;
      const tag = itemEl.getAttribute('data-tag');
      if (btn.classList.contains('edit-btn')) {
        startEditSettingTag(tag);
      } else if (btn.classList.contains('delete-btn')) {
        deleteSettingTag(tag);
      }
    });
  }

  // 來源管道管理事件
  const btnSaveSource = document.getElementById('btn-setting-save-source');
  if (btnSaveSource) btnSaveSource.addEventListener('click', saveSettingSource);
  const btnCancelSource = document.getElementById('btn-setting-cancel-source');
  if (btnCancelSource) btnCancelSource.addEventListener('click', cancelEditSettingSource);
  
  const sourcesListContainer = document.getElementById('setting-sources-list');
  if (sourcesListContainer) {
    sourcesListContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.settings-action-btn');
      if (!btn) return;
      const itemEl = btn.closest('.settings-list-item');
      if (!itemEl) return;
      const source = itemEl.getAttribute('data-source');
      if (btn.classList.contains('edit-btn')) {
        startEditSettingSource(source);
      } else if (btn.classList.contains('delete-btn')) {
        deleteSettingSource(source);
      }
    });
  }

  // 幣別管理事件
  const btnSaveCurrency = document.getElementById('btn-setting-save-currency');
  if (btnSaveCurrency) btnSaveCurrency.addEventListener('click', saveSettingCurrency);
  const btnCancelCurrency = document.getElementById('btn-setting-cancel-currency');
  if (btnCancelCurrency) btnCancelCurrency.addEventListener('click', cancelEditSettingCurrency);
  
  const currenciesListContainer = document.getElementById('setting-currencies-list');
  if (currenciesListContainer) {
    currenciesListContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('.settings-action-btn');
      if (!btn) return;
      const itemEl = btn.closest('.settings-list-item');
      if (!itemEl) return;
      const code = itemEl.getAttribute('data-code');
      if (btn.classList.contains('edit-btn')) {
        startEditSettingCurrency(code);
      } else if (btn.classList.contains('toggle-btn')) {
        toggleSettingCurrency(code);
      }
    });
  }

  // 旅程管理事件 (設定頁面)
  const btnSettingAddTrip = document.getElementById('btn-setting-add-trip');
  if (btnSettingAddTrip) {
    btnSettingAddTrip.addEventListener('click', () => {
      openTripFormDrawer(null);
    });
  }

  // 付款方式管理事件
  const btnSavePaymentMethod = document.getElementById('btn-setting-save-payment-method');
  if (btnSavePaymentMethod) btnSavePaymentMethod.addEventListener('click', saveSettingPaymentMethod);
  const btnCancelPaymentMethod = document.getElementById('btn-setting-cancel-payment-method');
  if (btnCancelPaymentMethod) btnCancelPaymentMethod.addEventListener('click', cancelEditSettingPaymentMethod);

  // 付款工具管理事件
  const btnSavePaymentTool = document.getElementById('btn-setting-save-payment-tool');
  if (btnSavePaymentTool) btnSavePaymentTool.addEventListener('click', saveSettingPaymentTool);
  const btnCancelPaymentTool = document.getElementById('btn-setting-cancel-payment-tool');
  if (btnCancelPaymentTool) btnCancelPaymentTool.addEventListener('click', cancelEditSettingPaymentTool);
}

// 供行內 onclick="openDetailDrawer('item-id')" 呼叫之全域函數
window.openDetailDrawer = function(id) {
  const item = CollectionStorage.getById(id);
  if (item) {
    openDrawer(item);
  }
};

/**
 * 渲染系統設定中的旅程清單
 */
function renderSettingTripsList() {
  const trips = CollectionStorage.getAllTrips();
  const countries = CollectionStorage.getAllCountries();
  const container = document.getElementById('setting-trips-list');
  if (!container) return;

  if (trips.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 16px; font-size: var(--fs-xs);">暫無旅程紀錄，請點選上方按鈕新增。</div>`;
    return;
  }

  const allItems = CollectionStorage.getAll();

  container.innerHTML = trips.map(t => {
    const country = countries.find(c => c.id === t.countryId);
    const countryName = country ? `${country.emoji || '🗺️'} ${country.name}` : '未指定國家';
    return `
      <div class="settings-list-item" data-trip-id="${t.id}">
        <div class="settings-item-info">
          <span class="settings-item-emoji">✈️</span>
          <div style="display: flex; flex-direction: column; gap: 2px;">
            <span class="settings-item-name" style="font-weight: 600; font-size: var(--fs-sm);">${t.name}</span>
            <span class="settings-item-subtext" style="font-size: 11px; color: var(--text-muted);">${countryName} | ${t.startDate} ~ ${t.endDate}</span>
          </div>
        </div>
        <div class="settings-item-actions">
          <button class="settings-action-btn edit-trip-btn" title="編輯旅程">🖊️</button>
          <button class="settings-action-btn delete-trip-btn" title="刪除旅程" style="color: var(--text-danger);">🗑️</button>
        </div>
      </div>
    `;
  }).join('');

  // 綁定編輯與刪除事件
  container.querySelectorAll('.edit-trip-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const itemEl = e.target.closest('.settings-list-item');
      const tripId = itemEl.getAttribute('data-trip-id');
      openTripFormDrawer(tripId);
    });
  });

  container.querySelectorAll('.delete-trip-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const itemEl = e.target.closest('.settings-list-item');
      const tripId = itemEl.getAttribute('data-trip-id');
      const isConfirmed = await showConfirmDialog('確定要刪除此旅程嗎？\n\n刪除後，該旅程底下的紀念品將失去所屬旅程，但紀念品本身不會被刪除！', '確定刪除', '取消', true);
      if (isConfirmed) {
        CollectionStorage.deleteTrip(tripId);
        renderSettingTripsList();
        renderSidebarSeries();
        showToast('🗑️ 旅程已成功刪除！');
        if (currentView === 'trip' && currentTrip === tripId) {
          switchView('dashboard');
        }
      }
    });
  });
}

/**
 * 渲染付款方式管理清單
 */
function renderSettingPaymentMethodsList() {
  const methods = CollectionStorage.getAllPaymentMethods();
  const container = document.getElementById('setting-payment-payment-methods-list');
  if (!container) return;

  if (methods.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 12px; font-size: var(--fs-xs);">暫無付款方式資料</div>`;
    return;
  }

  container.innerHTML = methods.map((m, index) => {
    return `
      <div class="settings-list-item" data-index="${index}" data-name="${m}">
        <div class="settings-item-info">
          <span class="settings-item-emoji">💳</span>
          <span class="settings-item-name">${m}</span>
        </div>
        <div class="settings-item-actions">
          <button class="settings-action-btn edit-method-btn" title="編輯">🖊️</button>
          <button class="settings-action-btn delete-method-btn" title="刪除" style="color: var(--text-danger);">🗑️</button>
        </div>
      </div>
    `;
  }).join('');

  // 綁定編輯與刪除事件
  container.querySelectorAll('.edit-method-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const itemEl = e.target.closest('.settings-list-item');
      const name = itemEl.getAttribute('data-name');
      startEditSettingPaymentMethod(name);
    });
  });

  container.querySelectorAll('.delete-method-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const itemEl = e.target.closest('.settings-list-item');
      const name = itemEl.getAttribute('data-name');
      const isConfirmed = await showConfirmDialog(`確定要刪除付款方式「${name}」嗎？`, '確定刪除', '取消', true);
      if (isConfirmed) {
        let currentMethods = CollectionStorage.getAllPaymentMethods();
        currentMethods = currentMethods.filter(m => m !== name);
        CollectionStorage.savePaymentMethods(currentMethods);
        renderSettingPaymentMethodsList();
        populatePaymentSelects();
        showToast('🗑️ 付款方式已刪除！');
      }
    });
  });
}

function startEditSettingPaymentMethod(name) {
  document.getElementById('setting-payment-method-old-name').value = name;
  document.getElementById('setting-payment-method-name').value = name;
  document.getElementById('btn-setting-cancel-payment-method').style.display = 'inline-flex';
  
  // 滾動並聚焦
  const input = document.getElementById('setting-payment-method-name');
  if (input) {
    input.focus();
    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function cancelEditSettingPaymentMethod() {
  document.getElementById('setting-payment-method-old-name').value = '';
  document.getElementById('setting-payment-method-name').value = '';
  document.getElementById('btn-setting-cancel-payment-method').style.display = 'none';
}

function saveSettingPaymentMethod() {
  const oldName = document.getElementById('setting-payment-method-old-name').value;
  const newName = document.getElementById('setting-payment-method-name').value.trim();
  if (!newName) {
    alert('請輸入付款方式名稱！');
    return;
  }

  let methods = CollectionStorage.getAllPaymentMethods();
  if (oldName) {
    // 編輯
    const index = methods.indexOf(oldName);
    if (index !== -1) {
      methods[index] = newName;
    }
  } else {
    // 新增
    if (methods.includes(newName)) {
      alert('已存在同名的付款方式！');
      return;
    }
    methods.push(newName);
  }

  CollectionStorage.savePaymentMethods(methods);
  cancelEditSettingPaymentMethod();
  renderSettingPaymentMethodsList();
  populatePaymentSelects();
  showToast('💾 付款方式已儲存！');
}

/**
 * 渲染付款工具管理清單
 */
function renderSettingPaymentToolsList() {
  const tools = CollectionStorage.getAllPaymentTools();
  const container = document.getElementById('setting-payment-payment-tools-list');
  if (!container) return;

  if (tools.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: var(--text-muted); padding: 12px; font-size: var(--fs-xs);">暫無付款工具資料</div>`;
    return;
  }

  container.innerHTML = tools.map((t, index) => {
    return `
      <div class="settings-list-item" data-index="${index}" data-name="${t}">
        <div class="settings-item-info">
          <span class="settings-item-emoji">🏦</span>
          <span class="settings-item-name">${t}</span>
        </div>
        <div class="settings-item-actions">
          <button class="settings-action-btn edit-tool-btn" title="編輯">🖊️</button>
          <button class="settings-action-btn delete-tool-btn" title="刪除" style="color: var(--text-danger);">🗑️</button>
        </div>
      </div>
    `;
  }).join('');

  // 綁定編輯與刪除事件
  container.querySelectorAll('.edit-tool-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const itemEl = e.target.closest('.settings-list-item');
      const name = itemEl.getAttribute('data-name');
      startEditSettingPaymentTool(name);
    });
  });

  container.querySelectorAll('.delete-tool-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const itemEl = e.target.closest('.settings-list-item');
      const name = itemEl.getAttribute('data-name');
      const isConfirmed = await showConfirmDialog(`確定要刪除付款工具「${name}」嗎？`, '確定刪除', '取消', true);
      if (isConfirmed) {
        let currentTools = CollectionStorage.getAllPaymentTools();
        currentTools = currentTools.filter(t => t !== name);
        CollectionStorage.savePaymentTools(currentTools);
        renderSettingPaymentToolsList();
        populatePaymentSelects();
        showToast('🗑️ 付款工具已刪除！');
      }
    });
  });
}

function startEditSettingPaymentTool(name) {
  document.getElementById('setting-payment-tool-old-name').value = name;
  document.getElementById('setting-payment-tool-name').value = name;
  document.getElementById('btn-setting-cancel-payment-tool').style.display = 'inline-flex';
  
  // 滾動並聚焦
  const input = document.getElementById('setting-payment-tool-name');
  if (input) {
    input.focus();
    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function cancelEditSettingPaymentTool() {
  document.getElementById('setting-payment-tool-old-name').value = '';
  document.getElementById('setting-payment-tool-name').value = '';
  document.getElementById('btn-setting-cancel-payment-tool').style.display = 'none';
}

function saveSettingPaymentTool() {
  const oldName = document.getElementById('setting-payment-tool-old-name').value;
  const newName = document.getElementById('setting-payment-tool-name').value.trim();
  if (!newName) {
    alert('請輸入付款工具名稱！');
    return;
  }

  let tools = CollectionStorage.getAllPaymentTools();
  if (oldName) {
    // 編輯
    const index = tools.indexOf(oldName);
    if (index !== -1) {
      tools[index] = newName;
    }
  } else {
    // 新增
    if (tools.includes(newName)) {
      alert('已存在同名的付款工具！');
      return;
    }
    tools.push(newName);
  }

  CollectionStorage.savePaymentTools(tools);
  cancelEditSettingPaymentTool();
  renderSettingPaymentToolsList();
  populatePaymentSelects();
  showToast('💾 付款工具已儲存！');
}

