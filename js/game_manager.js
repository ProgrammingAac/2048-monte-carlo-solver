function GameManager(size, InputManager, Actuator, StorageManager) {
  this.size           = size; // Size of the grid
  this.inputManager   = new InputManager;
  this.storageManager = new StorageManager;
  this.actuator       = new Actuator;

  //added properties Aaron C.
  this.mcIsOn = false;
  this.treeWidthSlider = document.getElementById("width-range");
  this.treeWidthSlider.oninput = function() {
    document.getElementById("tree-width").innerHTML = this.value;
  }
  this.treeDepthSlider = document.getElementById("depth-range");
  this.treeDepthSlider.oninput = function() {
    document.getElementById("tree-depth").innerHTML = this.value;
  }
  this.mcToggle = document.getElementById("monte-carlo-toggle");
  this.mcToggle.addEventListener("click", async (e)=>{
    this.mcIsOn = !this.mcIsOn;
    if(this.mcIsOn){
      this.mcToggle.innerHTML = "Stop Tree Search";
    } else this.mcToggle.innerHTML = "Run Tree Search";

    while(this.mcIsOn) await this.mcRun();
  });
  //end of added properties Aaron C.

  this.startTiles     = 2;

  this.inputManager.on("move", this.move.bind(this));
  this.inputManager.on("restart", this.restart.bind(this));
  this.inputManager.on("keepPlaying", this.keepPlaying.bind(this));

  this.setup();
}

//added methods Aaron C.
GameManager.prototype.readTiles = function() {
  let tiles = new Array(16);

  for (let x = 0; x < this.grid.cells.length; x++){
    for (let y = 0; y < this.grid.cells[0].length; y++){
      if (this.grid.cells[x][y] === null){
        tiles[4*y+x] = 0;
      } else {
        tiles[4*y+x] = this.grid.cells[x][y].value;
      }
    }
  }

  return tiles;
}

GameManager.prototype.loadMcState = function(){
  this.restart();
  let mcGameState = JSON.parse(localStorage.getItem("mcGameState"));
  if(mcGameState !== null){
    this.storageManager.setGameState(mcGameState);
    // console.log("Game State Loaded!");
    this.setup();
  }
}

GameManager.prototype.saveMcState = function(){
  if (typeof(Storage) !== "undefined"){
    let mcGameState = this.storageManager.getGameState();
    localStorage.setItem("mcGameState", JSON.stringify(mcGameState));
    // console.log("Game State Saved!");
  }
}

GameManager.prototype.mcMove = function(){
  let beforeTiles = this.readTiles();

  // if (this.isGameTerminated()){
  //   if (!this.over){
  //     console.log("B");
  //     document.querySelector(".keep-playing-button").click();
  //   } else {
  //     console.log("C");
  //   }
  // }
  
  this.saveMcState();
  let triedMoves = new Array();

  let treeWidth = this.treeWidthSlider.value;
  let treeDepth = this.treeDepthSlider.value;

  do {
    let availableActions = [0,1,2,3];
    for (let i = 0; i < availableActions.length; i++){
      if (triedMoves.includes(i)) availableActions[i] = false;
    }
    availableActions = availableActions.filter(e => e!==false);

    if (availableActions.length === 0){
      triedMoves = new Array();
      continue;
    }
    
    let mcScores = new Array(4);
    for (let i = 0; i < 4; i++){
        
      if (triedMoves.includes(i)){
        mcScores[i] = [0];
        continue;
      }

      mcScores[i] = new Array(treeWidth);
      
      for (let j = 0; j < treeWidth; j++){
        this.loadMcState();
        let initialScore = this.score;
        this.move(i);        //first move
        this.mcMoveBranch(treeDepth);
        let gainedScore = this.score - initialScore;
        mcScores[i][j] = gainedScore;
      }
    }

    let target = new Array(4);
    for (let i = 0; i < target.length; i++){
      let sum = 0;
      let actionScores = mcScores[i];
      for (let j = 0; j < actionScores.length; j++){
        sum += actionScores[j];
      }
      target[i] = sum;
    }
    mcScores = [];

    let maxIn;
    let maxVal = 0;
    for (let i = 0; i < target.length; i++){
      if (target[i] > maxVal){
        maxVal = target[i];
        maxIn = i;
      }
    }

    let action = maxIn;

    this.loadMcState();

    this.move(action);
    triedMoves.push(action);

    afterTiles = this.readTiles();
  } while (JSON.stringify(beforeTiles) === JSON.stringify(afterTiles) && !this.isGameTerminated());
}


