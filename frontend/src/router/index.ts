import { createRouter, createWebHashHistory } from 'vue-router'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/Login.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      redirect: '/agents',
    },
    {
      path: '/agents',
      name: 'Agents',
      component: () => import('@/views/AgentManage.vue'),
    },
    {
      path: '/chat',
      name: 'Chat',
      component: () => import('@/views/Chat.vue'),
    },
    {
      path: '/skills',
      name: 'Skills',
      component: () => import('@/views/SkillManage.vue'),
    },
    {
      path: '/models',
      name: 'Models',
      component: () => import('@/views/ModelManage.vue'),
    },
    {
      path: '/settings',
      name: 'Settings',
      component: () => import('@/views/Settings.vue'),
    },
  ],
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('auth_token')

  // 公开页面直接放行
  if (to.meta.public) {
    // 已登录时访问登录页，跳转到首页
    if (token && to.path === '/login') {
      next('/agents')
    } else {
      next()
    }
    return
  }

  // 未登录跳转到登录页
  if (!token) {
    next('/login')
    return
  }

  next()
})

export default router
