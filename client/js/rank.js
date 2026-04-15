function switchRankTab(tab) {
  var tabs = document.querySelectorAll('.rank-tab');
  for (var i = 0; i < tabs.length; i++) tabs[i].classList.remove('active');
  document.getElementById('rankIdeas').style.display = tab === 'ideas' ? '' : 'none';
  document.getElementById('rankSims').style.display = tab === 'sims' ? '' : 'none';
  if (tab === 'ideas') {
    tabs[0].classList.add('active');
    loadRankIdeas();
  } else {
    tabs[1].classList.add('active');
    loadRankSims();
  }
}

function loadRankIdeas() {
  var el = document.getElementById('rankIdeas');
  if (!el) return;
  el.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text3)">加载中...</div>';
  fetch('/api/ideas?sort=hot&limit=10').then(function(r) { return r.json(); }).then(function(data) {
    var ideas = data.ideas || data || [];
    if (!ideas.length) { el.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text3)">暂无数据</div>'; return; }
    var html = '';
    for (var i = 0; i < ideas.length; i++) {
      var rank = i + 1;
      var medal = rank === 1 ? '\uD83E\uDD47' : rank === 2 ? '\uD83E\uDD48' : rank === 3 ? '\uD83E\uDD49' : '#' + rank;
      var icon = ideas[i].icon || '\uD83D\uDCA1';
      var status = ideas[i].status || 'idea';
      var statusLabel = status === 'idea' ? '\uD83D\uDCA1想法' : status === 'building' ? '\uD83D\uDD27开发中' : '\u2705已上线';
      html += '<div class="rank-idea-card">';
      html += '<div class="rank-num">' + medal + '</div>';
      html += '<div class="rank-info">';
      html += '<div class="rank-idea-title"><span class="idea-icon-inline">' + icon + '</span> ' + escHtml(ideas[i].title) + ' <span class="sim-status-tag ' + status + '">' + statusLabel + '</span></div>';
      html += '<div class="rank-idea-meta">' + escHtml(ideas[i].tagline || '') + '</div>';
      html += '</div>';
      html += '<div class="rank-votes">\u25B2 ' + (ideas[i].upvotes || 0) + '</div>';
      html += '</div>';
    }
    el.innerHTML = html;
  }).catch(function() {
    el.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text3)">加载失败</div>';
  });
}

function loadRankSims() {
  var el = document.getElementById('rankSims');
  if (!el) return;
  var scores = JSON.parse(localStorage.getItem('xq_sim_scores') || '[]');
  scores.sort(function(a, b) { return b.score - a.score; });
  scores = scores.slice(0, 10);
  if (!scores.length) {
    el.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text3)">暂无模拟记录<br><small style="color:var(--text3)">完成一局创业模拟器即可上榜</small></div>';
    return;
  }
  var html = '';
  for (var i = 0; i < scores.length; i++) {
    var rank = i + 1;
    var medal = rank === 1 ? '\uD83E\uDD47' : rank === 2 ? '\uD83E\uDD48' : rank === 3 ? '\uD83E\uDD49' : '#' + rank;
    html += '<div class="rank-idea-card">';
    html += '<div class="rank-num">' + medal + '</div>';
    html += '<div class="rank-info">';
    html += '<div class="rank-idea-title">' + escHtml(scores[i].track || '未知赛道') + ' \u00B7 ' + (scores[i].quarters || 0) + '季度</div>';
    html += '<div class="rank-idea-meta">' + scores[i].date + '</div>';
    html += '</div>';
    html += '<div class="rank-votes">' + (scores[i].score / 10000).toFixed(0) + '万</div>';
    html += '</div>';
  }
  el.innerHTML = html;
}
