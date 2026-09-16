// STRICT SINGLE-WORD DATABASES (EXACTLY 10 WORDS EACH)
const WORD_DATABASE = {
  manglish: [
    { civilian: "Porotta", imposter: "Chappathi" },
    { civilian: "Lalettan", imposter: "Mammootty" },
    { civilian: "Kappi", imposter: "Chaya" },
    { civilian: "Kochi", imposter: "Trivandrum" },
    { civilian: "Biriyani", imposter: "Friedrice" },
    { civilian: "Sadya", imposter: "Payasam" },
    { civilian: "Thattukada", imposter: "Restaurant" },
    { civilian: "Autokaaran", imposter: "Busdriver" },
    { civilian: "Football", imposter: "Cricket" },
    { civilian: "Cinema", imposter: "Natakam" }
  ],
  english: [
    { civilian: "Pizza", imposter: "Burger" },
    { civilian: "Doctor", imposter: "Nurse" },
    { civilian: "Guitar", imposter: "Piano" },
    { civilian: "Batman", imposter: "Superman" },
    { civilian: "Coffee", imposter: "Tea" },
    { civilian: "iPhone", imposter: "Android" },
    { civilian: "Laptop", imposter: "Desktop" },
    { civilian: "Football", imposter: "Basketball" },
    { civilian: "Airplane", imposter: "Helicopter" },
    { civilian: "Hospital", imposter: "Pharmacy" }
  ]
};

// Game State
let activeGameMode = 'local'; // 'local' or 'online'
let totalPlayers = 5;
let imposterCount = 1;
let players = [];
let currentTurnIndex = 0;
let activeCivilianWord = "";
let activeImposterWord = "";
let timerInterval = null;
let secondsLeft = 0;

// PeerJS Online Multiplayer Vars
let peer = null;
let connectedPeers = [];
let roomCode = "";

// DOM Elements
const setupStage = document.getElementById("setupStage");
const revealStage = document.getElementById("revealStage");
const gameplayStage = document.getElementById("gameplayStage");
const resultStage = document.getElementById("resultStage");

const categorySelect = document.getElementById("categorySelect");
const playerCountRange = document.getElementById("playerCountRange");
const playerCountLabel = document.getElementById("playerCountLabel");
const playerNamesContainer = document.getElementById("playerNamesContainer");
const imposterCountSelect = document.getElementById("imposterCountSelect");
const imposterNotice = document.getElementById("imposterNotice");
const onlineModeBox = document.getElementById("onlineModeBox");

// Mode Switcher
function switchGameMode(mode) {
  activeGameMode = mode;
  const tabLocalBtn = document.getElementById("tabLocalBtn");
  const tabOnlineBtn = document.getElementById("tabOnlineBtn");

  if (mode === 'local') {
    tabLocalBtn.classList.add("active");
    tabOnlineBtn.classList.remove("active");
    onlineModeBox.classList.add("d-none");
    document.getElementById("modeBadge").innerText = "Pass The Phone 📱";
  } else {
    tabOnlineBtn.classList.add("active");
    tabLocalBtn.classList.remove("active");
    onlineModeBox.classList.remove("d-none");
    document.getElementById("modeBadge").innerText = "Online Room 🌐";
  }
}

// Render dynamic player name inputs
function renderPlayerNameInputs(count) {
  playerNamesContainer.innerHTML = "";
  for (let i = 1; i <= count; i++) {
    const col = document.createElement("div");
    col.className = "col-6 col-md-4";
    col.innerHTML = `
      <input type="text" id="playerNameInput_${i}" class="form-control form-control-sm" placeholder="Player ${i}">
    `;
    playerNamesContainer.appendChild(col);
  }
}

// Initial render
renderPlayerNameInputs(5);

// Player slider listener
playerCountRange.addEventListener("input", (e) => {
  totalPlayers = parseInt(e.target.value);
  playerCountLabel.innerText = `${totalPlayers} Players`;

  renderPlayerNameInputs(totalPlayers);

  imposterCountSelect.innerHTML = "";
  if (totalPlayers < 5) {
    imposterCountSelect.innerHTML = `<option value="1">1 Imposter</option>`;
    imposterNotice.style.display = "block";
    imposterCount = 1;
  } else {
    imposterNotice.style.display = "none";
    const maxImposters = Math.floor(totalPlayers / 2);
    for (let i = 1; i <= maxImposters; i++) {
      const opt = document.createElement("option");
      opt.value = i;
      opt.innerText = `${i} Imposter${i > 1 ? 's' : ''}`;
      imposterCountSelect.appendChild(opt);
    }
  }
});

// Create Online Room (PeerJS Host)
function createOnlineRoom() {
  roomCode = Math.floor(1000 + Math.random() * 9000).toString();
  peer = new Peer(`aalmar-room-${roomCode}`);

  peer.on('open', (id) => {
    document.getElementById("roomCodeDisplayBox").classList.remove("d-none");
    document.getElementById("generatedRoomCode").innerText = roomCode;
  });

  peer.on('connection', (conn) => {
    connectedPeers.push(conn);
    document.getElementById("connectedPlayersCount").innerText = `${connectedPeers.length + 1} Players Connected`;
  });
}

function showJoinRoomInput() {
  document.getElementById("joinRoomArea").classList.toggle("d-none");
}

