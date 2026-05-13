<template>
  <div class="query-page">
    <div v-if="!selectedExam">
      <h2 style="text-align:center;padding:24px">成绩查询</h2>
      <div v-if="exams.length === 0" style="text-align:center;color:#909399;padding:40px">
        暂无可查询的考试
      </div>
      <div v-else class="exam-list">
        <div v-for="exam in exams" :key="exam.id" class="exam-item" @click="selectExam(exam)">
          <h3>{{ exam.name }}</h3>
          <el-tag v-if="exam.id_verify" size="small" type="warning">需身份证验证</el-tag>
          <el-tag v-else size="small" type="success">直接查询</el-tag>
        </div>
      </div>
    </div>

    <div v-else>
      <div style="padding:16px;display:flex;align-items:center">
        <el-button text @click="selectedExam = null"><el-icon><ArrowLeft /></el-icon> 返回</el-button>
        <span style="flex:1;text-align:center;font-weight:600">{{ selectedExam.name }}</span>
        <el-button text @click="handleLogout">退出</el-button>
      </div>

      <div v-if="requireIdInput" style="padding:16px">
        <el-input v-model="idCard" placeholder="请输入身份证号" clearable size="large" />
        <el-button type="primary" size="large" style="width:100%;margin-top:12px" @click="fetchScore" :loading="loading">
          查询成绩
        </el-button>
      </div>

      <div v-if="errorMsg" style="padding:16px">
        <el-alert :title="errorMsg" type="error" show-icon />
      </div>

      <div v-if="scoreData" style="padding:16px">
        <ScoreCard :data="scoreData" :exam-name="selectedExam.name" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import { queryApi, authApi } from '../api'
import ScoreCard from '../components/ScoreCard.vue'

const exams = ref([])
const selectedExam = ref(null)
const requireIdInput = ref(false)
const idCard = ref('')
const loading = ref(false)
const errorMsg = ref('')
const scoreData = ref(null)

onMounted(async () => {
  try {
    const res = await queryApi.getExams()
    exams.value = res.data
  } catch (err) {
    ElMessage.error('获取考试列表失败')
  }
})

const selectExam = async (exam) => {
  selectedExam.value = exam
  errorMsg.value = ''
  scoreData.value = null

  if (!exam.id_verify) {
    await fetchScore()
  } else {
    requireIdInput.value = true
  }
}

const fetchScore = async () => {
  loading.value = true
  errorMsg.value = ''
  try {
    const res = await queryApi.getScore(selectedExam.value.id, idCard.value || undefined)
    if (res.data.require_id_verify) {
      requireIdInput.value = true
    } else if (res.data.found) {
      scoreData.value = res.data.data
      requireIdInput.value = false
    } else {
      errorMsg.value = res.data.message || '未找到成绩'
    }
  } catch (err) {
    errorMsg.value = err.response?.data?.error || '查询失败'
  } finally {
    loading.value = false
  }
}

const handleLogout = async () => {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
  try {
    const res = await authApi.casLogout()
    window.location.href = res.data.logoutUrl
  } catch {
    window.location.href = '/login'
  }
}
</script>

<style scoped>
.query-page { max-width: 480px; margin: 0 auto; min-height: 100vh; background: #f5f7fa; }
.exam-list { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.exam-item {
  background: #fff; border-radius: 10px; padding: 16px;
  box-shadow: 0 1px 4px rgba(0,0,0,.06); cursor: pointer;
  display: flex; align-items: center; justify-content: space-between;
}
.exam-item h3 { margin: 0; font-size: 16px; }
</style>
