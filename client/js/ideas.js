async function loadIdeas(sort = 'hot') {
  const r = await apiRequest('/ideas?sort=' + sort + '&limit=50');
  if (Array.isArray(r)) state.ideas = r;
  else if (r.ideas) state.ideas = r.ideas;
  return state.ideas;
}

function statusBadge(status) {
  const map = { idea: ['💡', '想法', 'idea'], building: ['🔨', '开发中', 'building'], launched: ['✅', '已上线', 'launched'] };
  const [icon, label, cls] = map[status] || map.idea;
  return `<span class="sim-status-tag ${cls}">${icon} ${label}</span>`;
}

function ideaCardHTML(idea, onClick) {
  const tags = Array.isArray(idea.tags) ? idea.tags : (idea.tags ? idea.tags.split(',') : []);
  const tagHtml = tags.map(t => `<span class="idea-tag">${t.trim()}</span>`).join('');
  return `<div class="idea-card" onclick="${onClick}">
    <div class="idea-card-vote">
      <button class="vote-btn${idea.voted ? ' voted' : ''}" onclick="event.stopPropagation();voteIdea(${idea.id})" title="支持这个想法">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 2L14 9H10V14H6V9H2L8 2Z"/></svg>
        <span>${idea.upvotes || idea.votes || idea.vote_count || 0}</span>
      </button>
    </div>
    <div class="idea-card-body">
      <div class="idea-card-top">
        <span class="idea-icon">${idea.icon || '💡'}</span>
        <div>
          <div class="idea-title">${idea.title || ''}</div>
          <div class="idea-tagline">${idea.tagline || ''}</div>
        </div>
        ${statusBadge(idea.status)}
      </div>
      <div class="idea-card-footer">
        <div class="idea-tags">${tagHtml}</div>
        <div class="idea-meta">
          <span>${idea.author_name || idea.nickname || '匿名'}</span>
          <span>${formatTime(idea.created_at)}</span>
          <span>💬 ${idea.comments_count || 0}</span>
        </div>
      </div>
    </div>
  </div>`;
}

function renderHomeIdeas() {
  const list = document.getElementById('homeIdeaList');
  if (!list) return;
  let ideas = state.ideas;
  if (state.homeTag && state.homeTag !== '全部') {
    ideas = ideas.filter(i => {
      const tags = Array.isArray(i.tags) ? i.tags : (i.tags ? i.tags.split(',') : []);
      return tags.some(t => t.trim() === state.homeTag);
    });
  }
  if (!ideas.length) { list.innerHTML = '<div class="empty-state">暂无想法，来发布第一个吧！</div>'; return; }
  list.innerHTML = ideas.map(i => ideaCardHTML(i, `openIdeaDetail(${i.id})`)).join('');
  initScrollReveal();
}

function renderSidebar() {
  const catMap = {};
  state.ideas.forEach(i => {
    const tags = Array.isArray(i.tags) ? i.tags : (i.tags ? i.tags.split(',') : []);
    tags.forEach(t => { const k = t.trim(); if (k) catMap[k] = (catMap[k] || 0) + 1; });
  });
  const catList = document.getElementById('sidebarCats');
  if (catList) {
    const sorted = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 6);
    catList.innerHTML = sorted.map(([k, v]) => `<div class="cat-list-item" onclick="filterByTag('${k}',null)">${k}<span>${v}</span></div>`).join('');
  }
  const hotList = document.getElementById('sidebarHotList');
  if (hotList) {
    const sorted = [...state.ideas].sort((a, b) => (b.upvotes || b.votes || 0) - (a.upvotes || a.votes || 0)).slice(0, 5);
    hotList.innerHTML = sorted.map((i, idx) => `<div class="hot-idea-item" onclick="openIdeaDetail(${i.id})"><span class="hot-rank">${idx + 1}</span><span class="hot-title">${i.title}</span><span class="hot-votes">⬆${i.upvotes || i.votes || 0}</span></div>`).join('');
  }
  // Hero 统计
  animateNum(document.getElementById('heroStatIdeas'), state.ideas.length);
  const users = new Set(state.ideas.map(i => i.user_id || i.author_name)).size;
  animateNum(document.getElementById('heroStatUsers'), users);
  const votes = state.ideas.reduce((s, i) => s + (i.upvotes || i.votes || 0), 0);
  animateNum(document.getElementById('heroStatVotes'), votes);
}

function filterByTag(tag, el) {
  state.homeTag = tag;
  document.querySelectorAll('#homeCatTags .cat-tag').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  renderHomeIdeas();
}

function handleSearch(val) {
  const list = document.getElementById('homeIdeaList');
  if (!list) return;
  const kw = val.trim().toLowerCase();
  const ideas = kw ? state.ideas.filter(i => (i.title + i.tagline).toLowerCase().includes(kw)) : state.ideas;
  if (!ideas.length) { list.innerHTML = '<div class="empty-state">没有找到相关想法</div>'; return; }
  list.innerHTML = ideas.map(i => ideaCardHTML(i, `openIdeaDetail(${i.id})`)).join('');
}

