/**
 * Collection Book - data.js
 * 
 * 預設收藏品 JSON 資料庫
 * 包含：娃娃 (Dolls)、周邊 (Merch)、旅遊 (Travel) 豐富的預設單品資料
 */

const DEFAULT_COLLECTION_DATA = [
  // ----------------------------------------------------
  // 🧸 娃娃 (Dolls) 系列
  // ----------------------------------------------------
  {
    id: 'chk-01',
    name: '經典黃色呆萌小雞',
    category: '娃娃',
    series: '雞',
    price: 450,
    purchaseDate: '2026-05-12',
    status: 'collected',
    tags: ['#經典款', '#絨毛玩具', '#超療癒'],
    images: [],
    source: '台北地下街玩具店',
    note: '這是在地下街偶然發現的經典款呆萌小雞，毛茸茸的觸感非常好。當時貨架上最後一隻，直接手刀購入！',
    createdDate: '2026-05-12T10:00:00Z'
  },
  {
    id: 'chk-02',
    name: '英倫偵探帽紳士雞',
    category: '娃娃',
    series: '雞',
    price: 520,
    purchaseDate: '2026-06-01',
    status: 'collected',
    tags: ['#限定款', '#英倫風', '#絨毛玩具'],
    images: [],
    source: '日本代購官網',
    note: '2026 夏季最新英倫主題系列，戴著可愛的小福爾摩斯帽子和經典格紋披風，細節做工滿分！',
    createdDate: '2026-06-01T14:30:00Z'
  },
  {
    id: 'chk-03',
    name: '草莓睡袋寶寶雞',
    category: '娃娃',
    series: '雞',
    price: 480,
    purchaseDate: '',
    status: 'uncollected',
    tags: ['#預購款', '#水果系列', '#絨毛玩具'],
    images: [],
    source: '無',
    note: '包裝成草莓造型睡袋的超級限量版！目前各大拍賣平台均已完售，正努力尋找合理的轉售管道中。',
    createdDate: '2026-07-01T09:15:00Z'
  },
  {
    id: 'dck-01',
    name: '戴帽水手大白鴨',
    category: '娃娃',
    series: '鴨',
    price: 380,
    purchaseDate: '2025-11-20',
    status: 'collected',
    tags: ['#扭蛋系列', '#水手風', '#絨毛玩具'],
    images: [],
    source: '扭蛋專賣店',
    note: '經典藍白配色水手帽，還拿著一個小救生圈，是水手鴨系列裡面最討喜的款式！',
    createdDate: '2025-11-20T11:00:00Z'
  },
  {
    id: 'dck-02',
    name: '害羞腮紅粉嫩鴨',
    category: '娃娃',
    series: '鴨',
    price: 420,
    purchaseDate: '',
    status: 'uncollected',
    tags: ['#預購款', '#粉嫩色系', '#絨毛玩具'],
    images: [],
    source: '網購預購中',
    note: '已經在線上商店下單預購，聽說粉紅色的腮紅是手工上色，非常期待實品的到來！',
    createdDate: '2026-07-10T12:00:00Z'
  },
  {
    id: 'yuk-01',
    name: '富士山限定 YUKIO',
    category: '娃娃',
    series: 'YUKIO',
    price: 350,
    purchaseDate: '2026-02-15',
    status: 'collected',
    tags: ['#富士山限定', '#旅遊紀念', '#限定款'],
    images: [],
    source: '日本靜岡當地特產店',
    note: '去日本旅遊時在靜岡特產店購入的限定款！背後還印有可愛的富士山圖案，太具有紀念價值了。',
    createdDate: '2026-02-15T16:00:00Z'
  },
  {
    id: 'yuk-02',
    name: '櫻花粉 YUKIO 吊飾',
    category: '娃娃',
    series: 'YUKIO',
    price: 320,
    purchaseDate: '2026-04-10',
    status: 'collected',
    tags: ['#櫻花季', '#吊飾型', '#限定款'],
    images: [],
    source: '大阪扭蛋機',
    note: '賞櫻季節限定推出的 YUKIO 系列吊飾，掛在包包上超級亮眼。',
    createdDate: '2026-04-10T15:45:00Z'
  },

  // ----------------------------------------------------
  // 🎁 周邊 (Merch) 系列
  // ----------------------------------------------------
  {
    id: 'sj-01',
    name: 'SUPER JUNIOR 官方應援棒 Ver. 2',
    category: '周邊',
    series: 'SJ',
    price: 1350,
    purchaseDate: '2025-08-05',
    status: 'collected',
    tags: ['#應援棒', '#寶藍海', '#官方周邊'],
    images: [],
    source: 'SM TOWN 官方商城',
    note: 'Super Show 演唱會必備的神物！亮度跟藍色光芒極其純淨。經歷過好幾場戰役，依然保存良好。',
    createdDate: '2025-08-05T08:00:00Z'
  },
  {
    id: 'sj-02',
    name: '15週年特別紀念金屬徽章',
    category: '周邊',
    series: 'SJ',
    price: 450,
    purchaseDate: '',
    status: 'uncollected',
    tags: ['#金屬徽章', '#珍稀限定', '#限定款'],
    images: [],
    source: '無',
    note: '15週年官網限定推出的徽章，由於當時開賣五分鐘內就秒殺，目前正積極在二手交易社團徵求中。',
    createdDate: '2026-06-15T11:20:00Z'
  },
  {
    id: 'exo-01',
    name: 'EXO 官方愛麗棒 Ver. 3',
    category: '周邊',
    series: 'EXO',
    price: 1400,
    purchaseDate: '2025-09-18',
    status: 'collected',
    tags: ['#愛麗棒', '#應援燈', '#官方周邊'],
    images: [],
    source: 'K-POP 專賣店',
    note: '簡約純白加上標誌性的銀色 EXO logo，質感滿分，連線控燈效功能也測試完美！',
    createdDate: '2025-09-18T14:00:00Z'
  },

  // ----------------------------------------------------
  // ✈️ 旅遊 (Travel) 系列
  // ----------------------------------------------------
  {
    id: 'jp-01',
    name: '東京迪士尼 40 週年限定爆米花桶',
    category: '旅遊',
    series: '日本',
    price: 1200,
    purchaseDate: '2025-10-15',
    status: 'collected',
    tags: ['#限定款', '#東京', '#迪士尼', '#40週年', '#紀念品'],
    images: [],
    source: '東京迪士尼樂園',
    note: '東京迪士尼 40 週年園區限定款，夜晚會發光，設計非常精緻。是排隊一個小時才買到的珍貴收藏！',
    createdDate: '2025-10-15T12:00:00Z'
  },
  {
    id: 'jp-02',
    name: '京都清水寺 手作櫻花御守',
    category: '旅遊',
    series: '日本',
    price: 350,
    purchaseDate: '2026-04-02',
    status: 'collected',
    tags: ['#限定款', '#京都', '#御守', '#櫻花季'],
    images: [],
    source: '清水寺',
    note: '在櫻花季前往清水寺祈福時購入，淡粉色的櫻花刺繡非常雅致。',
    createdDate: '2026-04-02T09:00:00Z'
  },
  {
    id: 'jp-03',
    name: '大阪環球影城 瑪利歐賽車手錶',
    category: '旅遊',
    series: '日本',
    price: 1800,
    purchaseDate: '',
    status: 'uncollected',
    tags: ['#預購款', '#環球影城', '#瑪利歐', '#任天堂'],
    images: [],
    source: '環球影城園區',
    note: '超級任天堂世界園區限定發售，目前委託朋友下個月去日本時幫忙預購。',
    createdDate: '2026-07-05T15:30:00Z'
  },
  {
    id: 'kr-01',
    name: '首爾景福宮 傳統韓服熊玩偶',
    category: '旅遊',
    series: '韓國',
    price: 850,
    purchaseDate: '2026-03-10',
    status: 'collected',
    tags: ['#限定款', '#絨毛玩具', '#韓服熊', '#首爾紀念'],
    images: [],
    source: '首爾文創市集',
    note: '穿著精緻手工韓服的小熊玩偶，細節還原度極高，非常討喜。',
    createdDate: '2026-03-10T11:00:00Z'
  },
  {
    id: 'kr-02',
    name: '濟州島限定 漢拏峰橘子香氛蠟燭',
    category: '旅遊',
    series: '韓國',
    price: 520,
    purchaseDate: '2025-12-05',
    status: 'collected',
    tags: ['#限定款', '#濟州島', '#香氛', '#伴手禮'],
    images: [],
    source: '濟州紀念品店',
    note: '濟州島特產漢拏峰橘子造型的蠟燭，散發淡雅的柑橘清香。',
    createdDate: '2025-12-05T14:20:00Z'
  },
  {
    id: 'hk-01',
    name: '香港復古紅色叮叮車金屬模型',
    category: '旅遊',
    series: '香港',
    price: 650,
    purchaseDate: '2026-01-20',
    status: 'collected',
    tags: ['#限定款', '#叮叮車', '#復古模型'],
    images: [],
    source: '香港叮叮車官網',
    note: '經典雙層紅色叮叮車金屬模型，車身印有懷舊廣告，非常有老香港情懷。',
    createdDate: '2026-01-20T10:00:00Z'
  },
  {
    id: 'hk-02',
    name: '天星小輪 鑄銅紀念幣',
    category: '旅遊',
    series: '香港',
    price: 300,
    purchaseDate: '2026-01-22',
    status: 'collected',
    tags: ['#限定款', '#紀念幣', '#天星小輪'],
    images: [],
    source: '天星小輪碼頭',
    note: '在天星小輪碼頭的自動販賣機鑄造的限定銅幣，上面刻有維多利亞港與小輪圖樣。',
    createdDate: '2026-01-22T15:00:00Z'
  }
];

