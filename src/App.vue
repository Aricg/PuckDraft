<template>
  <div id="app" :class="{ 'dark-theme': isDarkMode }">
    <header class="app-header">
      <h1>FNHL beer league</h1>
      <nav>
        <router-link to="/">Home</router-link> |
        <router-link to="/leader">Leaderboard</router-link>
      </nav>
      <button @click="toggleTheme" class="theme-toggle-btn">
        {{ isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode' }}
