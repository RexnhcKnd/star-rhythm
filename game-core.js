class RankingBoard {
  constructor(maxRankings = 10) {
    this.MAX_RANKINGS = Number.isInteger(maxRankings) && maxRankings > 0
      ? maxRankings
      : 10;
    this.scores = [];
  }

  load(scores) {
    this.scores = Array.isArray(scores)
      ? scores
          .map(item => this.normalizeEntry(item))
          .filter(Boolean)
      : [];

    this.sortAndTrim();
  }

  normalizeEntry(item) {
    if (!item || typeof item !== "object") return null;

    const playerName = String(item.playerName || item.name || "玩家")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 12) || "玩家";

    const score = Number(item.score);
    const speed = Number(item.speed);

    if (!Number.isFinite(score) || score < 0) return null;
    if (!Number.isFinite(speed) || speed < 0) return null;

    return {
      playerName,
      score,
      speed
    };
  }

  addScore(name, score, speed) {
    const entry = this.normalizeEntry({
      playerName: name,
      score,
      speed
    });

    if (!entry) {
      throw new Error("Invalid ranking entry");
    }

    this.scores.push(entry);
    this.sortAndTrim();
    return this.getRankings();
  }

  sortAndTrim() {
    this.scores.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.speed !== a.speed) return b.speed - a.speed;
      return a.playerName.localeCompare(b.playerName, "zh-Hans-CN");
    });

    if (this.scores.length > this.MAX_RANKINGS) {
      this.scores = this.scores.slice(0, this.MAX_RANKINGS);
    }
  }

  getRankings() {
    return this.scores.map(item => ({ ...item }));
  }
}

class RhythmGameSession {
  constructor(options = {}) {
    this.totalNotes = Number.isInteger(options.totalNotes) && options.totalNotes > 20
      ? options.totalNotes
      : 1000;

    this.rows = 10;
    this.cols = 7;
    this.noteColumns = [0, 2, 4, 6];
    this.visibleNoteRows = [1, 3, 5, 7, 9];

    this.notePositions = this.generateNotePositions(this.totalNotes);
    this.gameGrid = Array.from({ length: this.rows }, () => Array(this.cols).fill(" "));
    this.startTime = Date.now();
    this.score = 0;
    this.currentNote = 5;
    this.isGameOver = false;

    this.initializeGrid();
  }

  generateNotePositions(count) {
    return new Array(count).fill(0).map(() => {
      const index = Math.floor(Math.random() * this.noteColumns.length);
      return this.noteColumns[index];
    });
  }

  initializeGrid() {
    for (let i = 0; i < this.visibleNoteRows.length; i++) {
      const row = this.visibleNoteRows[i];
      const noteIndex = i;
      const col = this.notePositions[noteIndex];
      this.gameGrid[row][col] = "X";
    }
  }

  isValidKey(keyPressed) {
    return ["d", "f", "j", "k"].includes(keyPressed);
  }

  getExpectedKey() {
    if (this.gameGrid[9][0] === "X") return "d";
    if (this.gameGrid[9][2] === "X") return "f";
    if (this.gameGrid[9][4] === "X") return "j";
    if (this.gameGrid[9][6] === "X") return "k";
    return null;
  }

  shiftNotesDown() {
    for (let i = 9; i > 1; i -= 2) {
      for (let j = 0; j < this.cols; j++) {
        this.gameGrid[i][j] = this.gameGrid[i - 2][j];
      }
    }
  }

  fillTopRow() {
    for (let j = 0; j < this.cols; j++) {
      this.gameGrid[1][j] = " ";
    }

    if (this.currentNote < this.notePositions.length) {
      const nextCol = this.notePositions[this.currentNote];
      this.gameGrid[1][nextCol] = "X";
      return nextCol;
    }

    return null;
  }

  judge(keyPressed) {
    if (this.isGameOver) {
      return {
        status: "gameover",
        result: this.buildResult()
      };
    }

    const normalizedKey = String(keyPressed || "").toLowerCase().trim();

    if (!this.isValidKey(normalizedKey)) {
      return {
        status: "invalid",
        score: this.score,
        message: "无效按键"
      };
    }

    const expectedKey = this.getExpectedKey();
    const isCorrect = normalizedKey === expectedKey;

    if (!isCorrect) {
      this.isGameOver = true;
      return {
        status: "gameover",
        result: this.buildResult()
      };
    }

    this.shiftNotesDown();
    const newTopNotePosition = this.fillTopRow();

    this.score++;
    this.currentNote++;

    return {
      status: "hit",
      score: this.score,
      currentNote: this.currentNote,
      newTopNotePosition
    };
  }

  buildResult() {
    const endTime = Date.now();
    const totalTime = (endTime - this.startTime) / 1000;
    const notesPerSecond = this.score / Math.max(totalTime, 0.001);

    return {
      score: this.score,
      totalTime: Number(totalTime.toFixed(2)),
      notesPerSecond: Number(notesPerSecond.toFixed(2))
    };
  }

  getInitState() {
    return {
      score: this.score,
      currentNote: this.currentNote,
      notePositions: [...this.notePositions]
    };
  }
}

module.exports = {
  RankingBoard,
  RhythmGameSession
};
