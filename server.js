const express = require("express");
const path = require("path");
const fs = require("fs-extra");

const app = express();
const PORT = 3000;

const PUBLIC_DIR = path.join(__dirname, "public");
const RANKING_FILE = path.join(__dirname, "rankings.json");
const MAX_RANKINGS = 10;

app.use(express.json());
app.use(express.static(PUBLIC_DIR));

async function ensureRankingFile() {
  const exists = await fs.pathExists(RANKING_FILE);
  if (!exists) {
    await fs.writeJson(RANKING_FILE, [], { spaces: 2 });
  }
}

function normalizeEntry(item = {}) {
  return {
    playerName: String(item.playerName || "----").slice(0, 4),
    score: Number(item.score || 0),
    speed: Number(item.speed || 0),
    combo: Number(item.combo || 0),
    rank: String(item.rank || "C"),
    createdAt: item.createdAt || new Date().toISOString()
  };
}

function sortRankings(list) {
  return list.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (b.speed !== a.speed) return b.speed - a.speed;
    return b.combo - a.combo;
  });
}

app.get("/api/rankings", async (req, res) => {
  try {
    await ensureRankingFile();
    const list = await fs.readJson(RANKING_FILE);
    res.json(sortRankings(list).slice(0, MAX_RANKINGS));
  } catch (err) {
    res.status(500).json({ message: "Failed to load rankings" });
  }
});

app.post("/api/rankings", async (req, res) => {
  try {
    await ensureRankingFile();

    const { playerName, score, speed, combo, rank } = req.body || {};

    if (!playerName || typeof playerName !== "string") {
      return res.status(400).json({ message: "Invalid playerName" });
    }

    const entry = normalizeEntry({
      playerName,
      score,
      speed,
      combo,
      rank
    });

    const list = await fs.readJson(RANKING_FILE);
    list.push(entry);

    const sorted = sortRankings(list).slice(0, MAX_RANKINGS);
    await fs.writeJson(RANKING_FILE, sorted, { spaces: 2 });

    res.json({ message: "Ranking saved", data: entry });
  } catch (err) {
    res.status(500).json({ message: "Failed to save ranking" });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

app.listen(PORT, async () => {
  await ensureRankingFile();
  console.log(`Server running at http://localhost:${PORT}`);
});
