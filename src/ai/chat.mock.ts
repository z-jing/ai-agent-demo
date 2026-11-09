// src/ai/chat.mock.ts

interface SendMessageOptions {
  message: string;
  onChunk: (chunk: string) => void;
  onError: (error: string) => void;
  onComplete: () => void;
  abortSignal: AbortSignal;
}

const MOCK = `
你好！我是 **Vue 3 + TypeScript** 驱动的智能助手。

### 我能为你做什么？
- 流式输出 + 平滑打字机效果
- 渲染代码块并保留缩进
- 处理中断与自动滚底

\`\`\`typescript
import { ref, computed } from 'vue';

const count = ref(0);
const double = computed(() => count.value * 2);
\`\`\`

> **提示**：这是引用块，用于重要说明。
`;

export function sendMessage({
  onChunk,
  onError,
  onComplete,
  abortSignal,
}: SendMessageOptions) {
  let i = 0;
  const chunkSize = 3;
  const timer = setInterval(() => {
    if (abortSignal.aborted) {
      clearInterval(timer);
      onComplete();
      return;
    }
    if (i < MOCK.length) {
      onChunk(MOCK.slice(i, i + chunkSize));
      i += chunkSize;
    } else {
      clearInterval(timer);
      onComplete();
    }
  }, 40);
}