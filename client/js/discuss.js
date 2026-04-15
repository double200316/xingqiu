async function loadPosts() {
  const r = await apiRequest('/posts?sort=' + state.discSort + '&limit=50');
  if (Array.isArray(r)) state.posts = r;
  else if (r.posts) state.posts = r.posts;
  return state.posts;
}

function renderDiscuss() {
  const list = document.getElementById('postList');
  if (!list) return;
  let posts = state.posts;
  if (state.discCat !== '全部') posts = posts.filter(p => p.category === state.discCat);
  if (!posts.length) { list.innerHTML = '<div class="empty-state">暂无讨论，来发表第一篇吧！</div>'; return; }
  const catColor = { '想法探讨': '#38bdf8', '产品评测': '#a78bfa', '求合伙人': '#34d399', '技术问答': '#fbbf24', '经验分享': '#fb7185' };
  list.innerHTML = posts.map(p => {
    const color = catColor[p.category] || '#94a3b8';
    return `<div class="disc-post-card" onclick="openPostDetail(${p.id})">
      <div class="disc-post-main">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:20px;background:${color}18;color:${color}">${p.category || '讨论'}</span>
          <span style="font-size:12px;color:var(--fg-subtle)">${p.author_name || p.nickname || '匿名'} · ${formatTime(p.created_at)}</span>
        </div>
        <div class="disc-post-title">${p.title}</div>
        <div class="disc-post-preview">${p.content ? p.content.slice(0, 80) + (p.content.length > 80 ? '…' : '') : ''}</div>
      </div>
      <div class="disc-post-actions">
        <button class="disc-like-btn${p.liked ? ' liked' : ''}" onclick="event.stopPropagation();likePost(${p.id})">
          ❤️ ${p.likes || p.like_count || 0}
        </button>
        <span>💬 ${p.comments_count || p.comment_count || 0}</span>
        ${state.user && (state.user.id === p.user_id) ? `<button class="disc-del-btn" onclick="event.stopPropagation();deletePost(${p.id})">删除</button>` : ''}
      </div>
    </div>`;
  }).join('');
  initScrollReveal();
}

function renderHotTopics() {
  const el = document.getElementById('hotTopics');
  if (!el) return;
  const cats = {};
  state.posts.forEach(p => cats[p.category] = (cats[p.category] || 0) + 1);
  el.innerHTML = Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 5)
    .map(([k, v]) => `<div class="cat-list-item" onclick="filterDisc('${k}',null)">${k}<span>${v}</span></div>`).join('');
}

function sortDisc(sort, el) {
  state.discSort = sort;
  document.querySelectorAll('.disc-sort-btn').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  loadPosts().then(() => { renderDiscuss(); renderHotTopics(); });
}

function filterDisc(cat, el) {
  state.discCat = cat;
  document.querySelectorAll('.disc-cat-btn').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  renderDiscuss();
}

async function likePost(id) {
  if (!state.token) { openAuth('login'); return; }
  const r = await apiRequest('/posts/' + id + '/like', 'POST');
  if (!r.error) {
    const post = state.posts.find(p => String(p.id) === String(id));
    if (post) {
      const liked = r.liked !== undefined ? r.liked : !post.liked;
      post.liked = liked;
      const key = 'likes' in post ? 'likes' : 'like_count';
      post[key] = r.like_count !== undefined ? r.like_count : (liked ? (post[key] || 0) + 1 : Math.max(0, (post[key] || 1) - 1));
    }
    renderDiscuss();
  }
}

async function deletePost(id) {
  if (!confirm('确认删除这篇帖子？')) return;
  const r = await apiRequest('/posts/' + id, 'DELETE');
  if (!r.error) { showToast('已删除'); state.posts = state.posts.filter(p => String(p.id) !== String(id)); renderDiscuss(); }
  else showToast(r.error || '删除失败', 'error');
}

function openPostModal() {
  if (!state.token) { openAuth('login'); return; }
  openModal('postModal');
}

async function submitPost() {
  const title = document.getElementById('post-title-input').value.trim();
  const content = document.getElementById('post-content-input').value.trim();
  const catEl = document.querySelector('#postCatSelect .tag-opt.selected');
  const category = catEl ? catEl.dataset.cat : '想法探讨';
  if (!title || !content) return showToast('请填写标题和内容', 'error');
  const r = await apiRequest('/posts', 'POST', { title, content, category });
  if (r.id || r.post) {
    closeModal('postModal');
    showToast('发布成功！');
    document.getElementById('post-title-input').value = '';
    document.getElementById('post-content-input').value = '';
    loadPosts().then(() => { renderDiscuss(); renderHotTopics(); });
  } else {
    showToast(r.error || r.message || '发布失败', 'error');
  }
}

