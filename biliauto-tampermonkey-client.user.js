// ==UserScript==
// @name         BiliAutoClicker - 油猴客户端
// @namespace    https://github.com/under-the-ocean
// @version      1.7.2
// @match        https://www.bilibili.com/blackboard/era/award-exchange.html?*
// @connect      bili.982835785.xyz
// @connect      api.live.bilibili.com
// @connect      gh-proxy.com
// @connect      raw.githubusercontent.com
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
// @resource     CUSTOM_FONT  https://gh-proxy.com/https://raw.githubusercontent.com/under-the-ocean/Bili_monkey/main/zh-cn.woff2
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

    VERSION: '1.7.2',

    // GitHub 仓库里的最新脚本（镜像前缀可在油猴存储用 mirror_prefix 覆盖）
    GH_REPO_RAW: 'https://raw.githubusercontent.com/under-the-ocean/Bili_monkey/main/biliauto-tampermonkey-client.user.js',
    RETRY_COUNT: 2,
    // 调试日志默认关闭，减少生产环境控制台噪音与上传日志体积；如需排查可在油猴存储将 debug_mode 置为 true
    DEBUG: GM_getValue('debug_mode', false)
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
    _logBuffer: [],
    _logBufferMax: 200,

    _log(level, args) {
      const entry = {
        level,
        msg: Array.from(args).map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' '),
        time: new Date().toLocaleTimeString()
      };
      this._logBuffer.push(entry);
      if (this._logBuffer.length > this._logBufferMax) {
        this._logBuffer.splice(0, this._logBuffer.length - this._logBufferMax);
      }
    },

    getLogs() {
      return this._logBuffer.slice();
    },

    clearLogs() {
      this._logBuffer = [];
    },

    /**
     * 面板日志镜像：互斥裁决/排期/顺延/按钮缺失这些只写进面板 DOM 的信息，
     * 不镜像就永远进不了上传缓冲，服务端日志里复盘不到（实测线上搜不到"调度跳过"）。
     */
    mirrorPanel(text) {
      const msg = String(text == null ? '' : text).trim();
      if (!msg) return;
      // 高频进度噪声：倒计时 50ms 一条、进度 2s 一条，会把 200 条缓冲冲干净
      if (/^【连点(倒计时|进度)】/.test(msg)) return;
      const now = Date.now();
      if (msg === this._lastMirroredPanel && now - (this._lastMirroredAt || 0) < 3000) return;
      this._lastMirroredPanel = msg;
      this._lastMirroredAt = now;
      this._log('INFO', ['[面板] ' + msg]);
    },

    log(...args) {
      if (CONFIG.DEBUG) { this._log('DEBUG', args); console.log('[BiliAuto]', ...args); }
    },

    info(...args) {
      this._log('INFO', args);
      console.info('[BiliAuto]', ...args);
    },

    warn(...args) {
      this._log('WARN', args);
      console.warn('[BiliAuto]', ...args);
    },

    error(...args) {
      this._log('ERROR', args);
      console.error('[BiliAuto]', ...args);
    },

    sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * 单调计数器：performance.now() 不受系统对时/时区跳变影响，分辨率 ~0.1ms。
     * 所有"流逝了多少时间"的计算（超时、连点时长、自旋）都应基于它，
     * 而"现在几点"一律走 ServerTime（绝对时间只信 B 站 API）。
     */
    perfNow() {
      return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    },

    /**
     * 当前"服务器日期"，供 parseTimeSpec 推导今天/明天。
     * 已校准时用服务器时间；未校准（断网等）退回本地墙钟，属于显式降级。
     */
    serverNowDate() {
      try {
        if (typeof ServerTime !== 'undefined' && ServerTime.isCalibrated && ServerTime.isCalibrated()) {
          return ServerTime.nowDate();
        }
      } catch (e) { /* ServerTime 尚未初始化时退回本地 */ }
      return new Date();
    },

    getByXPath(xpath, context = document) {
      try {
        // 兼容 CSS 选择器：部分模式直接使用页面原生按钮类名，不走 XPath
        if (typeof xpath === 'string' && /^[.#]/.test(xpath) && xpath.indexOf('/') === -1) {
          return (context.querySelector ? context.querySelector(xpath) : null);
        }
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

    claimTimeMinusSeconds(timeStr, minusSec = 3) {
      const parts = String(timeStr || '').trim().split(':').map(Number);
      if (parts.length < 2 || parts.some(n => !Number.isFinite(n))) return timeStr;
      const [h, m, s = 0] = parts;
      let totalSec = h * 3600 + m * 60 + s - minusSec;
      // 处理跨天借位
      if (totalSec < 0) totalSec += 86400;
      const nh = Math.floor(totalSec / 3600) % 24;
      const nm = Math.floor(totalSec / 60) % 60;
      const ns = totalSec % 60;
      const pad = n => String(n).padStart(2, '0');
      return `${pad(nh)}:${pad(nm)}:${pad(ns)}`;
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
          const padInt = n => String(Math.max(0, Math.floor(n))).padStart(2, '0');
          const ssInt = Math.floor(ss);
          const ms = Math.round((ss - ssInt) * 1000);
          const msStr = ms > 0 ? '.' + String(ms).padStart(3, '0') : '';
          return `${tomorrow ? '明天 ' : ''}${padInt(hh)}:${padInt(mm)}:${padInt(ssInt)}${msStr}`;
        }
      }
      return value;
    },

    parseTimeSpec(timeStr, now = null, options = {}) {
      const noPushTomorrow = options.noPushTomorrow === true;
      // 基准时间默认取服务器时间：任何一处漏传 now 都不会用本地墙钟算出错误的"今天/明天"
      if (!now) now = Util.serverNowDate();
      const raw = String(timeStr || '').trim();
      const value = Util.normalizeStartTimeInput(raw || CONFIG.DEFAULT_START_TIME);
      if (!value) return Util.parseTimeSpec(CONFIG.DEFAULT_START_TIME, now, options);
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
          const ssInt = Math.floor(seconds);
          const ms = Math.round((seconds - ssInt) * 1000);
          const target = new Date(now);
          target.setHours(hours, minutes, ssInt, ms);
          // 部署调度时：若今天的该时刻已过，推至明天（forceTomorrow 始终推）。
          // 执行等待时（noPushTomorrow）：不推，让到点/已过的时间 diff <= 0 以立即执行。
          if (forceTomorrow || (!noPushTomorrow && target.getTime() <= now.getTime())) target.setDate(target.getDate() + 1);
          return { raw, normalized: value, target, delayMs: Math.max(0, target.getTime() - now.getTime()), mode: forceTomorrow ? 'tomorrow-clock' : 'clock' };
        }
      }
      const fallback = Util.parseTimeSpec(CONFIG.DEFAULT_START_TIME, now, options);
      return { ...fallback, raw, normalized: fallback.normalized, invalid: true };
    },

    parseTime(timeStr) {
      return Util.parseTimeSpec(timeStr).target;
    },

    /**
     * 版本号比较：返回 1(a>b) / 0(相等) / -1(a<b)。
     * 支持 v 前缀、位数不等的段（1.4 == 1.4.0）、预发布后缀（1.5.0-beta < 1.5.0）。
     * 修掉原先字符串比较的坑：'1.10.0' > '1.9.0' 在字符串比较里是 false。
     */
    compareVersion(a, b) {
      const parse = (v) => {
        const raw = String(v == null ? '' : v).trim().replace(/^[vV]/, '').split('+')[0];
        const dashAt = raw.indexOf('-');
        const core = dashAt >= 0 ? raw.slice(0, dashAt) : raw;
        const pre = dashAt >= 0 ? raw.slice(dashAt + 1) : '';
        return { parts: core.split('.').map(x => { const n = parseInt(x, 10); return Number.isFinite(n) ? n : 0; }), pre };
      };
      const pa = parse(a), pb = parse(b);
      const len = Math.max(pa.parts.length, pb.parts.length);
      for (let i = 0; i < len; i++) {
        const da = pa.parts[i] || 0;
        const db = pb.parts[i] || 0;
        if (da !== db) return da > db ? 1 : -1;
      }
      if (pa.pre === pb.pre) return 0;
      if (!pa.pre) return 1;      // 无后缀 > 有后缀
      if (!pb.pre) return -1;
      return pa.pre > pb.pre ? 1 : -1;
    },

    isNewerVersion(candidate, current) {
      return this.compareVersion(candidate, current) > 0;
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

    /** 标准化单个配置字段值 */
    normalizeConfigField(field, rawValue) {
      if (field === 'start_time') {
        return Util.normalizeStartTimeInput(rawValue) || CONFIG.DEFAULT_START_TIME;
      }
      if (field === 'interval') {
        const val = Number(rawValue);
        return Number.isFinite(val) && val >= 0 ? val : CONFIG.DEFAULT_CLICK_INTERVAL_MS / 1000;
      }
      if (field === 'duration') {
        const val = Number(rawValue);
        return Number.isFinite(val) && val > 0 ? val : CONFIG.DEFAULT_CLICK_DURATION_MS / 1000;
      }
      if (field === 'click_mode') {
        return (rawValue === 'direct' || rawValue === 'group') ? rawValue : 'dom';
      }
      if (field === 'selected') {
        return Boolean(rawValue);
      }
      return rawValue;
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
                    GM_setValue('api_key', '');
                    CONFIG.API_KEY = '';
                    Util.notify('登录失效', parsed.message || '登录已失效，请重新登录');
                    Panel.showLoginOverlay(parsed.message || '登录失效，请重新登录');
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

    uploadLogs(payload) {
      return this.request('POST', '/api/stats/client-logs', payload);
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
          const cmp = Util.compareVersion(content.version, CONFIG.VERSION);
          const cmpText = cmp > 0 ? '↑ 有新版本' : (cmp < 0 ? '↓ 本地已是更新版本' : '✓ 已是最新');
          Util.log(`版本检查: 当前=${CONFIG.VERSION} 最新=${content.version} ${cmpText}`);
          // 只有服务端确实更新时才提示，避免服务端版本落后时反复弹"更新"
          if (cmp > 0) {
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
  // 时间校准 —— B站RTC接口取服务器时间
  // 设计：**绝对时间只信 API，本地时钟只当"秒表"**
  //   锚点 = 「单调计数器读数 ↔ 服务端毫秒」的一次对应关系；
  //   now() = anchorServerMs + (performance.now() - anchorPerf)。
  //   整个等待期不再读本地墙钟，系统对时 / 时区 / 夏令时跳变都不会影响触发时刻。
  //   精度上限由 API+RTT 决定（实测中位 ±5~15ms），而非本地时钟。
  // ========================
  const SERVER_TIME_URL = 'https://api.live.bilibili.com/xlive/open-interface/v1/rtc/getTimestamp';
  const ServerTime = {
    _anchorPerf: null,      // 锚点的单调计数器读数（请求中点）
    _anchorServerMs: 0,     // 该点对应的服务端毫秒
    _calibrated: false,

    // 采样质量跟踪：用于丢弃高 RTT 的坏样本
    _minRtt: Infinity,
    _lastRtt: null,

    // 以下两个仅供界面显示
    offsetMs: 0,
    lastCalibration: null,

    isCalibrated() {
      return this._calibrated;
    },

    _perf() {
      return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    },

    /** 单次采样：以请求中点为基准，返回服务端毫秒与该点的单调读数 */
    async _sample() {
      const p0 = this._perf();
      const resp = await fetch(SERVER_TIME_URL, { cache: 'no-store' });
      const p1 = this._perf();
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const json = await resp.json();
      if (!json || json.code !== 0 || !json.data || !json.data.microtime) throw new Error('响应格式异常');
      return { serverMs: json.data.microtime, rtt: p1 - p0, midPerf: (p0 + p1) / 2 };
    },

    /**
     * 校准：连采 N 次 → 丢弃 RTT 超过 2×历史最小值的坏样本 → 取最小 RTT 样本做锚点。
     * 实测依据：单次采样误差 sd≈15ms、最坏偏 41ms；多点+过滤后可压到 ±6ms 量级。
     * options.deadlineMs 传抢码目标时刻：临近目标时只接受"更优样本"，避免把抖动注入临界路径。
     */
    async calibrate(options = {}) {
      const tries = Math.max(1, options.samples || 3);
      const deadlineMs = Number(options.deadlineMs);
      const samples = [];
      for (let i = 0; i < tries; i++) {
        try {
          samples.push(await this._sample());
        } catch (e) {
          Util.warn('时间采样失败：' + (e.message || e));
        }
        if (i < tries - 1) await Util.sleep(120);
      }
      if (!samples.length) {
        // 一个样本都没拿到：有旧锚点就继续用，否则显式降级到本地墙钟
        if (this._calibrated) Util.warn('时间校准失败：沿用上一次锚点');
        else Util.warn('时间校准失败：绝对时间降级为本地墙钟，触发时刻可能偏差（建议检查网络并手动重新校准）');
        this._updateDisplay();
        return this.offsetMs;
      }
      // 半程校正只对"最小 RTT"样本可信，故先过滤再择优
      const minSeen = Math.min(this._minRtt, ...samples.map(s => s.rtt));
      const threshold = Math.max(minSeen * 2, minSeen + 30);
      const good = samples.filter(s => s.rtt <= threshold);
      const usable = good.length ? good : samples;
      const best = usable.reduce((a, b) => (a.rtt <= b.rtt ? a : b));

      // 临界期棘轮：距目标 ≤10s 且新样本不优于历史最好样本时，保留原锚点不动
      const nearTarget = Number.isFinite(deadlineMs) && (deadlineMs - this.now()) <= 10000;
      const rttText = (v) => Math.round(v) + 'ms';
      if (nearTarget && this._calibrated && best.rtt >= this._minRtt) {
        Util.log('时间校准：临近目标且样本 RTT(' + rttText(best.rtt) + ') 未优于历史最小(' + rttText(this._minRtt) + ')，保留原锚点');
        this.lastCalibration = Date.now();
        this._updateDisplay();
        return this.offsetMs;
      }

      this._anchorPerf = best.midPerf;
      this._anchorServerMs = best.serverMs;
      this._calibrated = true;
      this._lastRtt = best.rtt;
      this._minRtt = Math.min(this._minRtt, best.rtt);
      this.offsetMs = this.now() - Date.now();   // 仅供显示
      this.lastCalibration = Date.now();
      Util.log('时间校准完成：偏差 ' + (this.offsetMs > 0 ? '+' : '') + this.offsetMs.toFixed(0) + 'ms，'
        + '采用 RTT=' + rttText(best.rtt) + '（采样 ' + samples.length + ' 个，合格 ' + usable.length + ' 个，历史最小 ' + rttText(this._minRtt) + '）');
      this._updateDisplay();
      return this.offsetMs;
    },

    /** 服务器毫秒。未校准时显式降级为本地墙钟（会在日志中警告过） */
    now() {
      if (!this._calibrated) return Date.now();
      return this._anchorServerMs + (this._perf() - this._anchorPerf);
    },

    nowDate() {
      return new Date(this.now());
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
    },

    _autoTimer: null,

    startAutoCalibrate() {
      if (this._autoTimer) return;
      this._autoTimer = setInterval(() => {
        this.calibrate();
      }, 1800000);
    },

    stopAutoCalibrate() {
      if (this._autoTimer) {
        clearInterval(this._autoTimer);
        this._autoTimer = null;
      }
    }
  };
  // ========================
  // 跨标签页抢码互斥
  // 同一 IP 下多个标签页同时抢同一任务，会成倍抬高 B 站风控概率（请求量翻倍）。
  // 这里通过 GM 存储登记「本标签页排期/正在抢的任务与目标时刻」，跨页比对时
  // 只在【同一 taskId 且目标时刻相差 <= CONFLICT_WINDOW_MS】时才判定为冲突并提示，
  // 时刻不同意味着不会并发打同一接口，不打扰用户。
  // ========================
  const CrossTab = {
    KEY: 'bm_cross_tab_claims',
    _pageId: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : ('p' + Math.random().toString(36).slice(2)),
    _lastHeartbeat: 0,
    // Worker 每 100ms 回调一次，内部限流到 5s 一次
    HEARTBEAT_MS: 5000,
    // 竞争者存活线：心跳 5s 一次，超过 3 次没心跳即视为该页签已关闭/卡死。
    // 必须远小于旧值 60s —— 否则"短暂多开再关掉"残留的僵尸记录会让本页到点误判有竞争而取消抢码。
    LIVE_MS: 15 * 1000,
    // 存储清理阈值（只用于清垃圾，不参与竞争判定）
    STALE_MS: 120 * 1000,
    // 目标时刻相差在该窗口内视为「时间冲突」（会并发打同一接口）
    CONFLICT_WINDOW_MS: 60 * 1000,
    // 已完成的墓碑保留时长：覆盖同刻竞争窗口，避免输家接管时重复执行
    DONE_KEEP_MS: 90 * 1000,
    // "别的页签已经接手/完成这个任务"的有效期（不依赖心跳，取足够长以覆盖后台节流）
    EXEC_RECENT_MS: 120 * 1000,
    // 意图握手的参与者有效期
    HANDSHAKE_MS: 120 * 1000,

    _read() {
      let raw;
      try { raw = GM_getValue(this.KEY, null); } catch (e) { return []; }
      if (!raw) return [];
      try {
        const list = typeof raw === 'string' ? JSON.parse(raw) : raw;
        return Array.isArray(list) ? list : [];
      } catch (e) { return []; }
    },

    _write(list) {
      try { GM_setValue(this.KEY, JSON.stringify(list.slice(-20))); } catch (e) {}
    },

    // 清理过期条目：除本页外，超时未心跳、目标时刻早已过去、墓碑过期的都丢弃
    _prune(list, now = Date.now()) {
      return list.filter(item => {
        if (!item || !item.pageId || !item.taskId) return false;
        if (item.pageId === this._pageId) return true;
        if (typeof item.targetMs === 'number' && item.targetMs && item.targetMs + this.STALE_MS < now) return false;
        if (item.phase === 'done' && now - (item.updatedAt || 0) > this.DONE_KEEP_MS) return false;
        if (now - (item.updatedAt || 0) > this.STALE_MS) return false;
        return true;
      });
    },

    /** 登记本标签页的抢码计划：taskId + 校准后的目标时刻 + 阶段 */
    register(taskId, targetMs, phase) {
      if (!taskId || !Number.isFinite(Number(targetMs))) return;
      const now = Date.now();
      const key = String(taskId);
      const list = this._prune(this._read(), now)
        .filter(item => !(item.pageId === this._pageId && item.taskId === key));
      list.push({
        pageId: this._pageId,
        taskId: key,
        targetMs: Number(targetMs),
        phase: phase || 'scheduled',
        updatedAt: now
      });
      this._write(list);
    },

    /** 更新本页某任务的阶段（scheduled / running / yielded / done）并刷新心跳 */
    mark(taskId, targetMs, phase) {
      if (!taskId) return;
      const now = Date.now();
      const key = String(taskId);
      const list = this._prune(this._read(), now);
      let found = false;
      for (const item of list) {
        if (item.pageId === this._pageId && item.taskId === key) {
          if (phase) item.phase = phase;
          if (Number.isFinite(Number(targetMs))) item.targetMs = Number(targetMs);
          item.updatedAt = now;
          found = true;
        }
      }
      // done 是墓碑：没有旧条目就不必造；yielded 需要留痕让赢家知道本页已让出
      if (!found && phase && phase !== 'done') {
        list.push({ pageId: this._pageId, taskId: key, targetMs: Number(targetMs) || 0, phase, updatedAt: now });
      }
      this._write(list);
    },

    /** 执行完成后的墓碑：保留一小段时间，避免同刻竞争的输家误判"赢家没跑"而重复执行 */
    markDone(taskId) {
      this.mark(taskId, null, 'done');
    },

    /**
     * 释放本标签页对某任务的登记（保留 done 墓碑——它表示"确实抢到了"，不能被释放抹掉）。
     * 失败/中断时调用它即可立刻允许重试。
     */
    release(taskId) {
      try {
        const key = String(taskId);
        this._write(this._prune(this._read(), Date.now()).filter(item =>
          !(item.pageId === this._pageId && item.taskId === key) || item.phase === 'done'
        ));
      } catch (e) {}
    },

    /**
     * 页面关闭/跳转时清理本页登记。
     * 只清"尚未执行"的（scheduled/intent/yielded）；**正在执行/已完成的标记必须保留**——
     * 执行中的页签一旦导航/关闭，若把 running/done 也删掉，其它页签会误以为无人执行而重复开抢。
     */
    releaseAll() {
      try {
        this._write(this._prune(this._read(), Date.now()).filter(item =>
          item.pageId !== this._pageId ||
          item.phase === 'running' ||
          item.phase === 'done'
        ));
      } catch (e) {}
    },
    /** 安装卸载钩子（幂等） */
    hookUnload() {
      if (this._unloadHooked) return;
      this._unloadHooked = true;
      const bye = () => this.releaseAll();
      try {
        window.addEventListener('pagehide', bye);
        window.addEventListener('beforeunload', bye);
      } catch (e) {}
    },

    /** 心跳保活：挂在 Worker tick 上，避免本页登记被其它页签误判为已关闭 */
    heartbeat() {
      const now = Date.now();
      if (now - this._lastHeartbeat < this.HEARTBEAT_MS) return;
      this._lastHeartbeat = now;
      const list = this._prune(this._read(), now);
      let touched = false;
      for (const item of list) {
        if (item.pageId === this._pageId) { item.updatedAt = now; touched = true; }
      }
      if (touched) this._write(list);
    },

    /**
     * 真正的竞争页签：必须同时满足
     *   1) 同一 taskId，且目标时刻相差 <= CONFLICT_WINDOW_MS（时刻不同不会并发，不算冲突）
     *   2) 阶段是 scheduled / running（yielded、done 都不再参与竞争）
     *   3) 最近 LIVE_MS 内还有心跳（关掉/卡死的页签会自动失去资格，而不是继续"占坑"）
     * 本页自身、以及同一页内的重复触发（同 pageId）一律排除。
     */
    livePeers(taskId, targetMs) {
      if (!taskId) return [];
      const now = Date.now();
      const base = Number(targetMs);
      if (!Number.isFinite(base)) return [];
      return this._prune(this._read(), now).filter(item =>
        item.pageId !== this._pageId &&
        item.taskId === String(taskId) &&
        (item.phase === 'scheduled' || item.phase === 'running') &&
        now - (item.updatedAt || 0) <= this.LIVE_MS &&
        Number.isFinite(Number(item.targetMs)) &&
        Math.abs(Number(item.targetMs) - base) <= this.CONFLICT_WINDOW_MS
      );
    },

    /** 兼容旧名：排期提示用，语义已收敛为「只统计仍然存活的竞争页签」 */
    findConflicts(taskId, targetMs) {
      return this.livePeers(taskId, targetMs);
    },

    /**
     * 同一任务上仍然存活的其它页签（**不看目标时刻**）。
     * 用途：到点执行前的意图握手 —— 各页签"打算执行"与"正在执行"的真实瞬间可能
     * 与排期时刻不一致（例如刚过点被立即执行），只比时刻会漏判，必须按"谁在抢这个任务"来协调。
     */
    peersForTask(taskId, phases) {
      if (!taskId) return [];
      const now = Date.now();
      const want = phases && phases.length ? phases : ['scheduled', 'intent', 'running'];
      return this._prune(this._read(), now).filter(item =>
        item.pageId !== this._pageId &&
        item.taskId === String(taskId) &&
        want.indexOf(item.phase) !== -1 &&
        now - (item.updatedAt || 0) <= this.LIVE_MS
      );
    },

    /**
     * 执行期标记：别的页签是否「正在执行」或「已完成」这个任务。
     * **不依赖心跳**——只看执行期写入的时间戳（running/done 各写一次即长期有效），
     * 因为后台标签页的 Worker 心跳会被浏览器节流，用它判活会把真实竞争误判成"无人竞争"。
     */
    execMarkers(taskId, recentMs) {
      if (!taskId) return [];
      const now = Date.now();
      const win = Number(recentMs) || this.EXEC_RECENT_MS;
      return this._read().filter(item =>
        item && item.pageId !== this._pageId &&
        item.taskId === String(taskId) &&
        (item.phase === 'running' || item.phase === 'done') &&
        now - (item.updatedAt || 0) <= win
      );
    },

    /** 意图握手用：别的页签对同一任务的排期/意图登记（同样不依赖心跳） */
    contenders(taskId, phases) {
      if (!taskId) return [];
      const now = Date.now();
      const want = phases && phases.length ? phases : ['scheduled', 'intent'];
      return this._read().filter(item =>
        item && item.pageId !== this._pageId &&
        item.taskId === String(taskId) &&
        want.indexOf(item.phase) !== -1 &&
        now - (item.updatedAt || 0) <= this.HANDSHAKE_MS
      );
    },

    /** 用户显式允许并发抢码：油猴存储 bm_allow_parallel = true 时放行 */
    allowParallel() {
      return GM_getValue('bm_allow_parallel', false) === true;
    }
  };
  // ========================
  // GitHub 国内镜像版本检查
  // 通过 gh-proxy 镜像拉取仓库里的脚本头部解析 @version，发现新版本只弹提示 + 给更新按钮，
  // 不阻塞页面、不强制更新 —— 是否升级由用户自己点。
  // ========================
  const MirrorUpdate = {
    // 6 小时查一次，避免每次打开页面都下载整个脚本
    CHECK_INTERVAL_MS: 6 * 60 * 60 * 1000,

    rawUrl() {
      return CONFIG.GH_REPO_RAW;
    },

    /** 镜像加速后的安装链接：点「立即更新」打开的就是它，油猴会弹出更新确认 */
    downloadUrl() {
      const prefix = GM_getValue('mirror_prefix', 'https://gh-proxy.com/') || '';
      return prefix + CONFIG.GH_REPO_RAW;
    },

    _request(url, headers) {
      return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method: 'GET',
          url,
          headers: headers || {},
          timeout: 15000,
          onload: resp => {
            if (resp.status >= 200 && resp.status < 400) resolve(resp.responseText || '');
            else reject(new Error('HTTP ' + resp.status));
          },
          onerror: () => reject(new Error('请求失败')),
          ontimeout: () => reject(new Error('请求超时'))
        });
      });
    },

    parseVersion(text) {
      const m = String(text || '').match(/@version\s+([0-9][^\s*]*)/);
      return m ? m[1].trim() : null;
    },

    /**
     * 取镜像端最新版本号。force=true 时忽略缓存重新拉。
     * 优先走镜像，镜像失败再回落 raw 直连。
     */
    async latest(force) {
      const now = Date.now();
      const lastAt = Number(GM_getValue('bm_gh_checked_at', 0)) || 0;
      const cached = GM_getValue('bm_gh_latest_version', '');
      if (!force && cached && now - lastAt < this.CHECK_INTERVAL_MS) return cached;
      let lastErr = null;
      for (const url of [this.downloadUrl(), this.rawUrl()]) {
        try {
          // @version 在文件第 4 行，取头部即可；镜像不支持 Range 时会返回整份，同样能解析
          const text = await this._request(url, { Range: 'bytes=0-1024' });
          const v = this.parseVersion(text);
          if (v) {
            GM_setValue('bm_gh_checked_at', now);
            GM_setValue('bm_gh_latest_version', v);
            Util.log(`镜像检查: 最新版本 ${v}（来源 ${url.slice(0, 60)}…）`);
            return v;
          }
          lastErr = new Error('未能解析 @version');
        } catch (e) {
          lastErr = e;
          Util.warn('镜像检查请求失败:', url.slice(0, 60), e.message || e);
        }
      }
      throw lastErr || new Error('镜像检查失败');
    }
  };
  // ========================
  // 余量探测 —— 点击时主动查询 mission/info
  // 为什么必须主动探测：页面只在自己需要时才请求 info，抢码临界期不会再请求，
  // 被动 hook 拿不到当时的余量（这点容易想当然）。
  //
  // 实测（2026-10-18）：该接口当前**未强制 wbi 签名**，带 buvid 的裸 fetch 即可
  // 返回 code 0 与完整 stock_info；页面自身请求会带 web_location + w_rid，
  // 故这里保留 web_location、暂不引入 md5/wbi（少一份第三方依赖）。
  //
  // 字段语义（务必按 *_limit 标志判断，否则会误判"没货"）：
  //   total_stock / day_stock            百分比
  //   total_stock_limit / day_stock_limit 是否启用该维度限额
  //   total_remain_num / day_remain_num  真实剩余份数
  // day_stock_limit=false 时 day_stock=0 不代表没货；且任务未到可领状态时
  // remain 也可能为 0（实测 status=8 时 total_remain_num 就是 0）。
  // 因此"没货"必须同时满足：该维度启用了限额 + 余量为 0 + 本次运行中曾见过正数
  // （第三条件即原脚本的 remainStock !== 0，避免开局就被 0 误停）。
  // ========================
  const StockProbe = {
    // 探测间隔：与原脚本一致（其 queryInterval = 3000），远低于点击频率，
    // 避免自己把请求量抬上去触发风控；可用油猴存储 stock_probe_interval_ms 覆盖（下限 1s）
    DEFAULT_INTERVAL_MS: 3000,
    _timer: null,
    _sawPositive: false,
    _last: null,

    intervalMs() {
      const v = Number(GM_getValue('stock_probe_interval_ms', this.DEFAULT_INTERVAL_MS));
      return Number.isFinite(v) && v >= 1000 ? v : this.DEFAULT_INTERVAL_MS;
    },

    stopWhenEmpty() {
      return GM_getValue('stock_stop_when_empty', true) !== false;
    },

    stopWhenClaimed() {
      return GM_getValue('stock_stop_when_claimed', true) !== false;
    },

    enabled() {
      return GM_getValue('stock_probe_enabled', true) !== false;
    },

    infoUrl(taskId) {
      let loc = '';
      try {
        const meta = document.querySelector('meta[name="spm_prefix"]');
        if (meta && meta.content) loc = '&web_location=' + encodeURIComponent(meta.content);
      } catch (e) {}
      return 'https://api.bilibili.com/x/activity_components/mission/info?task_id=' + encodeURIComponent(taskId) + loc;
    },

    /** 主动探测一次余量。失败一律返回 null，绝不影响抢码主流程。 */
    async probe(taskId) {
      if (!taskId) return null;
      const t0 = Util.perfNow();
      try {
        const resp = await fetch(this.infoUrl(taskId), { credentials: 'include', cache: 'no-store' });
        const rtt = Math.round(Util.perfNow() - t0);
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const json = await resp.json();
        if (!json || json.code !== 0 || !json.data) throw new Error('code=' + (json && json.code) + ' ' + (json && json.message || ''));
        const d = json.data;
        const si = d.stock_info || {};
        const s = {
          rtt,
          status: d.status,
          message: d.message,
          taskFinished: d.task_finished,
          totalStock: si.total_stock,
          dayStock: si.day_stock,
          totalLimit: si.total_stock_limit === true,
          dayLimit: si.day_stock_limit === true,
          totalRemain: si.total_remain_num,
          dayRemain: si.day_remain_num,
          at: Util.formatTime()
        };
        if ((Number(s.dayRemain) > 0) || (Number(s.totalRemain) > 0) || (Number(s.dayStock) > 0) || (Number(s.totalStock) > 0)) {
          this._sawPositive = true;
        }
        this._last = s;
        return s;
      } catch (e) {
        Util.log('余量探测失败（忽略）: ' + (e.message || e));
        return null;
      }
    },

    /** 人读的余量描述 */
    describe(s) {
      if (!s) return '未知';
      const parts = [];
      if (s.dayLimit) parts.push('今日剩余 ' + (s.dayRemain == null ? '?' : s.dayRemain) + ' 份');
      if (s.totalLimit) parts.push('总剩余 ' + (s.totalRemain == null ? '?' : s.totalRemain) + ' 份');
      parts.push('今日 ' + (s.dayStock == null ? '?' : s.dayStock) + '%/总 ' + (s.totalStock == null ? '?' : s.totalStock) + '%');
      if (s.status != null) parts.push('status=' + s.status);
      parts.push('RTT ' + s.rtt + 'ms');
      return parts.join(' · ');
    },

    /** 该次探测是否说明"已被领取"（只认原脚本验证过的 status===6，不做额外猜测） */
    claimed(s) {
      return !!(s && s.status === 6);
    },

    /**
     * 该次探测是否说明"确实没货了"。
     * 必须**同时**满足：启用了该维度限额 + 百分比归零 + 剩余份数归零 + 本次运行中见过正数。
     * 缺一不可 —— 实测存在 total_stock_limit=true 但 total_remain_num=0、百分比仍为 100%
     * 的中间态，只看 remain 会立刻误停。
     */
    empty(s) {
      if (!s || !this._sawPositive) return false;
      const totalEmpty = s.totalLimit && Number(s.totalStock) === 0 && Number(s.totalRemain) === 0;
      const dayEmpty = s.dayLimit && Number(s.dayStock) === 0 && Number(s.dayRemain) === 0;
      return totalEmpty || dayEmpty;
    },

    reset() {
      this._sawPositive = false;
      this._last = null;
    },

    /**
     * 连点期间按低频率探测余量。
     * onUpdate(sample) 每次探测成功后回调；返回 true 表示请求停止连点。
     */
    start(taskId, onUpdate) {
      this.stop();
      if (!this.enabled()) return false;
      const tick = async () => {
        const s = await this.probe(taskId);
        if (s && typeof onUpdate === 'function') onUpdate(s);
      };
      tick();
      this._timer = setInterval(tick, this.intervalMs());
      return true;
    },

    stop() {
      if (this._timer) {
        clearInterval(this._timer);
        this._timer = null;
      }
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
      // 关闭/跳转页面时立刻注销跨页登记：残留条目会让别的页签误判"有人同时在抢"
      CrossTab.hookUnload();
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
      ServerTime.startAutoCalibrate();
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
      // 模板仅使用两类插值：
      //   ${CONFIG.KEY?'a':'b'}  —— 三元开关（如登录后才显示的元素）
      //   ${CONFIG.KEY}          —— 直接取值（VERSION / ACCOUNT_NAME / API_BASE 等）
      // 兜底清除任何残留的 ${...}，避免未处理的表达式以字面量形式渲染。
      // 运行期动态内容一律走 getSubTemplate 的 {{KEY}} 占位机制，不在此处 eval。
      // ${FONT_URL} 需在兜底清除前替换为字体资源的 blob 链接。
      let result = tpl
        .replace(/\$\{FONT_URL\}/g, fontUrl)
        .replace(/\$\{CONFIG\.(\w+)\?'([^']*)'\s*:\s*'([^']*)'\}/g, (match, key, trueVal, falseVal) => (CONFIG[key] ? trueVal : falseVal))
        .replace(/\$\{CONFIG\.(\w+)\}/g, (match, key) => (CONFIG[key] != null ? String(CONFIG[key]) : ''))
        .replace(/\$\{[^}]*\}/g, '');

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
        else if (action === 'saveConfig') this.saveConfig();
      });

      panel.addEventListener('change', (e) => {
        const fieldTarget = e.target.closest('[data-field]');
        if (fieldTarget) {
          const field = fieldTarget.getAttribute('data-field');
          const value = fieldTarget.type === 'checkbox' ? fieldTarget.checked : fieldTarget.value;
          const taskConfig = fieldTarget.closest('[data-ba="taskConfig"]');
          if (taskConfig) {
            this.updateTaskConfig(taskConfig.getAttribute('data-taskid'), field, value);
            // 立即刷新高亮：点击只改了隐藏 radio，不调 syncModeSwitch 则 is-active 不会移动
            if (field === 'click_mode') this.syncModeSwitch(taskConfig, value);
            return;
          }
          const currentTaskConfig = fieldTarget.closest('[data-ba="currentTaskConfig"]');
          if (currentTaskConfig) {
            // 同上：当前任务配置在点击时也要立刻回显高亮（保存后才写库）
            if (field === 'click_mode') this.syncModeSwitch(currentTaskConfig, value);
            // 群友方式：选中即给出那句来源说明（保存后生效），不展开具体做法
            if (field === 'click_mode' && fieldTarget.value === 'group') {
              this.setStatus('群友方式：某群友提出的据说成功率很高的方式');
            }
            if (this._isCurrentConfigDirty()) {
              this.showToast('配置已修改未保存', 'warn');
            }
            return;
          }
        }

        const target = e.target.closest('[data-ba]');
        if (!target) return;
        const action = target.getAttribute('data-ba');
        if (action === 'taskConfig') {
          this.updateTaskConfig(target.getAttribute('data-taskid'), target.getAttribute('data-field'), target.value);
        } else if (action === 'currentTaskConfig') {
          return;
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
      const storedCfg = this.state.taskConfigs[currentTask];
      // 输入框没有任何改动时，直接采信已保存配置：
      // 否则会把 DOM 里的陈旧值（AI 回填后未重渲染的 input）反向写回 state，等于丢掉 AI 解析出的时间。
      if (storedCfg && !this._isCurrentConfigDirty()) return { ...storedCfg };
      const currentConfigEl = document.querySelector('#biliauto-panel [data-ba="currentTaskConfig"]');
      if (!currentConfigEl || !currentTask || currentTask === 'unknown_task') return this.state.taskConfigs[currentTask] || Util.defaultTaskConfig(currentTask);
      const current = this.state.taskConfigs[currentTask] || Util.defaultTaskConfig(currentTask);
      const startInput = currentConfigEl.querySelector('[data-field="start_time"]');
      const intervalInput = currentConfigEl.querySelector('[data-field="interval"]');
      const durationInput = currentConfigEl.querySelector('[data-field="duration"]');
      const next = { ...current };
      if (startInput) {
        next.start_time = Util.normalizeStartTimeInput(startInput.value) || CONFIG.DEFAULT_START_TIME;
        // 与已存值不同 = 用户明确改过：标记为用户所有，后续 AI 解析不再覆盖
        if (next.start_time !== current.start_time) next.start_time_source = 'user';
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
        next.click_mode = (checkedModeInput.value === 'direct' || checkedModeInput.value === 'group')
          ? checkedModeInput.value
          : 'dom';
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

    /**
     * 模板兜底：用户手里的模板资源若是旧版（没有第三个选项）就补上。
     * 界面只保留来源说明，不描述具体做法。
     */
    ensureGroupModeOption(container) {
      const sw = (container && container.querySelector ? container.querySelector('[data-ba="modeSwitch"]') : null)
        || document.querySelector('#biliauto-panel [data-ba="modeSwitch"]');
      if (!sw || sw.querySelector('[data-mode="group"]')) return;
      const label = document.createElement('label');
      label.className = 'tm-cyber-mode-option';
      label.setAttribute('data-mode', 'group');
      label.title = '某群友提出的据说成功率很高的方式';
      label.innerHTML = '<input class="tm-cyber-mode-native" data-field="click_mode" type="radio" name="biliauto-click-mode" value="group"><span>群友方式</span>';
      sw.appendChild(label);
      // 旧模板的 CSS 还是两列，补一条样式规则（比内联 style 稳，不依赖 CSSOM 序列化）
      if (!document.getElementById('biliauto-mode-switch-3col')) {
        const styleEl = document.createElement('style');
        styleEl.id = 'biliauto-mode-switch-3col';
        styleEl.textContent = '.tm-cyber-mode-switch{grid-template-columns:repeat(3,minmax(0,1fr))!important}';
        (document.head || document.documentElement).appendChild(styleEl);
      }
      try { sw.style.gridTemplateColumns = 'repeat(3, minmax(0, 1fr))'; } catch (e) {}
      Util.log('已补齐「群友方式」模式选项（模板资源为旧版）');
    },

    syncModeSwitch(container, mode) {
      if (!container) return;
      this.ensureGroupModeOption(container);
      const normalizedMode = (mode === 'direct' || mode === 'group') ? mode : 'dom';
      const modeOptions = container.querySelectorAll('.tm-cyber-mode-option');
      modeOptions.forEach((option) => {
        option.classList.toggle('is-active', option.getAttribute('data-mode') === normalizedMode);
      });
      const modeInputs = container.querySelectorAll('[data-field="click_mode"]');
      modeInputs.forEach((input) => {
        input.checked = input.value === normalizedMode;
      });
    },

    /** 返回 true = 配置已写入；false = 被拒绝（用户锁定/AI 被覆盖/风险确认取消） */
    updateTaskConfig(taskId, field, value, options = {}) {
      if (!taskId) return false;
      const current = this.state.taskConfigs[taskId] || Util.defaultTaskConfig(taskId);
      let nextValue = field === 'selected' ? Boolean(value) : value;
      if (field === 'start_time') nextValue = Util.normalizeStartTimeInput(value) || CONFIG.DEFAULT_START_TIME;
      // 用户手动保存过的开始时间优先：服务端 AI 解析结果不再覆盖它
      const isAiBackfill = options.source === 'ai';
      if (field === 'start_time' && isAiBackfill && current.start_time_source === 'user') {
        Util.info(`AI 解析时间 ${nextValue} 未覆盖用户已保存的 ${current.start_time}`);
        this.updatePageLog(`【时间保留】用户已手动设置 ${current.start_time}，忽略 AI 解析的 ${nextValue}`);
        if (!options.silent) this.setStatus(`已保留你的抢码时间 ${current.start_time}（忽略 AI 的 ${nextValue}）`);
        return false;
      }
      if (field === 'start_time') {
        this._refreshCountdown();
        // 立即把值回写到 DOM 输入框：AI 解析回填走的是 noRender:true，不会触发 render()，
        // 若不同步，后续 syncCurrentTaskConfigFromInputs 会拿陈旧的 input 值反向覆盖掉最新 start_time。
        const startInputEl = document.querySelector('#biliauto-panel [data-ba="currentTaskConfig"] [data-field="start_time"]');
        if (startInputEl) startInputEl.value = nextValue;
      }
      this.state.taskConfigs[taskId] = field === 'start_time' && !isAiBackfill
        ? { ...current, [field]: nextValue, start_time_source: 'user' }
        : { ...current, [field]: nextValue };
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
          return false;
        }
      }
      this.saveTaskConfigs();
      // 仅 start_time/selected 变更才重建调度，interval/duration/click_mode 变更不触发调度
      if (taskId === (Util.extractTaskIdFromPage() || 'unknown_task') && (field === 'start_time' || field === 'selected')) {
        this.scheduleCurrentTask();
      }
      // 关键配置变更后立即回显规范化结果
      if (!options.silent) this.setStatus(`配置已保存：${field} = ${nextValue}`);
      // 群友方式：界面只给一句来源说明，不展开具体做法
      if (field === 'click_mode' && nextValue === 'group' && !options.silent) {
        this.setStatus('群友方式：某群友提出的据说成功率很高的方式');
        this.showToast('已启用「群友方式」', 'success');
      }
      if (!options.noRender && (field === 'start_time' || field === 'selected')) {
        this.renderList();
        this.render();
      }
      return true;
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

    // 浮层提示：自动消失的轻量 toast，替代浏览器原生弹框用于一次性反馈
    showToast(text, type = 'info') {
      let toast = document.getElementById('biliauto-toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.id = 'biliauto-toast';
        document.body.appendChild(toast);
      }
      const bg = type === 'success' ? 'rgba(6,182,212,0.95)'
        : type === 'warn' ? 'rgba(245,158,11,0.95)'
        : 'rgba(15,23,42,0.95)';
      toast.style.cssText = 'position:fixed;top:16px;left:50%;transform:translateX(-50%);z-index:2147483647;padding:10px 18px;border-radius:8px;font-size:13px;font-family:var(--tm-font,Inter,sans-serif);box-shadow:0 4px 16px rgba(0,0,0,0.3);background:' + bg + ';color:#fff;opacity:0;transition:opacity .2s;pointer-events:none;max-width:90vw;text-align:center;';
      toast.textContent = text;
      requestAnimationFrame(() => { toast.style.opacity = '1'; });
      clearTimeout(this._toastTimer);
      this._toastTimer = setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast); }, 250);
      }, 2500);
    },

    // 检测当前 hero 区输入框值与已保存配置是否不一致（未保存的修改）
    _isCurrentConfigDirty() {
      const taskId = Util.extractTaskIdFromPage();
      if (!taskId || taskId === 'unknown_task') return false;
      const cfg = this.state.taskConfigs[taskId] || Util.defaultTaskConfig(taskId);
      const el = document.querySelector('#biliauto-panel [data-ba="currentTaskConfig"]');
      if (!el) return false;
      const startInput = el.querySelector('[data-field="start_time"]');
      const intervalInput = el.querySelector('[data-field="interval"]');
      const durationInput = el.querySelector('[data-field="duration"]');
      const modeInput = el.querySelector('[data-field="click_mode"]:checked');
      if (startInput) {
        const cur = Util.normalizeStartTimeInput(startInput.value) || CONFIG.DEFAULT_START_TIME;
        if (cur !== (cfg.start_time || CONFIG.DEFAULT_START_TIME)) return true;
      }
      if (intervalInput) {
        const cur = Number(intervalInput.value);
        const curVal = Number.isFinite(cur) && cur >= 0 ? cur : CONFIG.DEFAULT_CLICK_INTERVAL_MS / 1000;
        if (curVal !== Number(cfg.interval)) return true;
      }
      if (durationInput) {
        const cur = Number(durationInput.value);
        const curVal = Number.isFinite(cur) && cur > 0 ? cur : CONFIG.DEFAULT_CLICK_DURATION_MS / 1000;
        if (curVal !== Number(cfg.duration)) return true;
      }
      if (modeInput && modeInput.value !== (cfg.click_mode || 'dom')) return true;
      return false;
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
          // 优先使用调度时缓存的目标时间戳，避免 parseTimeSpec 到点后将目标推至明天导致倒计时跳变到 86400s
          if (this._currentTargetMs != null && this._currentScheduledTaskId === currentTaskId) {
            cdEl.textContent = (Math.max(0, this._currentTargetMs - ServerTime.now()) / 1000).toFixed(3);
            return;
          }
          const currentParsed = Util.parseTimeSpec(currentCfg.start_time, ServerTime.nowDate(), { noPushTomorrow: true });
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
          const parsed = Util.parseTimeSpec(cfg.start_time, ServerTime.nowDate(), { noPushTomorrow: true });
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
        Util.mirrorPanel(text);
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

    _doExecuteTask(taskId, fireTargetMs) {
      // 互斥 1：同一时刻只允许一条执行路径（main 直接执行 / 手动 runCurrent / 调度触发）。
      // state.running 曾被当作锁，但调度侧已不再读取它，导致两条路径在同一毫秒并发连点。
      if (this.state.running) {
        Util.warn(`_doExecuteTask: 已有执行路径在运行，忽略本次到点触发 task_id=${taskId}`);
        this.updatePageLog(`【调度跳过】已有任务执行中，忽略本次到点触发 task_id=${taskId}`);
        // 旧版这里直接 cleanup 就结束 —— 这一代排期成了终态，当天再也不会补触发
        this._scheduleSkipRetry(taskId, fireTargetMs);
        return;
      }
      // 互斥 2：跨标签页 —— 到点瞬间裁决。只有确认对方真的在跑，本页才会让出；
      // 对方已关闭/卡死时本页接管执行，绝不静默取消任务。
      const fireMs = Math.round(ServerTime.now());
      this.state.running = true;
      this.setStatus('Auto run starting: ' + taskId);
      this.resolveFireConflict(taskId, fireMs).then(proceed => {
        if (!proceed) {
          // 让出：本页不执行，但仍保留 yielded 记录，避免赢家误判
          this.state.running = false;
          this._rescheduleNextCycle();   // 让出也不留空档：下一轮排期照样建起来
          return;
        }
        CrossTab.mark(taskId, fireMs, 'running');
        const latestCfg = this.syncCurrentTaskConfigFromInputs({ log: false }) || this.state.taskConfigs[taskId] || Util.defaultTaskConfig(taskId);
        return runCurrentPageTask(this.state.baseConfig, taskId, latestCfg).then(results => {
          this.setStatus('上传结果中...');
          return batchUploadAllResults(results);
        }).then(() => {
          this.setStatus('Auto run completed');
        }).catch(e => {
          this.setStatus('Auto run failed: ' + (e.message || e));
          Util.error('Auto run failed:', e);
        }).finally(() => {
          this.state.running = false;
          // 成败由 runSingleTask 内部决定墓碑，这里只释放持有权（保留 done）
          CrossTab.release(taskId);
          // 调度器自己触发的执行同样必须重建排期：旧版只释放锁不重建，任务当天再无下一次排期
          this._afterRunFinished(taskId);
        });
      }).catch(e => {
        this.state.running = false;
        Util.error('跨页裁决异常:', e);
        this._afterRunFinished(taskId);
      });
    },

    /**
     * 一次执行结束（成功/失败/让出）后的统一收尾：能重试就重试，否则把下一轮排期建起来。
     * 旧版只有 main 的成功路径会重建调度，调度器自己执行完、主流程异常之后当天再无任何排期。
     */
    _afterRunFinished(taskId) {
      if (this._retryAfterFailure(taskId)) return;
      this._rescheduleNextCycle();
    },

    // 下一轮（通常就是明天）：走 skipImmediate，杜绝"刚点完又立刻补一次"
    _rescheduleNextCycle() {
      return this.scheduleCurrentTask({ skipImmediate: true });
    },

    /**
     * 失败重试：按钮尚未渲染 / 接口瞬时失败时隔 20s 再来一次，最多 4 次。
     * 只要本轮已经真的发过点击就绝不重试 —— 重试只会变成一次多余的连点。
     */
    _retryAfterFailure(taskId) {
      const now = Math.round(ServerTime.now());
      if (this._consumedTarget && this._consumedTarget.taskId === taskId
          && Math.abs(now - this._consumedTarget.atMs) <= this.CONSUMED_GUARD_MS) {
        return false;
      }
      if ((this._failRetries || 0) >= this.FAIL_RETRY_MAX) {
        this.updatePageLog(`【失败放弃】已重试 ${this._failRetries} 次，不再重试 task_id=${taskId}`);
        return false;
      }
      this._failRetries = (this._failRetries || 0) + 1;
      this.updatePageLog(`【失败重试】${this._failRetries}/${this.FAIL_RETRY_MAX}，${this.FAIL_RETRY_DELAY_MS / 1000}s 后重试 task_id=${taskId}`);
      return this.scheduleCurrentTask({ overrideTargetMs: now + this.FAIL_RETRY_DELAY_MS });
    },

    /**
     * 到点时锁仍被占用（main 自己也在等同一时刻 / 上一轮还没收尾）时的有界补触发：
     * 只在目标后 30s 内、最多 3 次；一旦本轮已经真的点过立刻罢手。
     */
    _scheduleSkipRetry(taskId, fireTargetMs) {
      const now = Math.round(ServerTime.now());
      if (!Number.isFinite(fireTargetMs) || now - fireTargetMs > this.SKIP_RETRY_WINDOW_MS) return;
      if (this._consumedTarget && this._consumedTarget.taskId === taskId
          && Math.abs(now - this._consumedTarget.atMs) <= this.CONSUMED_GUARD_MS) {
        return;   // 已经有执行路径真正开点了，不再补触发
      }
      if ((this._skipRetries || 0) >= this.SKIP_RETRY_MAX) {
        this.updatePageLog(`【调度放弃】锁占用超过重试上限，不再补触发 task_id=${taskId}`);
        return;
      }
      this._skipRetries = (this._skipRetries || 0) + 1;
      this.updatePageLog(`【调度重试】${this._skipRetries}/${this.SKIP_RETRY_MAX}，${this.SKIP_RETRY_DELAY_MS}ms 后补触发`);
      this.scheduleCurrentTask({ overrideTargetMs: now + this.SKIP_RETRY_DELAY_MS });
    },

    // 距目标的剩余毫秒（服务器校准时间基准）；无有效调度返回 null
    // 直接用调度时缓存的目标时间戳，避免 parseTimeSpec 在到点后将目标推至明天导致 delayMs 跳变到 ~24h
    _remainingMs() {
      if (this._currentTargetMs == null) return null;
      return this._currentTargetMs - ServerTime.now();
    },

    // 幂等触发：仅当到点且本代未触发过时执行一次。
    // 精确定时器（主）、Worker 心跳、可见性/焦点（后备）都汇入此处，靠 generation + _fired 去重。
    // 触发路径不含任何网络请求，offset 由自适应校准提前备好。
    _maybeFire(gen) {
      if (gen !== this._scheduleGeneration) return;   // 已被新一轮调度取代
      if (this._fired) return;                        // 本代已触发
      const remaining = this._remainingMs();
      if (remaining === null || remaining > 0) return; // 还没到点
      const taskId = this._currentScheduledTaskId;
      if (!taskId) return;
      const fireTargetMs = this._currentTargetMs;   // cleanup 会置空，先取出来供锁冲突补触发使用
      this._fired = true;
      Util.info(`[Scheduler] 到点触发 task_id=${taskId}`);
      this.updatePageLog(`[Scheduler] 到点触发 task_id=${taskId}`);
      this._cleanupTimers();      // 清理调度定时器并置空调度状态，防止重复触发
      this._doExecuteTask(taskId, fireTargetMs);
    },

    // 主线程精确定时器：远端用较粗 setTimeout，临近逐级加密，最后 ≤10ms 自旋精确命中目标时刻。
    // 全程使用缓存 offset（ServerTime.now），不发起网络请求。
    _armPreciseTimer(gen) {
      const step = () => {
        if (gen !== this._scheduleGeneration || this._fired) return;
        const remaining = this._remainingMs();
        if (remaining === null) return;
        if (remaining <= 10) {
          // 最后一小段自旋，规避 setTimeout 的 ~4ms 钳制，精确命中
          const targetNow = ServerTime.now() + remaining;
          while (ServerTime.now() < targetNow) { /* busy-wait ≤10ms */ }
          this._maybeFire(gen);
          return;
        }
        const next = remaining > 2000 ? 250 : (remaining > 500 ? 30 : 5);
        this._preciseTimer = setTimeout(step, next);
      };
      step();
    },

    _cleanupTimers() {
      if (this._calibrationTimer) {
        clearTimeout(this._calibrationTimer);
        this._calibrationTimer = null;
      }
      if (this._preciseTimer) {
        clearTimeout(this._preciseTimer);
        this._preciseTimer = null;
      }
      // 注意：不在此停止 AudioContext 保活——连点执行期同样需要防后台节流，
      // 保活由 Worker 心跳持续维护，仅在页面卸载时随进程释放。
      this._currentStartTimeStr = null;
      this._currentScheduledTaskId = null;
      this._currentTargetMs = null;
    },

    // visibilitychange + focus 监听 - 标签页恢复可见时立即补一次幂等检查（后备触发源）
    _setupVisibilityCheck() {
      if (this._visibilityInstalled) return;
      this._visibilityInstalled = true;
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) this._maybeFire(this._scheduleGeneration);
      });
      window.addEventListener('focus', () => this._maybeFire(this._scheduleGeneration));
    },

    // 创建无声 AudioContext 保持页面活跃，阻止 Chrome 后台节流
    // Chrome 只节流不播放音频的后台页面，AudioContext 一旦创建，页面被视为"音频活跃"
    _startKeepAliveAudio() {
      if (this._keepAliveCtx) return;
      try {
        const AudioCtor = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtor) return;
        const ctx = new AudioCtor();
        // 创建一个无声的振荡器（音量 0），什么都不播放
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.gain.value = 0;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        this._keepAliveCtx = ctx;
        Util.log('AudioContext 保活已启动，阻止后台节流');
      } catch (e) {
        Util.warn('AudioContext 保活创建失败:', e.message);
      }
    },

    _stopKeepAliveAudio() {
      if (this._keepAliveCtx) {
        try { this._keepAliveCtx.close(); } catch (e) {}
        this._keepAliveCtx = null;
      }
    },

    _checkKeepAlive() {
      // 顺带做跨标签页登记心跳（内部限流 5s 一次），保证本页登记不被误判为已关闭
      CrossTab.heartbeat();
      if (!this._keepAliveCtx) {
        this._startKeepAliveAudio();
        return;
      }
      // 如果 AudioContext 被 Chrome 挂起 (suspended)，恢复它
      if (this._keepAliveCtx.state === 'suspended') {
        this._keepAliveCtx.resume().catch(() => {
          // 恢复失败，重建
          this._stopKeepAliveAudio();
          this._startKeepAliveAudio();
        });
      }
    },

    // 初始化后台 Web Worker 定时器
    // Chrome 节流后台标签页的定时器（包括 Worker 内），但不会节流正在播放音频的页面
    // 通过 _startKeepAliveAudio 创建无声 AudioContext 来阻止节流
    _initBackgroundWorker() {
      if (this._bgWorker) {
        try { this._bgWorker.terminate(); } catch (e) {}
        this._bgWorker = null;
      }
      this._startKeepAliveAudio();
      try {
        const code = 'setInterval(function(){postMessage("tick")},100)';
        const blob = new Blob([code], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        const worker = new Worker(url);
        URL.revokeObjectURL(url);
        // 后备心跳：维护 AudioContext 保活，并在主线程精确定时器被后台节流时兜底触发（幂等）
        worker.onmessage = () => {
          this._checkKeepAlive();
          this._maybeFire(this._scheduleGeneration);
        };
        this._bgWorker = worker;
        Util.info('后台 Web Worker 已启动 (100ms 心跳后备，AudioContext 保活)');
      } catch (e) {
        Util.warn('Web Worker 创建失败，回退到 setInterval 轮询:', e.message);
        if (this._bgFallbackTimer) {
          clearInterval(this._bgFallbackTimer);
        }
        this._bgFallbackTimer = setInterval(() => {
          this._checkKeepAlive();
          this._maybeFire(this._scheduleGeneration);
        }, 200);
      }
    },

    // 自适应校准：距目标时间越近，校准越频繁
    // >1小时  → 30分钟一次
    // >10分钟 → 5分钟一次
    // >1分钟  → 30秒一次
    // ≤1分钟  → 5秒一次
    _startAdaptiveCalibration() {
      if (this._calibrationTimer) {
        clearTimeout(this._calibrationTimer);
        this._calibrationTimer = null;
      }
      const calcInterval = () => {
        const parsed = Util.parseTimeSpec(this._currentStartTimeStr, ServerTime.nowDate());
        if (!parsed || !Number.isFinite(parsed.delayMs)) return null;
        const remaining = parsed.delayMs;
        if (remaining > 3600000) return 1800000;
        if (remaining > 600000) return 300000;
        if (remaining > 60000) return 30000;
        if (remaining > 5000) return 5000;
        return null;
      };
      const scheduleNext = () => {
        const interval = calcInterval();
        if (interval === null) return;
        this._calibrationTimer = setTimeout(() => {
          if (!this._currentStartTimeStr) return;
          // 带上目标时刻：临近目标时启用棘轮，只接受更优样本
          ServerTime.calibrate({ deadlineMs: this._currentTargetMs }).finally(() => {
            if (this._currentStartTimeStr) {
              scheduleNext();
            }
          });
        }, interval);
      };
      scheduleNext();
    },

    // ============ GitHub 镜像版本检查（只提示，不强更） ============

    /** 打开更新页：新标签页打开镜像安装链接，油猴会弹出更新确认，避免打断当前页面的抢码 */
    openUpdatePage() {
      const url = MirrorUpdate.downloadUrl();
      Util.info('打开更新页:', url);
      try {
        if (typeof GM_openInTab === 'function') {
          GM_openInTab(url, { active: true, insert: true });
        } else {
          window.open(url, '_blank', 'noopener');
        }
      } catch (e) {
        window.open(url, '_blank', 'noopener');
      }
    },

    /**
     * 发现新版本时的可关闭横幅：只提示、不强制更新。
     * 同一版本点过「稍后」后不再打扰，直到出现更新的版本。
     */
    showUpdateBanner(latest) {
      if (GM_getValue('bm_gh_dismissed_version', '') === latest) return;
      let banner = document.getElementById('biliauto-update-banner');
      if (!banner) {
        banner = document.createElement('div');
        banner.id = 'biliauto-update-banner';
        document.body.appendChild(banner);
      }
      const btnBase = 'padding:6px 14px;border-radius:6px;font-size:13px;font-family:inherit;cursor:pointer;border:none;';
      banner.style.cssText = 'position:fixed;top:64px;left:50%;transform:translateX(-50%);z-index:2147483647;'
        + 'padding:10px 16px;border-radius:10px;display:flex;align-items:center;gap:12px;'
        + 'font-size:13px;font-family:var(--tm-font,Inter,sans-serif);max-width:92vw;'
        + 'background:rgba(15,23,42,.96);border:1px solid rgba(6,182,212,.45);color:#e2e8f0;'
        + 'box-shadow:0 6px 20px rgba(0,0,0,.35);';
      banner.textContent = '';
      const label = document.createElement('span');
      label.textContent = `发现新版本 ${latest}（当前 ${CONFIG.VERSION}）`;

      const btnUpdate = document.createElement('button');
      btnUpdate.textContent = '立即更新';
      btnUpdate.style.cssText = btnBase + 'background:#06b6d4;color:#04212b;font-weight:600;';
      btnUpdate.title = '新标签页打开镜像安装链接，油猴会弹出更新确认';
      btnUpdate.addEventListener('click', () => this.openUpdatePage());

      const btnLater = document.createElement('button');
      btnLater.textContent = '稍后';
      btnLater.style.cssText = btnBase + 'background:rgba(255,255,255,.12);color:#cbd5e1;';
      btnLater.addEventListener('click', () => {
        GM_setValue('bm_gh_dismissed_version', latest);
        banner.remove();
        this.updatePageLog(`【版本更新】已忽略 ${latest} 的更新提示`);
      });

      banner.append(label, btnUpdate, btnLater);
      Util.info(`镜像检查: 发现新版本 ${latest}（当前 ${CONFIG.VERSION}）`);
      this.showToast(`发现新版本 ${latest}`, 'info');
      this.updatePageLog(`【版本更新】发现新版本 ${latest}（当前 ${CONFIG.VERSION}）。`
        + '点击横幅「立即更新」在新标签页打开镜像安装链接，由油猴确认后生效；也可在油猴扩展里手动更新。');
    },

    /**
     * 镜像版本检查入口：只提示不阻塞。
     * 检查失败（断网/镜像挂了）一律降级为日志，不影响抢码主流程。
     */
    async checkMirrorUpdate(force) {
      try {
        const latest = await MirrorUpdate.latest(force);
        if (latest && Util.isNewerVersion(latest, CONFIG.VERSION)) {
          this.showUpdateBanner(latest);
        } else {
          Util.log(`镜像检查: 最新=${latest} 当前=${CONFIG.VERSION}，无需更新`);
        }
        return latest;
      } catch (e) {
        Util.warn('镜像版本检查失败（不影响抢码）: ' + (e.message || e));
        return null;
      }
    },

    /**
     * 跨标签页冲突预警：只提示，不改动任何执行计划（取消抢码只能由 resolveFireConflict 在到点瞬间决定）。
     * 只有「同一 taskId 且目标时刻相近」且「对方仍在心跳」才提示；关掉的页签不再误报。
     */
    _warnCrossTabConflict(taskId, targetMs) {
      const conflicts = CrossTab.findConflicts(taskId, targetMs);
      if (!conflicts.length) return [];
      const when = Util.formatTime(new Date(targetMs));
      const others = conflicts.map(c =>
        `${c.phase === 'running' ? '正在抢' : '已排期'} ${Util.formatTime(new Date(c.targetMs))}`).join('；');
      const msg = `⚠️ 另有 ${conflicts.length} 个标签页也在抢 task_id=${taskId}（本页 ${when}，对方 ${others}）。`
        + '同一 IP 下并发抢码请求量翻倍，触发 B 站风控 / IP 异常的概率会大幅升高，建议关闭多余标签页。\n'
        + '（到点时本页会自动与其他页签裁决：只有一个页签真正执行，本页不会因此取消任务）';
      Util.warn(msg);
      this.showToast(`⚠️ 另有标签页同时抢 ${taskId}，风控概率升高`, 'warn');
      this.updatePageLog(msg);
      this.setStatus(`另有标签页同时抢 ${taskId}：${when}`);
      if (CrossTab.allowParallel()) {
        this.updatePageLog('已开启 bm_allow_parallel，本次允许并发抢码');
      }
      return conflicts;
    },

    // 让出方观察赢家是否真的开跑的时长
    CROSS_TAKEOVER_MS: 1200,
    // 意图广播后的静默期：等对方意图也落地，保证双方看到同一份参与者集合
    CROSS_INTENT_SETTLE_MS: 250,

    // ===== 排期健壮性参数（每一项都对应线上实测到的"当天不点"路径） =====
    // 部署排期时"刚到点"的宽容窗口：≤60s 直接立即执行；超过才顺延到明天（与 waitUntil 的 60s 阈值一致）
    SCHEDULE_LATE_GRACE_MS: 60 * 1000,
    // 锁冲突补触发：只在短窗口内做有限次，一旦有人真正开点立刻罢手（避免二次点击）
    SKIP_RETRY_MAX: 3,
    SKIP_RETRY_DELAY_MS: 2000,
    SKIP_RETRY_WINDOW_MS: 30 * 1000,
    // 执行失败重试：按钮常常只是还没渲染出来（线上 147 次"未找到领取按钮"全压在开抢时刻）
    FAIL_RETRY_MAX: 4,
    FAIL_RETRY_DELAY_MS: 20000,
    // "本轮已经真的发过点击"的保护期：此窗口内绝不再补一次点击
    CONSUMED_GUARD_MS: 5 * 60 * 1000,

    /**
     * 到点互斥裁决：返回 true = 本页执行，false = 让给另一页签执行。
     * 四条硬约束（前几版分别缺了后三条）：
     *   1) 竞争者 = 「同 taskId + LIVE_MS 内仍有心跳」的页签 —— 关掉的页签 15s 内自动失格，
     *      且关闭时会立刻 releaseAll 注销，不再"占坑"。**不看目标时刻**：排期时刻与实际
     *      执行瞬间可能不同（例如刚过点被立即执行），按时刻比会漏判成"无竞争"→ 双方同时开抢；
     *   2) 用 pageId 字典序做确定性裁决 —— 只有一个页签让出，绝不会两边都让出导致无人抢码；
     *   3) 让出方会短暂观察赢家是否真的进入 running，没跑就接管执行，保证任务不会静默丢失。
     */
    async resolveFireConflict(taskId, targetMs) {
      if (CrossTab.allowParallel()) return true;
      // 判定 0：别的页签已经接手或已完成这个任务 → 直接让出，绝不重复抢。
      // 用执行期写入的时间戳判定，不看心跳（后台节流会把心跳判成"死"）。
      const marks = CrossTab.execMarkers(taskId);
      if (marks.length) {
        const who = marks[0].phase === 'done' ? '已完成' : '正在执行';
        Util.warn(`跨页互斥：task_id=${taskId} 已被另一页签${who}`);
        this.updatePageLog(`【跨页让出】另一页签${who} ${taskId}，本页不重复抢码`);
        this.setStatus(`已让出：另一页签${who} ${taskId}`);
        return false;
      }
      // 判定 1：有别的页签对同一任务持有排期/意图 → 做一次意图握手。
      // 独占（单页签常规情况）直接执行，零额外延迟。
      // 不按目标时刻筛选：排期时刻与实际执行瞬间可能不同（如刚过点立即执行），按时刻比会漏判。
      if (!CrossTab.contenders(taskId).length) return true;
      CrossTab.mark(taskId, targetMs, 'intent');
      await Util.sleep(this.CROSS_INTENT_SETTLE_MS);
      // 静默期后先看有没有人真的开跑/已完成：先到先得，直接让出。
      // 必须在算 winner 之前查——赢家会把 phase 从 intent 改成 running，
      // 若只按 intent 取参与者，输家就看不到赢家、会误判自己胜出（实测复现过）。
      const started = CrossTab.execMarkers(taskId);
      if (started.length) {
        const who = started[0].phase === 'done' ? '已完成' : '正在执行';
        this.updatePageLog(`【跨页让出】另一页签${who} ${taskId}，本页不重复抢码`);
        this.setStatus(`已让出：另一页签${who} ${taskId}`);
        return false;
      }
      const peers = CrossTab.contenders(taskId, ['intent']);
      const winnerId = [CrossTab._pageId].concat(peers.map(p => p.pageId)).sort()[0];
      if (winnerId === CrossTab._pageId) {
        // 先落 running 再返回：让出方的观察窗口里必须能看到"赢家已开跑"，
        // 否则双方同时裁决时会让出方误判、接管执行，变成两边都抢。
        CrossTab.mark(taskId, targetMs, 'running');
        this.updatePageLog(`【跨页裁决】另有 ${peers.length} 个页签同时抢 ${taskId}，本页取得执行权，正常抢码`);
        return true;
      }
      CrossTab.mark(taskId, targetMs, 'yielded');
      this.updatePageLog(`【跨页让出】另有页签（${String(winnerId).slice(0, 8)}）同时抢 ${taskId}，本页让出，正在确认对方已开跑…`);
      await Util.sleep(this.CROSS_TAKEOVER_MS);
      const winner = CrossTab.execMarkers(taskId).find(it => it.pageId === winnerId);
      if (winner) {
        Util.warn(`跨页互斥：task_id=${taskId} 已让给另一页签执行`);
        this.updatePageLog('【跨页让出】对方已开始执行，本页不重复抢码');
        this.setStatus(`已让出：另一页签正在执行 ${taskId}`);
        return false;
      }
      Util.warn('跨页互斥：另一页签未按预期开始执行，本页接管');
      this.updatePageLog('【跨页接管】另一页签未开始执行，本页接管，任务不会丢失');
      return true;
    },

    /**
     * 重建排期。
     * 顺序有讲究：**只读校验全部前置，通过之后才销毁旧定时器并武装新排期**。
     * 旧版第一句就 _cleanupTimers()，后面任何一处 return 都会把当天唯一一条排期悄悄丢掉。
     * opts.overrideTargetMs: 失败/锁冲突补触发用，直接指定触发时刻，不再解析 start_time。
     * opts.skipImmediate: 本轮已执行过（点击结束后重建），过点一律顺延，绝不再立即补一次。
     */
    scheduleCurrentTask(opts = {}) {
      if (!this.state.baseConfig) return false;
      const taskId = Util.extractTaskIdFromPage() || 'unknown_task';
      if (!taskId || taskId === 'unknown_task') return false;
      const cfg = this.state.taskConfigs[taskId] || Util.defaultTaskConfig(taskId);
      const startTimeStr = cfg.start_time || CONFIG.DEFAULT_START_TIME;
      const nowMs = Math.round(ServerTime.now());
      const overrideMs = Number(opts.overrideTargetMs);
      const isOverride = Number.isFinite(overrideMs);
      let parsed;
      if (isOverride) {
        parsed = {
          raw: '', normalized: Util.formatTime(new Date(overrideMs)),
          target: new Date(overrideMs), delayMs: Math.max(0, overrideMs - nowMs), mode: 'override'
        };
      } else {
        // noPushTomorrow：部署时也先按"今天"解释，过点由下面显式分流 ——
        // 旧版把"已过点"直接推到明天，等于当天静默不点（线上目标时刻 00:29:57 出现 852 次全部踩在这里）
        parsed = Util.parseTimeSpec(startTimeStr, ServerTime.nowDate(), { noPushTomorrow: true });
        if (!parsed || !Number.isFinite(parsed.delayMs)) return false;
        if (parsed.invalid) {
          Util.warn(`scheduleCurrentTask: 开始时间 "${startTimeStr}" 无法识别，已回退默认 ${parsed.normalized}`);
          this.updatePageLog(`【时间回退】"${startTimeStr}" 无法识别，按默认 ${parsed.normalized} 排期`);
        } else if (!cfg.start_time || String(cfg.start_time).trim() === CONFIG.DEFAULT_START_TIME) {
          Util.warn(`scheduleCurrentTask: task_id=${taskId} 未配置领取时间，使用默认 ${CONFIG.DEFAULT_START_TIME}`);
          this.updatePageLog(`【默认时间】task_id=${taskId} 未配置领取时间，按默认 ${CONFIG.DEFAULT_START_TIME} 排期`);
        }
        const lateMs = nowMs - parsed.target.getTime();
        const consumedRecently = !!(this._consumedTarget && this._consumedTarget.taskId === taskId
          && Math.abs(nowMs - this._consumedTarget.atMs) <= this.CONSUMED_GUARD_MS);
        if (lateMs > 0 && !opts.skipImmediate && lateMs <= this.SCHEDULE_LATE_GRACE_MS && !consumedRecently) {
          // 刚到点（≤60s）且本轮还没点过：立即执行，别把当天排期丢掉
          Util.warn(`scheduleCurrentTask: 目标 ${parsed.normalized} 已过 ${(lateMs / 1000).toFixed(1)}s，立即执行`);
          this.updatePageLog(`【过点执行】${parsed.normalized} 已过 ${(lateMs / 1000).toFixed(1)}s，立即执行`);
          parsed = { ...parsed, target: new Date(nowMs), delayMs: 0 };
        } else if (lateMs > 0) {
          // 明显历史时刻（白天打开页面看凌晨任务）或本轮已经执行过：顺延到明天
          const tomorrow = new Date(parsed.target.getTime() + 24 * 3600 * 1000);
          Util.warn(`scheduleCurrentTask: 目标 ${parsed.normalized} 已过 ${(lateMs / 1000).toFixed(1)}s，顺延到明天 ${Util.formatTime(tomorrow)}`);
          this.updatePageLog(`【时间顺延】${parsed.normalized} 已过 ${(lateMs / 1000).toFixed(1)}s，顺延到明天 ${Util.formatTime(tomorrow)}`);
          parsed = { ...parsed, target: tomorrow, delayMs: tomorrow.getTime() - nowMs };
        }
      }
      // —— 校验通过，从这里开始才动状态 ——
      this._cleanupTimers();
      this._setupVisibilityCheck();
      this._initBackgroundWorker();      // 后备心跳 + AudioContext 保活
      this._currentStartTimeStr = startTimeStr;
      this._currentScheduledTaskId = taskId;
      this._currentTargetMs = parsed.target.getTime();
      this._fired = false;
      // 跨标签页登记：补触发沿用同一任务登记，不重复做冲突预警
      CrossTab.register(taskId, this._currentTargetMs, 'scheduled');
      if (!isOverride) {
        this._skipRetries = 0;
        this._failRetries = 0;
        this._warnCrossTabConflict(taskId, this._currentTargetMs);
      }
      this._scheduleGeneration = (this._scheduleGeneration || 0) + 1;
      const gen = this._scheduleGeneration;
      Util.log('schedule current task:', taskId, parsed.normalized, 'delay=', parsed.delayMs, isOverride ? '(override)' : '');
      this.updatePageLog('[AutoSchedule] task_id=' + taskId + ' start=' + parsed.normalized + ' countdown=' + (parsed.delayMs / 1000).toFixed(3) + 's');
      // 立即用当前缓存 offset 武装主线程精确定时器（不等待网络）；
      // 随后异步校准并启动自适应校准，仅在早于目标足够时间时提升 offset 精度。
      this._armPreciseTimer(gen);
      ServerTime.calibrate().then(() => {
        if (this._scheduleGeneration === gen) this._startAdaptiveCalibration();
      });
      return true;
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

    async saveConfig() {
      const taskId = Util.extractTaskIdFromPage() || 'unknown_task';
      // 未连接到服务端（未登录 / 加载失败）时面板里显示的是默认值：
      // 此时保存会用默认值覆盖用户已保存的配置（含用户锁定的抢码时间与点击模式），必须拒绝。
      if (!this.state.baseConfig) {
        Util.warn('saveConfig: 未连接到服务端，拒绝保存以免用默认值覆盖已保存配置');
        this.showToast('未连接到服务端，暂不能保存配置', 'warn');
        this.setStatus('未连接到服务端，暂不能保存配置');
        return;
      }
      const cfg = this.syncCurrentTaskConfigFromInputs({ log: true }) || this.state.taskConfigs[taskId] || Util.defaultTaskConfig(taskId);
      this.state.taskConfigs[taskId] = cfg;
      this.saveTaskConfigs();
      this.showToast('配置已保存', 'success');
      this.setStatus(`✅ 配置已保存，正在刷新任务列表...`);
      Util.info('面板: 配置已保存:', taskId, cfg);
      await this.refresh();
    },

    async runCurrent() {
      if (this.state.running) {
        // 不再强制解锁重跑：原来这条分支会让「自动调度 + 手动点击」同时连点，
        // 造成同一时刻两路请求（direct 模式下即触发风控）。
        const msg = this._currentScheduledTaskId
          ? `已有任务正在等待/执行（task_id=${this._currentScheduledTaskId}），本次不再重复执行`
          : '正在执行中...';
        Util.warn('runCurrent: ' + msg);
        this.setStatus(msg);
        this.showToast('已有任务在等待/执行中，已忽略本次手动执行', 'warn');
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
      if (Panel.state.running) {
        Util.warn('登录成功但任务正在执行，跳过重新进入 main');
      } else {
        main();
      }
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

    render() {
      const panel = document.getElementById('biliauto-panel');
      const fab = document.getElementById('biliauto-fab');
      if (!panel || !fab) return;

      panel.classList.toggle('tm-panel-visible', this.state.expanded);
      fab.classList.toggle('tm-fab-hidden', this.state.expanded);
      this.applyTheme();
      this.ensureGroupModeOption();

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
        // 不覆盖用户正在编辑的输入框（仅首次渲染或值确实不同时更新）
        if (intervalInput && !intervalInput.dataset.currentConfigLiveBound) {
          intervalInput.value = cfg.interval || CONFIG.DEFAULT_CLICK_INTERVAL_MS / 1000;
        }
        if (durationInput && !durationInput.dataset.currentConfigLiveBound) {
          durationInput.value = cfg.duration || CONFIG.DEFAULT_CLICK_DURATION_MS / 1000;
        }
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
  // 网络 hook 安装器（单一实现，两种注入方式共用）
  // - unsafeWindow 路径：直接以 unsafeWindow 为 win 调用，规避 CSP 对内联脚本的拦截
  // - 页面注入路径：将本函数源码注入 <script> 在页面上下文执行（unsafeWindow 为沙箱代理时兜底）
  // 必须完全自包含（不引用 Util 等外层作用域），仅通过 win.postMessage 与主脚本通信。
  // win.__BILIAUTO_REWARD_HOOK_INSTALLED__ 幂等守卫确保两条路径只有一条真正生效。
  // ========================
  const installNetworkHooks = function biliautoInstallNetworkHooks(win) {
    try {
      if (!win || win.__BILIAUTO_REWARD_HOOK_INSTALLED__) return false;
      win.__BILIAUTO_REWARD_HOOK_INSTALLED__ = true;
      var SOURCE = 'BILIAUTO_REWARD_MONITOR';
      var API_PREFIX = '/x/activity_components/mission/';
      var getUrl = function (input) {
        if (typeof input === 'string') return input;
        if (input && input.url) return input.url;
        return '';
      };
      var getKind = function (url) {
        if (!url || url.indexOf(API_PREFIX) === -1) return '';
        if (url.indexOf('/mission/receive') !== -1) return 'receive';
        if (url.indexOf('/mission/info') !== -1) return 'info';
        if (url.indexOf('/mission/mylist') !== -1) return 'mylist';
        return 'mission';
      };
      var readTaskId = function (url, body) {
        try {
          var fromUrl = new win.URL(url, win.location.href).searchParams.get('task_id');
          if (fromUrl) return fromUrl;
        } catch (e) {}
        try {
          if (typeof body === 'string') return new win.URLSearchParams(body).get('task_id') || '';
          if (win.URLSearchParams && body instanceof win.URLSearchParams) return body.get('task_id') || '';
          if (win.FormData && body instanceof win.FormData) return body.get('task_id') || '';
        } catch (e) {}
        return '';
      };
      var post = function (kind, url, status, text, body) {
        try {
          win.postMessage({
            source: SOURCE,
            payload: { kind: kind, url: url, status: status, text: text || '', taskId: readTaskId(url, body) }
          }, '*');
        } catch (e) {}
      };
      if (win.fetch) {
        var rawFetch = win.fetch;
        win.fetch = function (input, init) {
          var url = getUrl(input);
          var body = init && init.body;
          var kind = getKind(url);
          return rawFetch.apply(this, arguments).then(function (resp) {
            if (kind) {
              try {
                resp.clone().text().then(function (text) { post(kind, url, resp.status, text, body); }).catch(function () {});
              } catch (e) {}
            }
            return resp;
          });
        };
      }
      if (win.XMLHttpRequest) {
        var RawXHR = win.XMLHttpRequest;
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
      // 直接调用 B站 receive 组件方法，绕过页面 1s 节流；保留 isExchangeLoading 检查防止并发请求
      win.__biliauto_receive_direct = function (source) {
        var setReason = function (reason) { win.__biliauto_receive_direct_last_reason = reason || 'unknown'; };
        try {
          var appEl = win.document.querySelector('#app');
          if (!appEl || !appEl.__vue__) { setReason('#app or __vue__ not found'); return false; }
          var root = appEl.__vue__;
          var visited = [];
          var findReceiveComponent = function (vm) {
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
          if (!indexComp || typeof indexComp.handelReceive !== 'function') { setReason('component with handelReceive not found'); return false; }
          if (indexComp.isExchangeLoading) { setReason('blocked by isExchangeLoading'); return false; }
          indexComp.handelReceive(source || 'script');
          setReason('handelReceive invoked');
          return true;
        } catch (err) {
          setReason('invoke failed: ' + (err && err.message || String(err)));
          return false;
        }
      };
      return true;
    } catch (e) {
      return false;
    }
  };

  // ========================
  // 领取接口监控 + 任务信息捕获
  // ========================
  const RewardMonitor = {
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
        if (!pageWindow) return false;
        const ok = installNetworkHooks(pageWindow);
        if (ok) Util.info('RewardMonitor unsafeWindow hook installed');
        return ok;
      } catch (e) {
        Util.warn(`RewardMonitor unsafeWindow hook failed: ${e.message}`);
        return false;
      }
    },

    _injectPageHook() {
      if (document.getElementById('biliauto-reward-page-hook')) return;
      // 注入与 unsafeWindow 路径完全相同的安装器源码，在页面上下文以 window 为 win 执行
      const code = ';(' + installNetworkHooks.toString() + ')(window);';
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

    saveMissionInfo(json, url) {
      Util.info(`saveMissionInfo 被调用: url=${url} code=${json && json.code} hasData=${!!(json && json.data)}`);
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
      Util.info(`info 数据解析: task_id="${taskId}" task_name="${taskName}" act_name="${actName}" award_name="${awardName}" award_description=${awardDesc ? '存在(' + awardDesc.length + '字)' : '空'}`);
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
          Util.info(`准备提交奖励说明给AI解析: task_id=${taskId} desc_len=${awardDesc.length}`);
          const firstSeenAt = Util.formatTime(ServerTime.nowDate());
          API.submitAwardDescription(taskId, awardDesc, firstSeenAt).then(resp => {
            Util.info(`AI解析提交响应: ${JSON.stringify(resp)}`);
            if (resp && resp.status === 'success' && resp.task_parsed && resp.task_parsed.daily_claim_time && resp.task_parsed.daily_claim_time !== '不限') {
              const ct = resp.task_parsed.daily_claim_time;
              const adjusted = Util.claimTimeMinusSeconds(ct, 3);
              if (Panel.updateTaskConfig(taskId, 'start_time', adjusted, { silent: true, noRender: true, source: 'ai' }) !== false) {
                Util.info(`AI解析: 自动设置抢码时间 ${ct} -> ${adjusted}（提前3秒）`);
              }
            }
          }).catch(e => {
            Util.info(`提交奖励说明失败: ${e.message || e}`);
          });
        } else {
          Util.info(`info API 未返回 award_description，跳过AI解析`);
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
        const startedAt = Util.perfNow();
        const timer = setInterval(() => {
          const captured = this.get(taskId);
          if (captured || Util.perfNow() - startedAt >= timeoutMs) {
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
      // 用单调计数器而非墙钟：连点期间若系统对时，墙钟跳变会提前/延后结束连点
      const startTime = Util.perfNow();
      const endTime = startTime + durationMs;
      const taskId = RewardMonitor.currentTaskId();
      // 从任务配置读取点击模式（默认dom保证安全）
      const taskCfg = Panel && Panel.state && Panel.state.taskConfigs && Panel.state.taskConfigs[taskId];
      const clickMode = (taskCfg && taskCfg.click_mode) || CONFIG.DEFAULT_CLICK_MODE;
      const isDirectMode = clickMode === 'direct';
      const isGroupMode = clickMode === 'group';
      const logToPanel = (msg) => {
        if (Panel && Panel.updatePageLog) {
          Panel.updatePageLog(msg);
        }
      };
      // endTime 基于单调计数器，不可再拿去构造绝对时间。
      // 群友方式的取按钮方式不在日志/面板里暴露，统一记作「内置」。
      const selectorLabel = isGroupMode ? '内置' : selector;
      Util.info(`开始连点: selector=${selectorLabel}, interval=${intervalMs}ms, duration=${durationMs}ms, mode=${clickMode}`);
      logToPanel(`【连点开始】task_id=${taskId} 间隔=${intervalMs}ms 时长=${(durationMs / 1000).toFixed(3)}秒`);
      let btn = Util.getByXPath(selector);
      // 群友方式不改动按钮本身（保持页面原生状态）；其它模式沿用原来的激活逻辑
      if (btn && !isGroupMode) Executor.activateButton(btn);

      // 点击前主动探一次余量：页面在临界期不会再请求 info，只有主动探测才知道当时有没有货
      StockProbe.reset();
      let stopReason = '';
      if (StockProbe.enabled()) {
        const first = await StockProbe.probe(taskId);
        if (first) {
          const desc = StockProbe.describe(first);
          Util.info('余量探测: ' + desc);
          logToPanel('【余量】' + desc);
        } else {
          Util.log('余量探测: 首次探测未取到（不影响抢码）');
        }
      }

      // 执行单次点击的内部函数
      const doClick = () => {
        try {
          if (isDirectMode) {
            const directFn = typeof unsafeWindow !== 'undefined' && unsafeWindow.__biliauto_receive_direct;
            if (directFn && directFn('user')) {
              successCount++;
            } else {
              failCount++;
            }
          } else if (isGroupMode) {
            // 页面重渲染后旧节点会失效，失效时重新获取
            if (!btn || !btn.isConnected) btn = Util.getByXPath(selector);
            if (btn) {
              btn.click();
              successCount++;
            } else {
              failCount++;
            }
          } else {
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
      };

      // 立即执行第一次点击，避免后台标签页首个定时器回调延迟导致 0 次点击
      doClick();
      {
        const now = Util.perfNow();
        const captured = RewardMonitor.get(taskId);
        if (captured && captured._continuedClickLogged !== true) {
          captured._continuedClickLogged = true;
          const summary = `【API 捕获】/mission/receive 响应 code=${captured.response_code}`;
          Util.info(summary);
          logToPanel(summary);
        }
        Util.log(`【首次点击】成功 ${successCount} 失败 ${failCount}`);
      }

      // 连点期间按低频率持续主动探测余量；命中"已领取/没货"即提前停止
      // （不需要像原脚本那样每 3 秒同步等待，探测与点击互不阻塞）
      if (StockProbe.enabled()) {
        StockProbe.start(taskId, (s) => {
          const desc = StockProbe.describe(s);
          Util.info('余量探测: ' + desc);
          logToPanel('【余量】' + desc);
          if (StockProbe.stopWhenClaimed() && StockProbe.claimed(s)) {
            stopReason = '已领取(status=' + s.status + ')';
            logToPanel('【提前停止】' + stopReason);
          } else if (StockProbe.stopWhenEmpty() && StockProbe.empty(s)) {
            stopReason = '余量已空';
            logToPanel('【提前停止】' + stopReason);
          }
        });
      }

      return new Promise((resolve) => {
        let lastLogTime = Util.perfNow();
        let stopped = false;
        const finish = (reason) => {
          if (stopped) return;
          stopped = true;
          StockProbe.stop();
          if (reason && !stopReason) stopReason = reason;
          const summary = `【连点结束】成功 ${successCount} 次, 失败 ${failCount} 次, 总点击 ${successCount + failCount} 次`
            + (stopReason ? `（提前停止：${stopReason}）` : '');
          Util.info(summary);
          logToPanel(summary);
          resolve({
            success_count: successCount,
            fail_count: failCount,
            early_exit: !!stopReason,
            stop_reason: stopReason
          });
        };
        // 单次循环体；返回 true 表示已到期
        const tick = () => {
          const now = Util.perfNow();
          const remaining = Math.max(0, endTime - now);
          logToPanel(`【连点倒计时】${(remaining / 1000).toFixed(3)}s`);
          const captured = RewardMonitor.get(taskId);
          if (captured && captured._continuedClickLogged !== true) {
            captured._continuedClickLogged = true;
            const summary = `【API 捕获】/mission/receive 响应 code=${captured.response_code}`;
            Util.info(summary);
            logToPanel(summary);
          }
          // 抢到即停：receive 返回 code 0 是所有信号里最快的一个，无需等轮询
          if (captured && captured.response_code === 0) {
            return 'receive-code-0';
          }
          // 余量探测给出的停止原因（更新中/已领取/没货）
          if (stopReason) return stopReason;
          // 先执行点击，再检查是否到期，确保至少执行一次点击
          doClick();
          if (now >= endTime) return true;
          if (stopReason) return stopReason;
          if (now - lastLogTime > 2000) {
            lastLogTime = now;
            const elapsed = ((now - startTime) / 1000).toFixed(3);
            const progressMsg = `【连点进度】${elapsed}s / ${(durationMs / 1000).toFixed(3)}s 成功 ${successCount} 失败 ${failCount}`;
            Util.log(progressMsg);
            logToPanel(progressMsg);
          }
          return false;
        };
        if (isGroupMode) {
          // 群友方式：自身递归 setTimeout，每次间隔在基准值上下浮动，不用固定周期
          const nextDelay = () => Math.max(30, Math.round(intervalMs * (0.6 + Math.random() * 0.8)));
          const loop = () => {
            if (stopped) return;
            const r = tick();
            if (r) { finish(typeof r === 'string' ? r : ''); return; }
            setTimeout(loop, nextDelay());
          };
          // 首次点击已在上面执行过，这里等一个间隔再进循环，避免 t=0 连点两次
          setTimeout(loop, nextDelay());
          return;
        }
        const timer = setInterval(() => {
          const r = tick();
          if (r) {
            clearInterval(timer);
            finish(typeof r === 'string' ? r : '');
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
      const resultMsg = '未捕获到 /mission/receive API 响应，暂不使用 DOM/按钮文字判断';
      Util.warn(resultMsg);
      logToPanel(resultMsg);
      return { ok: false, response_code: -1, message: resultMsg };
    },

    async setupCurrentPage(selector, maxAttempts, options = {}) {
      Util.log(`setupCurrentPage: 查找按钮 selector=${selector}, 最多尝试 ${maxAttempts} 次`);
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        const btn = Util.getByXPath(selector);
        if (btn) {
          // 群友方式保持页面原生按钮状态，不做任何注入式改动
          if (!options.skipActivate) this.activateButton(btn);
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
      // 现取最新配置：loadTaskConfigs()/updateTaskConfig() 每次都返回全新对象，
      // 调用方(main)持有的快照与 Panel.state.taskConfigs 没有引用关系，
      // 不现取就会丢掉 AI 解析回填的 start_time，导致调度器与执行路径等到不同时刻。
      const liveCfg = Panel && Panel.state && Panel.state.taskConfigs && Panel.state.taskConfigs[taskId];
      if (liveCfg) config = { ...config, ...liveCfg };
      const startTimeStr = config.start_time || CONFIG.DEFAULT_START_TIME;
      const intervalMs = Math.max(0, Number(config.interval || CONFIG.DEFAULT_CLICK_INTERVAL_MS / 1000) * 1000);
      const durationMs = Math.max(1, Number(config.duration || CONFIG.DEFAULT_CLICK_DURATION_MS / 1000) * 1000);
      // 交由 waitUntil 内部校准后重新计算 startTime，避免校准前后基准不一致导致提前点击
      const actualStartTime = await this.waitUntil(startTimeStr);
      const startSpec = Util.parseTimeSpec(startTimeStr, ServerTime.nowDate());
      if (startSpec.invalid) {
        const warnMsg = `任务 ${taskId} 的开始时间 "${config.start_time}" 无法识别，已回退为 ${startSpec.normalized}`;
        Util.warn(warnMsg);
        Panel.updatePageLog(`【时间回退】${warnMsg}`);
      }
      Util.info(`任务配置: task_id=${taskId} start=${startSpec.normalized} interval=${intervalMs}ms duration=${durationMs}ms`);
      Panel.updatePageLog(`【任务配置】task_id=${taskId} 开始时间=${startSpec.normalized} 间隔=${intervalMs}ms 时长=${(durationMs / 1000).toFixed(3)}s`);
      RewardMonitor.clear(taskId);
      Util.info(`开始执行任务: ${taskId}`);
      Panel.updatePageLog(`【任务开始】task_id=${taskId} 计划时间=${startSpec.normalized} 实际时间=${Util.formatTime()}`);

      // 跨标签页互斥：等待期间可能有新页签排入同一任务，到点瞬间复核（按目标时刻判定是否冲突）。
      // 用 ServerTime.now() 而非 startSpec.target —— 后者在 waitUntil 之后解析会把刚到的时刻顺延到明天，
      // 拿它比对会导致永远判不出冲突。
      const targetMs = Math.round(ServerTime.now());
      // 跨页裁决：对方真的在跑才让出；对方已关闭/卡死则由本页接管，绝不静默取消任务
      const proceed = await Panel.resolveFireConflict(taskId, targetMs);
      if (!proceed) return null;
      CrossTab.mark(taskId, targetMs, 'running');
      // 本轮"真的发起点读"的本地记号：调度补触发/失败重试都要看它，避免二次点击
      if (Panel) Panel._consumedTarget = { taskId: taskId, atMs: Math.round(ServerTime.now()) };

      let clickStats;
      try {
        clickStats = await this.performContinuousClick(selector, intervalMs, durationMs);
      } finally {
        // 只释放 running（保留可能存在的 done）：此时还不知道成败，
        // 无条件写 done 会让失败后的重试在 120 秒内被自己挡住。
        CrossTab.release(taskId);
      }
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
        const btn = Util.getByXPath(selector);
        claimResult = await this.judgeClaimResult(btn, taskId);
      }
      // 只有确认抢到才留"已完成"墓碑，避免失败后挡住重试；失败则已在上面的 finally 释放
      if (claimResult.ok) CrossTab.markDone(taskId);
      const elapsedTime = clickStats.early_exit ? ((totalCount * intervalMs) / 1000).toFixed(3) : (durationMs / 1000).toFixed(3);
      if (clickStats.stop_reason) {
        Util.info(`任务 ${taskId} 提前停止：${clickStats.stop_reason}`);
        Panel.updatePageLog(`【提前停止】task_id=${taskId} ${clickStats.stop_reason}`);
      }
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
        },
        click_stats: {
          success_count: successCount,
          fail_count: clickStats.fail_count || 0,
          total_count: totalCount,
          elapsed_time: elapsedTime
        },
        api_responses: (RewardMonitor.responseCache[taskId] || []).map(r => ({
          response_code: r.response_code,
          status: r.status,
          message: r.message,
          cdkey: r.cdkey || '',
          timestamp: r.timestamp,
          http_status: r.status_code || 0,
          url: r.url || ''
        }))
      };
      return results[taskId];
    },

    async waitUntil(startTimeStr) {
      // 仅在剩余时间充足（>6s）时做一次网络校准以提升 offset 精度；
      // 临近目标只用缓存 offset，避免把网络 RTT 注入临界路径导致点击延后。
      // 执行等待时用 noPushTomorrow：不把已过的 clock 时间推至明天，
      // 这样到点/已过的目标 diff <= 0 会立即执行，而非再等 24h。
      let spec = Util.parseTimeSpec(startTimeStr, ServerTime.nowDate(), { noPushTomorrow: true });
      if (spec.target.getTime() - ServerTime.now() > 6000) {
        await ServerTime.calibrate({ deadlineMs: spec.target.getTime() });
        spec = Util.parseTimeSpec(startTimeStr, ServerTime.nowDate(), { noPushTomorrow: true });
      }
      // clock 模式过期保护：若已过超过 60s（明显是历史时刻，非刚到点），
      // 顺延到明天同一时刻。避免白天打开页面时凌晨时刻已过立即误触发。
      // 刚到点（diff 在 -60s 到 0）仍立即执行，保留时间到不触发的修复兼容性。
      // 相对时间模式（+0/+30 等）不受影响，保留立即执行语义。
      const STALE_THRESHOLD_MS = 60 * 1000;
      const isClockMode = spec.mode === 'clock' || spec.mode === 'tomorrow-clock';
      if (isClockMode) {
        const realDiff = spec.target.getTime() - ServerTime.now();
        if (realDiff < -STALE_THRESHOLD_MS) {
          const tomorrowTarget = new Date(spec.target.getTime() + 24 * 3600 * 1000);
          const staleSec = (-realDiff / 1000).toFixed(1);
          Util.warn(`waitUntil: 目标时刻 ${spec.normalized} 已过 ${staleSec}s（超过 60s 阈值），顺延到明天 ${Util.formatTime(tomorrowTarget)}`);
          Panel.updatePageLog(`【时间顺延】${spec.normalized} 已过 ${staleSec}s，顺延到明天执行`);
          spec = { ...spec, target: tomorrowTarget };
        }
      }
      const targetTime = spec.target;
      const targetMs = targetTime.getTime();
      const diff = targetMs - ServerTime.now();
      if (diff <= 0) {
        Util.log('waitUntil: 目标时间已过，立即执行');
        return targetTime;
      }
      Util.info(`等待 ${(diff / 1000).toFixed(3)} 秒 (到 ${Util.formatTime(targetTime)}) 后开始执行...`);
      return new Promise(resolve => {
        const poll = () => {
          const remaining = targetMs - ServerTime.now();
          if (remaining <= 0) {
            Util.info('等待结束，开始执行');
            resolve(targetTime);
            return;
          }
          if (remaining <= 10) {
            // 最后 ≤10ms 自旋，规避 setTimeout 的 ~4ms 钳制精确命中
            const targetNow = ServerTime.now() + remaining;
            while (ServerTime.now() < targetNow) { /* busy-wait ≤10ms */ }
            Util.info('等待结束，开始执行');
            resolve(targetTime);
            return;
          }
          setTimeout(poll, remaining > 2000 ? 250 : (remaining > 500 ? 30 : 5));
        };
        poll();
      });
    }
  };

  // ========================
  // 批量上传 - 对标 Python server.py batch_upload_results
  // ========================
let _batchUploadPromise = null;
async function batchUploadAllResults(results) {
    // 互斥：防止并发调用导致重复上传同一批日志
    if (_batchUploadPromise) {
        Util.log('batchUploadAllResults: 等待上一次上传完成');
        await _batchUploadPromise;
    }
    _batchUploadPromise = _doBatchUpload(results);
    try {
        return await _batchUploadPromise;
    } finally {
        _batchUploadPromise = null;
    }
}

async function _doBatchUpload(results) {
    const uploadResults = Object.values(results || {}).filter(item => item && item.task_id);
    const uploadPayload = {
        device_name: CONFIG.DEVICE_NAME,
        total_tasks: uploadResults.length,
        results: uploadResults,
        upload_time: Util.formatTime()
    };
    Util.info(`批量上传: ${uploadResults.length} 个当前执行任务结果`);
    Util.log('批量上传结果:', uploadPayload);
    const resp = await API.uploadWithRetry(uploadPayload);
    // 构建执行摘要：点击参数、API响应、点击结果
    const executionSummary = uploadResults.map(r => ({
      task_id: r.task_id,
      task_name: r.task_name || '',
      device_name: r.device_name || CONFIG.DEVICE_NAME,
      status: r.status,
      response_code: r.response_code,
      message: r.message || '',
      cdkey: r.cdkey || '',
      timestamp: r.timestamp || Util.formatTime(),
      click_params: r.task_config || {},
      click_stats: r.click_stats || {},
      api_responses: r.api_responses || []
    }));
    // 上传日志：先复制不清空，上传成功后只移除已上传的条数，失败时保留日志供下次重试
    try {
        const logs = Util.getLogs();
        if (logs.length > 0) {
            const toUpload = logs.slice(-100);
            const uploadedCount = toUpload.length;
            const snapshotLen = logs.length;
            const logResp = await API.uploadLogs({
                device_name: CONFIG.DEVICE_NAME,
                task_id: uploadResults.length > 0 ? uploadResults[0].task_id : '',
                logs: toUpload,
                execution_summary: executionSummary
            });
            if (logResp && logResp.status === 'success') {
                // 移除已上传的条目（快照时最后 uploadedCount 条），保留上传期间新增的日志
                if (Util._logBuffer.length >= snapshotLen) {
                    Util._logBuffer.splice(snapshotLen - uploadedCount, uploadedCount);
                } else {
                    // 缓冲区被前端裁剪过，从末尾移除
                    Util._logBuffer.splice(-uploadedCount);
                }
                Util.log(`日志上传成功，已移除 ${uploadedCount} 条`);
            } else {
                Util.warn(`日志上传返回非成功状态: ${logResp && logResp.status}，保留日志缓冲`);
            }
        }
    } catch(e) {
        Util.warn(`日志上传失败: ${e.message}，保留日志缓冲供下次重试`);
    }
    return resp;
}

  // ========================
  // 当前页面任务流程
  // ========================
  async function runCurrentPageTask(baseConfig, taskId, taskConfig, taskName = '') {
    // 现取最新配置，避免调用方快照与 Panel.state 脱钩时用错模式
    const liveCfg = (Panel && Panel.state && Panel.state.taskConfigs && Panel.state.taskConfigs[taskId]) || taskConfig || {};
    const mode = liveCfg.click_mode || CONFIG.DEFAULT_CLICK_MODE;
    const isGroupMode = mode === 'group';
    // 群友方式直接使用页面原生按钮，不依赖服务端配置的选择器
    const selector = isGroupMode ? '.exchange-button' : baseConfig.reward_claim_selector;
    const maxAttempts = Number(baseConfig.max_reload_attempts || baseConfig.context_retry_count || CONFIG.MAX_RELOAD_ATTEMPTS);
    if (!selector) throw new Error('缺少 reward_claim_selector 配置');
    Util.info(`runCurrentPageTask: task_id=${taskId} task_name=${taskName} selector=${isGroupMode ? '内置' : selector} maxAttempts=${maxAttempts}`);

    Util.log('设置当前页面(查找按钮)...');
    const ready = await Executor.setupCurrentPage(selector, maxAttempts, { skipActivate: isGroupMode });
    if (!ready) throw new Error('所有尝试均失败，未找到领取按钮');
    Util.info('页面设置完成');

    const results = {};
    Util.log(`执行单任务: ${taskId}`);
    const executed = await Executor.runSingleTask(taskId, taskConfig || Util.defaultTaskConfig(taskId), selector, results);
    // runSingleTask 返回 null = 跨标签页让出，本次未执行，不发"执行完成"通知
    if (executed === null) return results;

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
        if (latest.force_update && Util.isNewerVersion(latest.version, CONFIG.VERSION)) {
          Util.warn('强制更新: 版本过低, 阻塞执行');
          Panel.showForceUpdateOverlay(latest);
          return;
        }
      }
    } catch (e) {
      Util.log('版本预检失败(不影响主流程):', e.message || e);
    }

    // GitHub 镜像版本检查：只提示、不强制更新；
    // 断网/镜像故障一律降级为日志，不阻塞后续抢码主流程
    Panel.checkMirrorUpdate(false);

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
            first_seen_at: Util.formatTime(ServerTime.nowDate()),
            extract_time: Util.formatTime()
          };
          Util.log(`上传页面信息: task_id=${taskId} section_title="${domPageInfo.section_title}" award_info="${domPageInfo.award_info}"`);
          API.uploadPageInfo(payload).then(resp => {
            Util.log(`页面信息上传成功:`, resp && resp.status);
            if (resp && resp.task_parsed && resp.task_parsed.daily_claim_time && resp.task_parsed.daily_claim_time !== '不限') {
              const claimTime = resp.task_parsed.daily_claim_time;
              const adjusted = Util.claimTimeMinusSeconds(claimTime, 3);
              if (Panel.updateTaskConfig(taskId, 'start_time', adjusted, { silent: true, noRender: true, source: 'ai' }) !== false) {
                Util.info(`自动设置抢码时间: ${claimTime} -> ${adjusted}（提前3秒）`);
              }
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
            const adjusted = Util.claimTimeMinusSeconds(claimTime, 3);
            const currentCfg = Panel.state.taskConfigs[taskId];
            if (currentCfg && currentCfg.start_time !== adjusted) {
              if (Panel.updateTaskConfig(taskId, 'start_time', adjusted, { silent: true, noRender: true, source: 'ai' }) !== false) {
                Util.info(`AI解析: 自动设置抢码时间 ${claimTime} -> ${adjusted}（提前3秒）`);
              }
            }
          }
        }).catch(e => {
          Util.log(`查询任务解析信息失败: ${e.message || e}`);
        });

        // 如果 hook 未捕获 award_description，直接从 B站 API 获取
        const missionInfo = RewardMonitor.getMissionPageInfo(taskId);
        if (!missionInfo || !missionInfo.award_description) {
          Util.info('hook 未捕获 award_description，尝试直接请求 B站 info API...');
          const infoUrl = 'https://api.bilibili.com/x/activity_components/mission/info?task_id=' + encodeURIComponent(taskId);
          fetch(infoUrl, { credentials: 'include' }).then(r => r.json()).then(infoJson => {
            if (infoJson && infoJson.code === 0 && infoJson.data) {
              const desc = infoJson.data.reward_info && infoJson.data.reward_info.award_description || '';
              if (desc) {
                Util.info(`直接请求 B站 info API 成功，award_description 存在(${desc.length}字)`);
                const firstSeenAt = Util.formatTime(ServerTime.nowDate());
                API.submitAwardDescription(taskId, desc, firstSeenAt).then(r => {
                  Util.info(`AI解析提交响应: ${JSON.stringify(r)}`);
                  if (r && r.status === 'success' && r.task_parsed && r.task_parsed.daily_claim_time && r.task_parsed.daily_claim_time !== '不限') {
                    const ct = r.task_parsed.daily_claim_time;
                    const adjusted = Util.claimTimeMinusSeconds(ct, 3);
                    Util.info(`AI解析: 自动设置抢码时间 ${ct} -> ${adjusted}（提前3秒）`);
                    Panel.updateTaskConfig(taskId, 'start_time', adjusted, { silent: true, noRender: true, source: 'ai' });
                  }
                }).catch(e => Util.log(`提交奖励说明失败: ${e.message || e}`));
              } else {
                Util.info('B站 info API 返回的 award_description 为空');
              }
            } else {
              Util.info(`B站 info API 返回异常: ${infoJson && infoJson.message || '未知'}`);
            }
          }).catch(e => {
            Util.log(`直接请求 B站 info API 失败: ${e.message || e}`);
          });
        }
      }

      const currentTask = Util.findTaskById(tasks, taskId);
      if (!taskName) taskName = Util.getTaskName(currentTask);
      Util.info(`当前页面任务: task_id=${taskId} task_name="${taskName}"`);

      const taskConfigs = Util.loadTaskConfigs(tasks);
      Util.log(`加载了 ${Object.keys(taskConfigs).length} 个任务配置`);
      // 设置执行锁，并撤销调度器已武装的到点定时器：
      // main 会自己等 start_time 再连点，若不撤销，调度器会在同一毫秒再起一份连点，
      // 两路并发直接把 direct 模式的请求量翻倍，触发 B 站风控 / IP 异常。
      Panel.state.running = true;
      Panel._cleanupTimers();
      let results;
      try {
        results = await runCurrentPageTask(baseConfig, taskId, taskConfigs[taskId] || Util.defaultTaskConfig(taskId), taskName);

        // 上传页面信息后，服务端已自动更新 task_key，重新拉取任务列表以获取最新名称
        Util.log('任务执行完成，重新拉取任务列表刷新名称...');
        try {
          const refreshedTasksResp = await API.getTasks();
          if (refreshedTasksResp.status === 'success') {
            const refreshedTasks = Util.normalizeTasks(refreshedTasksResp.data || {});
            // 不释放 running 锁直接 setData：setData 会重建调度，
            // 但 _doExecuteTask 已加 running 互斥守卫，不会与本次执行并发；
            // 真正的下一次排期在 finally 释放锁后由 scheduleCurrentTask() 重建
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
      } finally {
        Panel.state.running = false;
        // 释放锁后重建下一轮排期（skipImmediate：本轮已经执行过，绝不再立即补一次）
        Panel._rescheduleNextCycle();
      }
    } catch (e) {
      Util.error('主流程异常:', e);
      Util.notify('BiliAuto 异常', e.message || String(e));

      // 异常时也上传客户端日志，便于排查
      try {
        const logs = Util.getLogs();
        if (logs.length > 0) {
          const uploadedCount = logs.length > 100 ? 100 : logs.length;
          const snapshotLen = logs.length;
          const errTaskId = Util.extractTaskIdFromPage() || 'unknown_task';
          const logResp = await API.uploadLogs({
            device_name: CONFIG.DEVICE_NAME,
            task_id: errTaskId,
            logs: logs.slice(-100),
            execution_summary: [{
              task_id: errTaskId,
              task_name: '',
              device_name: CONFIG.DEVICE_NAME,
              status: '异常',
              response_code: 500,
              message: e.message || String(e),
              cdkey: '',
              timestamp: Util.formatTime(),
              click_params: {},
              click_stats: {},
              api_responses: []
            }]
          });
          if (logResp && logResp.status === 'success') {
            if (Util._logBuffer.length >= snapshotLen) {
              Util._logBuffer.splice(snapshotLen - uploadedCount, uploadedCount);
            } else {
              Util._logBuffer.splice(-uploadedCount);
            }
            Util.log('异常时日志上传成功');
          }
        }
      } catch (logErr) {
        Util.warn('异常时日志上传失败:', logErr);
      }

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
      } finally {
        Panel.state.running = false;
        // 异常同样必须收尾：旧版这里不重建调度，主流程一抛错本页当天就彻底没有排期了
        // （线上 1,087 次"主流程异常"都走这条路）；_afterRunFinished 会先判断是否还能重试
        Panel._afterRunFinished(Util.extractTaskIdFromPage() || 'unknown_task');
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