const DEFAULT_SERIES_DATA = [
  { id: 'chicken', category: '娃娃', name: '雞', emoji: '🐤' },
  { id: 'duck', category: '娃娃', name: '鴨', emoji: '🦆' },
  { id: 'yukio', category: '娃娃', name: 'YUKIO', emoji: '❄' },
  { id: 'sj', category: '周邊', name: 'SJ', emoji: '⚡' },
  { id: 'exo', category: '周邊', name: 'EXO', emoji: '🪐' },
  { id: 'japan', category: '旅遊', name: '日本', emoji: '🇯🇵' },
  { id: 'korea', category: '旅遊', name: '韓國', emoji: '🇰🇷' },
  { id: 'hongkong', category: '旅遊', name: '香港', emoji: '🇭🇰' }
];



// 周邊團體與成員預設資料（團體名稱需對應「周邊」系列名稱）
const DEFAULT_GROUP_DATA = [
  { id: 'group-sj', name: 'SJ', members: ['利特', '希澈', '藝聲', '神童', '銀赫', '東海', '始源', '厲旭', '圭賢'] },
  { id: 'group-exo', name: 'EXO', members: ['XIUMIN', 'SUHO', 'LAY', 'BAEKHYUN', 'CHEN', 'CHANYEOL', 'D.O.', 'KAI', 'SEHUN'] }
];
