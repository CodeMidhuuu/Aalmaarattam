// ==========================================
// 1. FIREBASE CONFIGURATION
// ==========================================
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase immediately
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// ==========================================
// 2. CATEGORIZED WORD DATABASE (SINGLE WORD + CATEGORY HINT)
// ==========================================
const WORD_DATABASE = {
  manglish: {
    food: [
      { word: "Porotta", hint: "Kerala Food" },
      { word: "Biriyani", hint: "Rice Dishes" },
      { word: "Sadya", hint: "Feast Items" },
      { word: "Kappi", hint: "Hot Beverages" },
      { word: "Thattukada", hint: "Eateries" },
      { word: "Shawarma", hint: "Street Food" },
      { word: "Puttu", hint: "Breakfast" },
      { word: "Unniyappam", hint: "Snacks" },
      { word: "Kappa", hint: "Traditional Food" }
    ],
    cinema: [
      { word: "Lalettan", hint: "Malayalam Actors" },
      { word: "Kilukkam", hint: "Classic Movies" },
      { word: "Lucifer", hint: "Mass Movies" },
      { word: "Premam", hint: "Romance Movies" },
      { word: "Fahadh", hint: "Actors" },
      { word: "Minnal Murali", hint: "Superheroes" }
    ],
    places: [
      { word: "Kochi", hint: "Kerala Cities" },
      { word: "Munnar", hint: "Hill Stations" },
      { word: "Varkala", hint: "Beaches" },
      { word: "Alappuzha", hint: "Backwaters" }
    ],
    sports: [
      { word: "Football", hint: "Outdoor Sports" },
      { word: "Kerala Blasters", hint: "ISL Teams" },
      { word: "Sanju Samson", hint: "Cricketers" },
      { word: "Messi", hint: "Football Legends" }
    ]
  },
  english: {
    food: [
      { word: "Pizza", hint: "Fast Food" },
      { word: "Coffee", hint: "Beverages" },
      { word: "Sushi", hint: "Asian Cuisine" },
      { word: "Ice Cream", hint: "Desserts" }
    ],
    cinema: [
      { word: "Batman", hint: "Superheroes" },
      { word: "Avengers", hint: "Movie Franchises" },
      { word: "Inception", hint: "Sci-Fi Movies" }
    ],
    places: [
      { word: "Airplane", hint: "Travel Modes" },
      { word: "New York", hint: "Global Cities" },
      { word: "Hospital", hint: "Public Places" }
    ],
    sports: [
      { word: "Basketball", hint: "Ball Sports" },
      { word: "Tennis", hint: "Racket Sports" }
    ]
  }
};

