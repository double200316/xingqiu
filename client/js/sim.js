function fmtMoney(n) {
  if (n >= 100000000) return '¥' + (n / 100000000).toFixed(1) + '亿';
  if (n >= 10000) return '¥' + (n / 10000).toFixed(0) + '万';
  return '¥' + n.toLocaleString();
}

function selectTrack(track, el) {
  state.simSelectedTrack = track;
  document.querySelectorAll('.sim-track-card').forEach(c => c.classList.remove('selected'));
  if (el) el.classList.add('selected');
}

function showSimStart() {
  document.getElementById('simStartOverlay').style.display = 'flex';
}

function closeSimStart() {
  document.getElementById('simStartOverlay').style.display = 'none';
}

function showSimSaves() {
  document.getElementById('simSavesOverlay').style.display = 'flex';
  renderSimSaves();
}

function closeSimSaves() {
  document.getElementById('simSavesOverlay').style.display = 'none';
}

async function startNewGame() {
  const name = document.getElementById('simCompanyName').value.trim();
  if (!name) return showToast('请给公司取个名字', 'error');
  const track = state.simSelectedTrack || 'consumer';
  const trackCfg = SIM_TRACKS[track];
  closeSimStart();
  state.simSelectedAction = null;
  state.simDialogues = [];
  if (state.token) {
    const r = await apiRequest('/sim/new', 'POST', { company_name: name, track });
    if (r.id || r.game) {
      const g = r.game || r;
      state.simState = {
        id: g.id, company: name, track, round: 1,
        money: g.money || trackCfg.initMoney,
        product: g.product || 10, market: g.market || 5,
        reputation: g.reputation || 10, morale: g.morale || 70,
        revenue: 0, totalRevenue: 0, phase: g.phase || 1,
        team: g.team || [], history: [],
      };
    } else {
      state.simState = createLocalSimState(name, track, trackCfg);
    }
  } else {
    state.simState = createLocalSimState(name, track, trackCfg);
  }
  showSimGame();
}

function createLocalSimState(name, track, trackCfg) {
  return {
    id: null, company: name, track, round: 1,
    money: trackCfg.initMoney, product: 10, market: 5,
    reputation: 10, morale: 70, revenue: 0, totalRevenue: 0,
    phase: 1, team: [], history: [],
  };
}

function showSimGame() {
  document.getElementById('simNoGame').style.display = 'none';
  document.getElementById('simGameArea').style.display = 'block';
  renderSimFull();
}

function renderSimFull() {
  if (!state.simState) return;
  const s = state.simState;
  // 公司名
  document.getElementById('simCompanyNameDisplay').textContent = s.company;
  const trackName = SIM_TRACKS[s.track] ? SIM_TRACKS[s.track].name : s.track;
  document.getElementById('simTrackDisplay').textContent = trackName;
  document.getElementById('simRoundDisplay').textContent = `第 ${s.round} 季度`;
  // 阶段进度条
  const phases = ['种子期', '初创期', '成长期', '扩张期', 'IPO'];
  const phaseBar = document.getElementById('simPhaseBar');
  if (phaseBar) {
    phaseBar.innerHTML = phases.map((p, i) => `<div class="sim-phase-step${i < s.phase ? ' done' : (i === s.phase - 1 ? ' active' : '')}"></div>`).join('');
  }
  const phaseLabels = document.getElementById('simPhaseLabels');
  if (phaseLabels) phaseLabels.innerHTML = phases.map(p => `<span>${p}</span>`).join('');
  // 财务
  document.getElementById('simMoney').textContent = fmtMoney(s.money);
  document.getElementById('simRevenue').textContent = fmtMoney(s.revenue || 0);
  document.getElementById('simSalaryCost').textContent = fmtMoney(calcSalaryCost(s));
  document.getElementById('simTotalRevenue').textContent = fmtMoney(s.totalRevenue || 0);
  // 指标
  ['product', 'market', 'reputation', 'morale'].forEach(k => {
    const val = Math.max(0, Math.min(100, s[k] || 0));
    const barId = { product: 'simProgressBar', market: 'simMarketBar', reputation: 'simRepBar', morale: 'simMoraleBar' }[k];
    const valId = { product: 'simProgress', market: 'simMarket', reputation: 'simReputation', morale: 'simMorale' }[k];
    const bar = document.getElementById(barId);
    const valEl = document.getElementById(valId);
    if (bar) bar.style.width = val + '%';
    if (valEl) valEl.textContent = k === 'product' ? val + '%' : val;
  });
  // 团队
  renderSimTeam();
  // 行动
  renderSimActions();
  // 历史
  renderSimHistory();
}