GameManager.prototype.mcMoveBranch = function(moves){
  let messageContainer = document.querySelector(".game-message");
  messageContainer.style.visibility = "none";
  for (let i = 0; i < moves; i++){
    this.randMove();

    if (this.isGameTerminated()){
      if (!this.over){
        this.keepPlaying = true;
        let gs = this.storageManager.getGameState();
        gs.keepPlaying = true;
        this.storageManager.setGameState(gs);
      } else {
        break;
      }
    }
  }
}

GameManager.prototype.randMove = function() {
  let beforeTiles = this.readTiles();

  let triedMoves = new Array();

  do {
    let availableActions = [0,1,2,3];
    for (let i = 0; i < availableActions.length; i++){
      if (triedMoves.includes(i)) availableActions[i] = false;
    }
    availableActions = availableActions.filter(e => e!==false);

    if (availableActions.length === 0){
      triedMoves = new Array();
      continue;
    }
    
    let action = availableActions[Math.floor(Math.random()*availableActions.length)];
    this.move(action);

    triedMoves.push(action);

  } while (JSON.stringify(beforeTiles) === JSON.stringify(this.readTiles()) && !this.isGameTerminated());

}

GameManager.prototype.mcRun = async function(){

  this.mcMove();

  if (this.isGameTerminated()){
    if (!this.over){
      this.keepPlaying = true;
      let gs = this.storageManager.getGameState();
      gs.keepPlaying = true;
      this.storageManager.setGameState(gs);
    } else {
      this.mcToggle.click();
    }
  }

  return new Promise ((resolve, reject) => {
    let wait = 500 * this.treeWidthSlider.value * this.treeDepthSlider.value / 10 / 10;
    setTimeout(()=>{
      resolve();
    }, wait);
  });
}
//end of added methods Aaron C.

// Restart the game
GameManager.prototype.restart = function () {
  this.storageManager.clearGameState();
  this.actuator.continueGame(); // Clear the game won/lost message
  this.setup();
};

// Keep playing after winning (allows going over 2048)
GameManager.prototype.keepPlaying = function () {
  this.keepPlaying = true;
  this.actuator.continueGame(); // Clear the game won/lost message
};

// Return true if the game is lost, or has won and the user hasn't kept playing
GameManager.prototype.isGameTerminated = function () {
  return this.over || (this.won && !this.keepPlaying);
};

// Set up the game
GameManager.prototype.setup = function () {
  var previousState = this.storageManager.getGameState();

  // Reload the game from a previous game if present
  if (previousState) {
    this.grid        = new Grid(previousState.grid.size,
                                previousState.grid.cells); // Reload grid
    this.score       = previousState.score;
    this.over        = previousState.over;
    this.won         = previousState.won;
    this.keepPlaying = previousState.keepPlaying;
  } else {
    this.grid        = new Grid(this.size);
    this.score       = 0;
    this.over        = false;
    this.won         = false;
    this.keepPlaying = false;

    // Add the initial tiles
    this.addStartTiles();
  }

  // Update the actuator
  this.actuate();
};

// Set up the initial tiles to start the game with
GameManager.prototype.addStartTiles = function () {
  for (var i = 0; i < this.startTiles; i++) {
    this.addRandomTile();
  }
};

// Adds a tile in a random position
GameManager.prototype.addRandomTile = function () {
  if (this.grid.cellsAvailable()) {
    var value = Math.random() < 0.9 ? 2 : 4;
    var tile = new Tile(this.grid.randomAvailableCell(), value);

    this.grid.insertTile(tile);
  }
};

// Sends the updated grid to the actuator
GameManager.prototype.actuate = function () {
  if (this.storageManager.getBestScore() < this.score) {
    this.storageManager.setBestScore(this.score);
  }

  // Clear the state when the game is over (game over only, not win)
  if (this.over) {
    this.storageManager.clearGameState();
  } else {
    this.storageManager.setGameState(this.serialize());
  }

  this.actuator.actuate(this.grid, {
    score:      this.score,
    over:       this.over,
    won:        this.won,
    bestScore:  this.storageManager.getBestScore(),
    terminated: this.isGameTerminated()
  });

};

// Represent the current game as an object
GameManager.prototype.serialize = function () {
  return {
    grid:        this.grid.serialize(),
    score:       this.score,
    over:        this.over,
    won:         this.won,
    keepPlaying: this.keepPlaying
  };
};

