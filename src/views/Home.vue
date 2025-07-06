<template>
  <div class="home-container">
    <!-- Message of the Day for Players -->
    <section class="player-message" v-if="userRole === 'player' && message">
      <p>{{ message }}</p>
    </section>
    <!-- Game Management -->
    <section class="game-management" v-if="userRole === 'admin'">
      <h2>Game Management</h2>
      <div v-if="!isGameCancelled">
        <p>Next game is scheduled for <strong>Friday, {{ formattedNextGameDate }}</strong>.</p>
        <button @click="toggleGameCancellation">Cancel This Week's Game</button>
      </div>
      <div v-else>
        <p>The game for <strong>Friday, {{ formattedNextGameDate }}</strong> is <strong class="cancelled-text">CANCELLED</strong>.</p>
        <button @click="toggleGameCancellation">Re-enable This Week's Game</button>
      </div>
      <hr>
      <div class="bbq-controls">
          <p>BBQ Status: <strong :class="{ 'bbq-on-text': isBbqOn }">{{ isBbqOn ? 'ON' : 'OFF' }}</strong></p>
          <button @click="toggleBbqStatus" :class="isBbqOn ? 'turn-off-btn' : 'turn-on-btn'">
            {{ isBbqOn ? 'Turn BBQ Off' : 'Turn BBQ On' }}
          </button>
      </div>
      <hr>
      <div class="lock-controls">
        <p>Teams Status: <strong :class="{ 'locked-text': isTeamsLocked }">{{ isTeamsLocked ? 'LOCKED' : 'UNLOCKED' }}</strong></p>
        <button @click="toggleTeamsLock" :class="isTeamsLocked ? 'turn-on-btn' : 'lock-btn'">
          {{ isTeamsLocked ? 'Unlock Teams' : 'Lock Teams' }}
        </button>
      </div>
    </section>

    <!-- Message Management -->
    <section class="message-management" v-if="userRole === 'admin'">
      <h2>Message for Players</h2>
      <textarea v-model="adminMessage" rows="3" placeholder="Enter a message to display to players..."></textarea>
      <div class="message-buttons">
        <button @click="handleSetMessage" class="set-message-btn">Set Message</button>
        <button @click="handleClearMessage" class="clear-message-btn">Clear Message</button>
      </div>
    </section>

    <!-- Add Player Form -->
    <section class="player-form" v-if="userRole === 'admin'">
      <h2>Add New Player</h2>
      <div class="player-form-content">
        <img src="/FNHL.jpg" alt="FNHL Logo" class="form-logo">
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
        <img src="/FNHL.jpg" alt="FNHL Logo" class="form-logo">
      </div>
    </section>

    <!-- Top Pick Banner for Players -->
    <section class="top-pick-banner" v-if="userRole === 'player'">
      <router-link to="/pick" class="banner-link">
        <img src="/FNHL.jpg" alt="FNHL Logo" class="banner-logo">
        <div class="banner-content">
          <h2>Play Top Pick?</h2>
          <p>Help rank players by choosing who is better!</p>
        </div>
      </router-link>
    </section>

    <!-- Next Game Countdown for Players -->
    <section class="next-game-countdown" v-if="userRole === 'player'">
      <div v-if="isGameCancelled">
        <h2>Game On?</h2>
        <p class="cancelled-text">This week's game is CANCELLED.</p>
      </div>
      <div v-else>
        <h2>Next Game: Friday, {{ formattedNextGameDate }} at 9:30 PM</h2>
        <div class="countdown">{{ countdownDisplay }}</div>
        <p v-if="isBbqOn" class="bbq-on-text">🍖 BBQ is ON!</p>
      </div>
    </section>

    <!-- Roster View -->
    <section class="roster">
      <h2>
        Roster
        <span class="player-count">
          (F: {{ activeForwardCount }} | D: {{ activeDefenseCount }} | G: {{ activeGoalieCount }})
        </span>
        <span v-if="(activeForwardCount + activeDefenseCount) === 20 && activeGoalieCount === 2" class="roster-full-message">
          (FULL)
        </span>
      </h2>
      <div class="roster-controls" v-if="userRole === 'admin'">
        <button @click="toggleAllPlayers(true)" class="all-in-btn">All In</button>
        <button @click="toggleAllPlayers(false)" class="all-out-btn">All Out</button>
      </div>
      <ul v-if="sortedRosterPlayers.length > 0">
        <li v-for="player in sortedRosterPlayers" :key="player.id" :class="{ inactive: !player.active }">
          <span>
            {{ player.name }}
            <!-- Static display for Goalies -->
            <span v-if="player.position === 'G'"> (G)</span>
            <!-- Dropdown for F/D -->
            <select v-else v-model="player.position" class="position-select">
              <option value="F">F</option>
              <option value="D">D</option>
            </select>
          </span>
          <span class="roster-player-controls">
            <label v-if="userRole === 'admin'">
              <input type="checkbox" v-model="player.isFullTime">
              Full Time
            </label>
            <label>
              <input type="checkbox" v-model="player.active">
              In
            </label>
            <button @click="deletePlayer(player.id)" class="delete-btn" v-if="userRole === 'admin'">Delete</button>
          </span>
        </li>
      </ul>
      <p v-else>No players added yet.</p>
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
    <section class="teams-display" v-if="showTeams" :class="{ 'locked-for-player-view': userRole === 'player' && isTeamsLocked }">
        <h2>Teams for {{ formattedNextGameDate }}</h2>
        <div class="teams-container">
            <div
              class="team-list"
              @dragover.prevent="onDragOver"
              @dragenter.prevent="onDragEnter($event, 'Light')"
              @dragleave="onDragLeave($event, 'Light')"
              @drop="onDrop($event, 'Light')"
            >
                <h3>Light</h3>
                <p class="team-strength">Avg Skater Strength: {{ (avgSkaterRatioLight * 100).toFixed(1) }}%</p>
                <ul>
                    <li
                      v-for="player in teamLight"
                      :key="player.id"
                      draggable="true"
                      @dragstart="onDragStart($event, player, 'Light')"
                      @dragend="onDragEnd"
                      @click="handlePlayerSwapClick(player, 'Light')"
                      :class="{ 'selected-for-swap': selectedForSwapLight && selectedForSwapLight.id === player.id }"
                    >
                        {{ player.name }} ({{ player.position }})
                    </li>
                </ul>
            </div>
            <div
              class="team-list"
              @dragover.prevent="onDragOver"
              @dragenter.prevent="onDragEnter($event, 'Dark')"
              @dragleave="onDragLeave($event, 'Dark')"
              @drop="onDrop($event, 'Dark')"
            >
                <h3>Dark</h3>
                <p class="team-strength">Avg Skater Strength: {{ (avgSkaterRatioDark * 100).toFixed(1) }}%</p>
                <ul>
                     <li
                       v-for="player in teamDark"
                       :key="player.id"
                       draggable="true"
                       @dragstart="onDragStart($event, player, 'Dark')"
                       @dragend="onDragEnd"
                       @click="handlePlayerSwapClick(player, 'Dark')"
                       :class="{ 'selected-for-swap': selectedForSwapDark && selectedForSwapDark.id === player.id }"
                     >
                        {{ player.name }} ({{ player.position }})
                    </li>
                </ul>
            </div>
        </div>
        <div class="swap-controls" v-if="selectedForSwapLight && selectedForSwapDark">
          <div class="swap-preview" v-if="swapPreview">
            <p>
              Light: {{ (avgSkaterRatioLight * 100).toFixed(1) }}% <span class="arrow">→</span> {{ ((avgSkaterRatioLight * 100) + parseFloat(swapPreview.light)).toFixed(1) }}%
              <span :class="swapPreview.light >= 0 ? 'strength-up' : 'strength-down'">
                ({{ swapPreview.light >= 0 ? '+' : '' }}{{ swapPreview.light }}%)
              </span>
            </p>
            <p>
              Dark: {{ (avgSkaterRatioDark * 100).toFixed(1) }}% <span class="arrow">→</span> {{ ((avgSkaterRatioDark * 100) + parseFloat(swapPreview.dark)).toFixed(1) }}%
              <span :class="swapPreview.dark >= 0 ? 'strength-up' : 'strength-down'">
                ({{ swapPreview.dark >= 0 ? '+' : '' }}{{ swapPreview.dark }}%)
              </span>
            </p>
          </div>
          <button @click="executeSwap" class="swap-btn">Swap Selected Players</button>
        </div>
        <div class="team-voting">
          <h4>Which team is stronger?</h4>
          <div class="vote-buttons">
            <button @click="castVoteForTeam('Light')" :disabled="userVote" :class="{ 'voted-for': userVote === 'Light' }">
              Vote Light ({{ votesLight || 0 }})
            </button>
            <button @click="castVoteForTeam('Dark')" :disabled="userVote" :class="{ 'voted-for': userVote === 'Dark' }">
              Vote Dark ({{ votesDark || 0 }})
            </button>
          </div>
          <p v-if="userVote" class="vote-thanks">Thanks for voting!</p>
        </div>
    </section>
  </div>