function calcSalaryCost(s) {
  const team = s.team || [];
  return team.reduce((sum, id) => {
    const npc = SIM_NPCS.find(n => n.id === id);
    return sum + (npc ? npc.salary : 0);
  }, 0);
}

function renderSimTeam() {
  const s = state.simState;
  const grid = document.getElementById('simTeamGrid');
  if (!grid || !s) return;
  const count = (s.team || []).length;
  document.getElementById('simTeamCount').textContent = count + '/17';
  grid.innerHTML = SIM_SLOTS.map(slot => {
    const hasMember = s.team && s.team.includes(slot.id);
    const npc = SIM_NPCS.find(n => n.id === slot.id);
    if (hasMember && npc) {
      return `<div class="sim-team-slot filled" title="${npc.desc}">
        <div class="sim-slot-avatar">${npc.name[0]}</div>
        <div class="sim-slot-name">${npc.name}</div>
        <div class="sim-slot-role">${npc.role}</div>
        <button class="sim-slot-remove" onclick="removeTeamMember('${slot.id}')">×</button>
      </div>`;
    }
    return `<div class="sim-team-slot empty" onclick="openRecruitModal('${slot.id}')">
      <div class="sim-slot-label">${slot.label}</div>
      <div class="sim-slot-add">+ 招募</div>
    </div>`;
  }).join('');
}

function renderSimActions() {
  const s = state.simState;
  const grid = document.getElementById('simActionsGrid');
  if (!grid || !s) return;
  grid.innerHTML = SIM_ACTIONS.map(a => {
    const isLocked = a.locked_without && !a.locked_without.some(id => s.team && s.team.includes(id));
    const isSelected = state.simSelectedAction === a.id;
    let condHint = '';
    if (isLocked) {
      const names = a.locked_without.map(id => { const n = SIM_NPCS.find(x => x.id === id); return n ? n.role : id; });
      condHint = `需要: ${names.join('/')}`;
    }
    return `<div class="sim-action-card${isSelected ? ' selected' : ''}${isLocked ? ' locked' : ''}" onclick="${isLocked ? '' : `selectSimAction('${a.id}')`}" title="${condHint || a.desc}">
      <div class="sim-action-icon">${a.icon}</div>
      <div class="sim-action-name">${a.name}</div>
      <div class="sim-action-desc">${isLocked ? condHint : a.desc}</div>
      ${a.cost > 0 ? `<div class="sim-action-cost">花费 ${fmtMoney(a.cost)}</div>` : ''}
    </div>`;
  }).join('');
  const btn = document.getElementById('simExecBtn');
  if (btn) btn.style.opacity = state.simSelectedAction ? '1' : '0.5';
}

function selectSimAction(id) {
  state.simSelectedAction = id;
  renderSimActions();
  const hint = document.getElementById('simActionHint');
  const action = SIM_ACTIONS.find(a => a.id === id);
  if (hint && action) hint.textContent = action.desc;
}

