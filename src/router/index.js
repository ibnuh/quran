import { createRouter, createWebHistory } from 'vue-router'
import PlayerView from '../views/PlayerView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'player', component: PlayerView }
  ]
})

export default router
