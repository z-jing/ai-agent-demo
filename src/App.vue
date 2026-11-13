
<script setup lang="ts">
// 【修改】根组件（左知识库 / 右对话 布局）
// 变化：左侧挂第 3 周新增的 KnowledgePanel；文档入库后绑定到当前会话
import KnowledgePanel from './components/knowledgePanel.vue'
import ChatWindow from './components/chatWindow.vue'
import { useConversation } from './composables/useConversation'

// 会话实例只在根组件创建一次，再传给 ChatWindow，
// 保证「多会话 + localStorage 持久化」是全应用唯一的一份状态
const conv = useConversation()

// 知识库新入库的文档，自动绑定进当前会话
function onDocAdded(docId: string) {
  conv.bindDoc(docId)
}
</script>

<template>
  <div class="app">
    <aside class="side">
      <KnowledgePanel @doc-added="onDocAdded" />
    </aside>
    <main class="main">
      <ChatWindow :conv="conv" />
    </main>
  </div>
</template>

<style scoped>
.app { display: flex; height: 100vh; }
.side { width: 240px; flex: none; background: #fafbfc; }
.main { flex: 1; min-width: 0; }
</style>