// ==========================================
// 1. WORD DATABASES
// ==========================================
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

// State
let activeGameMode = 'local'; 
let totalPlayers = 5;
let imposterCount = 1;
let players = [];
let currentTurnIndex = 0;
let activeCivilianWord = "";
let activeImposterWord = "";
let timerInterval = null;
let secondsLeft = 0;

// Online Specific
let currentRoomCode = "";
let myPlayerId = "";
let isHost = false;

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
const onlineModeBox = document.getElementById("onlineModeBox");

function switchGameMode(mode) {
  activeGameMode = mode;
  const tabLocalBtn = document.getElementById("tabLocalBtn");
  const tabOnlineBtn = document.getElementById("tabOnlineBtn");
  const localPlayerCountBox = document.getElementById("localPlayerCountBox");
  const localPlayerNamesBox = document.getElementById("localPlayerNamesBox");

  if (mode === 'local') {
    tabLocalBtn.classList.add("active");
    tabOnlineBtn.classList.remove("active");
    onlineModeBox.classList.add("d-none");
    localPlayerCountBox.classList.remove("d-none");
    localPlayerNamesBox.classList.remove("d-none");
    document.getElementById("modeBadge").innerText = "Pass The Phone 📱";
  } else {
    tabOnlineBtn.classList.add("active");
    tabLocalBtn.classList.remove("active");
    onlineModeBox.classList.remove("d-none");
    localPlayerCountBox.classList.add("d-none");
    localPlayerNamesBox.classList.add("d-none");
    document.getElementById("modeBadge").innerText = "Online Room 🌐";
  }
}

function renderPlayerNameInputs(count) {
  playerNamesContainer.innerHTML = "";
  for (let i = 1; i <= count; i++) {
    const col = document.createElement("div");
    col.className = "col-6 col-md-4";
    col.innerHTML = `<input type="text" id="playerNameInput_${i}" class="form-control form-control-sm" placeholder="Player ${i}">`;
    playerNamesContainer.appendChild(col);
  }
}
renderPlayerNameInputs(5);

playerCountRange.addEventListener("input", (e) => {
  totalPlayers = parseInt(e.target.value);
  playerCountLabel.innerText = `${totalPlayers} Players`;
  renderPlayerNameInputs(totalPlayers);
});

// ==========================================
// 2. ONLINE ROOM MULTIPLAYER LOGIC
// ==========================================
function createOnlineRoom() {
  if (typeof firebase === 'undefined') {
    return alert("Firebase not initialized yet! Check HTML scripts.");
  }
  const db = firebase.database();
  isHost = true;
  document.getElementById("joinRoomArea").classList.add("d-none");
  
  document.getElementById("btnCreateRoom").classList.add("btn-info", "text-dark");
  document.getElementById("btnCreateRoom").classList.remove("btn-outline-info");
  document.getElementById("btnJoinRoom").classList.add("btn-outline-warning");
  document.getElementById("btnJoinRoom").classList.remove("btn-warning", "text-dark");

  currentRoomCode = Math.floor(1000 + Math.random() * 9000).toString();
  myPlayerId = "host_" + Date.now();

  const roomRef = db.ref('rooms/' + currentRoomCode);
  roomRef.set({
    status: 'LOBBY',
    createdAt: Date.now(),
    players: {
      [myPlayerId]: { name: "Host (You)", isHost: true }
    }
  });

  document.getElementById("roomCodeDisplayBox").classList.remove("d-none");
  document.getElementById("generatedRoomCode").innerText = currentRoomCode;

  // Listen for players joining in real-time
  roomRef.child('players').on('value', (snapshot) => {
    const playersList = snapshot.val() || {};
    const ul = document.getElementById("playersUl");
    ul.innerHTML = "";
    players = [];
    Object.keys(playersList).forEach((id) => {
      const p = playersList[id];
      ul.innerHTML += `<li>${p.name} ${p.isHost ? '(Host)' : ''}</li>`;
      players.push({ id: id, name: p.name, isImposter: p.isImposter || false });
    });
  });
}

function showJoinRoomInput() {
  document.getElementById("roomCodeDisplayBox").classList.add("d-none");
  document.getElementById("joinRoomArea").classList.remove("d-none");

  document.getElementById("btnJoinRoom").classList.add("btn-warning", "text-dark");
  document.getElementById("btnJoinRoom").classList.remove("btn-outline-warning");
  document.getElementById("btnCreateRoom").classList.add("btn-outline-info");
  document.getElementById("btnCreateRoom").classList.remove("btn-info", "text-dark");
}