// Game State
let activeGameMode = 'local'; 
let totalPlayers = 5;
let imposterCount = 1;
let players = [];
let currentTurnIndex = 0;
let activeWordData = null;
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
const subCategorySelect = document.getElementById("subCategorySelect");
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
// 3. ONLINE ROOM MULTIPLAYER LOGIC
// ==========================================
function createOnlineRoom() {
  if (typeof firebase === 'undefined') return alert("Firebase not initialized!");
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

  roomRef.child('players').on('value', (snapshot) => {
    const playersList = snapshot.val() || {};
    const ul = document.getElementById("playersUl");
    ul.innerHTML = "";
    players = [];
    Object.keys(playersList).forEach((id) => {
      const p = playersList[id];
      ul.innerHTML += `<li>${p.name} ${p.isHost ? '(Host)' : ''}</li>`;
      players.push({ id: id, name: p.name, role: p.role || 'CIVILIAN' });
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
  if (typeof firebase === 'undefined') return alert("Firebase not initialized!");
  const db = firebase.database();
  const code = document.getElementById("roomCodeInput").value.trim();
  const name = document.getElementById("playerNameOnline").value.trim() || "Player";
  if (!code) return alert("Enter 4-digit room code!");

  currentRoomCode = code;
  myPlayerId = "player_" + Date.now();

  const roomRef = db.ref('rooms/' + currentRoomCode);
  roomRef.once('value', (snapshot) => {
    if (!snapshot.exists()) return alert("Room not found!");

    roomRef.child('players/' + myPlayerId).set({ name: name, isHost: false });
    alert("Joined room! Wait for host to start.");

    roomRef.on('value', (snap) => {
      const data = snap.val();
      if (data && data.status === 'STARTED') {
        activeWordData = data.wordData;
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

  renderRoleCard(p, activeWordData);
}

// ==========================================
// 4. ROLE ASSIGNMENT & GAME FLOW
// ==========================================
function assignRoles(playersList) {
  let availableIndices = playersList.map((_, i) => i);

  // Pick Imposters (Who now get NO WORD)
  let assignedImposters = 0;
  while (assignedImposters < imposterCount && availableIndices.length > 0) {
    const imposterIdx = availableIndices.splice(Math.floor(Math.random() * availableIndices.length), 1)[0];
    playersList[imposterIdx].role = "IMPOSTER";
    assignedImposters++;
  }

  // Assign Civilians
  availableIndices.forEach(idx => {
    playersList[idx].role = "CIVILIAN";
  });
}

function startGame() {
  const lang = categorySelect.value;
  const pack = subCategorySelect.value;
  const dbWords = WORD_DATABASE[lang][pack] || WORD_DATABASE[lang]['food'];
  activeWordData = dbWords[Math.floor(Math.random() * dbWords.length)];
  imposterCount = parseInt(imposterCountSelect.value);

  if (activeGameMode === 'local') {
    players = [];
    for (let i = 1; i <= totalPlayers; i++) {
      const inputVal = document.getElementById(`playerNameInput_${i}`)?.value.trim();
      players.push({ id: i, name: inputVal !== "" ? inputVal : `Player ${i}`, role: "CIVILIAN" });
    }

    assignRoles(players);

    currentTurnIndex = 0;
    setupStage.classList.add("d-none");
    revealStage.classList.remove("d-none");
    updateRevealTurn();
  } else { // Online Host Start
    if (players.length < 3) return alert("Need at least 3 players to start online room!");

    assignRoles(players);

    const updatedPlayersObj = {};
    players.forEach(p => { updatedPlayersObj[p.id] = p; });

    firebase.database().ref('rooms/' + currentRoomCode).update({
      status: 'STARTED',
      wordData: activeWordData,
      players: updatedPlayersObj
    });
  }
}

function renderRoleCard(player, wordData) {
  const cardBackView = document.getElementById("cardBackView");
  const roleBadge = document.getElementById("roleBadge");
  const wordDisplay = document.getElementById("wordDisplay");
  const roleDescription = document.getElementById("roleDescription");

  if (player.role === "IMPOSTER") {
    cardBackView.className = "card-back imposter-theme";
    roleBadge.className = "badge bg-danger mb-2 fs-6 pulse-animation";
    roleBadge.innerText = "IMPOSTER 🕵️‍♂️";
    wordDisplay.innerText = "NO WORD!";
    roleDescription.innerText = `Category: ${wordData.hint}. Listen to clues & guess the word if caught!`;
  } else {
    cardBackView.className = "card-back";
    roleBadge.className = "badge bg-success mb-2 fs-6";
    roleBadge.innerText = "CIVILIAN 😇";
    wordDisplay.innerText = wordData.word;
    roleDescription.innerText = "Give subtle clues so the Imposter doesn't guess the word!";
  }
}

function updateRevealTurn() {
  const p = players[currentTurnIndex];
  document.getElementById("turnIndicator").innerText = `Player ${currentTurnIndex + 1} of ${players.length}`;
  document.getElementById("currentPlayerName").innerText = p.name;
  
  document.getElementById("roleCard").classList.remove("flipped");
  document.getElementById("nextPlayerBtn").disabled = true;

  renderRoleCard(p, activeWordData);
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
  document.getElementById("timerBar").style.width = `${(left / total) * 100}%`;
}

function revealResults() {
  if (timerInterval) clearInterval(timerInterval);
  gameplayStage.classList.add("d-none");
  resultStage.classList.remove("d-none");

  const imposters = players.filter(p => p.role === 'IMPOSTER').map(p => p.name).join(", ");
  document.getElementById("imposterNamesDisplay").innerText = imposters || "None";
  document.getElementById("civilianWordResult").innerText = activeWordData.word;
}

function resetToSetup() {
  resultStage.classList.add("d-none");
  setupStage.classList.remove("d-none");
  if (activeGameMode === 'online') {
    onlineModeBox.classList.remove("d-none");
  }
}