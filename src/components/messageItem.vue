
<script setup lang="ts">
// 【修改】单条消息渲染（状态机驱动）
// 相比第 2 周的变化：助手消息下方新增「引用来源」区，展示 文件名 + 页码 + 相似度 + 片段摘要
import { computed } from 'vue'

const props = defineProps<{
  message: {
    id: string
    role: 'user' | 'assistant'
    content: string
    sources?: { docName: string; page?: number; score: number; snippet: string }[]
    status?: 'streaming' | 'done' | 'error'
  }
}>()

defineEmits<{ (e: 'retry', m: any): void }>()

const isUser = computed(() => props.message.role === 'user')
const streaming = computed(() => props.message.status === 'streaming')
const failed = computed(() => props.message.status === 'error')
const sources = computed(() => props.message.sources || [])
</script>

<template>
  <div class="row" :class="isUser ? 'user' : 'ai'">
    <div class="bubble">
      <!-- 第 2 周的 v-markdown 指令原样复用：安全渲染 Markdown -->
      <div v-if="!isUser" v-markdown="message.content"></div>
      <div v-else class="plain">{{ message.content }}</div>

      <!-- 打字机光标：还在流式输出时显示 -->
      <span v-if="streaming" class="cursor"></span>

      <!-- 出错时给一个重试入口 -->
      <div v-if="failed" class="err">
        <span>回答中断</span>
        <button class="retry" @click="$emit('retry', message)">重试</button>
      </div>

      <!-- 【第 3 周新增】引用来源 -->
      <div v-if="!isUser && sources.length" class="sources">
        <div class="src-title">引用来源</div>
        <div v-for="(s, i) in sources" :key="i" class="src-item" :title="s.snippet">
          <span class="tag">S{{ i + 1 }}</span>
          <span class="name">{{ s.docName }}</span>
          <span v-if="s.page && s.page > 0" class="meta">第 {{ s.page }} 页</span>
          <span class="score">{{ (s.score).toFixed(2) }}</span>
        </div>
      </div>
      <div v-else-if="!isUser && message.status === 'done'" class="no-src">
        本次回答未使用知识库资料
      </div>
    </div>
  </div>
</template>

<style scoped>
.row { display: flex; }
.row.user { justify-content: flex-end; }
.bubble {
  max-width: 76%; padding: 10px 14px; border-radius: 12px;
  font-size: 14px; line-height: 1.7; word-break: break-word;
}
.user .bubble { background: #2f6fed; color: #fff; }
.ai .bubble { background: #f5f6f8; color: #222; }
.plain { white-space: pre-wrap; }
.cursor {
  display: inline-block; width: 6px; height: 14px; margin-left: 2px;
  background: #2f6fed; vertical-align: -2px; animation: blink 0.8s infinite;
}
@keyframes blink { 50% { opacity: 0; } }
.err { margin-top: 6px; font-size: 12px; color: #f04b4b; display: flex; gap: 8px; align-items: center; }
.retry { font-size: 12px; padding: 2px 8px; border: 1px solid #f04b4b; background: #fff; color: #f04b4b; border-radius: 6px; cursor: pointer; }

/* 引用来源样式 */
.sources { margin-top: 10px; padding-top: 8px; border-top: 1px dashed #dcdfe6; }
.src-title { font-size: 12px; color: #888; margin-bottom: 4px; }
.src-item { display: flex; gap: 6px; align-items: center; font-size: 12px; color: #555; padding: 2px 0; cursor: default; }
.tag {
  background: #e8efff; color: #2f6fed; border-radius: 4px;
  padding: 0 5px; font-size: 11px;
}
.name { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.meta, .score { color: #999; }
.no-src { margin-top: 8px; font-size: 12px; color: #aaa; }
</style>