// src/ai/chat.ts

interface SendMessageOptions {
  message: string;
  onChunk: (chunk: string) => void;
  onError: (error: string) => void;
  onComplete: () => void;
  abortSignal: AbortSignal;
}

export function sendMessage({
  message,
  onChunk,
  onError,
  onComplete,
  abortSignal,
}: SendMessageOptions) {
  const apiKey = import.meta.env.VITE_AI_API_KEY;
  if (!apiKey) {
    onError('未配置 API Key，请在 .env 中设置 VITE_AI_API_KEY');
    return;
  }

  fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: message }],
      stream: true,
    }),
    signal: abortSignal,
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      function read() {
        reader.read().then(({ done, value }) => {
          if (done) {
            onComplete();
            return;
          }
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const data = JSON.parse(line.slice(6));
                const delta = data.choices?.[0]?.delta?.content || '';
                if (delta) onChunk(delta);
              } catch {
                // 忽略解析失败的行
              }
            }
          }
          read();
        });
      }
      read();
    })
    .catch((err) => {
      if (err.name !== 'AbortError') {
        onError(err.message);
      }
    });
}