// ==UserScript==
// @name         BiliAutoClicker - 油猴客户端
// @namespace    https://github.com/under-the-ocean
// @version      0.6.0
// @description  远程读取任务、任务配置管理、领取接口监控、定时连点、批量上报（模板分离版）
// @author       under-the-ocean
// @match        https://www.bilibili.com/blackboard/era/award-exchange.html?*
// @connect      150.242.246.137
// @grant        GM_xmlhttpRequest
// @grant        GM_notification
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @grant        GM_getResourceText
// @resource     TEMPLATE_HTML https://gh-proxy.com/https://raw.githubusercontent.com/under-the-ocean/Bili_monkey/main/template.html
// @run-at       document-start
// @downloadURL  https://gh-proxy.com/https://raw.githubusercontent.com/under-the-ocean/Bili_monkey/main/biliauto-tampermonkey-client.user.js
// @updateURL    https://gh-proxy.com/https://raw.githubusercontent.com/under-the-ocean/Bili_monkey/main/biliauto-tampermonkey-client.user.js
// ==/UserScript==
// ==/UserScript==

(function () {
  'use strict';

  const CONFIG = {
    API_BASE: GM_getValue('api_base', 'http://150.242.246.137:18080'),

    API_KEY: GM_getValue('api_key', ''),
    QQ_ID: GM_getValue('qq_id', ''),

    DEVICE_ID: GM_getValue('qq_id') || GM_getValue('device_id', 'tm-' + crypto.randomUUID()),
    DEVICE_NAME: GM_getValue('device_name', navigator.platform || 'Unknown'),

    DEFAULT_CLICK_INTERVAL_MS: 50,
    DEFAULT_CLICK_DURATION_MS: 10000,
    DEFAULT_START_TIME: '00:29:57',
    MAX_RELOAD_ATTEMPTS: 3,

    VERSION: '0.5.0',
    RETRY_COUNT: 2,
    DEBUG: true
  };

  if (!GM_getValue('device_id') && !CONFIG.QQ_ID) {
    GM_setValue('device_id', CONFIG.DEVICE_ID);
  }
  if (!GM_getValue('device_name')) {
    GM_setValue('device_name', CONFIG.DEVICE_NAME);
  }

  // ========================
  // 工具函数
  // ========================
  const Util = {
    log(...args) {
      if (CONFIG.DEBUG) console.log('[BiliAuto]', ...args);
    },

    info(...args) {
      console.info('[BiliAuto]', ...args);
    },

    warn(...args) {
      console.warn('[BiliAuto]', ...args);
    },

    error(...args) {
      console.error('[BiliAuto]', ...args);
    },

    sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    },

    getByXPath(xpath, context = document) {
      try {
        return document.evaluate(
          xpath,
          context,
          null,
          XPathResult.FIRST_ORDERED_NODE_TYPE,
          null
        ).singleNodeValue;
      } catch (e) {
        Util.log('XPath 错误:', xpath, e);
        return null;
      }
    },

    text(el) {
      return el ? (el.innerText || el.textContent || '').trim() : '';
    },

    parseTime(timeStr) {
      const value = String(timeStr || CONFIG.DEFAULT_START_TIME).trim();
      if (!value) return Util.parseTime(CONFIG.DEFAULT_START_TIME);
      if (value.startsWith('+')) {
        const seconds = Number(value.slice(1));
        if (Number.isFinite(seconds)) return new Date(Date.now() + seconds * 1000);
      }
      if (/^\d+(\.\d+)?$/.test(value)) {
        return new Date(Date.now() + Number(value) * 1000);
      }
      const parts = value.split(':').map(Number);
      const now = new Date();
      const target = new Date(now);
      target.setHours(parts[0] || 0, parts[1] || 0, parts[2] || 0, 0);
      if (target < now) target.setDate(target.getDate() + 1);
      return target;
    },

    formatTime(date = new Date()) {
      const pad = n => String(n).padStart(2, '0');
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    },

    extractTaskIdFromPage() {
      const urlTaskId = new URLSearchParams(location.search).get('task_id');
      if (urlTaskId) return urlTaskId;
      const html = document.documentElement.innerHTML;
      const patterns = [
        /task_id["']?\s*[:=]\s*["']([^"']+)["']/i,
        /taskId["']?\s*[:=]\s*["']([^"']+)["']/i,
        /taskId=([^&"' ]+)/i,
        /task_id=([^&"' ]+)/i
      ];
      for (const pat of patterns) {
        const m = html.match(pat);
        if (m && m[1]) return m[1];
      }
      return '';
    },

    findTaskById(tasks, taskId) {
      if (!taskId) return null;
      return Util.normalizeTasks(tasks).find(task => String(task.task_value) === String(taskId)) || null;
    },

    getTaskName(task) {
      if (!task) return '';
      return task.task_key || task.name || task.label || task.title || task.id || task.task_value || '';
    },

    notify(title, text) {
      try {
        GM_notification({ title, text, timeout: 5000 });
      } catch {
        Util.log(`[通知] ${title}: ${text}`);
      }
    },

    buildRewardUrl(baseUrl, taskId) {
      if (!baseUrl || !taskId) return '';
      try {
        const url = new URL(baseUrl, location.href);
        url.searchParams.set('task_id', taskId);
        return url.toString();
      } catch {
        const joiner = baseUrl.includes('?') ? '&' : '?';
        return `${baseUrl}${joiner}task_id=${encodeURIComponent(taskId)}`;
      }
    },

    normalizeTasks(tasks) {
      if (!tasks) return [];
      if (Array.isArray(tasks)) return tasks.map((task, index) => {
        const taskId = task.task_value || task.value || task.task_id || task.id || '';
        const taskKey = task.task_key || task.name || task.label || String(index + 1);
        return { ...task, id: task.id || taskKey, task_key: taskKey, task_value: taskId };
      }).filter(task => task.task_value);
      if (typeof tasks === 'object') {
        return Object.keys(tasks).map(key => ({
          id: key,
          task_key: key,
          task_value: tasks[key]
        })).filter(task => task.task_value);
      }
      return [];
    },

    defaultTaskConfig(taskId) {
      return {
        task_id: taskId,
        start_time: CONFIG.DEFAULT_START_TIME,
        interval: CONFIG.DEFAULT_CLICK_INTERVAL_MS / 1000,
        duration: CONFIG.DEFAULT_CLICK_DURATION_MS / 1000,
        selected: false
      };
    },

    loadTaskConfigs(tasks) {
      const saved = GM_getValue('task_configs', {});
      const configs = {};
      for (const task of Util.normalizeTasks(tasks)) {
        const taskId = task.task_value;
        configs[taskId] = { ...Util.defaultTaskConfig(taskId), ...(saved[taskId] || {}) };
      }
      return configs;
    },

    isRewardPage() {
      return /bilibili\.com\/blackboard/.test(window.location.href);
    },

    isLivePage() {
      return /live\.bilibili\.com/.test(window.location.href);
    },

    extractPageInfoFromDOM() {
      const sectionTitleEl = document.querySelector('.section-title');
      const awardInfoEl = document.querySelector('.award-info');
      const section_title = sectionTitleEl ? (sectionTitleEl.innerText || sectionTitleEl.textContent || '').trim() : '';
      const award_info = awardInfoEl ? (awardInfoEl.innerText || awardInfoEl.textContent || '').trim() : '';
      if (section_title || award_info) {
        Util.log(`DOM 页面信息提取: section_title="${section_title}" award_info="${award_info}"`);
        return { section_title, award_info };
      }
      return null;
    }
  };

  // ========================
  // HTTP 请求封装 - 对标 Python server.py
  // ========================
  const API = {
    request(method, path, data = null, extraHeaders = {}) {
      Util.log(`>>> ${method} ${path}${data ? ` data=${JSON.stringify(data).slice(0, 200)}` : ''}`);
      const headers = {
        'Content-Type': 'application/json',
        'X-Device-ID': CONFIG.DEVICE_ID,
        'X-Device-Name': encodeURIComponent(CONFIG.DEVICE_NAME),
        ...extraHeaders
      };
      if (CONFIG.API_KEY) {
        headers['Authorization'] = 'Bearer ' + CONFIG.API_KEY;
      }
      return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method,
          url: CONFIG.API_BASE.replace(/\/$/, '') + path,
          headers,
          data: data ? JSON.stringify(data) : undefined,
          timeout: 20000,
          onload: (res) => {
            const body = res.responseText || '';
            Util.log(`<<< ${method} ${path} -> ${res.status} ${body.slice(0, 150)}`);
            if (res.status < 200 || res.status >= 300) {
              reject(new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`));
              return;
            }
            try {
              resolve(JSON.parse(body));
            } catch {
              reject(new Error('响应非 JSON: ' + body.slice(0, 200)));
            }
          },
          onerror: (err) => reject(new Error('请求失败: ' + (err.statusText || '网络错误'))),
          ontimeout: () => reject(new Error('请求超时: ' + path))
        });
      });
    },

    unwrapConfig(resp) {
      if (resp && resp.status === 'success') return resp.data || resp.content || {};
      return resp && (resp.data || resp.content) || {};
    },

    getBaseConfig() {
      return this.request('GET', '/api/config/base');
    },

    getTasks() {
      return this.request('GET', '/api/config/tasks');
    },

    /** 上传页面信息，维护服务端任务列表 */
    uploadPageInfo(payload) {
      return this.request('POST', '/api/stats/page-info', payload);
    },

    /** 批量上报结果 - 对标 Python batch_upload_results */
    uploadRewards(payload) {
      return this.request('POST', '/api/stats/rewards', payload);
    },

    /** 带重试的上传 + 本地备份 - 对标 Python RETRY_COUNT=2 + save_local_backup */
    async uploadWithRetry(payload) {
      let lastError = '';
      for (let retry = 0; retry <= CONFIG.RETRY_COUNT; retry++) {
        try {
          const resp = await this.uploadRewards(payload);
          Util.log(`上传结果成功 (第${retry + 1}次):`, resp);
          return resp;
        } catch (e) {
          lastError = e.message || String(e);
          Util.log(`上传结果失败 (第${retry + 1}次):`, lastError);
          if (retry < CONFIG.RETRY_COUNT) {
            await Util.sleep(1000 * (retry + 1));
          }
        }
      }
      Util.log(`上传结果最终失败: ${lastError}`);
      this.saveLocalBackup(payload);
      return { status: 'error', message: lastError };
    },

    /** 对标 Python server.py save_local_backup */
    saveLocalBackup(data) {
      try {
        const backups = GM_getValue('upload_backups', []);
        backups.push({
          data,
          timestamp: Util.formatTime(),
          device_name: CONFIG.DEVICE_NAME
        });
        while (backups.length > 10) backups.shift();
        GM_setValue('upload_backups', backups);
        Util.log('上传失败数据已备份到本地存储');
      } catch (e) {
        Util.log('本地备份失败:', e);
      }
    },

    /** 对标 Python server.py check_update */
    async checkUpdate() {
      try {
        const resp = await this.request('GET', '/api/versions/latest');
        const content = this.unwrapConfig(resp);
        if (content && content.version) {
          Util.log(`版本检查: 当前=${CONFIG.VERSION} 最新=${content.version} ${content.version !== CONFIG.VERSION ? '↑ 有新版本' : '✓ 已是最新'}`);
          if (content.version !== CONFIG.VERSION) {
            Util.notify('版本更新', `最新版本: ${content.version}，当前: ${CONFIG.VERSION}`);
            return content;
          }
        } else {
          Util.log('版本检查: 服务端无版本信息');
        }
      } catch (e) {
        Util.log('检查更新失败:', e);
      }
      return null;
    },

    /** 对标 Python server.py get_announcements */
    async getAnnouncements() {
      try {
        const resp = await this.request('GET', '/api/versions/announcements');
        const content = this.unwrapConfig(resp);
        if (Array.isArray(content) && content.length > 0) {
          Util.log(`获取公告: ${content.length} 条`);
          return content;
        }
        Util.log('获取公告: 无公告');
      } catch (e) {
        Util.log('获取公告失败:', e);
      }
      return [];
    }
  };

  function isLoggedIn() {
    return !!CONFIG.API_KEY && !!CONFIG.QQ_ID;
  }

  // ========================
  // 叠加管理界面 - Material Design 重构
  // ========================
  const Panel = {
    state: {
      baseConfig: null,
      tasks: [],
      taskConfigs: {},
      expanded: GM_getValue('material_panel_visible', false),
      filter: '',
      running: false,
      darkMode: GM_getValue('material_dark_mode', null),
      panelX: GM_getValue('material_panel_x', null),
      panelY: GM_getValue('material_panel_y', null),
      loginCode: '',
      loginStatus: isLoggedIn() ? 'logged_in' : ''
    },

    init() {
      if (document.getElementById('biliauto-panel') && document.getElementById('biliauto-fab')) return;

      if (!document.getElementById('biliauto-fab')) {
        const fab = document.createElement('div');
        fab.id = 'biliauto-fab';
        fab.innerHTML = `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>`;
        document.documentElement.appendChild(fab);
        fab.addEventListener('click', () => this.toggle());
      }

      if (!document.getElementById('biliauto-panel')) {
        const root = document.createElement('div');
        root.id = 'biliauto-panel';
        root.innerHTML = this.template();
        document.documentElement.appendChild(root);
      }

      this.applyDarkModeOptions();
      this.applyTheme();
      this.setupPanelPosition();
      this.setupDrag();
      this.bind();
      this.render();
    },

    applyDarkModeOptions() {
      if (this.state.darkMode === null) {
        this.state.darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
        GM_setValue('material_dark_mode', this.state.darkMode);
      }
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
        if (GM_getValue('material_dark_mode_manual', false)) return;
        this.state.darkMode = e.matches;
        GM_setValue('material_dark_mode', this.state.darkMode);
        this.applyTheme();
      });
    },

    applyTheme() {
      const root = document.getElementById('biliauto-panel');
      if (root) root.classList.toggle('tm-material-dark', this.state.darkMode);
      const fab = document.getElementById('biliauto-fab');
      if (fab) fab.classList.toggle('tm-material-dark', this.state.darkMode);
    },

    setupPanelPosition() {
      const root = document.getElementById('biliauto-panel');
      if (!root) return;
      if (this.state.panelX !== null && this.state.panelY !== null) {
        root.style.left = this.state.panelX + 'px';
        root.style.top = this.state.panelY + 'px';
        root.style.right = 'auto';
        root.style.bottom = 'auto';
      }
    },

    setupDrag() {
      const root = document.getElementById('biliauto-panel');
      const handle = root.querySelector('.tm-material-header');
      if (!handle || handle.dataset.dragInitialized) return;
      handle.dataset.dragInitialized = '1';
      let isDragging = false, startX, startY, origX, origY;
      handle.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        if (e.target.closest('[data-ba]')) return;
        isDragging = true;
        const rect = root.getBoundingClientRect();
        startX = e.clientX;
        startY = e.clientY;
        origX = rect.left;
        origY = rect.top;
        root.style.left = origX + 'px';
        root.style.top = origY + 'px';
        root.style.right = 'auto';
        root.style.bottom = 'auto';
        root.style.transition = 'none';
        e.preventDefault();
      });
      document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        root.style.left = (origX + e.clientX - startX) + 'px';
        root.style.top = (origY + e.clientY - startY) + 'px';
      });
      document.addEventListener('mouseup', () => {
        if (!isDragging) return;
        isDragging = false;
        root.style.transition = '';
        const rect = root.getBoundingClientRect();
        GM_setValue('material_panel_x', Math.round(rect.left));
        GM_setValue('material_panel_y', Math.round(rect.top));
      });
    },


    template() {
      const tpl = GM_getResourceText('TEMPLATE_HTML');
      if (!tpl) {
        return `<div style="padding:20px;color:red;">模板加载失败，请检查网络或刷新重试</div>`;
      }
      // 替换模板变量
      return tpl
        .replace(/\$\{VERSION\}/g, CONFIG.VERSION)
        .replace(/\$\{DEVICE_ID_SHORT\}/g, CONFIG.DEVICE_ID.slice(0, 8))
        .replace(/\$\{CONFIG\.QQ_ID\}/g, CONFIG.QQ_ID || '')
        .replace(/\$\{this\.escape\(([^)]+)\)\}/g, (match, expr) => {
          try {
            const val = eval(expr);
            return this.escape(String(val ?? ''));
          } catch(e) {
            return '';
          }
        })
        .replace(/\$\{this\.escapeAttr\(([^)]+)\)\}/g, (match, expr) => {
          try {
            const val = eval(expr);
            return this.escapeAttr(String(val ?? ''));
          } catch(e) {
            return '';
          }
        })
        .replace(/\$\{this\.state\.([^}]+)\}/g, (match, key) => {
          try {
            const val = key.split('.').reduce((o, k) => o?.[k], this.state);
            return String(val ?? '');
          } catch(e) {
            return '';
          }
        })
        .replace(/\$\{this\.([^}]+)\}/g, (match, key) => {
          try {
            const val = key.split('.').reduce((o, k) => o?.[k], this);
            return String(val ?? '');
          } catch(e) {
            return '';
          }
        })
        .replace(/\$\{i \+ 1\}/g, '')
        .replace(/\$\{cfg\.([^}]+)\}/g, '')
        .replace(/\$\{currentTask\}/g, '')
        .replace(/\$\{current\.([^}]+)\}/g, '');
    }
      }).join('');
    },

    escape(text) {
      return String(text).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
    },

    escapeAttr(text) {
      return this.escape(text).replace(/'/g, '&#39;');
    }
  };

  // ========================
  // 领取接口监控 + 任务信息捕获
  // ========================
  const RewardMonitor = {
    RECEIVE_API_PATH: '/x/activity_components/mission/receive',
    INFO_API_PATH: '/x/activity_components/mission/info',
    cache: {},
    missionInfo: {},
    installed: false,

    install() {
      if (this.installed) return;
      this.installed = true;
      Util.info('RewardMonitor 已安装 — 监控 receive/info API');
      const originalFetch = window.fetch;
      if (originalFetch) {
        Util.log(`fetch API 可用，正在覆盖 window.fetch`);
        window.fetch = async (...args) => {
          const response = await originalFetch.apply(window, args);
          this.captureFetch(args[0], response);
          return response;
        };
      } else {
        Util.warn('window.fetch 不可用（可能太早），跳过 fetch hook');
      }
      const originalOpen = XMLHttpRequest.prototype.open;
      const originalSend = XMLHttpRequest.prototype.send;
      XMLHttpRequest.prototype.open = function (method, url, ...rest) {
        this.__biliautoUrl = url;
        return originalOpen.call(this, method, url, ...rest);
      };
      XMLHttpRequest.prototype.send = function (...args) {
        this.addEventListener('load', () => RewardMonitor.captureXhr(this));
        return originalSend.apply(this, args);
      };
      Util.log('XHR prototype 已覆盖');

      this._setupPerformanceObserver();
    },

    _setupPerformanceObserver() {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const url = entry.name;
            if (url.includes('/x/activity_components/mission/info')) {
              Util.info(`PerformanceObserver 检测到 info 请求: ${url} duration=${entry.duration}ms`);
              if (this._pendingWait) {
                this._pendingWait.forEach(fn => fn());
                this._pendingWait = [];
              }
            }
          }
        });
        observer.observe({ entryTypes: ['resource'] });
        Util.log('PerformanceObserver 已启动，监控 resource 请求');
      } catch (e) {
        Util.log('PerformanceObserver 不可用:', e.message);
      }
    },

    onMissionInfo(callback) {
      this._missionInfoCallback = callback;
    },

    currentTaskId() {
      return Util.extractTaskIdFromPage() || 'unknown_task';
    },

    captureFetch(input, response) {
      const url = typeof input === 'string' ? input : input && input.url;
      if (!url) {
        Util.log(`fetch 捕获: 无法获取 URL (input=${typeof input})`);
        return;
      }
      if (url.includes(this.RECEIVE_API_PATH)) {
        Util.log(`捕获 fetch receive API: ${url} status=${response.status}`);
        response.clone().text().then(text => Util.log(`  receive 响应内容(${text.length}字符): ${text.slice(0, 300)}`)).catch(() => {});
        response.json().then(json => this.save(this.currentTaskId(), json, url, response.status)).catch(() => {});
      } else if (url.includes(this.INFO_API_PATH)) {
        Util.log(`捕获 fetch info API: ${url} status=${response.status}`);
        response.clone().text().then(text => {
          Util.log(`  info 响应内容(${text.length}字符): ${text.slice(0, 500)}`);
          try {
            const parsed = JSON.parse(text);
            this.saveMissionInfo(parsed, url);
          } catch (e) {
            Util.warn(`  info 响应解析失败: ${e.message}`);
          }
        }).catch(e => Util.warn(`  info 响应读取失败: ${e.message}`));
      } else if (url.includes('/x/activity_components/mission/')) {
        Util.log(`fetch 捕获其他 mission API: ${url} status=${response.status}`);
      }
    },

    captureXhr(xhr) {
      const url = xhr.__biliautoUrl || '';
      if (url.includes(this.RECEIVE_API_PATH)) {
        Util.log(`捕获 XHR receive API: ${url} status=${xhr.status}`);
        try {
          this.save(this.currentTaskId(), JSON.parse(xhr.responseText || '{}'), url, xhr.status);
        } catch {}
      } else if (url.includes(this.INFO_API_PATH)) {
        Util.log(`捕获 XHR info API: ${url} status=${xhr.status}`);
        try {
          const raw = xhr.responseText || '';
          Util.log(`  info 响应内容(${raw.length}字符): ${raw.slice(0, 500)}`);
          const json = JSON.parse(raw);
          this.saveMissionInfo(json, url);
        } catch (e) {
          Util.warn(`  XHR info 解析失败: ${e.message}`);
        }
      } else if (url.includes('/x/activity_components/mission/')) {
        Util.log(`XHR 捕获其他 mission API: ${url} status=${xhr.status}`);
      }
    },

    saveMissionInfo(json, url) {
      Util.log(`saveMissionInfo 被调用: url=${url} code=${json && json.code} hasData=${!!(json && json.data)}`);
      if (!json || json.code !== 0 || !json.data) {
        if (json && json.code !== 0) {
          Util.info(`info API 返回非0: code=${json.code} message=${json.message}`);
        } else if (!json) {
          Util.warn('info API 返回空响应');
        } else if (!json.data) {
          Util.warn(`info API 返回无 data 字段: code=${json.code} message=${json.message}`);
        }
        return;
      }
      const data = json.data;
      const taskId = data.task_id || '';
      const taskName = data.task_name || '';
      const actName = data.act_name || '';
      const awardName = data.reward_info && data.reward_info.award_name || '';
      Util.log(`  info 数据解析: task_id="${taskId}" task_name="${taskName}" act_name="${actName}" award_name="${awardName}"`);
      if (taskId && taskName) {
        this.missionInfo[taskId] = {
          task_id: taskId,
          task_name: taskName,
          act_name: actName,
          award_name: awardName
        };
        Util.info(`任务信息已捕获: [${taskId}] ${actName ? actName + ' - ' : ''}${taskName}${awardName ? ' [' + awardName + ']' : ''}`);
        if (this._missionInfoCallback) {
          this._missionInfoCallback(taskId, taskName, actName);
        }
      } else {
        Util.warn(`  info 数据不完整, 跳过: task_id="${taskId}" task_name="${taskName}"`);
      }
    },

    getMissionName(taskId) {
      const info = this.missionInfo[taskId];
      if (!info) return '';
      return info.act_name ? `${info.act_name} - ${info.task_name}` : info.task_name;
    },

    /** 等待 hook 捕获到 mission/info 后返回任务名，超时返回空字符串 */
    waitForTaskName(taskId, timeoutMs) {
      const existing = this.getMissionName(taskId);
      if (existing) return Promise.resolve(existing);
      return new Promise(resolve => {
        const done = () => {
          clearTimeout(timer);
          this._missionInfoCallback = null;
          resolve(this.getMissionName(taskId));
        };
        const timer = setTimeout(() => {
          this._pendingWait = (this._pendingWait || []).filter(p => p !== done);
          this._missionInfoCallback = null;
          resolve('');
        }, timeoutMs);
        this._pendingWait = this._pendingWait || [];
        this._pendingWait.push(done);
        this._missionInfoCallback = (tid) => {
          if (tid === taskId) done();
        };
      });
    },

    getMissionPageInfo(taskId) {
      const info = this.missionInfo[taskId];
      if (!info) return null;
      return {
        section_title: info.act_name || info.task_name || '',
        award_info: info.award_name || info.task_name || ''
      };
    },

    save(taskId, respJson, url, statusCode) {
      const task = Util.findTaskById(Panel.state.tasks, taskId);
      const taskName = this.getMissionName(taskId) || Util.getTaskName(task);
      this.cache[taskId] = {
        task_id: taskId,
        task_name: taskName,
        status: respJson && respJson.code === 0 ? '成功' : '失败',
        response_code: respJson ? respJson.code : undefined,
        message: respJson && (respJson.message || respJson.msg) || '',
        timestamp: Util.formatTime(),
        device_name: CONFIG.DEVICE_NAME,
        url,
        status_code: statusCode
      };
      Util.log('捕获领取接口响应:', this.cache[taskId]);
    },

    makeUploadResult(taskId) {
      const captured = this.cache[taskId];
      if (!captured) return null;
      return {
        task_id: taskId,
        task_name: captured.task_name || '',
        status: captured.status,
        response_code: captured.response_code,
        message: captured.message,
        timestamp: captured.timestamp,
        device_name: captured.device_name
      };
    },

    get(taskId) {
      return this.cache[taskId];
    }
  };

  // ========================
  // 执行模块
  // ========================
  const Executor = {
    activateButton(btn) {
      if (!btn) return;
      btn.removeAttribute('disabled');
      btn.classList.remove('disabled', 'disable');
      btn.classList.add('active');
      btn.style.pointerEvents = 'auto';
      btn.style.opacity = '1';
      btn.textContent = '关注ocean之下';
      Util.log('按钮已激活:', btn);
    },

    async clickRewardButton(selector, maxAttempts) {
      let lastError = '';
      for (let i = 1; i <= maxAttempts; i++) {
        Util.log(`第 ${i}/${maxAttempts} 次查找领取按钮: ${selector}`);
        const btn = Util.getByXPath(selector);
        if (btn) {
          Util.log('找到领取按钮:', btn);
          try {
            this.activateButton(btn);
            btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
            await Util.sleep(300);
            btn.click();
            return { ok: true, response_code: 200, message: '已点击领取按钮' };
          } catch (e) {
            lastError = e.message || String(e);
            return { ok: false, response_code: 500, message: '点击按钮失败: ' + lastError };
          }
        }
        lastError = '未找到领取按钮';
        if (i < maxAttempts) await Util.sleep(2000);
      }
      return { ok: false, response_code: 404, message: lastError };
    },

    async performContinuousClick(selector, intervalMs, durationMs) {
      let successCount = 0;
      let failCount = 0;
      const endTime = Date.now() + durationMs;
      Util.info(`开始连点: selector=${selector}, interval=${intervalMs}ms, duration=${durationMs}ms, 结束时间=${Util.formatTime(new Date(endTime))}`);
      return new Promise((resolve) => {
        let lastLogTime = 0;
        const timer = setInterval(() => {
          if (Date.now() >= endTime) {
            clearInterval(timer);
            Util.info(`连点结束: 成功 ${successCount} 次, 失败 ${failCount} 次, 总点击 ${successCount + failCount} 次`);
            resolve({ success_count: successCount, fail_count: failCount });
            return;
          }
          try {
            const btn = Util.getByXPath(selector);
            if (btn) {
              Executor.activateButton(btn);
              btn.click();
              successCount++;
            } else {
              failCount++;
            }
          } catch {
            failCount++;
          }
          // 每2秒输出一次进度
          const now = Date.now();
          if (now - lastLogTime > 2000) {
            lastLogTime = now;
            const elapsed = ((now - (endTime - durationMs)) / 1000).toFixed(1);
            Util.log(`连点进行中: ${elapsed}s / ${(durationMs / 1000).toFixed(0)}s, 成功 ${successCount}, 失败 ${failCount}`);
          }
        }, intervalMs);
      });
    },

    async judgeClaimResult(btn, taskId) {
      Util.log(`判断领取结果: task_id=${taskId}`);
      const deadline = Date.now() + 3000;
      while (Date.now() < deadline) {
        const captured = RewardMonitor.get(taskId);
        if (captured) {
          Util.log(`领取结果(API捕获): ${captured.status} code=${captured.response_code} msg=${captured.message}`);
          return {
            ok: captured.status === '成功',
            response_code: captured.response_code,
            message: captured.message || captured.status,
            captured
          };
        }
        await Util.sleep(100);
      }
      const text = Util.text(btn);
      Util.log(`领取结果(页面文字): ${text || '无'}`);
      if (/已领取|已拥有|成功|领取成功/.test(text)) {
        return { ok: true, response_code: 0, message: text || '领取成功' };
      }
      if (/失败|错误|抢完|库存不足|未开始/.test(document.body.innerText || '')) {
        const matched = (document.body.innerText || '').match(/.{0,12}(失败|错误|抢完|库存不足|未开始).{0,12}/);
        return { ok: false, response_code: -1, message: matched ? matched[0] : '页面提示领取失败' };
      }
      Util.log('未检测到明确成功/失败标识，视为完成');
      return { ok: true, response_code: 200, message: '点击流程完成，未捕获领取接口响应' };
    },

    async setupCurrentPage(selector, maxAttempts) {
      Util.log(`setupCurrentPage: 查找按钮 selector=${selector}, 最多尝试 ${maxAttempts} 次`);
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const btn = Util.getByXPath(selector);
        if (btn) {
          this.activateButton(btn);
          Util.log(`setupCurrentPage: 第 ${attempt}/${maxAttempts} 次找到按钮`);
          return true;
        }
        if (attempt < maxAttempts) {
          Util.log(`setupCurrentPage: 第 ${attempt}/${maxAttempts} 次未找到，等待2秒重试`);
          await Util.sleep(2000);
        }
      }
      Util.warn(`setupCurrentPage: 所有 ${maxAttempts} 次尝试均未找到按钮`);
      return false;
    },

    async runSingleTask(taskId, config, selector, results) {
      const startTime = Util.parseTime(config.start_time || CONFIG.DEFAULT_START_TIME);
      const intervalMs = Math.max(0, Number(config.interval || CONFIG.DEFAULT_CLICK_INTERVAL_MS / 1000) * 1000);
      const durationMs = Math.max(1, Number(config.duration || CONFIG.DEFAULT_CLICK_DURATION_MS / 1000) * 1000);
      const waitSec = Math.max(0, (startTime.getTime() - Date.now()) / 1000);
      Util.info(`任务配置: task_id=${taskId} start=${config.start_time} wait=${waitSec.toFixed(0)}s interval=${intervalMs}ms duration=${durationMs}ms`);
      await this.waitUntil(startTime);
      Util.info(`开始执行任务: ${taskId}`);
      const clickStats = await this.performContinuousClick(selector, intervalMs, durationMs);
      const btn = Util.getByXPath(selector);
      const claimResult = await this.judgeClaimResult(btn, taskId);
      const successCount = clickStats.success_count || 0;
      const totalCount = successCount + (clickStats.fail_count || 0);
      const resultText = `${(durationMs / 1000).toFixed(2)}秒点击结束，共点击 ${totalCount} 次，成功 ${successCount} 次，成功率 ${totalCount ? (successCount / totalCount * 100).toFixed(1) : '0.0'}%`;
      Util.info(`任务结果 [${taskId}]: ${resultText} | ${claimResult.ok ? '✅ 成功' : '❌ 失败'} — ${claimResult.message}`);
      const captured = claimResult.captured;
      const uploadResult = captured ? RewardMonitor.makeUploadResult(taskId) : null;
      if (uploadResult) {
        results[taskId] = uploadResult;
      } else {
        const task = Util.findTaskById(Panel.state.tasks, taskId);
        results[taskId] = {
          task_id: taskId,
          task_name: RewardMonitor.getMissionName(taskId) || Util.getTaskName(task),
          status: claimResult.ok ? '成功' : '失败',
          response_code: claimResult.response_code,
          message: `${resultText}；${claimResult.message}`,
          timestamp: Util.formatTime(),
          device_name: CONFIG.DEVICE_NAME
        };
      }
      return results[taskId];
    },

    async waitUntil(targetTime) {
      const diff = targetTime.getTime() - Date.now();
      if (diff <= 0) {
        Util.log('waitUntil: 目标时间已过，立即执行');
        return;
      }
      Util.info(`等待 ${(diff / 1000).toFixed(1)} 秒 (到 ${Util.formatTime(targetTime)}) 后开始执行...`);
      await Util.sleep(diff);
      Util.info('等待结束，开始执行');
    }
  };

  // ========================
  // 批量上传 - 对标 Python server.py batch_upload_results
  // ========================
  async function batchUploadAllResults(results) {
    const uploadResults = Object.values(results || {}).filter(item => item && item.task_id);
    const uploadPayload = {
      device_name: CONFIG.DEVICE_NAME,
      total_tasks: uploadResults.length,
      results: uploadResults,
      upload_time: Util.formatTime()
    };
    Util.info(`批量上传: ${uploadResults.length} 个当前执行任务结果`);
    Util.log('批量上传结果:', uploadPayload);
    return await API.uploadWithRetry(uploadPayload);
  }

  // ========================
  // 当前页面任务流程
  // ========================
  async function runCurrentPageTask(baseConfig, taskId, taskConfig, taskName = '') {
    const selector = baseConfig.reward_claim_selector;
    const maxAttempts = Number(baseConfig.max_reload_attempts || baseConfig.context_retry_count || CONFIG.MAX_RELOAD_ATTEMPTS);
    if (!selector) throw new Error('缺少 reward_claim_selector 配置');
    Util.info(`runCurrentPageTask: task_id=${taskId} task_name=${taskName} selector=${selector} maxAttempts=${maxAttempts}`);

    Util.log('设置当前页面(查找并激活按钮)...');
    const ready = await Executor.setupCurrentPage(selector, maxAttempts);
    if (!ready) throw new Error('所有尝试均失败，未找到领取按钮');
    Util.info('页面设置完成，按钮已激活');

    const results = {};
    Util.log(`执行单任务: ${taskId}`);
    await Executor.runSingleTask(taskId, taskConfig || Util.defaultTaskConfig(taskId), selector, results);

    Util.notify('BiliAuto 执行完成', Object.values(results).map(item => `${item.task_id}: ${item.status}`).join('\n'));
    Util.info('当前任务结果:', results);
    return results;
  }

  // ========================
  // 检查更新与公告 - 对标 Python check_update / get_announcements
  // ========================
  async function checkStartup() {
    Util.log('启动时检查更新和公告...');
    try {
      const [updateInfo, announcements] = await Promise.all([
        API.checkUpdate(),
        API.getAnnouncements()
      ]);
      if (announcements && announcements.length > 0) {
        const texts = announcements.slice(0, 3).map(a => a.title || a.content || a.message || JSON.stringify(a)).filter(Boolean);
        if (texts.length > 0) {
          Util.info(`显示公告: ${texts.join(' | ')}`);
          Util.notify('公告', texts.join('\n'));
        }
      }
    } catch (e) {
      Util.log('启动检查失败:', e);
    }
  }

  // ========================
  // 主流程
  // ========================
  async function main() {
    Util.info('========================================');
    Util.info('BiliAutoClicker 油猴客户端启动');
    Util.info(`版本: ${CONFIG.VERSION}  设备 ID: ${CONFIG.DEVICE_ID}  设备名: ${CONFIG.DEVICE_NAME}  URL: ${window.location.href}`);
    Util.info(`API 地址: ${CONFIG.API_BASE}`);

    Panel.init();

    if (!isLoggedIn()) {
      Util.info('未登录，显示全屏登录界面');
      Panel.showLoginOverlay();
    }

    if (!Util.isRewardPage() && !Util.isLivePage()) {
      Util.info('当前不在 B 站活动页或直播间，仅获取服务端列表并显示');
      try {
        const [baseResp, tasksResp] = await Promise.all([API.getBaseConfig(), API.getTasks()]);
        Panel.setData(API.unwrapConfig(baseResp), tasksResp.status === 'success' ? tasksResp.data : []);
        checkStartup();
      } catch (e) {
        Util.warn('拉取配置失败:', e);
        Panel.setStatus('服务连接失败：' + (e.message || e));
      }
      return;
    }

    try {
      Util.info('拉取服务端基础配置...');
      const baseResp = await API.getBaseConfig();
      if (baseResp.status !== 'success') {
        throw new Error('获取基础配置失败: ' + (baseResp.message || baseResp.msg || ''));
      }
      const baseConfig = API.unwrapConfig(baseResp);
      const taskId = Util.extractTaskIdFromPage() || 'unknown_task';
      Util.info(`当前页面 task_id: ${taskId}`);

      let taskName = '';
      // DOM 提取为主要方案，API hook 为辅助（hook 常因 B 站打包缓存而无法捕获）
      const domPageInfo = Util.extractPageInfoFromDOM();
      if (domPageInfo) {
        taskName = domPageInfo.section_title || domPageInfo.award_info || '';
        if (taskId && taskId !== 'unknown_task') {
          const payload = {
            task_id: taskId,
            device_name: CONFIG.DEVICE_NAME,
            section_title: domPageInfo.section_title,
            award_info: domPageInfo.award_info,
            extract_time: Util.formatTime()
          };
          Util.log(`上传页面信息(DOM): task_id=${taskId} section_title="${domPageInfo.section_title}" award_info="${domPageInfo.award_info}"`);
          API.uploadPageInfo(payload).then(resp => {
            Util.log(`页面信息上传成功:`, resp && resp.status);
          }).catch(e => {
            Util.log(`页面信息上传失败（不影响主流程）:`, e.message || e);
          });
        }
      } else {
        // DOM 提取失败时，尝试等 hook 捕获
        taskName = await RewardMonitor.waitForTaskName(taskId, 1500);
        const missionPageInfo = RewardMonitor.getMissionPageInfo(taskId);
        if (missionPageInfo && taskId && taskId !== 'unknown_task') {
          const payload = {
            task_id: taskId,
            device_name: CONFIG.DEVICE_NAME,
            section_title: missionPageInfo.section_title,
            award_info: missionPageInfo.award_info,
            extract_time: Util.formatTime()
          };
          Util.log(`上传页面信息(Hook): task_id=${taskId} section_title="${missionPageInfo.section_title}" award_info="${missionPageInfo.award_info}"`);
          API.uploadPageInfo(payload).then(resp => {
            Util.log(`页面信息上传成功:`, resp && resp.status);
          }).catch(e => {
            Util.log(`页面信息上传失败（不影响主流程）:`, e.message || e);
          });
        } else {
          Util.log('DOM 和 Hook 均未捕获到页面信息，跳过上传');
        }
      }

      Util.info('获取服务端任务列表并显示...');
      const tasksResp = await API.getTasks();
      if (tasksResp.status !== 'success') {
        throw new Error('获取任务列表失败: ' + (tasksResp.message || tasksResp.msg || ''));
      }
      const tasks = Util.normalizeTasks(tasksResp.data || {});
      Panel.setData(baseConfig, tasks);
      Util.info(`远程任务列表: ${tasks.length} 个任务`);

      const currentTask = Util.findTaskById(tasks, taskId);
      if (!taskName) taskName = Util.getTaskName(currentTask);
      Util.info(`当前页面任务: task_id=${taskId} task_name="${taskName}"`);

      const taskConfigs = Util.loadTaskConfigs(tasks);
      Util.log(`加载了 ${Object.keys(taskConfigs).length} 个任务配置`);
      const results = await runCurrentPageTask(baseConfig, taskId, taskConfigs[taskId] || Util.defaultTaskConfig(taskId), taskName);

      // 上传页面信息后，服务端已自动更新 task_key，重新拉取任务列表以获取最新名称
      Util.log('任务执行完成，重新拉取任务列表刷新名称...');
      try {
        const refreshedTasksResp = await API.getTasks();
        if (refreshedTasksResp.status === 'success') {
          const refreshedTasks = Util.normalizeTasks(refreshedTasksResp.data || {});
          Panel.setData(baseConfig, refreshedTasks);
          // 用刷新后的任务名称更新已捕获的结果
          let updateCount = 0;
          for (const key of Object.keys(results)) {
            const refreshedTask = Util.findTaskById(refreshedTasks, key);
            if (refreshedTask) {
              const newName = Util.getTaskName(refreshedTask);
              if (newName && newName !== results[key].task_name) {
                Util.log(`任务名称更新: ${results[key].task_name} -> ${newName}`);
                results[key].task_name = newName;
                updateCount++;
              }
            }
          }
          Util.log(`刷新任务列表完成，更新了 ${updateCount} 个任务名称`);
        }
      } catch (e) {
        Util.warn('刷新任务列表失败:', e);
      }

      Util.info(`准备批量上传 ${Object.keys(results).length} 个当前任务结果`);
      await batchUploadAllResults(results);

      Util.info('========================================');
      Util.info('主流程完成');
      Util.info('========================================');
    } catch (e) {
      Util.error('主流程异常:', e);
      Util.notify('BiliAuto 异常', e.message || String(e));

      try {
        Util.warn('异常时尝试上传失败结果...');
        await API.uploadRewards({
          device_name: CONFIG.DEVICE_NAME,
          total_tasks: 1,
          upload_time: Util.formatTime(),
          results: [{
            task_id: Util.extractTaskIdFromPage() || 'unknown_task',
            status: '失败',
            response_code: 500,
            message: e.message || String(e),
            timestamp: Util.formatTime(),
            device_name: CONFIG.DEVICE_NAME
          }]
        });
        Util.log('异常结果已上传');
      } catch (uploadErr) {
        Util.warn('上传异常结果失败:', uploadErr);
      }
    }
  }

  // 立即安装 API Hook，不等待页面加载
  RewardMonitor.install();
  Util.log('API Hook 已安装（document-start 模式）');

  // 等待 DOM 准备好后再执行主流程
  Util.log('油猴脚本已注入，等待页面加载...');
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
  } else {
    main();
  }

})();
