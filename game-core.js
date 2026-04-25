class RankingBoard {
  constructor(maxRankings = 10) {
    this.MAX_RANKINGS = maxRankings;
    this.scores = [];
  }

  load(scores) {
    this.scores = Array.isArray(scores) ? scores : [];
    this.sortAndTrim();
  }

  addScore(name, score, speed) {
    const entry = {
      playerName: name,
      score: Number(score),
      speed: Number(speed)
    };
    this.scores.push(entry);
    this.sortAndTrim();
    return this.scores;
  }

  sortAndTrim() {
    this.scores.sort((a, b) => b.score - a.score);
    if (this.scores.length > this.MAX_RANKINGS) {
      this.scores = this.scores.slice(0, this.MAX_RANKINGS);
    }
  }

  getRankings() {
    return this.scores;
  }
}

class RhythmGameSession {
  constructor() {
    this.notePositions = new Array(1000).fill(0).map(() => {
      return Math.floor(Math.random() * 4) * 2;
    });

    this.gameGrid = Array.from({ length: 10 }, () => Array(7).fill(" "));
    this.startTime = Date.now();
    this.score = 0;
    this.currentNote = 5;
    this.isGameOver = false;

    for (let i = 0; i < 10; i++) {
      if (i % 2 === 1) {
        for (let j = 0; j < 7; j++) {
          this.gameGrid[i][j] = (j === this.notePositions[i * 2]) ? "X" : " ";
        }
      }
    }
  }

  judge(keyPressed) {
    if (this.isGameOver) {
      return {
        status: "gameover",
        result: this.buildResult()
      };
    }

    let isCorrect = false;

    if (keyPressed === "d" && this.gameGrid[9][0] === "X") {
      isCorrect = true;
    } else if (keyPressed === "f" && this.gameGrid[9][2] === "X") {
      isCorrect = true;
    } else if (keyPressed === "j" && this.gameGrid[9][4] === "X") {
      isCorrect = true;
    } else if (keyPressed === "k" && this.gameGrid[9][6] === "X") {
      isCorrect = true;
    }

    if (isCorrect) {
      for (let i = 9; i > 1; i -= 2) {
        for (let j = 0; j < 7; j++) {
          this.gameGrid[i][j] = this.gameGrid[i - 2][j];
        }
      }

      for (let j = 0; j < 7; j++) {
        this.gameGrid[1][j] = (j === this.notePositions[this.currentNote]) ? "X" : " ";
      }

      this.score++;
      const newTopNotePosition = this.notePositions[this.currentNote];
      this.currentNote++;

      return {
        status: "hit",
        score: this.score,
        currentNote: this.currentNote,
        newTopNotePosition
      };
    } else {
      this.isGameOver = true;
      return {
        status: "gameover",
        result: this.buildResult()
      };
    }
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
      notePositions: this.notePositions
    };
  }
}

module.exports = {
  RankingBoard,
  RhythmGameSession
};
