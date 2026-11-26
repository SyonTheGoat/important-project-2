const games = [
  { id: 'memory', title: 'Flip & Find', genre: 'puzzle', label: 'Puzzle', emoji: '🧠', color: '#f0edff', description: 'Match the pairs. How good is your memory?' },
  { id: '2048', title: 'Number Nook', genre: 'puzzle', label: 'Puzzle', emoji: '🔢', color: '#fff1df', description: 'Slide, merge, and reach the magic 2048 tile.' },
  { id: 'snake', title: 'Snack Snake', genre: 'arcade', label: 'Arcade', emoji: '🐍', color: '#e4f7ef', description: 'Gobble up snacks. Try not to bonk yourself.' },
  { id: 'tictactoe', title: 'Tic-Tac-Toe', genre: 'classic', label: 'Classic', emoji: '⭕', color: '#ffe9ef', description: 'A quick little brain battle against the computer.' },
  { id: 'rps', title: 'Rock Paper Scissors', genre: 'classic', label: 'Classic', emoji: '✊', color: '#e9f4ff', description: 'The timeless showdown. Pick your champion.' },
  { id: 'reaction', title: 'Quick Click', genre: 'arcade', label: 'Arcade', emoji: '⚡', color: '#fff6d9', description: 'Wait for green, then tap as fast as you can!' },
  ...(window.expansionGames || [])
];

const grid = document.querySelector('#game-grid');
const searchInput = document.querySelector('#game-search');
const countLabel = document.querySelector('#game-count');
const emptyState = document.querySelector('#empty-state');
const dialog = document.querySelector('#game-dialog');
const dialogTitle = document.querySelector('#dialog-title');
const dialogGenre = document.querySelector('#dialog-genre');
const instructions = document.querySelector('#dialog-instructions');
const gameContent = document.querySelector('#game-content');
const gameMessage = document.querySelector('#game-message');
const connectionLabel = document.querySelector('#connection-label');
let selectedGenre = 'all';
let currentGame = null;
let gameCleanup = () => {};
let tttScore = { you: 0, cpu: 0 };
let tttRoundTimer;

function renderGames() {
  const query = searchInput.value.trim().toLowerCase();
  const visible = games.filter(game => (selectedGenre === 'all' || game.genre === selectedGenre) && `${game.title} ${game.description} ${game.label}`.toLowerCase().includes(query));
  grid.innerHTML = visible.map(game => `
    <article class="game-card">
      <div class="game-card-top"><span class="game-emoji" style="background:${game.color}" aria-hidden="true">${game.emoji}</span><span class="game-tag">${game.label}</span></div>
      <h3>${game.title}</h3><p>${game.description}</p>
      <button class="play-button" type="button" data-play="${game.id}" aria-label="Play ${game.title}">↗</button>
    </article>`).join('');
  countLabel.textContent = `${visible.length} ${visible.length === 1 ? 'game' : 'games'} to explore`;
  emptyState.hidden = visible.length > 0;
}
window.renderGames = renderGames;

function showDialog(game) {
  currentGame = game.id;
  gameCleanup();
  gameCleanup = () => {};
  dialogTitle.textContent = game.title;
  dialogGenre.textContent = `${game.label} GAME`;
  instructions.textContent = game.id === 'tictactoe' ? 'You’re X. Get three in a row before the computer does. Start on Easy; switch to Smart for a challenge.' : game.id === 'memory' ? 'Turn over two cards at a time and find all 8 matching pairs.' : game.id === '2048' ? 'Use the arrow keys or swipe to slide tiles. Matching numbers combine!' : game.id === 'snake' ? 'Use arrow keys or the buttons to steer. Eat the dots and avoid the walls.' : game.id === 'rps' ? 'Choose rock, paper, or scissors. First to three wins; a tie triggers a quick tiebreak.' : game.id === 'reaction' ? 'Tap to start, wait until the surface turns green, then tap as quickly as you can.' : game.description;
  gameMessage.textContent = '';
  gameContent.innerHTML = '';
  dialog.classList.add('open');
  dialog.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  const legacyStart = { memory: startMemory, '2048': start2048, snake: startSnake, tictactoe: startTicTacToe, rps: startRps, reaction: startReaction }[game.id];
  if (legacyStart) legacyStart();
  else if (window.startExpansionGame) gameCleanup = window.startExpansionGame(game, gameContent, gameMessage);
  else gameMessage.textContent = 'This game is not available yet. Refresh the page to try again.';
  document.querySelector('#close-dialog').focus();
}

