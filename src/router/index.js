import { createRouter, createWebHistory } from 'vue-router';
import Home from '../views/Home.vue';
import Leaderboard from '../views/Leaderboard.vue';
import Pick from '../views/Pick.vue'; // Import the new component

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
  },
  {
    path: '/leader',
    name: 'Leaderboard',
    component: Leaderboard,
  },
  {
    path: '/pick', // Define the path
    name: 'Pick',   // Give it a name
    component: Pick, // Assign the component
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
