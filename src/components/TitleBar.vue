<template>
  <div class="container">
    <span class="title">traffic.tiouo.xyz</span>
    <div class="nav-container">
      <a-menu
        v-model:selectedKeys="current"
        mode="horizontal"
        :items="items"
        @click="handleMenuClick" />
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { navItems } from '@/router/nav.config';
import type { MenuProps } from 'ant-design-vue';
import { toggleTheme } from '@/utils/theme';

const router = useRouter();
const current = ref<string[]>([]);
const items = ref(navItems);

const handleMenuClick: MenuProps['onClick'] = (info) => {
  current.value = [];
  if (info.key == '') {
    return;
  }
  if (info.key == 'theme') {
    toggleTheme();
    return;
  }
  if (info.key == 'github') {
    window.open('https://github.com/tiouoo');
    return;
  }
  if (info.key) {
    router.push(`/${info.key}`);
  }
};
</script>
<style scoped>
:deep(.ant-menu-title-content) {
  font-family: 'ZhuZiAYuanJWD', sans-serif !important;
}
:deep(.ant-menu-item-icon),
:deep(.ant-menu-submenu::after),
:deep(.ant-menu-item::after),
:deep(.ant-menu-title-content) {
  color: var(--text-color) !important;
  border-bottom-width: 0px !important;
}
:deep(.ant-menu-light.ant-menu-horizontal > .ant-menu-item:hover::after) {
  border-bottom-width: 2px;
}
:deep(.ant-menu-item) {
  padding: 0px !important;
  padding-right: 16px !important;
}
:deep(.ant-menu-horizontal) {
  border: 0 !important;
}
.container {
  color: var(--text-color);
  display: flex;
  background-color: var(--card-bg);
  align-items: center;
  height: 45px;
  justify-content: space-between;
  border: var(--card-border);
  border-radius: var(--card-radius);
}
.title {
  font-size: 18px;
  line-height: 1;
  margin-top: -1px;
  margin-left: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}

.path-separator {
  color: var(--text-color);
  cursor: default;
}

.page-info {
  cursor: default;
  font-size: 16px;
}

.real-path {
  color: var(--text-color-light);
  font-size: 14px;
  display: none;
}

.search-source {
  color: var(--text-color);
  font-size: 15px;
}

.search-keyword {
  color: var(--text-color);
  font-weight: 500;
}
.nav-container {
  width: 132px;
  display: flex;
  flex-direction: row-reverse;
}
:deep(.ant-menu-horizontal) {
  width: 100%;
  display: flex;
  justify-content: flex-end;
}
:deep(.ant-menu) {
  background-color: transparent;
}
:deep(.ant-menu-title-content) {
  position: relative;
  top: -1px;
}
</style>