function renderPlazaIdeas() {
  const list = document.getElementById('plazaIdeaList');
  if (!list) return;
  let ideas = state.ideas;
  if (state.plazaTab === 'launched') ideas = ideas.filter(i => i.status === 'launched');
  if (state.plazaTag && state.plazaTag !== '全部') {
    ideas = ideas.filter(i => {
      const tags = Array.isArray(i.tags) ? i.tags : (i.tags ? i.tags.split(',') : []);
      return tags.some(t => t.trim() === state.plazaTag);
    });
  }
  if (!ideas.length) { list.innerHTML = '<div class="empty-state">暂无想法</div>'; return; }
  list.innerHTML = ideas.map(i => ideaCardHTML(i, `openIdeaDetail(${i.id})`)).join('');
  initScrollReveal();
}

function renderPlazaStats() {
  const ideaC = state.ideas.filter(i => i.status === 'idea').length;
  const buildC = state.ideas.filter(i => i.status === 'building').length;
  const launchC = state.ideas.filter(i => i.status === 'launched').length;
  ['count-idea', 'count-building', 'count-launched'].forEach((id, idx) => {
    const el = document.getElementById(id);
    if (el) el.textContent = [ideaC, buildC, launchC][idx];
  });
}

function switchPlazaTab(tab, el) {
  state.plazaTab = tab;
  document.querySelectorAll('#page-plaza .tab-group .tab-btn').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  loadIdeas(tab === 'today' ? 'hot' : 'new').then(() => renderPlazaIdeas());
}

function filterPlazaByTag(tag, el) {
  state.plazaTag = tag;
  document.querySelectorAll('#plazaCatTags .cat-tag').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  renderPlazaIdeas();
}

function handlePlazaSearch(val) {
  const list = document.getElementById('plazaIdeaList');
  if (!list) return;
  const kw = val.trim().toLowerCase();
  const ideas = kw ? state.ideas.filter(i => (i.title + i.tagline).toLowerCase().includes(kw)) : state.ideas;
  list.innerHTML = ideas.map(i => ideaCardHTML(i, `openIdeaDetail(${i.id})`)).join('');
}

async function voteIdea(id) {
  if (!state.token) { openAuth('login'); return; }
  const r = await apiRequest('/ideas/' + id + '/vote', 'POST');
  if (r.error) { showToast(r.error, 'error'); return; }
  // 更新本地
  const idea = state.ideas.find(i => String(i.id) === String(id));
  if (idea) {
    const key = 'upvotes' in idea ? 'upvotes' : 'votes' in idea ? 'votes' : 'vote_count';
    if (r.voted !== undefined) {
      idea.voted = r.voted;
      idea[key] = r.vote_count !== undefined ? r.vote_count : (r.voted ? (idea[key] || 0) + 1 : Math.max(0, (idea[key] || 1) - 1));
    } else {
      idea[key] = (idea[key] || 0) + 1;
    }
  }
  // 重新渲染当前页
  const activePage = document.querySelector('.page.active');
  if (activePage) {
    if (activePage.id === 'page-home') renderHomeIdeas();
    else if (activePage.id === 'page-plaza') renderPlazaIdeas();
  }
  showToast(r.voted === false ? '已取消支持' : '投票成功！');
}

function openSubmitIdea() {
  if (!state.token) { openAuth('login'); return; }
  openModal('submitIdeaModal');
}

function selectStatus(el) {
  document.querySelectorAll('.status-opt').forEach(e => e.classList.remove('sel-idea', 'sel-building', 'sel-launched'));
  const map = { idea: 'sel-idea', building: 'sel-building', launched: 'sel-launched' };
  el.classList.add(map[el.dataset.status] || 'sel-idea');
}

function selectIcon(el) {
  document.querySelectorAll('.icon-opt').forEach(e => {
    e.style.borderColor = 'var(--border)'; e.style.background = '';
  });
  el.style.borderColor = 'var(--accent-fg)';
  el.style.background = 'var(--accent-subtle)';
}

async function submitIdea() {
  const title = document.getElementById('idea-name').value.trim();
  const tagline = document.getElementById('idea-tagline').value.trim();
  const detail = document.getElementById('idea-detail').value.trim();
  const link = document.getElementById('idea-link').value.trim();
  const statusEl = document.querySelector('.status-opt.sel-idea,.status-opt.sel-building,.status-opt.sel-launched');
  const status = statusEl ? statusEl.dataset.status : 'idea';
  const iconEl = document.querySelector('.icon-opt[style*="accent"],.icon-opt.selected');
  const icon = iconEl ? iconEl.dataset.icon : '💡';
  const tags = [...document.querySelectorAll('#tagSelect .tag-opt.selected')].map(e => e.dataset.tag);
  if (!title || !tagline) return showToast('请填写名称和描述', 'error');
  if (!tags.length) return showToast('请至少选一个分类', 'error');
  const r = await apiRequest('/ideas', 'POST', { title, tagline, description: detail, link, status, icon, tags });
  if (r.id || r.idea) {
    closeModal('submitIdeaModal');
    showToast('发布成功！');
    loadIdeas('hot').then(() => { renderHomeIdeas(); renderSidebar(); });
  } else {
    showToast(r.error || r.message || '发布失败', 'error');
  }
}