</template>

<script setup>
import { inject, ref, computed, onMounted, onUnmounted, watch } from 'vue';

// Inject data and methods provided by App.vue
const players = inject('players');
const userRole = inject('userRole');
const nextGameDate = inject('nextGameDate');
const isGameCancelled = inject('isGameCancelled');
const toggleGameCancellation = inject('toggleGameCancellation');
const isBbqOn = inject('isBbqOn');
const toggleBbqStatus = inject('toggleBbqStatus');
const message = inject('message');
const setMessage = inject('setMessage');
const isTeamsLocked = inject('isTeamsLocked');
const toggleTeamsLock = inject('toggleTeamsLock');
const castVoteForTeam = inject('castVoteForTeam');
const compositionId = inject('compositionId');
const handlePlayerSwapClick = inject('handlePlayerSwapClick');
const executeSwap = inject('executeSwap');
const selectedForSwapLight = inject('selectedForSwapLight');
const selectedForSwapDark = inject('selectedForSwapDark');

const adminMessage = ref('');

watch(message, (newMessage) => {
  adminMessage.value = newMessage;
}, { immediate: true });

const handleSetMessage = () => {
  setMessage(adminMessage.value);
  alert('Message updated!');
};

const handleClearMessage = () => {
  adminMessage.value = '';
  setMessage('');
  alert('Message cleared!');
};

