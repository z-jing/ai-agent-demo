
<script setup lang="ts">
// 【新增】知识库面板：上传按钮、状态提示、文档列表、RAG 开关、Pinecone 连接自检
import { ref, onMounted } from 'vue'
import { useRag } from '../composables/useRag'

const emit = defineEmits<{ (e: 'doc-added', docId: string): void }>()

const { docs, status, enabled, indexName, upload, remove, ping } = useRag()

const busy = ref(false)
const tip = ref('')
const vectorCount = ref<number | null>(null)
const fileEl = ref<HTMLInputElement | null>(null)

const statusLabel: Record<string, string> = {
  idle: '空闲',
  parsing: '解析文档中',
  vectorizing: '切块并向量化中',
  uploading: '写入 Pinecone 中',
  ready: '已就绪',
  error: '入库失败',
}

async function onPick(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  busy.value = true
  tip.value = ''
  try {
    const doc = await upload(file)
    emit('doc-added', doc.id)          // 通知 App 绑定到当前会话
    tip.value = '入库成功'
    await check()
  } catch (err: any) {
    tip.value = '失败：' + (err?.message || err)
  } finally {
    busy.value = false
    ;(e.target as HTMLInputElement).value = ''
  }
}

async function onDelete(id: string) {
  await remove(id)
  await check()
}

// 连接自检：能取到向量条数说明 Key / Host / 索引名都配对了
async function check() {
  try { vectorCount.value = await ping() } catch { vectorCount.value = null }
}

onMounted(check)
</script>

<template>
  <div class="panel">
    <h3>知识库</h3>

    <label class="btn" :class="{ disabled: busy }">
      {{ busy ? '处理中…' : '上传 PDF / TXT / MD' }}
      <input ref="fileEl" type="file" accept=".pdf,.txt,.md" hidden :disabled="busy" @change="onPick" />
    </label>

    <p class="status">
      状态：{{ statusLabel[status] || status }}
      <span v-if="tip" :class="tip === '入库成功' ? 'ok' : 'bad'">{{ tip }}</span>
    </p>

    <label class="switch">
      <input type="checkbox" v-model="enabled" />
      <span>回答时启用知识库检索</span>
    </label>

    <div class="conn">
      索引：{{ indexName }}
      <span v-if="vectorCount !== null" class="ok">已连接，{{ vectorCount }} 条向量</span>
      <span v-else class="bad">未连接（检查 .env 的 Pinecone 三项）</span>
      <button class="link" @click="check">重新检测</button>
    </div>

    <ul class="docs">
      <li v-if="!docs.length" class="empty">还没有文档，先上传一个 PDF 试试</li>
      <li v-for="d in docs" :key="d.id">
        <div class="name" :title="d.name">{{ d.name }}</div>
        <div class="meta">{{ d.chunkCount }} 段 · {{ (d.size / 1024).toFixed(0) }} KB</div>
        <button class="del" @click="onDelete(d.id)">删除</button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.panel { padding: 14px; border-right: 1px solid #eee; height: 100%; overflow-y: auto; }
h3 { margin: 0 0 12px; font-size: 15px; }
.btn {
  display: block; text-align: center; padding: 9px 0; border-radius: 8px;
  background: #2f6fed; color: #fff; font-size: 13px; cursor: pointer;
}
.btn.disabled { background: #b7c9f2; cursor: not-allowed; }
.status { font-size: 12px; color: #666; margin: 10px 0; }
.ok { color: #1a9c46; }
.bad { color: #f04b4b; }
.switch { display: flex; gap: 6px; align-items: center; font-size: 12px; color: #555; margin-bottom: 10px; }
.conn { font-size: 12px; color: #666; line-height: 1.8; border-top: 1px dashed #e5e5e5; padding-top: 8px; }
.link { border: none; background: none; color: #2f6fed; cursor: pointer; font-size: 12px; }
.docs { list-style: none; padding: 0; margin: 12px 0 0; }
.docs li { position: relative; padding: 8px 0; border-bottom: 1px solid #f2f2f2; }
.name { font-size: 13px; color: #333; max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.meta { font-size: 11px; color: #999; }
.del { position: absolute; right: 0; top: 12px; border: none; background: none; color: #f04b4b; font-size: 12px; cursor: pointer; }
.empty { font-size: 12px; color: #aaa; }
</style>