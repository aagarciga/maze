class Node {
  constructor(state, parent, action) {
    this.state = state;
    this.parent = parent;
    this.action = action;
  }
}

class StackFrontier {
  constructor() {
    this.frontier = [];
  }

  add(node) {
    this.frontier.push(node);
  }

  containsState(state) {
    return this.frontier.some((node) => node.state === state);
  }

  empty() {
    return this.frontier.length === 0;
  }

  remove() {
    if (this.empty()) {
      throw new Error("Empty frontier");
    } else {
      const node = this.frontier[this.frontier.length - 1];
      this.frontier = this.frontier.slice(0, -1);
      return node;
    }
  }
}

class QueueFrontier extends StackFrontier {
  remove() {
    if (this.empty()) {
      throw new Error("Empty frontier");
    } else {
      const node = this.frontier[0];
      this.frontier = this.frontier.slice(1);
      return node;
    }
  }
}

class Maze {
  constructor(filename) {
    const fs = require("fs");
    const contents = fs.readFileSync(filename, "utf8");

    // contents.count("A") != 1
    if (contents.split("A").length - 1 !== 1) {
      throw new Error("Maze must have exactly one start point");
    }
    if (contents.split("B").length - 1 !== 1) {
      throw new Error("Maze must have exactly one exit point");
    }

    const lines = contents.trim().split("\n");
    this.height = lines.length;
    // max length of line.length
    this.width = Math.max(...lines.map((line) => line.length));

    this.walls = [];
    lines.forEach((line, i) => {
      const row = [];
      for (let j = 0; j < this.width; j++) {
        const char = j < line.length ? line[j] : " ";

        if (char === "A") {
          this.start = [i, j]; //or [this.walls.length, j]
          row.push(false);
        } else if (char === "B") {
          this.exit = [this.walls.length, j]; //or [i,j]
          row.push(false);
        } else if (char === " ") {
          row.push(false);
        } else {
          row.push(true);
        }
      }
      this.walls.push(row);
    });

    this.solution = null;
  }

  print() {
    const explored = this.explored;
    const solution = this.solution !== null ? this.solution[1] : null;
    let output = "";
    for (let i = 0; i < this.height; i++) {
      for (let j = 0; j < this.width; j++) {
        if (this.walls[i][j]) {
          output += "█";
        } else if (i === this.start[0] && j === this.start[1]) {
          output += "A";
        } else if (i === this.exit[0] && j === this.exit[1]) {
          output += "B";
        } else if (
          solution !== null &&
          solution.some(([x, y]) => x === i && y === j)
        ) {
          output += "*";
        } else if (explored && this.explored.has(JSON.stringify([i, j]))) {
          output += "^";
        } else {
          output += " ";
        }
      }
      output += "\n";
    }
    console.log(output);
  }

  neighbors(state) {
    const [row, col] = state;
    const candidates = [
      ["up", [row - 1, col]],
      ["down", [row + 1, col]],
      ["left", [row, col - 1]],
      ["right", [row, col + 1]],
    ];
    const result = [];
    for (const [action, [r, c]] of candidates) {
      if (
        r >= 0 &&
        r < this.height &&
        c >= 0 &&
        c < this.width &&
        !this.walls[r][c]
      ) {
        result.push([action, [r, c]]);
      }
    }
    return result;
  }

  solve() {
    this.numExplored = 0;
    const start = new Node(this.start, null, null);
    // const frontier = new StackFrontier(); // DFS
    const frontier = new QueueFrontier(); // BFS
    frontier.add(start);

    this.explored = new Set();

    while (true) {
      if (frontier.empty()) {
        throw new Error("no solution");
      }

      const node = frontier.remove();
      this.numExplored += 1;

      // If node is the exit, then we have a solution
      if (node.state[0] === this.exit[0] && node.state[1] === this.exit[1]) {
        const actions = [];
        const cells = [];
        let currentNode = node;

        while (currentNode.parent != null) {
          actions.unshift(currentNode.action);
          cells.unshift(currentNode.state);
          currentNode = currentNode.parent;
        }
        this.solution = [actions, cells];
        return;
      }

      // mark node as explored
      this.explored.add(JSON.stringify(node.state));
      const neighbors = this.neighbors(node.state);

      //Add neighbors to frontier
      for (const [action, state] of neighbors) {
        const isInFrontier = frontier.containsState(state);
        const stateKey = JSON.stringify(state);
        const isInExplored = this.explored.has(stateKey);

        const shouldBeInFrontier = !isInFrontier && !isInExplored;
        if (shouldBeInFrontier) {
          const child = new Node(state, node, action);
          frontier.add(child);
        }
      }
    }
  }

  toImage(filename, show_solution = true, show_explored = false) {
    const { createCanvas } = require("canvas");
    const orange = [255, 79, 0];
    const orange70 = [2550, 133, 77];
    const white = [245, 245, 245];
    const gunmetal = [44, 53, 57];
    const azure = [0, 179, 255];
    const chromeYellow = [255, 167, 0];

    const cellSize = 64;
    const cellBorder = 1;

    const canvas = createCanvas(this.width * cellSize, this.height * cellSize);
    const ctx = canvas.getContext("2d");

    const solution = this.solution !== null ? this.solution[1] : null;
    for (let i = 0; i < this.height; i++) {
      for (let j = 0; j < this.width; j++) {
        let fill;
        if (this.walls[i][j]) {
          fill = gunmetal;
        } else if (i === this.start[0] && j === this.start[1]) {
          fill = chromeYellow;
        } else if (i === this.exit[0] && j === this.exit[1]) {
          fill = orange;
        } else if (
          solution !== null &&
          show_solution &&
          solution.some(([x, y]) => x === i && y === j)
        ) {
          fill = orange70;
        } else if (
          solution !== null &&
          show_explored &&
          this.explored.has(JSON.stringify([i, j]))
        ) {
          fill = azure;
        } else {
          fill = white;
        }

        ctx.fillStyle = `rgba(${fill.join(",")}, 1)`;
        ctx.fillRect(
          j * cellSize + cellBorder,
          i * cellSize + cellBorder,
          cellSize - cellBorder * 2,
          cellSize - cellBorder * 2
        );
      }
    }

    const fs = require("fs");
    const out = fs.createWriteStream(filename);
    const stream = canvas.createPNGStream();
    stream.pipe(out);
    out.on("finish", () => console.log("The PNG file was created."));
  }
}

const process = require("process");

if (process && process.argv.length !== 3) {
  console.error("Usage: node maze.js maze.txt");
  process.exit(1);
}

const mazeFile = process.argv[2];

const m = new Maze(mazeFile);

console.log("Maze:");
m.print();
console.log("Solving...");
m.solve();
console.log("States Explored:", m.numExplored);
console.log("Solution:");
m.print();
m.toImage("maze BFS.png", true, true);
