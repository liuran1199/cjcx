<template>
  <div>
    <div class="page-header">
      <h2>导入成绩 — {{ examName }}</h2>
      <el-button @click="router.push('/admin/exams')">返回考试列表</el-button>
    </div>

    <el-card v-if="!previewData">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <span style="color:#303133">上传成绩文件</span>
        <el-button type="success" size="small" @click="downloadTemplate">下载导入模版</el-button>
      </div>
      <el-upload :auto-upload="false" :on-change="handleFileChange" accept=".xlsx" drag :limit="1">
        <el-icon :size="48"><UploadFilled /></el-icon>
        <div>将 Excel 文件拖到此处，或点击上传</div>
        <template #tip>
          <div style="color:#909399;font-size:12px;margin-top:8px">
            格式：第一行为表头，需包含学号、姓名列
          </div>
        </template>
      </el-upload>
    </el-card>

    <div v-if="previewData">
      <el-card style="margin-bottom:16px">
        <p>共识别 <strong>{{ previewData.totalRows }}</strong> 条数据，请确认列映射：</p>
      </el-card>

      <el-card style="margin-bottom:16px">
        <h3 style="margin-bottom:12px">列映射</h3>
        <div style="display:flex;gap:16px;flex-wrap:wrap">
          <div>
            <label style="font-size:13px;color:#909399">学号列</label>
            <el-select v-model="mapping.student_id" placeholder="选择学号列">
              <el-option v-for="h in previewData.headers" :key="h" :label="h" :value="h" />
            </el-select>
          </div>
          <div>
            <label style="font-size:13px;color:#909399">姓名列</label>
            <el-select v-model="mapping.name" placeholder="选择姓名列">
              <el-option v-for="h in previewData.headers" :key="h" :label="h" :value="h" />
            </el-select>
          </div>
          <div>
            <label style="font-size:13px;color:#909399">身份证号列（可选）</label>
            <el-select v-model="mapping.id_card" placeholder="选择身份证号列" clearable>
              <el-option v-for="h in previewData.headers" :key="h" :label="h" :value="h" />
            </el-select>
          </div>
        </div>
        <div style="margin-top:16px">
          <label style="font-size:13px;color:#909399">成绩列（可多选）</label>
          <el-select v-model="mapping.scores" multiple placeholder="选择成绩列">
            <el-option v-for="h in previewData.headers" :key="h" :label="h" :value="h" />
          </el-select>
        </div>
      </el-card>

      <el-card>
        <h3 style="margin-bottom:12px">数据预览（前5行）</h3>
        <el-table :data="previewData.preview" border stripe size="small" max-height="300">
          <el-table-column v-for="h in previewData.headers" :key="h" :prop="h" :label="h" :width="Math.max(100, h.length * 18 + 20)" />
        </el-table>
      </el-card>

      <div style="margin-top:16px;text-align:center">
        <el-button @click="resetPreview">重新选择文件</el-button>
        <el-button type="primary" :loading="importing" @click="handleImport">
          确认导入（将覆盖已有数据）
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { UploadFilled } from '@element-plus/icons-vue'
import api, { adminApi } from '../../api'

const router = useRouter()
const route = useRoute()
const examId = route.params.examId
const examName = ref('')
const previewData = ref(null)
const file = ref(null)
const importing = ref(false)

const mapping = ref({ student_id: '', name: '', id_card: '', scores: [] })

onMounted(async () => {
  try {
    const res = await adminApi.getExams()
    const exam = res.data.find(e => e.id == examId)
    examName.value = exam ? exam.name : ''
  } catch (e) {
    ElMessage.error('获取考试信息失败')
  }
})

const handleFileChange = async (uploadFile) => {
  file.value = uploadFile.raw
  try {
    const res = await adminApi.previewExcel(examId, file.value)
    previewData.value = res.data
    const headers = res.data.headers
    mapping.value.student_id = headers.find(h => h.includes('学号')) || ''
    mapping.value.name = headers.find(h => h.includes('姓名')) || ''
    mapping.value.id_card = headers.find(h => h.includes('身份证')) || ''
    mapping.value.scores = headers.filter(h => !['学号', '姓名'].includes(h) && !h.includes('身份证'))
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '预览失败')
  }
}

const handleImport = async () => {
  if (!mapping.value.student_id || !mapping.value.name) {
    ElMessage.error('请选择学号列和姓名列')
    return
  }
  if (mapping.value.scores.length === 0) {
    ElMessage.error('请选择至少一列成绩')
    return
  }
  importing.value = true
  try {
    const res = await adminApi.importExcel(examId, file.value, mapping.value)
    ElMessage.success(res.data.message)
    router.push('/admin/exams')
  } catch (e) {
    ElMessage.error(e.response?.data?.error || '导入失败')
  } finally {
    importing.value = false
  }
}

const downloadTemplate = async () => {
  try {
    const res = await api.get(adminApi.downloadTemplate(examId), { responseType: 'blob' })
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a')
    a.href = url
    a.download = `${examName.value || '考试'}_导入模版.xlsx`
    a.click()
    URL.revokeObjectURL(url)
    ElMessage.success('模版下载成功')
  } catch (e) {
    ElMessage.error('下载模版失败')
  }
}

const resetPreview = () => {
  previewData.value = null
  file.value = null
}
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
</style>
