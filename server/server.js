'use strict';

const fastify = require('fastify')({ logger: true });
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { pipeline } = require('stream');
const pump = require('util').promisify(pipeline);

// ============ 配置 ============
const JWT_SECRET = process.env.JWT_SECRET || 'xingqiu-2026-secret-key-please-change';
const PORT = process.env.PORT || 3000;
const DB_PATH = path.join(__dirname, 'xingqiu.db');
const UPLOAD_DIR = path.join(__dirname, 'uploads');

// 确保上传目录存在
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ============ 数据库初始化 ============
const db = new sqlite3.Database(DB_PATH);

// 封装 db 方法为 Promise
const dbRun = (sql, params = []) => new Promise((resolve, reject) => {
  db.run(sql, params, function(err) {
    if (err) reject(err);
    else resolve(this);
  });
});

const dbGet = (sql, params = []) => new Promise((resolve, reject) => {
  db.get(sql, params, (err, row) => {
    if (err) reject(err);
    else resolve(row);
  });
});

const dbAll = (sql, params = []) => new Promise((resolve, reject) => {
  db.all(sql, params, (err, rows) => {
    if (err) reject(err);
    else resolve(rows);
  });
});

// 初始化表
const initDb = () => new Promise((resolve, reject) => {
  db.serialize(() => {
    db.run(`PRAGMA journal_mode=WAL`);
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        nickname TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        avatar TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `);
    db.run(`
      CREATE TABLE IF NOT EXISTS ideas (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        tagline TEXT,
        category TEXT,
        status TEXT DEFAULT 'idea',
        link TEXT,
        icon TEXT,
        author_id TEXT NOT NULL,
        upvotes INTEGER DEFAULT 0,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        FOREIGN KEY (author_id) REFERENCES users(id)
      )
    `);
    db.run(`
      CREATE TABLE IF NOT EXISTS votes (
        user_id TEXT NOT NULL,
        idea_id TEXT NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        PRIMARY KEY (user_id, idea_id)
      )
    `);
    db.run(`
      CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        idea_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        parent_id TEXT DEFAULT NULL,
        content TEXT NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      )
    `, (err) => {
      if (err) { reject(err); return; }
      // 兼容旧数据库：若 parent_id 列不存在则追加
      db.run(`ALTER TABLE comments ADD COLUMN parent_id TEXT DEFAULT NULL`, () => {
        resolve(); // 无论成功或失败（列已存在会报错但忽略）都 resolve
      });
    });
  });
});

// ============ 注册插件 ============
fastify.register(require('@fastify/cors'), {
  origin: true,
  credentials: true
});

fastify.register(require('@fastify/multipart'), {
  limits: { fileSize: 5 * 1024 * 1024 }
});

fastify.register(require('@fastify/static'), {
  root: UPLOAD_DIR,
  prefix: '/uploads/'
});

// ============ JWT 认证装饰器 ============
fastify.decorate('authenticate', async function(request, reply) {
  const token = request.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return reply.code(401).send({ error: '未登录' });
  }
  try {
    request.user = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return reply.code(401).send({ error: '登录已过期' });
  }
});

// ============ 路由 ============

// 健康检查
fastify.get('/api/health', async () => ({
  status: 'ok',
  time: new Date().toISOString()
}));

// 注册
fastify.post('/api/auth/register', async (request, reply) => {
  const { nickname, password } = request.body || {};

  if (!nickname || !password) {
    return reply.code(400).send({ error: '昵称和密码必填' });
  }
  if (nickname.length < 2 || nickname.length > 20) {
    return reply.code(400).send({ error: '昵称长度2-20字符' });
  }
  if (password.length < 6) {
    return reply.code(400).send({ error: '密码至少6位' });
  }

  const existing = await dbGet('SELECT id FROM users WHERE nickname = ?', [nickname]);
  if (existing) {
    return reply.code(409).send({ error: '昵称已被占用' });
  }

  const id = uuidv4();
  const passwordHash = await bcrypt.hash(password, 10);

  await dbRun('INSERT INTO users (id, nickname, password_hash) VALUES (?, ?, ?)', [id, nickname, passwordHash]);

  const token = jwt.sign({ id, nickname }, JWT_SECRET, { expiresIn: '7d' });
  return { success: true, token, user: { id, nickname } };
});

// 登录
fastify.post('/api/auth/login', async (request, reply) => {
  const { nickname, password } = request.body || {};

  const user = await dbGet('SELECT * FROM users WHERE nickname = ?', [nickname]);
  if (!user) {
    return reply.code(401).send({ error: '用户不存在' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return reply.code(401).send({ error: '密码错误' });
  }

  const token = jwt.sign({ id: user.id, nickname: user.nickname }, JWT_SECRET, { expiresIn: '7d' });
  return { success: true, token, user: { id: user.id, nickname: user.nickname, avatar: user.avatar } };
});

// 获取当前用户
fastify.get('/api/auth/me', { preHandler: [fastify.authenticate] }, async (request) => {
  const user = await dbGet('SELECT id, nickname, avatar, created_at FROM users WHERE id = ?', [request.user.id]);
  return { user };
});

// 发布想法
fastify.post('/api/ideas', { preHandler: [fastify.authenticate] }, async (request, reply) => {
  const { title, tagline, category, status, link } = request.body || {};

  if (!title) {
    return reply.code(400).send({ error: '标题必填' });
  }

  const id = uuidv4();
  await dbRun(
    'INSERT INTO ideas (id, title, tagline, category, status, link, author_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, title, tagline || '', category || '其他', status || 'idea', link || '', request.user.id]
  );

  const idea = await dbGet('SELECT * FROM ideas WHERE id = ?', [id]);
  return { success: true, idea };
});

// 获取想法列表
fastify.get('/api/ideas', async (request) => {
  const { sort = 'new', category, page = 1, limit = 20 } = request.query;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  let conditions = [];
  let params = [];

  if (category) {
    conditions.push('i.category = ?');
    params.push(category);
  }

  if (sort === 'week') {
    conditions.push("i.created_at > strftime('%s', 'now', '-7 days')");
  }

  const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  const orderClause = sort === 'hot' || sort === 'week'
    ? 'ORDER BY i.upvotes DESC, i.created_at DESC'
    : 'ORDER BY i.created_at DESC';

  const sql = `
    SELECT i.*, u.nickname as author_name, u.avatar as author_avatar,
           (SELECT COUNT(*) FROM comments WHERE idea_id=i.id) as comments_count
    FROM ideas i
    JOIN users u ON i.author_id = u.id
    ${whereClause}
    ${orderClause}
    LIMIT ? OFFSET ?
  `;

  const countSql = `SELECT COUNT(*) as total FROM ideas i ${whereClause}`;

  const ideas = await dbAll(sql, [...params, parseInt(limit), offset]);
  const countRow = await dbGet(countSql, params);

  return {
    ideas,
    total: countRow.total,
    page: parseInt(page),
    totalPages: Math.ceil(countRow.total / parseInt(limit))
  };
});

// 获取想法详情
fastify.get('/api/ideas/:id', async (request, reply) => {
  const idea = await dbGet(`
    SELECT i.*, u.nickname as author_name, u.avatar as author_avatar
    FROM ideas i
    JOIN users u ON i.author_id = u.id
    WHERE i.id = ?
  `, [request.params.id]);

  if (!idea) {
    return reply.code(404).send({ error: '想法不存在' });
  }

  const comments = await dbAll(`
    SELECT c.*, u.nickname as author_name, u.avatar as author_avatar,
           p.nickname as parent_author
    FROM comments c
    JOIN users u ON c.user_id = u.id
    LEFT JOIN comments pc ON pc.id = c.parent_id
    LEFT JOIN users p ON pc.user_id = p.id
    WHERE c.idea_id = ?
    ORDER BY c.created_at ASC
  `, [request.params.id]);

  return { idea, comments };
});

// 投票
fastify.post('/api/ideas/:id/vote', { preHandler: [fastify.authenticate] }, async (request) => {
  const { id: ideaId } = request.params;
  const { id: userId } = request.user;

  const existing = await dbGet('SELECT 1 FROM votes WHERE user_id = ? AND idea_id = ?', [userId, ideaId]);

  if (existing) {
    await dbRun('DELETE FROM votes WHERE user_id = ? AND idea_id = ?', [userId, ideaId]);
    await dbRun('UPDATE ideas SET upvotes = upvotes - 1 WHERE id = ?', [ideaId]);
    return { success: true, voted: false };
  } else {
    await dbRun('INSERT INTO votes (user_id, idea_id) VALUES (?, ?)', [userId, ideaId]);
    await dbRun('UPDATE ideas SET upvotes = upvotes + 1 WHERE id = ?', [ideaId]);
    return { success: true, voted: true };
  }
});

// 检查是否已投票
fastify.get('/api/ideas/:id/voted', { preHandler: [fastify.authenticate] }, async (request) => {
  const existing = await dbGet(
    'SELECT 1 FROM votes WHERE user_id = ? AND idea_id = ?',
    [request.user.id, request.params.id]
  );
  return { voted: !!existing };
});

// 发表评论
fastify.post('/api/ideas/:id/comments', { preHandler: [fastify.authenticate] }, async (request, reply) => {
  const { content, parent_id } = request.body || {};

  if (!content || !content.trim()) {
    return reply.code(400).send({ error: '评论内容不能为空' });
  }

  const id = uuidv4();
  await dbRun(
    'INSERT INTO comments (id, idea_id, user_id, parent_id, content) VALUES (?, ?, ?, ?, ?)',
    [id, request.params.id, request.user.id, parent_id || null, content.trim()]
  );

  const comment = await dbGet(`
    SELECT c.*, u.nickname as author_name, u.avatar as author_avatar
    FROM comments c
    JOIN users u ON c.user_id = u.id
    WHERE c.id = ?
  `, [id]);

  // 如果是回复，顺带返回被回复的评论作者昵称
  if (parent_id) {
    const parent = await dbGet('SELECT u.nickname as parent_author FROM comments c JOIN users u ON c.user_id=u.id WHERE c.id=?', [parent_id]);
    if (parent) comment.parent_author = parent.parent_author;
  }

  return { success: true, comment };
});

// 图片上传
fastify.post('/api/upload', { preHandler: [fastify.authenticate] }, async (request, reply) => {
  const data = await request.file();
  if (!data) {
    return reply.code(400).send({ error: '没有文件' });
  }

  const ext = path.extname(data.filename) || '.png';
  const filename = `${uuidv4()}${ext}`;
  const filepath = path.join(UPLOAD_DIR, filename);

  await pump(data.file, fs.createWriteStream(filepath));
  return { success: true, url: `/uploads/${filename}` };
});

// 删除自己的想法
fastify.delete('/api/ideas/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
  const idea = await dbGet('SELECT author_id FROM ideas WHERE id=?', [request.params.id]);
  if (!idea) return reply.code(404).send({ error: '想法不存在' });
  if (idea.author_id !== request.user.id) return reply.code(403).send({ error: '无权删除' });
  await dbRun('DELETE FROM comments WHERE idea_id=?', [request.params.id]);
  await dbRun('DELETE FROM votes WHERE idea_id=?', [request.params.id]);
  await dbRun('DELETE FROM ideas WHERE id=?', [request.params.id]);
  return { success: true };
});

// 删除自己的评论
fastify.delete('/api/comments/:id', { preHandler: [fastify.authenticate] }, async (request, reply) => {
  const comment = await dbGet('SELECT user_id FROM comments WHERE id=?', [request.params.id]);
  if (!comment) return reply.code(404).send({ error: '评论不存在' });
  if (comment.user_id !== request.user.id) return reply.code(403).send({ error: '无权删除' });
  // 同时删除该评论的所有回复
  await dbRun('DELETE FROM comments WHERE parent_id=?', [request.params.id]);
  await dbRun('DELETE FROM comments WHERE id=?', [request.params.id]);
  return { success: true };
});

// 个人主页信息（含想法值/等级）
fastify.get('/api/users/:id', async (request, reply) => {
  const user = await dbGet('SELECT id, nickname, avatar, created_at FROM users WHERE id=?', [request.params.id]);
  if (!user) return reply.code(404).send({ error: '用户不存在' });

  const ideas = await dbAll(`
    SELECT i.*, (SELECT COUNT(*) FROM comments WHERE idea_id=i.id) as comments_count
    FROM ideas i WHERE i.author_id=? ORDER BY i.created_at DESC
  `, [user.id]);

  // 想法值计算：发布想法+10，获得投票+2，发表评论+1
  const ideaScore = ideas.length * 10 + ideas.reduce((s, i) => s + (i.upvotes||0)*2, 0);
  const commentCount = await dbGet('SELECT COUNT(*) as cnt FROM comments WHERE user_id=?', [user.id]);
  const totalScore = ideaScore + (commentCount.cnt||0);

  return { user, ideas, totalScore, commentCount: commentCount.cnt||0 };
});

// 修改个人资料（昵称、头像）
fastify.put('/api/auth/me', { preHandler: [fastify.authenticate] }, async (request, reply) => {
  const { nickname, avatar } = request.body || {};
  const updates = [];
  const params = [];

  if (nickname) {
    if (nickname.length < 2 || nickname.length > 20) return reply.code(400).send({ error: '昵称长度2-20字符' });
    const existing = await dbGet('SELECT id FROM users WHERE nickname=? AND id!=?', [nickname, request.user.id]);
    if (existing) return reply.code(409).send({ error: '昵称已被占用' });
    updates.push('nickname=?'); params.push(nickname);
  }
  if (avatar !== undefined) {
    updates.push('avatar=?'); params.push(avatar);
  }
  if (!updates.length) return reply.code(400).send({ error: '没有要修改的内容' });

  params.push(request.user.id);
  await dbRun(`UPDATE users SET ${updates.join(',')} WHERE id=?`, params);
  const user = await dbGet('SELECT id, nickname, avatar, created_at FROM users WHERE id=?', [request.user.id]);

  // 重新签发 token（昵称可能变了）
  const token = jwt.sign({ id: user.id, nickname: user.nickname }, JWT_SECRET, { expiresIn: '7d' });
  return { success: true, user, token };
});

// ============ 启动 ============
const start = async () => {
  await initDb();
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    fastify.log.info(`Server running on port ${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
