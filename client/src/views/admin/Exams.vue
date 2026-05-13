<template>
  <div>
    <div class="page-header">
      <h2>考试管理</h2>
      <el-button type="primary" @click="openDialog(null)">新建考试</el-button>
    </div>

    <el-table :data="exams" border stripe v-loading="loading">
      <el-table-column prop="id" label="ID" width="60" />
      <el-table-column prop="name" label="考试名称" />
      <el-table-column label="状态" width="80">
        <template #default="{ row }">
          <el-switch :model-value="!!row.enabled" @change="(val) => handleToggle(row, val)" size="small" />
        </template>
      </el-table-column>
      <el-table-column label="身份证验证" width="110">
        <template #default="{ row }">
          <el-tag :type="row.id_verify ? 'warning' : 'success'" size="small">
            {{ row.id_verify ? '开启' : '关闭' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="score_count" label="成绩数" width="80" />
      <el-table-column prop="created_at" label="创建时间" width="170" />
      <el-table-column label="操作" width="280">
        <template #default="{ row }">
          <el-button size="small" @click="router.push(`/admin/import/${row.id}`)">导入成绩</el-button>
          <el-button size="small" @click="openDialog(row)">编辑</el-button>
          <el-popconfirm title="删除考试将同时删除所有成绩，确认？" @confirm="handleDelete(row.id)">
            <template #reference>
              <el-button size="small" type="danger">删除</el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog :title="editingExam ? '编辑考试' : '新建考试'" v-model="dialogVisible" width="500px">
      <el-form :model="form" label-width="110px">
        <el-form-item label="考试名称">
          <el-input v-model="form.name" placeholder="如：特勤招录选拔" />
        </el-form-item>
        <el-form-item label="身份证验证">
          <el-switch v-model="form.id_verify" />
        </el-form-item>
        <el-form-item label="成绩列定义">
          <div v-for="(col, i) in form.score_columns" :key="i" style="display:flex;gap:8px;margin-bottom:8px">
            <el-input v-model="form.score_columns[i]" placeholder="列名" />
            <el-button @click="form.score_columns.splice(i,1)" icon="Delete" circle size="small" />
          </div>
          <el-button @click="form.score_columns.push('')" size="small">+ 添加成绩列</el-button>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave" :loading="saving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { adminApi } from '../../api'

const router = useRouter()
const exams = ref([])
const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const editingExam = ref(null)

const form = reactive({
  name: '',
  id_verify: false,
  score_columns: []
})

const fetchExams = async () => {
  loading.value = true
  try { const res = await adminApi.getExams(); exams.value = res.data } catch (e) { ElMessage.error('加载失败') }
  loading.value = false
}

const openDialog = (exam) => {
  editingExam.value = exam
  if (exam) {
    form.name = exam.name
    form.id_verify = !!exam.id_verify
    form.score_columns = [...(JSON.parse(exam.score_columns || '[]'))]
  } else {
    form.name = ''
    form.id_verify = false
    form.score_columns = []
  }
  dialogVisible.value = true
}

const handleSave = async () => {
  if (!form.name) { ElMessage.error('请输入考试名称'); return }
  saving.value = true
  try {
    const data = {
      name: form.name,
      id_verify: form.id_verify,
      score_columns: form.score_columns.filter(Boolean)
    }
    if (editingExam.value) {
      await adminApi.updateExam(editingExam.value.id, data)
      ElMessage.success('更新成功')
    } else {
      await adminApi.createExam(data)
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    await fetchExams()
  } catch (e) { ElMessage.error(e.response?.data?.error || '操作失败') }
  saving.value = false
}

const handleDelete = async (id) => {
  try { await adminApi.deleteExam(id); ElMessage.success('删除成功'); await fetchExams() }
  catch (e) { ElMessage.error('删除失败') }
}

const handleToggle = async (row, val) => {
  try {
    await adminApi.updateExam(row.id, { enabled: val })
    row.enabled = val ? 1 : 0
    ElMessage.success(val ? '已开启' : '已关闭')
  } catch (e) { ElMessage.error('操作失败') }
}

onMounted(fetchExams)
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
</style>
