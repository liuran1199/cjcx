<template>
  <div class="admin-layout">
    <el-container>
      <el-aside width="200px">
        <div class="logo">成绩查询管理</div>
        <el-menu
          :default-active="activeMenu"
          router
          background-color="#304156"
          text-color="#bfcbd9"
          active-text-color="#409EFF"
        >
          <el-menu-item index="/admin/exams">
            <el-icon><List /></el-icon>
            <span>考试管理</span>
          </el-menu-item>
          <el-menu-item index="/admin/scores">
            <el-icon><DataAnalysis /></el-icon>
            <span>成绩数据</span>
          </el-menu-item>
          <el-menu-item index="/admin/cas">
            <el-icon><Setting /></el-icon>
            <span>CAS 配置</span>
          </el-menu-item>
          <el-menu-item v-if="user.role === 'superadmin'" index="/admin/accounts">
            <el-icon><User /></el-icon>
            <span>管理员账号</span>
          </el-menu-item>
          <el-menu-item index="/admin/logs">
            <el-icon><Document /></el-icon>
            <span>查询日志</span>
          </el-menu-item>
        </el-menu>
        <div class="aside-footer">
          <span>{{ user.name }}</span>
          <el-button text size="small" @click="handleLogout">退出</el-button>
        </div>
      </el-aside>
      <el-main>
        <router-view />
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { List, DataAnalysis, Setting, User, Document } from '@element-plus/icons-vue'
import { authApi } from '../../api'

const route = useRoute()
const router = useRouter()
const user = computed(() => JSON.parse(localStorage.getItem('user') || '{}'))
const activeMenu = computed(() => route.path)

const handleLogout = async () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  try {
    const res = await authApi.casLogout()
    window.location.href = res.data.logoutUrl
  } catch {
    router.push('/login')
  }
}
</script>

<style scoped>
.admin-layout { min-height: 100vh; }
.el-aside { background: #304156; min-height: 100vh; display: flex; flex-direction: column; }
.logo { color: #fff; text-align: center; padding: 16px; font-size: 16px; font-weight: 600; border-bottom: 1px solid #4a5568; }
.aside-footer { padding: 12px; color: #bfcbd9; font-size: 13px; border-top: 1px solid #4a5568; margin-top: auto; display: flex; justify-content: space-between; align-items: center; }
.el-main { background: #f5f7fa; }
</style>
