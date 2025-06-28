<template>
  <div class="login-container">
    <img src="/FNHL.jpg" alt="FNHL Logo" class="logo">
    <h1>FNHL beer league</h1>
    <div class="login-form">
      <input type="password" v-model="password" placeholder="Password" @keyup.enter="handleLogin('player')" />
      <div class="login-buttons">
        <button @click="handleLogin('player')">Login as Player</button>
        <button @click="handleLogin('admin')">Login as Admin</button>
      </div>
      <p v-if="error" class="error-message">{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, inject } from 'vue';

const password = ref('');
const error = ref('');
const login = inject('login'); // Inject the login function from App.vue

const handleLogin = (role) => {
  const success = login(password.value, role);
  if (!success) {
    error.value = 'Incorrect password.';
  } else {
    error.value = '';
  }
};
</script>

<style scoped>
.login-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
  text-align: center;
}

.logo {
  max-width: 150px;
  margin-bottom: 20px;
}

.login-form input {
  padding: 10px;
  font-size: 1rem;
  width: 250px;
  margin-bottom: 15px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
}

.login-buttons button {
  padding: 10px 20px;
  margin: 0 10px;
  font-size: 1rem;
  cursor: pointer;
  background-color: var(--button-bg-color);
  color: var(--button-text-color);
  border: none;
  border-radius: 4px;
}

.login-buttons button:hover {
    background-color: var(--button-hover-bg-color);
}

.error-message {
  color: red;
  margin-top: 10px;
}
</style>