function renderSimHistory() {
  const s = state.simState;
  const list = document.getElementById('simHistoryList');
  if (!list || !s) return;
  const history = s.history || [];
  const count = document.getElementById('simHistoryCount');
  if (count) count.textContent = history.length ? `共 ${history.length} 季度` : '';
  if (!history.length) {
    list.innerHTML = '<div style="text-align:center;padding:24px;color:var(--text3);font-size:12px">执行行动后，这里会显示每季度的记录...</div>';
    return;
  }
  list.innerHTML = history.slice().reverse().map((h, idx) => {
    const moneyColor = h.moneyChange >= 0 ? 'color:var(--success)' : 'color:var(--danger)';
    const actionInfo = SIM_ACTIONS.find(a => a.id === h.action);
    const eventHtml = h.event ? `<div class="sim-history-event">${h.event.text}</div>` : '';
    const upgradeHtml = h.phaseUp ? `<span class="sim-history-upgrade">阶段升级 → ${['','种子期','初创期','成长期','扩张期','IPO'][h.newPhase] || ''}</span>` : '';
    return `<div class="sim-history-item">
      <div class="sim-history-round">第 ${h.round} 季度${upgradeHtml}</div>
      <div class="sim-history-action">${actionInfo ? actionInfo.icon + ' ' + actionInfo.name : h.action}</div>
      ${eventHtml}
      <div class="sim-history-stats">
        ${h.moneyChange !== 0 ? `<span style="${moneyColor}">${h.moneyChange > 0 ? '+' : ''}${fmtMoney(h.moneyChange)}</span>` : ''}
        ${h.productChange ? `<span style="color:var(--accent)">产品${h.productChange > 0 ? '+' : ''}${h.productChange}</span>` : ''}
        ${h.marketChange ? `<span style="color:var(--violet)">市场${h.marketChange > 0 ? '+' : ''}${h.marketChange}</span>` : ''}
        ${h.repChange ? `<span style="color:var(--success)">口碑${h.repChange > 0 ? '+' : ''}${h.repChange}</span>` : ''}
        ${h.moraleChange ? `<span style="color:var(--warning)">士气${h.moraleChange > 0 ? '+' : ''}${h.moraleChange}</span>` : ''}
      </div>
    </div>`;
  }).join('');
}

async function executeSimAction() {
  if (!state.simSelectedAction) return showToast('请先选择一个行动', 'error');
  const s = state.simState;
  const action = SIM_ACTIONS.find(a => a.id === state.simSelectedAction);
  if (!action) return;
  // 检查费用
  if (action.cost > 0 && s.money < action.cost) return showToast('资金不足，无法执行', 'error');

  // 本地计算结果
  const result = calcActionResult(s, action);
  // 扣除费用
  s.money -= action.cost;
  // 应用效果
  applyEffects(s, result.effects);
  // 扣除薪资
  const salary = calcSalaryCost(s);
  s.money -= salary;
  const moneyChange = result.effects.money ? result.effects.money - action.cost - salary : -action.cost - salary;

  // 随机事件
  let event = null;
  if (Math.random() < 0.35) {
    event = SIM_EVENTS[Math.floor(Math.random() * SIM_EVENTS.length)];
    applyEffects(s, event.effects);
  }

  // 更新收入
  const rev = calcRevenue(s);
  s.revenue = rev;
  s.totalRevenue = (s.totalRevenue || 0) + rev;
  s.money += rev;

  // 阶段升级
  let phaseUp = false;
  let newPhase = s.phase;
  const phaseThresholds = [0, 0, 30, 60, 85, 100];
  if (s.phase < 5 && s.product >= phaseThresholds[s.phase + 1] && s.market >= phaseThresholds[s.phase]) {
    s.phase++;
    phaseUp = true;
    newPhase = s.phase;
  }

  // 记录历史
  s.history = s.history || [];
  s.history.push({
    round: s.round,
    action: state.simSelectedAction,
    event,
    moneyChange,
    productChange: result.effects.product || 0,
    marketChange: result.effects.market || 0,
    repChange: result.effects.reputation || 0,
    moraleChange: result.effects.morale || 0,
    phaseUp, newPhase,
  });

  s.round++;

  // AI 对话
  if (state.token) {
    generateNPCDialogue(s, action, event, result);
  } else {
    addLocalDialogue(s, action, event);
  }

  state.simSelectedAction = null;

  // 检查游戏结束
  if (s.money <= 0 || s.morale <= 0) {
    showGameOver('lose');
  } else if (s.phase >= 5) {
    showGameOver('win');
  } else {
    renderSimFull();
    // 保存进度
    if (state.token && s.id) saveCurrentGame();
  }
}

function calcActionResult(s, action) {
  const effects = {};
  if (action.effects) {
    Object.entries(action.effects).forEach(([k, v]) => {
      if (Array.isArray(v)) {
        effects[k] = Math.floor(Math.random() * (v[1] - v[0] + 1)) + v[0];
      } else {
        effects[k] = v;
      }
    });
  }
  return { effects };
}

