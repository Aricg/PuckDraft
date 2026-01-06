<template>
  <div id="app">
    <header class="app-header" v-if="isAuthenticated">
      <h1>FNHL beer league</h1>
      <nav>
        <router-link to="/">Home</router-link> |
        <router-link to="/pick">Top Pick?</router-link> |
        <router-link to="/previous-games">Previous Games</router-link> |
        <router-link to="/cam">Cam</router-link>
        <template v-if="userRole === 'admin'"> |
          <router-link to="/leader">Leaderboard</router-link>
        </template>
        | <a href="#" @click.prevent="logout">Logout</a>
      </nav>
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
import { useRouter } from 'vue-router';
import { getPickOrder } from './utils/draftUtils.js';

const router = useRouter();

// --- Auth State ---
const isAuthenticated = ref(localStorage.getItem('isAuthenticated') === 'true');
const userRole = ref(localStorage.getItem('userRole') || null);
const loggedInUser = ref(JSON.parse(localStorage.getItem('loggedInUser') || 'null'));

// --- Game Status State ---
const gameStatus = ref({ cancelledFor: null, bbqOn: false, message: '', teamsLocked: false }); // e.g. { cancelledFor: '2025-07-04', bbqOn: true, message: 'Hi' }

const nextGameDate = computed(() => {
  const now = new Date();
  const nextFriday = new Date(now.getTime());
  nextFriday.setHours(21, 30, 0, 0); // Set time to 9:30 PM

  let day = nextFriday.getDay(); // 0=Sun, 5=Fri
  let diff = (5 - day + 7) % 7; // Days until next Friday
  nextFriday.setDate(nextFriday.getDate() + diff);

  // If it's past 9 PM on this calculated Friday, the next game is next week
  if (now.getTime() > nextFriday.getTime()) {
      nextFriday.setDate(nextFriday.getDate() + 7);
  }
  return nextFriday;
});

const isGameCancelled = computed(() => {
  if (!gameStatus.value.cancelledFor) return false;

  const nextGameDay = new Date(nextGameDate.value);
  nextGameDay.setHours(0, 0, 0, 0);

  const cancelledDate = new Date(gameStatus.value.cancelledFor + 'T00:00:00');

  return cancelledDate.getTime() === nextGameDay.getTime();
});

const login = (password, role, user) => {
  const isAdminLogin = role === 'admin' && password === 'beerbeer';
  const isPlayerLogin = role === 'player' && password === 'beer';

  if (isAdminLogin || isPlayerLogin) {
    isAuthenticated.value = true;
    userRole.value = role;
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('userRole', role);

    let userToStore = user;
    if (role === 'admin') {
      // Create a default user object for admin sessions
      userToStore = { name: 'Admin', id: 'admin' };
    }
    loggedInUser.value = userToStore;
    localStorage.setItem('loggedInUser', JSON.stringify(userToStore));

    loadPlayers(); // Load players on successful login
    loadGameStatus(); // Load game status on successful login
    loadTeamsForCurrentWeek(); // Check for existing teams file
    router.push({ name: 'Home' });
    return true; // Indicate success
  }
  return false; // Indicate failure
};

const logout = () => {
  isAuthenticated.value = false;
  userRole.value = null;
  loggedInUser.value = null;
  localStorage.removeItem('isAuthenticated');
  localStorage.removeItem('userRole');
  localStorage.removeItem('loggedInUser');
  router.push({ name: 'Login' });
};

const loadGameStatus = async () => {
  try {
    const response = await fetch('/api/gamestatus');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    // Ensure all properties exist to avoid errors in the UI
    gameStatus.value = {
      cancelledFor: data.cancelledFor || null,
      bbqOn: data.bbqOn === true, // Default to false if missing or not exactly true
      message: data.message || '',
      teamsLocked: data.teamsLocked === true // Default to false
    };
  } catch (error) {
    console.error("Failed to load game status:", error);
    gameStatus.value = { cancelledFor: null, bbqOn: false, message: '', teamsLocked: false }; // Reset on error
  }
};

