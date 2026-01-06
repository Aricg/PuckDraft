import Home from '../views/Home.vue';
import Login from '../views/Login.vue';
import Leaderboard from '../views/Leaderboard.vue';
import Pick from '../views/Pick.vue';
import PreviousGames from '../views/PreviousGames.vue';
import Cam from '../views/Cam.vue'; // Import the new view

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home,
  },
  {
    path: '/login',
    name: 'Login',
    component: Login,
  },
  {
    path: '/leader',
    name: 'Leaderboard',
    component: Leaderboard,
    meta: { requiresAuth: true, role: 'admin' }
  },
  {
    path: '/pick',
    name: 'Pick',
    component: Pick,
  },
  {
    path: '/previous-games',
    name: 'PreviousGames',
    component: PreviousGames,
  },
  {
    path: '/cam',
    name: 'Cam',
    component: Cam,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';

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
