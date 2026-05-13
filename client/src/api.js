import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 15000
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const authApi = {
  getCasConfig: () => api.get('/auth/cas/config'),
  updateCasConfig: (data) => api.put('/auth/cas/config', data),
  getCasLoginUrl: () => api.get('/auth/cas/login'),
  casLogout: () => api.get('/auth/cas/logout'),
  me: () => api.get('/auth/me')
}

export const queryApi = {
  getExams: () => api.get('/query/exams'),
  getScore: (examId, idCard) => api.get(`/query/exams/${examId}/score`, { params: idCard ? { id_card: idCard } : {} })
}

export const adminApi = {
  getExams: () => api.get('/admin/exams'),
  createExam: (data) => api.post('/admin/exams', data),
  updateExam: (id, data) => api.put(`/admin/exams/${id}`, data),
  deleteExam: (id) => api.delete(`/admin/exams/${id}`),

  downloadTemplate: (examId) => `/admin/exams/${examId}/template`,
  previewExcel: (examId, file) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post(`/admin/exams/${examId}/preview`, fd)
  },
  importExcel: (examId, file, mapping) => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('mapping', JSON.stringify(mapping))
    return api.post(`/admin/exams/${examId}/import`, fd)
  },

  getScores: (examId, params) => api.get(`/admin/exams/${examId}/scores`, { params }),
  updateScore: (id, data) => api.put(`/admin/scores/${id}`, data),
  deleteScore: (id) => api.delete(`/admin/scores/${id}`),

  getAccounts: () => api.get('/admin/accounts'),
  createAccount: (data) => api.post('/admin/accounts', data),
  deleteAccount: (id) => api.delete(`/admin/accounts/${id}`),

  getLogs: (params) => api.get('/admin/logs', { params })
}

export default api
