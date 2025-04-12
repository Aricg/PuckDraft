<template>
  <div>
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
      <h2>Top Pick?</h2>
      <div class="comparison">
        <div class="player-card">
          <h3>{{ playerA.name }}</h3>
          <p>Position: {{ playerA.position }}</p>
          <!-- Record and Ratio hidden -->
          <button @click="vote(playerA.id)">Vote</button>
        </div>
        <span class="vs">vs</span>
        <div class="player-card">
          <h3>{{ playerB.name }}</h3>
          <p>Position: {{ playerB.position }}</p>
          <!-- Record and Ratio hidden -->
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
import { inject, ref } from 'vue';

// Inject data and methods provided by App.vue
const players = inject('players');
const addPlayer = inject('addPlayer');
const deletePlayer = inject('deletePlayer');
const vote = inject('vote');
const generateTeams = inject('generateTeams');
const onDragStart = inject('onDragStart');
const onDragEnd = inject('onDragEnd');
const onDragOver = inject('onDragOver');
const onDragEnter = inject('onDragEnter');
const onDragLeave = inject('onDragLeave');
const onDrop = inject('onDrop');

// Inject computed properties
const activeForwardCount = inject('activeForwardCount');
const activeDefenseCount = inject('activeDefenseCount');
const activeGoalieCount = inject('activeGoalieCount');
const activePlayers = inject('activePlayers');

// Inject refs needed for this view
const newPlayerName = inject('newPlayerName');
const newPlayerPosition = inject('newPlayerPosition');
const playerA = inject('playerA');
const playerB = inject('playerB');
const teamA = inject('teamA');
const teamB = inject('teamB');
const showTeams = inject('showTeams');
const draftType = inject('draftType');

</script>

<style scoped>
/* Scoped styles for Home view if needed, or keep global styles in App.vue */
/* Styles specific to sections moved here can be copied from App.vue's <style> */
/* Basic Styling using variables */
.player-form, .roster, .hot-or-not, .leaderboard, .team-generation, .teams-display {
  margin: 20px auto; /* Center sections */
  max-width: 800px; /* Limit width for better readability */
  padding: 15px;
  border: 1px solid var(--border-color);
  background-color: var(--section-bg-color);
  border-radius: 5px;
  transition: background-color 0.3s, border-color 0.3s;
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
  border-bottom: 1px solid var(--section-border-color);
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

/* Hot or Not Styling */
.hot-or-not {
  margin-top: 30px;
  padding: 15px;
  /* border: 1px solid #ccc; */ /* Duplicated from above */
  border-radius: 5px;
}

.comparison {
  display: flex;
  justify-content: space-around;
  align-items: center;
  margin-top: 15px;
}

.player-card {
  border: 1px solid var(--section-border-color);
  background-color: var(--bg-color); /* Match app background or keep section */
  padding: 15px;
  border-radius: 5px;
  width: 40%;
  text-align: center;
}

.player-card h3 {
  margin-top: 0;
}

.player-card button {
  background-color: var(--vote-button-bg-color);
  color: var(--button-text-color);
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
  background-color: var(--vote-button-hover-bg-color);
}

.vs {
  font-weight: bold;
  font-size: 1.5em;
}

/* Team Generation, and Teams Display Styling */
.team-generation, .teams-display {
  margin-top: 30px;
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
</style>
