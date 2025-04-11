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

    <!-- Other components will go here -->

  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';

// Reactive state for the roster and new player form
const players = ref([]); // Array to hold player objects { id, name, position, active }
const newPlayerName = ref('');
const newPlayerPosition = ref('F'); // Default position

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
    // Ensure loaded data has the expected structure, especially 'active' flag
    players.value = data.map(player => ({
        ...player,
        active: player.active !== undefined ? player.active : true // Default to active if missing
    }));
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
</style>
