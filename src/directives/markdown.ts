// src/directives/markdown.ts
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import type { Directive } from 'vue';

marked.setOptions({ breaks: true });

export const vMarkdown: Directive = {
  mounted(el, binding) {
    render(el, binding.value);
  },
  updated(el, binding) {
    if (binding.value !== binding.oldValue) render(el, binding.value);
  },
};

function render(el: HTMLElement, content: string) {
  el.innerHTML = content ? DOMPurify.sanitize(marked.parse(content) as string) : '';
}