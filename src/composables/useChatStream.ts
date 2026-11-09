// src/composables/useChatStream.ts
import { reactive, ref } from 'vue';
import { sendMessage } from '@/ai/chat';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  displayContent: string;
  status: 'pending' | 'streaming' | 'stopped' | 'error' | 'complete';
}

let msgId = 0;
export const messages = reactive<Message[]>([]);
export const loading = ref(false);

let abortController: AbortController | null = null;

// 将回写保存的逻辑通过回调注入
let onStateUpdate: ((msgs: any[]) => void) | null = null;

export function useChatStream() {
  function send(userText: string) {
    // 【关键】发送新消息时，强制把上一条 AI 消息标记为完成，解决光标残留问题
    const lastAi = messages.slice().reverse().find(m => m.role === 'assistant');
    if (lastAi && lastAi.status === 'streaming') {
      lastAi.status = 'complete';
      // 强制触发一次保存，确保上一条消息的最终状态被落盘
      onStateUpdate?.(messages);
    }

    stop(); // 强制中断上一次请求

    messages.push({
      id: `msg-${++msgId}`,
      role: 'user',
      content: userText,
      displayContent: userText,
      status: 'pending',
    });

    const assistantMsg: Message = {
      id: `msg-${++msgId}`,
      role: 'assistant',
      content: '',
      displayContent: '',
      status: 'streaming',
    };
    messages.push(assistantMsg);
    
    loading.value = true;
    abortController = new AbortController();

    sendMessage({
      message: userText,
      abortSignal: abortController.signal,
      onChunk: (chunk) => {
        const aiMsg = messages[messages.length - 1];
        if (aiMsg && aiMsg.role === 'assistant') {
          aiMsg.content += chunk;
          aiMsg.displayContent += chunk;
        }
      },
      onError: (err) => {
        const aiMsg = messages[messages.length - 1];
        if (aiMsg && aiMsg.role === 'assistant') {
          aiMsg.status = 'error';
          aiMsg.displayContent += `\n[错误] ${err}`;
          loading.value = false;
        }
      },
      onComplete: () => {
        const aiMsg = messages[messages.length - 1];
        if (aiMsg && aiMsg.role === 'assistant') {
          aiMsg.status = 'complete'; // 标记为完成，光标消失
        }
        loading.value = false;
        // 输出完毕，触发保存
        onStateUpdate?.(messages);
      },
    });
  }

  function stop() {
    abortController?.abort();
    abortController = null;
    const aiMsg = messages[messages.length - 1];
    if (aiMsg && aiMsg.role === 'assistant' && aiMsg.status === 'streaming') {
      aiMsg.status = 'stopped';
      // 手动停止，触发保存
      onStateUpdate?.(messages);
    }
    loading.value = false;
  }

  function retry() {
    stop();
    if (messages.length >= 2 && messages[messages.length - 1].role === 'assistant') {
      messages.splice(messages.length - 2, 2);
    }
  }

  // 提供注册保存回调的函数
  function registerUpdateCallback(callback: (msgs: any[]) => void) {
    onStateUpdate = callback;
  }

  return { messages, loading, send, stop, retry, registerUpdateCallback };
}