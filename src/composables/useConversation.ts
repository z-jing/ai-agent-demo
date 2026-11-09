// src/composables/useConversation.ts
import { ref, watch } from 'vue';
import type { Message } from './useChatStream';

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
}

const STORAGE_KEY = 'ai_conversations';

function load(): Conversation[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function save(list: Conversation[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

let convId = Date.now();

export function useConversation() {
  const conversations = ref<Conversation[]>(load());
  const activeId = ref<string>('');

  // 新建会话
  function create() {
    const conv: Conversation = {
      id: `conv-${++convId}`,
      title: '新对话',
      messages: [],
      createdAt: Date.now(),
    };
    conversations.value.unshift(conv);
    activeId.value = conv.id;
    save(conversations.value);
    return conv;
  }

  // 删除会话
  function remove(id: string) {
    const idx = conversations.value.findIndex((c) => c.id === id);
    if (idx === -1) return;
    conversations.value.splice(idx, 1);
    if (activeId.value === id) {
      activeId.value = conversations.value[0]?.id || '';
    }
    save(conversations.value);
  }

  // 获取当前会话
  function getActive(): Conversation | undefined {
    return conversations.value.find((c) => c.id === activeId.value);
  }

  // 更新当前会话的消息列表
  function updateMessages(msgs: Message[]) {
    const conv = getActive();
    if (!conv) return;
    conv.messages = msgs;
    // 自动标题：取第一条用户消息前 15 字
    if (conv.title === '新对话') {
      const firstUser = msgs.find((m) => m.role === 'user');
      if (firstUser) {
        conv.title = firstUser.content.slice(0, 15);
      }
    }
    save(conversations.value);
  }

  // 切换会话
  function switchTo(id: string) {
    activeId.value = id;
  }

  // 初始化：如果没有会话则新建
  if (conversations.value.length === 0) {
    create();
  } else if (!activeId.value) {
    activeId.value = conversations.value[0].id;
  }

  return {
    conversations,
    activeId,
    create,
    remove,
    getActive,
    updateMessages,
    switchTo,
  };
}