function closeDialog() {
  gameCleanup();
  gameCleanup = () => {};
  currentGame = null;
  dialog.classList.remove('open');
  dialog.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  gameContent.innerHTML = '';
  gameMessage.textContent = '';
}

grid.addEventListener('click', event => {
  const button = event.target.closest('[data-play]');
  if (button) showDialog(games.find(game => game.id === button.dataset.play));
});
document.querySelector('.filters').addEventListener('click', event => {
  const button = event.target.closest('[data-genre]');
  if (!button) return;
  selectedGenre = button.dataset.genre;
  document.querySelectorAll('.filter-chip').forEach(chip => chip.classList.toggle('active', chip === button));
  renderGames();
});
searchInput.addEventListener('input', renderGames);
document.querySelector('#close-dialog').addEventListener('click', closeDialog);
dialog.addEventListener('click', event => { if (event.target.hasAttribute('data-close-dialog')) closeDialog(); });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && dialog.classList.contains('open')) closeDialog();
  if (event.key === '/' && !dialog.classList.contains('open') && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
    event.preventDefault(); searchInput.focus();
  }
  if (!currentGame) return;
  if (currentGame === '2048') handle2048Key(event);
  if (currentGame === 'snake') handleSnakeKey(event);
  if (currentGame === 'tictactoe' && event.key.toLowerCase() === 'r') startTicTacToe();
});