async function openIdeaDetail(id) {
  openModal('ideaDetailModal');
  const body = document.getElementById('ideaDetailBody');
  if (body) body.innerHTML = '<div style="padding:40px;text-align:center;color:var(--fg-subtle)">加载中…</div>';
  const r = await apiRequest('/ideas/' + id);
  const idea = r.idea || r;
  if (!idea || !idea.id) { if (body) body.innerHTML = '<div style="padding:40px;text-align:center">加载失败</div>'; return; }
  const tags = Array.isArray(idea.tags) ? idea.tags : (idea.tags ? idea.tags.split(',') : []);
  const tagHtml = tags.map(t => `<span class="idea-tag">${t.trim()}</span>`).join('');
  // 评论
  const comments = Array.isArray(r.comments) ? r.comments : [];
  const commentHtml = comments.length
    ? comments.map(c => `<div class="detail-comment"><div class="detail-comment-author">${c.author_name || c.nickname || '匿名'} <span>${formatTime(c.created_at)}</span></div><div>${c.content}</div></div>`).join('')
    : '<div style="text-align:center;padding:20px;color:var(--text3);font-size:13px">暂无评论，来发表第一条评论吧</div>';
  if (body) body.innerHTML = `
    <div style="padding:24px 28px 0">
      <div style="display:flex;align-items:flex-start;gap:16px;margin-bottom:20px">
        <span style="font-size:36px">${idea.icon || '💡'}</span>
        <div style="flex:1">
          <h2 style="font-size:20px;font-weight:600;margin-bottom:4px">${idea.title}</h2>
          <p style="color:var(--fg-muted);font-size:14px;margin-bottom:8px">${idea.tagline || ''}</p>
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            ${statusBadge(idea.status)}
            ${tagHtml}
          </div>
        </div>
        <button class="modal-close" onclick="closeModal('ideaDetailModal')">×</button>
      </div>
      ${idea.description ? `<div style="color:var(--fg-default);font-size:14px;line-height:1.7;padding:16px;background:var(--bg-muted);border-radius:var(--radius-md);margin-bottom:16px">${idea.description}</div>` : ''}
      <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid var(--border-default)">
        <button class="vote-btn${idea.voted ? ' voted' : ''}" onclick="voteIdea(${idea.id})" style="font-size:14px;padding:8px 16px">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style="margin-right:4px"><path d="M8 2L14 9H10V14H6V9H2L8 2Z"/></svg>
          支持 ${idea.upvotes || idea.votes || 0}
        </button>
        ${idea.link ? `<a href="${idea.link}" target="_blank" style="font-size:13px;color:var(--accent-fg)">🔗 查看链接</a>` : ''}
        <span style="color:var(--fg-subtle);font-size:12px;margin-left:auto">${idea.author_name || idea.nickname || '匿名'} · ${formatTime(idea.created_at)}</span>
      </div>
    </div>
    <div style="padding:0 28px 16px">
      <h3 style="font-size:14px;font-weight:600;margin-bottom:12px">评论 (${comments.length})</h3>
      <div id="ideaComments">${commentHtml}</div>
      ${state.token ? `
      <div style="margin-top:16px;display:flex;gap:8px">
        <textarea id="commentInput" placeholder="发表你的看法…" style="flex:1;padding:10px;border:1px solid var(--border-default);border-radius:var(--radius-md);font-size:13px;resize:none;height:72px;font-family:var(--font);background:var(--bg);color:var(--fg-default)"></textarea>
        <button class="btn-cta" onclick="submitComment(${idea.id})" style="align-self:flex-end;white-space:nowrap;padding:10px 16px">发送</button>
      </div>` : `<div style="text-align:center;padding:12px"><a onclick="closeModal('ideaDetailModal');openAuth('login')" style="color:var(--accent-fg);cursor:pointer;font-size:13px">登录后参与评论</a></div>`}
    </div>
  `;
}

async function submitComment(ideaId) {
  const input = document.getElementById('commentInput');
  if (!input) return;
  const content = input.value.trim();
  if (!content) return showToast('评论不能为空', 'error');
  const r = await apiRequest('/ideas/' + ideaId + '/comments', 'POST', { content });
  if (r.id || r.comment) {
    input.value = '';
    showToast('评论成功！');
    const commentsDiv = document.getElementById('ideaComments');
    if (commentsDiv) {
      const c = r.comment || r;
      const newHtml = `<div class="detail-comment"><div class="detail-comment-author">${state.user.nickname || '我'} <span>刚刚</span></div><div>${content}</div></div>`;
      commentsDiv.innerHTML += newHtml;
    }
  } else {
    showToast(r.error || r.message || '评论失败', 'error');
  }
}
