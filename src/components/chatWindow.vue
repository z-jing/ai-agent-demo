
<script setup lang="ts">
// 【修改】主对话窗口（页面组装）
// 相比第 2 周的变化：
// 1) 顶部新增「上传文档」按钮 + 知识库状态提示（解析中 / 向量化中 / 写入中 / 就绪）
// 2) send 改为异步调用（内部要先 await 检索），调用处必须 await 或用 .catch
// 3) 会话切换时，把该会话已保存的消息（含引用来源）回填到界面
import { ref, watch, nextTick, computed } from 'vue'
import MessageItem from './messageItem.vue'
import { useChatStream } from '../composables/useChatStream'
import { useRag } from '../composables/useRag'

const props = defineProps<{
  // 由 App.vue 传入的会话管理实例（useConversation 的返回值）
  conv: any
}>()

const { docs, status, enabled, upload } = useRag()

const { messages, loading, send, stop } = useChatStream({
  // 只在本会话绑定的文档里检索；没绑定就全库检索
  getDocIds: () => {
    const ids: string[] = props.conv.getBoundDocIds?.() || []
    return ids.length ? ids : undefined
  },
  onSave: (m: any) => props.conv.appendMessage(m),
})

const input = ref('')
const uploading = ref(false)
const uploadMsg = ref('')
const fileEl = ref<HTMLInputElement | null>(null)
const listEl = ref<HTMLElement | null>(null)

const statusText = computed(() => {
  if (uploading.value) return '处理中：' + (status.value === 'parsing' ? '解析文档'
    : status.value === 'vectorizing' ? '切块并向量化'
    : status.value === 'uploading' ? '写入 Pinecone' : '准备中')
  if (status.value === 'error') return '上一次入库失败，可看控制台'
  return docs.value.length ? `知识库已就绪：${docs.value.length} 个文档` : '尚未上传文档'
})

// 会话切换：回填历史消息
watch(() => props.conv.currentId, () => {
  const saved = props.conv.current?.()?.messages || []
  messages.value = saved.map((m: any) => ({ ...m, status: m.role === 'assistant' ? 'done' : undefined }))
  scrollToBottom()
}, { immediate: true })

async function onSend() {
  const text = input.value.trim()
  if (!text || loading.value) return
  input.value = ''
  await nextTick()
  scrollToBottom()
  // send 内部：先 await 检索 -> 再流式生成，所以这里要 await
  await send(text)
  scrollToBottom()
}

function onEnter(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    onSend()
  }
}

// 顶部「上传文档」：入库成功后绑定到当前会话
async function onPick(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  uploading.value = true
  uploadMsg.value = ''
  try {
    const doc = await upload(file)
    props.conv.bindDoc?.(doc.id)
    uploadMsg.value = `已入库《${doc.name}》，共 ${doc.chunkCount} 段`
  } catch (err: any) {
    uploadMsg.value = '入库失败：' + (err?.message || err)
  } finally {
    uploading.value = false
    (e.target as HTMLInputElement).value = ''
  }
}

function onRetry(m: any) {
  const idx = messages.value.findIndex((x: any) => x.id === m.id)
  if (idx < 0) return
  // 找到该助手消息前一条用户消息，重新发一次
  for (let i = idx - 1; i >= 0; i--) {
    if (messages.value[i].role === 'user') { send(messages.value[i].content); break }
  }
}

function scrollToBottom() {
  nextTick(() => { if (listEl.value) listEl.value.scrollTop = listEl.value.scrollHeight })
}
</script>

<template>
  <div class="chat-window">
    <!-- 顶部：知识库状态 + 上传入口（第 3 周新增） -->
    <header class="bar">
      <div class="kb-state">
        <span class="dot" :class="{ on: enabled && docs.length }"></span>
        <span>{{ statusText }}</span>
        <span v-if="uploadMsg" class="hint">{{ uploadMsg }}</span>
      </div>
      <div class="bar-right">
        <label class="btn ghost">
          上传文档
          <input ref="fileEl" type="file" accept=".pdf,.txt,.md" hidden @change="onPick" />
        </label>
      </div>
    </header>

    <!-- 消息列表 -->
    <div ref="listEl" class="list">
      <p v-if="!messages.length" class="empty">
        上传 PDF/TXT 后提问，回答会基于文档内容并标注引用来源。
      </p>
      <MessageItem
        v-for="m in messages"
        :key="m.id"
        :message="m"
        @retry="onRetry"
      />
    </div>

    <!-- 输入区 -->
    <footer class="input-bar">
      <textarea
        v-model="input"
        rows="2"
        placeholder="就文档内容提问，Enter 发送，Shift+Enter 换行"
        @keydown="onEnter"
      ></textarea>
      <button v-if="!loading" class="btn primary" :disabled="!input.trim()" @click="onSend">发送</button>
      <button v-else class="btn danger" @click="stop">停止</button>
    </footer>
  </div>
</template>

<style scoped>
.chat-window { display: flex; flex-direction: column; height: 100%; }
.bar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 16px; border-bottom: 1px solid #eee; font-size: 13px; color: #555;
}
.kb-state { display: flex; align-items: center; gap: 6px; }
.dot { width: 8px; height: 8px; border-radius: 50%; background: #bbb; }
.dot.on { background: #34c759; }
.hint { color: #888; }
.list { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 14px; }
.empty { color: #999; font-size: 13px; text-align: center; margin-top: 40px; }
.input-bar { display: flex; gap: 8px; padding: 12px 16px; border-top: 1px solid #eee; }
textarea {
  flex: 1; resize: none; padding: 8px 10px; border: 1px solid #ddd;
  border-radius: 8px; font: inherit; outline: none;
}
.btn { padding: 8px 16px; border-radius: 8px; border: none; cursor: pointer; font-size: 14px; }
.btn.primary { background: #2f6fed; color: #fff; }
.btn.primary:disabled { background: #b7c9f2; cursor: not-allowed; }
.btn.danger { background: #f04b4b; color: #fff; }
.btn.ghost { background: #f2f4f8; color: #333; border: 1px solid #e2e6ee; }
</style>