function startTicTacToe() {
  clearTimeout(tttRoundTimer);
  gameCleanup = () => clearTimeout(tttRoundTimer);
  const board = Array(9).fill('');
  const wins = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  gameContent.innerHTML = `<div class="ttt-shell"><div class="ttt-scorebar"><div class="ttt-player"><span class="ttt-mark">X</span><span>You<small id="ttt-you-score">0 wins</small></span></div><div class="ttt-turn" id="ttt-turn">YOUR TURN</div><div class="ttt-player computer"><span class="ttt-mark">O</span><span>CPU<small id="ttt-cpu-score">0 wins</small></span></div></div><div class="ttt-board" role="group" aria-label="Tic tac toe board">${board.map((_, i) => `<button class="ttt-cell" type="button" data-cell="${i}" aria-label="Square ${i + 1}"></button>`).join('')}</div><div class="ttt-tools"><label for="ttt-difficulty">Opponent</label><select id="ttt-difficulty"><option value="easy">Easy</option><option value="smart">Smart</option></select><button class="game-action" type="button" id="ttt-reset">New round</button></div></div>`;
  const cells = [...gameContent.querySelectorAll('.ttt-cell')];
  let finished = false, thinking = false;
  const turnLabel = gameContent.querySelector('#ttt-turn');
  const difficulty = gameContent.querySelector('#ttt-difficulty');
  const winner = mark => wins.some(line => line.every(index => board[index] === mark));
  const endIfDone = () => {
    const winningLine = wins.find(line => line.every(index => board[index] === 'X' || board[index] === 'O') && line.every(index => board[index] === board[line[0]]));
    if (winner('X')) { tttScore.you++; gameMessage.textContent = 'Three in a row! Point to you 🎉'; finished = true; turnLabel.textContent = 'YOU WIN'; }
    else if (winner('O')) { tttScore.cpu++; gameMessage.textContent = 'The CPU got this round. Try again!'; finished = true; turnLabel.textContent = 'CPU WINS'; }
    else if (board.every(Boolean)) { gameMessage.textContent = 'A draw! Nobody scores this round.'; finished = true; turnLabel.textContent = 'DRAW'; }
    if (winningLine) winningLine.forEach(index => cells[index].classList.add('winner'));
    gameContent.querySelector('#ttt-you-score').textContent = `${tttScore.you} ${tttScore.you === 1 ? 'win' : 'wins'}`;
    gameContent.querySelector('#ttt-cpu-score').textContent = `${tttScore.cpu} ${tttScore.cpu === 1 ? 'win' : 'wins'}`;
    if (finished) cells.forEach(cell => { cell.disabled = true; });
  };
  const computerMove = () => {
    const available = board.map((mark, i) => mark ? -1 : i).filter(i => i >= 0);
    if (!available.length) return;
    const findWinningMove = (mark, squares = board) => available.find(index => { squares[index] = mark; const result = wins.some(line => line.every(cell => squares[cell] === mark)); squares[index] = ''; return result; });
    let move;
    if (difficulty.value === 'smart') {
      const scoreMove = (squares, isCpu) => {
        if (wins.some(line => line.every(index => squares[index] === 'O'))) return 10;
        if (wins.some(line => line.every(index => squares[index] === 'X'))) return -10;
        const open = squares.map((value, index) => value ? -1 : index).filter(index => index >= 0);
        if (!open.length) return 0;
        const scores = open.map(index => { squares[index] = isCpu ? 'O' : 'X'; const score = scoreMove(squares, !isCpu); squares[index] = ''; return { index, score }; });
        return isCpu ? Math.max(...scores.map(item => item.score)) : Math.min(...scores.map(item => item.score));
      };
      const ranked = available.map(index => { board[index] = 'O'; const score = scoreMove(board, false); board[index] = ''; return { index, score }; });
      const best = Math.max(...ranked.map(item => item.score));
      move = ranked.filter(item => item.score === best)[Math.floor(Math.random() * ranked.filter(item => item.score === best).length)].index;
    } else {
      const tacticalMove = findWinningMove('O') ?? findWinningMove('X');
      if (tacticalMove !== undefined && Math.random() < .42) move = tacticalMove;
      else if (board[4] === '' && Math.random() < .3) move = 4;
      else move = available[Math.floor(Math.random() * available.length)];
    }
    board[move] = 'O'; cells[move].textContent = 'O'; cells[move].classList.add('o'); cells[move].disabled = true;
    cells[move].classList.add('placed');
    thinking = false;
    turnLabel.textContent = 'YOUR TURN';
    endIfDone();
  };
  cells.forEach(cell => cell.addEventListener('click', () => {
    if (finished || thinking || board[cell.dataset.cell]) return;
    const index = Number(cell.dataset.cell);
    board[index] = 'X'; cell.textContent = 'X'; cell.disabled = true; cell.classList.add('placed');
    endIfDone();
    if (!finished) { thinking = true; turnLabel.textContent = 'CPU THINKING…'; cells.forEach(square => { if (!board[square.dataset.cell]) square.disabled = true; }); tttRoundTimer = setTimeout(() => { cells.forEach(square => { if (!board[square.dataset.cell]) square.disabled = false; }); computerMove(); }, 420); }
  }));
  gameContent.querySelector('#ttt-you-score').textContent = `${tttScore.you} ${tttScore.you === 1 ? 'win' : 'wins'}`;
  gameContent.querySelector('#ttt-cpu-score').textContent = `${tttScore.cpu} ${tttScore.cpu === 1 ? 'win' : 'wins'}`;
  gameContent.querySelector('#ttt-reset').addEventListener('click', startTicTacToe);
  gameMessage.textContent = 'Your turn!';
}

