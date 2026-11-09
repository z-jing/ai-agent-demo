<!-- src/components/MessageItem.vue -->
<script setup lang="ts">
import type { Message } from '@/composables/useChatStream';

defineProps<{ msg: Message }>();
const emit = defineEmits<{ retry: [] }>();
</script>

<template>
  <div :class="['message', msg.role]">
    <div class="bubble">
      <!-- 用户消息直接显示 -->
      <div v-if="msg.role === 'user'" class="text">{{ msg.displayContent }}</div>

      <!-- AI 消息：Markdown 渲染 -->
      <div v-else v-markdown="msg.displayContent" class="markdown-body" />

      <!-- 状态指示 -->
      <span v-if="msg.status === 'streaming'" class="cursor">|</span>
      <span v-if="msg.status === 'stopped'" class="status-tag">已停止</span>
      <button
        v-if="msg.status === 'error'"
        class="retry-btn"
        @click="emit('retry')"
      >
        重试
      </button>
    </div>
  </div>
</template>

<style scoped>
.message {
  display: flex;
  margin-bottom: 16px;
}
.message.user {
  justify-content: flex-end;
}
.message.assistant {
  justify-content: flex-start;
}
.bubble {
  max-width: 75%;
  padding: 12px 16px;
  border-radius: 12px;
  line-height: 1.6;
}
.user .bubble {
  background: #007bff;
  color: #fff;
  border-bottom-right-radius: 4px;
}
.assistant .bubble {
  background: #f0f0f0;
  color: #333;
  border-bottom-left-radius: 4px;
}
.markdown-body pre {
  background: #1e1e1e;
  color: #d4d4d4;
  padding: 12px;
  border-radius: 8px;
  overflow-x: auto;
}
.markdown-body code {
  font-family: Consolas, monospace;
}
.cursor {
  color: #007bff;
  font-weight: bold;
  animation: blink 0.8s infinite;
}
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
.status-tag {
  color: #999;
  font-size: 12px;
  margin-left: 8px;
}
.retry-btn {
  margin-top: 8px;
  padding: 4px 12px;
  background: #dc3545;
  color: #fff;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 12px;
}
</style>