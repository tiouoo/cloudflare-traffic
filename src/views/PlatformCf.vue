<template>
  <div class="traffic-analytics">
    <div class="header">
      <div class="title">
        <font-awesome-icon icon="chart-line" class="icon" />
        <span>Cloudflare 流量分析</span>
      </div>
      <div class="header-controls">
        <div class="period-selector">
          <a-select v-model:value="selectedDays" @change="fetchAllData" style="width: 120px">
            <a-select-option :value="1">过去 24 小时</a-select-option>
            <a-select-option :value="7">过去 7 天</a-select-option>
            <a-select-option :value="14">过去 14 天</a-select-option>
            <a-select-option :value="30">过去 30 天</a-select-option>
          </a-select>
        </div>
        <div class="domain-selector">
          <a-select v-model:value="selectedDomain" @change="fetchAllData" style="width: 200px">
            <a-select-option :value="'all'">所有域名</a-select-option>
            <a-select-option v-for="domain in domains" :key="domain" :value="domain">{{ domain }}</a-select-option>
          </a-select>
        </div>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card" v-for="stat in stats" :key="stat.key">
        <div class="stat-label">{{ stat.label }}</div>
        <div class="stat-value-row">
          <span class="stat-value" :class="{ 'loading-text': loading || error }">
            {{ loading ? '加载中...' : error ? '加载失败' : stat.formattedValue }}
          </span>
          <span v-if="!loading && !error" class="stat-change" :class="stat.changeClass">
            <font-awesome-icon :icon="stat.changeIcon" class="change-icon" />
            {{ stat.changeText }}
          </span>
        </div>
        <div class="stat-desc">{{ stat.desc }}</div>
      </div>
    </div>

    <!-- 图表区域 - 两列布局 -->
    <div class="charts-grid">
      <!-- 请求变化折线图 -->
      <div class="chart-card">
        <div class="chart-title">请求变化趋势</div>
        <div class="chart-container" ref="lineChartRef"></div>
      </div>

      <!-- 区域请求柱状图 -->
      <div class="chart-card">
        <div class="chart-header">
          <div class="chart-title">区域请求分布</div>
          <div class="pagination-controls" v-if="totalCountryPages > 1">
            <a-button size="small" :disabled="countryPage === 1" @click="countryPage--">
              <font-awesome-icon icon="chevron-left" />
            </a-button>
            <span class="page-info">{{ countryPage }} / {{ totalCountryPages }}</span>
            <a-button
              size="small"
              :disabled="countryPage === totalCountryPages"
              @click="countryPage++">
              <font-awesome-icon icon="chevron-right" />
            </a-button>
          </div>
        </div>
        <div class="chart-container" ref="barChartRef"></div>
      </div>
    </div>

    <!-- 详细统计区域 -->
    <div class="detailed-stats-section">
      <!-- 安全性 -->
      <div class="stats-category">
        <div class="category-title">安全性</div>
        <div class="category-stats-grid">
          <div class="mini-stat-card" v-for="stat in securityStats" :key="stat.key">
            <div class="mini-stat-label">{{ stat.label }}</div>
            <div class="mini-stat-value-row">
              <span class="mini-stat-value" :class="{ 'loading-text': detailedLoading }">
                {{ detailedLoading ? '...' : stat.formattedValue }}
              </span>
              <span v-if="!detailedLoading" class="mini-stat-change" :class="stat.changeClass">
                <font-awesome-icon :icon="stat.changeIcon" class="change-icon" />
                {{ stat.changeText }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 缓存 -->
      <div class="stats-category">
        <div class="category-title">缓存</div>
        <div class="category-stats-grid">
          <div class="mini-stat-card" v-for="stat in cacheStats" :key="stat.key">
            <div class="mini-stat-label">{{ stat.label }}</div>
            <div class="mini-stat-value-row">
              <span class="mini-stat-value" :class="{ 'loading-text': detailedLoading }">
                {{ detailedLoading ? '...' : stat.formattedValue }}
              </span>
              <span v-if="!detailedLoading" class="mini-stat-change" :class="stat.changeClass">
                <font-awesome-icon :icon="stat.changeIcon" class="change-icon" />
                {{ stat.changeText }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 错误 -->
      <div class="stats-category">
        <div class="category-title">错误</div>
        <div class="category-stats-grid">
          <div class="mini-stat-card" v-for="stat in errorStats" :key="stat.key">
            <div class="mini-stat-label">{{ stat.label }}</div>
            <div class="mini-stat-value-row">
              <span class="mini-stat-value" :class="{ 'loading-text': detailedLoading }">
                {{ detailedLoading ? '...' : stat.formattedValue }}
              </span>
              <span v-if="!detailedLoading" class="mini-stat-change" :class="stat.changeClass">
                <font-awesome-icon :icon="stat.changeIcon" class="change-icon" />
                {{ stat.changeText }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 网络 -->
      <div class="stats-category">
        <div class="category-title">网络</div>
        <div class="network-tables-grid">
          <!-- HTTP 版本 -->
          <div class="network-table-card">
            <div class="network-table-title">使用的客户端 HTTP 版本</div>
            <div class="network-table-content">
              <div
                class="network-table-row"
                v-for="item in networkStatsData.httpVersions"
                :key="item.name">
                <span class="network-item-name">{{ item.name }}</span>
                <span class="network-item-value">{{ formatNumber(item.requests) }}</span>
                <div class="network-item-bar">
                  <div
                    class="network-item-bar-fill"
                    :style="{ width: getBarWidth(item.requests, maxHttpRequests) + '%' }"></div>
                </div>
              </div>
              <div v-if="networkStatsData.httpVersions.length === 0" class="network-table-empty">
                {{ networkLoading ? '加载中...' : '暂无数据' }}
              </div>
            </div>
          </div>

          <!-- SSL 版本 -->
          <div class="network-table-card">
            <div class="network-table-title">通过 SSL 提供的流量</div>
            <div class="network-table-content">
              <div
                class="network-table-row"
                v-for="item in networkStatsData.sslVersions"
                :key="item.name">
                <span class="network-item-name">{{ item.name }}</span>
                <span class="network-item-value">{{ formatNumber(item.requests) }}</span>
                <div class="network-item-bar">
                  <div
                    class="network-item-bar-fill"
                    :style="{ width: getBarWidth(item.requests, maxSslRequests) + '%' }"></div>
                </div>
              </div>
              <div v-if="networkStatsData.sslVersions.length === 0" class="network-table-empty">
                {{ networkLoading ? '加载中...' : '暂无数据' }}
              </div>
            </div>
          </div>

          <!-- 内容类型 -->
          <div class="network-table-card full-width">
            <div class="network-table-title">热门内容类型</div>
            <div class="network-table-content">
              <div
                class="network-table-row"
                v-for="item in networkStatsData.contentTypes.slice(0, 10)"
                :key="item.name">
                <span class="network-item-name">{{ item.name }}</span>
                <span class="network-item-value">{{ formatNumber(item.requests) }}</span>
                <div class="network-item-bar">
                  <div
                    class="network-item-bar-fill"
                    :style="{ width: getBarWidth(item.requests, maxContentRequests) + '%' }"></div>
                </div>
              </div>
              <div v-if="networkStatsData.contentTypes.length === 0" class="network-table-empty">
                {{ networkLoading ? '加载中...' : '暂无数据' }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 所有域名 Web 流量 -->
      <div v-for="(trafficData, domain) in allZonesTrafficData" :key="domain" class="stats-category">
        <div class="category-title">{{ domain }} Web 流量</div>
        <div class="web-traffic-grid">
          <!-- 请求卡片 -->
          <div class="web-traffic-card">
            <div class="web-traffic-header">通过 Cloudflare 的请求</div>
            <div class="web-traffic-stats">
              <div class="web-traffic-stat">
                <div class="web-traffic-stat-label">请求总数</div>
                <div class="web-traffic-stat-sublabel">过去 {{ selectedDays }} 天</div>
                <div class="web-traffic-stat-value">
                  {{ zoneTrafficLoading ? '...' : formatNumber(trafficData.requests.total) }}
                </div>
              </div>
              <div class="web-traffic-stat">
                <div class="web-traffic-stat-label">已缓存的请求</div>
                <div class="web-traffic-stat-sublabel">过去 {{ selectedDays }} 天</div>
                <div class="web-traffic-stat-value">
                  {{ zoneTrafficLoading ? '...' : formatNumber(trafficData.requests.cached) }}
                </div>
              </div>
              <div class="web-traffic-stat">
                <div class="web-traffic-stat-label">未缓存的请求</div>
                <div class="web-traffic-stat-sublabel">过去 {{ selectedDays }} 天</div>
                <div class="web-traffic-stat-value">
                  {{ zoneTrafficLoading ? '...' : formatNumber(trafficData.requests.uncached) }}
                </div>
              </div>
            </div>
            <div class="web-traffic-chart" :ref="el => setChartRef(el, domain, 'requests')"></div>
          </div>

          <!-- 带宽卡片 -->
          <div class="web-traffic-card">
            <div class="web-traffic-header">带宽</div>
            <div class="web-traffic-stats">
              <div class="web-traffic-stat">
                <div class="web-traffic-stat-label">总带宽</div>
                <div class="web-traffic-stat-sublabel">过去 {{ selectedDays }} 天</div>
                <div class="web-traffic-stat-value">
                  {{ zoneTrafficLoading ? '...' : formatBytes(trafficData.bandwidth.total) }}
                </div>
              </div>
              <div class="web-traffic-stat">
                <div class="web-traffic-stat-label">已缓存的带宽</div>
                <div class="web-traffic-stat-sublabel">过去 {{ selectedDays }} 天</div>
                <div class="web-traffic-stat-value">
                  {{ zoneTrafficLoading ? '...' : formatBytes(trafficData.bandwidth.cached) }}
                </div>
              </div>
              <div class="web-traffic-stat">
                <div class="web-traffic-stat-label">未缓存的带宽</div>
                <div class="web-traffic-stat-sublabel">过去 {{ selectedDays }} 天</div>
                <div class="web-traffic-stat-value">
                  {{ zoneTrafficLoading ? '...' : formatBytes(trafficData.bandwidth.uncached) }}
                </div>
              </div>
            </div>
            <div class="web-traffic-chart" :ref="el => setChartRef(el, domain, 'bandwidth')"></div>
          </div>

          <!-- 唯一访问者卡片 -->
          <div class="web-traffic-card">
            <div class="web-traffic-header">唯一访问者</div>
            <div class="web-traffic-stats">
              <div class="web-traffic-stat">
                <div class="web-traffic-stat-label">唯一访问者总计</div>
                <div class="web-traffic-stat-sublabel">过去 {{ selectedDays }} 天</div>
                <div class="web-traffic-stat-value">
                  {{ zoneTrafficLoading ? '...' : formatNumber(trafficData.visitors.total) }}
                </div>
              </div>
              <div class="web-traffic-stat">
                <div class="web-traffic-stat-label">唯一访问者上限</div>
                <div class="web-traffic-stat-sublabel">Per 1 小时</div>
                <div class="web-traffic-stat-value">
                  {{ zoneTrafficLoading ? '...' : formatNumber(trafficData.visitors.max) }}
                </div>
              </div>
              <div class="web-traffic-stat">
                <div class="web-traffic-stat-label">唯一访问者下限</div>
                <div class="web-traffic-stat-sublabel">Per 1 小时</div>
                <div class="web-traffic-stat-value">
                  {{ zoneTrafficLoading ? '...' : formatNumber(trafficData.visitors.min) }}
                </div>
              </div>
            </div>
            <div class="web-traffic-chart" :ref="el => setChartRef(el, domain, 'visitors')"></div>
          </div>
        </div>
      </div>

      <!-- Workers 流量统计 -->
      <div class="stats-category">
        <div class="category-title">Workers 流量统计</div>
        <div class="workers-grid">
          <div v-for="worker in workersAnalytics" :key="worker.name" class="worker-card">
            <div class="worker-header">{{ worker.name }}</div>
            <div class="worker-stats">
              <div class="worker-stat">
                <div class="worker-stat-label">请求数</div>
                <div class="worker-stat-value">{{ workersLoading ? '...' : formatNumber(worker.data.requests) }}</div>
              </div>
              <div class="worker-stat">
                <div class="worker-stat-label">错误数</div>
                <div class="worker-stat-value">{{ workersLoading ? '...' : formatNumber(worker.data.errors) }}</div>
              </div>
              <div class="worker-stat">
                <div class="worker-stat-label">子请求数</div>
                <div class="worker-stat-value">{{ workersLoading ? '...' : formatNumber(worker.data.subrequests) }}</div>
              </div>
              <div class="worker-stat">
                <div class="worker-stat-label">CPU 时间 P50</div>
                <div class="worker-stat-value">{{ workersLoading ? '...' : worker.data.cpuTimeP50.toFixed(2) }}ms</div>
              </div>
              <div class="worker-stat">
                <div class="worker-stat-label">CPU 时间 P99</div>
                <div class="worker-stat-value">{{ workersLoading ? '...' : worker.data.cpuTimeP99.toFixed(2) }}ms</div>
              </div>
            </div>
          </div>
          <div v-if="workersLoading" class="worker-loading">加载中...</div>
          <div v-else-if="workersAnalytics.length === 0" class="worker-empty">暂无 Worker 数据</div>
        </div>
      </div>
    </div>
  </div>
</template>

<!-- eslint-disable @typescript-eslint/no-explicit-any -->
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import axios from 'axios';
import config from '@/config';
import * as echarts from 'echarts';

interface AnalyticsData {
  requests: { value: number; change: number };
  bandwidth: { value: number; change: number };
  visits: { value: number; change: number };
  pageViews: { value: number; change: number };
  period: { start: string; end: string; days: number };
}

interface TimeSeriesItem {
  date: string;
  requests: number;
  bytes: number;
  pageViews: number;
  visits: number;
  isHourly?: boolean;
}

interface CountryItem {
  country: string;
  requests: number;
  bytes: number;
  timeSeries: TimeSeriesItem[];
}

interface DetailedStatsData {
  security: {
    encryptedRequests: { value: number; change: number };
    encryptedRequestsRate: { value: number; change: number };
    encryptedBytes: { value: number; change: number };
    encryptedBytesRate: { value: number; change: number };
  };
  cache: {
    cachedRequests: { value: number; change: number };
    cachedRequestsRate: { value: number; change: number };
    cachedBytes: { value: number; change: number };
    cachedBytesRate: { value: number; change: number };
  };
  errors: {
    status4xx: { value: number; change: number };
    status4xxRate: { value: number; change: number };
    status5xx: { value: number; change: number };
    status5xxRate: { value: number; change: number };
  };
}

interface NetworkItem {
  name: string;
  requests: number;
}

interface NetworkStatsData {
  httpVersions: NetworkItem[];
  sslVersions: NetworkItem[];
  contentTypes: NetworkItem[];
}

interface ZoneTrafficData {
  requests: { total: number; cached: number; uncached: number; max: number; min: number };
  bandwidth: { total: number; cached: number; uncached: number; max: number; min: number };
  visitors: { total: number; max: number; min: number };
  timeSeries: {
    date: string;
    requests: number;
    cachedRequests: number;
    uncachedRequests: number;
    bytes: number;
    cachedBytes: number;
    uncachedBytes: number;
    visitors: number;
    isHourly: boolean;
  }[];
  period: { start: string; end: string; days: number };
}

// Worker 相关类型定义
interface Worker {
  id: string;
  name: string;
  script: string;
  created_on: string;
  modified_on: string;
  [key: string]: any;
}

interface WorkerAnalytics {
  scriptName: string;
  requests: number;
  errors: number;
  subrequests: number;
  cpuTimeP50: number;
  cpuTimeP99: number;
  status: string;
  datetime: string;
}

interface WorkerData {
  name: string;
  data: {
    requests: number;
    errors: number;
    subrequests: number;
    cpuTimeP50: number;
    cpuTimeP99: number;
    timeSeries: WorkerAnalytics[];
    period: {
      start: string;
      end: string;
      days: number;
    };
  };
}

const loading = ref(true);
const detailedLoading = ref(true);
const networkLoading = ref(true);
const error = ref(false);
const selectedDays = ref(7);
const analyticsData = ref<AnalyticsData | null>(null);
const timeSeriesData = ref<TimeSeriesItem[]>([]);
const countryData = ref<CountryItem[]>([]);
const detailedStatsData = ref<DetailedStatsData | null>(null);
const networkStatsData = ref<NetworkStatsData>({
  httpVersions: [],
  sslVersions: [],
  contentTypes: [],
});
const zoneTrafficLoading = ref(true);
const zoneTrafficData = ref<ZoneTrafficData>({
  requests: { total: 0, cached: 0, uncached: 0, max: 0, min: 0 },
  bandwidth: { total: 0, cached: 0, uncached: 0, max: 0, min: 0 },
  visitors: { total: 0, max: 0, min: 0 },
  timeSeries: [],
  period: { start: '', end: '', days: 0 },
});

// 域名相关
const domains = ref<string[]>([]);
const selectedDomain = ref('all');
const allZonesTrafficData = ref<Record<string, ZoneTrafficData>>({});

// Worker 相关
const workers = ref<Worker[]>([]);
const workersAnalytics = ref<WorkerData[]>([]);
const workersLoading = ref(true);

// 图表相关
const lineChartRef = ref<HTMLElement | null>(null);
const barChartRef = ref<HTMLElement | null>(null);
let lineChart: echarts.ECharts | null = null;
let barChart: echarts.ECharts | null = null;

// 动态图表引用
const chartRefs = ref<Record<string, Record<string, HTMLElement | null>>>({});
const charts = ref<Record<string, Record<string, echarts.ECharts | null>>>({});

// 设置图表引用
const setChartRef = (el: HTMLElement | null, domain: string, type: string) => {
  if (!chartRefs.value[domain]) {
    chartRefs.value[domain] = {};
  }
  chartRefs.value[domain][type] = el;

  // 如果元素存在、有有效尺寸且数据已加载，初始化图表
  if (el && el.clientWidth > 0 && el.clientHeight > 0 && allZonesTrafficData.value[domain]) {
    if (!charts.value[domain]) {
      charts.value[domain] = {};
    }

    // 避免重复初始化图表实例
    if (!charts.value[domain][type]) {
      charts.value[domain][type] = echarts.init(el);
      // 更新图表数据
      updateZoneTrafficCharts();
    }
  }
};

// 分页相关
const countryPage = ref(1);
const pageSize = 10;
const totalCountryPages = computed(() => Math.ceil(countryData.value.length / pageSize));
const paginatedCountryData = computed(() => {
  const start = (countryPage.value - 1) * pageSize;
  return countryData.value.slice(start, start + pageSize);
});

const formatNumber = (num: number): string => {
  if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(2) + 'k';
  return num.toString();
};

const formatBytes = (bytes: number): string => {
  if (bytes >= 1099511627776) return (bytes / 1099511627776).toFixed(2) + ' TB';
  if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(2) + ' GB';
  if (bytes >= 1048576) return (bytes / 1048576).toFixed(2) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return bytes + ' B';
};

const formatChange = (change: number): string => {
  return Math.abs(change).toFixed(2) + '%';
};

const defaultStats = [
  { key: 'requests', label: '请求', desc: '总请求数', isBytes: false },
  { key: 'bandwidth', label: '带宽', desc: '总带宽消耗', isBytes: true },
  { key: 'visits', label: '访问量', desc: '独立访客数', isBytes: false },
  { key: 'pageViews', label: '页面浏览量', desc: 'HTML 页面浏览', isBytes: false },
];

const stats = computed(() => {
  const data = analyticsData.value;
  return defaultStats.map((stat) => {
    const item = data?.[stat.key as keyof AnalyticsData] as
      | { value: number; change: number }
      | undefined;
    const value = item?.value ?? 0;
    const change = item?.change ?? 0;
    return {
      key: stat.key,
      label: stat.label,
      desc: stat.desc,
      formattedValue: stat.isBytes ? formatBytes(value) : formatNumber(value),
      change,
      changeText: formatChange(change),
      changeIcon: change >= 0 ? 'arrow-up' : 'arrow-down',
      changeClass: change >= 0 ? 'positive' : 'negative',
    };
  });
});

const formatPercent = (value: number): string => {
  return value.toFixed(2) + '%';
};

const formatStatItem = (value: number, change: number, isBytes: boolean, isPercent: boolean) => {
  let formattedValue: string;
  if (isPercent) {
    formattedValue = formatPercent(value);
  } else if (isBytes) {
    formattedValue = formatBytes(value);
  } else {
    formattedValue = formatNumber(value);
  }
  return {
    formattedValue,
    changeText: formatChange(change),
    changeIcon: change >= 0 ? 'arrow-up' : 'arrow-down',
    changeClass: change >= 0 ? 'positive' : 'negative',
  };
};

const securityStats = computed(() => {
  const data = detailedStatsData.value?.security;
  return [
    {
      key: 'encryptedRequests',
      label: '加密请求数',
      ...formatStatItem(
        data?.encryptedRequests?.value ?? 0,
        data?.encryptedRequests?.change ?? 0,
        false,
        false
      ),
    },
    {
      key: 'encryptedRequestsRate',
      label: '加密请求率',
      ...formatStatItem(
        data?.encryptedRequestsRate?.value ?? 0,
        data?.encryptedRequestsRate?.change ?? 0,
        false,
        true
      ),
    },
    {
      key: 'encryptedBytes',
      label: '加密带宽',
      ...formatStatItem(
        data?.encryptedBytes?.value ?? 0,
        data?.encryptedBytes?.change ?? 0,
        true,
        false
      ),
    },
    {
      key: 'encryptedBytesRate',
      label: '加密带宽率',
      ...formatStatItem(
        data?.encryptedBytesRate?.value ?? 0,
        data?.encryptedBytesRate?.change ?? 0,
        false,
        true
      ),
    },
  ];
});

const cacheStats = computed(() => {
  const data = detailedStatsData.value?.cache;
  return [
    {
      key: 'cachedRequests',
      label: '已缓存的请求数',
      ...formatStatItem(
        data?.cachedRequests?.value ?? 0,
        data?.cachedRequests?.change ?? 0,
        false,
        false
      ),
    },
    {
      key: 'cachedRequestsRate',
      label: '缓存请求率',
      ...formatStatItem(
        data?.cachedRequestsRate?.value ?? 0,
        data?.cachedRequestsRate?.change ?? 0,
        false,
        true
      ),
    },
    {
      key: 'cachedBytes',
      label: '已缓存的带宽',
      ...formatStatItem(data?.cachedBytes?.value ?? 0, data?.cachedBytes?.change ?? 0, true, false),
    },
    {
      key: 'cachedBytesRate',
      label: '缓存带宽率',
      ...formatStatItem(
        data?.cachedBytesRate?.value ?? 0,
        data?.cachedBytesRate?.change ?? 0,
        false,
        true
      ),
    },
  ];
});

const errorStats = computed(() => {
  const data = detailedStatsData.value?.errors;
  return [
    {
      key: 'status4xx',
      label: '4xx 错误数量',
      ...formatStatItem(data?.status4xx?.value ?? 0, data?.status4xx?.change ?? 0, false, false),
    },
    {
      key: 'status4xxRate',
      label: '4xx 错误率',
      ...formatStatItem(
        data?.status4xxRate?.value ?? 0,
        data?.status4xxRate?.change ?? 0,
        false,
        true
      ),
    },
    {
      key: 'status5xx',
      label: '5xx 错误数量',
      ...formatStatItem(data?.status5xx?.value ?? 0, data?.status5xx?.change ?? 0, false, false),
    },
    {
      key: 'status5xxRate',
      label: '5xx 错误率',
      ...formatStatItem(
        data?.status5xxRate?.value ?? 0,
        data?.status5xxRate?.change ?? 0,
        false,
        true
      ),
    },
  ];
});

// 网络统计相关计算属性
const maxHttpRequests = computed(() => {
  return Math.max(...networkStatsData.value.httpVersions.map((item) => item.requests), 1);
});

const maxSslRequests = computed(() => {
  return Math.max(...networkStatsData.value.sslVersions.map((item) => item.requests), 1);
});

const maxContentRequests = computed(() => {
  return Math.max(
    ...networkStatsData.value.contentTypes.slice(0, 10).map((item) => item.requests),
    1
  );
});

const getBarWidth = (value: number, max: number): number => {
  return (value / max) * 100;
};

// 初始化 Web 流量图表
const initZoneTrafficCharts = () => {
  // 为每个域名初始化图表
  Object.keys(allZonesTrafficData.value).forEach(domain => {
    if (!charts.value[domain]) {
      charts.value[domain] = {};
    }

    // 初始化请求图表
    if (chartRefs.value[domain]?.requests && chartRefs.value[domain].requests.clientWidth > 0 && chartRefs.value[domain].requests.clientHeight > 0 && !charts.value[domain].requests) {
      charts.value[domain].requests = echarts.init(chartRefs.value[domain].requests!);
    }

    // 初始化带宽图表
    if (chartRefs.value[domain]?.bandwidth && chartRefs.value[domain].bandwidth.clientWidth > 0 && chartRefs.value[domain].bandwidth.clientHeight > 0 && !charts.value[domain].bandwidth) {
      charts.value[domain].bandwidth = echarts.init(chartRefs.value[domain].bandwidth!);
    }

    // 初始化访问者图表
    if (chartRefs.value[domain]?.visitors && chartRefs.value[domain].visitors.clientWidth > 0 && chartRefs.value[domain].visitors.clientHeight > 0 && !charts.value[domain].visitors) {
      charts.value[domain].visitors = echarts.init(chartRefs.value[domain].visitors!);
    }
  });
  updateZoneTrafficCharts();
};

// 更新 Web 流量图表
const updateZoneTrafficCharts = () => {
  // 为每个域名更新图表
  Object.entries(allZonesTrafficData.value).forEach(([domain, trafficData]) => {
    const timeSeries = trafficData.timeSeries;
    if (timeSeries.length === 0) return;

    const isHourly = timeSeries[0]?.isHourly ?? false;
    const dates = timeSeries.map((item) => formatDateLabel(item.date, isHourly));

    const areaChartOption = (
      data: number[],
      cachedData: number[] | null,
      color: string,
      formatter: (v: number) => string
    ) => ({
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          let result = params[0]?.name + '<br/>';
          params.forEach((item: any) => {
            result += `<span style="display:inline-block;margin-right:4px;border-radius:10px;width:10px;height:10px;background-color:${item.color};"></span>${item.seriesName}: ${formatter(item.value)}<br/>`;
          });
          return result;
        },
      },
      legend: cachedData
        ? { data: ['未缓存', '已缓存'], textStyle: { color: '#999' }, top: 0, right: 0 }
        : undefined,
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: cachedData ? '30px' : '10px',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: dates,
        axisLine: { lineStyle: { color: '#666' } },
        axisLabel: { color: '#999', fontSize: 10 },
      },
      yAxis: {
        type: 'value',
        axisLine: { lineStyle: { color: '#666' } },
        axisLabel: { color: '#999', formatter: (value: number) => formatter(value) },
        splitLine: { show: false },
      },
      series: cachedData
        ? [
            {
              name: '未缓存',
              type: 'line',
              stack: 'total',
              areaStyle: { color: color },
              lineStyle: { color: color, width: 1 },
              itemStyle: { color: color },
              data: data,
              smooth: true,
            },
            {
              name: '已缓存',
              type: 'line',
              stack: 'total',
              areaStyle: { color: '#67C23A' },
              lineStyle: { color: '#67C23A', width: 1 },
              itemStyle: { color: '#67C23A' },
              data: cachedData,
              smooth: true,
            },
          ]
        : [
            {
              type: 'line',
              areaStyle: { color: color },
              lineStyle: { color: color, width: 2 },
              itemStyle: { color: color },
              data: data,
              smooth: true,
            },
          ],
    });

    // 请求图表
    if (charts.value[domain]?.requests) {
      const uncachedRequests = timeSeries.map((item) => item.uncachedRequests);
      const cachedRequests = timeSeries.map((item) => item.cachedRequests);
      charts.value[domain].requests!.setOption(
        areaChartOption(uncachedRequests, cachedRequests, '#409EFF', formatNumber)
      );
    }

    // 带宽图表
    if (charts.value[domain]?.bandwidth) {
      const uncachedBytes = timeSeries.map((item) => item.uncachedBytes);
      const cachedBytes = timeSeries.map((item) => item.cachedBytes);
      charts.value[domain].bandwidth!.setOption(areaChartOption(uncachedBytes, cachedBytes, '#409EFF', formatBytes));
    }

    // 访问者图表
    if (charts.value[domain]?.visitors) {
      const visitors = timeSeries.map((item) => item.visitors);
      charts.value[domain].visitors!.setOption(areaChartOption(visitors, null, '#409EFF', formatNumber));
    }
  });
};

// 初始化折线图
const initLineChart = () => {
  if (!lineChartRef.value) return;
  lineChart = echarts.init(lineChartRef.value);
  updateLineChart();
};

// 格式化时间轴标签
const formatDateLabel = (dateStr: string, isHourly: boolean): string => {
  if (isHourly) {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:00`;
  }
  return dateStr;
};

// 更新折线图
const updateLineChart = () => {
  if (!lineChart) return;

  let dates: string[] = [];
  let requests: number[] = [];
  let bandwidth: number[] = [];
  let visits: number[] = [];
  let pageViews: number[] = [];
  let isHourly = false;

  // 根据选择的域名获取相应的时间序列数据
  if (selectedDomain.value === 'all') {
    // 对于所有域名，使用原始的timeSeriesData
    isHourly = timeSeriesData.value[0]?.isHourly ?? false;
    dates = timeSeriesData.value.map((item) => formatDateLabel(item.date, isHourly));
    requests = timeSeriesData.value.map((item) => item.requests);
    bandwidth = timeSeriesData.value.map((item) => item.bytes);
    visits = timeSeriesData.value.map((item) => item.visits);
    pageViews = timeSeriesData.value.map((item) => item.pageViews);
  } else {
    // 对于单个域名，使用该域名的timeSeries数据
    const trafficData = zoneTrafficData.value;
    if (trafficData.timeSeries && trafficData.timeSeries.length > 0) {
      isHourly = trafficData.timeSeries[0]?.isHourly ?? false;
      dates = trafficData.timeSeries.map((item) => formatDateLabel(item.date, isHourly));
      requests = trafficData.timeSeries.map((item) => item.requests);
      bandwidth = trafficData.timeSeries.map((item) => item.bytes);
      visits = trafficData.timeSeries.map((item) => item.visitors);
      pageViews = trafficData.timeSeries.map((item) => item.requests); // 假设pageViews等于requests
    }
  }

  lineChart.setOption({
    tooltip: {
      trigger: 'axis',
      formatter: (params: unknown) => {
        const arr = params as { seriesName: string; name: string; value: number; color: string }[];
        let result = arr[0]?.name + '<br/>';
        arr.forEach((item) => {
          const value =
            item.seriesName === '带宽' ? formatBytes(item.value) : formatNumber(item.value);
          result += `<span style="display:inline-block;margin-right:4px;border-radius:10px;width:10px;height:10px;background-color:${item.color};"></span>${item.seriesName}: ${value}<br/>`;
        });
        return result;
      },
    },
    legend: {
      data: ['请求数', '带宽', '访问量', '页面浏览量'],
      textStyle: { color: '#999' },
      top: 0,
    },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '40px', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisLine: { lineStyle: { color: '#666' } },
      axisLabel: { color: '#999' },
    },
    yAxis: [
      {
        type: 'value',
        name: '数量',
        axisLine: { lineStyle: { color: '#666' } },
        axisLabel: { color: '#999', formatter: (value: number) => formatNumber(value) },
        splitLine: { show: false },
      },
      {
        type: 'value',
        name: '带宽',
        axisLine: { lineStyle: { color: '#666' } },
        axisLabel: { color: '#999', formatter: (value: number) => formatBytes(value) },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: '请求数',
        type: 'line',
        smooth: true,
        lineStyle: { color: '#409EFF', width: 2 },
        itemStyle: { color: '#409EFF' },
        data: requests,
      },
      {
        name: '带宽',
        type: 'line',
        smooth: true,
        yAxisIndex: 1,
        lineStyle: { color: '#67C23A', width: 2 },
        itemStyle: { color: '#67C23A' },
        data: bandwidth,
      },
      {
        name: '访问量',
        type: 'line',
        smooth: true,
        lineStyle: { color: '#E6A23C', width: 2 },
        itemStyle: { color: '#E6A23C' },
        data: visits,
      },
      {
        name: '页面浏览量',
        type: 'line',
        smooth: true,
        lineStyle: { color: '#F56C6C', width: 2 },
        itemStyle: { color: '#F56C6C' },
        data: pageViews,
      },
    ],
  });
};

// 初始化柱状图
const initBarChart = () => {
  if (!barChartRef.value) return;
  barChart = echarts.init(barChartRef.value);
  updateBarChart();
};

// 更新柱状图
const updateBarChart = () => {
  if (!barChart) return;
  const countries = paginatedCountryData.value.map((item) => item.country);
  const requests = paginatedCountryData.value.map((item) => item.requests);
  const bytes = paginatedCountryData.value.map((item) => item.bytes);

  barChart.setOption({
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params: unknown) => {
        const arr = params as { name: string; value: number }[];
        const reqData = arr[0];
        const bwData = arr[1];
        return `${reqData.name}<br/>请求数: ${formatNumber(reqData.value)}<br/>带宽: ${formatBytes(bwData.value)}`;
      },
    },
    legend: { data: ['请求数', '带宽'], textStyle: { color: '#999' }, top: 0 },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '40px', containLabel: true },
    xAxis: {
      type: 'category',
      data: countries,
      axisLine: { lineStyle: { color: '#666' } },
      axisLabel: { color: '#999', rotate: 30, interval: 0 },
    },
    yAxis: [
      {
        type: 'value',
        name: '请求数',
        axisLine: { lineStyle: { color: '#666' } },
        axisLabel: { color: '#999', formatter: (value: number) => formatNumber(value) },
        splitLine: { show: false },
      },
      {
        type: 'value',
        name: '带宽',
        axisLine: { lineStyle: { color: '#666' } },
        axisLabel: { color: '#999', formatter: (value: number) => formatBytes(value) },
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: '请求数',
        type: 'bar',
        data: requests,
        itemStyle: { color: '#409EFF' },
      },
      {
        name: '带宽',
        type: 'bar',
        yAxisIndex: 1,
        data: bytes,
        itemStyle: { color: '#67C23A' },
      },
    ],
  });
};

// 获取所有域名
const fetchDomains = async () => {
  try {
    const response = await axios.get(`${config.api}/api/cloudflare/zones`);
    if (response.data.success && response.data.data) {
      domains.value = response.data.data.map((zone: any) => zone.name);
    }
  } catch (error) {
    console.error('获取域名列表失败:', error);
  }
};

// 获取所有数据
const fetchAllData = async () => {
  loading.value = true;
  detailedLoading.value = true;
  networkLoading.value = true;
  zoneTrafficLoading.value = true;
  workersLoading.value = true;
  error.value = false;
  countryPage.value = 1;

  try {
    // 并行请求基础数据
    const [analyticsRes, timeSeriesRes, countryRes, detailedRes, networkRes, zonesRes, workersRes, workersAnalyticsRes] =
      await Promise.all([
        axios.get(`${config.api}/api/cloudflare/analytics?days=${selectedDays.value}`),
        axios.get(`${config.api}/api/cloudflare/timeseries?days=${selectedDays.value}`),
        axios.get(`${config.api}/api/cloudflare/countries?days=${selectedDays.value}`),
        axios.get(`${config.api}/api/cloudflare/detailed-stats?days=${selectedDays.value}${selectedDomain.value !== 'all' ? `&zone=${selectedDomain.value}` : ''}`),
        axios.get(`${config.api}/api/cloudflare/network-stats?days=${selectedDays.value}${selectedDomain.value !== 'all' ? `&zone=${selectedDomain.value}` : ''}`),
        axios.get(`${config.api}/api/cloudflare/zones`),
        axios.get(`${config.api}/api/cloudflare/workers`),
        axios.get(`${config.api}/api/cloudflare/workers-analytics?days=${selectedDays.value}`),
      ]);

    // 处理域名数据
    if (zonesRes.data.success && zonesRes.data.data) {
      domains.value = zonesRes.data.data.map((zone: any) => zone.name);
    }

    // 处理Worker数据
    if (workersRes.data.success && workersRes.data.data) {
      workers.value = workersRes.data.data;
    }

    if (workersAnalyticsRes.data.success && workersAnalyticsRes.data.data) {
      workersAnalytics.value = workersAnalyticsRes.data.data.workers || [];
    }

    // 处理基础数据
    if (analyticsRes.data.success && analyticsRes.data.data && !analyticsRes.data.data.error) {
      analyticsData.value = analyticsRes.data.data;
    } else {
      error.value = true;
    }

    if (timeSeriesRes.data.success) {
      timeSeriesData.value = timeSeriesRes.data.data || [];
    }

    if (countryRes.data.success) {
      countryData.value = countryRes.data.data || [];
    }

    if (detailedRes.data.success && detailedRes.data.data && !detailedRes.data.data.error) {
      detailedStatsData.value = detailedRes.data.data;
    }

    if (networkRes.data.success && networkRes.data.data) {
      networkStatsData.value = networkRes.data.data;
    }

    // 处理域名流量数据
    // 总是获取所有域名的流量数据
    const allZonesTrafficRes = await axios.get(
      `${config.api}/api/cloudflare/all-zones-traffic?days=${selectedDays.value}`
    );

    if (allZonesTrafficRes.data.success && allZonesTrafficRes.data.data) {
      allZonesTrafficData.value = {};
      let totalRequests = 0;
      let totalBandwidth = 0;
      let totalVisits = 0;
      let totalPageViews = 0;

      allZonesTrafficRes.data.data.forEach((item: any) => {
        if (item.data && !item.data.error) {
          allZonesTrafficData.value[item.zone] = item.data;
          // 累加所有域名的流量数据
          totalRequests += item.data.requests.total;
          totalBandwidth += item.data.bandwidth.total;
          totalVisits += item.data.visitors.total;
          // 假设pageViews等于requests（实际应该从API获取）
          totalPageViews += item.data.requests.total;
        }
      });

      // 更新analyticsData为所有域名的总和
      analyticsData.value = {
        requests: {
          value: totalRequests,
          change: 0 // 暂时设为0，实际应该计算变化率
        },
        bandwidth: {
          value: totalBandwidth,
          change: 0
        },
        visits: {
          value: totalVisits,
          change: 0
        },
        pageViews: {
          value: totalPageViews,
          change: 0
        },
        period: {
          start: '',
          end: '',
          days: selectedDays.value
        }
      };
    }

    // 如果选择了单个域名，也更新zoneTrafficData以便其他地方使用
    if (selectedDomain.value !== 'all' && allZonesTrafficData.value[selectedDomain.value]) {
      zoneTrafficData.value = allZonesTrafficData.value[selectedDomain.value];
    }

    await nextTick();
    updateLineChart();
    updateBarChart();
    initZoneTrafficCharts(); // 重新初始化图表以确保所有域名的图表都被创建
  } catch (err) {
    console.error('获取数据失败:', err);
    error.value = true;
  } finally {
    loading.value = false;
    detailedLoading.value = false;
    networkLoading.value = false;
    zoneTrafficLoading.value = false;
    workersLoading.value = false;
  }
};

// 监听分页变化
watch(countryPage, () => {
  updateBarChart();
});

// 窗口大小变化时重新调整图表
const handleResize = () => {
  lineChart?.resize();
  barChart?.resize();

  // 为每个域名的图表调整大小
  Object.values(charts.value).forEach(domainCharts => {
    Object.values(domainCharts).forEach(chart => {
      chart?.resize();
    });
  });
};

onMounted(() => {
  fetchDomains();
  fetchAllData();
  nextTick(() => {
    initLineChart();
    initBarChart();
    initZoneTrafficCharts();
  });
  window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
  lineChart?.dispose();
  barChart?.dispose();

  // 为每个域名的图表销毁
  Object.values(charts.value).forEach(domainCharts => {
    Object.values(domainCharts).forEach(chart => {
      chart?.dispose();
    });
  });

  window.removeEventListener('resize', handleResize);
});
</script>

<style scoped>
.traffic-analytics {
  padding: 24px;
  padding-top: 12px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.header-controls {
  display: flex;
  gap: 16px;
  align-items: center;
}

.domain-selector {
  margin-left: 16px;
}

.title {
  font-size: 20px;
  color: var(--text-color);
  display: flex;
  align-items: center;
  gap: 8px;
}

.title .icon {
  color: var(--text-color);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .stats-grid {
    grid-template-columns: 1fr;
  }
}

.stat-card {
  background: var(--card-bg);
  border: var(--card-border);
  border-radius: var(--card-radius);
  padding: 20px;
}

.stat-label {
  font-size: 14px;
  color: var(--text-color-light);
  margin-bottom: 6px;
}

.stat-value-row {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 28px;
  color: var(--text-color);
}

.stat-value.loading-text {
  font-size: 18px;
  color: var(--text-color-light);
}

.stat-change {
  font-size: 14px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
}

.stat-change.positive {
  color: var(--green);
}

.stat-change.negative {
  color: var(--red);
}

.change-icon {
  font-size: 12px;
}

.stat-desc {
  font-size: 12px;
  color: var(--text-color-light);
}

/* 图表区域样式 */
.charts-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-top: 16px;
}

@media (max-width: 1000px) {
  .charts-grid {
    grid-template-columns: 1fr;
  }
}

.chart-card {
  background: var(--card-bg);
  border: var(--card-border);
  border-radius: var(--card-radius);
  padding: 20px;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.chart-title {
  font-size: 16px;
  color: var(--text-color);
  margin-bottom: 16px;
}

.chart-header .chart-title {
  margin-bottom: 0;
}

.chart-container {
  width: 100%;
  height: 300px;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-info {
  font-size: 14px;
  color: var(--text-color-light);
  min-width: 60px;
  text-align: center;
}

/* 详细统计区域样式 */
.detailed-stats-section {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stats-category {
  background: var(--card-bg);
  border: var(--card-border);
  border-radius: var(--card-radius);
  padding: 20px;
}

.category-title {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-color);
  margin-bottom: 16px;
}

.category-stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

@media (max-width: 1200px) {
  .category-stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 600px) {
  .category-stats-grid {
    grid-template-columns: 1fr;
  }
}

.mini-stat-card {
  padding: 12px;
  background: var(--bg-color);
  border-radius: 8px;
}

.mini-stat-label {
  font-size: 12px;
  color: var(--text-color-light);
  margin-bottom: 6px;
}

.mini-stat-value-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.mini-stat-value {
  font-size: 20px;
  font-weight: 500;
  color: var(--text-color);
}

.mini-stat-value.loading-text {
  font-size: 16px;
  color: var(--text-color-light);
}

.mini-stat-change {
  font-size: 12px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 2px;
}

.mini-stat-change.positive {
  color: var(--green);
}

.mini-stat-change.negative {
  color: var(--red);
}

/* 网络统计表格样式 */
.network-tables-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

@media (max-width: 900px) {
  .network-tables-grid {
    grid-template-columns: 1fr;
  }
}

.network-table-card {
  background: var(--bg-color);
  border-radius: 8px;
  padding: 16px;
  border: 1px solid var(--border-color, #e5e7eb);
}

.network-table-card.full-width {
  grid-column: 1 / -1;
}

.network-table-title {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color);
  margin-bottom: 12px;
}

.network-table-content {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.network-table-row {
  display: grid;
  grid-template-columns: 1fr auto 100px;
  align-items: center;
  gap: 12px;
}

.network-item-name {
  font-size: 13px;
  color: var(--text-color);
}

.network-item-value {
  font-size: 13px;
  color: var(--text-color-light);
  text-align: right;
}

.network-item-bar {
  height: 8px;
  background: var(--card-bg);
  border-radius: 4px;
  overflow: hidden;
}

.network-item-bar-fill {
  height: 100%;
  background: #409eff;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.network-table-empty {
  font-size: 13px;
  color: var(--text-color-light);
  text-align: center;
  padding: 16px 0;
}

/* Web 流量卡片样式 */
.web-traffic-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

@media (max-width: 1200px) {
  .web-traffic-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 800px) {
  .web-traffic-grid {
    grid-template-columns: 1fr;
  }
}

.web-traffic-card {
  background: var(--bg-color);
  border-radius: 8px;
  padding: 16px;
  border: 1px solid var(--border-color, #e5e7eb);
}

.web-traffic-header {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color, #e5e7eb);
}

.web-traffic-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.web-traffic-stat {
  text-align: left;
}

.web-traffic-stat-label {
  font-size: 12px;
  color: var(--text-color-light);
  margin-bottom: 2px;
}

.web-traffic-stat-sublabel {
  font-size: 10px;
  color: var(--text-color-light);
  opacity: 0.7;
  margin-bottom: 4px;
}

.web-traffic-stat-value {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-color);
}

.web-traffic-chart {
  width: 100%;
  height: 200px;
}

/* 域名流量分析样式 */
.domains-traffic-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.domain-traffic-card {
  background: var(--bg-color);
  border-radius: 8px;
  padding: 16px;
  border: 1px solid var(--border-color, #e5e7eb);
}

.domain-traffic-header {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color, #e5e7eb);
}

.domain-traffic-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.domain-traffic-stat {
  text-align: left;
}

.domain-traffic-stat-label {
  font-size: 12px;
  color: var(--text-color-light);
  margin-bottom: 4px;
}

.domain-traffic-stat-value {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-color);
}

/* Workers 流量统计样式 */
.workers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
}

.worker-card {
  background: var(--bg-color);
  border-radius: 8px;
  padding: 16px;
  border: 1px solid var(--border-color, #e5e7eb);
}

.worker-header {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color, #e5e7eb);
}

.worker-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.worker-stat {
  text-align: left;
}

.worker-stat-label {
  font-size: 12px;
  color: var(--text-color-light);
  margin-bottom: 4px;
}

.worker-stat-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color);
}

.worker-loading,
.worker-empty {
  grid-column: 1 / -1;
  text-align: center;
  padding: 40px 0;
  color: var(--text-color-light);
  font-size: 14px;
}
</style>
