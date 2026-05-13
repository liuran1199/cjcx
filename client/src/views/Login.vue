<template>
  <div class="login-container">
    <div class="login-box">
      <h2>学生成绩查询系统</h2>
      <p style="text-align:center;color:#909399;margin-bottom:24px">请使用统一身份认证登录</p>
      <el-button type="primary" size="large" style="width:100%" @click="handleCasLogin" :loading="loading">
        <el-icon><Link /></el-icon>
        统一身份认证登录
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Link } from '@element-plus/icons-vue'
import { authApi } from '../api'

const router = useRouter()
const route = useRoute()
const loading = ref(false)

const handleCasLogin = async () => {
  loading.value = true
  try {
    const res = await authApi.getCasLoginUrl()
    window.location.href = res.data.loginUrl
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '获取登录地址失败')
    loading.value = false
  }
}

onMounted(() => {
  const token = route.query.token
  if (token) {
    localStorage.setItem('token', token)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      localStorage.setItem('user', JSON.stringify({
        employee_id: payload.employee_id,
        name: payload.name,
        role: payload.role
      }))
      ElMessage.success('登录成功')
      const dest = payload.role === 'admin' || payload.role === 'superadmin' ? '/admin' : '/query'
      router.push(dest)
    } catch (e) {
      ElMessage.error('登录信息解析失败')
    }
    return
  }

  if (route.query.error) {
    const errors = { invalid_ticket: '票据无效', no_ticket: '缺少认证票据', validation_failed: '认证验证失败' }
    ElMessage.error(errors[route.query.error] || '登录失败')
  }
})
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.login-box {
  width: 400px;
  max-width: 90vw;
  padding: 40px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}
.login-box h2 { text-align: center; margin-bottom: 16px; color: #303133; }
</style>
