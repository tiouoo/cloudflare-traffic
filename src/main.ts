/* eslint-disable @typescript-eslint/no-explicit-any */
import './assets/css/main.css';
import 'ant-design-vue/dist/reset.css';

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import Antd from 'ant-design-vue';
import App from './App.vue';
import router from './router';
import { toggleTheme, setTheme, isDark } from './utils/theme';

(window as any).theme = {
  toggle: toggleTheme,
  set: setTheme,
  isDark: () => isDark.value,
};

import { library } from '@fortawesome/fontawesome-svg-core';
import { fas } from '@fortawesome/free-solid-svg-icons';
import { fab } from '@fortawesome/free-brands-svg-icons';
import {
  FontAwesomeIcon,
  FontAwesomeLayers,
  FontAwesomeLayersText,
} from '@fortawesome/vue-fontawesome';
library.add(fas, fab);

const app = createApp(App);

app.component('font-awesome-icon', FontAwesomeIcon);
app.component('font-awesome-layers', FontAwesomeLayers);
app.component('font-awesome-layers-text', FontAwesomeLayersText);

app.use(createPinia());
app.use(router);

app.use(Antd).mount('#app');