function startMemory() {
  const faces = ['🍓','🌙','🐸','🍋','🚀','🍄','🦋','🍉'];
  const deck = [...faces, ...faces].sort(() => Math.random() - 0.5);
  let open = [], matched = 0, locked = false, moves = 0, timer;
  gameContent.innerHTML = `<div class="memory-board" role="group" aria-label="Memory matching cards">${deck.map((_, i) => `<button class="memory-card" type="button" data-card="${i}" aria-label="Hidden card"></button>`).join('')}</div><button class="game-action" type="button" id="memory-reset">Shuffle cards</button>`;
  const cards = [...gameContent.querySelectorAll('.memory-card')];
  cards.forEach((card, index) => card.addEventListener('click', () => {
    if (locked || card.classList.contains('matched') || open.includes(index)) return;
    card.textContent = deck[index]; card.classList.add('revealed'); card.setAttribute('aria-label', deck[index]); open.push(index);
    if (open.length === 2) {
      moves++; gameMessage.textContent = `${moves} ${moves === 1 ? 'turn' : 'turns'} · ${matched / 2} of 8 pairs`;
      if (deck[open[0]] === deck[open[1]]) {
        open.forEach(i => cards[i].classList.add('matched'));
        matched += 2; open = [];
        if (matched === deck.length) gameMessage.textContent = `You found every pair in ${moves} turns! ✨`;
      } else {
        locked = true;
        timer = setTimeout(() => { open.forEach(i => { cards[i].textContent = ''; cards[i].classList.remove('revealed'); cards[i].setAttribute('aria-label', 'Hidden card'); }); open = []; locked = false; }, 750);
      }
    }
  }));
  gameContent.querySelector('#memory-reset').addEventListener('click', startMemory);
  gameMessage.textContent = 'Find the matching pairs!';
  gameCleanup = () => clearTimeout(timer);
}

