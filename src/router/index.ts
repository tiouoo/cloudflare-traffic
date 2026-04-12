import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'cloudflare',
      component: () => import('../views/PlatformCf.vue'),
    },
  ],
});
export default router;
