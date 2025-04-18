<template>
  <div id="app" :class="{ 'dark-theme': isDarkMode }">
    <header class="app-header">
      <h1>FNHL beer league</h1>
      <nav>
        <router-link to="/">Home</router-link> |
        <router-link to="/pick">Top Pick?</router-link> |
        <router-link to="/leader">Leaderboard</router-link>
      </nav>
      <button @click="toggleTheme" class="theme-toggle-btn">
        {{ isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode' }}
      </button>
    </header>

    <main>
      <!-- Router view renders the component for the current route -->
      <router-view />
    </main>

  </div>
</template>

<script setup>
// Keep only the state and logic needed across all routes or for App.vue itself
import { ref, onMounted, watch, computed, provide } from 'vue';

// --- Core State ---
const players = ref([]); // Master list of players
const isDarkMode = ref(false); // Theme control

// --- State needed by child components (will be provided) ---
const newPlayerName = ref('');
const newPlayerPosition = ref('F');
const playerA = ref(null);
const playerB = ref(null);
const teamA = ref([]);
const teamB = ref([]);
const showTeams = ref(false);
const draftType = ref('serpentine');
const draggedPlayer = ref(null);
const sourceTeam = ref(null);
const avgSkaterRatioA = ref(0); // Ref to store Team A's avg skater ratio
const avgSkaterRatioB = ref(0); // Ref to store Team B's avg skater ratio

// Helper function to shuffle an array (Fisher-Yates algorithm)
const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]]; // Swap elements
  }
  return array;
};

// Helper function to sort team by position, then shuffle within position
const sortAndShuffleTeam = (team) => {
  const forwards = team.filter(p => p.position === 'F');
  const defense = team.filter(p => p.position === 'D');
  const goalies = team.filter(p => p.position === 'G');

  // Shuffle each group
  shuffleArray(forwards);
  shuffleArray(defense);
  shuffleArray(goalies);

  // Combine in F, D, G order
  return [...forwards, ...defense, ...goalies];
};

// --- Theme Toggle ---
const toggleTheme = () => {
  isDarkMode.value = !isDarkMode.value;
};

// --- Computed Properties (some provided) ---
const activePlayers = computed(() => players.value.filter(p => p.active));
const activeForwardCount = computed(() => activePlayers.value.filter(p => p.position === 'F').length);
const activeDefenseCount = computed(() => activePlayers.value.filter(p => p.position === 'D').length);
const activeGoalieCount = computed(() => activePlayers.value.filter(p => p.position === 'G').length);

const calculateWinRatio = (player) => {
  const totalGames = player.wins + player.losses;
  if (totalGames === 0) return 0;
  return player.wins / totalGames;
};

const rankedPlayers = computed(() => {
  return [...activePlayers.value].sort((a, b) => {
      const ratioB = calculateWinRatio(b);
      const ratioA = calculateWinRatio(a);
      if (ratioB !== ratioA) return ratioB - ratioA;
      const totalGamesB = b.wins + b.losses;
      const totalGamesA = a.wins + a.losses;
      if (totalGamesB !== totalGamesA) return totalGamesB - totalGamesA;
      return b.wins - a.wins;
  });
});


// --- Core Methods (some provided) ---

const addPlayer = () => {
  if (newPlayerName.value.trim() === '') {
    alert('Player name cannot be empty.');
    return;
  }
  const newPlayer = {
    id: Date.now(),
    name: newPlayerName.value.trim(),
    position: newPlayerPosition.value,
    active: true,
    wins: 0,
    losses: 0,
    comparisonCount: 0,
  };
  players.value.push(newPlayer);
  newPlayerName.value = '';
  newPlayerPosition.value = 'F';
  // savePlayers() will be called by the watch
};

const deletePlayer = (playerId) => {
  players.value = players.value.filter(player => player.id !== playerId);
  // savePlayers() will be called by the watch
};

