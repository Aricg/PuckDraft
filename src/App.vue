<template>
  <div id="app">
    <h1>Team Balancer</h1>

    <!-- Add Player Form -->
    <section class="player-form">
      <h2>Add New Player</h2>
      <form @submit.prevent="addPlayer">
        <div>
          <label for="playerName">Name:</label>
          <input type="text" id="playerName" v-model="newPlayerName" required>
        </div>
        <div>
          <label for="playerPosition">Position:</label>
          <select id="playerPosition" v-model="newPlayerPosition">
            <option value="F">Forward (F)</option>
            <option value="D">Defense (D)</option>
            <option value="G">Goalie (G)</option>
          </select>
        </div>
        <button type="submit">Add Player</button>
      </form>
    </section>

    <!-- Roster View -->
    <section class="roster">
      <h2>Roster</h2>
      <ul v-if="players.length > 0">
        <li v-for="player in players" :key="player.id" :class="{ inactive: !player.active }">
          <span>{{ player.name }} ({{ player.position }})</span>
          <label>
            <input type="checkbox" v-model="player.active">
            Active
          </label>
          <button @click="deletePlayer(player.id)" class="delete-btn">Delete</button>
        </li>
      </ul>
      <p v-else>No players added yet.</p>
    </section>

    <!-- Hot or Not Voting -->
    <section class="hot-or-not" v-if="playerA && playerB">
      <h2>Vote for the Better Player</h2>
      <div class="comparison">
        <div class="player-card">
          <h3>{{ playerA.name }}</h3>
          <p>Position: {{ playerA.position }}</p>
          <p>Score: {{ playerA.score }}</p>
          <button @click="vote(playerA.id)">Vote</button>
        </div>
        <span class="vs">vs</span>
        <div class="player-card">
          <h3>{{ playerB.name }}</h3>
          <p>Position: {{ playerB.position }}</p>
          <p>Score: {{ playerB.score }}</p>
          <button @click="vote(playerB.id)">Vote</button>
        </div>
      </div>
    </section>
    <section v-else-if="activePlayers.length >= 2">
        <p>Loading next pair...</p>
    </section>
     <section v-else>
        <p>Add at least two active players to start voting.</p>
    </section>

    <!-- Leaderboard -->
    <section class="leaderboard">
        <h2>Player Leaderboard (Active Players)</h2>
        <ul v-if="rankedPlayers.length > 0">
            <li v-for="(player, index) in rankedPlayers" :key="player.id">
                <span>{{ index + 1 }}. {{ player.name }} ({{ player.position }}) - Score: {{ player.score }}</span>
            </li>
        </ul>
        <p v-else>No active players to rank.</p>
    </section>

    <!-- Team Generation Trigger -->
     <section class="team-generation">
        <h2>Generate Teams</h2>
        <button @click="generateTeams" :disabled="activePlayers.length < 2">Generate Balanced Teams</button>
     </section>

    <!-- Generated Teams Display -->
    <section class="teams-display" v-if="showTeams">
        <h2>Generated Teams</h2>
        <div class="teams-container">
            <div class="team-list">
                <h3>Team A</h3>
                <ul>
                    <li v-for="player in teamA" :key="player.id">
                        {{ player.name }} ({{ player.position }}) - Score: {{ player.score }}
                    </li>
                </ul>
            </div>
            <div class="team-list">
                <h3>Team B</h3>
                <ul>
                     <li v-for="player in teamB" :key="player.id">
                        {{ player.name }} ({{ player.position }}) - Score: {{ player.score }}
                    </li>
                </ul>
            </div>
        </div>
         <!-- TODO: Add option to save results -->
    </section>

  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue';

// Reactive state for the roster and new player form
const players = ref([]); // Array to hold player objects { id, name, position, active }
const newPlayerName = ref('');
const newPlayerPosition = ref('F'); // Default position
const playerA = ref(null); // Player for comparison A
const playerB = ref(null); // Player for comparison B
const teamA = ref([]); // Generated Team A
const teamB = ref([]); // Generated Team B
const showTeams = ref(false); // Flag to control team display

// Computed property to get only active players
const activePlayers = computed(() => players.value.filter(p => p.active));