function joinOnlineRoom() {
  if (typeof firebase === 'undefined') {
    return alert("Firebase not initialized yet! Check HTML scripts.");
  }
  const db = firebase.database();
  const code = document.getElementById("roomCodeInput").value.trim();
  const name = document.getElementById("playerNameOnline").value.trim() || "Player";
  if (!code) return alert("Enter 4-digit room code!");

  currentRoomCode = code;
  myPlayerId = "player_" + Date.now();

  const roomRef = db.ref('rooms/' + currentRoomCode);
  roomRef.once('value', (snapshot) => {
    if (!snapshot.exists()) {
      return alert("Room not found! Check code.");
    }

    roomRef.child('players/' + myPlayerId).set({
      name: name,
      isHost: false
    });

    alert("Joined room! Wait for host to start.");

    // Listen for Host starting game
    roomRef.on('value', (snap) => {
      const data = snap.val();
      if (data && data.status === 'STARTED') {
        activeCivilianWord = data.civilianWord;
        activeImposterWord = data.imposterWord;
        players = Object.values(data.players);

        const myData = data.players[myPlayerId];
        setupStage.classList.add("d-none");
        onlineModeBox.classList.add("d-none");
        revealStage.classList.remove("d-none");

        showIndividualRole(myData);
      }
    });
  });
}

function showIndividualRole(p) {
  document.getElementById("turnIndicator").innerText = p.name;
  document.getElementById("currentPlayerName").innerText = p.name;
  document.getElementById("nextPlayerBtn").innerText = "I HAVE SEEN MY ROLE";

  const cardBackView = document.getElementById("cardBackView");
  const roleBadge = document.getElementById("roleBadge");
  const wordDisplay = document.getElementById("wordDisplay");
  const roleDescription = document.getElementById("roleDescription");

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

// ==========================================
// 3. GAME FLOW LOGIC
// ==========================================
function startGame() {
  const category = categorySelect.value;
  const dbWords = WORD_DATABASE[category];
  const randomPair = dbWords[Math.floor(Math.random() * dbWords.length)];
  activeCivilianWord = randomPair.civilian;
  activeImposterWord = randomPair.imposter;
  imposterCount = parseInt(imposterCountSelect.value);

  if (activeGameMode === 'local') {
    players = [];
    for (let i = 1; i <= totalPlayers; i++) {
      const inputVal = document.getElementById(`playerNameInput_${i}`)?.value.trim();
      players.push({ id: i, name: inputVal !== "" ? inputVal : `Player ${i}`, isImposter: false });
    }

    let assigned = 0;
    while (assigned < imposterCount) {
      let randIdx = Math.floor(Math.random() * players.length);
      if (!players[randIdx].isImposter) {
        players[randIdx].isImposter = true;
        assigned++;
      }
    }

    currentTurnIndex = 0;
    setupStage.classList.add("d-none");
    revealStage.classList.remove("d-none");
    updateRevealTurn();
  } else { // Online Host Start
    if (players.length < 3) return alert("Need at least 3 players to start online room!");

    let assigned = 0;
    while (assigned < imposterCount) {
      let randIdx = Math.floor(Math.random() * players.length);
      if (!players[randIdx].isImposter) {
        players[randIdx].isImposter = true;
        assigned++;
      }
    }

    const updatedPlayersObj = {};
    players.forEach(p => {
      updatedPlayersObj[p.id] = p;
    });

    firebase.database().ref('rooms/' + currentRoomCode).update({
      status: 'STARTED',
      civilianWord: activeCivilianWord,
      imposterWord: activeImposterWord,
      players: updatedPlayersObj
    });
  }
}

function updateRevealTurn() {
  const p = players[currentTurnIndex];
  document.getElementById("turnIndicator").innerText = `Player ${currentTurnIndex + 1} of ${players.length}`;
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
  if (activeGameMode === 'online') {
    startDiscussionPhase();
    return;
  }
  currentTurnIndex++;
  if (currentTurnIndex < players.length) {
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
      if (secondsLeft <= 0) clearInterval(timerInterval);
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