const toggleAllPlayers = (status) => {
  players.value.forEach(p => {
    if (!p.isFullTime) {
      p.active = status;
    }
  });
};

// For admin game management display
const formattedNextGameDate = computed(() => {
  if (!nextGameDate.value) return '';
  return nextGameDate.value.toLocaleDateString('en-US', { /* year: 'numeric', */ month: 'long', day: 'numeric' });
});

// For player countdown
const countdownDisplay = ref('');
let countdownInterval = null;

const updateCountdown = () => {
  if (!nextGameDate.value) return;
  const now = new Date().getTime();
  const distance = nextGameDate.value.getTime() - now;

  if (distance < 0) {
    countdownDisplay.value = "It's Game Time!";
    if (countdownInterval) clearInterval(countdownInterval);
    return;
  }

  const days = Math.floor(distance / (1000 * 60 * 60 * 24));
  const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

  countdownDisplay.value = `${days}d ${hours}h ${minutes}m`;
};

onMounted(() => {
  if (userRole.value === 'player' && !isGameCancelled.value) {
    updateCountdown();
    countdownInterval = setInterval(updateCountdown, 1000);
  }
});

onUnmounted(() => {
  if (countdownInterval) {
    clearInterval(countdownInterval);
  }
});

const getWeekNumber = (d) => {
  d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return weekNo;
};
const currentWeekNumber = computed(() => getWeekNumber(new Date()));
const userVote = computed(() => {
  if (!compositionId.value) return null; // Can't have voted if there's no composition ID
  return localStorage.getItem(`voted_week_${currentWeekNumber.value}_${compositionId.value}`);
});


// Use a ref and a watch for sorting to avoid mutation side-effects in computed properties
const sortedRosterPlayers = ref([]);
watch(players, (newPlayers) => {
  // Create a shallow copy, sort it, and update the ref
  sortedRosterPlayers.value = [...newPlayers].sort((a, b) => a.name.localeCompare(b.name));
}, { deep: true, immediate: true }); // Use deep and immediate to catch all changes and run on setup
const addPlayer = inject('addPlayer');
const deletePlayer = inject('deletePlayer');
// vote is removed
const generateTeams = inject('generateTeams');
const onDragStart = inject('onDragStart');
const onDragEnd = inject('onDragEnd');
const onDragOver = inject('onDragOver');
const onDragEnter = inject('onDragEnter');
const onDragLeave = inject('onDragLeave');
const onDrop = inject('onDrop');
const calculateWinRatio = inject('calculateWinRatio');