const saveGameStatus = async () => {
  try {
    const response = await fetch('/api/gamestatus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(gameStatus.value),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  } catch (error) {
    console.error("Failed to save game status:", error);
    alert('Failed to save game status. Check console.');
  }
};

// Helper function to get the ISO week number for a date
const getWeekNumber = (d) => {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  // Set to nearest Thursday: current date + 4 - current day number
  // Make Sunday's day number 7
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  // Get first day of year
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  // Calculate full weeks to nearest Thursday
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  // Return week number
  return weekNo;
};

const saveTeams = async () => {
  if (gameStatus.value.teamsLocked) {
    console.log("Teams are locked. Not saving modifications.");
    return;
  }
  if (teamLight.value.length === 0 && teamDark.value.length === 0) {
    console.log("Not saving empty teams.");
    return;
  }
  const weekNumber = getWeekNumber(new Date());
  const filename = `${weekNumber}.teams.json`;
  const teamsData = {
    teamLight: teamLight.value,
    teamDark: teamDark.value,
    avgSkaterRatioLight: avgSkaterRatioLight.value,
    avgSkaterRatioDark: avgSkaterRatioDark.value,
    votesLight: votesLight.value,
    votesDark: votesDark.value,
    compositionId: compositionId.value
  };

  try {
    const response = await fetch('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, teams: teamsData }),
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    console.log(`Teams saved to ${filename}`);
  } catch (error) {
    console.error("Failed to save teams:", error);
    alert('Failed to save teams. Check the console.');
  }
};

const loadTeamsForCurrentWeek = async () => {
  const weekNumber = getWeekNumber(new Date());
  const filename = `${weekNumber}.teams.json`;
  try {
    const response = await fetch(`/api/teams?filename=${filename}`);
    if (response.ok) {
      isNewWeek.value = false;
      const teamsData = await response.json();
      // Add backward compatibility for old team files
      teamLight.value = teamsData.teamLight || teamsData.teamA || [];
      teamDark.value = teamsData.teamDark || teamsData.teamB || [];
      avgSkaterRatioLight.value = teamsData.avgSkaterRatioLight || teamsData.avgSkaterRatioA || 0;
      avgSkaterRatioDark.value = teamsData.avgSkaterRatioDark || teamsData.avgSkaterRatioB || 0;
      votesLight.value = teamsData.votesLight || 0;
      votesDark.value = teamsData.votesDark || 0;
      compositionId.value = teamsData.compositionId || null;
      showTeams.value = true;
      console.log(`Successfully loaded teams from ${filename}`);
    } else if (response.status === 404) {
      console.log(`No teams file found for this week (${filename}).`);
      isNewWeek.value = true;
      // Reset teams state if no file is found
      teamLight.value = [];
      teamDark.value = [];
      showTeams.value = false;
    } else {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error("Failed to load teams for current week:", error);
  }
};

const toggleGameCancellation = () => {
  if (isGameCancelled.value) {
    // If it is cancelled, resume it
    gameStatus.value.cancelledFor = null;
  } else {
    // If it is on, cancel it for the upcoming Friday
    const yyyy = nextGameDate.value.getFullYear();
    const mm = String(nextGameDate.value.getMonth() + 1).padStart(2, '0');
    const dd = String(nextGameDate.value.getDate()).padStart(2, '0');
    gameStatus.value.cancelledFor = `${yyyy}-${mm}-${dd}`;
  }
  saveGameStatus(); // Manually save after changing
};

const toggleBbqStatus = () => {
  gameStatus.value.bbqOn = !gameStatus.value.bbqOn;
  saveGameStatus();
};

const setMessage = (newMessage) => {
  gameStatus.value.message = newMessage || '';
  saveGameStatus();
};

const toggleTeamsLock = () => {
  gameStatus.value.teamsLocked = !gameStatus.value.teamsLocked;
  saveGameStatus();
};

const castVoteForTeam = async (team) => {
  if (!compositionId.value) {
    alert("Cannot vote until teams are finalized with an ID.");
    return;
  }
  const weekNumber = getWeekNumber(new Date());
  const voteKey = `voted_week_${weekNumber}_${compositionId.value}`;

  if (localStorage.getItem(voteKey)) {
    alert("You have already voted for this week.");
    return;
  }

  const filename = `${weekNumber}.teams.json`;

  try {
    const response = await fetch('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, vote: team }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    votesLight.value = result.votesLight;
    votesDark.value = result.votesDark;

    localStorage.setItem(voteKey, team); // Record the vote in localStorage
  } catch (error) {
    console.error("Failed to cast vote:", error);
    alert('Failed to cast vote. See console for details.');
  }
};

// --- Core State ---
const players = ref([]); // Master list of players
const isPlayersLoaded = ref(false); // Flag to prevent saving before initial load
const isNewWeek = ref(false); // True if no teams file found for current week

// --- State needed by child components (will be provided) ---
const newPlayerName = ref('');
const newPlayerPosition = ref('F');
const playerA = ref(null);
const playerB = ref(null);
const teamLight = ref([]);
const teamDark = ref([]);
const showTeams = ref(false);
const draftType = ref('serpentine');
const draggedPlayer = ref(null);
const sourceTeam = ref(null);
const avgSkaterRatioLight = ref(0); // Ref to store Light's avg skater ratio
const avgSkaterRatioDark = ref(0); // Ref to store Dark's avg skater ratio
const votesLight = ref(0);
const votesDark = ref(0);
const compositionId = ref(null);
const selectedForSwapLight = ref(null);
const selectedForSwapDark = ref(null);

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

// Helper function to calculate and update average skater win ratios for teams
const updateAvgSkaterRatios = () => {
  const skatersLight = teamLight.value.filter(p => p.position !== 'G');
  const skatersDark = teamDark.value.filter(p => p.position !== 'G');

  const ratioSumLight = skatersLight.reduce((sum, p) => sum + calculateWinRatio(p), 0);
  const ratioSumDark = skatersDark.reduce((sum, p) => sum + calculateWinRatio(p), 0);

  avgSkaterRatioLight.value = skatersLight.length > 0 ? ratioSumLight / skatersLight.length : 0;
  avgSkaterRatioDark.value = skatersDark.length > 0 ? ratioSumDark / skatersDark.length : 0;

  console.log(`Updated Avg Skater Ratios - Light: ${avgSkaterRatioLight.value.toFixed(3)}, Dark: ${avgSkaterRatioDark.value.toFixed(3)}`);
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
    isFullTime: false,
    wins: 0,
    losses: 0,
    balanceDue: 0,
    waitlisted: false,
  };
  players.value.push(newPlayer);
  newPlayerName.value = '';
  newPlayerPosition.value = 'F';
  // savePlayers() will be called by the watch
};

const deletePlayer = (playerId) => {
  const playerToDelete = players.value.find(p => p.id === playerId);
  if (playerToDelete && window.confirm(`Are you sure you want to delete ${playerToDelete.name}?`)) {
    players.value = players.value.filter(player => player.id !== playerId);
    // savePlayers() will be called by the watch
  }
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
            isFullTime: player.isFullTime === true, // Default to false if not explicitly true
            wins: wins,
            losses: losses,
            balanceDue: player.balanceDue || 0,
            waitlisted: player.waitlisted || false,
            score: undefined
        };
    }).filter(player => player.id !== undefined);
    isPlayersLoaded.value = true; // Enable saving now that data is loaded
    getRandomPair(); // Still need to get initial pair if on home page
  } catch (error) {
    console.error("Failed to load players:", error);
    alert('Failed to load player data. Check the console for details.');
    players.value = [];
  }
};

