<template>
  <div>
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
      <div class="skip-section">
        <button @click="skipVote" class="skip-btn">Skip</button>
      </div>
    </section>
    <section v-else-if="activePlayers.length >= 2">
        <p>Loading next pair...</p>
    </section>
     <section v-else>
        <!-- Updated message based on new logic -->
        <p>Add at least two 'In' Goalies or two 'In' Skaters (F/D) to start voting.</p>
    </section>
     <router-link to="/" class="nav-link">Back to Main App</router-link>
  </div>
</template>

<script setup>
import { inject } from 'vue';

// Inject data and methods needed for voting
const vote = inject('vote');
const skipVote = inject('skipVote');
const activePlayers = inject('activePlayers');
const playerA = inject('playerA');
const playerB = inject('playerB');

</script>

<style scoped>
/* Hot or Not Styling */
.hot-or-not {
  margin: 20px auto;
  max-width: 800px;
  padding: 15px;
  border: 1px solid var(--border-color);
  background-color: var(--section-bg-color);
  border-radius: 5px;
  transition: background-color 0.3s, border-color 0.3s;
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

.skip-section {
  text-align: center;
  margin-top: 20px;
}

.skip-btn {
  background-color: var(--inactive-text-color);
  color: var(--button-text-color);
  border: none;
  padding: 8px 15px;
}

.skip-btn:hover {
  background-color: var(--text-color);
}

.nav-link {
  display: block;
  margin-top: 20px; /* Add space above the link */
  color: var(--button-bg-color);
  text-decoration: none;
}
.nav-link:hover {
  text-decoration: underline;
}

/* Message styling if needed */
section p {
  margin: 20px auto;
  max-width: 800px;
  padding: 15px;
  border: 1px solid var(--border-color);
  background-color: var(--section-bg-color);
  border-radius: 5px;
  transition: background-color 0.3s, border-color 0.3s;
}
</style>