// Inject computed properties
const activeForwardCount = inject('activeForwardCount');
const activeDefenseCount = inject('activeDefenseCount');
const activeGoalieCount = inject('activeGoalieCount');
const activePlayers = inject('activePlayers');

// Inject refs needed for this view
const newPlayerName = inject('newPlayerName');
const newPlayerPosition = inject('newPlayerPosition');
// playerA and playerB are removed
const teamLight = inject('teamLight');
const teamDark = inject('teamDark');
const showTeams = inject('showTeams');
const draftType = inject('draftType');
const avgSkaterRatioLight = inject('avgSkaterRatioLight'); // Inject Light ratio
const avgSkaterRatioDark = inject('avgSkaterRatioDark'); // Inject Dark ratio
const votesLight = inject('votesLight');
const votesDark = inject('votesDark');

const swapPreview = computed(() => {
  if (!selectedForSwapLight.value || !selectedForSwapDark.value) {
    return null;
  }

  const player1 = selectedForSwapLight.value;
  const player2 = selectedForSwapDark.value;

  // Helper to calculate avg strength for a team of players
  const calculateTeamStrength = (team) => {
    const skaters = team.filter(p => p.position !== 'G');
    if (skaters.length === 0) return 0;
    const totalRatio = skaters.reduce((sum, p) => sum + calculateWinRatio(p), 0);
    return totalRatio / skaters.length;
  };

  // Create temporary teams to simulate the swap
  const tempTeamLight = [...teamLight.value.filter(p => p.id !== player1.id), player2];
  const tempTeamDark = [...teamDark.value.filter(p => p.id !== player2.id), player1];

  const newStrengthLight = calculateTeamStrength(tempTeamLight);
  const newStrengthDark = calculateTeamStrength(tempTeamDark);

  const lightDiff = newStrengthLight - avgSkaterRatioLight.value;
  const darkDiff = newStrengthDark - avgSkaterRatioDark.value;

  return {
    light: (lightDiff * 100).toFixed(1),
    dark: (darkDiff * 100).toFixed(1),
  };
});

</script>

<style scoped>
.home-container {
  display: flex;
  flex-direction: column;
}

.teams-display.locked-for-player-view {
  order: -2; /* Move to near the top for players when locked */
}

/* Scoped styles for Home view if needed, or keep global styles in App.vue */
/* Styles specific to sections moved here can be copied from App.vue's <style> */
.player-message {
  order: -3; /* Ensure message is always first */
  margin: 20px auto; /* Center sections */
  max-width: 800px; /* Limit width for better readability */
  padding: 15px;
  border: 1px solid #ffeeba;
  background-color: #fff3cd;
  color: #856404;
  border-radius: 5px;
  text-align: center;
}

.player-message p {
  margin: 0;
  font-weight: 500;
}

/* Basic Styling using variables */
.player-form, .roster, .hot-or-not, .leaderboard, .team-generation, .teams-display, .top-pick-banner, .game-management, .next-game-countdown, .message-management {
  margin: 20px auto; /* Center sections */
  max-width: 800px; /* Limit width for better readability */
  padding: 15px;
  border: 1px solid var(--border-color);
  background-color: var(--section-bg-color);
  border-radius: 5px;
  transition: background-color 0.3s, border-color 0.3s;
}

.player-form-content {
  display: flex;
  align-items: center; /* Vertically center items */
  justify-content: center; /* Center items horizontally */
  gap: 20px; /* Add space between logo and form */
}

.form-logo {
  height: 100px; /* Adjust size as needed */
  width: auto;
}

.player-form form {
  /* Keep form elements grouped */
  display: flex;
  flex-direction: column;
  align-items: center; /* Center form elements */
}

.player-form div {
  margin-bottom: 10px;
  /* Ensure labels and inputs are aligned if needed */
  display: flex;
  align-items: center;
  width: 100%; /* Make div take full width if needed */
  justify-content: center; /* Center label/input pair */
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
  border-bottom: 1px solid var(--section-border-color);
}

.roster-player-controls {
  display: flex;
  align-items: center;
  gap: 15px; /* Space between controls */
}

.roster li.inactive span {
  text-decoration: line-through;
  color: var(--inactive-text-color);
}

.roster li:last-child {
  border-bottom: none;
}

.delete-btn {
  background-color: var(--delete-button-bg-color);
  color: var(--button-text-color);
  border: none;
  padding: 3px 8px;
  border-radius: 3px;
  cursor: pointer;
  font-size: 0.8em;
  margin-left: 10px; /* Add some space between checkbox and button */
}

