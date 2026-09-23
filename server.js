const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }) 
  : null;

app.use(express.json({ limit: '100kb' }));
app.use(express.static(__dirname));

let memoryPlayers = new Map();

async function initDb() {
  if (!pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      avatar TEXT,
      mode TEXT,
      team TEXT,
      score INTEGER DEFAULT 0,
      correct_count INTEGER DEFAULT 0,
      total_questions INTEGER DEFAULT 0,
      best_streak INTEGER DEFAULT 0,
      total_time_ms BIGINT DEFAULT 0,
      updated_at BIGINT NOT NULL
    )
  `);
  await pool.query(`CREATE INDEX IF NOT EXISTS players_score_idx ON players(score DESC, total_time_ms ASC)`);
}

function cleanPlayer(body) {
  const id = String(body.id || '').trim();
  const name = String(body.name || '').trim().slice(0, 100);
  if (!id || !name) throw new Error('id and name are required');
  return {
    id,
    name,
    phone: String(body.phone || '').trim().slice(0, 30),
    avatar: String(body.avatar || '').slice(0, 10),
    mode: String(body.mode || 'individual').slice(0, 30),
    team: String(body.team || '').trim().slice(0, 100),
    score: Math.max(0, Number(body.score) || 0),
    correctCount: Math.max(0, Number(body.correctCount) || 0),
    totalQuestions: Math.max(0, Number(body.totalQuestions) || 0),
    bestStreak: Math.max(0, Number(body.bestStreak) || 0),
    totalTimeMs: Math.max(0, Number(body.totalTimeMs) || 0),
    updatedAt: Number(body.updatedAt) || Date.now()
  };
}

app.get('/api/health', async (req, res) => {
  let database = false;
  if (pool) {
    try { await pool.query('SELECT 1'); database = true; } catch (_) {}
  }
  res.json({ ok: true, database, globalLeaderboard: database });
});

app.post('/api/results', async (req, res) => {
  try {
    const p = cleanPlayer(req.body);
    if (pool) {
      await pool.query(`
        INSERT INTO players
          (id, name, phone, avatar, mode, team, score, correct_count, total_questions, best_streak, total_time_ms, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        ON CONFLICT (id) DO UPDATE SET
          name=EXCLUDED.name,
          phone=EXCLUDED.phone,
          avatar=EXCLUDED.avatar,
          mode=EXCLUDED.mode,
          team=EXCLUDED.team,
          score=EXCLUDED.score,
          correct_count=EXCLUDED.correct_count,
          total_questions=EXCLUDED.total_questions,
          best_streak=EXCLUDED.best_streak,
          total_time_ms=EXCLUDED.total_time_ms,
          updated_at=EXCLUDED.updated_at
      `, [p.id,p.name,p.phone,p.avatar,p.mode,p.team,p.score,p.correctCount,p.totalQuestions,p.bestStreak,p.totalTimeMs,p.updatedAt]);
    } else {
      memoryPlayers.set(p.id, p);
    }
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

app.get('/api/leaderboard', async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 100);

  try {
    if (pool) {
      const { rows } = await pool.query(`
        SELECT id, name, phone, avatar, mode, team, score,
               correct_count AS "correctCount",
               total_questions AS "totalQuestions",
               best_streak AS "bestStreak",
               total_time_ms AS "totalTimeMs",
               updated_at AS "updatedAt"
        FROM players
        ORDER BY score DESC, total_time_ms ASC
        LIMIT $1
      `, [limit]);

      return res.json({ players: rows });
    }

    const players = [...memoryPlayers.values()]
      .sort((a, b) => (b.score - a.score) || (a.totalTimeMs - b.totalTimeMs))
      .slice(0, limit);

    res.json({ players });

  } catch (e) {
    res.status(500).json({ players: [], error: e.message });
  }
});

// الصفحة الرئيسية
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'game.html'));
});

initDb().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Game server running on port ${PORT}`);
  });
}).catch(err => {
  console.error('Database initialization failed:', err);
  process.exit(1);
});