// Save all tile positions and remove merger info
GameManager.prototype.prepareTiles = function () {
  this.grid.eachCell(function (x, y, tile) {
    if (tile) {
      tile.mergedFrom = null;
      tile.savePosition();
    }
  });
};

// Move a tile and its representation
GameManager.prototype.moveTile = function (tile, cell) {
  this.grid.cells[tile.x][tile.y] = null;
  this.grid.cells[cell.x][cell.y] = tile;
  tile.updatePosition(cell);
};

// Move tiles on the grid in the specified direction
GameManager.prototype.move = function (direction) {
  // 0: up, 1: right, 2: down, 3: left
  var self = this;

  if (this.isGameTerminated()) return; // Don't do anything if the game's over

  var cell, tile;

  var vector     = this.getVector(direction);
  var traversals = this.buildTraversals(vector);
  var moved      = false;

  // Save the current tile positions and remove merger information
  this.prepareTiles();

  // Traverse the grid in the right direction and move tiles
  traversals.x.forEach(function (x) {
    traversals.y.forEach(function (y) {
      cell = { x: x, y: y };
      tile = self.grid.cellContent(cell);

      if (tile) {
        var positions = self.findFarthestPosition(cell, vector);
        var next      = self.grid.cellContent(positions.next);

        // Only one merger per row traversal?
        if (next && next.value === tile.value && !next.mergedFrom) {
          var merged = new Tile(positions.next, tile.value * 2);
          merged.mergedFrom = [tile, next];

          self.grid.insertTile(merged);
          self.grid.removeTile(tile);

          // Converge the two tiles' positions
          tile.updatePosition(positions.next);

          // Update the score
          self.score += merged.value;

          // The mighty 2048 tile
          if (merged.value === 2048) self.won = true;
        } else {
          self.moveTile(tile, positions.farthest);
        }

        if (!self.positionsEqual(cell, tile)) {
          moved = true; // The tile moved from its original cell!
        }
      }
    });
  });

  if (moved) {
    this.addRandomTile();

    if (!this.movesAvailable()) {
      this.over = true; // Game over!
    }

    this.actuate();
  }
};

// Get the vector representing the chosen direction
GameManager.prototype.getVector = function (direction) {
  // Vectors representing tile movement
  var map = {
    0: { x: 0,  y: -1 }, // Up
    1: { x: 1,  y: 0 },  // Right
    2: { x: 0,  y: 1 },  // Down
    3: { x: -1, y: 0 }   // Left
  };

  return map[direction];
};

// Build a list of positions to traverse in the right order
GameManager.prototype.buildTraversals = function (vector) {
  var traversals = { x: [], y: [] };

  for (var pos = 0; pos < this.size; pos++) {
    traversals.x.push(pos);
    traversals.y.push(pos);
  }

  // Always traverse from the farthest cell in the chosen direction
  if (vector.x === 1) traversals.x = traversals.x.reverse();
  if (vector.y === 1) traversals.y = traversals.y.reverse();

  return traversals;
};

GameManager.prototype.findFarthestPosition = function (cell, vector) {
  var previous;

  // Progress towards the vector direction until an obstacle is found
  do {
    previous = cell;
    cell     = { x: previous.x + vector.x, y: previous.y + vector.y };
  } while (this.grid.withinBounds(cell) &&
           this.grid.cellAvailable(cell));

  return {
    farthest: previous,
    next: cell // Used to check if a merge is required
  };
};

GameManager.prototype.movesAvailable = function () {
  return this.grid.cellsAvailable() || this.tileMatchesAvailable();
};

// Check for available matches between tiles (more expensive check)
GameManager.prototype.tileMatchesAvailable = function () {
  var self = this;

  var tile;

  for (var x = 0; x < this.size; x++) {
    for (var y = 0; y < this.size; y++) {
      tile = this.grid.cellContent({ x: x, y: y });

      if (tile) {
        for (var direction = 0; direction < 4; direction++) {
          var vector = self.getVector(direction);
          var cell   = { x: x + vector.x, y: y + vector.y };

          var other  = self.grid.cellContent(cell);

          if (other && other.value === tile.value) {
            return true; // These two tiles can be merged
          }
        }
      }
    }
  }

  return false;
};

GameManager.prototype.positionsEqual = function (first, second) {
  return first.x === second.x && first.y === second.y;
};
