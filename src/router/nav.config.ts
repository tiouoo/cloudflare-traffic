import { h, type VNode } from 'vue';
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { type MenuProps } from 'ant-design-vue';

export interface NavItem {
  key: string;
  label: string;
  title: string;
  icon: () => VNode;
}

export const navItems = <MenuProps['items']>[
  {
    icon: () =>
      h(FontAwesomeIcon, {
        icon: ['fas', 'home'],
        size: '2xs',
        style: 'top: -1px;position: relative;',
      }),
    key: '/',
    label: '',
    title: '',
  },
  {
    icon: () =>
      h(FontAwesomeIcon, {
        icon: ['fab', 'github'],
        size: '2xs',
        style: 'top: -1px;position: relative;',
      }),
    key: 'github',
    label: '',
    title: '',
  },
  {
    icon: () =>
      h(FontAwesomeIcon, {
        icon: ['fas', 'cloud-sun'],
        size: '2xs',
        style: 'top: -1px;position: relative;',
      }),
    key: 'theme',
    label: '',
    title: '',
  },
];
