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
      <h2>
        Roster
        <span class="player-count">
          (F: {{ activeForwardCount }} | D: {{ activeDefenseCount }} | G: {{ activeGoalieCount }})
        </span>
      </h2>
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
        <!-- Updated message based on new logic -->
        <p>Add at least two active Goalies or two active Skaters (F/D) to start voting.</p>
    </section>

    <!-- Leaderboard -->
    <section class="leaderboard">
        <h2>
            Player Leaderboard (Active Players)
            <button @click="isLeaderboardVisible = !isLeaderboardVisible" class="toggle-btn">
                {{ isLeaderboardVisible ? 'Hide' : 'Show' }}
            </button>
        </h2>
        <ul v-if="isLeaderboardVisible && rankedPlayers.length > 0">
            <li v-for="(player, index) in rankedPlayers" :key="player.id">
                <span>{{ index + 1 }}. {{ player.name }} ({{ player.position }}) - Score: {{ player.score }}</span>
            </li>
        </ul>
        <p v-if="isLeaderboardVisible && rankedPlayers.length === 0">No active players to rank.</p>
        <p v-else-if="!isLeaderboardVisible">Leaderboard is hidden.</p>
        <!-- Removed extra </ul> and misplaced <p v-else> here -->
    </section>

    <!-- Team Generation Trigger -->
     <section class="team-generation">
        <h2>Generate Teams</h2>
        <div class="draft-options">
          <label>Draft Type:</label>
          <label>
            <input type="radio" value="serpentine" v-model="draftType"> Serpentine (A, B, B, A)
          </label>
          <label>
            <input type="radio" value="simple" v-model="draftType"> Simple (A, B, A, B)
          </label>
        </div>
        <button @click="generateTeams" :disabled="activePlayers.length < 2">Generate Balanced Teams</button>
     </section>

    <!-- Generated Teams Display -->
    <section class="teams-display" v-if="showTeams">
        <h2>Generated Teams</h2>
        <div class="teams-container">
            <div
              class="team-list"
              @dragover.prevent="onDragOver"
              @dragenter.prevent="onDragEnter($event, 'A')"
              @dragleave="onDragLeave($event, 'A')"
              @drop="onDrop($event, 'A')"
            >
                <h3>Team A</h3>
                <ul>
                    <li
                      v-for="player in teamA"
                      :key="player.id"
                      draggable="true"
                      @dragstart="onDragStart($event, player, 'A')"
                      @dragend="onDragEnd"
                    >
                        {{ player.name }} ({{ player.position }})
                    </li>
                </ul>
            </div>
            <div
              class="team-list"
              @dragover.prevent="onDragOver"
              @dragenter.prevent="onDragEnter($event, 'B')"
              @dragleave="onDragLeave($event, 'B')"
              @drop="onDrop($event, 'B')"
            >
                <h3>Team B</h3>
                <ul>
                     <li
                       v-for="player in teamB"
                       :key="player.id"
                       draggable="true"
                       @dragstart="onDragStart($event, player, 'B')"
                       @dragend="onDragEnd"
                     >
                        {{ player.name }} ({{ player.position }})
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
const draftType = ref('serpentine'); // 'serpentine' or 'simple'
const isLeaderboardVisible = ref(false); // Control leaderboard visibility

// Computed property to get only active players
const activePlayers = computed(() => players.value.filter(p => p.active));

// Computed properties for active player counts by position
const activeForwardCount = computed(() => {
    return activePlayers.value.filter(p => p.position === 'F').length;
});
const activeDefenseCount = computed(() => {
    return activePlayers.value.filter(p => p.position === 'D').length;
});
const activeGoalieCount = computed(() => {
    return activePlayers.value.filter(p => p.position === 'G').length;
});

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
    comparisonCount: 0, // Initialize comparison count
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
        score: player.score !== undefined ? player.score : 0, // Default score to 0 if missing
        comparisonCount: player.comparisonCount !== undefined ? player.comparisonCount : 0 // Default count to 0
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