let tileBoard = [], tileScore = 0;
function start2048() {
  tileBoard = Array(16).fill(0); tileScore = 0; addTile2048(); addTile2048(); render2048();
  gameMessage.textContent = 'Tip: keep your biggest tile in a corner.';
  const board = gameContent.querySelector('.tiles-board');
  let startX = 0, startY = 0;
  board.addEventListener('touchstart', event => { startX = event.changedTouches[0].clientX; startY = event.changedTouches[0].clientY; }, { passive: true });
  board.addEventListener('touchend', event => {
    const dx = event.changedTouches[0].clientX - startX, dy = event.changedTouches[0].clientY - startY;
    if (Math.max(Math.abs(dx), Math.abs(dy)) > 25) move2048(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  }, { passive: true });
}
function addTile2048() {
  const free = tileBoard.map((value, i) => value ? -1 : i).filter(i => i >= 0);
  if (free.length) tileBoard[free[Math.floor(Math.random() * free.length)]] = Math.random() < .9 ? 2 : 4;
}
function render2048() {
  gameContent.innerHTML = `<div class="tiles-game"><div class="tiles-header"><span class="tiles-score">Score: ${tileScore}</span><button class="game-action" id="tiles-reset" type="button" style="margin:0;padding:7px 10px">New game</button></div><div class="tiles-board" role="grid" aria-label="2048 game board">${tileBoard.map(value => `<div class="tile ${value ? (value <= 64 ? `v-${value}` : 'v-high') : ''}" role="gridcell">${value || ''}</div>`).join('')}</div></div>`;
  gameContent.querySelector('#tiles-reset').addEventListener('click', start2048);
}
function handle2048Key(event) {
  const keyMap = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' };
  if (!keyMap[event.key]) return;
  event.preventDefault(); move2048(keyMap[event.key]);
}
function move2048(direction) {
  const before = tileBoard.join(',');
  const next = tileBoard.slice();
  for (let line = 0; line < 4; line++) {
    let indexes = Array.from({ length: 4 }, (_, i) => direction === 'left' ? line * 4 + i : direction === 'right' ? line * 4 + 3 - i : direction === 'up' ? i * 4 + line : (3 - i) * 4 + line);
    let values = indexes.map(i => next[i]).filter(Boolean), merged = [];
    for (let i = 0; i < values.length; i++) {
      if (values[i] === values[i + 1]) { merged.push(values[i] * 2); tileScore += values[i] * 2; i++; }
      else merged.push(values[i]);
    }
    indexes.forEach((index, i) => { next[index] = merged[i] || 0; });
  }
  if (next.join(',') === before) return;
  tileBoard = next; addTile2048(); render2048();
  if (tileBoard.includes(2048)) gameMessage.textContent = 'You made 2048! You did it! 🎉';
  else if (!tileBoard.includes(0) && !['left','right','up','down'].some(dir => hasMoves2048(dir))) gameMessage.textContent = 'No more moves — start a new game!';
  else gameMessage.textContent = 'Keep combining those tiles!';
}
function hasMoves2048(direction) {
  for (let i = 0; i < 16; i++) {
    const neighbor = direction === 'left' ? (i % 4 ? i - 1 : -1) : direction === 'right' ? (i % 4 < 3 ? i + 1 : -1) : direction === 'up' ? (i > 3 ? i - 4 : -1) : (i < 12 ? i + 4 : -1);
    if (neighbor >= 0 && tileBoard[i] === tileBoard[neighbor]) return true;
  }
  return false;
}

let snakeState;
function startSnake() {
  if (snakeState?.timer) clearTimeout(snakeState.timer);
  gameContent.innerHTML = `<div class="snake-wrap"><canvas class="snake-board" width="300" height="300" aria-label="Snake game board"></canvas><div class="snake-controls" aria-label="Snake direction controls"><button data-dir="up" aria-label="Up">↑</button><button data-dir="left" aria-label="Left">←</button><button data-dir="down" aria-label="Down">↓</button><button data-dir="right" aria-label="Right">→</button></div><button class="game-action" type="button" id="snake-restart">Start / restart</button></div>`;
  const canvas = gameContent.querySelector('canvas'), ctx = canvas.getContext('2d');
  snakeState = { snake: [{x: 7, y: 7}, {x: 6, y: 7}, {x: 5, y: 7}], dir: 'right', next: 'right', food: {x: 11, y: 7}, score: 0, running: false, dead: false, timer: null };
  const draw = () => {
    ctx.clearRect(0, 0, 300, 300);
    ctx.fillStyle = '#f5faf7'; ctx.fillRect(0, 0, 300, 300);
    ctx.fillStyle = '#e6eee9';
    for (let y = 0; y < 15; y++) for (let x = 0; x < 15; x++) if ((x + y) % 2 === 0) ctx.fillRect(x * 20, y * 20, 20, 20);
    ctx.strokeStyle = '#71877c'; ctx.lineWidth = 5; ctx.strokeRect(2.5, 2.5, 295, 295);
    ctx.fillStyle = '#f18b72'; ctx.beginPath(); ctx.arc(snakeState.food.x * 20 + 10, snakeState.food.y * 20 + 10, 7, 0, Math.PI * 2); ctx.fill();
    snakeState.snake.forEach((part, i) => { ctx.fillStyle = i ? '#77c9a5' : '#368f68'; ctx.beginPath(); ctx.roundRect(part.x * 20 + 2, part.y * 20 + 2, 16, 16, 5); ctx.fill(); if (!i) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(part.x * 20 + 7, part.y * 20 + 7, 1.8, 0, Math.PI * 2); ctx.arc(part.x * 20 + 13, part.y * 20 + 7, 1.8, 0, Math.PI * 2); ctx.fill(); } });
  };
  const tick = () => {
    if (!snakeState.running) return;
    snakeState.dir = snakeState.next;
    const vector = { up: [0,-1], down: [0,1], left: [-1,0], right: [1,0] }[snakeState.dir];
    const head = { x: snakeState.snake[0].x + vector[0], y: snakeState.snake[0].y + vector[1] };
    const eating = head.x === snakeState.food.x && head.y === snakeState.food.y;
    if (head.x <= 0 || head.x >= 14 || head.y <= 0 || head.y >= 14 || snakeState.snake.slice(0, eating ? snakeState.snake.length : -1).some(part => part.x === head.x && part.y === head.y)) {
      snakeState.running = false; snakeState.dead = true; draw(); canvas.classList.add('snake-crashed'); gameMessage.textContent = `GAME OVER · ${snakeState.score} ${snakeState.score === 1 ? 'snack' : 'snacks'} · Tap play again`; gameContent.querySelector('#snake-restart').textContent = 'Play again'; return;
    }
    snakeState.snake.unshift(head);
    if (eating) {
      snakeState.score++; do { snakeState.food = { x: 1 + Math.floor(Math.random() * 13), y: 1 + Math.floor(Math.random() * 13) }; } while (snakeState.snake.some(part => part.x === snakeState.food.x && part.y === snakeState.food.y));
      gameMessage.textContent = `🍎 ${snakeState.score} ${snakeState.score === 1 ? 'snack' : 'snacks'}`;
    } else snakeState.snake.pop();
    draw(); snakeState.timer = setTimeout(tick, 125);
  };
  const turn = direction => {
    if (snakeState.dead) return;
    const opposite = { up: 'down', down: 'up', left: 'right', right: 'left' };
    if (direction !== opposite[snakeState.dir]) snakeState.next = direction;
    if (!snakeState.running) { snakeState.running = true; gameMessage.textContent = 'Go get those snacks!'; gameContent.querySelector('#snake-restart').textContent = 'Restart'; tick(); }
  };
  gameContent.querySelectorAll('[data-dir]').forEach(button => button.addEventListener('click', () => turn(button.dataset.dir)));
  gameContent.querySelector('#snake-restart').addEventListener('click', () => {
    if (snakeState.dead || snakeState.running) { startSnake(); snakeState.turn('right'); }
    else turn('right');
  });
  gameCleanup = () => { clearTimeout(snakeState.timer); snakeState.running = false; };
  draw(); gameMessage.textContent = 'Press an arrow key or tap a direction to start.';
  snakeState.turn = turn;
}
function handleSnakeKey(event) {
  const directions = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
  if (!directions[event.key]) return;
  event.preventDefault(); snakeState?.turn(directions[event.key]);
}