const savePlayers = async () => {
  if (!isPlayersLoaded.value) return; // Do not save until initial load is complete
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

onMounted(() => {
  // On page load/refresh, check if user was already logged in
  isAuthenticated.value = localStorage.getItem('isAuthenticated') === 'true';
  if (isAuthenticated.value) {
    loadPlayers();
    loadGameStatus();
    loadTeamsForCurrentWeek();
  }
});
watch(players, savePlayers, { deep: true });


watch([isPlayersLoaded, isNewWeek], ([playersLoaded, newWeek]) => {
  if (playersLoaded && newWeek) {
    console.log("New week detected; clearing player waitlist statuses.");
    players.value.forEach(p => {
      p.waitlisted = false;
    });
  }
});


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
  const indexA = Math.floor(Math.random() * playersToCompare.length);
  playerA.value = playersToCompare[indexA];
  const remainingPlayers = playersToCompare.filter(p => p.id !== playerA.value.id);
  if (remainingPlayers.length === 0) {
    playerA.value = null; playerB.value = null; return;
  }
  const indexB = Math.floor(Math.random() * remainingPlayers.length);
  playerB.value = remainingPlayers[indexB];

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

const generateTeams = () => {
  const rankedForwards = rankedPlayers.value.filter(p => p.position === 'F').sort((a, b) => calculateWinRatio(b) - calculateWinRatio(a)); // Sort by ratio
  const rankedDefensemen = rankedPlayers.value.filter(p => p.position === 'D').sort((a, b) => calculateWinRatio(b) - calculateWinRatio(a)); // Sort by ratio
  const rankedGoalies = rankedPlayers.value.filter(p => p.position === 'G').sort((a, b) => calculateWinRatio(b) - calculateWinRatio(a)); // Sort by ratio

  const numForwards = rankedForwards.length; const numDefensemen = rankedDefensemen.length; const numGoalies = rankedGoalies.length;
  if (numForwards + numDefensemen + numGoalies < 2) { alert("Need at least two active players."); return; }

  const draftTeamLight = []; const draftTeamDark = []; showTeams.value = true;

  if (draftType.value === 'paired') {
    const rankedSkaters = [...rankedForwards, ...rankedDefensemen].sort((a, b) => calculateWinRatio(b) - calculateWinRatio(a));
    const pairs = [];
    while (rankedSkaters.length > 1) {
      const topSkater = rankedSkaters.shift();
      const bottomSkater = rankedSkaters.pop();
      const pair = [];
      if (topSkater) pair.push(topSkater);
      if (bottomSkater) pair.push(bottomSkater);
      if (pair.length) pairs.push(pair);
    }

    let nextTeam = 'Light';
    let defenseCountLight = 0;
    let defenseCountDark = 0;

    const assignPairToTeam = (pair, teamName, defenseInPair) => {
      if (teamName === 'Light') {
        draftTeamLight.push(...pair);
        defenseCountLight += defenseInPair;
      } else {
        draftTeamDark.push(...pair);
        defenseCountDark += defenseInPair;
      }
    };

    const evaluateAssignment = (teamName, pairLength, defenseIncrement) => {
      const projectedDefenseLight = defenseCountLight + (teamName === 'Light' ? defenseIncrement : 0);
      const projectedDefenseDark = defenseCountDark + (teamName === 'Dark' ? defenseIncrement : 0);
      const defenseDiff = Math.abs(projectedDefenseLight - projectedDefenseDark);

      const projectedSizeLight = draftTeamLight.length + (teamName === 'Light' ? pairLength : 0);
      const projectedSizeDark = draftTeamDark.length + (teamName === 'Dark' ? pairLength : 0);
      const sizeDiff = Math.abs(projectedSizeLight - projectedSizeDark);

      return { defenseDiff, sizeDiff };
    };

    pairs.forEach((pair) => {
      const defenseInPair = pair.reduce((count, player) => count + (player.position === 'D' ? 1 : 0), 0);
      const pairLength = pair.length;

      const lightMetrics = evaluateAssignment('Light', pairLength, defenseInPair);
      const darkMetrics = evaluateAssignment('Dark', pairLength, defenseInPair);

      let targetTeam = nextTeam;

      if (lightMetrics.defenseDiff < darkMetrics.defenseDiff) {
        targetTeam = 'Light';
      } else if (darkMetrics.defenseDiff < lightMetrics.defenseDiff) {
        targetTeam = 'Dark';
      } else if (lightMetrics.sizeDiff < darkMetrics.sizeDiff) {
        targetTeam = 'Light';
      } else if (darkMetrics.sizeDiff < lightMetrics.sizeDiff) {
        targetTeam = 'Dark';
      }

      assignPairToTeam(pair, targetTeam, defenseInPair);
      nextTeam = targetTeam === 'Light' ? 'Dark' : 'Light';
    });

    if (rankedSkaters.length === 1) {
      const remainingPlayer = rankedSkaters[0];
      const defenseIncrement = remainingPlayer.position === 'D' ? 1 : 0;
      const lightMetrics = evaluateAssignment('Light', 1, defenseIncrement);
      const darkMetrics = evaluateAssignment('Dark', 1, defenseIncrement);

      let targetTeam;

      if (lightMetrics.defenseDiff < darkMetrics.defenseDiff) {
        targetTeam = 'Light';
      } else if (darkMetrics.defenseDiff < lightMetrics.defenseDiff) {
        targetTeam = 'Dark';
      } else if (lightMetrics.sizeDiff < darkMetrics.sizeDiff) {
        targetTeam = 'Light';
      } else if (darkMetrics.sizeDiff < lightMetrics.sizeDiff) {
        targetTeam = 'Dark';
      } else {
        targetTeam = draftTeamLight.length <= draftTeamDark.length ? 'Light' : 'Dark';
      }

      if (targetTeam === 'Light') {
        draftTeamLight.push(remainingPlayer);
        defenseCountLight += defenseIncrement;
      } else {
        draftTeamDark.push(remainingPlayer);
        defenseCountDark += defenseIncrement;
      }
    }
  } else if (draftType.value === 'random') {
    const randomForwards = shuffleArray([...rankedForwards]);
    const randomDefense = shuffleArray([...rankedDefensemen]);

    const positionCounts = {
      Light: { F: 0, D: 0 },
      Dark: { F: 0, D: 0 }
    };
    const teamCounts = { Light: 0, Dark: 0 };

    const assignBalanced = (player) => {
      const position = player.position;
      const lightPosCount = positionCounts.Light[position];
      const darkPosCount = positionCounts.Dark[position];
      const totalLight = teamCounts.Light;
      const totalDark = teamCounts.Dark;

      let targetTeam;
      if (lightPosCount < darkPosCount) {
        targetTeam = 'Light';
      } else if (darkPosCount < lightPosCount) {
        targetTeam = 'Dark';
      } else if (totalLight < totalDark) {
        targetTeam = 'Light';
      } else if (totalDark < totalLight) {
        targetTeam = 'Dark';
      } else {
        targetTeam = Math.random() < 0.5 ? 'Light' : 'Dark';
      }

      if (targetTeam === 'Light') {
        draftTeamLight.push(player);
        positionCounts.Light[position]++;
        teamCounts.Light++;
      } else {
        draftTeamDark.push(player);
        positionCounts.Dark[position]++;
        teamCounts.Dark++;
      }
    };

    randomForwards.forEach(assignBalanced);
    randomDefense.forEach(assignBalanced);
  } else { // Existing logic for 'simple' and 'serpentine'
    let firstForwardPicker = 'Light';
    if (numForwards > 0) {
        const forwardPickOrder = getPickOrder(numForwards, firstForwardPicker, draftType.value);
        rankedForwards.forEach((p, i) => forwardPickOrder[i] === 'Light' ? draftTeamLight.push(p) : draftTeamDark.push(p));
    }
    if (numDefensemen > 0) {
        const firstDefensemanPicker = 'Dark';
        const defensemanPickOrder = getPickOrder(numDefensemen, firstDefensemanPicker, draftType.value);
        rankedDefensemen.forEach((p, i) => defensemanPickOrder[i] === 'Light' ? draftTeamLight.push(p) : draftTeamDark.push(p));
    }
  }

  // Calculate initial average skater win ratio to determine goalie pick order
  // Note: This uses the draftTeam arrays *before* goalies are added
  const initialSkatersLight = draftTeamLight.filter(p => p.position !== 'G');
  const initialSkatersDark = draftTeamDark.filter(p => p.position !== 'G');
  const initialRatioSumLight = initialSkatersLight.reduce((sum, p) => sum + calculateWinRatio(p), 0);
  const initialRatioSumDark = initialSkatersDark.reduce((sum, p) => sum + calculateWinRatio(p), 0);
  const initialAvgRatioLight = initialSkatersLight.length > 0 ? initialRatioSumLight / initialSkatersLight.length : 0;
  const initialAvgRatioDark = initialSkatersDark.length > 0 ? initialRatioSumDark / initialSkatersDark.length : 0;

  console.log(`Initial Avg Skater Ratio (for goalie pick) - Light: ${initialAvgRatioLight.toFixed(3)}, Dark: ${initialAvgRatioDark.toFixed(3)}`);

  if (numGoalies > 0) {
    // Team with lower average skater win ratio gets the first goalie pick
    let goalieTeamToggle = initialAvgRatioLight <= initialAvgRatioDark;
    console.log(`Assigning first goalie to Team ${goalieTeamToggle ? 'Light' : 'Dark'}`);
    for (const goalie of rankedGoalies) {
      if (goalieTeamToggle) draftTeamLight.push(goalie); else draftTeamDark.push(goalie);
      goalieTeamToggle = !goalieTeamToggle; // Alternate for subsequent goalies
    }
  }

  // Sort by position, then shuffle within each position group
  teamLight.value = sortAndShuffleTeam(draftTeamLight);
  teamDark.value = sortAndShuffleTeam(draftTeamDark);

  // Reset votes for new teams
  votesLight.value = 0;
  votesDark.value = 0;
  compositionId.value = Date.now(); // Generate new ID to allow re-voting

  // Update the displayed average skater ratios based on the final teams
  updateAvgSkaterRatios();

  console.log("Final Sorted and Shuffled Teams Generated:", teamLight.value, teamDark.value);
  saveTeams();
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

  if (sourceTeam.value === 'Light') teamLight.value = teamLight.value.filter(p => p.id !== playerToMove.id);
  else teamDark.value = teamDark.value.filter(p => p.id !== playerToMove.id);
  if (targetTeam === 'Light') teamLight.value.push(playerToMove);
  else teamDark.value.push(playerToMove);

  // Re-sort and shuffle the teams after manual drag/drop
  teamLight.value = sortAndShuffleTeam(teamLight.value);
  teamDark.value = sortAndShuffleTeam(teamDark.value);

  // Update the average skater ratios after the drop
  updateAvgSkaterRatios();

  // Reset votes and create new composition ID since teams were modified
  votesLight.value = 0;
  votesDark.value = 0;
  compositionId.value = Date.now();

  draggedPlayer.value = null; sourceTeam.value = null;
  saveTeams();
};

const handlePlayerSwapClick = (playerToSelect, teamName) => {
  if (teamName === 'Light') {
    if (selectedForSwapLight.value && selectedForSwapLight.value.id === playerToSelect.id) {
      selectedForSwapLight.value = null; // Deselect if clicking the same player
    } else {
      selectedForSwapLight.value = playerToSelect; // Select new player
    }
  } else if (teamName === 'Dark') {
    if (selectedForSwapDark.value && selectedForSwapDark.value.id === playerToSelect.id) {
      selectedForSwapDark.value = null; // Deselect
    } else {
      selectedForSwapDark.value = playerToSelect; // Select
    }
  }
};

const executeSwap = () => {
  if (!selectedForSwapLight.value || !selectedForSwapDark.value) {
    alert("Please select one player from each team to swap.");
    return;
  }

  const player1 = selectedForSwapLight.value;
  const player2 = selectedForSwapDark.value;

  // Remove from original teams
  teamLight.value = teamLight.value.filter(p => p.id !== player1.id);
  teamDark.value = teamDark.value.filter(p => p.id !== player2.id);

  // Add to new teams
  teamLight.value.push(player2);
  teamDark.value.push(player1);

  // Reset selection
  selectedForSwapLight.value = null;
  selectedForSwapDark.value = null;

  // Re-sort, update ratios, reset votes, and save
  teamLight.value = sortAndShuffleTeam(teamLight.value);
  teamDark.value = sortAndShuffleTeam(teamDark.value);
  updateAvgSkaterRatios();
  votesLight.value = 0;
  votesDark.value = 0;
  compositionId.value = Date.now();
  saveTeams();
};


// --- Provide data and methods to child components ---
provide('login', login);
provide('isAuthenticated', isAuthenticated);
provide('userRole', userRole);
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
provide('handlePlayerSwapClick', handlePlayerSwapClick);
provide('executeSwap', executeSwap);
provide('calculateWinRatio', calculateWinRatio);
provide('nextGameDate', nextGameDate);
provide('isGameCancelled', isGameCancelled);
provide('toggleGameCancellation', toggleGameCancellation);
provide('isBbqOn', computed(() => gameStatus.value.bbqOn));
provide('toggleBbqStatus', toggleBbqStatus);
provide('message', computed(() => gameStatus.value.message));
provide('setMessage', setMessage);
provide('isTeamsLocked', computed(() => gameStatus.value.teamsLocked));
provide('toggleTeamsLock', toggleTeamsLock);
provide('castVoteForTeam', castVoteForTeam);
provide('skipVote', getRandomPair);

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
provide('teamLight', teamLight);
provide('teamDark', teamDark);
provide('showTeams', showTeams);
provide('draftType', draftType);
provide('avgSkaterRatioLight', avgSkaterRatioLight); // Provide Light ratio
provide('avgSkaterRatioDark', avgSkaterRatioDark); // Provide Dark ratio
provide('votesLight', votesLight);
provide('votesDark', votesDark);
provide('compositionId', compositionId);
provide('selectedForSwapLight', selectedForSwapLight);
provide('selectedForSwapDark', selectedForSwapDark);
provide('loggedInUser', loggedInUser);

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
}

.app-header {
  background-color: var(--section-bg-color);
  padding: 10px 20px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
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
