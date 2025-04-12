<template>
  <section class="leaderboard">
    <h2>Player Leaderboard (Active Players)</h2>
     <router-link to="/" class="nav-link">Back to Main App</router-link>
    <ul v-if="rankedPlayers.length > 0">
      <li v-for="(player, index) in rankedPlayers" :key="player.id">
        <span>
          {{ index + 1 }}. {{ player.name }} ({{ player.position }}) -
          {{ player.wins }}W / {{ player.losses }}L
          ({{ (calculateWinRatio(player) * 100).toFixed(1) }}%)
        </span>
      </li>
    </ul>
    <p v-else>No active players to rank.</p>
  </section>
</template>

<script setup>
import { inject } from 'vue';

// Inject necessary data/functions
const rankedPlayers = inject('rankedPlayers');
const calculateWinRatio = inject('calculateWinRatio');

</script>

<style scoped>
/* Styles specific to Leaderboard view */
.leaderboard {
  margin: 20px auto;
  max-width: 800px;
  padding: 15px;
  border: 1px solid var(--border-color);
  background-color: var(--section-bg-color);
  border-radius: 5px;
  transition: background-color 0.3s, border-color 0.3s;
}

.leaderboard ul {
  list-style: none;
  padding: 0;
  text-align: left;
}

.leaderboard li {
  padding: 5px 0;
  border-bottom: 1px solid var(--section-border-color);
}

.leaderboard li:last-child {
  border-bottom: none;
}

.nav-link {
  display: block;
  margin-bottom: 15px;
  color: var(--button-bg-color);
  text-decoration: none;
}
.nav-link:hover {
  text-decoration: underline;
}
</style>