function startRps() {
  const choices = [{ name: 'Rock', icon: '✊' }, { name: 'Paper', icon: '✋' }, { name: 'Scissors', icon: '✌️' }];
  let userScore = 0, cpuScore = 0;
  gameContent.innerHTML = `<div class="rps-game"><div class="rps-scoreboard"><div class="rps-side"><span class="rps-avatar">🙂</span><strong>You</strong><b id="rps-user-score">0</b></div><div class="rps-vs">VS</div><div class="rps-side opponent"><span class="rps-avatar">🤖</span><strong>CPU</strong><b id="rps-cpu-score">0</b></div></div><div class="rps-arena"><div class="rps-reveal" id="rps-user-pick">?</div><span class="rps-lightning">✦</span><div class="rps-reveal opponent" id="rps-cpu-pick">?</div></div><p class="rps-result" id="rps-result">First to 3 points wins. Ties go to sudden death.</p><div class="rps-options" aria-label="Choose your move">${choices.map(choice => `<button type="button" class="rps-choice" data-choice="${choice.name}"><span>${choice.icon}</span>${choice.name}</button>`).join('')}</div><button class="game-action" type="button" id="rps-reset">New match</button></div>`;
  const result = gameContent.querySelector('#rps-result');
  gameContent.querySelectorAll('[data-choice]').forEach(button => button.addEventListener('click', () => {
    if (userScore >= 3 || cpuScore >= 3) return;
    const user = button.dataset.choice;
    let cpu = choices[Math.floor(Math.random() * 3)].name;
    const wasTie = user === cpu;
    if (wasTie) {
      const nonTies = choices.filter(choice => choice.name !== user);
      cpu = nonTies[Math.floor(Math.random() * nonTies.length)].name;
    }
    const userChoice = choices.find(choice => choice.name === user), cpuChoice = choices.find(choice => choice.name === cpu);
    const userPick = gameContent.querySelector('#rps-user-pick'), cpuPick = gameContent.querySelector('#rps-cpu-pick');
    userPick.textContent = userChoice.icon; cpuPick.textContent = cpuChoice.icon;
    userPick.classList.remove('pop'); cpuPick.classList.remove('pop'); void userPick.offsetWidth; userPick.classList.add('pop'); cpuPick.classList.add('pop');
    const outcome = ((user === 'Rock' && cpu === 'Scissors') || (user === 'Paper' && cpu === 'Rock') || (user === 'Scissors' && cpu === 'Paper')) ? (userScore++, 'You win the round!') : (cpuScore++, 'CPU wins the round.');
    gameContent.querySelector('#rps-user-score').textContent = userScore;
    gameContent.querySelector('#rps-cpu-score').textContent = cpuScore;
    result.textContent = `${wasTie ? `TIE BREAK · ` : ''}${user} vs ${cpu} · ${outcome}`;
    if (userScore === 3 || cpuScore === 3) gameMessage.textContent = userScore === 3 ? 'You win the match! 🏆' : 'Computer wins this time. Rematch?';
  }));
  gameContent.querySelector('#rps-reset').addEventListener('click', startRps);
}

