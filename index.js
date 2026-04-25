const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { RankingBoard, RhythmGameSession } = require("./game-core");

const app = express();
const PORT = process.env.PORT || 3000;

const rankFilePath = path.join(__dirname, "rank-data.json");
const sessions = new Map();
const rankingBoard = new RankingBoard(10);

app.use(cors());
app.use(express.json());

function loadRankData() {
  try {
    if (!fs.existsSync(rankFilePath)) {
      fs.writeFileSync(rankFilePath, "[]", "utf-8");
    }
    const raw = fs.readFileSync(rankFilePath, "utf-8");
    const parsed = JSON.parse(raw || "[]");
    rankingBoard.load(parsed);
  } catch (e) {
    rankingBoard.load([]);
  }
}

function saveRankData() {
  fs.writeFileSync(
    rankFilePath,
    JSON.stringify(rankingBoard.getRankings(), null, 2),
    "utf-8"
  );
}

loadRankData();

/**
 * 游戏对局初始化接口
 */
app.post("/api/game/init", (req, res) => {
  const sessionId = uuidv4();
  const session = new RhythmGameSession();
  sessions.set(sessionId, session);

  res.json({
    success: true,
    sessionId,
    ...session.getInitState()
  });
});

/**
 * 按键判定接收接口
 */
app.post("/api/game/judge", (req, res) => {
  const { sessionId, key } = req.body || {};

  if (!sessionId || !sessions.has(sessionId)) {
    return res.status(400).json({
      success: false,
      message: "无效的对局会话"
    });
  }

  const session = sessions.get(sessionId);
  const result = session.judge(String(key || "").toLowerCase());

  if (result.status === "gameover") {
    sessions.delete(sessionId);
  }

  res.json({
    success: true,
    ...result
  });
});

/**
 * 分数同步接口
 */
app.get("/api/game/score/:sessionId", (req, res) => {
  const sessionId = req.params.sessionId;
  if (!sessions.has(sessionId)) {
    return res.status(404).json({
      success: false,
      message: "对局不存在"
    });
  }

  const session = sessions.get(sessionId);
  res.json({
    success: true,
    score: session.score
  });
});

/**
 * 结算数据提交接口（预留）
 */
app.post("/api/game/result", (req, res) => {
  const { score, totalTime, notesPerSecond } = req.body || {};
  res.json({
    success: true,
    score: Number(score || 0),
    totalTime: Number(totalTime || 0),
    notesPerSecond: Number(notesPerSecond || 0)
  });
});

/**
 * 排行榜查询接口
 */
app.get("/api/rank", (req, res) => {
  res.json({
    success: true,
    rankings: rankingBoard.getRankings()
  });
});

/**
 * 排行榜写入/排序接口
 */
app.post("/api/rank/submit", (req, res) => {
  let { playerName, score, speed } = req.body || {};

  playerName = String(playerName || "玩家").trim().slice(0, 4);
  score = Number(score || 0);
  speed = Number(speed || 0);

  rankingBoard.addScore(playerName, score, speed);
  saveRankData();

  res.json({
    success: true,
    rankings: rankingBoard.getRankings()
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
