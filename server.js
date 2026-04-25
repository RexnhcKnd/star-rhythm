const express = require("express");

const app = express();
const PORT = process.env.PORT || 3000;

// 解析 JSON
app.use(express.json());

// 根路由，Railway 用它判断服务是否可访问
app.get("/", (req, res) => {
  res.status(200).send("ok");
});

// 测试接口
app.get("/health", (req, res) => {
  res.json({
    ok: true,
    port: PORT,
    time: new Date().toISOString()
  });
});

// 简单排行榜内存版（先确认服务能跑）
let rankings = [];

// 获取排行榜
app.get("/api/rankings", (req, res) => {
  res.json(rankings);
});

// 提交排行榜
app.post("/api/rankings", (req, res) => {
  try {
    const { name, score, maxCombo, accuracy } = req.body;

    if (!name || typeof score !== "number") {
      return res.status(400).json({
        success: false,
        error: "name 和 score 必填，且 score 必须是数字"
      });
    }

    rankings.push({
      name,
      score,
      maxCombo: typeof maxCombo === "number" ? maxCombo : 0,
      accuracy: typeof accuracy === "number" ? accuracy : 0,
      time: new Date().toISOString()
    });

    rankings.sort((a, b) => b.score - a.score);
    rankings = rankings.slice(0, 10);

    res.json({
      success: true,
      rankings
    });
  } catch (err) {
    console.error("POST /api/rankings error:", err);
    res.status(500).json({
      success: false,
      error: "服务器内部错误"
    });
  }
});

// 监听 Railway 提供的端口
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
