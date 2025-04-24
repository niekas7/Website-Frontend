import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '../views/HomePage.vue'
import TrackPage from '../views/TrackPage.vue'
import PanelPage from '../views/PanelPage.vue'
import ForbiddenPage from '../views/ForbiddenPage.vue'
const routes = [
  {
    path: '/',
    name: 'Home',
    component: HomePage
  },
  {
    path: '/track',
    name: 'Track',
    component: TrackPage
  },
  {
    path: '/panel',
    name: 'Panel',
    component: PanelPage
  },
  {
    path: '/403',
    name: 'Forbidden',
    component: ForbiddenPage
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation guard to check IP for panel access
router.beforeEach((to, from, next) => {
  if (to.name === 'Panel') {
    // Get the client's IP address from the request headers
    const clientIP = window.location.hostname;
    
    // Check if the client IP is localhost
    if (clientIP === 'localhost' || clientIP === '127.0.0.1' || clientIP === '::1') {
      // Allow access for localhost
      next();
    } else {
      // Redirect to Forbidden page for non-localhost
      next({ name: 'Forbidden' });
    }
  } else {
    // Allow access for all other routes
    next();
  }
});

export default router 