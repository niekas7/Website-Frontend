import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '../views/HomePage.vue'
import TrackPage from '../views/TrackPage.vue'

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
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router 