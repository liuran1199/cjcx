<template>
  <div>
    <div class="page-header"><h2>CAS 认证配置</h2></div>

    <el-card v-loading="loading">
      <el-form :model="form" label-width="120px" style="max-width:500px">
        <el-form-item label="启用 CAS">
          <el-switch v-model="form.enabled" />
        </el-form-item>
        <el-form-item label="CAS 服务地址">
          <el-input v-model="form.cas_url" placeholder="如 https://cas.school.edu.cn" />
        </el-form-item>
        <el-form-item label="应用访问地址">
          <el-input v-model="form.service_url" placeholder="如 https://score.school.edu.cn 或 http://localhost:5173" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSave" :loading="saving">保存配置</el-button>
        </el-form-item>
      </el-form>

      <el-alert title="说明" type="info" :closable="false" style="margin-top:16px">
        <ul style="padding-left:20px;font-size:13px;line-height:1.8">
          <li>CAS 服务地址：学校统一认证服务器的 URL</li>
          <li>应用访问地址：本系统的访问地址（不含路径），如校内域名或 IP+端口</li>
          <li>开发者本地调试可用 http://localhost:5173</li>
        </ul>
      </el-alert>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { authApi } from '../../api'

const loading = ref(false)
const saving = ref(false)
const form = reactive({ enabled: false, cas_url: '', service_url: '' })

onMounted(async () => {
  loading.value = true
  try {
    const res = await authApi.getCasConfig()
    form.enabled = res.data.enabled
    form.cas_url = res.data.cas_url
    form.service_url = res.data.service_url
  } catch (e) { ElMessage.error('加载CAS配置失败') }
  loading.value = false
})

const handleSave = async () => {
  saving.value = true
  try {
    await authApi.updateCasConfig(form)
    ElMessage.success('配置保存成功')
  } catch (e) { ElMessage.error(e.response?.data?.error || '保存失败') }
  saving.value = false
}
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
</style>
