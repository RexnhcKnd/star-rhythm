const express = require("express");
const cors = require("cors");
const fs = require("fs-extra");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;
const RANKINGS_FILE = path.join(__dirname, "rankings.json");

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "Rhythm game backend is running"
  });
});

app.get("/api/rankings", async (req, res) => {
  try {
    const exists = await fs.pathExists(RANKINGS_FILE);
    if (!exists) {
      await fs.writeJson(RANKINGS_FILE, []);
    }
    const rankings = await fs.readJson(RANKINGS_FILE);
    res.json(rankings);
  } catch (err) {
    console.error("GET /api/rankings error:", err);
    res.status(500).json({ error: "Failed to read rankings" });
  }
});

app.post("/api/rankings", async (req, res) => {
  try {
    const { name, score, maxCombo, accuracy } = req.body;

    if (!name || typeof score !== "number") {
      return res.status(400).json({ error: "Invalid ranking data" });
    }

    const exists = await fs.pathExists(RANKINGS_FILE);
    if (!exists) {
      await fs.writeJson(RANKINGS_FILE, []);
    }

    const rankings = await fs.readJson(RANKINGS_FILE);
    rankings.push({
      name,
      score,
      maxCombo: maxCombo || 0,
      accuracy: accuracy || 0,
      time: new Date().toISOString()
    });

    rankings.sort((a, b) => b.score - a.score);
    const top10 = rankings.slice(0, 10);

    await fs.writeJson(RANKINGS_FILE, top10, { spaces: 2 });
    res.json({ success: true, rankings: top10 });
  } catch (err) {
    console.error("POST /api/rankings error:", err);
    res.status(500).json({ error: "Failed to save ranking" });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
