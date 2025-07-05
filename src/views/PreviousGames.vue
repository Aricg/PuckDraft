<template>
  <div class="previous-games-container">
    <h2>Previous Games</h2>
    <div v-if="loading">Loading games...</div>
    <div v-if="!loading && games.length === 0" class="no-games">No previous games found.</div>
    <div v-else class="games-grid">
      <div v-for="game in sortedGames" :key="game.filename" class="game-card">
        <h3>Week {{ game.weekNumber }}</h3>
        <div class="teams-container">
          <div class="team-list">
            <h4>Light</h4>
            <ul>
              <li v-for="player in game.teamLight" :key="player.id">{{ player.name }}</li>
            </ul>
          </div>
          <div class="team-list">
            <h4>Dark</h4>
            <ul>
              <li v-for="player in game.teamDark" :key="player.id">{{ player.name }}</li>
            </ul>
          </div>
        </div>
        <div class="score-section">
          <h4>Final Score</h4>
          <div class="score-inputs">
            <label>Light: <input type="number" v-model.number="game.score.light" min="0"></label>
            <label>Dark: <input type="number" v-model.number="game.score.dark" min="0"></label>
          </div>
          <button @click="saveScore(game)">Save Score</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';

const games = ref([]);
const loading = ref(true);

const fetchPreviousGames = async () => {
  try {
    const response = await fetch('/api/previous-games');
    const filenames = await response.json();

    const gamePromises = filenames.map(async (filename) => {
      const res = await fetch(`/api/teams?filename=${filename}`);
      const data = await res.json();
      return {
        filename,
        weekNumber: filename.split('.')[0],
        teamLight: data.teamLight || data.teamA || [],
        teamDark: data.teamDark || data.teamB || [],
        score: {
          light: data.scoreLight,
          dark: data.scoreDark,
        }
      };
    });

    games.value = await Promise.all(gamePromises);
  } catch (error) {
    console.error("Failed to load previous games:", error);
  } finally {
    loading.value = false;
  }
};

const saveScore = async (game) => {
  try {
    const response = await fetch('/api/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: game.filename,
        score: game.score,
      }),
    });
    if (!response.ok) throw new Error('Failed to save score');
    alert(`Score for Week ${game.weekNumber} saved!`);
  } catch (error) {
    console.error("Error saving score:", error);
    alert("Failed to save score. See console for details.");
  }
};

const sortedGames = computed(() => {
  // Sort games by week number in descending order
  return [...games.value].sort((a, b) => b.weekNumber - a.weekNumber);
});

onMounted(() => {
  fetchPreviousGames();
});
</script>

<style scoped>
.previous-games-container {
  max-width: 1200px;
  margin: 0 auto;
}
.no-games {
  text-align: center;
  margin-top: 20px;
  font-style: italic;
  color: var(--inactive-text-color);
}
.games-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}
.game-card {
  border: 1px solid var(--border-color);
  border-radius: 5px;
  padding: 15px;
  background-color: var(--section-bg-color);
}
.game-card h3 {
  text-align: center;
  margin-top: 0;
  border-bottom: 1px solid var(--header-border-color);
  padding-bottom: 10px;
}
.teams-container {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}
.team-list {
  width: 48%;
}
.team-list h4 {
  margin: 0 0 5px 0;
}
.team-list ul {
  list-style-type: none;
  padding: 0;
  margin: 0;
  font-size: 0.9em;
}
.team-list li {
  padding: 2px 0;
}
.score-section {
  margin-top: 15px;
  border-top: 1px solid var(--header-border-color);
  padding-top: 15px;
  text-align: center;
}
.score-section h4 {
  margin: 0 0 10px 0;
}
.score-inputs {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-bottom: 15px;
}
.score-inputs label {
  display: flex;
  align-items: center;
  gap: 5px;
}
.score-inputs input {
  width: 50px;
  padding: 5px;
  text-align: center;
  border: 1px solid var(--border-color);
  border-radius: 4px;
}
.score-section button {
  background-color: var(--button-bg-color);
  color: var(--button-text-color);
}
.score-section button:hover {
  background-color: var(--button-hover-bg-color);
}
</style>
