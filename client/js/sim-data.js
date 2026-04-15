/* ===== 创业模拟器 - 数据定义 ===== */

// --- NPC 定义 ---
const SIM_NPCS = [
  { id: 'cto', name: '张工', role: '技术总监', type: '高管', traits: { 攻击: 60, 忠诚: 80, 创意: 70, 执行: 90, 社交: 40, 谈判: 55 }, salary: 5000, bonus_product: 15, desc: '技术大牛，执行力极强' },
  { id: 'cmo', name: '林悦', role: '市场总监', type: '高管', traits: { 攻击: 75, 忠诚: 65, 创意: 80, 执行: 70, 社交: 90, 谈判: 85 }, salary: 4500, bonus_market: 15, desc: '社交达人，市场敏感度极高' },
  { id: 'cfo', name: '王磊', role: '财务总监', type: '高管', traits: { 攻击: 45, 忠诚: 85, 创意: 40, 执行: 80, 社交: 50, 谈判: 90 }, salary: 4000, bonus_finance: 20, desc: '精打细算，降本增效专家' },
  { id: 'pm', name: '陈小鱼', role: '产品经理', type: '执行层', traits: { 攻击: 55, 忠诚: 75, 创意: 85, 执行: 75, 社交: 70, 谈判: 60 }, salary: 2500, bonus_product: 10, desc: '用户洞察力强，善做产品决策' },
  { id: 'hr', name: '周敏', role: 'HR经理', type: '执行层', traits: { 攻击: 40, 忠诚: 90, 创意: 50, 执行: 80, 社交: 85, 谈判: 70 }, salary: 2000, bonus_morale: 15, desc: '团队氛围好，士气维护高手' },
  { id: 'designer', name: '李美美', role: '设计师', type: '执行层', traits: { 攻击: 45, 忠诚: 70, 创意: 95, 执行: 65, 社交: 60, 谈判: 40 }, salary: 2000, bonus_rep: 10, desc: '设计天才，提升品牌形象' },
  { id: 'dev1', name: '小强', role: '前端工程师', type: '执行层', traits: { 攻击: 50, 忠诚: 80, 创意: 65, 执行: 85, 社交: 35, 谈判: 30 }, salary: 2200, bonus_product: 8, desc: '代码质量高，沟通偏内敛' },
  { id: 'dev2', name: '阿明', role: '后端工程师', type: '执行层', traits: { 攻击: 55, 忠诚: 75, 创意: 55, 执行: 90, 社交: 30, 谈判: 35 }, salary: 2200, bonus_product: 8, desc: '稳定可靠，是系统的基石' },
  { id: 'dev3', name: '老K', role: '全栈工程师', type: '执行层', traits: { 攻击: 65, 忠诚: 60, 创意: 75, 执行: 80, 社交: 50, 谈判: 45 }, salary: 2800, bonus_product: 12, desc: '全能选手，偶尔有点飘' },
  { id: 'ops', name: '大壮', role: '运营', type: '执行层', traits: { 攻击: 70, 忠诚: 65, 创意: 60, 执行: 75, 社交: 80, 谈判: 70 }, salary: 1800, bonus_market: 8, desc: '地推王者，线上线下都能玩' },
  { id: 'bd', name: '赵晓梅', role: 'BD经理', type: '执行层', traits: { 攻击: 80, 忠诚: 55, 创意: 50, 执行: 65, 社交: 85, 谈判: 90 }, salary: 2500, bonus_market: 12, bonus_rev: 0.1, desc: '谈判高手，资源整合能力强' },
  { id: 'intern1', name: '小白', role: '实习生', type: '执行层', traits: { 攻击: 30, 忠诚: 90, 创意: 60, 执行: 65, 社交: 70, 谈判: 25 }, salary: 500, bonus_product: 3, desc: '充满热情，学习能力强' },
  { id: 'intern2', name: '小绿', role: '实习生', type: '执行层', traits: { 攻击: 25, 忠诚: 85, 创意: 70, 执行: 60, 社交: 75, 谈判: 30 }, salary: 500, bonus_rep: 3, desc: '创意满满的小萌新' },
  { id: 'investor', name: '陈总', role: '天使投资人', type: '外部', traits: { 攻击: 85, 忠诚: 30, 创意: 60, 执行: 50, 社交: 90, 谈判: 95 }, salary: 0, bonus_money: 200000, desc: '资金实力雄厚，但要求苛刻' },
  { id: 'rival', name: '竞品李总', role: '竞争对手', type: '外部', traits: { 攻击: 90, 忠诚: 0, 创意: 80, 执行: 85, 社交: 70, 谈判: 75 }, salary: 0, desc: '会不定期制造麻烦，偶尔也能合作' },
  { id: 'kol', name: 'KOL小红', role: '核心用户', type: '外部', traits: { 攻击: 40, 忠诚: 70, 创意: 85, 执行: 55, 社交: 95, 谈判: 40 }, salary: 0, bonus_rep: 15, bonus_market: 8, desc: '用户代言人，口碑传播机器' },
  { id: 'media', name: '老媒体', role: '媒体人', type: '外部', traits: { 攻击: 55, 忠诚: 20, 创意: 70, 执行: 50, 社交: 80, 谈判: 65 }, salary: 0, bonus_market: 12, bonus_rep: 10, desc: '曝光神器，把握好节奏' },
];