async function openPostDetail(id) {
  // 在当前讨论区页面动态展开详情，或用模态框
  const r = await apiRequest('/posts/' + id);
  const post = r.post || r;
  if (!post || !post.id) return;
  const comments = Array.isArray(r.comments) ? r.comments : [];
  // 用 ideaDetailModal 借用
  openModal('ideaDetailModal');
  const body = document.getElementById('ideaDetailBody');
  if (!body) return;
  const catColor = { '想法探讨': '#38bdf8', '产品评测': '#a78bfa', '求合伙人': '#34d399', '技术问答': '#fbbf24', '经验分享': '#fb7185' };
  const color = catColor[post.category] || '#94a3b8';
  const commentHtml = comments.length
    ? comments.map(c => `<div class="detail-comment">
        <div class="detail-comment-author">${c.author_name || c.nickname || '匿名'} <span>${formatTime(c.created_at)}</span>
          ${state.user && (state.user.id === c.user_id) ? `<button class="disc-del-btn" onclick="deleteComment(${c.id},${id})" style="margin-left:8px">删除</button>` : ''}
        </div>
        <div>${c.content}</div>
      </div>`).join('')
    : '<div style="text-align:center;padding:20px;color:var(--text3);font-size:13px">暂无评论</div>';
  body.innerHTML = `
    <div style="padding:24px 28px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
        <div>
          <span style="font-size:11px;font-weight:600;padding:2px 10px;border-radius:20px;background:${color}18;color:${color}">${post.category}</span>
          <span style="font-size:12px;color:var(--fg-subtle);margin-left:8px">${post.author_name || post.nickname || '匿名'} · ${formatTime(post.created_at)}</span>
        </div>
        <button class="modal-close" onclick="closeModal('ideaDetailModal')">×</button>
      </div>
      <h2 style="font-size:18px;font-weight:600;margin-bottom:12px">${post.title}</h2>
      <div style="color:var(--fg-default);font-size:14px;line-height:1.7;white-space:pre-wrap;padding:16px;background:var(--bg-muted);border-radius:var(--radius-md);margin-bottom:16px">${post.content}</div>
      <div style="display:flex;gap:12px;padding-bottom:16px;border-bottom:1px solid var(--border-default)">
        <button class="disc-like-btn${post.liked ? ' liked' : ''}" onclick="likePost(${post.id});openPostDetail(${post.id})" style="padding:7px 14px;font-size:13px">❤️ 点赞 ${post.likes || post.like_count || 0}</button>
        ${state.user && (state.user.id === post.user_id) ? `<button class="disc-del-btn" onclick="deletePost(${post.id});closeModal('ideaDetailModal')">删除帖子</button>` : ''}
      </div>
      <h3 style="font-size:14px;font-weight:600;margin:16px 0 12px">评论 (${comments.length})</h3>
      <div id="postComments">${commentHtml}</div>
      ${state.token ? `
      <div style="margin-top:16px;display:flex;gap:8px">
        <textarea id="postCommentInput" placeholder="发表你的看法…" style="flex:1;padding:10px;border:1px solid var(--border-default);border-radius:var(--radius-md);font-size:13px;resize:none;height:72px;font-family:var(--font);background:var(--bg);color:var(--fg-default)"></textarea>
        <button class="btn-cta" onclick="submitPostComment(${post.id})" style="align-self:flex-end;white-space:nowrap;padding:10px 16px">发送</button>
      </div>` : `<div style="text-align:center;padding:12px"><a onclick="closeModal('ideaDetailModal');openAuth('login')" style="color:var(--accent-fg);cursor:pointer;font-size:13px">登录后参与评论</a></div>`}
    </div>
  `;
}

async function submitPostComment(postId) {
  const input = document.getElementById('postCommentInput');
  if (!input) return;
  const content = input.value.trim();
  if (!content) return showToast('评论不能为空', 'error');
  const r = await apiRequest('/posts/' + postId + '/comments', 'POST', { content });
  if (r.id || r.comment) {
    input.value = ''; showToast('评论成功！');
    openPostDetail(postId);
  } else {
    showToast(r.error || r.message || '评论失败', 'error');
  }
}

async function deleteComment(commentId, postId) {
  if (!confirm('确认删除？')) return;
  const r = await apiRequest('/post-comments/' + commentId, 'DELETE');
  if (!r.error) { showToast('已删除'); openPostDetail(postId); }
  else showToast(r.error || '删除失败', 'error');
}