// Computed property for ranked leaderboard (active players sorted by score)
const rankedPlayers = computed(() => {
  // Create a copy before sorting to avoid mutating the original source
  return [...activePlayers.value].sort((a, b) => b.score - a.score);
});

// Function to add a new player
const addPlayer = () => {
  if (newPlayerName.value.trim() === '') {
    alert('Player name cannot be empty.');
    return;
  }
  const newPlayer = {
    // Simple ID generation (consider a more robust method for persistence)
    id: Date.now(),
    name: newPlayerName.value.trim(),
    position: newPlayerPosition.value,
    active: true, // New players are active by default
    score: 0, // Initialize score
  };
  players.value.push(newPlayer);

  // Clear the form
  newPlayerName.value = '';
  newPlayerPosition.value = 'F';

  savePlayers(); // Save after adding
};

// Function to load players from the backend API
const loadPlayers = async () => {
  try {
    const response = await fetch('/api/players');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    // Ensure loaded data has the expected structure, including 'active' and 'score'
    players.value = data.map(player => ({
        ...player,
        active: player.active !== undefined ? player.active : true, // Default to active if missing
        score: player.score !== undefined ? player.score : 0 // Default score to 0 if missing
    }));
    getRandomPair(); // Get initial pair after loading
  } catch (error) {
    console.error("Failed to load players:", error);
    alert('Failed to load player data. Check the console for details.');
    players.value = []; // Reset to empty array on error
  }
};

// Function to save players to the backend API
const savePlayers = async () => {
  try {
    const response = await fetch('/api/players', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(players.value),
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    // console.log('Players saved successfully'); // Optional: for debugging
  } catch (error) {
    console.error("Failed to save players:", error);
    alert('Failed to save player data. Check the console for details.');
  }
};

// Load players when the component is mounted
onMounted(loadPlayers);

// Function to delete a player
const deletePlayer = (playerId) => {
  players.value = players.value.filter(player => player.id !== playerId);
  savePlayers(); // Save after deleting
};

// Watch for changes in the players array (including nested properties like 'active')
// and save whenever a change occurs. Deep watch is needed for nested properties.
watch(players, savePlayers, { deep: true });

// Function to get a random pair of distinct active players
const getRandomPair = () => {
  const availablePlayers = activePlayers.value;
  if (availablePlayers.length < 2) {
    playerA.value = null;
    playerB.value = null;
    console.log("Need at least two active players to vote.");
    return;
  }

  let indexA = Math.floor(Math.random() * availablePlayers.length);
  let indexB = Math.floor(Math.random() * availablePlayers.length);

  // Ensure the indices are different
  while (indexA === indexB) {
    indexB = Math.floor(Math.random() * availablePlayers.length);
  }

  playerA.value = availablePlayers[indexA];
  playerB.value = availablePlayers[indexB];
  console.log("New pair:", playerA.value?.name, "vs", playerB.value?.name); // Debug log
};

// Function to handle voting
const vote = (winnerId) => {
  if (!winnerId) return;

  const winner = players.value.find(p => p.id === winnerId);
  if (winner) {
    winner.score++;
    console.log(`Voted for ${winner.name}, new score: ${winner.score}`); // Debug log
    // savePlayers() will be triggered by the watch
  } else {
      console.error("Winner not found for ID:", winnerId);
  }

  // Get the next pair immediately after voting
  getRandomPair();
};

// Watch activePlayers list to get a new pair if the list changes significantly
// (e.g., players added/removed or made inactive)
watch(activePlayers, (newActivePlayers, oldActivePlayers) => {
    // Only get a new pair if the number of active players changes
    // or if the current pair becomes invalid
    if (newActivePlayers.length !== oldActivePlayers.length ||
        !playerA.value || !playerB.value ||
        !newActivePlayers.some(p => p.id === playerA.value.id) ||
        !newActivePlayers.some(p => p.id === playerB.value.id)) {
        getRandomPair();
    }
}, { deep: true }); // Deep watch might be overkill here but ensures reactivity


// Function to generate teams using serpentine draft based on score ranking
const generateTeams = () => {
  const playersToDraft = rankedPlayers.value; // Use the computed ranked list
  const numPlayers = playersToDraft.length;

  if (numPlayers < 2) {
    alert("Need at least two active players to generate teams.");
    return;
  }

  teamA.value = [];
  teamB.value = [];
  showTeams.value = true; // Show the team display section

  let teamToggle = true; // true for Team A, false for Team B

  for (let i = 0; i < numPlayers; i++) {
    const player = playersToDraft[i];

    // Serpentine draft logic: A, B, B, A, A, B, B, ...
    if (i % 4 === 0 || i % 4 === 3) { // Picks 1, 4, 5, 8, 9, ... go to A
        teamA.value.push(player);
    } else { // Picks 2, 3, 6, 7, 10, 11, ... go to B
        teamB.value.push(player);
    }
    // Simple toggle draft logic (A, B, A, B, ...) - uncomment below to use instead
    // if (teamToggle) {
    //   teamA.value.push(player);
    // } else {
    //   teamB.value.push(player);
    // }
    // teamToggle = !teamToggle;
  }

  console.log("Teams Generated:", teamA.value, teamB.value); // Debug log
  // Note: This basic draft doesn't explicitly balance positions yet.
};

</script>

<style>
/* Global styles can go here */
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}

