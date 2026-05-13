<template>
  <div>
    <div class="page-header">
      <h2>成绩数据</h2>
    </div>

    <div style="display:flex;gap:12px;margin-bottom:16px">
      <el-select v-model="selectedExamId" placeholder="选择考试" @change="fetchScores" style="width:240px">
        <el-option v-for="e in exams" :key="e.id" :label="e.name" :value="e.id" />
      </el-select>
      <el-input v-model="search" placeholder="搜索姓名/学号" clearable @input="fetchScores" style="width:240px" />
    </div>

    <el-table v-if="selectedExamId" :data="scores" border stripe v-loading="loading">
      <el-table-column prop="student_id" label="学号" width="120" />
      <el-table-column prop="name" label="姓名" width="100" />
      <el-table-column prop="id_card" label="身份证号" width="180">
        <template #default="{ row }">{{ row.id_card ? row.id_card.slice(0,4)+'****'+row.id_card.slice(-4) : '' }}</template>
      </el-table-column>
      <el-table-column v-for="col in scoreColumns" :key="col" :prop="`score_data.${col}`" :label="col" width="110" />
      <el-table-column label="操作" width="140">
        <template #default="{ row }">
          <el-button size="small" @click="openEdit(row)">编辑</el-button>
          <el-popconfirm title="确认删除？" @confirm="handleDelete(row.id)">
            <template #reference><el-button size="small" type="danger">删除</el-button></template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <div v-if="selectedExamId" style="margin-top:16px;text-align:right">
      <el-pagination
        v-model:current-page="page" :page-size="pageSize" :total="total"
        layout="total, prev, pager, next" @current-change="fetchScores"
      />
    </div>

    <el-dialog title="编辑成绩" v-model="dialogVisible" width="500px">
      <el-form :model="editForm" label-width="90px">
        <el-form-item label="姓名"><el-input v-model="editForm.name" /></el-form-item>
        <el-form-item label="学号"><el-input v-model="editForm.student_id" /></el-form-item>
        <el-form-item label="身份证号"><el-input v-model="editForm.id_card" /></el-form-item>
        <el-form-item v-for="col in scoreColumns" :key="col" :label="col">
          <el-input v-model="editForm.score_data[col]" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleUpdate" :loading="saving">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { adminApi } from '../../api'

const exams = ref([])
const selectedExamId = ref(null)
const scoreColumns = ref([])
const scores = ref([])
const loading = ref(false)
const saving = ref(false)
const search = ref('')
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const dialogVisible = ref(false)
const editingId = ref(null)
const editForm = reactive({ name: '', student_id: '', id_card: '', score_data: {} })

onMounted(async () => {
  try { const res = await adminApi.getExams(); exams.value = res.data } catch (e) { ElMessage.error('加载考试列表失败') }
})

const fetchScores = async () => {
  if (!selectedExamId.value) return
  const exam = exams.value.find(e => e.id === selectedExamId.value)
  scoreColumns.value = exam ? JSON.parse(exam.score_columns || '[]') : []
  loading.value = true
  try {
    const res = await adminApi.getScores(selectedExamId.value, { page: page.value, pageSize: pageSize.value, search: search.value })
    scores.value = res.data.data
    total.value = res.data.total
  } catch (e) { ElMessage.error('加载失败') }
  loading.value = false
}

const openEdit = (row) => {
  editingId.value = row.id
  editForm.name = row.name
  editForm.student_id = row.student_id
  editForm.id_card = row.id_card
  editForm.score_data = { ...row.score_data }
  dialogVisible.value = true
}

const handleUpdate = async () => {
  saving.value = true
  try {
    await adminApi.updateScore(editingId.value, editForm)
    ElMessage.success('更新成功')
    dialogVisible.value = false
    await fetchScores()
  } catch (e) { ElMessage.error('更新失败') }
  saving.value = false
}

const handleDelete = async (id) => {
  try { await adminApi.deleteScore(id); ElMessage.success('删除成功'); await fetchScores() }
  catch (e) { ElMessage.error('删除失败') }
}
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
</style>
