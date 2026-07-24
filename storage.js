/**
 * Collection Book - storage.js
 * 
 * LocalStorage 資料管理模組
 * 負責資料的讀取、儲存、更新與刪除。
 */

const STORAGE_KEY = 'collection_items';
const SERIES_STORAGE_KEY = 'collection_series';
const TAGS_STORAGE_KEY = 'collection_tags';
const SOURCES_STORAGE_KEY = 'collection_sources';
const CURRENCIES_STORAGE_KEY = 'collection_currencies';
const GROUPS_STORAGE_KEY = 'collection_groups';

let initializing = false;

const CollectionStorage = {
  /**
   * 初始化 LocalStorage 資料
   * 如果本地沒有資料，則載入 data.js 的預設假資料
   */
  init() {
    if (initializing) return;
    initializing = true;
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        console.log('正在將預設資料儲存至 LocalStorage...');
        this.save(DEFAULT_COLLECTION_DATA);
      } else {
        console.log('已從 LocalStorage 讀取到現有收藏資料。');
      }

      if (!localStorage.getItem(SERIES_STORAGE_KEY)) {
        console.log('正在將預設系列資料儲存至 LocalStorage...');
        this.saveSeries(DEFAULT_SERIES_DATA);
      } else {
        console.log('已從 LocalStorage 讀取到現有系列資料。');
      }

      // 初始化／修復國家資料，確保切換測試版本後不會留下空陣列
      let storedCountries = [];
      try {
        storedCountries = JSON.parse(localStorage.getItem('collection_countries') || '[]');
      } catch (e) {
        storedCountries = [];
      }
      if (!Array.isArray(storedCountries) || storedCountries.length === 0) {
        console.log('正在初始化或修復國家資料...');
        const seriesList = this.getAllSeries();
        const travelSeries = seriesList.filter(s => s.category === '旅遊');
        const countries = travelSeries.map(s => ({
          id: s.id,
          name: s.name,
          emoji: s.emoji || '✈️'
        }));
        if (countries.length === 0) {
          countries.push(
            { id: 'japan', name: '日本', emoji: '🇯🇵' },
            { id: 'korea', name: '韓國', emoji: '🇰🇷' },
            { id: 'hongkong', name: '香港', emoji: '🇭🇰' }
          );
        }
        localStorage.setItem('collection_countries', JSON.stringify(countries));
      }

      if (!localStorage.getItem('collection_trips')) {
        console.log('正在初始化旅程資料...');
        const countriesStr = localStorage.getItem('collection_countries');
        const countries = JSON.parse(countriesStr) || [];
        
        const trips = [];
        const allItems = this.getAll();
        
        countries.forEach(c => {
          const tripId = `trip-${c.id}`;
          trips.push({
            id: tripId,
            name: `${c.name}之旅`,
            countryId: c.id,
            startDate: '2026-07-01',
            endDate: '2026-07-15',
            cities: c.name === '日本' ? ['東京', '京都'] : (c.name === '韓國' ? ['首爾'] : ['香港']),
            accommodation: '極簡設計飯店',
            companions: '家人',
            note: '預設旅程',
            coverImage: ''
          });
          
          // 舊資料相容：將原本 series 等於 c.name 或 c.id 的旅遊類收藏更新為新建立的旅程 ID
          allItems.forEach(item => {
            if (item.category === '旅遊' && (item.series === c.name || item.series === c.id)) {
              item.series = tripId;
              item.purchaseLocation = item.source || '當地商店';
              item.shopName = '';
              item.city = c.name === '日本' ? '東京' : (c.name === '韓國' ? '首爾' : '香港');
            }
          });
        });
        
        localStorage.setItem('collection_trips', JSON.stringify(trips));
        this.save(allItems);
      }

      // 移除原本 series 裡面 category 為旅遊的資料，使系列管理只負責娃娃與周邊
      if (localStorage.getItem(SERIES_STORAGE_KEY)) {
        try {
          const series = JSON.parse(localStorage.getItem(SERIES_STORAGE_KEY)) || [];
          if (series.some(s => s.category === '旅遊')) {
            const filtered = series.filter(s => s.category !== '旅遊');
            localStorage.setItem(SERIES_STORAGE_KEY, JSON.stringify(filtered));
          }
        } catch (e) {
          console.error(e);
        }
      }

      if (!localStorage.getItem(TAGS_STORAGE_KEY)) {
        console.log('正在將預設標籤資料儲存至 LocalStorage...');
        let items = [];
        try {
          const dataStr = localStorage.getItem(STORAGE_KEY);
          items = JSON.parse(dataStr) || DEFAULT_COLLECTION_DATA;
        } catch (e) {
          items = DEFAULT_COLLECTION_DATA;
        }
        const tagsSet = new Set();
        items.forEach(item => {
          if (item.tags) {
            item.tags.forEach(t => tagsSet.add(t));
          }
        });
        const initialTags = Array.from(tagsSet);
        if (initialTags.length === 0) {
          initialTags.push('#限定款', '#預購款', '#絨毛玩具', '#超療癒', '#官方周邊');
        }
        this.saveTags(initialTags);
      }

      if (!localStorage.getItem(SOURCES_STORAGE_KEY)) {
        console.log('正在將預設來源資料儲存至 LocalStorage...');
        this.saveSources(['官方', '蝦皮', 'Mercari', '代購', '朋友', '其他']);
      }

      if (!localStorage.getItem(CURRENCIES_STORAGE_KEY)) {
        console.log('正在將預設幣別資料儲存至 LocalStorage...');
        this.saveCurrencies([
          { code: 'TWD', symbol: 'NT$', name: 'TWD（新台幣）', enabled: true },
          { code: 'JPY', symbol: '¥', name: 'JPY（日圓）', enabled: true },
          { code: 'KRW', symbol: '₩', name: 'KRW（韓元）', enabled: true },
          { code: 'HKD', symbol: 'HK$', name: 'HKD（港幣）', enabled: true },
          { code: 'USD', symbol: '$', name: 'USD（美元）', enabled: true },
          { code: 'EUR', symbol: '€', name: 'EUR（歐元）', enabled: true },
          { code: 'CNY', symbol: '¥', name: 'CNY（人民幣）', enabled: true }
        ]);
      }

      if (!localStorage.getItem(GROUPS_STORAGE_KEY)) {
        console.log('正在將預設團體與成員資料儲存至 LocalStorage...');
        this.saveGroups(typeof DEFAULT_GROUP_DATA !== 'undefined' ? DEFAULT_GROUP_DATA : []);
      }

      if (!localStorage.getItem('collection_payment_methods')) {
        console.log('正在將預設付款方式資料儲存至 LocalStorage...');
        this.savePaymentMethods(['現金', '信用卡', '金融卡', 'Samsung Wallet', 'Google Wallet', 'LINE Pay', '街口支付', '悠遊付', '全支付', '其他']);
      }

      if (!localStorage.getItem('collection_payment_tools')) {
        console.log('正在將預設付款工具資料儲存至 LocalStorage...');
        this.savePaymentTools(['國泰 Cube', '玉山 U Bear', '富邦 J', '永豐 DAWAY', 'Visa', 'Master', 'JCB']);
      }
    } finally {
      initializing = false;
    }
  },

  /**
   * 取得所有收藏品
   * @returns {Array} 收藏品物件陣列
   */
  getAll() {
    this.init(); // 確保已初始化
    try {
      const dataStr = localStorage.getItem(STORAGE_KEY);
      const items = JSON.parse(dataStr) || [];

      items.forEach(item => {
        // 舊資料只有 member，沒有 members
        if (
          !Array.isArray(item.members) &&
          typeof item.member === 'string' &&
          item.member.trim()
        ) {
        if (item.member === '全員') {
          item.members = ['全員'];
        } else {
          item.members = item.member
            .split(/[、,，]/)
            .map(member => member.trim())
            .filter(Boolean);
        }
      }
    });

    return items;
} catch (e) {
    console.error('解析 LocalStorage 發生錯誤，還原為預設資料', e);
    return DEFAULT_COLLECTION_DATA;
    }
},

  /**
   * 儲存/重置所有收藏品至 LocalStorage
   * @param {Array} items 完整的收藏陣列
   */
  save(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  },

  /**
   * 取得所有系列
   * @returns {Array} 系列物件陣列
   */
  getAllSeries() {
    this.init();
    try {
      const dataStr = localStorage.getItem(SERIES_STORAGE_KEY);
      return JSON.parse(dataStr) || [];
    } catch (e) {
      console.error('解析 LocalStorage 系列資料發生錯誤', e);
      return DEFAULT_SERIES_DATA;
    }
  },

  /**
   * 儲存系列資料
   * @param {Array} seriesList 完整的系列陣列
   */
  saveSeries(seriesList) {
    localStorage.setItem(SERIES_STORAGE_KEY, JSON.stringify(seriesList));
  },

  /**
   * 根據 ID 查詢特定系列項目
   * @param {string} id 系列 ID
   * @returns {object|null} 系列物件，找不到則返回 null
   */
  getSeriesById(id) {
    const seriesList = this.getAllSeries();
    return seriesList.find(s => s.id === id) || null;
  },

  /**
   * 新增一筆系列
   * @param {object} seriesItem 新增的系列物件
   * @returns {boolean} 是否新增成功
   */
  addSeries(seriesItem) {
    const seriesList = this.getAllSeries();
    if (!seriesItem.id) {
      seriesItem.id = 'series-' + Date.now();
    }
    seriesList.push(seriesItem);
    this.saveSeries(seriesList);
    return true;
  },

  /**
   * 更新特定系列
   * @param {string} id 系列 ID
   * @param {object} updatedData 欲更新的欄位與值
   * @returns {boolean} 是否更新成功
   */
  updateSeries(id, updatedData) {
    const seriesList = this.getAllSeries();
    const index = seriesList.findIndex(s => s.id === id);
    if (index === -1) return false;

    seriesList[index] = {
      ...seriesList[index],
      ...updatedData,
      id: id // 強制不被更動
    };
    this.saveSeries(seriesList);
    return true;
  },

  /**
   * 刪除特定系列
   * @param {string} id 系列 ID
   * @returns {boolean} 是否刪除成功
   */
  deleteSeries(id) {
    const seriesList = this.getAllSeries();
    const filtered = seriesList.filter(s => s.id !== id);
    if (seriesList.length === filtered.length) return false;

    this.saveSeries(filtered);
    return true;
  },

  /** 取得所有周邊團體與成員 */
  getAllGroups() {
    this.init();
    try {
      const dataStr = localStorage.getItem(GROUPS_STORAGE_KEY);
      const rawGroups = JSON.parse(dataStr || '[]');
      const groups = (Array.isArray(rawGroups) ? rawGroups : []).map((group, groupIndex) => ({
        id: group && group.id ? String(group.id) : `group-${groupIndex}-${Date.now()}`,
        name: group && group.name ? String(group.name).trim() : '',
        members: (Array.isArray(group && group.members) ? group.members : [])
          .map(member => {
            if (typeof member === 'string') return member.trim();
            if (member && typeof member === 'object') return String(member.name || member.label || member.value || '').trim();
            return '';
          })
          .filter(Boolean)
          .filter((member, index, list) => list.findIndex(x => x.toLowerCase() === member.toLowerCase()) === index)
      })).filter(group => group.name);

      // 自動把舊版 {id, name} 成員格式修正成純文字，避免 [object Object]
      if (JSON.stringify(groups) !== JSON.stringify(rawGroups)) {
        localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(groups));
      }
      return groups;
    } catch (e) {
      console.error('解析團體與成員資料發生錯誤', e);
      return typeof DEFAULT_GROUP_DATA !== 'undefined' ? DEFAULT_GROUP_DATA : [];
    }
  },

  /** 儲存所有周邊團體與成員 */
  saveGroups(groups) {
    const normalized = (Array.isArray(groups) ? groups : []).map((group, groupIndex) => ({
      id: group && group.id ? String(group.id) : `group-${groupIndex}-${Date.now()}`,
      name: group && group.name ? String(group.name).trim() : '',
      members: (Array.isArray(group && group.members) ? group.members : [])
        .map(member => typeof member === 'string' ? member.trim() : String((member && (member.name || member.label || member.value)) || '').trim())
        .filter(Boolean)
        .filter((member, index, list) => list.findIndex(x => x.toLowerCase() === member.toLowerCase()) === index)
    })).filter(group => group.name);
    localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(normalized));
  },

  /** 依團體（周邊系列）名稱取得資料；新系列會自動建立空成員清單 */
  getGroupByName(name) {
    if (!name) return null;
    const groups = this.getAllGroups();
    let group = groups.find(g => g.name === name);
    if (!group) {
      group = { id: 'group-' + Date.now(), name, members: [] };
      groups.push(group);
      this.saveGroups(groups);
    }
    return group;
  },

  /**
   * 根據 ID 查詢特定收藏品項目
   * @param {string} id 收藏品 ID
   * @returns {object|null} 收藏品物件，找不到則返回 null
   */
  getById(id) {
    const items = this.getAll();
    return items.find(item => item.id === id) || null;
  },

  /**
   * 新增一筆收藏品
   * @param {object} item 新增的收藏品資料模型
   * @returns {boolean} 是否新增成功
   */
  add(item) {
    const items = this.getAll();
    // 確保 ID 唯一性
    if (!item.id) {
      item.id = 'item-' + Date.now();
    }
    
    // 如果沒有建立時間則自動補上
    if (!item.createdDate) {
      item.createdDate = new Date().toISOString();
    }

    items.push(item);
    this.save(items);
    return true;
  },

  /**
   * 更新特定收藏品
   * @param {string} id 收藏品 ID
   * @param {object} updatedData 欲更新的欄位與值
   * @returns {boolean} 是否更新成功
   */
  update(id, updatedData) {
    const items = this.getAll();
    const index = items.findIndex(item => item.id === id);
    if (index === -1) return false;

    // 保留原本的 ID 欄位，覆蓋其他欄位
    items[index] = {
      ...items[index],
      ...updatedData,
      id: id // 強制不被更動
    };

    this.save(items);
    return true;
  },

  /**
   * 刪除特定收藏品
   * @param {string} id 收藏品 ID
   * @returns {boolean} 是否刪除成功
   */
  delete(id) {
    const items = this.getAll();
    const filteredItems = items.filter(item => item.id !== id);
    if (items.length === filteredItems.length) return false;

    this.save(filteredItems);
    return true;
  },

  /**
   * 取得所有標籤
   * @returns {Array} 標籤字串陣列
   */
  getAllTags() {
    this.init();
    try {
      const dataStr = localStorage.getItem(TAGS_STORAGE_KEY);
      return JSON.parse(dataStr) || [];
    } catch (e) {
      console.error('讀取標籤失敗', e);
      return [];
    }
  },

  /**
   * 儲存所有標籤
   * @param {Array} tags 標籤字串陣列
   */
  saveTags(tags) {
    localStorage.setItem(TAGS_STORAGE_KEY, JSON.stringify(tags));
  },

  /**
   * 取得所有來源
   * @returns {Array} 來源字串陣列
   */
  getAllSources() {
    this.init();
    try {
      const dataStr = localStorage.getItem(SOURCES_STORAGE_KEY);
      return JSON.parse(dataStr) || [];
    } catch (e) {
      console.error('讀取來源失敗', e);
      return [];
    }
  },

  /**
   * 儲存所有來源
   * @param {Array} sources 來源字串陣列
   */
  saveSources(sources) {
    localStorage.setItem(SOURCES_STORAGE_KEY, JSON.stringify(sources));
  },

  /**
   * 取得所有幣別
   * @returns {Array} 幣別物件陣列
   */
  getAllCurrencies() {
    this.init();
    try {
      const dataStr = localStorage.getItem(CURRENCIES_STORAGE_KEY);
      return JSON.parse(dataStr) || [];
    } catch (e) {
      console.error('讀取幣別失敗', e);
      return [];
    }
  },

  /**
   * 儲存所有幣別
   * @param {Array} currencies 幣別物件陣列
   */
  saveCurrencies(currencies) {
    localStorage.setItem(CURRENCIES_STORAGE_KEY, JSON.stringify(currencies));
  },

  /**
   * 取得所有國家
   */
  getAllCountries() {
    this.init();
    try {
      const dataStr = localStorage.getItem('collection_countries');
      return JSON.parse(dataStr) || [];
    } catch (e) {
      console.error('讀取國家失敗', e);
      return [];
    }
  },

  /**
   * 儲存所有國家
   */
  saveCountries(countries) {
    localStorage.setItem('collection_countries', JSON.stringify(countries));
  },

  /**
   * 新增一筆國家
   */
  addCountry(country) {
    const countries = this.getAllCountries();
    if (!country.id) {
      country.id = 'country-' + Date.now();
    }
    countries.push(country);
    this.saveCountries(countries);
    return true;
  },

  /**
   * 更新特定國家
   */
  updateCountry(id, updatedData) {
    const countries = this.getAllCountries();
    const index = countries.findIndex(c => c.id === id);
    if (index === -1) return false;
    countries[index] = {
      ...countries[index],
      ...updatedData,
      id: id
    };
    this.saveCountries(countries);
    return true;
  },

  /**
   * 刪除特定國家
   */
  deleteCountry(id) {
    const countries = this.getAllCountries();
    const filtered = countries.filter(c => c.id !== id);
    this.saveCountries(filtered);
    return true;
  },

  /**
   * 取得所有旅程
   */
  getAllTrips() {
    this.init();
    try {
      const dataStr = localStorage.getItem('collection_trips');
      return JSON.parse(dataStr) || [];
    } catch (e) {
      console.error('讀取旅程失敗', e);
      return [];
    }
  },

  /**
   * 儲存所有旅程
   */
  saveTrips(trips) {
    localStorage.setItem('collection_trips', JSON.stringify(trips));
  },

  /**
   * 新增一筆旅程
   */
  addTrip(trip) {
    const trips = this.getAllTrips();
    if (!trip.id) {
      trip.id = 'trip-' + Date.now();
    }
    trips.push(trip);
    this.saveTrips(trips);
    return true;
  },

  /**
   * 更新特定旅程
   */
  updateTrip(id, updatedData) {
    const trips = this.getAllTrips();
    const index = trips.findIndex(t => t.id === id);
    if (index === -1) return false;
    trips[index] = {
      ...trips[index],
      ...updatedData,
      id: id
    };
    this.saveTrips(trips);
    return true;
  },

  /**
   * 刪除特定旅程
   */
  deleteTrip(id) {
    const trips = this.getAllTrips();
    const filtered = trips.filter(t => t.id !== id);
    this.saveTrips(filtered);
    return true;
  },

  /**
   * 取得所有付款方式
   */
  getAllPaymentMethods() {
    this.init();
    try {
      const dataStr = localStorage.getItem('collection_payment_methods');
      return JSON.parse(dataStr) || [];
    } catch (e) {
      console.error('讀取付款方式失敗', e);
      return [];
    }
  },

  /**
   * 儲存付款方式
   */
  savePaymentMethods(methods) {
    localStorage.setItem('collection_payment_methods', JSON.stringify(methods));
  },

  /**
   * 取得所有付款工具
   */
  getAllPaymentTools() {
    this.init();
    try {
      const dataStr = localStorage.getItem('collection_payment_tools');
      return JSON.parse(dataStr) || [];
    } catch (e) {
      console.error('讀取付款工具失敗', e);
      return [];
    }
  },

  /**
   * 儲存付款工具
   */
  savePaymentTools(tools) {
    localStorage.setItem('collection_payment_tools', JSON.stringify(tools));
  }
};