function applyEffects(s, effects) {
  if (!effects) return;
  if (effects.product) s.product = Math.min(100, (s.product || 0) + effects.product);
  if (effects.market) s.market = Math.min(100, (s.market || 0) + effects.market);
  if (effects.reputation) s.reputation = Math.min(100, (s.reputation || 0) + effects.reputation);
  if (effects.morale) s.morale = Math.max(0, Math.min(100, (s.morale || 0) + effects.morale));
  if (effects.money) s.money = Math.max(0, s.money + effects.money);
  if (effects.revenue) s.revenue = (s.revenue || 0) + effects.revenue;
}

function calcRevenue(s) {
  const trackCfg = SIM_TRACKS[s.track] || {};
  const base = (s.product / 100) * (s.market / 100) * 100000;
  const multi = trackCfg.revenueMulti || 1;
  return Math.floor(base * multi * (0.8 + Math.random() * 0.4));
}

function addLocalDialogue(s, action, event) {
  const team = s.team || [];
  if (!team.length) return;
  const npcId = team[Math.floor(Math.random() * team.length)];
  const npc = SIM_NPCS.find(n => n.id === npcId);
  if (!npc) return;
  const templates = [
    `这个 "${SIM_ACTIONS.find(a => a.id === action.id)?.name}" 方向不错，我们继续加油！`,
    `老板，数据有改善，不过还需要更多时间验证。`,
    `团队最近状态不错，感觉对的！`,
    `这一季压力不小，但我们扛过来了。`,
    `市场反应比预期好，下一步要加速。`,
  ];
  const text = templates[Math.floor(Math.random() * templates.length)];
  const roundLabel = `第 ${s.round - 1} 季度`;
  appendDialogue(npc, text, roundLabel);
}

async function generateNPCDialogue(s, action, event, result) {
  const team = s.team || [];
  if (!team.length) return addLocalDialogue(s, action, event);
  // 随机选 1-2 个 NPC
  const shuffled = team.slice().sort(() => Math.random() - 0.5).slice(0, Math.min(2, team.length));
  const roundLabel = `第 ${s.round - 1} 季度`;
  const actionName = SIM_ACTIONS.find(a => a.id === action.id)?.name || action.id;

  for (const npcId of shuffled) {
    const npc = SIM_NPCS.find(n => n.id === npcId);
    if (!npc) continue;
    try {
      const r = await apiRequest('/sim/dialogue', 'POST', {
        npc_id: npcId,
        npc_name: npc.name,
        npc_role: npc.role,
        action: actionName,
        event: event ? event.text : null,
        company: s.company,
        round: s.round - 1,
        metrics: { product: s.product, market: s.market, reputation: s.reputation, morale: s.morale, money: s.money },
      });
      const text = r.dialogue || r.text || r.message || npc.desc;
      appendDialogue(npc, text, roundLabel);
    } catch (e) {
      addLocalDialogue(s, action, event);
    }
  }
}

function appendDialogue(npc, text, roundLabel) {
  const feed = document.getElementById('simDialogueFeed');
  if (!feed) return;

  // 如果是新回合，加分隔线
  const lastRound = feed.dataset.lastRound;
  if (lastRound !== roundLabel) {
    feed.dataset.lastRound = roundLabel;
    if (feed.children.length > 0) {
      const divider = document.createElement('div');
      divider.className = 'sim-dialogue-divider';
      divider.textContent = roundLabel;
      feed.appendChild(divider);
    }
  }

  // 清除空状态提示
  const empty = feed.querySelector('[style*="text-align:center"]');
  if (empty) empty.remove();

  const item = document.createElement('div');
  item.className = 'sim-dialogue-item';
  const idx = state.simDialogues.length;
  item.style.animationDelay = (idx % 4 * 0.15) + 's';
  item.innerHTML = `<div class="sim-dialogue-avatar">${npc.name[0]}</div>
    <div class="sim-dialogue-content">
      <div class="sim-dialogue-name">${npc.name} <span class="sim-dialogue-role">${npc.role}</span></div>
      <div class="sim-dialogue-text">${text}</div>
    </div>`;
  feed.appendChild(item);
  state.simDialogues.push({ npc, text });
  // 滚动到底部
  setTimeout(() => { feed.scrollTop = feed.scrollHeight; }, 100);
}