const loadPlayers = async () => {
  try {
    const response = await fetch('/api/players');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    players.value = data.map(player => {
        const wins = player.wins !== undefined ? player.wins : (player.score !== undefined ? player.score : 0);
        const losses = player.losses !== undefined ? player.losses : 0;
        return {
            ...player,
            active: player.active !== undefined ? player.active : true,
            wins: wins,
            losses: losses,
            comparisonCount: player.comparisonCount !== undefined ? player.comparisonCount : (wins + losses),
            score: undefined
        };
    }).filter(player => player.id !== undefined);
    getRandomPair(); // Still need to get initial pair if on home page
  } catch (error) {
    console.error("Failed to load players:", error);
    alert('Failed to load player data. Check the console for details.');
    players.value = [];
  }
};

const savePlayers = async () => {
  try {
    const response = await fetch('/api/players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(players.value),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  } catch (error) {
    console.error("Failed to save players:", error);
    alert('Failed to save player data. Check the console for details.');
  }
};

onMounted(loadPlayers);
watch(players, savePlayers, { deep: true });


const getRandomPair = () => {
  const activeGoalies = activePlayers.value.filter(p => p.position === 'G');
  const activeSkaters = activePlayers.value.filter(p => p.position !== 'G');
  const canCompareGoalies = activeGoalies.length >= 2;
  const canCompareSkaters = activeSkaters.length >= 2;
  let playersToCompare = [];
  let comparisonType = '';

  if (canCompareGoalies && canCompareSkaters) {
    comparisonType = Math.random() < 0.1 ? 'Goalies' : 'Skaters';
  } else if (canCompareGoalies) {
    comparisonType = 'Goalies';
  } else if (canCompareSkaters) {
    comparisonType = 'Skaters';
  } else {
    playerA.value = null; playerB.value = null; return;
  }

  playersToCompare = comparisonType === 'Goalies' ? activeGoalies : activeSkaters;
  const minCount = Math.min(...playersToCompare.map(p => p.comparisonCount));
  const lowCountPlayers = playersToCompare.filter(p => p.comparisonCount === minCount);
  const indexA = Math.floor(Math.random() * lowCountPlayers.length);
  playerA.value = lowCountPlayers[indexA];
  const remainingPlayers = playersToCompare.filter(p => p.id !== playerA.value.id);
  if (remainingPlayers.length === 0) {
    playerA.value = null; playerB.value = null; return;
  }
  const indexB = Math.floor(Math.random() * remainingPlayers.length);
  playerB.value = remainingPlayers[indexB];

  const playerAInFullList = players.value.find(p => p.id === playerA.value.id);
  const playerBInFullList = players.value.find(p => p.id === playerB.value.id);
  if (playerAInFullList) playerAInFullList.comparisonCount++;
  if (playerBInFullList) playerBInFullList.comparisonCount++;
  console.log(`New pair: ${playerA.value?.name} vs ${playerB.value?.name}`);
};

const vote = (winnerId) => {
  if (!winnerId || !playerA.value || !playerB.value) return;
  const winner = players.value.find(p => p.id === winnerId);
  const loser = playerA.value.id === winnerId ? players.value.find(p => p.id === playerB.value.id) : players.value.find(p => p.id === playerA.value.id);
  if (winner) winner.wins++;
  if (loser) loser.losses++;
  getRandomPair();
};

watch(activePlayers, (newActivePlayers, oldActivePlayers) => {
    if (newActivePlayers.length !== oldActivePlayers.length ||
        !playerA.value || !playerB.value ||
        !newActivePlayers.some(p => p.id === playerA.value.id) ||
        !newActivePlayers.some(p => p.id === playerB.value.id)) {
        getRandomPair();
    }
}, { deep: true });

const getPickOrder = (numPicks, firstPicker, type) => {
  const order = []; let currentPicker = firstPicker;
  const secondPicker = firstPicker === 'A' ? 'B' : 'A';
  if (type === 'simple') {
    for (let i = 0; i < numPicks; i++) {
      order.push(currentPicker); currentPicker = currentPicker === firstPicker ? secondPicker : firstPicker;
    }
  } else {
    for (let i = 0; i < numPicks; i++) {
      order.push((i % 4 === 0 || i % 4 === 3) ? firstPicker : secondPicker);
    }
  } return order;
};

const generateTeams = () => {
  const rankedForwards = rankedPlayers.value.filter(p => p.position === 'F').sort((a, b) => calculateWinRatio(b) - calculateWinRatio(a)); // Sort by ratio
  const rankedDefensemen = rankedPlayers.value.filter(p => p.position === 'D').sort((a, b) => calculateWinRatio(b) - calculateWinRatio(a)); // Sort by ratio
  const rankedGoalies = rankedPlayers.value.filter(p => p.position === 'G').sort((a, b) => calculateWinRatio(b) - calculateWinRatio(a)); // Sort by ratio

  const numForwards = rankedForwards.length; const numDefensemen = rankedDefensemen.length; const numGoalies = rankedGoalies.length;
  if (numForwards + numDefensemen + numGoalies < 2) { alert("Need at least two active players."); return; }

  const draftTeamA = []; const draftTeamB = []; showTeams.value = true;
  let firstForwardPicker = 'A';
  if (numForwards > 0) {
      const forwardPickOrder = getPickOrder(numForwards, firstForwardPicker, draftType.value);
      rankedForwards.forEach((p, i) => forwardPickOrder[i] === 'A' ? draftTeamA.push(p) : draftTeamB.push(p));
  }
  if (numDefensemen > 0) {
      const firstDefensemanPicker = 'B';
      const defensemanPickOrder = getPickOrder(numDefensemen, firstDefensemanPicker, draftType.value);
      rankedDefensemen.forEach((p, i) => defensemanPickOrder[i] === 'A' ? draftTeamA.push(p) : draftTeamB.push(p));
  }

  const winsTeamA = draftTeamA.reduce((sum, p) => sum + p.wins, 0);
  const winsTeamB = draftTeamB.reduce((sum, p) => sum + p.wins, 0);
  if (numGoalies > 0) {
    let goalieTeamToggle = winsTeamA <= winsTeamB;
    for (const goalie of rankedGoalies) {
      if (goalieTeamToggle) draftTeamA.push(goalie); else draftTeamB.push(goalie);
      goalieTeamToggle = !goalieTeamToggle;
    }
  }

  // Sort by position, then shuffle within each position group
  teamA.value = sortAndShuffleTeam(draftTeamA);
  teamB.value = sortAndShuffleTeam(draftTeamB);

  console.log("Final Sorted and Shuffled Teams Generated:", teamA.value, teamB.value);
};

const onDragStart = (event, player, team) => {
  event.dataTransfer.setData('text/plain', player.id);
  event.dataTransfer.effectAllowed = 'move';
  draggedPlayer.value = player; sourceTeam.value = team;
  event.target.classList.add('dragging');
};
const onDragEnd = (event) => {
  event.target.classList.remove('dragging');
  document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
  draggedPlayer.value = null; sourceTeam.value = null;
};
const onDragOver = (event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; };
const onDragEnter = (event, targetTeam) => {
  if (event.target.closest('.team-list') && sourceTeam.value !== targetTeam) {
    event.target.closest('.team-list').classList.add('drag-over');
  }
};
const onDragLeave = (event, targetTeam) => {
   if (!event.currentTarget.contains(event.relatedTarget)) {
        event.currentTarget.classList.remove('drag-over');
   }
};
const onDrop = (event, targetTeam) => {
  event.preventDefault();
  const targetListElement = event.target.closest('.team-list');
  if (!targetListElement) return;
  targetListElement.classList.remove('drag-over');
  const playerId = parseInt(event.dataTransfer.getData('text/plain'), 10);
  const playerToMove = draggedPlayer.value;
  if (!playerToMove || sourceTeam.value === targetTeam) return;

  if (sourceTeam.value === 'A') teamA.value = teamA.value.filter(p => p.id !== playerToMove.id);
  else teamB.value = teamB.value.filter(p => p.id !== playerToMove.id);
  if (targetTeam === 'A') teamA.value.push(playerToMove);
  else teamB.value.push(playerToMove);

  // Re-sort and shuffle the teams after manual drag/drop
  teamA.value = sortAndShuffleTeam(teamA.value);
  teamB.value = sortAndShuffleTeam(teamB.value);

  draggedPlayer.value = null; sourceTeam.value = null;
};


// --- Provide data and methods to child components ---
provide('players', players);
provide('addPlayer', addPlayer);
provide('deletePlayer', deletePlayer);
provide('vote', vote);
provide('generateTeams', generateTeams);
provide('onDragStart', onDragStart);
provide('onDragEnd', onDragEnd);
provide('onDragOver', onDragOver);
provide('onDragEnter', onDragEnter);
provide('onDragLeave', onDragLeave);
provide('onDrop', onDrop);
provide('calculateWinRatio', calculateWinRatio);

// Provide computed properties
provide('activeForwardCount', activeForwardCount);
provide('activeDefenseCount', activeDefenseCount);
provide('activeGoalieCount', activeGoalieCount);
provide('activePlayers', activePlayers);
provide('rankedPlayers', rankedPlayers);

// Provide refs needed by children
provide('newPlayerName', newPlayerName);
provide('newPlayerPosition', newPlayerPosition);
provide('playerA', playerA);
provide('playerB', playerB);
provide('teamA', teamA);
provide('teamB', teamB);
provide('showTeams', showTeams);
provide('draftType', draftType);
provide('avgSkaterRatioA', avgSkaterRatioA); // Provide Team A ratio
provide('avgSkaterRatioB', avgSkaterRatioB); // Provide Team B ratio

</script>

<style>
/* Global styles only */
:root {
  /* Light Theme Variables */
  --bg-color: #ffffff;
  --text-color: #2c3e50;
  --border-color: #ccc;
  --section-bg-color: #f9f9f9;
  --section-border-color: #eee;
  --button-bg-color: #007bff;
  --button-text-color: #ffffff;
  --button-hover-bg-color: #0056b3;
  --delete-button-bg-color: #ff4d4d;
  --delete-button-hover-bg-color: #cc0000;
  --vote-button-bg-color: #4CAF50;
  --vote-button-hover-bg-color: #45a049;
  --inactive-text-color: #aaa;
  --drag-over-bg-color: #e0ffe0;
  --dragging-bg-color: #f0f0f0;
  --header-border-color: #ccc;
  --nav-link-color: #007bff;
  --nav-link-hover-color: #0056b3;
}

.dark-theme {
  /* Dark Theme Variables */
  --bg-color: #1e1e1e;
  --text-color: #e0e0e0;
  --border-color: #555;
  --section-bg-color: #2a2a2a;
  --section-border-color: #444;
  --button-bg-color: #007bff;
  --button-text-color: #ffffff;
  --button-hover-bg-color: #3395ff;
  --delete-button-bg-color: #ff4d4d;
  --delete-button-hover-bg-color: #ff7070;
  --vote-button-bg-color: #4CAF50;
  --vote-button-hover-bg-color: #6fbf73;
  --inactive-text-color: #777;
  --drag-over-bg-color: #3a4a3a;
  --dragging-bg-color: #333;
  --header-border-color: #555;
  --nav-link-color: #3395ff;
  --nav-link-hover-color: #66b0ff;
}


#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  background-color: var(--bg-color);
  color: var(--text-color);
  min-height: 100vh;
  /* padding-top: 60px; */ /* Removed as header handles spacing */
  box-sizing: border-box;
  transition: background-color 0.3s, color 0.3s;
}

.app-header {
  background-color: var(--section-bg-color);
  padding: 10px 20px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative; /* For positioning theme toggle */
}

.app-header h1 {
  margin: 0;
  font-size: 1.5em;
}

.app-header nav a {
  font-weight: bold;
  color: var(--nav-link-color);
  text-decoration: none;
  margin: 0 10px;
}

.app-header nav a.router-link-exact-active {
  color: var(--text-color); /* Highlight active link */
  text-decoration: underline;
}

.app-header nav a:hover {
  color: var(--nav-link-hover-color);
}


main {
  padding: 20px; /* Add padding around the routed content */
}


/* Styles for components moved to views should be in those view files */
/* Or keep common styles here if preferred */

.theme-toggle-btn {
    position: absolute;
    top: 50%;
    right: 15px;
    transform: translateY(-50%); /* Center vertically */
    padding: 5px 10px;
    background-color: var(--section-bg-color);
    color: var(--text-color);
    border: 1px solid var(--border-color);
    z-index: 10;
    cursor: pointer;
}

/* Keep general button styling if needed globally */
button {
  cursor: pointer;
  border-radius: 4px;
  padding: 8px 15px;
  border: none;
  font-size: 1em;
  transition: background-color 0.2s;
}

</style>
