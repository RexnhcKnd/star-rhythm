const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { RankingBoard, RhythmGameSession } = require("./game-core");

const app = express();
const PORT = process.env.PORT || 3000;

/**
 * 环境变量说明：
 * ALLOWED_ORIGINS=https://your-project.pages.dev,http://localhost:5500,http://127.0.0.1:5500
 * SESSION_TTL_MS=1800000
 * RANK_LIMIT=10
 */
const rankFilePath = path.join(__dirname, "rank-data.json");
const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS || 30 * 60 * 1000);
const RANK_LIMIT = Number(process.env.RANK_LIMIT || 10);

const rankingBoard = new RankingBoard(RANK_LIMIT);

/**
 * session 结构：
 * {
 *   game: RhythmGameSession,
 *   createdAt: number,
 *   lastActiveAt: number
 * }
 */
const sessions = new Map();

function parseAllowedOrigins() {
  const raw = String(process.env.ALLOWED_ORIGINS || "").trim();

  if (!raw) {
    // 开发和当前阶段部署最省事的默认放行策略
    return [
      /^https:\/\/.*\.pages\.dev$/,
      /^https?:\/\/localhost(?::\d+)?$/,
      /^https?:\/\/127\.0\.0\.1(?::\d+)?$/
    ];
  }

  return raw
    .split(",")
    .map(item => item.trim())
    .filter(Boolean);
}

const allowedOrigins = parseAllowedOrigins();

function isOriginAllowed(origin) {
  if (!origin) return true;

  return allowedOrigins.some(rule => {
    if (rule instanceof RegExp) return rule.test(origin);
    return rule === origin;
  });
}

app.use(cors({
  origin(origin, callback) {
    if (isOriginAllowed(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type"],
  optionsSuccessStatus: 204
}));

app.options("*", cors());

app.use(express.json({ limit: "1mb" }));

app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  next();
});

app.get("/", (req, res) => {
  res.send("Backend is running");
});

app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "ok",
    time: new Date().toISOString(),
    uptime: process.uptime()
  });
});

function ensureRankFile() {
  if (!fs.existsSync(rankFilePath)) {
    fs.writeFileSync(rankFilePath, "[]", "utf-8");
  }
}

function loadRankData() {
  try {
    ensureRankFile();
    const raw = fs.readFileSync(rankFilePath, "utf-8");
    const parsed = JSON.parse(raw || "[]");

    if (!Array.isArray(parsed)) {
      throw new Error("rank-data.json must contain an array");
    }

    rankingBoard.load(parsed);
    console.log("Rank data loaded");
  } catch (e) {
    console.error("loadRankData error:", e);
    rankingBoard.load([]);
  }
}

function saveRankData() {
  try {
    ensureRankFile();
    fs.writeFileSync(
      rankFilePath,
      JSON.stringify(rankingBoard.getRankings(), null, 2),
      "utf-8"
    );
  } catch (e) {
    console.error("saveRankData error:", e);
    throw e;
  }
}

function createSession() {
  const sessionId = uuidv4();
  const now = Date.now();

  sessions.set(sessionId, {
    game: new RhythmGameSession(),
    createdAt: now,
    lastActiveAt: now
  });

  return sessionId;
}

function getSession(sessionId) {
  const item = sessions.get(sessionId);
  if (!item) return null;

  const now = Date.now();
  const expired = now - item.lastActiveAt > SESSION_TTL_MS;

  if (expired) {
    sessions.delete(sessionId);
    return null;
  }

  item.lastActiveAt = now;
  return item;
}

function cleanupExpiredSessions() {
  const now = Date.now();

  for (const [sessionId, item] of sessions.entries()) {
    if (now - item.lastActiveAt > SESSION_TTL_MS) {
      sessions.delete(sessionId);
    }
  }
}

setInterval(cleanupExpiredSessions, 5 * 60 * 1000).unref();

function normalizePlayerName(input) {
  const name = String(input || "玩家").trim().replace(/\s+/g, " ");
  return name.slice(0, 12) || "玩家";
}

function toSafeNumber(value, defaultValue = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : defaultValue;
}

function badRequest(res, message) {
  return res.status(400).json({
    success: false,
    message
  });
}

loadRankData();

app.post("/api/game/init", (req, res, next) => {
  try {
    const sessionId = createSession();
    const item = sessions.get(sessionId);

    res.json({
      success: true,
      sessionId,
      ...item.game.getInitState()
    });
  } catch (e) {
    next(e);
  }
});

app.post("/api/game/judge", (req, res, next) => {
  try {
    const { sessionId, key } = req.body || {};

    if (!sessionId || typeof sessionId !== "string") {
      return badRequest(res, "缺少有效的 sessionId");
    }

    const item = getSession(sessionId);

    if (!item) {
      return res.status(400).json({
        success: false,
        message: "无效或已过期的对局会话"
      });
    }

    const normalizedKey = String(key || "").toLowerCase().trim();
    if (!normalizedKey) {
      return badRequest(res, "缺少按键信息");
    }

    const result = item.game.judge(normalizedKey);

    if (result.status === "gameover") {
      sessions.delete(sessionId);
    }

    res.json({
      success: true,
      ...result
    });
  } catch (e) {
    next(e);
  }
});

app.get("/api/game/score/:sessionId", (req, res, next) => {
  try {
    const sessionId = req.params.sessionId;
    const item = getSession(sessionId);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "对局不存在或已过期"
      });
    }

    res.json({
      success: true,
      score: toSafeNumber(item.game.score, 0)
    });
  } catch (e) {
    next(e);
  }
});

app.post("/api/game/result", (req, res, next) => {
  try {
    const { score, totalTime, notesPerSecond } = req.body || {};

    res.json({
      success: true,
      score: toSafeNumber(score, 0),
      totalTime: toSafeNumber(totalTime, 0),
      notesPerSecond: toSafeNumber(notesPerSecond, 0)
    });
  } catch (e) {
    next(e);
  }
});

app.get("/api/rank", (req, res, next) => {
  try {
    res.json({
      success: true,
      rankings: rankingBoard.getRankings()
    });
  } catch (e) {
    next(e);
  }
});

app.post("/api/rank/submit", (req, res, next) => {
  try {
    let { playerName, score, speed } = req.body || {};

    playerName = normalizePlayerName(playerName);
    score = toSafeNumber(score, NaN);
    speed = toSafeNumber(speed, NaN);

    if (!Number.isFinite(score) || score < 0) {
      return badRequest(res, "score 必须是大于等于 0 的数字");
    }

    if (!Number.isFinite(speed) || speed < 0) {
      return badRequest(res, "speed 必须是大于等于 0 的数字");
    }

    rankingBoard.addScore(playerName, score, speed);
    saveRankData();

    res.json({
      success: true,
      rankings: rankingBoard.getRankings()
    });
  } catch (e) {
    next(e);
  }
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "接口不存在"
  });
});

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);

  if (err && String(err.message || "").includes("CORS blocked")) {
    return res.status(403).json({
      success: false,
      message: "跨域请求被拒绝"
    });
  }

  res.status(500).json({
    success: false,
    message: "服务器内部错误"
  });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
  console.log("Allowed origins:", allowedOrigins);
});
