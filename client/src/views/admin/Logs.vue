<template>
  <div>
    <div class="page-header"><h2>查询日志</h2></div>

    <div style="display:flex;gap:12px;margin-bottom:16px">
      <el-select v-model="filterExamId" placeholder="按考试筛选" clearable @change="fetchLogs" style="width:240px">
        <el-option v-for="e in exams" :key="e.id" :label="e.name" :value="e.id" />
      </el-select>
    </div>

    <el-table :data="logs" border stripe v-loading="loading">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="exam_name" label="考试" width="160" />
      <el-table-column prop="student_id" label="学号" width="120" />
      <el-table-column label="结果" width="110">
        <template #default="{ row }">
          <el-tag :type="row.result === 'success' ? 'success' : row.result === 'id_mismatch' ? 'danger' : 'info'" size="small">
            {{ { success: '成功', not_found: '未找到', id_mismatch: '身份证不匹配' }[row.result] || row.result }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="ip" label="IP" width="140" />
      <el-table-column prop="created_at" label="查询时间" />
    </el-table>

    <div style="margin-top:16px;text-align:right">
      <el-pagination
        v-model:current-page="page" :page-size="pageSize" :total="total"
        layout="total, prev, pager, next" @current-change="fetchLogs"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { adminApi } from '../../api'

const exams = ref([])
const logs = ref([])
const loading = ref(false)
const filterExamId = ref(null)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

const fetchExams = async () => {
  try { const res = await adminApi.getExams(); exams.value = res.data } catch (e) { /* ignore */ }
}

const fetchLogs = async () => {
  loading.value = true
  try {
    const params = { page: page.value, pageSize: pageSize.value }
    if (filterExamId.value) params.exam_id = filterExamId.value
    const res = await adminApi.getLogs(params)
    logs.value = res.data.data
    total.value = res.data.total
  } catch (e) { ElMessage.error('加载失败') }
  loading.value = false
}

onMounted(async () => {
  await fetchExams()
  await fetchLogs()
})
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
</style>
