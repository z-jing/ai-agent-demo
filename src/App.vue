<!-- src/App.vue -->
<script setup lang="ts">
import { useConversation } from '@/composables/useConversation';
import ChatWindow from './components/chatWindow.vue';

const {
  conversations,
  activeId,
  create,
  remove,
  getActive,
  updateMessages,
  switchTo,
} = useConversation();
</script>

<template>
  <div class="app">
    <!-- 左侧会话列表 -->
    <aside class="sidebar">
      <button class="new-btn" @click="create">+ 新对话</button>
      <ul>
        <li
          v-for="conv in conversations"
          :key="conv.id"
          :class="{ active: conv.id === activeId }"
          @click="switchTo(conv.id)"
        >
          <span class="title">{{ conv.title }}</span>
          <button class="del" @click.stop="remove(conv.id)">×</button>
        </li>
      </ul>
    </aside>

    <!-- 右侧对话窗口 -->
    <main class="main">
      <ChatWindow
        v-if="getActive()"
        :conversation="getActive()!"
        @update="updateMessages"
      />
      <div v-else class="empty">请新建或选择一个对话</div>
    </main>
  </div>
</template>

<style scoped>
.app {
  display: flex;
  height: 100vh;
}
.sidebar {
  width: 220px;
  background: #f5f5f5;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
}
.new-btn {
  margin: 12px;
  padding: 10px;
  background: #007bff;
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}
.sidebar ul {
  list-style: none;
  padding: 0;
  margin: 0;
  overflow-y: auto;
}
.sidebar li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  cursor: pointer;
  font-size: 14px;
}
.sidebar li.active {
  background: #e3f2fd;
}
.sidebar li:hover {
  background: #eee;
}
.del {
  background: none;
  border: none;
  color: #999;
  cursor: pointer;
  font-size: 16px;
}
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
}
</style>