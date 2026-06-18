// ==UserScript==
// @name         Bili Reward Hook Test
// @namespace    https://github.com/under-the-ocean
// @version      0.3.0
// @match        https://www.bilibili.com/blackboard/era/award-exchange.html?*
// @match        https://www.bilibili.com/blackboard/era/award-exchange.html*
// @include      https://www.bilibili.com/blackboard/era/award-exchange.html*
// @run-at       document-start
// @grant        unsafeWindow
// ==/UserScript==

(function () {
  'use strict';

  const SOURCE = 'BILI_REWARD_HOOK_TEST';
  const API_PREFIX = '/x/activity_components';
  const HOOK_FLAG = '__BILI_REWARD_HOOK_TEST_INSTALLED__';
  const logs = [];

  console.log('[BiliHookTest] userscript started at', location.href);

  function now() {
    const d = new Date();
    return d.toLocaleTimeString() + '.' + String(d.getMilliseconds()).padStart(3, '0');
  }

  function getKind(url) {
    if (!url || url.indexOf(API_PREFIX) === -1) return '';
    if (url.indexOf('/mission/receive') !== -1) return 'receive';
    if (url.indexOf('/mission/info') !== -1) return 'info';
    if (url.indexOf('/mission/mylist') !== -1) return 'mylist';
    return 'mission';
  }

  function safeJson(text) {
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  function ensurePanel() {
    let panel = document.getElementById('bili-reward-hook-test-panel');
    if (panel) return panel;
    if (!document.body) return null;

    panel = document.createElement('div');
    panel.id = 'bili-reward-hook-test-panel';
    panel.style.cssText = [
      'position:fixed',
      'right:12px',
      'bottom:12px',
      'z-index:2147483647',
      'width:min(520px,calc(100vw - 24px))',
      'max-height:42vh',
      'overflow:auto',
      'box-sizing:border-box',
      'padding:10px',
      'border:1px solid rgba(34,211,238,.45)',
      'border-radius:8px',
      'background:rgba(3,7,18,.92)',
      'color:#dffafe',
      'font:12px/1.45 Consolas,Menlo,monospace',
      'white-space:pre-wrap',
      'box-shadow:0 12px 32px rgba(0,0,0,.35)'
    ].join(';');
    panel.textContent = '[Bili hook test] waiting for mission API...';
    document.body.appendChild(panel);
    return panel;
  }

  function waitForBody(callback) {
    if (document.body) {
      callback();
      return;
    }
    const timer = setInterval(() => {
      if (document.body) {
        clearInterval(timer);
        callback();
      }
    }, 50);
  }

  function renderPanel() {
    const panel = ensurePanel();
    if (!panel) return;
    panel.textContent = logs.slice(-30).join('\n\n') || '[Bili hook test] waiting for mission API...';
    panel.scrollTop = panel.scrollHeight;
  }

  function addLog(line, payload, json) {
    const body = json ? '\n' + JSON.stringify(json, null, 2).slice(0, 1800) : '';
    logs.push(`[${now()}] ${line}${body}`);
    window.__BILI_REWARD_HOOK_TEST_LOGS__ = logs;
    renderPanel();
    if (json) {
      console.log('[BiliHookTest]', line, payload, json);
    } else {
      console.log('[BiliHookTest]', line, payload);
    }
  }

  function installBridge() {
    window.addEventListener('message', (event) => {
      const data = event.data || {};
      if (data.source !== SOURCE || !data.payload) return;

      const payload = data.payload;
      const json = safeJson(payload.text);
      const codeText = json && Object.prototype.hasOwnProperty.call(json, 'code') ? ` code=${json.code}` : '';
      const msgText = json && (json.message || json.msg) ? ` msg=${json.message || json.msg}` : '';
      const cdkey = json && json.data && json.data.extra_info && json.data.extra_info.cdkey_content;
      const cdkeyText = cdkey ? ` CDK=${cdkey}` : '';
      addLog(
        `${payload.hook || 'hook'} ${payload.phase || 'response'} ${payload.kind} ${payload.method || ''} status=${payload.status || '-'}${codeText}${msgText}${cdkeyText}\n${payload.url}`,
        payload,
        json
      );
    });
  }

  function createPageHookInstaller(pageWindow, hookLabel) {
    if (!pageWindow || pageWindow[HOOK_FLAG]) return false;
    pageWindow[HOOK_FLAG] = true;

    function getUrl(input) {
      if (typeof input === 'string') return input;
      if (input && input.url) return input.url;
      return '';
    }

    function bodyPreview(body) {
      try {
        if (!body) return '';
        if (typeof body === 'string') return body.slice(0, 500);
        if (pageWindow.URLSearchParams && body instanceof pageWindow.URLSearchParams) return body.toString().slice(0, 500);
        if (pageWindow.FormData && body instanceof pageWindow.FormData) {
          const out = [];
          body.forEach((value, key) => out.push(key + '=' + value));
          return out.join('&').slice(0, 500);
        }
      } catch {}
      return Object.prototype.toString.call(body);
    }

    function taskIdFrom(url, body) {
      try {
        const value = new URL(url, location.href).searchParams.get('task_id');
        if (value) return value;
      } catch {}
      try {
        if (typeof body === 'string') return new URLSearchParams(body).get('task_id') || '';
        if (pageWindow.URLSearchParams && body instanceof pageWindow.URLSearchParams) return body.get('task_id') || '';
        if (pageWindow.FormData && body instanceof pageWindow.FormData) return body.get('task_id') || '';
      } catch {}
      return '';
    }

    function post(payload) {
      try {
        pageWindow.postMessage({ source: SOURCE, payload }, '*');
      } catch {}
    }

    if (pageWindow.fetch) {
      const rawFetch = pageWindow.fetch;
      pageWindow.fetch = function (input, init) {
        const url = getUrl(input);
        const method = (init && init.method) || (input && input.method) || 'GET';
        const body = init && init.body;
        const kind = getKind(url);
        if (kind) {
          post({
            hook: hookLabel + ':fetch',
            phase: 'request',
            kind,
            method,
            url,
            taskId: taskIdFrom(url, body),
            bodyPreview: bodyPreview(body)
          });
        }
        return rawFetch.apply(this, arguments).then((response) => {
          if (kind) {
            try {
              response.clone().text().then((text) => {
                post({
                  hook: hookLabel + ':fetch',
                  phase: 'response',
                  kind,
                  method,
                  url,
                  status: response.status,
                  taskId: taskIdFrom(url, body),
                  bodyPreview: bodyPreview(body),
                  text: text || ''
                });
              }).catch((e) => {
                post({ hook: hookLabel + ':fetch', phase: 'read-error', kind, method, url, status: response.status, text: String(e && e.message || e) });
              });
            } catch (e) {
              post({ hook: hookLabel + ':fetch', phase: 'clone-error', kind, method, url, status: response.status, text: String(e && e.message || e) });
            }
          }
          return response;
        });
      };
    }

    if (pageWindow.XMLHttpRequest) {
      const RawXHR = pageWindow.XMLHttpRequest;
      const rawOpen = RawXHR.prototype.open;
      const rawSend = RawXHR.prototype.send;
      RawXHR.prototype.open = function (method, url) {
        this.__biliHookTestMethod = method || 'GET';
        this.__biliHookTestUrl = url || '';
        return rawOpen.apply(this, arguments);
      };
      RawXHR.prototype.send = function (body) {
        const xhr = this;
        const url = xhr.__biliHookTestUrl || '';
        const method = xhr.__biliHookTestMethod || 'GET';
        const kind = getKind(url);
        if (kind) {
          post({
            hook: hookLabel + ':xhr',
            phase: 'request',
            kind,
            method,
            url,
            taskId: taskIdFrom(url, body),
            bodyPreview: bodyPreview(body)
          });
          xhr.addEventListener('loadend', function () {
            let text = '';
            try {
              text = xhr.responseText || '';
            } catch (e) {
              text = String(e && e.message || e);
            }
            post({
              hook: hookLabel + ':xhr',
              phase: 'response',
              kind,
              method,
              url,
              status: xhr.status,
              taskId: taskIdFrom(url, body),
              bodyPreview: bodyPreview(body),
              text
            });
          });
        }
        return rawSend.apply(this, arguments);
      };
    }

    post({ hook: hookLabel, phase: 'installed', kind: 'hook', method: '', url: location.href, status: 0, text: '' });
    return true;
  }

  function injectedHookSource() {
    return `
      ;(function () {
        var SOURCE = ${JSON.stringify(SOURCE)};
        var API_PREFIX = ${JSON.stringify(API_PREFIX)};
        var HOOK_FLAG = ${JSON.stringify(HOOK_FLAG)};
        if (window[HOOK_FLAG]) return;
        window[HOOK_FLAG] = true;

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

        function bodyPreview(body) {
          try {
            if (!body) return '';
            if (typeof body === 'string') return body.slice(0, 500);
            if (body instanceof URLSearchParams) return body.toString().slice(0, 500);
            if (body instanceof FormData) {
              var out = [];
              body.forEach(function (value, key) { out.push(key + '=' + value); });
              return out.join('&').slice(0, 500);
            }
          } catch (e) {}
          return Object.prototype.toString.call(body);
        }

        function taskIdFrom(url, body) {
          try {
            var value = new URL(url, location.href).searchParams.get('task_id');
            if (value) return value;
          } catch (e) {}
          try {
            if (typeof body === 'string') return new URLSearchParams(body).get('task_id') || '';
            if (body instanceof URLSearchParams) return body.get('task_id') || '';
            if (body instanceof FormData) return body.get('task_id') || '';
          } catch (e) {}
          return '';
        }

        function post(payload) {
          try {
            window.postMessage({ source: SOURCE, payload: payload }, '*');
          } catch (e) {}
        }

        if (window.fetch) {
          var rawFetch = window.fetch;
          window.fetch = function (input, init) {
            var url = getUrl(input);
            var method = (init && init.method) || (input && input.method) || 'GET';
            var body = init && init.body;
            var kind = getKind(url);
            if (kind) {
              post({
                hook: 'fetch',
                phase: 'request',
                kind: kind,
                method: method,
                url: url,
                taskId: taskIdFrom(url, body),
                bodyPreview: bodyPreview(body)
              });
            }
            return rawFetch.apply(this, arguments).then(function (response) {
              if (kind) {
                try {
                  response.clone().text().then(function (text) {
                    post({
                      hook: 'fetch',
                      phase: 'response',
                      kind: kind,
                      method: method,
                      url: url,
                      status: response.status,
                      taskId: taskIdFrom(url, body),
                      bodyPreview: bodyPreview(body),
                      text: text || ''
                    });
                  }).catch(function (e) {
                    post({ hook: 'fetch', phase: 'read-error', kind: kind, method: method, url: url, status: response.status, text: String(e && e.message || e) });
                  });
                } catch (e) {
                  post({ hook: 'fetch', phase: 'clone-error', kind: kind, method: method, url: url, status: response.status, text: String(e && e.message || e) });
                }
              }
              return response;
            });
          };
        }

        if (window.XMLHttpRequest) {
          var RawXHR = window.XMLHttpRequest;
          var rawOpen = RawXHR.prototype.open;
          var rawSend = RawXHR.prototype.send;
          RawXHR.prototype.open = function (method, url) {
            this.__biliHookTestMethod = method || 'GET';
            this.__biliHookTestUrl = url || '';
            return rawOpen.apply(this, arguments);
          };
          RawXHR.prototype.send = function (body) {
            var xhr = this;
            var url = xhr.__biliHookTestUrl || '';
            var method = xhr.__biliHookTestMethod || 'GET';
            var kind = getKind(url);
            if (kind) {
              post({
                hook: 'xhr',
                phase: 'request',
                kind: kind,
                method: method,
                url: url,
                taskId: taskIdFrom(url, body),
                bodyPreview: bodyPreview(body)
              });
              xhr.addEventListener('loadend', function () {
                var text = '';
                try {
                  text = xhr.responseText || '';
                } catch (e) {
                  text = String(e && e.message || e);
                }
                post({
                  hook: 'xhr',
                  phase: 'response',
                  kind: kind,
                  method: method,
                  url: url,
                  status: xhr.status,
                  taskId: taskIdFrom(url, body),
                  bodyPreview: bodyPreview(body),
                  text: text
                });
              });
            }
            return rawSend.apply(this, arguments);
          };
        }

        post({ hook: 'page', phase: 'installed', kind: 'hook', method: '', url: location.href, status: 0, text: '' });
      })();
    `;
  }

  function installByUnsafeWindow() {
    try {
      const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : null;
      if (!pageWindow) return false;
      return createPageHookInstaller(pageWindow, 'unsafeWindow');
    } catch (e) {
      console.warn('[BiliHookTest] unsafeWindow install failed', e);
      return false;
    }
  }

  function installByScriptTag() {
    try {
      const script = document.createElement('script');
      script.textContent = injectedHookSource();
      (document.documentElement || document.head || document).appendChild(script);
      script.remove();
      return true;
    } catch (e) {
      console.warn('[BiliHookTest] script tag install failed', e);
      return false;
    }
  }

  installBridge();
  addLog('userscript bootstrap reached', { url: location.href }, null);
  const unsafeOk = installByUnsafeWindow();
  const scriptOk = installByScriptTag();
  addLog(`install attempted unsafeWindow=${unsafeOk} scriptTag=${scriptOk}`, { unsafeOk, scriptOk }, null);

  try {
    const handleResource = (entry, label) => {
      const url = entry && entry.name || '';
      if (!url.includes('/x/activity_components')) return;
      addLog(`${label} ${entry.initiatorType || 'resource'}\n${url}`, {
        url,
        initiatorType: entry.initiatorType,
        duration: entry.duration,
        transferSize: entry.transferSize
      }, null);
    };
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) handleResource(entry, 'performance');
    });
    observer.observe({ entryTypes: ['resource'] });
    for (const entry of performance.getEntriesByType('resource') || []) {
      handleResource(entry, 'performance existing');
    }
    addLog('performance observer installed', {}, null);
  } catch (e) {
    addLog(`performance observer failed: ${e.message}`, {}, null);
  }

  waitForBody(renderPanel);
})();