function openRecruitModal(slotId) {
  currentRecruitSlot = slotId;
  recruitFilter = '全部';
  const label = document.getElementById('simRecruitSlotLabel');
  if (label) {
    if (slotId) {
      const slot = SIM_SLOTS.find(s => s.id === slotId);
      label.textContent = '正在招募：' + (slot ? slot.label : slotId);
    } else {
      label.textContent = '选择要招募的成员';
    }
  }
  document.getElementById('simRecruitOverlay').style.display = 'flex';
  renderRecruitGrid();
}

function closeRecruitModal() {
  document.getElementById('simRecruitOverlay').style.display = 'none';
}

function setRecruitFilter(f, el) {
  recruitFilter = f;
  document.querySelectorAll('.sim-recruit-filter-btn').forEach(b => b.classList.remove('active'));
  if (el) el.classList.add('active');
  renderRecruitGrid();
}

function renderRecruitGrid() {
  const grid = document.getElementById('simRecruitGrid');
  if (!grid) return;
  const s = state.simState;
  const inTeam = s ? (s.team || []) : [];
  let npcs = SIM_NPCS;
  if (recruitFilter !== '全部') npcs = npcs.filter(n => n.type === recruitFilter);
  // 筛选标签 header
  const counts = { '全部': SIM_NPCS.length, '高管': SIM_NPCS.filter(n => n.type === '高管').length, '执行层': SIM_NPCS.filter(n => n.type === '执行层').length, '外部': SIM_NPCS.filter(n => n.type === '外部').length };
  const filterHtml = `<div class="sim-recruit-filters">
    ${['全部','高管','执行层','外部'].map(f => `<button class="sim-recruit-filter-btn${recruitFilter === f ? ' active' : ''}" onclick="setRecruitFilter('${f}',this)">${f} (${counts[f]})</button>`).join('')}
  </div>`;
  grid.innerHTML = filterHtml + npcs.map(npc => {
    const inT = inTeam.includes(npc.id);
    const top3traits = Object.entries(npc.traits).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const traitsHtml = top3traits.map(([k, v]) => `<span class="sim-npc-trait${v >= 85 ? ' high' : ''}">${k}: ${v}</span>`).join('');
    return `<div class="sim-npc-card${inT ? ' in-team' : ''}">
      <div class="sim-npc-card-top">
        <div class="sim-npc-avatar">${npc.name[0]}</div>
        <div>
          <div class="sim-npc-name">${npc.name}</div>
          <div class="sim-npc-role">${npc.role} · ${npc.type}</div>
          <div class="sim-npc-salary">${npc.salary > 0 ? '月薪 ' + fmtMoney(npc.salary) : '无需薪资'}</div>
        </div>
      </div>
      <div class="sim-npc-desc">${npc.desc}</div>
      <div class="sim-npc-traits">${traitsHtml}</div>
      <button class="sim-btn sim-btn-sm${inT ? '' : ' sim-btn-primary'}" onclick="${inT ? `removeTeamMember('${npc.id}')` : `recruitMember('${npc.id}')`}">
        ${inT ? '已在团队' : '招募'}
      </button>
    </div>`;
  }).join('');
}

async function recruitMember(npcId) {
  const s = state.simState;
  if (!s) return;
  s.team = s.team || [];
  if (!s.team.includes(npcId)) s.team.push(npcId);
  closeRecruitModal();
  renderSimFull();
  showToast('招募成功！');
}

function removeTeamMember(npcId) {
  const s = state.simState;
  if (!s) return;
  s.team = (s.team || []).filter(id => id !== npcId);
  renderSimFull();
  showToast('已移出团队');
}

async function saveCurrentGame() {
  if (!state.token || !state.simState) return;
  const s = state.simState;
  if (!s.id) return;
  await apiRequest('/sim/' + s.id + '/save', 'POST', { state: s });
  showToast('进度已保存');
}