/* Basic Styling */
.player-form, .roster {
  margin-bottom: 20px;
  padding: 15px;
  border: 1px solid #ccc;
  border-radius: 5px;
}

.player-form div {
  margin-bottom: 10px;
}

.player-form label, .roster label {
  margin-right: 10px;
}

.roster ul {
  list-style: none;
  padding: 0;
}

.roster li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  border-bottom: 1px solid #eee;
}

.roster li.inactive span {
  text-decoration: line-through;
  color: #aaa;
}

.roster li:last-child {
  border-bottom: none;
}

.delete-btn {
  background-color: #ff4d4d;
  color: white;
  border: none;
  padding: 3px 8px;
  border-radius: 3px;
  cursor: pointer;
  font-size: 0.8em;
  margin-left: 10px; /* Add some space between checkbox and button */
}

.delete-btn:hover {
  background-color: #cc0000;
}

/* Hot or Not Styling */
.hot-or-not {
  margin-top: 30px;
  padding: 15px;
  border: 1px solid #ccc;
  border-radius: 5px;
}

.comparison {
  display: flex;
  justify-content: space-around;
  align-items: center;
  margin-top: 15px;
}

.player-card {
  border: 1px solid #eee;
  padding: 15px;
  border-radius: 5px;
  width: 40%;
  text-align: center;
}

.player-card h3 {
  margin-top: 0;
}

.player-card button {
  background-color: #4CAF50;
  color: white;
  border: none;
  padding: 10px 15px;
  text-align: center;
  text-decoration: none;
  display: inline-block;
  font-size: 16px;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;
}

.player-card button:hover {
  background-color: #45a049;
}

.vs {
  font-weight: bold;
  font-size: 1.5em;
}

/* Leaderboard, Team Generation, and Teams Display Styling */
.leaderboard, .team-generation, .teams-display {
  margin-top: 30px;
  padding: 15px;
  border: 1px solid #ccc;
  border-radius: 5px;
}

.leaderboard ul, .team-list ul {
  list-style: none;
  padding: 0;
  text-align: left; /* Align player names left */
}

.leaderboard li, .team-list li {
  padding: 5px 0;
  border-bottom: 1px solid #eee;
}

.leaderboard li:last-child, .team-list li:last-child {
  border-bottom: none;
}

.team-generation button {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 10px 20px;
  font-size: 16px;
  border-radius: 4px;
  cursor: pointer;
}

.team-generation button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.team-generation button:hover:not(:disabled) {
  background-color: #0056b3;
}

.teams-container {
  display: flex;
  justify-content: space-around;
  margin-top: 15px;
}

.team-list {
  width: 45%;
  border: 1px solid #eee;
  padding: 10px;
  border-radius: 5px;
}

.team-list h3 {
  margin-top: 0;
  text-align: center;
  border-bottom: 1px solid #ccc;
  padding-bottom: 5px;
}
</style>
