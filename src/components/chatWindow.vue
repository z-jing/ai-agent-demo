<!-- src/components/ChatWindow.vue -->
<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import type { Conversation } from '@/composables/useConversation';
import { useChatStream, messages } from '@/composables/useChatStream';
import MessageItem from './messageItem.vue';

const props = defineProps<{ conversation: Conversation }>();
const emit = defineEmits<{ update: [msgs: any[]] }>();

const { loading, send, stop, retry, registerUpdateCallback } = useChatStream();
const input = ref('');
const scrollRef = ref<HTMLElement>();

// 注册回写回调（确保输出结束时触发保存）
registerUpdateCallback((msgs) => {
  emit('update', [...msgs]);
});

// 【修复】只在切换会话（conversation.id 变化）时，清空并同步旧消息
watch(
  () => props.conversation.id,
  () => {
    messages.length = 0;
    messages.push(...props.conversation.messages);
    nextTick(() => {
      scrollRef.value?.scrollTo({ top: scrollRef.value.scrollHeight, behavior: 'smooth' });
    });
  },
  { immediate: true }
);

// 处理发送
function handleSend() {
  if (!input.value.trim() || loading.value) return;
  const text = input.value;
  input.value = '';
  send(text);
}

// 监听流式输出，实时自动滚底（性能极高，不触发复杂计算）
watch(
  () => messages[messages.length - 1]?.displayContent,
  () => {
    nextTick(() => {
      scrollRef.value?.scrollTo({ top: scrollRef.value.scrollHeight, behavior: 'smooth' });
    });
  }
);
</script>

<template>
  <div class="chat-window">
    <div class="messages" ref="scrollRef">
      <MessageItem
        v-for="msg in messages"
        :key="msg.id"
        :msg="msg"
        @retry="retry"
      />
    </div>
    <div class="input-bar">
      <input
        v-model="input"
        @keyup.enter="handleSend"
        placeholder="输入消息..."
        :disabled="loading"
      />
      <button @click="handleSend" :disabled="!input.trim() || loading">发送</button>
      <button v-if="loading" @click="stop" class="stop-btn">停止</button>
    </div>
  </div>
</template>

<style scoped>
/* ... 样式保持不变 ... */
.chat-window { display: flex; flex-direction: column; height: 100%; }
.messages { flex: 1; overflow-y: auto; padding: 20px; }
.input-bar { display: flex; gap: 10px; padding: 16px; border-top: 1px solid #eee; }
.input-bar input { flex: 1; padding: 10px 14px; border: 1px solid #ddd; border-radius: 8px; font-size: 15px; outline: none; }
.input-bar button { padding: 10px 20px; background: #007bff; color: #fff; border: none; border-radius: 8px; cursor: pointer; }
.input-bar button:disabled { background: #ccc; cursor: not-allowed; }
.stop-btn { background: #dc3545 !important; }
</style>