import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '../views/HomePage.vue'
import TrackPage from '../views/TrackPage.vue'
import PanelPage from '../views/PanelPage.vue'
import ForbiddenPage from '../views/ForbiddenPage.vue'
import VisualsPagelocal from '../views/VisualsPagelocal.vue'
import VisualsPagepublic from '../views/VisualsPagepublic.vue'
import ThreeDPage from '../views/ThreeDPage.vue'

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
    path: '/grafikai',
    name: 'grafikai',
    component: VisualsPagepublic
  },
  {
    path: '/grafikai2',
    name: 'grafikai2',
    component: VisualsPagelocal
  },
  {
    path: '/3d',
    name: 'ThreeD',
    component: ThreeDPage
  },
  {
    path: '/403',
    name: 'Forbidden',
    component: ForbiddenPage
  },
  {
    // Catch all route - redirect any undefined paths to 403
    path: '/:pathMatch(.*)*',
    redirect: '/403'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation guard to check IP for restricted access
router.beforeEach((to, from, next) => {
  // Check if the client IP is localhost
  const isLocalhost = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1' || 
                      window.location.hostname === '::1';
  
  // Redirect from /grafikai to /grafikai2 for localhost users
  if (to.path === '/grafikai' && isLocalhost) {
    next({ path: '/grafikai2' });
    return;
  }
  
  // Protect routes that should only be accessible from localhost
  if ((to.name === 'Panel' || to.name === 'grafikai2') && !isLocalhost) {
    next({ name: 'Forbidden' });
    return;
  }
  
  // Allow access for all other cases
  next();
});

export default router 