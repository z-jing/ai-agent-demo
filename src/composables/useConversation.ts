
// 【修改】多会话管理 + localStorage 持久化 → 会话记录绑定的文档 boundDocIds
import { ref, watch } from 'vue'
import type { Message } from './useChatStream'

interface Conversation {
  id: string
  title: string
  messages: Message[]
  boundDocIds: string[]          // 【新增】该会话关联的文档 id
  updatedAt: number
}

const KEY = 'app:conversations'
const CUR = 'app:currentConv'

export function useConversation() {
  const convs = ref<Conversation[]>(load())
  const currentId = ref<string>(localStorage.getItem(CUR) || '')

  if (!currentId.value || !convs.value.find((c) => c.id === currentId.value)) {
    const c = newConv()
    convs.value.push(c); currentId.value = c.id
  }

  function load(): Conversation[] {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]') } catch { return [] }
  }
  function persist() {
    localStorage.setItem(KEY, JSON.stringify(convs.value))
    localStorage.setItem(CUR, currentId.value)
  }
  function newConv(): Conversation {
    return { id: crypto.randomUUID(), title: '新对话', messages: [], boundDocIds: [], updatedAt: Date.now() }
  }

  function current() {
    return convs.value.find((c) => c.id === currentId.value)!
  }
  function create() {
    const c = newConv(); convs.value.push(c); currentId.value = c.id; persist(); return c
  }
  function switchTo(id: string) { currentId.value = id; persist() }
  function remove(id: string) {
    convs.value = convs.value.filter((c) => c.id !== id)
    if (currentId.value === id) currentId.value = convs.value[0]?.id || create().id
    persist()
  }
  function appendMessage(m: Message) {
    const c = current()
    c.messages.push(m)
    if (c.title === '新对话' && m.role === 'user') c.title = m.content.slice(0, 16)
    c.updatedAt = Date.now()
    persist()
  }
  // 【新增】把某文档绑定进当前会话
  function bindDoc(docId: string) {
    const c = current()
    if (!c.boundDocIds.includes(docId)) { c.boundDocIds.push(docId); persist() }
  }
  function getBoundDocIds() { return current().boundDocIds }

  watch(currentId, persist)
  return { convs, currentId, current, create, switchTo, remove, appendMessage, bindDoc, getBoundDocIds }
}