function startReaction() {
  gameContent.innerHTML = `<div class="reaction-area" role="button" tabindex="0" aria-label="Reaction game area"><p>Tap to begin</p></div><button class="game-action" type="button" id="reaction-reset">Try again</button>`;
  const area = gameContent.querySelector('.reaction-area');
  let state = 'ready', timer, startTime;
  const reset = () => { clearTimeout(timer); state = 'ready'; area.className = 'reaction-area'; area.innerHTML = '<p>Tap to begin</p>'; gameMessage.textContent = ''; };
  const activate = () => {
    if (state === 'ready') {
      state = 'waiting'; area.classList.add('waiting'); area.innerHTML = '<p>Wait for green…</p>';
      const randomWait = 1500 + Math.random() * 4000;
      timer = setTimeout(() => { if (state !== 'waiting') return; state = 'go'; startTime = performance.now(); area.className = 'reaction-area go'; area.innerHTML = '<p>NOW! Tap! ⚡</p>'; }, randomWait);
    } else if (state === 'waiting') {
      clearTimeout(timer); state = 'early'; area.className = 'reaction-area waiting'; area.innerHTML = '<p>Too soon! Tap to try again.</p>'; gameMessage.textContent = 'Wait for the green next time.';
    } else if (state === 'go') {
      const ms = Math.round(performance.now() - startTime); state = 'done'; area.className = 'reaction-area'; area.innerHTML = `<p>${ms} ms<br>Tap to play again</p>`; gameMessage.textContent = ms < 250 ? 'Lightning fast! ⚡' : ms < 400 ? 'Nice reflexes!' : 'You can beat that!';
    } else reset();
  };
  area.addEventListener('click', activate);
  area.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); activate(); } });
  gameContent.querySelector('#reaction-reset').addEventListener('click', reset);
  gameCleanup = () => clearTimeout(timer);
}

function updateConnectionLabel() {
  connectionLabel.textContent = navigator.onLine ? 'Ready to play offline' : 'You’re offline — let’s play!';
}
window.addEventListener('online', updateConnectionLabel);
window.addEventListener('offline', updateConnectionLabel);
renderGames();
updateConnectionLabel();
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
