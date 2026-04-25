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

app.get("/", (req, res) => {
  res.send("Backend is running");
});

function loadRankData() {
  try {
    if (!fs.existsSync(rankFilePath)) {
      fs.writeFileSync(rankFilePath, "[]", "utf-8");
    }
    const raw = fs.readFileSync(rankFilePath, "utf-8");
    const parsed = JSON.parse(raw || "[]");
    rankingBoard.load(parsed);
    console.log("Rank data loaded");
  } catch (e) {
    console.error("loadRankData error:", e);
    rankingBoard.load([]);
  }
}

function saveRankData() {
  try {
    fs.writeFileSync(
      rankFilePath,
      JSON.stringify(rankingBoard.getRankings(), null, 2),
      "utf-8"
    );
  } catch (e) {
    console.error("saveRankData error:", e);
  }
}

loadRankData();

app.post("/api/game/init", (req, res) => {
  try {
    const sessionId = uuidv4();
    const session = new RhythmGameSession();
    sessions.set(sessionId, session);

    res.json({
      success: true,
      sessionId,
      ...session.getInitState()
    });
  } catch (e) {
    console.error("/api/game/init error:", e);
    res.status(500).json({ success: false, message: "init error" });
  }
});

app.post("/api/game/judge", (req, res) => {
  try {
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
  } catch (e) {
    console.error("/api/game/judge error:", e);
    res.status(500).json({ success: false, message: "judge error" });
  }
});

app.get("/api/game/score/:sessionId", (req, res) => {
  try {
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
  } catch (e) {
    console.error("/api/game/score error:", e);
    res.status(500).json({ success: false, message: "score error" });
  }
});

app.post("/api/game/result", (req, res) => {
  try {
    const { score, totalTime, notesPerSecond } = req.body || {};
    res.json({
      success: true,
      score: Number(score || 0),
      totalTime: Number(totalTime || 0),
      notesPerSecond: Number(notesPerSecond || 0)
    });
  } catch (e) {
    console.error("/api/game/result error:", e);
    res.status(500).json({ success: false, message: "result error" });
  }
});

app.get("/api/rank", (req, res) => {
  try {
    res.json({
      success: true,
      rankings: rankingBoard.getRankings()
    });
  } catch (e) {
    console.error("/api/rank error:", e);
    res.status(500).json({ success: false, message: "rank error" });
  }
});

app.post("/api/rank/submit", (req, res) => {
  try {
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
  } catch (e) {
    console.error("/api/rank/submit error:", e);
    res.status(500).json({ success: false, message: "submit error" });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
});