// Function to get a random pair of distinct active players, separating goalies and skaters
const getRandomPair = () => {
  const activeGoalies = activePlayers.value.filter(p => p.position === 'G');
  const activeSkaters = activePlayers.value.filter(p => p.position !== 'G'); // F or D

  const canCompareGoalies = activeGoalies.length >= 2;
  const canCompareSkaters = activeSkaters.length >= 2;

  let playersToCompare = [];
  let comparisonType = '';

  // Decide which group to compare
  if (canCompareGoalies && canCompareSkaters) {
    // Both possible, choose randomly, but make goalies less frequent (e.g., 10% chance)
    comparisonType = Math.random() < 0.1 ? 'Goalies' : 'Skaters';
  } else if (canCompareGoalies) {
    comparisonType = 'Goalies';
  } else if (canCompareSkaters) {
    comparisonType = 'Skaters';
  } else {
    // Neither comparison is possible
    playerA.value = null;
    playerB.value = null;
    console.log("Need at least two active goalies or two active skaters to vote.");
    return;
  }

  // Select players from the chosen group
  if (comparisonType === 'Goalies') {
    playersToCompare = activeGoalies;
    console.log("Comparing Goalies");
  } else {
    playersToCompare = activeSkaters;
    console.log("Comparing Skaters");
  }

  // --- Select players, prioritizing lower comparison count ---

  // Find the minimum comparison count among eligible players
  const minCount = Math.min(...playersToCompare.map(p => p.comparisonCount));
  // Get all players at the minimum count
  const lowCountPlayers = playersToCompare.filter(p => p.comparisonCount === minCount);

  // Select Player A randomly from the low-count group
  const indexA = Math.floor(Math.random() * lowCountPlayers.length);
  playerA.value = lowCountPlayers[indexA];

  // Get the remaining players (excluding playerA)
  const remainingPlayers = playersToCompare.filter(p => p.id !== playerA.value.id);

  if (remainingPlayers.length === 0) {
      // This should only happen if there were exactly 2 players total and they were picked
      // Handle edge case - maybe show message or log error
      console.error("Cannot select second player - only one remaining.");
       playerA.value = null; // Reset pair
       playerB.value = null;
       return;
  }

  // Select Player B randomly from the remaining players
  const indexB = Math.floor(Math.random() * remainingPlayers.length);
  playerB.value = remainingPlayers[indexB];

  // --- Increment comparison count for the selected pair ---
  // Note: We increment when the pair is *shown*, not just when voted on.
  // The watch(players, savePlayers) will handle saving this change.
  const playerAInFullList = players.value.find(p => p.id === playerA.value.id);
  const playerBInFullList = players.value.find(p => p.id === playerB.value.id);
  if (playerAInFullList) playerAInFullList.comparisonCount++;
  if (playerBInFullList) playerBInFullList.comparisonCount++;


  console.log(`New pair: ${playerA.value?.name} (Count: ${playerAInFullList?.comparisonCount}) vs ${playerB.value?.name} (Count: ${playerBInFullList?.comparisonCount})`); // Debug log
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


// Helper function to generate the sequence of picking teams
const getPickOrder = (numPicks, firstPicker, type) => {
  const order = [];
  let currentPicker = firstPicker;
  const secondPicker = firstPicker === 'A' ? 'B' : 'A';

  if (type === 'simple') {
    for (let i = 0; i < numPicks; i++) {
      order.push(currentPicker);
      currentPicker = currentPicker === firstPicker ? secondPicker : firstPicker;
    }
  } else { // serpentine
    for (let i = 0; i < numPicks; i++) {
       // Serpentine logic: A, B, B, A, A, B, B, A ...
       // Determine picker based on index i (0-based)
      if (i % 4 === 0 || i % 4 === 3) { // Picks 1, 4, 5, 8, 9, ...
        order.push(firstPicker);
      } else { // Picks 2, 3, 6, 7, 10, 11, ...
        order.push(secondPicker);
      }
    }
  }
  return order;
};

// Function to generate teams using selected draft logic, drafting goalies last
const generateTeams = () => {
  // Separate ranked players into Forwards, Defensemen, and Goalies
  const rankedForwards = rankedPlayers.value.filter(p => p.position === 'F').sort((a, b) => b.score - a.score);
  const rankedDefensemen = rankedPlayers.value.filter(p => p.position === 'D').sort((a, b) => b.score - a.score);
  const rankedGoalies = rankedPlayers.value.filter(p => p.position === 'G').sort((a, b) => b.score - a.score);

  const numForwards = rankedForwards.length;
  const numDefensemen = rankedDefensemen.length;
  const numGoalies = rankedGoalies.length;
  const numSkaters = numForwards + numDefensemen; // Keep total skater count for check

  if (numSkaters + numGoalies < 2) {
    alert("Need at least two active players (F, D, or G) to generate teams.");
    return;
  }

  const draftTeamA = [];
  const draftTeamB = [];
  showTeams.value = true; // Show the team display section

  // --- Phase 1: Draft Forwards ---
  let firstForwardPicker = 'A'; // Team A gets first Forward pick
  if (numForwards > 0) {
      const forwardPickOrder = getPickOrder(numForwards, firstForwardPicker, draftType.value);
      console.log("Forward Pick Order:", forwardPickOrder); // Debug log
      rankedForwards.forEach((player, index) => {
          const pickingTeam = forwardPickOrder[index];
          if (pickingTeam === 'A') {
              draftTeamA.push(player);
          } else {
              draftTeamB.push(player);
          }
      });
  } else {
      console.log("No forwards to draft.");
  }

  // --- Phase 2: Draft Defensemen ---
  if (numDefensemen > 0) {
      // Team B always gets the first defenseman pick in this scheme (since A got first F pick)
      const firstDefensemanPicker = 'B';
      const defensemanPickOrder = getPickOrder(numDefensemen, firstDefensemanPicker, draftType.value);
      console.log("Defenseman Pick Order:", defensemanPickOrder); // Debug log
      rankedDefensemen.forEach((player, index) => {
          const pickingTeam = defensemanPickOrder[index];
          if (pickingTeam === 'A') {
              draftTeamA.push(player);
          } else {
              draftTeamB.push(player);
          }
      });
  } else {
      console.log("No defensemen to draft.");
  }

  // --- Calculate Skater Scores (after both F and D drafts) ---
  const scoreTeamA = draftTeamA.reduce((sum, player) => sum + player.score, 0);
  const scoreTeamB = draftTeamB.reduce((sum, player) => sum + player.score, 0);
  console.log(`Skater Scores - Team A: ${scoreTeamA}, Team B: ${scoreTeamB}`); // Debug log

  // --- Draft Goalies ---
  if (numGoalies > 0) {
    let goalieTeamToggle = scoreTeamA <= scoreTeamB; // Assign first goalie to lower score team (or A if equal)

    for (const goalie of rankedGoalies) {
      if (goalieTeamToggle) {
        draftTeamA.push(goalie); // Add goalie to the end
        console.log(`Assigning goalie ${goalie.name} to Team A`); // Debug log
      } else {
        draftTeamB.push(goalie); // Add goalie to the end
        console.log(`Assigning goalie ${goalie.name} to Team B`); // Debug log
      }
      goalieTeamToggle = !goalieTeamToggle; // Alternate for next goalie
    }
  }

  // --- Sort teams by position (F > D > G) before final assignment ---
  const positionOrder = { 'F': 1, 'D': 2, 'G': 3 };
  draftTeamA.sort((a, b) => positionOrder[a.position] - positionOrder[b.position]);
  draftTeamB.sort((a, b) => positionOrder[a.position] - positionOrder[b.position]);

  // Assign the final sorted drafted teams to the reactive refs
  teamA.value = draftTeamA;
  teamB.value = draftTeamB;

  console.log("Final Sorted Teams Generated:", teamA.value, teamB.value); // Debug log
};


// --- Drag and Drop Handlers ---

const draggedPlayer = ref(null); // Store the player being dragged
const sourceTeam = ref(null); // Store the team the player is dragged from ('A' or 'B')

const onDragStart = (event, player, team) => {
  // Set data to be transferred (player ID)
  event.dataTransfer.setData('text/plain', player.id);
  event.dataTransfer.effectAllowed = 'move';
  draggedPlayer.value = player; // Keep track of the object itself
  sourceTeam.value = team;
  // Optional: Add a class to the dragged element for styling
  event.target.classList.add('dragging');
  console.log(`Drag Start: ${player.name} from Team ${team}`);
};

const onDragEnd = (event) => {
  // Clean up styling when drag ends (successfully or cancelled)
  event.target.classList.remove('dragging');
  // Clear drag-over styles from potential targets
  document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
  draggedPlayer.value = null;
  sourceTeam.value = null;
   console.log('Drag End');
};


const onDragOver = (event) => {
  // Prevent default to allow drop
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
};

const onDragEnter = (event, targetTeam) => {
  // Add visual feedback when entering a valid drop zone
  if (event.target.closest('.team-list') && sourceTeam.value !== targetTeam) {
      event.target.closest('.team-list').classList.add('drag-over');
      console.log(`Drag Enter: Team ${targetTeam}`);
  }
};

const onDragLeave = (event, targetTeam) => {
  // Remove visual feedback when leaving the drop zone boundary
  // Check if the relatedTarget (where the mouse is going) is outside the current element
   if (!event.currentTarget.contains(event.relatedTarget)) {
        event.currentTarget.classList.remove('drag-over');
        console.log(`Drag Leave: Team ${targetTeam}`);
   }
};

const onDrop = (event, targetTeam) => {
  event.preventDefault();
  const targetListElement = event.target.closest('.team-list');
  if (!targetListElement) return; // Should not happen if dragover worked

  targetListElement.classList.remove('drag-over'); // Remove drop zone styling

  const playerId = parseInt(event.dataTransfer.getData('text/plain'), 10); // Ensure ID is number if needed
  const playerToMove = draggedPlayer.value; // Use the stored player object

  console.log(`Drop: Player ID ${playerId} onto Team ${targetTeam}, from Team ${sourceTeam.value}`);


  // Ensure we have the player and it's not dropped onto the same team
  if (!playerToMove || sourceTeam.value === targetTeam) {
    console.log("Drop cancelled: Same team or no player data.");
    return;
  }

  // Remove from source team
  if (sourceTeam.value === 'A') {
    teamA.value = teamA.value.filter(p => p.id !== playerToMove.id);
  } else {
    teamB.value = teamB.value.filter(p => p.id !== playerToMove.id);
  }

  // Add to target team
  if (targetTeam === 'A') {
    teamA.value.push(playerToMove);
  } else {
    teamB.value.push(playerToMove);
  }

  // Reset drag state
  draggedPlayer.value = null;
  sourceTeam.value = null;

  // Note: Changes to teamA/teamB are reactive, but don't trigger savePlayers
  // If persistence of manual swaps is needed, call savePlayers() or similar here.
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

.draft-options {
  margin-bottom: 15px;
  text-align: center;
}

.draft-options label {
  margin: 0 10px;
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

/* Drag and Drop Styling */
.team-list li[draggable="true"] {
  cursor: move;
  user-select: none; /* Prevent text selection while dragging */
}

.team-list li.dragging {
  opacity: 0.5; /* Make the dragged item semi-transparent */
  background: #f0f0f0;
}

.team-list.drag-over {
  background-color: #e0ffe0; /* Highlight drop zone */
  border-style: dashed;
}

/* Player Count Styling */
.player-count {
  font-size: 0.8em;
  font-weight: normal;
  margin-left: 10px;
  color: #555; /* Default color */
}

.player-count.count-over-limit {
  color: red;
}

/* Toggle Button Styling */
.toggle-btn {
    font-size: 0.6em;
    padding: 2px 6px;
    margin-left: 10px;
    cursor: pointer;
    vertical-align: middle; /* Align button nicely with text */
}
</style>