.delete-btn:hover {
  background-color: var(--delete-button-hover-bg-color);
}

/* Team Generation, and Teams Display Styling */
.team-generation, .teams-display {
  margin-top: 30px; /* Keep margin if desired after removing hot-or-not */
  padding: 15px;
  /* border: 1px solid #ccc; */ /* Duplicated */
  border-radius: 5px;
}

.team-list ul {
  list-style: none;
  padding: 0;
  text-align: left; /* Align player names left */
}

.team-list li {
  padding: 5px 0;
  border-bottom: 1px solid var(--section-border-color);
}

.team-list li:last-child {
  border-bottom: none;
}

/* General Button Styling */
button {
  cursor: pointer;
  border-radius: 4px;
  padding: 8px 15px;
  border: none;
  font-size: 1em;
  transition: background-color 0.2s;
}

/* Specific Button Types */
.player-form button[type="submit"],
.team-generation button {
  background-color: var(--button-bg-color);
  color: var(--button-text-color);
  padding: 10px 20px; /* Keep specific padding if needed */
  font-size: 16px; /* Keep specific font size if needed */
  /* font-size: 16px; */ /* Duplicate */
  border-radius: 4px;
  cursor: pointer;
}

.team-generation button:disabled {
  background-color: var(--border-color); /* Use border color for disabled state */
  color: var(--inactive-text-color);
  cursor: not-allowed;
}

.team-generation button:hover:not(:disabled) {
  background-color: var(--button-hover-bg-color);
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
  border: 1px solid var(--section-border-color);
  background-color: var(--bg-color); /* Match app background or keep section */
  padding: 10px;
  border-radius: 5px;
}

.team-list h3 {
  margin-top: 0;
  text-align: center;
  border-bottom: 1px solid var(--header-border-color);
  padding-bottom: 5px;
}

.team-strength {
  font-size: 0.85em;
  color: var(--inactive-text-color); /* Use a less prominent color */
  text-align: center;
  margin-top: -5px; /* Adjust spacing */
  margin-bottom: 10px;
}

/* Drag and Drop Styling */
.team-list li[draggable="true"] {
  cursor: move;
  user-select: none; /* Prevent text selection while dragging */
}

.team-list li.dragging {
  opacity: 0.5; /* Make the dragged item semi-transparent */
  background: var(--dragging-bg-color);
}

.team-list.drag-over {
  background-color: var(--drag-over-bg-color); /* Highlight drop zone */
  border-style: dashed;
  border-color: var(--vote-button-bg-color); /* Use an accent color for dashed border */
}

/* Styling for the position dropdown in the roster */
.position-select {
  margin-left: 5px; /* Add some space after the name */
  padding: 1px 3px;
  font-size: 0.9em;
  background-color: var(--bg-color); /* Match background */
  color: var(--text-color); /* Match text color */
  border: 1px solid var(--border-color);
  border-radius: 3px;
}

.player-count {
  font-size: 0.8em;
  font-weight: normal;
  margin-left: 10px;
  color: var(--text-color); /* Use main text color */
  opacity: 0.8; /* Slightly dimmer */
}

/* Styles for Top Pick Banner */
.top-pick-banner {
  padding: 0; /* Remove padding from section to allow link to fill it */
  overflow: hidden; /* Ensures the child's border-radius is respected */
}

.banner-link {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 20px;
  text-decoration: none;
  color: var(--text-color);
  transition: background-color 0.2s;
}

.banner-link:hover {
  background-color: var(--drag-over-bg-color); /* A subtle hover effect */
}

.banner-logo {
  height: 80px;
  width: auto;
  flex-shrink: 0; /* Prevents logo from shrinking */
}

.banner-content {
  text-align: left;
}

.banner-content h2 {
  margin-top: 0;
  margin-bottom: 5px;
  color: var(--nav-link-color); /* Make it look like a link */
}

.banner-content p {
  margin: 0;
  font-size: 0.9em;
}

/* Game management and Countdown styling */
.game-management button {
  background-color: var(--delete-button-bg-color);
  color: var(--button-text-color);
}
.game-management button:hover {
  background-color: var(--delete-button-hover-bg-color);
}
.game-management div:last-child button {
    background-color: var(--vote-button-bg-color);
}
.game-management div:last-child button:hover {
    background-color: var(--vote-button-hover-bg-color);
}
.cancelled-text {
  color: var(--delete-button-bg-color);
  font-weight: bold;
}
.countdown {
  font-size: 2em;
  font-weight: bold;
  color: var(--nav-link-color);
}

