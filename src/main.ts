// src/main.ts
import { createApp } from 'vue';
import App from './App.vue';
import { vMarkdown } from './directives/markdown';

const app = createApp(App);
app.directive('markdown', vMarkdown);
app.mount('#app');