// Join Online Room (PeerJS Client)
function joinOnlineRoom() {
  const code = document.getElementById("roomCodeInput").value.trim();
  if (!code) return alert("Please enter a valid 4-digit code!");

  peer = new Peer();
  peer.on('open', () => {
    const conn = peer.connect(`aalmar-room-${code}`);
    conn.on('open', () => {
      alert("Connected to Room! Waiting for host to start...");
    });

    conn.on('data', (data) => {
      if (data.type === 'START_GAME') {
        activeCivilianWord = data.civilianWord;
        activeImposterWord = data.imposterWord;
        players = data.players;
        setupStage.classList.add("d-none");
        onlineModeBox.classList.add("d-none");
        revealStage.classList.remove("d-none");
        currentTurnIndex = data.myIndex;
        updateRevealTurn();
      }
    });
  });
}

// Start Game
function startGame() {
  const category = categorySelect.value;
  const db = WORD_DATABASE[category];
  const randomPair = db[Math.floor(Math.random() * db.length)];
  activeCivilianWord = randomPair.civilian;
  activeImposterWord = randomPair.imposter;

  imposterCount = parseInt(imposterCountSelect.value);

  players = [];
  for (let i = 1; i <= totalPlayers; i++) {
    const inputVal = document.getElementById(`playerNameInput_${i}`)?.value.trim();
    const finalName = inputVal !== "" ? inputVal : `Player ${i}`;
    players.push({ id: i, name: finalName, isImposter: false });
  }

  // Shuffle & assign imposters
  let assigned = 0;
  while (assigned < imposterCount) {
    let randIdx = Math.floor(Math.random() * totalPlayers);
    if (!players[randIdx].isImposter) {
      players[randIdx].isImposter = true;
      assigned++;
    }
  }

  // If Online Host, broadcast secret roles to clients
  if (activeGameMode === 'online' && connectedPeers.length > 0) {
    connectedPeers.forEach((conn, index) => {
      conn.send({
        type: 'START_GAME',
        civilianWord: activeCivilianWord,
        imposterWord: activeImposterWord,
        players: players,
        myIndex: index + 1
      });
    });
  }

  currentTurnIndex = 0;
  setupStage.classList.add("d-none");
  onlineModeBox.classList.add("d-none");
  revealStage.classList.remove("d-none");
  updateRevealTurn();
}

function updateRevealTurn() {
  const p = players[currentTurnIndex];
  document.getElementById("turnIndicator").innerText = `Player ${currentTurnIndex + 1} of ${totalPlayers}`;
  document.getElementById("currentPlayerName").innerText = p.name;
  
  const cardContainer = document.getElementById("roleCard");
  const cardBackView = document.getElementById("cardBackView");
  const roleBadge = document.getElementById("roleBadge");
  const wordDisplay = document.getElementById("wordDisplay");
  const roleDescription = document.getElementById("roleDescription");

  cardContainer.classList.remove("flipped");
  document.getElementById("nextPlayerBtn").disabled = true;

  if (p.isImposter) {
    cardBackView.className = "card-back imposter-theme";
    roleBadge.className = "badge bg-danger mb-2 fs-6 pulse-animation";
    roleBadge.innerText = "IMPOSTER 🕵️‍♂️";
    wordDisplay.innerText = activeImposterWord;
    roleDescription.innerText = "Blend in! Pretend you know the real civilian word.";
  } else {
    cardBackView.className = "card-back";
    roleBadge.className = "badge bg-success mb-2 fs-6";
    roleBadge.innerText = "CIVILIAN 😇";
    wordDisplay.innerText = activeCivilianWord;
    roleDescription.innerText = "Spot the player who gives suspicious clues!";
  }
}

function flipCard() {
  document.getElementById("roleCard").classList.toggle("flipped");
  document.getElementById("nextPlayerBtn").disabled = false;
}

function nextPlayerTurn() {
  currentTurnIndex++;
  if (currentTurnIndex < totalPlayers) {
    updateRevealTurn();
  } else {
    startDiscussionPhase();
  }
}

function startDiscussionPhase() {
  revealStage.classList.add("d-none");
  gameplayStage.classList.remove("d-none");

  const randomSpeaker = players[Math.floor(Math.random() * players.length)];
  document.getElementById("firstSpeakerName").innerText = `${randomSpeaker.name} goes first! 🗣️`;

  const timerSecs = parseInt(document.getElementById("timerSelect").value);

  if (timerSecs > 0) {
    secondsLeft = timerSecs;
    updateTimerUI(secondsLeft, timerSecs);
    
    timerInterval = setInterval(() => {
      secondsLeft--;
      updateTimerUI(secondsLeft, timerSecs);
      if (secondsLeft <= 0) {
        clearInterval(timerInterval);
      }
    }, 1000);
  } else {
    document.getElementById("timerContainer").classList.add("d-none");
  }
}

function updateTimerUI(left, total) {
  const mins = Math.floor(left / 60).toString().padStart(2, '0');
  const secs = (left % 60).toString().padStart(2, '0');
  document.getElementById("timerDisplay").innerText = `${mins}:${secs}`;
  const pct = (left / total) * 100;
  document.getElementById("timerBar").style.width = `${pct}%`;
}

function revealResults() {
  if (timerInterval) clearInterval(timerInterval);
  gameplayStage.classList.add("d-none");
  resultStage.classList.remove("d-none");

  const imposters = players.filter(p => p.isImposter).map(p => p.name).join(", ");
  document.getElementById("imposterNamesDisplay").innerText = imposters;
  document.getElementById("civilianWordResult").innerText = activeCivilianWord;
  document.getElementById("imposterWordResult").innerText = activeImposterWord;
}

function resetToSetup() {
  resultStage.classList.add("d-none");
  setupStage.classList.remove("d-none");
  if (activeGameMode === 'online') {
    onlineModeBox.classList.remove("d-none");
  }
}