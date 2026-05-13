import { createRouter, createWebHistory } from 'vue-router'
import Login from './views/Login.vue'
import Query from './views/Query.vue'

const routes = [
  { path: '/login', name: 'Login', component: Login },
  { path: '/', redirect: '/query' },
  { path: '/query', name: 'Query', component: Query, meta: { requiresAuth: true } },
  {
    path: '/admin',
    component: () => import('./views/admin/Layout.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
    children: [
      { path: '', redirect: '/admin/exams' },
      { path: 'exams', name: 'AdminExams', component: () => import('./views/admin/Exams.vue') },
      { path: 'import/:examId', name: 'AdminImport', component: () => import('./views/admin/Import.vue') },
      { path: 'scores', name: 'AdminScores', component: () => import('./views/admin/Scores.vue') },
      { path: 'cas', name: 'AdminCasConfig', component: () => import('./views/admin/CasConfig.vue') },
      { path: 'accounts', name: 'AdminAccounts', component: () => import('./views/admin/Accounts.vue') },
      { path: 'logs', name: 'AdminLogs', component: () => import('./views/admin/Logs.vue') }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token')
  const user = JSON.parse(localStorage.getItem('user') || '{}')

  if (to.meta.requiresAuth && !token) {
    // Admin routes go to local login; student routes go to CAS login
    const adminMode = to.path.startsWith('/admin') ? '?admin=1' : ''
    next('/login' + adminMode)
  } else if (to.meta.requiresAdmin && user.role !== 'admin' && user.role !== 'superadmin') {
    next('/login?admin=1')
  } else if (to.path === '/login' && token && !to.query.admin) {
    next(user.role === 'admin' || user.role === 'superadmin' ? '/admin' : '/query')
  } else {
    next()
  }
})

export default router
