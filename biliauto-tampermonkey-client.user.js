// ==UserScript==
// @name         BiliAutoClicker - 油猴客户端
// @namespace    https://github.com/under-the-ocean
// @version      1.0.9
// @match        https://www.bilibili.com/blackboard/era/award-exchange.html?*
// @connect      bili.982835785.xyz
// @connect      api.live.bilibili.com
// @grant        GM_xmlhttpRequest
// @grant        GM_notification
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// @grant        GM_getResourceText
// @grant        GM_getResourceURL
// @grant        unsafeWindow
// @resource     TEMPLATE_HTML https://gh-proxy.com/https://raw.githubusercontent.com/under-the-ocean/Bili_monkey/main/template.html
// @resource     CUSTOM_FONT  https://gh-proxy.com/https://raw.githubusercontent.com/under-the-ocean/Bili_monkey/main/zh-cn.ttf
// @run-at       document-start
// @downloadURL  https://gh-proxy.com/https://raw.githubusercontent.com/under-the-ocean/Bili_monkey/main/biliauto-tampermonkey-client.user.js
// @updateURL    https://gh-proxy.com/https://raw.githubusercontent.com/under-the-ocean/Bili_monkey/main/biliauto-tampermonkey-client.user.js
// ==/UserScript==

(function () {
  'use strict';

  function detectBrowserInfo() {
    const ua = navigator.userAgent || '';
    const uaData = navigator.userAgentData;
    let browserType = 'Browser';
    let browserName = 'Unknown';

    if (uaData && Array.isArray(uaData.brands)) {
      const brands = uaData.brands.map(b => b.brand).filter(Boolean);
      const brandText = brands.join(' / ');
      if (/Edge/i.test(brandText)) browserName = 'Microsoft Edge';
      else if (/Chrome/i.test(brandText)) browserName = 'Google Chrome';
      else if (/Chromium/i.test(brandText)) browserName = 'Chromium';
      else if (brands.length) browserName = brands[brands.length - 1];
    }
    if (browserName === 'Unknown') {
      if (/Edg\//.test(ua)) browserName = 'Microsoft Edge';
      else if (/OPR\//.test(ua)) browserName = 'Opera';
      else if (/Firefox\//.test(ua)) browserName = 'Firefox';
      else if (/Chrome\//.test(ua) && !/Chromium\//.test(ua)) browserName = 'Google Chrome';
      else if (/Chromium\//.test(ua)) browserName = 'Chromium';
      else if (/Safari\//.test(ua)) browserName = 'Safari';
    }

    if (/Firefox\//.test(ua)) browserType = 'Firefox';
    else if (/Edg\//.test(ua) || /Chrome\//.test(ua) || /Chromium\//.test(ua) || (uaData && uaData.brands)) browserType = 'Chromium';
    else if (/Safari\//.test(ua)) browserType = 'WebKit';

    return { type: browserType, name: browserName, label: browserType + ' - ' + browserName };
  }

  const CONFIG = {
    API_BASE: GM_getValue('api_base', 'https://bili.982835785.xyz'),

    API_KEY: GM_getValue('api_key', ''),
    QQ_ID: GM_getValue('qq_id', ''),
    ACCOUNT_NAME: GM_getValue('account_name', ''),

    DEVICE_ID: GM_getValue('qq_id') || GM_getValue('device_id', 'tm-' + crypto.randomUUID()),
    DEVICE_NAME: GM_getValue('device_name_v2', detectBrowserInfo().label),

    DEFAULT_CLICK_INTERVAL_MS: 50,
    DEFAULT_CLICK_DURATION_MS: 10000,
    DEFAULT_CLICK_MODE: 'dom',
    DEFAULT_START_TIME: '00:29:57',
    MAX_RELOAD_ATTEMPTS: 3,

    VERSION: '1.0.9',
    RETRY_COUNT: 2,
    DEBUG: true
  };

  if (!GM_getValue('device_id') && !CONFIG.QQ_ID) {
    GM_setValue('device_id', CONFIG.DEVICE_ID);
  }
  if (!GM_getValue('device_name_v2')) {
    GM_setValue('device_name_v2', CONFIG.DEVICE_NAME);
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

    normalizeStartTimeInput(timeStr) {
      let value = String(timeStr || '').trim();
      if (!value) return '';
      value = value
        .replace(/：/g, ':')
        .replace(/，/g, ',')
        .replace(/\s+/g, '')
        .replace(/^今天/, '')
        .replace(/^今晚/, '');

      if (/^(现在|立即|马上|now)$/i.test(value)) return '+0';

      const rel = value.match(/^\+?(?:(\d+(?:\.\d+)?)(?:小时|小時|h))?(?:(\d+(?:\.\d+)?)(?:分钟|分鐘|分|m))?(?:(\d+(?:\.\d+)?)(?:秒|s))?(?:后|後)$/i);
      if (rel && (rel[1] || rel[2] || rel[3])) {
        const seconds = (Number(rel[1] || 0) * 3600) + (Number(rel[2] || 0) * 60) + Number(rel[3] || 0);
        return `+${seconds}`;
      }

      if (value.startsWith('+')) {
        const tail = value.slice(1);
        if (/^\d+(\.\d+)?$/.test(tail)) return `+${Number(tail)}`;
        const m = tail.match(/^(?:(\d+(?:\.\d+)?)(?:小时|小時|h))?(?:(\d+(?:\.\d+)?)(?:分钟|分鐘|分|m))?(?:(\d+(?:\.\d+)?)(?:秒|s))?$/i);
        if (m && (m[1] || m[2] || m[3])) {
          const seconds = (Number(m[1] || 0) * 3600) + (Number(m[2] || 0) * 60) + Number(m[3] || 0);
          return `+${seconds}`;
        }
      }

      if (/^\d+(\.\d+)?$/.test(value)) return String(Number(value));

      let tomorrow = false;
      if (value.startsWith('明天')) {
        tomorrow = true;
        value = value.slice(2);
      }

      value = value.replace(/半/g, '30分');
      const zh = value.match(/^(\d{1,2})[点时時](?:(\d{1,2})分?)?(?:(\d{1,2})秒?)?$/);
      if (zh) {
        const pad = n => String(Math.max(0, Math.floor(Number(n || 0)))).padStart(2, '0');
        return `${tomorrow ? '明天 ' : ''}${pad(zh[1])}:${pad(zh[2] || 0)}:${pad(zh[3] || 0)}`;
      }

      const parts = value.split(':').map(part => part.trim()).filter(Boolean);
      if (parts.length === 2 || parts.length === 3) {
        const nums = parts.map(Number);
        if (nums.every(Number.isFinite)) {
          const [hh, mm, ss = 0] = nums;
          const pad = n => String(Math.max(0, Math.floor(n))).padStart(2, '0');
          return `${tomorrow ? '明天 ' : ''}${pad(hh)}:${pad(mm)}:${pad(ss)}`;
        }
      }
      return value;
    },

    parseTimeSpec(timeStr, now = new Date()) {
      const raw = String(timeStr || '').trim();
      const value = Util.normalizeStartTimeInput(raw || CONFIG.DEFAULT_START_TIME);
      if (!value) return Util.parseTimeSpec(CONFIG.DEFAULT_START_TIME, now);
      if (value.startsWith('+')) {
        const seconds = Number(value.slice(1));
        if (Number.isFinite(seconds)) {
          const target = new Date(now.getTime() + seconds * 1000);
          return { raw, normalized: value, target, delayMs: Math.max(0, target.getTime() - now.getTime()), mode: 'relative' };
        }
      }
      if (/^\d+(\.\d+)?$/.test(value)) {
        const target = new Date(now.getTime() + Number(value) * 1000);
        return { raw, normalized: value, target, delayMs: Math.max(0, target.getTime() - now.getTime()), mode: 'relative' };
      }
      let clockValue = value;
      let forceTomorrow = false;
      if (clockValue.startsWith('明天 ')) {
        forceTomorrow = true;
        clockValue = clockValue.slice(3).trim();
      }
      const parts = clockValue.split(':').map(Number);
      if (parts.length === 2 || parts.length === 3) {
        const [hours, minutes, seconds = 0] = parts;
        if ([hours, minutes, seconds].every(Number.isFinite)) {
          const target = new Date(now);
          target.setHours(hours, minutes, seconds, 0);
          if (forceTomorrow || target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
          return { raw, normalized: value, target, delayMs: Math.max(0, target.getTime() - now.getTime()), mode: forceTomorrow ? 'tomorrow-clock' : 'clock' };
        }
      }
      const fallback = Util.parseTimeSpec(CONFIG.DEFAULT_START_TIME, now);
      return { ...fallback, raw, normalized: fallback.normalized, invalid: true };
    },

    parseTime(timeStr) {
      return Util.parseTimeSpec(timeStr).target;
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
        click_mode: CONFIG.DEFAULT_CLICK_MODE,
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
        'X-Client-Version': CONFIG.VERSION,
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
	              if (res.status === 426) {
	                try {
	                  const parsed = JSON.parse(body);
	                  if (parsed && parsed.code === 'FORCE_UPDATE_REQUIRED') {
	                    reject(Object.assign(new Error(parsed.message || '客户端版本过低'), { code: 'FORCE_UPDATE_REQUIRED', update: parsed.update }));
	                    return;
	                  }
	                } catch {}
	              }
	              if (res.status === 401) {
	                try {
	                  const parsed = JSON.parse(body);
	                  if (parsed && parsed.code === 'AUTH_REQUIRED') {
	                    Panel.showLoginOverlay('登录失效，请重新登录');
	                    reject(Object.assign(new Error(parsed.message || '未登录'), { code: 'AUTH_REQUIRED' }));
	                    return;
	                  }
	                } catch {}
	              }
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

    getTaskParsedInfo(taskId) {
      return this.request('GET', '/api/stats/task-parsed?task_id=' + encodeURIComponent(taskId));
    },

    /** 提交奖励说明用于AI解析（从info hook触发） */
    submitAwardDescription(taskId, awardDescription, firstSeenAt) {
      return this.request('POST', '/api/stats/award-description', {
        task_id: taskId,
        award_description: awardDescription,
        first_seen_at: firstSeenAt
      });
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
          Util.info(`上传结果成功 (第${retry + 1}次)`);
          Util.log('响应详情:', resp);
          return resp;
        } catch (e) {
          lastError = e.message || String(e);
          Util.info(`上传结果失败 (第${retry + 1}次): ${lastError.slice(0, 100)}`);
          if (retry < CONFIG.RETRY_COUNT) {
            await Util.sleep(1000 * (retry + 1));
          }
        }
      }
      Util.info(`上传结果最终失败: ${lastError.slice(0, 150)}`);
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

  function readStoredPositiveNumber(key, fallback) {
    const raw = GM_getValue(key, fallback);
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  // ========================
  // 时间校准 —— 从B站RTC接口获取服务器时间，补偿本地时钟偏差
  // ========================
  const ServerTime = {
    offsetMs: 0,
    lastCalibration: null,

    async calibrate() {
      try {
        const t0 = Date.now();
        const resp = await fetch('https://api.live.bilibili.com/xlive/open-interface/v1/rtc/getTimestamp');
        const t1 = Date.now();
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const json = await resp.json();
        if (json && json.code === 0 && json.data && json.data.microtime) {
          const serverMs = json.data.microtime;
          const rtt = t1 - t0;
          this.offsetMs = serverMs - t0 - rtt / 2;
          this.lastCalibration = Date.now();
          Util.log('时间校准完成：偏差 ' + (this.offsetMs > 0 ? '+' : '') + this.offsetMs.toFixed(0) + 'ms，RTT=' + rtt + 'ms');
          this._updateDisplay();
          return this.offsetMs;
        }
        throw new Error('响应格式异常');
      } catch (e) {
        Util.warn('时间校准失败：' + e.message);
        this._updateDisplay();
        return this.offsetMs;
      }
    },

    now() {
      return Date.now() + this.offsetMs;
    },

    nowDate() {
      return new Date(Date.now() + this.offsetMs);
    },

    getOffsetDisplay() {
      if (this.lastCalibration === null) return '未校准';
      const abs = Math.abs(this.offsetMs);
      const sign = this.offsetMs > 0 ? '+' : '-';
      if (abs < 1000) return sign + abs.toFixed(0) + 'ms';
      return sign + (abs / 1000).toFixed(2) + 's';
    },

    _updateDisplay() {
      const el = document.getElementById('biliauto-time-offset');
      if (el) el.textContent = this.getOffsetDisplay();
    }
  };
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
      panelWidth: readStoredPositiveNumber('material_panel_width', 380),
      panelHeight: readStoredPositiveNumber('material_panel_height', 460),
      loginCode: '',
      loginStatus: isLoggedIn() ? 'logged_in' : '',
        timeOffset: null
    },

    init() {
      if (document.getElementById('biliauto-panel') && document.getElementById('biliauto-fab')) return;

      if (!document.getElementById('biliauto-fab')) {
        const fab = document.createElement('div');
        fab.id = 'biliauto-fab';
        fab.innerHTML = Panel.getSubTemplate('fab');
        document.documentElement.appendChild(fab);
        fab.addEventListener('click', () => this.toggle());
      }

      if (!document.getElementById('biliauto-panel')) {
        const root = document.createElement('div');
        root.id = 'biliauto-panel';
        root.style.boxSizing = 'border-box';
        root.innerHTML = this.template();
        document.documentElement.appendChild(root);
      }

      this.applyDarkModeOptions();
      ServerTime.calibrate();
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
      if (root) root.classList.toggle('tm-cyber-dark', this.state.darkMode);
      const fab = document.getElementById('biliauto-fab');
      if (fab) fab.classList.toggle('tm-cyber-dark', this.state.darkMode);
    },

    setupPanelPosition() {
      const root = document.getElementById('biliauto-panel');
      if (!root) return;
      if (this.state.panelWidth) root.style.width = this.state.panelWidth + 'px';
      if (this.state.panelHeight) root.style.height = this.state.panelHeight + 'px';
      if (this.state.panelX !== null && this.state.panelY !== null) {
        root.style.left = this.state.panelX + 'px';
        root.style.top = this.state.panelY + 'px';
        root.style.right = 'auto';
        root.style.bottom = 'auto';
        root.style.transform = 'none';
      } else {
        const width = this.state.panelWidth || 380;
        const height = this.state.panelHeight || 460;
        root.style.left = Math.max(12, window.innerWidth - width - 18) + 'px';
        root.style.top = Math.max(12, window.innerHeight - height - 18) + 'px';
        root.style.right = 'auto';
        root.style.bottom = 'auto';
        root.style.transform = 'none';
      }
      this.clampPanelToViewport();
    },

    clampPanelToViewport() {
      const root = document.getElementById('biliauto-panel');
      if (!root) return;
      const width = Math.max(320, Math.min(root.offsetWidth, window.innerWidth - 24));
      const height = Math.max(260, Math.min(root.offsetHeight, window.innerHeight - 24));
      root.style.width = width + 'px';
      root.style.height = height + 'px';
      const rect = root.getBoundingClientRect();
      let left = rect.left;
      let top = rect.top;
      const maxLeft = Math.max(12, window.innerWidth - width - 12);
      const maxTop = Math.max(12, window.innerHeight - height - 12);
      left = Math.min(Math.max(left, 12), maxLeft);
      top = Math.min(Math.max(top, 12), maxTop);
      root.style.left = Math.round(left) + 'px';
      root.style.top = Math.round(top) + 'px';
      root.style.right = 'auto';
      root.style.bottom = 'auto';
      root.style.transform = 'none';
      this.state.panelWidth = Math.round(width);
      this.state.panelHeight = Math.round(height);
      this.state.panelX = Math.round(left);
      this.state.panelY = Math.round(top);
      GM_setValue('material_panel_width', Math.round(width));
      GM_setValue('material_panel_height', Math.round(height));
      GM_setValue('material_panel_x', Math.round(left));
      GM_setValue('material_panel_y', Math.round(top));
    },

    setupDrag() {
      const root = document.getElementById('biliauto-panel');
      const handle = root.querySelector('.tm-cyber-header');
      if (!handle || handle.dataset.dragInitialized) return;
      handle.dataset.dragInitialized = '1';
      if (this.state.panelWidth) root.style.width = this.state.panelWidth + 'px';
      if (this.state.panelHeight) root.style.height = this.state.panelHeight + 'px';
      if (this.state.panelX !== null && this.state.panelY !== null) {
        root.style.left = this.state.panelX + 'px';
        root.style.top = this.state.panelY + 'px';
        root.style.right = 'auto';
        root.style.bottom = 'auto';
        root.style.transform = 'none';
      }
      this.clampPanelToViewport();
      let isDragging = false;
      let startX = 0;
      let startY = 0;
      let origX = 0;
      let origY = 0;
      const onMouseMove = (e) => {
        if (!isDragging) return;
        const rect = root.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const maxLeft = Math.max(12, window.innerWidth - width - 12);
        const maxTop = Math.max(12, window.innerHeight - height - 12);
        let nextLeft = origX + e.clientX - startX;
        let nextTop = origY + e.clientY - startY;
        nextLeft = Math.min(Math.max(nextLeft, 12), maxLeft);
        nextTop = Math.min(Math.max(nextTop, 12), maxTop);
        root.style.left = Math.round(nextLeft) + 'px';
        root.style.top = Math.round(nextTop) + 'px';
      };
      const onMouseUp = () => {
        if (!isDragging) return;
        isDragging = false;
        root.style.transition = '';
        this.clampPanelToViewport();
      };
      handle.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        if (e.target.closest('[data-ba]')) return;
        isDragging = true;
        const rect = root.getBoundingClientRect();
        startX = e.clientX;
        startY = e.clientY;
        origX = rect.left;
        origY = rect.top;
        root.style.left = Math.round(origX) + 'px';
        root.style.top = Math.round(origY) + 'px';
        root.style.right = 'auto';
        root.style.bottom = 'auto';
        root.style.transform = 'none';
        root.style.transition = 'none';
        e.preventDefault();
      });
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      if (!handle.dataset.viewportSyncInitialized) {
        handle.dataset.viewportSyncInitialized = '1';
        window.addEventListener('resize', () => this.clampPanelToViewport());
        if (window.ResizeObserver) {
          const observer = new ResizeObserver(() => this.clampPanelToViewport());
          observer.observe(root);
        }
      }
    },

    template() {
      Util.log('=== 模板加载开始 ===');
      Util.log('尝试从 @resource TEMPLATE_HTML 获取模板...');
      const tpl = GM_getResourceText('TEMPLATE_HTML');
      const fontUrl = GM_getResourceURL('CUSTOM_FONT');
      Util.log(`模板获取结果: ${tpl ? `成功，长度=${tpl.length}字符` : '失败（返回空或undefined）'}`);
      
      if (!tpl) {
        Util.error('模板加载失败！原因: GM_getResourceText 返回空值');
        Util.log('远程模板地址: https://gh-proxy.com/https://raw.githubusercontent.com/under-the-ocean/Bili_monkey/main/template.html');
        Util.log('请检查：1. 网络连接 2. GitHub访问是否正常 3. 代理服务是否可用');
        return this.getSubTemplate('error', { ERROR_MSG: 'GM_getResourceText 返回空值' });
      }
      
      Util.log('模板加载成功，开始替换变量...');
      const beforeLength = tpl.length;
      let result = tpl
        .replace(/\$\{VERSION\}/g, CONFIG.VERSION)
        .replace(/\$\{FONT_URL\}/g, fontUrl)
        .replace(/\$\{DEVICE_ID_SHORT\}/g, CONFIG.DEVICE_ID.slice(0, 8))
        .replace(/\$\{CONFIG\.QQ_ID\}/g, CONFIG.QQ_ID || '')
        .replace(/\$\{CONFIG\.ACCOUNT_NAME\}/g, CONFIG.ACCOUNT_NAME || CONFIG.QQ_ID || '')
        .replace(/\$\{CONFIG\.(\w+)\?('([^']*)')\s*:\s*('([^']*)')\}/g, (match, key, trueStr, trueVal, falseStr, falseVal) => (CONFIG[key] ? trueVal : falseVal))
        .replace(/\$\{this\.escape\(([^)]+)\)\}/g, (match, expr) => {
          try { const val = eval(expr); return this.escape(String(val ?? '')); } catch(e) { return ''; }
        })
        .replace(/\$\{this\.escapeAttr\(([^)]+)\)\}/g, (match, expr) => {
          try { const val = eval(expr); return this.escapeAttr(String(val ?? '')); } catch(e) { return ''; }
        })
        .replace(/\$\{this\.state\.([^}]+)\}/g, (match, key) => {
          try { const val = key.split('.').reduce((o, k) => o?.[k], this.state); return String(val ?? ''); } catch(e) { return ''; }
        })
        .replace(/\$\{this\.([^}]+)\}/g, (match, key) => {
          try { const val = key.split('.').reduce((o, k) => o?.[k], this); return String(val ?? ''); } catch(e) { return ''; }
        })
        .replace(/\$\{i \+ 1\}/g, '')
        .replace(/\$\{cfg\.([^}]+)\}/g, '')
        .replace(/\$\{currentTask\}/g, '')
        .replace(/\$\{current\.([^}]+)\}/g, '')
        .replace(/\$\{CONFIG\.(\w+)\}/g, (match, key) => CONFIG[key] || '')
        .replace(/\$\{others\[i\]\.([^}]+)\}/g, '')
        .replace(/\$\{selected\.length\}/g, '')
        .replace(/\$\{others\.length\}/g, '')
        .replace(/\$\{tasks\.length\}/g, '')
        .replace(/\$\{url\}/g, '')
        .replace(/\$\{title\}/g, '')
        .replace(/\$\{onlyTaskIds \? ' \(指定ID\)' : ''\}/g, '');
      
      Util.log(`模板变量替换完成: 处理前=${beforeLength}字符, 处理后=${result.length}字符`);
      Util.log('=== 模板加载完成 ===');
      return result;
    },

    bind() {
      const panel = document.getElementById('biliauto-panel');
      if (panel.dataset.bound) return;
      panel.dataset.bound = '1';

      panel.addEventListener('click', (e) => {
        const target = e.target.closest('[data-ba]');
        if (!target) return;
        const action = target.getAttribute('data-ba');
        if (action === 'closePanel') this.close();
        else if (action === 'refresh') this.refresh();
        else if (action === 'manualJump') this.jumpManual();
        else if (action === 'jump') this.jump(target.getAttribute('data-taskid'));
        else if (action === 'copy') this.copy(target.getAttribute('data-taskid'));
        else if (action === 'select') this.updateTaskConfig(target.getAttribute('data-taskid'), 'selected', target.checked);
        else if (action === 'runOne') this.runSelected([target.getAttribute('data-taskid')]);
        else if (action === 'runAll') this.runSelected();
        else if (action === 'addTask') this.addCustomTask();
        else if (action === 'removeTask') this.removeTask(target.getAttribute('data-taskid'));
        else if (action === 'defaults') this.applyDefaults();
        else if (action === 'pagePrev') { this.state._page = (this.state._page || 1) - 1; this.renderList(); }
        else if (action === 'pageNext') { this.state._page = (this.state._page || 1) + 1; this.renderList(); }
        else if (action === 'clearAll') this.clearAllTasks();
        else if (action === 'copyPageInfo') this.copyPageInfo();
        else if (action === 'toggleDark') this.toggleDarkMode();
        else if (action === 'logout') this.logout();
        else if (action === 'startLogin') this.startLogin();
        else if (action === 'testClick') this.testClick();
        else if (action === 'runCurrent') this.runCurrent();
      });

      panel.addEventListener('input', (e) => {
        const target = e.target.closest('[data-field]');
        if (!target) return;
        const box = target.closest('[data-ba="currentTaskConfig"]');
        if (!box) return;
        const currentTask = Util.extractTaskIdFromPage() || 'unknown_task';
        const field = target.getAttribute('data-field');
        this.updateTaskConfig(currentTask, field, target.value, { silent: true, noRender: true });
        target.dataset.currentConfigLiveBound = '1';
      });

      panel.addEventListener('change', (e) => {
        const fieldTarget = e.target.closest('[data-field]');
        if (fieldTarget) {
          const field = fieldTarget.getAttribute('data-field');
          const value = fieldTarget.type === 'checkbox' ? fieldTarget.checked : fieldTarget.value;
          const taskConfig = fieldTarget.closest('[data-ba="taskConfig"]');
          if (taskConfig) {
            this.updateTaskConfig(taskConfig.getAttribute('data-taskid'), field, value);
            return;
          }
          const currentTaskConfig = fieldTarget.closest('[data-ba="currentTaskConfig"]');
          if (currentTaskConfig) {
            const currentTask = Util.extractTaskIdFromPage() || 'unknown_task';
            this.updateTaskConfig(currentTask, field, value);
            return;
          }
        }

        const target = e.target.closest('[data-ba]');
        if (!target) return;
        const action = target.getAttribute('data-ba');
        if (action === 'taskConfig') {
          this.updateTaskConfig(target.getAttribute('data-taskid'), target.getAttribute('data-field'), target.value);
        } else if (action === 'currentTaskConfig') {
          const currentTask = Util.extractTaskIdFromPage() || 'unknown_task';
          this.updateTaskConfig(currentTask, target.getAttribute('data-field'), target.value);
        }
      });

      panel.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        const target = e.target.closest('[data-ba]');
        if (!target) return;
        const action = target.getAttribute('data-ba');
        if (action === 'addTaskInput') { e.preventDefault(); this.addCustomTask(); }
        if (action === 'manual') { e.preventDefault(); this.jumpManual(); }
      });

      const filterInput = panel.querySelector('[data-ba="filter"]');
      if (filterInput) {
        filterInput.addEventListener('input', () => {
          this.state.filter = filterInput.value.trim().toLowerCase();
          this.renderList();
        });
      }
    },

    setData(baseConfig, tasks) {
      this.state.baseConfig = baseConfig || this.state.baseConfig;
      this.state.tasks = Util.normalizeTasks(tasks || this.state.tasks);
      this.state.taskConfigs = Util.loadTaskConfigs(this.state.tasks);
      this.render();
      this.scheduleCurrentTask();
    },

    syncCurrentTaskConfigFromInputs(options = {}) {
      const currentTask = Util.extractTaskIdFromPage() || 'unknown_task';
      const currentConfigEl = document.querySelector('#biliauto-panel [data-ba="currentTaskConfig"]');
      if (!currentConfigEl || !currentTask || currentTask === 'unknown_task') return this.state.taskConfigs[currentTask] || Util.defaultTaskConfig(currentTask);
      const current = this.state.taskConfigs[currentTask] || Util.defaultTaskConfig(currentTask);
      const startInput = currentConfigEl.querySelector('[data-field="start_time"]');
      const intervalInput = currentConfigEl.querySelector('[data-field="interval"]');
      const durationInput = currentConfigEl.querySelector('[data-field="duration"]');
      const next = { ...current };
      if (startInput) {
        next.start_time = Util.normalizeStartTimeInput(startInput.value) || CONFIG.DEFAULT_START_TIME;
        startInput.value = next.start_time;
      }
      if (intervalInput) {
        const val = Number(intervalInput.value);
        next.interval = Number.isFinite(val) && val >= 0 ? val : CONFIG.DEFAULT_CLICK_INTERVAL_MS / 1000;
        intervalInput.value = String(next.interval);
      }
      if (durationInput) {
        const val = Number(durationInput.value);
        next.duration = Number.isFinite(val) && val > 0 ? val : CONFIG.DEFAULT_CLICK_DURATION_MS / 1000;
        durationInput.value = String(next.duration);
      }
      const checkedModeInput = currentConfigEl.querySelector('[data-field="click_mode"]:checked') || currentConfigEl.querySelector('[data-field="click_mode"]');
      if (checkedModeInput) {
        next.click_mode = checkedModeInput.value === 'direct' ? 'direct' : 'dom';
        this.syncModeSwitch(currentConfigEl, next.click_mode);
      }
      this.state.taskConfigs[currentTask] = next;
      this.saveTaskConfigs();
      if (options.log !== false) {
        this.setStatus(`已同步当前任务配置：开始 ${next.start_time}，间隔 ${next.interval}s，持续 ${next.duration}s`);
      }
      return next;
    },

    saveTaskConfigs() {
      GM_setValue('task_configs', this.state.taskConfigs);
    },

    syncModeSwitch(container, mode) {
      if (!container) return;
      const normalizedMode = mode === 'direct' ? 'direct' : 'dom';
      const modeOptions = container.querySelectorAll('.tm-cyber-mode-option');
      modeOptions.forEach((option) => {
        option.classList.toggle('is-active', option.getAttribute('data-mode') === normalizedMode);
      });
      const modeInputs = container.querySelectorAll('[data-field="click_mode"]');
      modeInputs.forEach((input) => {
        input.checked = input.value === normalizedMode;
      });
    },

    updateTaskConfig(taskId, field, value, options = {}) {
      if (!taskId) return;
      const current = this.state.taskConfigs[taskId] || Util.defaultTaskConfig(taskId);
      let nextValue = field === 'selected' ? Boolean(value) : value;
      if (field === 'start_time') nextValue = Util.normalizeStartTimeInput(value) || CONFIG.DEFAULT_START_TIME;
      if (field === 'start_time') this._refreshCountdown();
      this.state.taskConfigs[taskId] = { ...current, [field]: nextValue };
      if (field === 'click_mode') {
        const currentTaskConfig = document.querySelector('#biliauto-panel [data-ba="currentTaskConfig"]');
        if (taskId === (Util.extractTaskIdFromPage() || 'unknown_task')) {
          this.syncModeSwitch(currentTaskConfig, nextValue);
        }
      }
      if (field === 'click_mode' && nextValue === 'direct') {
        const confirmMsg = '⚠️ 风险提示：直接API模式下，你的IP将直接请求B站接口。\n\nB站频率限制为每秒1次，过快请求可能触发风控导致IP被封禁！\n\n建议配合代理或降低点击频率使用。\n\n是否继续使用直接API模式？';
        if (!confirm(confirmMsg)) {
          this.state.taskConfigs[taskId] = { ...current, click_mode: 'dom' };
          this.syncModeSwitch(
            document.querySelector('#biliauto-panel [data-ba="currentTaskConfig"]'),
            'dom'
          );
          this.saveTaskConfigs();
          if (!options.silent) this.setStatus('已切换回 DOM点击模式（安全模式）');
          return;
        }
      }
      this.saveTaskConfigs();
      if (taskId === (Util.extractTaskIdFromPage() || 'unknown_task')) {
        this.scheduleCurrentTask();
      }
      // 关键配置变更后立即回显规范化结果
      if (!options.silent) this.setStatus(`配置已保存：${field} = ${nextValue}`);
      if (!options.noRender && (field === 'selected' || field === 'start_time')) {
        this.renderList();
        this.render();
      }
    },

    setStatus(text) {
      const el = document.querySelector('#biliauto-panel [data-ba="status"]');
      if (el) {
        el.textContent = text || '';
        el.style.color = text && text.includes('失败') ? 'var(--tm-accent)' : '';
      }
      // 同时更新页面上替换的日志区域
      this.updatePageLog(text);
    },

    // 用日志面板替换领取须知内容区域，避免原节点残留空白
    injectLogPanel() {
      if (document.getElementById('biliauto-log-panel')) return;
      const targetEl = document.querySelector('#app > div > div.home-wrap.select-disable > section.notice-wrap > p.content')
        || document.querySelector('#app .notice-wrap p.content');
      if (!targetEl) {
        if (!this._logPanelMountTimer) {
          let attempts = 0;
          this._logPanelMountTimer = setInterval(() => {
            attempts += 1;
            if (document.getElementById('biliauto-log-panel') || attempts >= 80) {
              clearInterval(this._logPanelMountTimer);
              this._logPanelMountTimer = null;
              return;
            }
            this.injectLogPanel();
          }, 250);
        }
        return;
      }
      this._pageLogs = this._pageLogs || [];
      const panelHtml = Panel.getSubTemplate('logPanel').replace('<div class="tm-cyber-log-wrap">', '<div class="tm-cyber-log-wrap" id="biliauto-log-panel">');
      const mount = document.createElement('div');
      mount.innerHTML = panelHtml;
      const panelEl = mount.firstElementChild;
      if (!panelEl) return;
            targetEl.style.display = 'none';
      targetEl.insertAdjacentElement('afterend', panelEl);
      const recalBtn = document.getElementById('biliauto-recalibrate');
      if (recalBtn) { recalBtn.addEventListener('click', () => { recalBtn.style.opacity = '0.3'; ServerTime.calibrate().finally(() => { recalBtn.style.opacity = '0.6'; }); }); }
      this.updatePageLog('日志面板已替换领取须知内容区域');
    },
    
    _refreshCountdown() {
      if (this._countdownTimer) { clearInterval(this._countdownTimer); this._countdownTimer = null; }
      const el = document.getElementById('tm-log-countdown');
      if (!el) return;
      const tick = () => {
        const cdEl = document.getElementById('tm-log-countdown');
        if (!cdEl) { clearInterval(this._countdownTimer); this._countdownTimer = null; return; }
        const currentTaskId = Util.extractTaskIdFromPage() || 'unknown_task';
        const currentCfg = this.state.taskConfigs[currentTaskId];
        if (currentCfg && currentCfg.start_time) {
          const currentParsed = Util.parseTimeSpec(currentCfg.start_time, ServerTime.nowDate());
          if (currentParsed && Number.isFinite(currentParsed.delayMs)) {
            cdEl.textContent = (Math.max(0, currentParsed.delayMs) / 1000).toFixed(3);
            return;
          }
        }

        let bestDiff = null;
        for (const task of this.state.tasks) {
          const taskId = String(task.task_value || task.value || task.task_id || '');
          const cfg = this.state.taskConfigs[taskId];
          if (!cfg || !cfg.start_time) continue;
          const parsed = Util.parseTimeSpec(cfg.start_time, ServerTime.nowDate());
          if (!parsed || !Number.isFinite(parsed.delayMs)) continue;
          const diff = Math.max(0, parsed.delayMs);
          if (bestDiff === null || diff < bestDiff) bestDiff = diff;
        }
        cdEl.textContent = bestDiff !== null ? (bestDiff / 1000).toFixed(3) : '0.000';
      };
      tick(); // immediate update
      this._countdownTimer = setInterval(tick, 50);
    },
updatePageLog(text) {
      if (!document.getElementById('biliauto-log-panel')) {
        this.injectLogPanel();
      }
      if (text) {
        this._pageLogs = this._pageLogs || [];
        const time = new Date().toLocaleTimeString();
        this._pageLogs.push('[' + time + '] ' + text);
        if (this._pageLogs.length > 80) this._pageLogs = this._pageLogs.slice(-80);
      }
      const statusEl = document.getElementById('tm-log-status');
      if (statusEl && text) statusEl.textContent = text;
      const countEl = document.getElementById('tm-log-taskCount');
      if (countEl) countEl.textContent = String(this.state.tasks.length);
      const scrollEl = document.getElementById('tm-log-scroll');
      if (scrollEl) {
        scrollEl.textContent = (this._pageLogs && this._pageLogs.length) ? this._pageLogs.join('\n') : '[--:--:--] 等待中';
        scrollEl.scrollTop = scrollEl.scrollHeight;
      }
      if (!this._countdownTimer) { this._refreshCountdown(); }
    },

    toggle() {
      this.state.expanded = !this.state.expanded;
      GM_setValue('material_panel_visible', this.state.expanded);
      Util.log(`面板 ${this.state.expanded ? '展开' : '收起'}`);
      this.render();
    },

    close() {
      this.state.expanded = false;
      GM_setValue('material_panel_visible', false);
      Util.log('面板已关闭');
      this.render();
    },

    scheduleCurrentTask() {
      if (this._currentTaskTimer) {
        clearTimeout(this._currentTaskTimer);
        this._currentTaskTimer = null;
      }
      if (!this.state.baseConfig || this.state.running) return;
      const taskId = Util.extractTaskIdFromPage() || 'unknown_task';
      if (!taskId || taskId === 'unknown_task') return;
      const cfg = this.state.taskConfigs[taskId] || Util.defaultTaskConfig(taskId);
      const parsed = Util.parseTimeSpec(cfg.start_time || CONFIG.DEFAULT_START_TIME, ServerTime.nowDate());
      if (!parsed || !Number.isFinite(parsed.delayMs)) return;
      const delayMs = Math.max(0, parsed.delayMs);
      Util.log('schedule current task:', taskId, parsed.normalized, 'delay=', delayMs);
      this.updatePageLog('[AutoSchedule] task_id=' + taskId + ' start=' + parsed.normalized + ' countdown=' + (delayMs / 1000).toFixed(3) + 's');
      this._currentTaskTimer = setTimeout(async () => {
        this._currentTaskTimer = null;
        if (this.state.running) return;
	        try {
	          const latestCfg = this.syncCurrentTaskConfigFromInputs({ log: false }) || this.state.taskConfigs[taskId] || Util.defaultTaskConfig(taskId);
	          this.state.running = true;
	          this.setStatus('Auto run starting: ' + taskId);
	          const results = await runCurrentPageTask(this.state.baseConfig, taskId, latestCfg);
	          this.setStatus('上传结果中...');
	          await batchUploadAllResults(results);
	          this.setStatus('Auto run completed');
	        } catch (e) {
	          this.setStatus('Auto run failed: ' + (e.message || e));
	          Util.error('Auto run failed:', e);
	        } finally {
	          this.state.running = false;
	        }
      }, delayMs);
    },

    toggleDarkMode() {
      this.state.darkMode = !this.state.darkMode;
      GM_setValue('material_dark_mode', this.state.darkMode);
      GM_setValue('material_dark_mode_manual', true);
      this.applyTheme();
      const icon = document.querySelector('#biliauto-panel [data-ba="toggleDark"]');
      if (icon) icon.textContent = this.state.darkMode ? '☀️' : '🌙';
    },

    logout() {
      if (!confirm('确认退出登录？')) return;
      GM_setValue('qq_id', '');
      GM_setValue('account_name', '');
      GM_setValue('api_key', '');
      GM_setValue('device_id', '');
      CONFIG.QQ_ID = '';
      CONFIG.ACCOUNT_NAME = '';
      CONFIG.API_KEY = '';
      this.state.loginStatus = '';
      this.setStatus('已退出登录');
      const badge = document.querySelector('#biliauto-panel [data-ba="loginStatusBadge"]');
      if (badge) badge.style.display = 'none';
      this.showLoginOverlay();
      Util.info('用户已退出登录');
    },

    async copyPageInfo() {
      const title = document.title || '';
      const url = window.location.href;
      const text = `${title}\n${url}`;
      try {
        await navigator.clipboard.writeText(text);
        this.setStatus('已复制页面标题和链接');
      } catch {
        this.setStatus('复制失败');
      }
    },

    async refresh() {
      this.setStatus('正在获取服务端列表...');
      Util.info('面板: 获取服务端任务列表');
      try {
        const [baseResp, tasksResp] = await Promise.all([API.getBaseConfig(), API.getTasks()]);
        const config = API.unwrapConfig(baseResp);
        const tasks = tasksResp.status === 'success' ? tasksResp.data : [];
        this.setData(config, tasks);
        Util.info(`面板: 服务端列表获取完成 — ${tasks.length} 个任务`);
        if (tasks.length === 0) Util.warn('面板: 服务端任务列表为空');
        this.setStatus(`服务端列表：${this.state.tasks.length} 个任务`);
      } catch (e) {
        Util.warn('面板获取服务端列表失败:', e.message || e);
        this.setStatus('获取服务端列表失败：' + (e.message || e));
      }
    },

    addCustomTask() {
      const input = document.querySelector('#biliauto-panel [data-ba="addTaskInput"]');
      const taskId = input && input.value.trim();
      if (!taskId) {
        this.setStatus('请输入有效的 task_id');
        return;
      }
      if (this.state.taskConfigs[taskId]) {
        this.setStatus('任务已存在: ' + taskId);
        return;
      }
      this.state.taskConfigs[taskId] = Util.defaultTaskConfig(taskId);
      this.state.tasks.push({
        task_key: '自定义任务',
        task_value: taskId,
        id: 'custom-' + taskId
      });
      this.saveTaskConfigs();
      input.value = '';
      this.renderList();
      this.setStatus('已添加任务: ' + taskId);
    },

    removeTask(taskId) {
      if (!taskId) return;
      delete this.state.taskConfigs[taskId];
      this.state.tasks = this.state.tasks.filter(task => task.task_value !== taskId);
      this.saveTaskConfigs();
      this.renderList();
      this.setStatus('已删除任务: ' + taskId);
    },

    applyDefaults() {
      if (!confirm('将所有任务的配置重置为默认值？')) return;
      for (const taskId of Object.keys(this.state.taskConfigs)) {
        this.state.taskConfigs[taskId] = {
          ...Util.defaultTaskConfig(taskId),
          selected: this.state.taskConfigs[taskId].selected
        };
      }
      this.saveTaskConfigs();
      this.renderList();
      this.setStatus('已重置所有任务配置为默认值');
    },

    clearAllTasks() {
      if (!confirm('清空所有任务？此操作不可恢复。')) return;
      this.state.taskConfigs = {};
      this.state.tasks = [];
      this.saveTaskConfigs();
      this.renderList();
      this.setStatus('已清空所有任务');
    },

    async testClick() {
      if (!this.state.baseConfig || !this.state.baseConfig.reward_claim_selector) {
        this.setStatus('缺少领取按钮选择器配置');
        return;
      }
      const selector = this.state.baseConfig.reward_claim_selector;
      const btn = Util.getByXPath(selector);
      if (!btn) {
        this.setStatus('未找到领取按钮');
        return;
      }
      Executor.activateButton(btn);
      btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await Util.sleep(300);
      const beforeText = Util.text(btn);
      btn.click();
      const afterText = Util.text(btn);
      const msg = `测试点击已执行：仅测试按钮响应，不保存/覆盖任务配置。按钮文本：${beforeText || '空'} -> ${afterText || '空'}`;
      this.setStatus(msg);
      this.updatePageLog(`【测试点击】${msg}`);
      Util.info('测试点击:', msg);
    },

    async runCurrent() {
      if (this.state.running) {
        this.setStatus('正在执行中...');
        return;
      }
      if (!this.state.baseConfig || !this.state.baseConfig.reward_claim_selector) {
        this.setStatus('缺少领取按钮选择器配置');
        return;
      }
      const taskId = Util.extractTaskIdFromPage() || 'unknown_task';
      const cfg = this.syncCurrentTaskConfigFromInputs({ log: true }) || this.state.taskConfigs[taskId] || Util.defaultTaskConfig(taskId);
      this.state.running = true;
      this.setStatus(`准备执行任务: ${taskId}`);
	      Util.info(`面板: 执行当前页面任务: ${taskId}`);
	      try {
	        const results = await runCurrentPageTask(this.state.baseConfig, taskId, cfg);
	        this.setStatus('上传结果中...');
	        await batchUploadAllResults(results);
	        this.setStatus('执行完成');
	      } catch (e) {
	        this.setStatus('执行失败: ' + (e.message || e));
	        Util.error('执行失败:', e);
	      } finally {
	        this.state.running = false;
	      }
    },

    showLoginOverlay(reason) {
      let o = document.getElementById('biliauto-login-overlay');
      if (o) { o.style.display = 'flex'; o.classList.add('tm-overlay-visible'); return; }
      o = document.createElement('div');
      o.id = 'biliauto-login-overlay';
      o.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(5,8,22,0.85);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;font-family:var(--tm-font,Inter,sans-serif);padding:16px;';
      const c = document.createElement('div');
      c.style.cssText = 'width:min(420px,92vw);background:rgba(15,23,42,0.95);color:rgba(255,255,255,0.87);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:28px;box-shadow:0 25px 60px rgba(0,0,0,0.5);text-align:left;';
      c.innerHTML = Panel.getSubTemplate('loginOverlay');
      const reasonEl = c.querySelector('#tmpl-loginReason');
      if (reason && reasonEl) reasonEl.textContent = this.escape(reason);
      o.appendChild(c);
      document.documentElement.appendChild(o);
      requestAnimationFrame(() => o.classList.add('tm-overlay-visible'));
      o.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-ba="startLogin"]');
        if (btn) this.startLogin();
      });
    },

    hideLoginOverlay() {
      const overlay = document.getElementById('biliauto-login-overlay');
      if (overlay) {
        overlay.classList.remove('tm-overlay-visible');
        setTimeout(() => overlay.remove(), 400);
      }
    },

    async startLogin() {
      var btn = document.querySelector('#biliauto-login-overlay [data-ba="startLogin"]');
      if (btn) { btn.disabled = true; btn.textContent = '获取中...'; btn.style.opacity = '0.65'; }
      var display = document.querySelector('#biliauto-login-overlay [data-ba="loginCodeDisplay"]');
      var statusEl = document.querySelector('#biliauto-login-overlay [data-ba="loginStatus"]');
      if (!display || !statusEl) return;

      statusEl.textContent = '正在获取验证码...';
      statusEl.style.color = '';

      try {
        const resp = await API.request('POST', '/api/auth/qq-login');
        const code = resp && resp.data && resp.data.code;
        if (!code) {
          statusEl.textContent = '获取验证码失败，请重试';
          statusEl.style.color = '#d33';
          if (btn) { btn.disabled = false; btn.textContent = '重新获取验证码'; btn.style.opacity = '1'; }
          return;
        }
        this.state.loginCode = code;
        // 逐位填入验证码
        const chars = display.querySelectorAll('.cyber-login-code-char');
        const codeStr = String(code);
        if (chars && chars.length) {
          chars.forEach((el, i) => { el.textContent = codeStr[i] || '-'; });
        } else {
          display.textContent = codeStr;
        }
        if (btn) { btn.textContent = '等待验证中'; }
        statusEl.textContent = '已生成验证码，请发送到群聊 1082333812';
        this.pollLoginStatus(code);
      } catch (e) {
        statusEl.textContent = '网络错误: ' + (e.message || '');
        statusEl.style.color = '#d33';
        if (btn) { btn.disabled = false; btn.textContent = '重新获取验证码'; btn.style.opacity = '1'; }
      }
    },

    showForceUpdateOverlay(updateInfo) {
      let o = document.getElementById('biliauto-force-update-overlay');
      if (o) { o.style.display = 'flex'; return; }
      o = document.createElement('div');
      o.id = 'biliauto-force-update-overlay';
      o.style.cssText = 'position:fixed;inset:0;z-index:2147483647;background:rgba(5,8,22,0.85);backdrop-filter:blur(12px);display:flex;align-items:center;justify-content:center;font-family:var(--tm-font,Inter,sans-serif);padding:16px;';
      const c = document.createElement('div');
      c.style.cssText = 'width:min(440px,92vw);background:rgba(15,23,42,0.95);color:rgba(255,255,255,0.87);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:28px;box-shadow:0 25px 60px rgba(0,0,0,0.5);text-align:center;';
      c.innerHTML = '<div style="font-size:22px;font-weight:600;margin-bottom:8px;">需要更新</div>'
        + '<div style="font-size:14px;color:rgba(255,255,255,0.55);margin-bottom:4px;">当前版本 <span style="font-family:monospace">' + CONFIG.VERSION + '</span></div>'
        + '<div style="font-size:14px;color:rgba(255,255,255,0.55);margin-bottom:16px;">最新版本 <span style="font-family:monospace">' + (updateInfo && updateInfo.version || '') + '</span></div>'
        + '<div style="font-size:13px;color:rgba(251,191,36,0.85);line-height:1.6;margin-bottom:20px;white-space:pre-wrap;text-align:left;">' + (updateInfo && updateInfo.description || '请更新客户端') + '</div>'
        + '<a href="' + (updateInfo && updateInfo.download_url || '#') + '" target="_blank" style="display:inline-block;padding:10px 28px;border-radius:10px;background:rgb(251,191,36);color:rgb(0,0,0);font-weight:500;text-decoration:none;">立即更新</a>';
      o.appendChild(c);
      document.documentElement.appendChild(o);
    },


    async pollLoginStatus(code) {
      var statusEl = document.querySelector('#biliauto-login-overlay [data-ba="loginStatus"]');
      for (var pi = 0; pi < 120; pi++) {
        await new Promise(function(r) { setTimeout(r, 2500); });
        try {
          var resp = await API.request('GET', '/api/auth/qq-status?code=' + code);
          Util.log('轮询响应:', JSON.stringify(resp).slice(0, 300));
          var data = resp && resp.data;
          if (!data) {
            if (statusEl) statusEl.textContent = '等待验证... (响应异常)';
            continue;
          }
          if (data.status === 'verified') {
            const qqId = data.qq_id || '';
            const apiKey = data.api_key || '';
            const accountName = data.account_name || data.display_name || data.nickname || data.username || qqId;
            if (qqId && apiKey) {
              await this.saveLoginData(qqId, apiKey, accountName);
            }
            if (statusEl) {
              statusEl.textContent = '✅ 登录成功！';
              statusEl.style.color = '#4caf50';
            }
            return;
          } else if (data.status === 'expired' || data.status === 'invalid') {
            if (statusEl) {
              statusEl.textContent = '验证码已过期，点击重新获取';
              statusEl.style.color = '#d33';
            }
            this.showRetryLogin();
            return;
          }
        } catch (e) {
          Util.log('轮询登录状态失败:', e);
        }
      }
      if (statusEl) {
        statusEl.textContent = '登录超时，点击重新获取';
        statusEl.style.color = '#d33';
      }
      this.showRetryLogin();
    },

    showRetryLogin() {
      const btn = document.querySelector('#biliauto-login-overlay [data-ba="startLogin"]');
      if (btn) {
        btn.style.display = '';
        btn.textContent = '重新获取验证码';
      }
    },

    async saveLoginData(qqId, apiKey, accountName) {
      CONFIG.QQ_ID = qqId;
      CONFIG.API_KEY = apiKey;
      CONFIG.ACCOUNT_NAME = accountName || qqId;
      CONFIG.DEVICE_ID = qqId;
      GM_setValue('qq_id', qqId);
      GM_setValue('api_key', apiKey);
      GM_setValue('account_name', CONFIG.ACCOUNT_NAME);
      GM_setValue('device_id', qqId);
      this.state.loginStatus = 'logged_in';
      this.hideLoginOverlay();
      const badge = document.querySelector('#biliauto-panel [data-ba="loginStatusBadge"]');
      if (badge) {
        badge.textContent = '✅ ' + (CONFIG.ACCOUNT_NAME || qqId);
        badge.style.display = '';
      }
      this.setStatus('✅ 已登录');
      Util.info('登录完成');
      if (Util.notify) Util.notify('BiliAuto 登录成功', '已完成授权');
      await new Promise(r => setTimeout(r, 500));
      main();
    },

    jumpManual() {
      const input = document.querySelector('#biliauto-panel [data-ba="manual"]');
      this.jump(input && input.value.trim());
    },

    jump(taskId) {
      const baseUrl = this.state.baseConfig && this.state.baseConfig.reward_base_url || 'https://www.bilibili.com/blackboard/era/award-exchange.html';
      const url = Util.buildRewardUrl(baseUrl, taskId);
      if (!url) {
        this.setStatus('缺少 task_id 或基础 URL');
        return;
      }
      location.href = url;
    },

    async copy(taskId) {
      try {
        await navigator.clipboard.writeText(taskId);
        this.setStatus('已复制：' + taskId);
      } catch {
        this.setStatus('复制失败');
      }
    },

    async runSelected(onlyTaskIds = null) {
      if (this.state.running) return;
      const selected = this.state.tasks.filter(task => {
        const taskId = task.task_value;
        if (onlyTaskIds) return onlyTaskIds.includes(taskId);
        const cfg = this.state.taskConfigs[taskId] || Util.defaultTaskConfig(taskId);
        return !!cfg.selected;
      });
      if (!selected.length) {
        this.setStatus('没有可执行的任务');
        return;
      }
      this.state.running = true;
      Util.info(`面板: 执行 ${selected.length} 个任务${onlyTaskIds ? ' (指定ID)' : ''}`);
      this.setStatus(`准备执行 ${selected.length} 个任务...`);
      const baseUrl = this.state.baseConfig && this.state.baseConfig.reward_base_url || 'https://www.bilibili.com/blackboard/era/award-exchange.html';
      const currentTask = Util.extractTaskIdFromPage();
      const current = selected.find(task => task.task_value === currentTask);
      const others = selected.filter(task => task.task_value !== currentTask);
      Util.log(`面板: 当前页面任务=${currentTask}, 其余=${others.length} 个将在新标签页打开`);
      for (let i = 0; i < others.length; i++) {
        const url = Util.buildRewardUrl(baseUrl, others[i].task_value);
        Util.log(`面板: 打开新标签页 [${i + 1}/${others.length}]: ${others[i].task_value}`);
        setTimeout(() => window.open(url, '_blank'), i * 2000);
      }
	      if (current) {
	        const currentCfg = this.syncCurrentTaskConfigFromInputs({ log: true }) || this.state.taskConfigs[current.task_value] || Util.defaultTaskConfig(current.task_value);
	        Util.log(`面板: 执行当前页面任务: ${current.task_value}`);
	        const results = await runCurrentPageTask(this.state.baseConfig, current.task_value, currentCfg);
	        this.setStatus('上传结果中...');
	        await batchUploadAllResults(results);
	      }
	      this.state.running = false;
      Util.info('面板: 全部执行触发完成');
      this.setStatus('执行触发完成');
    },

    render() {
      const panel = document.getElementById('biliauto-panel');
      const fab = document.getElementById('biliauto-fab');
      if (!panel || !fab) return;

      panel.classList.toggle('tm-panel-visible', this.state.expanded);
      fab.classList.toggle('tm-fab-hidden', this.state.expanded);
      this.applyTheme();

      const meta = panel.querySelector('[data-ba="meta"]');
      const currentTask = Util.extractTaskIdFromPage() || '未识别';
      const baseUrl = this.state.baseConfig && this.state.baseConfig.reward_base_url || '未加载';
      if (meta) {
        meta.innerHTML = this.getSubTemplate('meta', {
          CURRENT_TASK: this.escape(currentTask),
          BASE_URL: this.escape(baseUrl)
        });
      }

      // 渲染当前页面配置
      const currentConfigEl = panel.querySelector('[data-ba="currentTaskConfig"]');
      if (currentConfigEl && currentTask !== '未识别') {
        const cfg = this.state.taskConfigs[currentTask] || Util.defaultTaskConfig(currentTask);
        const startTimeInput = currentConfigEl.querySelector('[data-field="start_time"]');
        const intervalInput = currentConfigEl.querySelector('[data-field="interval"]');
        const durationInput = currentConfigEl.querySelector('[data-field="duration"]');
        if (startTimeInput) startTimeInput.value = cfg.start_time || CONFIG.DEFAULT_START_TIME;
        if (intervalInput) intervalInput.value = cfg.interval || CONFIG.DEFAULT_CLICK_INTERVAL_MS / 1000;
        if (durationInput) durationInput.value = cfg.duration || CONFIG.DEFAULT_CLICK_DURATION_MS / 1000;
        this.syncModeSwitch(currentConfigEl, cfg.click_mode || CONFIG.DEFAULT_CLICK_MODE);
      }

      const countEl = panel.querySelector('[data-ba="taskCount"]');
      if (countEl) countEl.textContent = `${this.state.tasks.length} 个任务`;

      const darkIcon = panel.querySelector('[data-ba="toggleDark"]');
      if (darkIcon) darkIcon.textContent = this.state.darkMode ? '☀️' : '🌙';

      this.renderList();
    },

    renderList() {
      var list = document.querySelector('#biliauto-panel [data-ba="list"]');
      if (!list) return;
      var keyword = this.state.filter;
      var allTasks = this.state.tasks;
      var filtered = [];
      for (var fi = 0; fi < allTasks.length; fi++) {
        var t = allTasks[fi];
        var text = (t.task_key || '') + ' ' + (t.task_value || '');
        if (!keyword || text.toLowerCase().indexOf(keyword) >= 0) {
          filtered.push(t);
        }
      }
      if (!filtered.length) {
        list.innerHTML = this.getSubTemplate('emptyList');
        return;
      }
      var PER_PAGE = 10;
      var totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
      var page = this.state._page || 1;
      if (page > totalPages) page = totalPages;
      if (page < 1) page = 1;
      this.state._page = page;
      var startIdx = (page - 1) * PER_PAGE;
      var pageTasks = filtered.slice(startIdx, startIdx + PER_PAGE);
      var html = '';
      html += this.getSubTemplate('pagination', {
        COUNT: filtered.length,
        PAGE: page,
        TOTAL_PAGES: totalPages,
        PREV_DISABLED: page <= 1 ? ' disabled style="opacity:0.4"' : '',
        NEXT_DISABLED: page >= totalPages ? ' disabled style="opacity:0.4"' : ''
      });
      for (var ti = 0; ti < pageTasks.length; ti++) {
        var task = pageTasks[ti];
        var taskId = String(task.task_value || task.value || task.task_id || '');
        var name = String(task.task_key || task.name || task.id || '未命名任务');
        var cfg = this.state.taskConfigs[taskId] || Util.defaultTaskConfig(taskId);
        html += this.getSubTemplate('listItem', {
          NAME: this.escape(name),
          TASK_ID: this.escapeAttr(taskId),
          START_TIME: this.escapeAttr(cfg.start_time),
          INTERVAL: this.escapeAttr(String(cfg.interval)),
          DURATION: this.escapeAttr(String(cfg.duration))
        });
      }
      list.innerHTML = html;
    },

    escape(text) {
      return String(text).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
    },

    escapeAttr(text) {
      return this.escape(text).replace(/'/g, '&#39;');
    },

    getSubTemplate(name, vars) {
      if (!this._parsedTemplates) {
        this._parsedTemplates = {};
        const parser = new DOMParser();
        const doc = parser.parseFromString(this.template(), 'text/html');
        doc.querySelectorAll('template[id^="tmpl-"]').forEach(el => {
          this._parsedTemplates[el.id.replace('tmpl-', '')] = el.innerHTML;
        });
      }
      let html = this._parsedTemplates[name] || '';
      if (vars) {
        Object.keys(vars).forEach(key => {
          html = html.replace(new RegExp('\\{\\{' + key + '\\}\\}', 'g'), vars[key]);
        });
      }
      return html;
    }
  };

  // ========================
  // 领取接口监控 + 任务信息捕获
  // ========================
  const RewardMonitor = {
    RECEIVE_API_PATH: '/x/activity_components/mission/receive',
    INFO_API_PATH: '/x/activity_components/mission/info',
    cache: {},
    responseCache: {},
    missionInfo: {},
    installed: false,

    install() {
      if (this.installed) return;
      this.installed = true;
      this._installMessageBridge();
      this._installUnsafeWindowHook();
      this._injectPageHook();
      this._setupPerformanceObserver();
      Util.info('RewardMonitor installed: page-context fetch/XHR hook enabled');
    },

    _installMessageBridge() {
      if (this._messageBridgeInstalled) return;
      this._messageBridgeInstalled = true;
      window.addEventListener('message', (event) => {
        const data = event.data || {};
        if (data.source !== 'BILIAUTO_REWARD_MONITOR' || !data.payload) return;
        const payload = data.payload;
        const text = payload.text || '';
        let json = null;
        try {
          json = text ? JSON.parse(text) : null;
        } catch (e) {
          Util.warn(`RewardMonitor response JSON parse failed: ${e.message}`);
          return;
        }
        Util.log(`RewardMonitor captured ${payload.kind}: ${payload.url} status=${payload.status}`);
        if (payload.kind === 'receive') {
          this.save(payload.taskId || this.currentTaskId(), json, payload.url, payload.status);
        } else if (payload.kind === 'info') {
          this.saveMissionInfo(json, payload.url);
        } else if (payload.kind === 'mylist') {
          this.saveMyList(json, payload.url, payload.status);
        }
      });
    },

    _installUnsafeWindowHook() {
      try {
        const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : null;
        if (!pageWindow || pageWindow.__BILIAUTO_REWARD_HOOK_INSTALLED__) return false;
        pageWindow.__BILIAUTO_REWARD_HOOK_INSTALLED__ = true;
        const apiPrefix = '/x/activity_components/mission/';
        const getUrl = (input) => {
          if (typeof input === 'string') return input;
          if (input && input.url) return input.url;
          return '';
        };
        const getKind = (url) => {
          if (!url || url.indexOf(apiPrefix) === -1) return '';
          if (url.indexOf('/mission/receive') !== -1) return 'receive';
          if (url.indexOf('/mission/info') !== -1) return 'info';
          if (url.indexOf('/mission/mylist') !== -1) return 'mylist';
          return 'mission';
        };
        const readTaskId = (url, body) => {
          try {
            const fromUrl = new URL(url, location.href).searchParams.get('task_id');
            if (fromUrl) return fromUrl;
          } catch {}
          try {
            if (typeof body === 'string') return new URLSearchParams(body).get('task_id') || '';
            if (pageWindow.URLSearchParams && body instanceof pageWindow.URLSearchParams) return body.get('task_id') || '';
            if (pageWindow.FormData && body instanceof pageWindow.FormData) return body.get('task_id') || '';
          } catch {}
          return '';
        };
        const post = (kind, url, status, text, body) => {
          pageWindow.postMessage({
            source: 'BILIAUTO_REWARD_MONITOR',
            payload: {
              kind,
              url,
              status,
              text: text || '',
              taskId: readTaskId(url, body)
            }
          }, '*');
        };
        if (pageWindow.fetch) {
          const rawFetch = pageWindow.fetch;
          pageWindow.fetch = function (input, init) {
            const url = getUrl(input);
            const body = init && init.body;
            const kind = getKind(url);
            return rawFetch.apply(this, arguments).then((resp) => {
              if (kind) {
                try {
                  resp.clone().text().then((text) => post(kind, url, resp.status, text, body)).catch(() => {});
                } catch {}
              }
              return resp;
            });
          };
        }
        if (pageWindow.XMLHttpRequest) {
          const RawXHR = pageWindow.XMLHttpRequest;
          const rawOpen = RawXHR.prototype.open;
          const rawSend = RawXHR.prototype.send;
          RawXHR.prototype.open = function (method, url) {
            this.__biliautoUrl = url || '';
            this.__biliautoMethod = method || '';
            return rawOpen.apply(this, arguments);
          };
          RawXHR.prototype.send = function (body) {
            const xhr = this;
            const url = xhr.__biliautoUrl || '';
            const kind = getKind(url);
            if (kind) {
              xhr.addEventListener('loadend', function () {
                post(kind, url, xhr.status, xhr.responseText || '', body);
              });
            }
            return rawSend.apply(this, arguments);
          };
        }
        Util.info('RewardMonitor unsafeWindow hook installed');
        // 暴露直接调用 B站 receive 的函数，绕过 1s throttle
        // 保留 isExchangeLoading 检查防止并发请求
        pageWindow.__biliauto_receive_direct = function(source) {
          var setReason = function(reason) {
            pageWindow.__biliauto_receive_direct_last_reason = reason || 'unknown';
          };
          try {
            var appEl = document.querySelector('#app');
            if (!appEl || !appEl.__vue__) {
              setReason('#app or __vue__ not found');
              Util.warn('direct mode: #app or __vue__ not found');
              return false;
            }
            var root = appEl.__vue__;
            var visited = [];
            var findReceiveComponent = function(vm) {
              if (!vm || visited.indexOf(vm) >= 0) return null;
              visited.push(vm);
              if (typeof vm.handelReceive === 'function') return vm;
              var children = vm.$children || [];
              for (var i = 0; i < children.length; i++) {
                var found = findReceiveComponent(children[i]);
                if (found) return found;
              }
              return null;
            };
            var indexComp = findReceiveComponent(root);
            if (!indexComp || typeof indexComp.handelReceive !== 'function') {
              setReason('component with handelReceive not found');
              Util.warn('direct mode: component with handelReceive not found');
              return false;
            }
            if (indexComp.isExchangeLoading) {
              setReason('blocked by isExchangeLoading');
              Util.log('direct mode: blocked by isExchangeLoading');
              return false; // ??????????
            }
            indexComp.handelReceive(source || 'script');
            setReason('handelReceive invoked');
            Util.log('direct mode: handelReceive invoked');
            return true;
          } catch (err) {
            var message = err && err.message || String(err);
            setReason('invoke failed: ' + message);
            Util.warn('direct mode invoke failed: ' + message);
            return false;
          }
        };
        return true;
      } catch (e) {
        Util.warn(`RewardMonitor unsafeWindow hook failed: ${e.message}`);
        return false;
      }
    },

    _injectPageHook() {
      if (document.getElementById('biliauto-reward-page-hook')) return;
      const code = `
        ;(function () {
          if (window.__BILIAUTO_REWARD_HOOK_INSTALLED__) return;
          window.__BILIAUTO_REWARD_HOOK_INSTALLED__ = true;
          var SOURCE = 'BILIAUTO_REWARD_MONITOR';
          var API_PREFIX = '/x/activity_components/mission/';
          function getUrl(input) {
            if (typeof input === 'string') return input;
            if (input && input.url) return input.url;
            return '';
          }
          function getKind(url) {
            if (!url || url.indexOf(API_PREFIX) === -1) return '';
            if (url.indexOf('/mission/receive') !== -1) return 'receive';
            if (url.indexOf('/mission/info') !== -1) return 'info';
            if (url.indexOf('/mission/mylist') !== -1) return 'mylist';
            return 'mission';
          }
          function readTaskId(url, body) {
            try {
              var u = new URL(url, location.href);
              var fromUrl = u.searchParams.get('task_id');
              if (fromUrl) return fromUrl;
            } catch (e) {}
            try {
              if (typeof body === 'string') return new URLSearchParams(body).get('task_id') || '';
              if (body instanceof URLSearchParams) return body.get('task_id') || '';
              if (body instanceof FormData) return body.get('task_id') || '';
            } catch (e) {}
            return '';
          }
          function post(kind, url, status, text, body) {
            try {
              window.postMessage({
                source: SOURCE,
                payload: {
                  kind: kind,
                  url: url,
                  status: status,
                  text: text || '',
                  taskId: readTaskId(url, body)
                }
              }, '*');
            } catch (e) {}
          }
          if (window.fetch) {
            var rawFetch = window.fetch;
            window.fetch = function (input, init) {
              var url = getUrl(input);
              var body = init && init.body;
              var kind = getKind(url);
              return rawFetch.apply(this, arguments).then(function (resp) {
                if (kind) {
                  try {
                    resp.clone().text().then(function (text) {
                      post(kind, url, resp.status, text, body);
                    }).catch(function () {});
                  } catch (e) {}
                }
                return resp;
              });
            };
          }
          if (window.XMLHttpRequest) {
            var RawXHR = window.XMLHttpRequest;
            var rawOpen = RawXHR.prototype.open;
            var rawSend = RawXHR.prototype.send;
            RawXHR.prototype.open = function (method, url) {
              this.__biliautoUrl = url || '';
              this.__biliautoMethod = method || '';
              return rawOpen.apply(this, arguments);
            };
            RawXHR.prototype.send = function (body) {
              var xhr = this;
              var url = xhr.__biliautoUrl || '';
              var kind = getKind(url);
              if (kind) {
                xhr.addEventListener('loadend', function () {
                  post(kind, url, xhr.status, xhr.responseText || '', body);
                });
              }
              return rawSend.apply(this, arguments);
            };
          }
        })();
      `;
      const script = document.createElement('script');
      script.id = 'biliauto-reward-page-hook';
      script.textContent = code;
      (document.documentElement || document.head || document).appendChild(script);
      script.remove();
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
        response.text().then(text => {
          Util.log(`  receive 响应内容(${text.length}字符): ${text.slice(0, 300)}`);
          try {
            const json = JSON.parse(text);
            this.save(this.currentTaskId(), json, url, response.status);
          } catch (e) {
            Util.warn(`  receive 响应JSON解析失败: ${e.message}`);
          }
        }).catch(e => Util.warn(`  receive 响应读取失败: ${e.message}`));
      } else if (url.includes(this.INFO_API_PATH)) {
        Util.log(`捕获 fetch info API: ${url} status=${response.status}`);
        response.text().then(text => {
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
      const awardDesc = data.reward_info && data.reward_info.award_description || '';
      Util.log(`  info 数据解析: task_id="${taskId}" task_name="${taskName}" act_name="${actName}" award_name="${awardName}"`);
      if (taskId && taskName) {
        this.missionInfo[taskId] = {
          task_id: taskId,
          task_name: taskName,
          act_name: actName,
          award_name: awardName,
          award_description: awardDesc
        };
        Util.info(`任务信息已捕获: [${taskId}] ${actName ? actName + ' - ' : ''}${taskName}${awardName ? ' [' + awardName + ']' : ''}`);
        if (awardDesc) {
          const firstSeenAt = Util.formatTime(ServerTime.nowDate());
          API.submitAwardDescription(taskId, awardDesc, firstSeenAt).then(resp => {
            if (resp && resp.status === 'success' && resp.task_parsed && resp.task_parsed.daily_claim_time && resp.task_parsed.daily_claim_time !== '不限') {
              const ct = resp.task_parsed.daily_claim_time;
              const p = ct.split(':');
              const adjusted = p[0] + ':' + p[1] + ':57';
              Util.info(`AI解析: 自动设置抢码时间 ${ct} -> ${adjusted}（提前3秒）`);
              Panel.updateTaskConfig(taskId, 'start_time', adjusted, { silent: true, noRender: true });
            }
          }).catch(e => {
            Util.log(`提交奖励说明失败: ${e.message || e}`);
          });
        }
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
        award_info: info.award_name || info.task_name || '',
        award_description: info.award_description || ''
      };
    },

    saveMyList(json, url, statusCode) {
      const data = json && json.data;
      const list = data && Array.isArray(data.list) ? data.list : [];
      this.myList = data || {};
      Util.log(`RewardMonitor mylist captured: count=${list.length} status=${statusCode}`);
      for (const item of list) {
        const cdkey = item && item.extra_info && item.extra_info.cdkey_content || '';
        if (!cdkey) continue;
        const logMsg = `【领奖记录】award_id=${item.award_id || ''} type=${item.type || ''} cdkey=${cdkey}`;
        Util.log(logMsg);
        if (Panel && Panel.updatePageLog) Panel.updatePageLog(logMsg);
      }
      if (!list.length && Panel && Panel.updatePageLog) {
        Panel.updatePageLog('【领奖记录】未找到已领取记录');
      }
      return data;
    },

    save(taskId, respJson, url, statusCode) {
      const task = Util.findTaskById(Panel.state.tasks, taskId);
      const taskName = this.getMissionName(taskId) || Util.getTaskName(task);
      const code = respJson ? respJson.code : undefined;
      const message = respJson && (respJson.message || respJson.msg) || '';
      const cdkey = respJson && respJson.data && respJson.data.extra_info && respJson.data.extra_info.cdkey_content || '';
      let status = '失败';
      let reason = '';
      if (code === 0) {
        status = '成功';
        reason = cdkey ? `领取成功 CDK=${cdkey}` : '领取成功';
      } else if (code === 202032) {
        reason = '无资格领取奖励';
      } else if (code === 202031) {
        reason = '奖励已被领完';
      } else if (code === 202033) {
        reason = '活动未开始';
      } else if (code === 202034) {
        reason = '活动已结束';
      } else if (code === -400) {
        reason = '请求参数错误';
      } else if (code === -101) {
        reason = '未登录或登录失效';
      } else if (code === -403) {
        reason = '访问被拒绝';
      } else if (code === 404) {
        reason = '接口不存在';
      } else {
        reason = message || '未知错误';
      }
      const logEntry = {
        task_id: taskId,
        task_name: taskName,
        status,
        response_code: code,
        message: reason || message,
        cdkey,
        timestamp: Util.formatTime(),
        device_name: CONFIG.DEVICE_NAME,
        url,
        status_code: statusCode
      };
      const responses = this.responseCache[taskId] || [];
      responses.push(logEntry);
      this.responseCache[taskId] = responses;

      const previous = this.cache[taskId];
      const isSuccess = code === 0;
      const wasAlreadySuccess = previous && previous.response_code === 0;
      const isDuplicate = wasAlreadySuccess && isSuccess;
      if (!previous || (isSuccess && !wasAlreadySuccess) || (!isSuccess && !wasAlreadySuccess && previous.response_code !== 0)) {
        this.cache[taskId] = { ...logEntry, responses };
      } else if (previous && wasAlreadySuccess && !isSuccess) {
        return;
      } else {
        previous.responses = responses;
      }
      if (isDuplicate) return;
      const logMsg = `【API响应】task_id=${taskId} code=${code} status=${status} msg=${reason || message}`;
      Util.log(logMsg);
      Util.log('原始响应:', respJson);
      if (Panel && Panel.updatePageLog) {
        Panel.updatePageLog(logMsg);
      }
      if (isSuccess && !wasAlreadySuccess) {
        Util.notify('抢码成功', `[${taskName || taskId}] ${reason}`);
      }
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
        cdkey: captured.cdkey || '',
        timestamp: captured.timestamp,
        device_name: captured.device_name
      };
    },

    get(taskId) {
      return this.cache[taskId];
    },

    clear(taskId) {
      if (!taskId) return;
      delete this.cache[taskId];
      delete this.responseCache[taskId];
    },

    waitForReceive(taskId, timeoutMs = 5000) {
      const existing = this.get(taskId);
      if (existing) return Promise.resolve(existing);
      return new Promise(resolve => {
        const startedAt = Date.now();
        const timer = setInterval(() => {
          const captured = this.get(taskId);
          if (captured || Date.now() - startedAt >= timeoutMs) {
            clearInterval(timer);
            resolve(captured || null);
          }
        }, 50);
      });
    }
  };
  RewardMonitor.install();

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
      const taskId = RewardMonitor.currentTaskId();
      // 从任务配置读取点击模式（默认dom保证安全）
      const taskCfg = Panel && Panel.state && Panel.state.taskConfigs && Panel.state.taskConfigs[taskId];
      const clickMode = (taskCfg && taskCfg.click_mode) || CONFIG.DEFAULT_CLICK_MODE;
      const isDirectMode = clickMode === 'direct';
      const logToPanel = (msg) => {
        if (Panel && Panel.updatePageLog) {
          Panel.updatePageLog(msg);
        }
      };
      Util.info(`开始连点: selector=${selector}, interval=${intervalMs}ms, duration=${durationMs}ms, mode=${clickMode}, 结束时间=${Util.formatTime(new Date(endTime))}`);
      logToPanel(`【连点开始】task_id=${taskId} 间隔=${intervalMs}ms 时长=${(durationMs / 1000).toFixed(3)}秒`);
      const btn = Util.getByXPath(selector);
      /*
       * 原始 DOM 判断方式暂时注释，等 API hook 结果验证稳定后删除。
       * const isSuccessText = (el) => el && (el.textContent || '').includes('查看奖励');
       */
      if (btn) Executor.activateButton(btn);
      return new Promise((resolve) => {
        let lastLogTime = 0;
        const timer = setInterval(() => {
          const now = Date.now();
          const remaining = Math.max(0, endTime - now);
          logToPanel(`【连点倒计时】${(remaining / 1000).toFixed(3)}s`);
          const captured = RewardMonitor.get(taskId);
          if (captured && captured._continuedClickLogged !== true) {
            captured._continuedClickLogged = true;
            const summary = `【API 捕获】/mission/receive 响应 code=${captured.response_code}`;
            Util.info(summary);
            logToPanel(summary);
          }
          /*
           * 原始 DOM 判断方式暂时注释，当前只以 /mission/receive API 响应为准。
          if (isSuccessText(btn)) {
            clearInterval(timer);
            const summary = `【DOM 检测】按钮文字已变为"查看奖励"，领取成功`;
            Util.info(summary);
            logToPanel(summary);
            resolve({ success_count: successCount, fail_count: failCount, early_exit: true });
            return;
          }
           */
          if (now >= endTime) {
            clearInterval(timer);
            const summary = `【连点结束】成功 ${successCount} 次, 失败 ${failCount} 次, 总点击 ${successCount + failCount} 次`;
            Util.info(summary);
            logToPanel(summary);
            resolve({ success_count: successCount, fail_count: failCount });
            return;
          }
          try {
            if (isDirectMode) {
              // 直接API模式：绕过B站1s throttle，通过Vue组件直接调用handelReceive
              const directFn = typeof unsafeWindow !== 'undefined' && unsafeWindow.__biliauto_receive_direct;
              if (directFn && directFn('user')) {
                successCount++;
              } else {
                failCount++;
                const reason = typeof unsafeWindow !== 'undefined' && unsafeWindow.__biliauto_receive_direct_last_reason;
                if (reason && now - lastLogTime > 500) {
                  Util.log('direct mode attempt failed: ' + reason);
                }
              }
            } else {
              // DOM点击模式（低风险）：使用原始按钮点击，受B站1s限制
              if (btn) {
                btn.click();
                successCount++;
              } else {
                failCount++;
              }
            }
          } catch {
            failCount++;
          }
          if (now - lastLogTime > 2000) {
            lastLogTime = now;
            const elapsed = ((now - (endTime - durationMs)) / 1000).toFixed(3);
            const progressMsg = `【连点进度】${elapsed}s / ${(durationMs / 1000).toFixed(3)}s 成功 ${successCount} 失败 ${failCount}`;
            Util.log(progressMsg);
            logToPanel(progressMsg);
          }
        }, intervalMs);
      });
    },

    async judgeClaimResult(btn, taskId) {
      Util.log(`判断领取结果: task_id=${taskId}（API hook 模式）`);
      const logToPanel = (msg) => {
        if (Panel && Panel.updatePageLog) {
          Panel.updatePageLog(msg);
        }
      };
      const captured = await RewardMonitor.waitForReceive(taskId, 5000);
      if (captured) {
        const ok = captured.response_code === 0;
        const resultMsg = `API领取结果: code=${captured.response_code} ${captured.message || ''}`;
        Util.log(resultMsg);
        logToPanel(resultMsg);
        return { ok, response_code: captured.response_code, message: resultMsg };
      }
      /*
       * 原始 DOM 判断方式暂时注释，等 API hook 结果验证稳定后删除。
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        if (btn && (btn.textContent || '').includes('查看奖励')) {
          const resultMsg = '✅ 领取成功: 按钮文字已变为"查看奖励"';
          Util.log(resultMsg);
          logToPanel(resultMsg);
          return { ok: true, response_code: 0, message: resultMsg };
        }
        await Util.sleep(100);
      }
      const resultMsg = '❌ 超时未检测到"查看奖励"，领取可能失败';
      Util.log(resultMsg);
      logToPanel(resultMsg);
      return { ok: false, response_code: -1, message: resultMsg };
       */
      const resultMsg = '未捕获到 /mission/receive API 响应，暂不使用 DOM/按钮文字判断';
      Util.warn(resultMsg);
      logToPanel(resultMsg);
      return { ok: false, response_code: -1, message: resultMsg };
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
      const startSpec = Util.parseTimeSpec(config.start_time || CONFIG.DEFAULT_START_TIME);
      const startTime = startSpec.target;
      const intervalMs = Math.max(0, Number(config.interval || CONFIG.DEFAULT_CLICK_INTERVAL_MS / 1000) * 1000);
      const durationMs = Math.max(1, Number(config.duration || CONFIG.DEFAULT_CLICK_DURATION_MS / 1000) * 1000);
      const waitSec = Math.max(0, (startTime.getTime() - ServerTime.now()) / 1000);
      if (startSpec.invalid) {
        const warnMsg = `任务 ${taskId} 的开始时间 "${config.start_time}" 无法识别，已回退为 ${startSpec.normalized}`;
        Util.warn(warnMsg);
        Panel.updatePageLog(`【时间回退】${warnMsg}`);
      }
      Util.info(`任务配置: task_id=${taskId} start=${startSpec.normalized} wait=${waitSec.toFixed(3)}s interval=${intervalMs}ms duration=${durationMs}ms`);
      Panel.updatePageLog(`【任务配置】task_id=${taskId} 开始时间=${startSpec.normalized} 等待=${waitSec.toFixed(3)}s 间隔=${intervalMs}ms 时长=${(durationMs / 1000).toFixed(3)}s`);
      await this.waitUntil(startTime);
      RewardMonitor.clear(taskId);
      Util.info(`开始执行任务: ${taskId}`);
      Panel.updatePageLog(`【任务开始】task_id=${taskId} 计划时间=${startSpec.normalized} 实际时间=${Util.formatTime()}`);
      const clickStats = await this.performContinuousClick(selector, intervalMs, durationMs);
      const successCount = clickStats.success_count || 0;
      const totalCount = successCount + (clickStats.fail_count || 0);
      let claimResult;
      const captured = await RewardMonitor.waitForReceive(taskId, 1500);
      if (captured) {
        claimResult = {
          ok: captured.response_code === 0,
          response_code: captured.response_code,
          message: `API领取结果: ${captured.message || ''}`
        };
      } else {
        /*
         * 原始 DOM 判断方式暂时注释，等 API hook 结果验证稳定后删除。
         * if (clickStats.early_exit) {
         *   claimResult = { ok: true, response_code: 0, message: '✅ 按钮文字已变为"查看奖励"' };
         * } else {
         *   const btn = Util.getByXPath(selector);
         *   claimResult = await this.judgeClaimResult(btn, taskId);
         * }
         */
        const btn = Util.getByXPath(selector);
        claimResult = await this.judgeClaimResult(btn, taskId);
      }
      const elapsedTime = clickStats.early_exit ? ((totalCount * intervalMs) / 1000).toFixed(3) : (durationMs / 1000).toFixed(3);
      const resultText = `${elapsedTime}秒点击结束，共点击 ${totalCount} 次，成功 ${successCount} 次，成功率 ${totalCount ? (successCount / totalCount * 100).toFixed(1) : '0.0'}%`;
      Util.info(`任务结果 [${taskId}]: ${resultText} | ${claimResult.ok ? '✅ 成功' : '❌ 失败'} — ${claimResult.message}`);
      Panel.updatePageLog(`【任务结果】task_id=${taskId} ${claimResult.ok ? '成功' : '失败'} ${resultText}；${claimResult.message}`);
      const task = Util.findTaskById(Panel.state.tasks, taskId);
      results[taskId] = {
        task_id: taskId,
        task_name: Util.getTaskName(task),
        status: claimResult.ok ? '成功' : '失败',
        response_code: claimResult.response_code,
        message: `${resultText}；${claimResult.message}`,
        cdkey: captured && captured.cdkey || '',
        timestamp: Util.formatTime(),
        device_name: CONFIG.DEVICE_NAME,
        task_config: {
          click_mode: config.click_mode,
          interval: config.interval,
          duration: config.duration,
          start_time: config.start_time
        }
      };
      return results[taskId];
    },

    async waitUntil(targetTime) {
      const diff = targetTime.getTime() - ServerTime.now();
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
    Util.info(`版本: ${CONFIG.VERSION}  URL: ${window.location.href}`);
    Util.info(`API 地址: ${CONFIG.API_BASE}`);

    Panel.init();
    Panel.injectLogPanel();

    // 强制更新预检
    try {
      const versionResp = await API.request('GET', '/api/versions/latest');
      if (versionResp && versionResp.status === 'success' && versionResp.data) {
        const latest = versionResp.data;
        if (latest.force_update && (latest.version || '') > (CONFIG.VERSION || '')) {
          Util.warn('强制更新: 版本过低, 阻塞执行');
          Panel.showForceUpdateOverlay(latest);
          return;
        }
      }
    } catch (e) {
      Util.log('版本预检失败(不影响主流程):', e.message || e);
    }

	    if (!isLoggedIn()) {
	      Util.info('未登录，显示全屏登录界面');
	      Panel.showLoginOverlay();
	      if (Util.isRewardPage() || Util.isLivePage()) {
	        Util.info('未登录，停止执行活动页任务');
	        return;
	      }
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
          const missionPageInfo = RewardMonitor.getMissionPageInfo(taskId);
          const payload = {
            task_id: taskId,
            device_name: CONFIG.DEVICE_NAME,
            section_title: domPageInfo.section_title,
            award_info: domPageInfo.award_info,
            award_description: (missionPageInfo && missionPageInfo.award_description) || '',
            first_seen_at: ServerTime.formatTime ? ServerTime.formatTime() : Util.formatTime(),
            extract_time: Util.formatTime()
          };
          Util.log(`上传页面信息: task_id=${taskId} section_title="${domPageInfo.section_title}" award_info="${domPageInfo.award_info}"`);
          API.uploadPageInfo(payload).then(resp => {
            Util.log(`页面信息上传成功:`, resp && resp.status);
            if (resp && resp.task_parsed && resp.task_parsed.daily_claim_time && resp.task_parsed.daily_claim_time !== '不限') {
              const claimTime = resp.task_parsed.daily_claim_time;
              const parts = claimTime.split(':');
              const h = parts[0] || '00';
              const m = parts[1] || '00';
              const adjusted = h + ':' + m + ':57';
              Util.info(`自动设置抢码时间: ${claimTime} -> ${adjusted}（提前3秒）`);
              Panel.updateTaskConfig(taskId, 'start_time', adjusted, { silent: true, noRender: true });
            }
          }).catch(e => {
            Util.log(`页面信息上传失败（不影响主流程）:`, e.message || e);
          });
        }
      } else {
        Util.log('DOM 提取页面信息失败，跳过上传');
      }

      Util.info('获取服务端任务列表并显示...');
      const tasksResp = await API.getTasks();
      if (tasksResp.status !== 'success') {
        throw new Error('获取任务列表失败: ' + (tasksResp.message || tasksResp.msg || ''));
      }
      const tasks = Util.normalizeTasks(tasksResp.data || {});
      Panel.setData(baseConfig, tasks);
      Util.info(`远程任务列表: ${tasks.length} 个任务`);

      // Query task parsed info
      if (taskId && taskId !== 'unknown_task') {
        API.getTaskParsedInfo(taskId).then(resp => {
          if (resp && resp.status === 'success' && resp.data && resp.data.daily_claim_time && resp.data.daily_claim_time !== '不限') {
            const claimTime = resp.data.daily_claim_time;
            const parts = claimTime.split(':');
            const adjusted = parts[0] + ':' + parts[1] + ':57';
            const currentCfg = Panel.state.taskConfigs[taskId];
            if (currentCfg && currentCfg.start_time !== adjusted) {
              Panel.updateTaskConfig(taskId, 'start_time', adjusted, { silent: true, noRender: true });
              Util.info(`AI解析: 自动设置抢码时间 ${claimTime} -> ${adjusted}（提前3秒）`);
            }
          }
        }).catch(e => {
          Util.log(`查询任务解析信息失败: ${e.message || e}`);
        });
      }

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

  // 等待 DOM 准备好后再执行主流程
  Util.log('油猴脚本已注入，等待页面加载...');
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
  } else {
    main();
  }

})();