async function renderSimSaves() {
  const list = document.getElementById('simSavesList');
  if (!list) return;
  list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text3)">加载中…</div>';
  if (!state.token) { list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text3)">请登录后查看存档</div>'; return; }
  const r = await apiRequest('/sim/saves');
  const saves = Array.isArray(r) ? r : (r.saves || []);
  if (!saves.length) { list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--text3)">暂无存档</div>'; return; }
  list.innerHTML = saves.map(s => `<div class="sim-save-item">
    <div><div style="font-weight:600">${s.company_name || s.company}</div>
    <div style="font-size:12px;color:var(--text3)">${(SIM_TRACKS[s.track] || {}).name || s.track} · 第${s.round || 1}季度</div></div>
    <button class="sim-btn sim-btn-sm sim-btn-primary" onclick="loadSave(${s.id})">读取</button>
  </div>`).join('');
}

async function loadSave(id) {
  const r = await apiRequest('/sim/' + id);
  const g = r.game || r;
  if (!g || !g.id) { showToast('读取失败', 'error'); return; }
  state.simDialogues = [];
  state.simState = {
    id: g.id, company: g.company_name || g.company, track: g.track,
    round: g.round || 1, money: g.money || 500000,
    product: g.product || 10, market: g.market || 5,
    reputation: g.reputation || 10, morale: g.morale || 70,
    revenue: g.revenue || 0, totalRevenue: g.total_revenue || 0,
    phase: g.phase || 1, team: g.team || [], history: g.history || [],
  };
  closeSimSaves();
  showSimGame();
  showToast('存档已读取');
}

function showGameOver(result) {
  const overlay = document.getElementById('simGameOverOverlay');
  const icon = document.getElementById('simGameOverIcon');
  const title = document.getElementById('simGameOverTitle');
  const reason = document.getElementById('simGameOverReason');
  const stats = document.getElementById('simGameOverStats');
  const s = state.simState;
  if (result === 'win') {
    if (icon) icon.textContent = '🎉';
    if (title) title.textContent = '恭喜！成功 IPO！';
    if (reason) reason.textContent = '你带领公司走到了上市的那一天！';
  } else {
    if (s.money <= 0) {
      if (icon) icon.textContent = '💸';
      if (title) title.textContent = '资金耗尽';
      if (reason) reason.textContent = '账上已经没钱了，这次创业就到这里。';
    } else {
      if (icon) icon.textContent = '😞';
      if (title) title.textContent = '团队解散';
      if (reason) reason.textContent = '士气跌到谷底，团队分崩离析。';
    }
  }
  // 统计
  const roi = s.totalRevenue > 0 ? ((s.totalRevenue / (SIM_TRACKS[s.track]?.initMoney || 500000) - 1) * 100).toFixed(0) : 0;
  const achievements = calcAchievements(s);
  if (stats) stats.innerHTML = `
    <div class="sim-gameover-stats">
      <div class="sim-gameover-stat"><div class="val">${s.round - 1}</div><div class="label">季度</div></div>
      <div class="sim-gameover-stat"><div class="val">${fmtMoney(s.money)}</div><div class="label">剩余资金</div></div>
      <div class="sim-gameover-stat"><div class="val">${fmtMoney(s.totalRevenue)}</div><div class="label">累计收入</div></div>
      <div class="sim-gameover-stat"><div class="val ${roi >= 0 ? 'green' : 'red'}">${roi >= 0 ? '+' : ''}${roi}%</div><div class="label">ROI</div></div>
      <div class="sim-gameover-stat"><div class="val">${s.product}%</div><div class="label">产品完成度</div></div>
      <div class="sim-gameover-stat"><div class="val">${s.market}</div><div class="label">市场份额</div></div>
      <div class="sim-gameover-stat"><div class="val">${(s.team || []).length}</div><div class="label">团队规模</div></div>
      <div class="sim-gameover-stat"><div class="val">${s.reputation}</div><div class="label">最终口碑</div></div>
    </div>
    ${achievements.length ? `<div class="sim-achievements">${achievements.map(a => `<span class="sim-achievement${a.gold ? ' gold' : ''}">${a.name}</span>`).join('')}</div>` : ''}
  `;
  overlay.style.display = 'flex';
}

