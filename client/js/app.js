/* ===== 配置 ===== */
const API = 'https://xn--5br93cv32ao8m.com/api';

/* ===== 全局状态 ===== */
const state = {
  token: localStorage.getItem('xq_token') || '',
  user: JSON.parse(localStorage.getItem('xq_user') || 'null'),
  ideas: [],
  posts: [],
  homeTab: 'today',
  plazaTab: 'today',
  homeTag: '全部',
  plazaTag: '全部',
  discCat: '全部',
  discSort: 'new',
  captchaText: '',
  simState: null,
  simSelectedAction: null,
  simSelectedTrack: 'consumer',
  simDialogues: [],
};

/* ===== API 请求 ===== */
async function apiRequest(path, method = 'GET', body = null) {
  const headers = {};
  if (state.token) headers['Authorization'] = 'Bearer ' + state.token;
  if (body) headers['Content-Type'] = 'application/json';
  try {
    const res = await fetch(API + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    return await res.json();
  } catch (e) {
    return { error: e.message };
  }
}

function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById('page-' + name);
  if (page) page.classList.add('active');
  document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
  const navEl = document.getElementById('nav-' + name);
  if (navEl) navEl.classList.add('active');
  window.scrollTo(0, 0);
  if (name === 'home') { loadIdeas(state.homeTab === 'today' ? 'hot' : state.homeTab === 'week' ? 'week' : 'new').then(() => { renderHomeIdeas(); renderSidebar(); initScrollReveal(); }); }
  if (name === 'plaza') { loadIdeas(state.plazaTab === 'today' ? 'hot' : 'new').then(() => { renderPlazaIdeas(); renderPlazaStats(); initScrollReveal(); }); }
  if (name === 'discuss') { loadPosts().then(() => { renderDiscuss(); renderHotTopics(); initScrollReveal(); }); }
  if (name === 'profile') { loadProfile(); }
  if (name === 'rank') { loadRankIdeas(); loadRankSims(); initScrollReveal(); }
  if (name === 'sim') { initScrollReveal(); }
}

function initScrollReveal() {
  const cards = document.querySelectorAll('.idea-card,.post-card,.disc-post-card');
  if (!cards.length) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.style.opacity = '1'; e.target.style.transform = 'translateY(0)'; obs.unobserve(e.target); }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -20px 0px' });
  cards.forEach(c => {
    c.style.opacity = '0'; c.style.transform = 'translateY(8px)';
    c.style.transition = 'opacity 0.4s ease,transform 0.4s ease';
    obs.observe(c);
  });
}

function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast show ' + (type === 'error' ? 'toast-error' : '');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 3000);
}

function openModal(id) {
  const m = document.getElementById(id);
  if (m) { m.style.display = 'flex'; document.body.style.overflow = 'hidden'; }
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) { m.style.display = 'none'; document.body.style.overflow = ''; }
}

function updateNav() {
  const btnLogin = document.getElementById('btnLogin');
  const btnPost = document.getElementById('btnPost');
  const btnProfile = document.getElementById('btnProfile');
  if (state.user) {
    if (btnLogin) btnLogin.style.display = 'none';
    if (btnPost) btnPost.style.display = '';
    if (btnProfile) { btnProfile.style.display = ''; btnProfile.textContent = state.user.nickname || '我'; }
  } else {
    if (btnLogin) btnLogin.style.display = '';
    if (btnPost) btnPost.style.display = 'none';
    if (btnProfile) btnProfile.style.display = 'none';
  }
}

function openAuth(tab) {
  switchAuthTab(tab || 'login');
  openModal('authModal');
}

function formatTime(ts) {
  if (!ts) return '';
  let d;
  if (typeof ts === 'number') {
    d = ts < 1e12 ? new Date(ts * 1000) : new Date(ts);
  } else {
    d = new Date(ts);
  }
  if (isNaN(d.getTime())) return '';
  const now = Date.now();
  const diff = now - d.getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const day = Math.floor(diff / 86400000);
  if (m < 1) return '刚刚';
  if (m < 60) return m + '分钟前';
  if (h < 24) return h + '小时前';
  if (day < 7) return day + '天前';
  return d.toLocaleDateString('zh-CN');
}

function animateNum(el, target) {
  if (!el) return;
  const start = 0;
  const duration = 1000;
  const startTime = performance.now();
  function step(now) {
    const p = Math.min((now - startTime) / duration, 1);
    const val = Math.floor(p * target);
    el.textContent = val >= 1000 ? (val / 1000).toFixed(1) + 'k' : val;
    if (p < 1) requestAnimationFrame(step);
    else el.textContent = target >= 1000 ? (target / 1000).toFixed(1) + 'k' : target;
  }
  requestAnimationFrame(step);
}

function switchTab(tab, el) {
  state.homeTab = tab;
  document.querySelectorAll('.tab-group .tab-btn').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  loadIdeas(tab === 'today' ? 'hot' : tab === 'week' ? 'week' : 'new').then(() => renderHomeIdeas());
}
