<template>
  <div>
    <div class="page-header">
      <h2>管理员账号</h2>
      <el-button type="primary" @click="dialogVisible = true">添加管理员</el-button>
    </div>

    <el-table :data="accounts" border stripe v-loading="loading">
      <el-table-column prop="employee_id" label="工号" width="140" />
      <el-table-column prop="name" label="姓名" width="120" />
      <el-table-column prop="role" label="角色" width="120">
        <template #default="{ row }">
          <el-tag :type="row.role === 'superadmin' ? 'danger' : 'info'" size="small">{{ row.role }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="auth_type" label="认证方式" width="100" />
      <el-table-column prop="created_at" label="创建时间" />
      <el-table-column label="操作" width="100">
        <template #default="{ row }">
          <el-popconfirm v-if="row.role !== 'superadmin'" title="确认删除？" @confirm="handleDelete(row.id)">
            <template #reference>
              <el-button size="small" type="danger">删除</el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog title="添加管理员" v-model="dialogVisible" width="400px">
      <el-form :model="form" label-width="80px">
        <el-form-item label="工号"><el-input v-model="form.employee_id" /></el-form-item>
        <el-form-item label="姓名"><el-input v-model="form.name" /></el-form-item>
        <el-form-item label="密码"><el-input v-model="form.password" type="password" show-password /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleCreate" :loading="saving">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { adminApi } from '../../api'

const accounts = ref([])
const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const form = reactive({ employee_id: '', name: '', password: '' })

const fetchAccounts = async () => {
  loading.value = true
  try { const res = await adminApi.getAccounts(); accounts.value = res.data } catch (e) { ElMessage.error('加载失败') }
  loading.value = false
}

const handleCreate = async () => {
  if (!form.employee_id || !form.name || !form.password) {
    ElMessage.error('请填写完整信息'); return
  }
  saving.value = true
  try {
    await adminApi.createAccount(form)
    ElMessage.success('添加成功')
    dialogVisible.value = false
    form.employee_id = ''; form.name = ''; form.password = ''
    await fetchAccounts()
  } catch (e) { ElMessage.error(e.response?.data?.error || '添加失败') }
  saving.value = false
}

const handleDelete = async (id) => {
  try { await adminApi.deleteAccount(id); ElMessage.success('删除成功'); await fetchAccounts() }
  catch (e) { ElMessage.error('删除失败') }
}

onMounted(fetchAccounts)
</script>

<style scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
</style>