function calcAchievements(s) {
  const achs = [];
  if ((s.round || 1) >= 20) achs.push({ name: '长期主义', gold: true });
  if (s.product >= 90) achs.push({ name: '产品大师', gold: true });
  if (s.market >= 80) achs.push({ name: '市场霸主', gold: true });
  if (s.reputation >= 80) achs.push({ name: '口碑王者', gold: false });
  if (s.morale >= 80) achs.push({ name: '铁血团队', gold: false });
  if ((s.team || []).length >= 10) achs.push({ name: '团队扩张', gold: false });
  if (s.phase >= 5) achs.push({ name: '🏆 IPO达成', gold: true });
  return achs;
}

function closeSimGameOver() {
  document.getElementById('simGameOverOverlay').style.display = 'none';
}

function showPoster() {
  var s = state.simState;
  if (!s) { showToast('暂无游戏数据', 'error'); return; }
  var score = Math.round((s.totalRevenue || 0) / 10000);
  var subtitle = score >= 50000 ? '估值超5亿！创业传奇' : score >= 10000 ? '估值过亿！表现优异' : score >= 5000 ? '成功拿到B轮！' : score >= 1000 ? '成功拿到A轮！' : score >= 500 ? '天使轮完成！' : score >= 100 ? '成功存活！' : '创业路上，继续加油！';
  var emoji = score >= 50000 ? '🏆' : score >= 10000 ? '💎' : score >= 5000 ? '🌟' : score >= 1000 ? '🚀' : score >= 500 ? '🙌' : score >= 100 ? '👍' : '💪';
  var trackCfg = SIM_TRACKS[s.track] || {};
  var trackName = trackCfg.name || s.track;
  document.getElementById('posterEmoji').textContent = emoji;
  document.getElementById('posterTitle').textContent = '创业成绩单';
  document.getElementById('posterSubtitle').textContent = subtitle;
  document.getElementById('posterTrack').textContent = trackName + ' · 第' + (s.round - 1) + '季度';
  var statsHtml = '<div class="poster-stat"><span class="poster-stat-label">💰 总收入</span><span class="poster-stat-value">' + fmtMoney(s.totalRevenue || 0) + '</span></div>';
  statsHtml += '<div class="poster-stat"><span class="poster-stat-label">💵 剩余资金</span><span class="poster-stat-value">' + fmtMoney(s.money || 0) + '</span></div>';
  statsHtml += '<div class="poster-stat"><span class="poster-stat-label">📊 产品进度</span><span class="poster-stat-value">' + (s.product || 0) + '%</span></div>';
  statsHtml += '<div class="poster-stat"><span class="poster-stat-label">👥 团队规模</span><span class="poster-stat-value">' + (s.team || []).length + '人</span></div>';
  document.getElementById('posterStats').innerHTML = statsHtml;
  var achs = calcAchievements(s).slice(0, 5);
  var achHtml = achs.length ? achs.map(a => '<span class="poster-ach">' + a.name + '</span>').join('') : '<span class="poster-ach">初次创业</span>';
  document.getElementById('posterAchievements').innerHTML = achHtml;
  document.getElementById('posterOverlay').style.display = 'flex';
}

function closePoster() {
  document.getElementById('posterOverlay').style.display = 'none';
}

function downloadPoster() {
  var el = document.getElementById('posterCard');
  if (!el) return;
  if (typeof html2canvas === 'undefined') {
    showToast('海报组件加载中，请稍后再试', 'error');
    return;
  }
  html2canvas(el, { backgroundColor: '#0f172a', scale: 2, useCORS: true }).then(function(canvas) {
    var link = document.createElement('a');
    link.download = 'xingqiu-poster-' + Date.now() + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('海报已保存');
  }).catch(function() {
    showToast('生成失败，请重试', 'error');
  });
}

function saveSimLocal() {
  // 本地存档已迁移到 state.simState，此函数保留为空避免调用报错
}

function loadSimLocal() {
  try {
    var data = JSON.parse(localStorage.getItem('xq_sim_save') || 'null');
    return data;
  } catch (e) { return null; }
}

function hasSimSave() {
  return !!localStorage.getItem('xq_sim_save');
}
