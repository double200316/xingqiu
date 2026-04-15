function switchAuthTab(tab) {
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-register').classList.toggle('active', tab === 'register');
  document.getElementById('loginForm').style.display = tab === 'login' ? '' : 'none';
  document.getElementById('registerForm').style.display = tab === 'register' ? '' : 'none';
  if (tab === 'register') refreshCaptcha();
}

async function doLogin() {
  const name = document.getElementById('login-name').value.trim();
  const pwd = document.getElementById('login-pwd').value;
  if (!name || !pwd) return showToast('请填写完整', 'error');
  const r = await apiRequest('/auth/login', 'POST', { nickname: name, password: pwd });
  if (r.token) {
    state.token = r.token; state.user = r.user;
    localStorage.setItem('xq_token', r.token);
    localStorage.setItem('xq_user', JSON.stringify(r.user));
    updateNav(); closeModal('authModal');
    showToast('登录成功，欢迎回来 ' + (r.user.nickname || ''));
  } else {
    showToast(r.error || r.message || '登录失败', 'error');
  }
}

async function doRegister() {
  const name = document.getElementById('reg-name').value.trim();
  const pwd = document.getElementById('reg-pwd').value;
  const cap = document.getElementById('reg-captcha').value.toUpperCase();
  const agree = document.getElementById('agreeCheck').checked;
  if (!name || !pwd) return showToast('请填写昵称和密码', 'error');
  if (pwd.length < 8) return showToast('密码至少8位', 'error');
  if (!agree) return showToast('请同意用户协议', 'error');
  if (cap !== state.captchaText) return showToast('验证码错误', 'error');
  const r = await apiRequest('/auth/register', 'POST', { nickname: name, password: pwd });
  if (r.token) {
    state.token = r.token; state.user = r.user;
    localStorage.setItem('xq_token', r.token);
    localStorage.setItem('xq_user', JSON.stringify(r.user));
    updateNav(); closeModal('authModal');
    showToast('注册成功！欢迎加入想法星球');
  } else {
    showToast(r.error || r.message || '注册失败', 'error');
  }
}

function doLogout() {
  state.token = ''; state.user = null;
  localStorage.removeItem('xq_token');
  localStorage.removeItem('xq_user');
  updateNav(); showToast('已退出登录');
}

function socialLogin(platform) {
  showToast(platform + ' 登录暂未开放', 'error');
}

function refreshCaptcha() {
  const canvas = document.getElementById('captchaCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let text = '';
  for (let i = 0; i < 4; i++) text += chars[Math.floor(Math.random() * chars.length)];
  state.captchaText = text;
  ctx.clearRect(0, 0, 110, 40);
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, 110, 40);
  for (let i = 0; i < 4; i++) {
    ctx.save();
    ctx.translate(15 + i * 22, 20);
    ctx.rotate((Math.random() - 0.5) * 0.5);
    ctx.font = 'bold 20px monospace';
    ctx.fillStyle = `hsl(${Math.random()*360},60%,35%)`;
    ctx.fillText(text[i], 0, 7);
    ctx.restore();
  }
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(Math.random() * 110, Math.random() * 40);
    ctx.lineTo(Math.random() * 110, Math.random() * 40);
    ctx.strokeStyle = '#475569'; ctx.lineWidth = 1; ctx.stroke();
  }
}

async function loadProfile() {
  if (!state.token) {
    const p = document.querySelector('#page-profile .profile-page');
    if (p) p.innerHTML = '<div style="text-align:center;padding:60px"><p style="color:var(--text3)">请先登录</p><button class="btn-cta" onclick="openAuth(\'login\')" style="margin-top:16px">立即登录</button></div>';
    return;
  }
  const r = await apiRequest('/profile');
  if (r.error) return;
  const u = r.user || r;
  document.getElementById('profileName').textContent = u.nickname || '-';
  document.getElementById('profileAvatar').textContent = (u.nickname || 'U')[0].toUpperCase();
  document.getElementById('profileJoin').textContent = '加入时间：' + (u.created_at ? formatTime(u.created_at) : '-');
  const score = u.score || 0;
  document.getElementById('profileScore').textContent = score;
  // 等级系统
  const levels = [
    { name: '灵光一现', min: 0 }, { name: '思维泉涌', min: 10 }, { name: '灵感达人', min: 50 },
    { name: '创意领袖', min: 100 }, { name: '想法大师', min: 300 }, { name: '创新先锋', min: 1000 }
  ];
  let curLevel = levels[0], nextLevel = levels[1];
  for (let i = 0; i < levels.length; i++) {
    if (score >= levels[i].min) { curLevel = levels[i]; nextLevel = levels[i + 1] || null; }
  }
  document.getElementById('profileLevelBadge').textContent = curLevel.name;
  document.getElementById('levelCurLabel').textContent = curLevel.name;
  document.getElementById('levelNextLabel').textContent = nextLevel ? '下一级：' + nextLevel.name : '已达最高级';
  const pct = nextLevel ? Math.min(100, ((score - curLevel.min) / (nextLevel.min - curLevel.min)) * 100) : 100;
  document.getElementById('levelBarFill').style.width = pct + '%';
  document.getElementById('profileIdeaCount').textContent = u.idea_count || 0;
  document.getElementById('profileCommentCount').textContent = u.comment_count || 0;
  document.getElementById('profileVoteGot').textContent = u.vote_got || 0;
  // 加载我的想法
  const myIdeas = await apiRequest('/profile/ideas');
  const ideasArr = Array.isArray(myIdeas) ? myIdeas : (myIdeas.ideas || []);
  const ideaTab = document.getElementById('profileContent');
  if (ideaTab) ideaTab.innerHTML = ideasArr.length ? ideasArr.map(i => ideaCardHTML(i, `openIdeaDetail(${i.id})`)).join('') : '<div class="empty-state">还没有发布过想法</div>';
}

function switchProfileTab(tab, el) {
  document.querySelectorAll('.profile-tab-btn').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
}

function openEditProfile() {
  showToast('个人资料编辑功能即将开放');
}