// --- 17 团队槽位定义 ---
const SIM_SLOTS = [
  { id: 'cto', label: 'CTO' }, { id: 'cmo', label: 'CMO' }, { id: 'cfo', label: 'CFO' },
  { id: 'pm', label: 'PM' }, { id: 'hr', label: 'HR' }, { id: 'designer', label: '设计师' },
  { id: 'dev1', label: '开发1' }, { id: 'dev2', label: '开发2' }, { id: 'dev3', label: '开发3' },
  { id: 'ops', label: '运营' }, { id: 'bd', label: 'BD' },
  { id: 'intern1', label: '实习1' }, { id: 'intern2', label: '实习2' },
  { id: 'investor', label: '投资人' }, { id: 'rival', label: '竞对' },
  { id: 'kol', label: '核心用户' }, { id: 'media', label: '媒体' },
];

// --- 赛道配置 ---
const SIM_TRACKS = {
  consumer: { name: '消费产品', initMoney: 500000, marketBonus: 5, revenueMulti: 1.0 },
  saas:     { name: 'SaaS工具', initMoney: 600000, productBonus: 5, repBonus: 5, revenueMulti: 1.2 },
  ai:       { name: 'AI应用', initMoney: 800000, productBonus: 10, revenueMulti: 1.5 },
  ecommerce:{ name: '电商零售', initMoney: 1000000, marketBonus: 8, revenueMulti: 1.1 },
  edtech:   { name: '教育科技', initMoney: 500000, repBonus: 10, revenueMulti: 0.9 },
};

// --- 行动定义 ---
const SIM_ACTIONS = [
  { id: 'dev_sprint', icon: '💻', name: '产品冲刺', desc: '全力开发核心功能', cost: 0, locked_without: ['cto','dev1'], effects: { product: [15,25], morale: [-5,0] } },
  { id: 'marketing', icon: '📢', name: '市场推广', desc: '投放广告扩大曝光', cost: 30000, effects: { market: [8,15], reputation: [3,8] } },
  { id: 'user_research', icon: '🔍', name: '用户调研', desc: '深入了解目标用户需求', cost: 10000, effects: { product: [5,10], reputation: [5,10] } },
  { id: 'recruit_talent', icon: '🤝', name: '人才招募', desc: '扩充团队战斗力', cost: 20000, effects: { morale: [5,15], product: [5,10] } },
  { id: 'fundraising', icon: '💰', name: '融资路演', desc: '向投资人展示你的故事', cost: 0, locked_without: ['investor'], effects: { money: [300000, 800000] } },
  { id: 'partner', icon: '🤜', name: '生态合作', desc: '与大平台合作获得流量', cost: 50000, locked_without: ['bd'], effects: { market: [12,20], revenue: [20000,50000] } },
  { id: 'brand_building', icon: '✨', name: '品牌打造', desc: '提升口碑与用户信任', cost: 20000, locked_without: ['designer'], effects: { reputation: [10,20], market: [5,10] } },
  { id: 'cost_cut', icon: '✂️', name: '降本增效', desc: '优化团队结构节省开支', cost: 0, effects: { morale: [-10,-5], money: [30000,80000] } },
  { id: 'pivoting', icon: '🔄', name: '产品转型', desc: '调整方向寻找更大市场', cost: 20000, effects: { product: [-5,5], market: [-5,5], reputation: [-5,10] } },
  { id: 'viral_growth', icon: '🌊', name: '裂变增长', desc: '设计病毒式传播机制', cost: 15000, effects: { market: [15,30], reputation: [5,15] } },
];

// --- 随机事件 ---
const SIM_EVENTS = [
  { id: 'media_coverage', text: '🗞️ 媒体主动报道！口碑和市场同步爆发', effects: { reputation: 15, market: 10 } },
  { id: 'competitor_attack', text: '⚔️ 竞争对手发起价格战！市场份额承压', effects: { market: -10, morale: -5 } },
  { id: 'key_user_lost', text: '😤 核心用户公开批评产品，口碑受损', effects: { reputation: -12, market: -5 } },
  { id: 'viral_post', text: '🔥 产品突然在社交媒体爆了！用户暴涨', effects: { market: 20, reputation: 10 } },
  { id: 'talent_leave', text: '😢 核心工程师递交辞职信，研发受影响', effects: { product: -10, morale: -10 } },
  { id: 'policy_change', text: '🏛️ 监管政策调整，需要配合整改', effects: { product: -5, money: -50000 } },
  { id: 'investment_intent', text: '💼 某知名VC主动接触，希望深入了解', effects: { morale: 10, reputation: 5 } },
  { id: 'product_bug', text: '🐛 严重 Bug 引发用户投诉潮', effects: { reputation: -15, market: -8 } },
  { id: 'new_partnership', text: '🤝 意外获得大平台的官方合作资格', effects: { market: 15, revenue: 80000 } },
  { id: 'team_bonus', text: '🎉 团队氛围极佳，士气和产出双升', effects: { morale: 15, product: 8 } },
];

// --- 模拟器全局变量 ---
let currentRecruitSlot = null;
let recruitFilter = '全部';

// --- 工具函数 ---
function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
