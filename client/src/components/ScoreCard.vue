<template>
  <div class="score-card">
    <div class="card-header">{{ examName }}成绩</div>
    <div class="card-body">
      <div class="info-row"><span>姓名</span><span>{{ data.name }}</span></div>
      <div class="info-row"><span>学号</span><span>{{ data.student_id }}</span></div>
      <div v-if="data.id_card" class="info-row"><span>身份证号</span><span>{{ data.id_card }}</span></div>
    </div>
    <div class="scores">
      <div v-for="(val, key) in data.scores" :key="key" class="score-item">
        <div class="score-label">{{ key }}</div>
        <div class="score-value">{{ val }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  data: { type: Object, required: true },
  examName: { type: String, default: '' }
})
</script>

<style scoped>
.score-card {
  background: #fff;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0,0,0,.08);
}
.card-header {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: #fff;
  text-align: center;
  padding: 16px;
  font-size: 18px;
  font-weight: 600;
}
.card-body { padding: 16px; }
.info-row {
  display: flex; justify-content: space-between;
  padding: 8px 0; font-size: 14px;
  border-bottom: 1px solid #f0f0f0;
}
.info-row span:first-child { color: #909399; }
.scores {
  display: flex; padding: 16px; gap: 12px;
  justify-content: space-around; border-top: 1px solid #f0f0f0;
}
.score-item { text-align: center; }
.score-label { font-size: 12px; color: #909399; margin-bottom: 4px; }
.score-value { font-size: 20px; font-weight: 600; color: #303133; }
</style>