/* Game management and Countdown styling */
.game-management hr {
  border: none;
  border-top: 1px solid var(--border-color);
  margin: 20px 0;
}

.bbq-controls .turn-on-btn {
  background-color: var(--vote-button-bg-color);
}
.bbq-controls .turn-on-btn:hover {
  background-color: var(--vote-button-hover-bg-color);
}
.bbq-controls .turn-off-btn {
  background-color: var(--delete-button-bg-color);
  color: var(--button-text-color);
}
.bbq-controls .turn-off-btn:hover {
  background-color: var(--delete-button-hover-bg-color);
}

.bbq-on-text {
  color: var(--vote-button-bg-color);
  font-weight: bold;
}

/* Team Lock Styling */
.lock-controls .lock-btn {
  background-color: var(--button-bg-color);
  color: var(--button-text-color);
}
.lock-controls .lock-btn:hover {
  background-color: var(--button-hover-bg-color);
}
/* Unlock button uses .turn-on-btn styles already defined in bbq-controls */
.locked-text {
  color: var(--delete-button-bg-color);
  font-weight: bold;
}

/* Message Management Styling */
.message-management textarea {
  width: 100%;
  padding: 10px;
  box-sizing: border-box;
  margin-bottom: 10px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--bg-color);
  color: var(--text-color);
  font-family: inherit;
  font-size: 1em;
}

.message-management .message-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.message-management .set-message-btn {
  background-color: var(--button-bg-color);
  color: var(--button-text-color);
}
.message-management .set-message-btn:hover {
  background-color: var(--button-hover-bg-color);
}
.message-management .clear-message-btn {
  background-color: var(--delete-button-bg-color);
  color: var(--button-text-color);
}
.message-management .clear-message-btn:hover {
  background-color: var(--delete-button-hover-bg-color);
}

.roster-full-message {
  color: var(--delete-button-bg-color);
  font-weight: bold;
  margin-left: 10px;
}

/* Team Voting Styles */
.team-voting {
  text-align: center;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--border-color);
}
.vote-buttons {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-top: 10px;
}
.vote-buttons button {
  background-color: var(--button-bg-color);
  color: var(--button-text-color);
}
.vote-buttons button:hover:not(:disabled) {
  background-color: var(--button-hover-bg-color);
}
.vote-buttons button:disabled {
  background-color: var(--inactive-text-color);
  cursor: not-allowed;
  opacity: 0.7;
}
.vote-buttons button.voted-for {
  background-color: var(--vote-button-bg-color);
  border: 2px solid var(--text-color);
  box-shadow: 0 0 5px var(--vote-button-bg-color);
}
.vote-thanks {
  margin-top: 10px;
  font-style: italic;
  color: var(--vote-button-bg-color);
}

.roster-controls {
  margin-bottom: 15px;
  display: flex;
  justify-content: center;
  gap: 10px;
}
.roster-controls .all-in-btn {
  background-color: var(--vote-button-bg-color);
  color: var(--button-text-color);
}
.roster-controls .all-in-btn:hover {
  background-color: var(--vote-button-hover-bg-color);
}
.roster-controls .all-out-btn {
  background-color: var(--delete-button-bg-color);
  color: var(--button-text-color);
}
.roster-controls .all-out-btn:hover {
  background-color: var(--delete-button-hover-bg-color);
}

.team-list li.selected-for-swap {
  background-color: var(--vote-button-bg-color);
  color: var(--button-text-color);
  font-weight: bold;
}

.swap-controls {
  text-align: center;
  margin: 15px 0;
}

.swap-btn {
  background-color: var(--button-bg-color);
  color: var(--button-text-color);
  padding: 10px 20px;
}

.swap-btn:hover {
  background-color: var(--button-hover-bg-color);
}

.swap-preview {
  margin-bottom: 15px;
  padding: 10px;
  background-color: var(--bg-color);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 0.9em;
}
.swap-preview p {
  margin: 5px 0;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
}
.swap-preview .arrow {
  font-size: 1.2em;
}
.strength-up {
  color: var(--vote-button-bg-color);
  font-weight: bold;
}
.strength-down {
  color: var(--delete-button-bg-color);
  font-weight: bold;
}
</style>
