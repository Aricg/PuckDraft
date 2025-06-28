import { createRouter, createWebHistory } from 'vue-router';
import Home from '../views/Home.vue';
import Leaderboard from '../views/Leaderboard.vue';
import Pick from '../views/Pick.vue'; // Import the new component
import Login from '../views/Login.vue';

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: Login,
  },
  {
    path: '/',
    name: 'Home',
    component: Home,
    meta: { requiresAuth: true },
  },
  {
    path: '/leader',
    name: 'Leaderboard',
    component: Leaderboard,
    meta: { requiresAuth: true },
  },
  {
    path: '/pick', // Define the path
    name: 'Pick',   // Give it a name
    component: Pick, // Assign the component
    meta: { requiresAuth: true },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  const isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';

  if (to.meta.requiresAuth && !isAuthenticated) {
    // If route requires auth and user is not authenticated, redirect to login
    next({ name: 'Login' });
  } else if (to.name === 'Login' && isAuthenticated) {
    // If user is authenticated and tries to visit login page, redirect to home
    next({ name: 'Home' });
  } else {
    // Otherwise, allow navigation
    next();
  }
});

export default router;
