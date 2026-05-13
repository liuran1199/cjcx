<template>
  <div class="login-container">
    <div class="login-box">
      <h2>学生成绩查询系统</h2>

      <template v-if="casEnabled">
        <el-button type="primary" size="large" style="width:100%" @click="handleCasLogin" :loading="casLoading">
          <el-icon><Link /></el-icon>
          统一身份认证登录
        </el-button>
        <el-divider>或使用账号密码</el-divider>
      </template>

      <p v-else style="text-align:center;color:#909399;margin-bottom:20px">请使用账号密码登录</p>

      <el-form :model="form" :rules="rules" ref="formRef">
        <el-form-item prop="employee_id">
          <el-input v-model="form.employee_id" placeholder="工号/学号" size="large" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="form.password" type="password" placeholder="密码" size="large"
            @keyup.enter="handleLogin" show-password />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" style="width:100%" :loading="loading" @click="handleLogin" size="large">
            登录
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Link } from '@element-plus/icons-vue'
import { authApi } from '../api'
import api from '../api'

const router = useRouter()
const route = useRoute()
const formRef = ref(null)
const loading = ref(false)
const casLoading = ref(false)
const casEnabled = ref(false)

const form = reactive({
  employee_id: '',
  password: ''
})

const rules = {
  employee_id: [{ required: true, message: '请输入工号/学号', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}

const checkCasConfig = async () => {
  try {
    const res = await authApi.getCasConfig()
    casEnabled.value = res.data.enabled
  } catch (err) {
    casEnabled.value = false
  }
}

const handleCasLogin = async () => {
  casLoading.value = true
  try {
    const res = await authApi.getCasLoginUrl()
    window.location.href = res.data.loginUrl
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '获取登录地址失败')
    casLoading.value = false
  }
}

const handleLogin = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    const res = await api.post('/auth/login', form)
    localStorage.setItem('token', res.data.token)
    localStorage.setItem('user', JSON.stringify(res.data.user))
    ElMessage.success('登录成功')
    const dest = res.data.user.role === 'admin' || res.data.user.role === 'superadmin' ? '/admin' : '/query'
    router.push(dest)
  } catch (err) {
    ElMessage.error(err.response?.data?.error || '登录失败')
  } finally {
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

  checkCasConfig()
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
.login-box h2 { text-align: center; margin-bottom: 24px; color: #303133; }
</style>
