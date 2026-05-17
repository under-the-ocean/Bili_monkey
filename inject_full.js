
(function() {
  // Preload template
  window._INJECTED_TEMPLATE = `<style>
/* ========== Material Design Tokens ========== */
:root {
  --tm-primary: #50b6fe;
  --tm-primary-dark: #3a9ae0;
  --tm-accent: #ff5252;
  --tm-accent-dark: #d50000;
  --tm-bg: #ffffff;
  --tm-bg-card: #ffffff;
  --tm-text: rgba(0,0,0,0.87);
  --tm-text-secondary: rgba(0,0,0,0.54);
  --tm-text-hint: rgba(0,0,0,0.38);
  --tm-divider: rgba(0,0,0,0.12);
  --tm-input-bg: #f5f5f5;
  --tm-surface: #f5f5f5;
  --tm-shadow: 0 25px 50px -12px rgba(80,182,254,0.3);
  --tm-shadow-btn: 0 3px 1px -2px rgba(0,0,0,0.2), 0 2px 2px 0 rgba(0,0,0,0.14), 0 1px 5px 0 rgba(0,0,0,0.12);
  --tm-radius: 10px;
  --tm-radius-btn: 6px;
  --tm-radius-chip: 32px;
  --tm-font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --tm-transition: 0.3s cubic-bezier(.4,0,.2,1);
}
#biliauto-panel.tm-material-dark {
  --tm-bg: #121212;
  --tm-bg-card: #1e1e1e;
  --tm-text: rgba(255,255,255,0.87);
  --tm-text-secondary: rgba(255,255,255,0.54);
  --tm-text-hint: rgba(255,255,255,0.38);
  --tm-divider: rgba(255,255,255,0.12);
  --tm-input-bg: #2c2c2c;
  --tm-surface: #1e1e1e;
  --tm-shadow: 0 11px 15px -7px rgba(0,0,0,0.4), 0 24px 38px 3px rgba(0,0,0,0.3), 0 9px 46px 8px rgba(0,0,0,0.25);
}

/* ========== FAB ========== */
#biliauto-fab {
  position: fixed;
  left: 50%!important;
  right: auto!important;
  top: 50%!important;
  transform: translate(-50%, -50%)!important;
  z-index: 2147483647;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: var(--tm-primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 6px 10px 0 rgba(0,0,0,0.14), 0 1px 18px 0 rgba(0,0,0,0.12), 0 3px 5px -1px rgba(0,0,0,0.2);
  transition: opacity 0.25s cubic-bezier(.4,0,.2,1), transform 0.25s cubic-bezier(.4,0,.2,1), box-shadow 0.25s, background 0.25s;
  user-select: none;
  -webkit-user-select: none;
  opacity: 1;
  transform: scale(1);
}
#biliauto-fab.tm-fab-hidden {
  opacity: 0;
  transform: scale(0.4);
  pointer-events: none;
}
#biliauto-fab:hover {
  box-shadow: 0 8px 12px 0 rgba(0,0,0,0.18), 0 3px 20px 0 rgba(0,0,0,0.16), 0 3px 5px -1px rgba(0,0,0,0.24);
  background: var(--tm-primary-dark);
}
#biliauto-fab:active {
  transform: scale(0.92);
}
#biliauto-fab svg {
  display: block;
}
#biliauto-fab.tm-material-dark {
  background: #1e88e5;
}

/* ========== Panel ========== */
#biliauto-panel {
  position: fixed;
  left: 50%!important;
  right: auto!important;
  transform: translateX(-50%)!important;
  bottom: 88px;
  z-index: 2147483646;
  width: 440px;
  max-width: calc(100vw - 48px);
  max-height: min(calc(100vh - 80px), 90vh) !important;
  overflow-y: auto !important;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  font-family: var(--tm-font);
  color: var(--tm-text);
  background: var(--tm-bg-card);
  border-radius: var(--tm-radius);
  box-shadow: var(--tm-shadow);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  opacity: 0;
  transform: translateY(12px) scale(0.96);
  pointer-events: none;
  transition: opacity 0.25s cubic-bezier(.4,0,.2,1), transform 0.25s cubic-bezier(.4,0,.2,1);
}
#biliauto-panel.tm-panel-visible {
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: auto;
}
#biliauto-panel * { box-sizing: border-box; }

/* ========== Header ========== */
.tm-material-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  min-height: 44px;
  cursor: grab;
  user-select: none;
  -webkit-user-select: none;
  border-bottom: 1px solid var(--tm-divider);
  flex-shrink: 0;
}
.tm-material-header:active { cursor: grabbing; }
.tm-material-header-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--tm-text);
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap; gap: 0.25rem;
}
.tm-material-header-badge {
  font-size: 11px;
  font-weight: 400;
  color: var(--tm-text-secondary);
  background: var(--tm-input-bg);
  padding: 2px 8px;
  border-radius: var(--tm-radius-chip);
}
.tm-material-header-actions {
  display: flex;
  gap: 4px;
  cursor: default;
}

/* ========== Icon Button ========== */
.tm-material-icon-btn {
  position: relative;
  overflow: hidden;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: var(--tm-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: background 0.15s;
  font-size: 18px;
  line-height: 1;
}
.tm-material-icon-btn::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: currentColor;
  opacity: 0;
  transition: opacity 0.3s cubic-bezier(.4,0,.2,1);
  pointer-events: none;
}
.tm-material-icon-btn:hover::after { opacity: 0.08; }
.tm-material-icon-btn:active::after { opacity: 0.16; transition: opacity 0.05s; }

/* ========== Body ========== */
.tm-material-body {
  padding: 14px 16px;
  overflow-y: visible;
  flex: 1;
}
.tm-material-meta {
  font-size: 12px;
  color: var(--tm-text-secondary);
  line-height: 1.6;
  margin-bottom: 12px;
  word-break: break-all;
  background: var(--tm-surface);
  padding: 10px 12px;
  border-radius: var(--tm-radius-btn);
}

/* ========== Input ========== */
.tm-material-input {
  width: 100%;
  border: none;
  border-radius: var(--tm-radius-btn);
  background: var(--tm-input-bg);
  color: var(--tm-text);
  padding: 10px 12px;
  outline: none;
  font-size: 13px;
  font-family: var(--tm-font);
  transition: background 0.15s;
}
.tm-material-input:focus {
  background: var(--tm-input-bg);
  box-shadow: 0 0 0 2px var(--tm-primary);
}
.tm-material-input::placeholder { color: var(--tm-text-hint); }
.tm-material-input-row {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
}
.tm-material-input-row .tm-material-input { flex: 1; }

/* ========== Button ========== */
.tm-material-btn {
  position: relative;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  min-width: 72px;
  padding: 0 18px;
  border: none;
  border-radius: var(--tm-radius-btn);
  background: transparent;
  color: var(--tm-primary);
  font-size: 13px;
  font-weight: 500;
  font-family: var(--tm-font);
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  transition: var(--tm-transition);
  text-transform: uppercase;
  letter-spacing: 0.3px;
  white-space: nowrap;
}
.tm-material-btn::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: var(--tm-radius-btn);
  background: currentColor;
  opacity: 0;
  transition: opacity 0.3s cubic-bezier(.4,0,.2,1);
  pointer-events: none;
}
.tm-material-btn:hover::after { opacity: 0.08; }
.tm-material-btn:active::after { opacity: 0.16; transition: opacity 0.05s; }
.tm-material-btn-primary {
  background: var(--tm-primary);
  color: #fff;
  box-shadow: var(--tm-shadow-btn);
}
.tm-material-btn-primary:hover { background: var(--tm-primary-dark); }
.tm-material-btn-primary::after { display: none; }
.tm-material-btn-primary:active { box-shadow: 0 5px 5px -3px rgba(0,0,0,0.2), 0 8px 10px 1px rgba(0,0,0,0.14), 0 3px 14px 2px rgba(0,0,0,0.12); }
.tm-material-btn-accent { color: var(--tm-accent); }
.tm-material-btn-sm {
  height: 32px;
  min-width: 52px;
  padding: 0 12px;
  font-size: 12px;
}
.tm-material-btn-xs {
  height: 24px;
  padding: 0 8px;
  font-size: 11px;
  border-radius: 4px;
  min-width: auto;
}

/* ========== Chip ========== */
.tm-material-chip {
  display: inline-flex;
  align-items: center;
  height: 30px;
  padding: 0 12px;
  border-radius: var(--tm-radius-chip);
  background: var(--tm-surface);
  color: var(--tm-text-secondary);
  font-size: 12px;
  font-weight: 400;
  white-space: nowrap;
}

/* ========== Checkbox ========== */
.tm-material-check {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--tm-text);
  line-height: 1.4;
  cursor: pointer;
}
.tm-material-check input[type="checkbox"] {
  appearance: none;
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  border: 2px solid var(--tm-text-hint);
  border-radius: 3px;
  cursor: pointer;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: var(--tm-transition);
  position: relative;
  margin: 0;
}
.tm-material-check input[type="checkbox"]:checked {
  border-color: var(--tm-primary);
  background: var(--tm-primary);
}
.tm-material-check input[type="checkbox"]:checked::after {
  content: '';
  display: block;
  width: 4px;
  height: 8px;
  border: solid #fff;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
  margin-top: -1px;
}

/* ========== List ========== */
.tm-material-list {
  max-height: 350px;
  overflow-y: visible;
  margin-top: 10px;
  scrollbar-width: thin;
  scrollbar-color: var(--tm-divider) transparent;
}
.tm-material-list::-webkit-scrollbar { width: 5px; }
.tm-material-list::-webkit-scrollbar-thumb { background: var(--tm-divider); border-radius: 4px; }

.tm-material-item {
  padding: 12px;
  border-radius: var(--tm-radius-btn);
  margin-bottom: 10px;
  background: var(--tm-surface);
  border: 1px solid var(--tm-divider);
}
.tm-material-item:last-child { margin-bottom: 0; }
.tm-material-item-title {
  font-size: 13px;
  font-weight: 500;
  line-height: 1.5;
  margin-bottom: 4px;
  color: var(--tm-text);
}
.tm-material-item-id {
  font-size: 11px;
  color: var(--tm-primary);
  word-break: break-all;
  margin-bottom: 8px;
  font-family: "SF Mono", monospace;
  opacity: 0.8;
}
.tm-material-item-config {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 6px;
  margin-bottom: 8px;
}
.tm-material-item-config input {
  padding: 5px 8px;
  font-size: 11px;
  text-align: center;
  border: none;
  border-radius: var(--tm-radius-btn);
  background: var(--tm-input-bg);
  color: var(--tm-text);
  outline: none;
  font-family: var(--tm-font);
  transition: box-shadow 0.15s;
}
.tm-material-item-config input:focus {
  box-shadow: 0 0 0 2px var(--tm-primary);
}
.tm-material-item-actions {
  display: flex;
  gap: 6px;
  flex-wrap: nowrap; gap: 0.25rem;
}
.tm-material-empty {
  padding: 24px 12px;
  text-align: center;
  color: var(--tm-text-hint);
  font-size: 13px;
}
.tm-material-status {
  font-size: 12px;
  color: var(--tm-text-secondary);
  margin-top: 12px;
  min-height: 20px;
  padding: 8px 0;
  text-align: center;
}
.tm-material-toolbar {
  display: flex;
  gap: 8px;
  flex-wrap: nowrap; gap: 0.25rem;
  align-items: center;
  margin-bottom: 10px;
}
.tm-material-separator {
  flex: 1;
}

/* ========== Login Overlay - 仿 OIDC 风格（响应式缩放，强制 16px 基准） ========== */
#biliauto-login-overlay {
  font-size: 16px;
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  background: radial-gradient(circle at bottom right, #dbeafe, #f8fafc, #f0fdfa);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  pointer-events: none;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  transition: opacity 0.35s cubic-bezier(.4,0,.2,1);
  padding: 16px;
  box-sizing: border-box;
  /* 强制重置根字号为 16px，防止被 B 站页面影响 */
  font-size: 16px;
}
#biliauto-login-overlay.tm-overlay-visible {
  opacity: 1;
  pointer-events: auto;
}
#biliauto-login-overlay * {
  box-sizing: border-box;
}

/* 桌面端容器 */
.bili-login-glass {
  background: rgba(255,255,255,0.95);
  backdrop-filter: blur(10px);
  border-radius: 1rem;
  box-shadow: 0 25px 50px -12px rgba(80,182,254,0.3);
  padding: 0.75rem;
  border: 1px solid rgba(255,255,255,0.8);
  width: 100%;
  max-height: auto;
  overflow-y: visible;
}

/* 桌面端（≥1024px）：左右双栏布局 */
@media (min-width: 1024px) {
  .bili-login-glass {
    max-width: 800px;
  }
  .bili-login-inner {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
  }
  .bili-login-left {
    display: block !important;
    padding: 0.75rem;
    padding-right: 2rem;
  }
  .bili-login-right {
    padding: 0.75rem;
    padding-left: 2rem;
  }
  .bili-login-mobile-only {
    display: none !important;
  }
}

/* 移动端（<1024px）：单列布局，隐藏左侧 */
@media (max-width: 1023px) {
  .bili-login-glass {
    max-width: 28rem;
  }
  .bili-login-left {
    display: none !important;
  }
  .bili-login-right {
    padding: 0 !important;
  }
  .bili-login-mobile-only {
    display: block !important;
  }
}

/* 左侧：应用信息和权限 */
.bili-login-left {
  text-align: left;
}
.bili-login-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  flex-wrap: nowrap; gap: 0.25rem;
}
.bili-login-icon {
  width: 4rem;
  height: 4rem;
  flex-shrink: 0;
  background: linear-gradient(135deg, #50b6fe, #3a9ae0);
  border-radius: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}
.bili-login-icon svg {
  width: 2.25rem;
  height: 2.25rem;
}
.bili-login-title {
  font-size: 5vw;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
  line-height: 1.2;
}
.bili-login-subtitle {
  margin: 0.25rem 0 0 0;
  font-size: 3vw;
  color: #64748b;
  font-weight: 500;
}
.bili-login-accent {
  color: #50b6fe;
}
.bili-login-perms-title {
  font-size: 2rem;
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.75rem;
}
.bili-login-perm-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem;
  background: #f8fafc;
  border-radius: 1rem;
  margin-bottom: 0.5rem;
}
.bili-login-perm-icon {
  background: rgba(80,182,254,0.1);
  padding: 0.375rem;
  border-radius: 1rem;
  color: #50b6fe;
  flex-shrink: 0;
}
.bili-login-perm-name {
  font-size: 2rem;
  font-weight: 600;
  color: #334155;
  margin: 0;
}
.bili-login-perm-desc {
  font-size: 2rem;
  color: #94a3b8;
  margin: 0.125rem 0 0 0;
}

/* 右侧：验证码区域 */
.bili-login-right {
  text-align: center;
}
.bili-login-mobile-header {
  text-align: center;
  margin-bottom: 0.75rem;
}
.bili-login-mobile-icon {
  width: 4rem;
  height: 4rem;
  margin: 0 auto 1rem auto;
  background: linear-gradient(135deg, #50b6fe, #3a9ae0);
  border-radius: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}
.bili-login-mobile-icon svg {
  width: 2.25rem;
  height: 2.25rem;
}
.bili-login-code-section {
  background: #50b6fe;
  border-radius: 1rem;
  padding: 0.75rem;
  margin-bottom: 0.75rem;
  box-shadow: 0 10px 15px -3px rgba(80,182,254,0.3);
  position: relative;
  overflow: hidden;
}
.bili-login-code-label {
  color: rgba(255,255,255,0.7);
  font-size: 2.5vw;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.2em;
  margin-bottom: 0.75rem;
}
.bili-login-code-chars {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  flex-wrap: nowrap; gap: 0.25rem;
}
.bili-login-code-char {
  display: inline-block;
  width: 8vw;
  height: 10vw;
  line-height: 10vw;
  background: white;
  border-radius: 1.5vw;
  font-size: 5vw;
  font-weight: 800;
  color: #50b6fe;
  text-align: center;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
}
.bili-login-send-info {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem;
  background: rgba(80,182,254,0.05);
  border-radius: 1rem;
  border: 1px solid rgba(80,182,254,0.1);
  margin-bottom: 1rem;
  text-align: left;
}
.bili-login-send-icon {
  background: #50b6fe;
  padding: 0.375rem;
  border-radius: 1rem;
  color: white;
  flex-shrink: 0;
}
.bili-login-send-title {
  font-size: 2.5vw;
  font-weight: 700;
  color: #50b6fe;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
}
.bili-login-send-group {
  font-size: 3.5vw;
  font-weight: 600;
  color: #334155;
  margin: 0.25rem 0 0 0;
}
.bili-login-status {
  font-size: 3vw;
  color: #64748b;
  margin-bottom: 0.75rem;
  min-height: 1.25rem;
}
.bili-login-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 10vw;
  padding: 0 1.5rem;
  border: none;
  border-radius: 1rem;
  background: #50b6fe;
  color: white;
  font-size: 3.5vw;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.1s;
}
.bili-login-btn:hover {
  opacity: 0.85;
}
.bili-login-btn:active {
  transform: scale(0.98);
}
.bili-login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 桌面端限制最大尺寸 */
@media (min-width: 768px) {
  .bili-login-code-char {
    width: 48px;
    height: 64px;
    line-height: 64px;
    font-size: 28px;
    border-radius: 12px;
  }
  .bili-login-title {
    font-size: 24px;
  }
  .bili-login-subtitle {
    font-size: 14px;
  }
  .bili-login-send-group {
    font-size: 14px;
  }
  .bili-login-btn {
    font-size: 14px;
    height: 44px;
  }
  .bili-login-status {
    font-size: 13px;
  }
  .bili-login-code-label {
    font-size: 12px;
  }
  .bili-login-send-title {
    font-size: 12px;
  }
}


/* 移动端字体缩放 */
/* 移动端字体缩放（<768px） */
@media (max-width: 768px) {
.bili-login-code-char {
  display: inline-block;
  width: 8vw;
  height: 10vw;
  line-height: 10vw;
  background: white;
  border-radius: 1.5vw;
  font-size: 5vw;
  font-weight: 800;
  color: #50b6fe;
  text-align: center;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
}
.bili-login-title {
  font-size: 5vw;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
  line-height: 1.2;
}
.bili-login-subtitle {
  margin: 0.25rem 0 0 0;
  font-size: 3vw;
  color: #64748b;
  font-weight: 500;
}
.bili-login-send-group {
  font-size: 3.5vw;
  font-weight: 600;
  color: #334155;
  margin: 0.25rem 0 0 0;
}
.bili-login-send-title {
  font-size: 2.5vw;
  font-weight: 700;
  color: #50b6fe;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
}
.bili-login-status {
  font-size: 3vw;
  color: #64748b;
  margin-bottom: 0.75rem;
  min-height: 1.25rem;
}
.bili-login-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 10vw;
  padding: 0 1.5rem;
  border: none;
  border-radius: 1rem;
  background: #50b6fe;
  color: white;
  font-size: 3.5vw;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.1s;
}
  .bili-login-glass {
    padding: 0.8rem;
  }
  .bili-login-code-section {
    padding: 0.8rem;
  }
  .bili-login-perm-name {
    font-size: 2rem;
  }
  .bili-login-perm-desc {
    font-size: 2rem;
  }
}

/* 小屏幕（<480px）进一步缩小 */
@media (max-width: 480px) {
  .bili-login-glass {
    padding: 0.6rem;
  }
.bili-login-code-char {
  display: inline-block;
  width: 8vw;
  height: 10vw;
  line-height: 10vw;
  background: white;
  border-radius: 1.5vw;
  font-size: 5vw;
  font-weight: 800;
  color: #50b6fe;
  text-align: center;
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
}
  .bili-login-code-section {
    padding: 0.6rem;
  }
  .bili-login-send-info {
    padding: 0.5rem;
  }
.bili-login-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 10vw;
  padding: 0 1.5rem;
  border: none;
  border-radius: 1rem;
  background: #50b6fe;
  color: white;
  font-size: 3.5vw;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  transition: opacity 0.2s, transform 0.1s;
}
.bili-login-title {
  font-size: 5vw;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
  line-height: 1.2;
}
.bili-login-subtitle {
  margin: 0.25rem 0 0 0;
  font-size: 3vw;
  color: #64748b;
  font-weight: 500;
}
.bili-login-send-group {
  font-size: 3.5vw;
  font-weight: 600;
  color: #334155;
  margin: 0.25rem 0 0 0;
}
.bili-login-status {
  font-size: 3vw;
  color: #64748b;
  margin-bottom: 0.75rem;
  min-height: 1.25rem;
}
  .bili-login-perm-name {
    font-size: 2rem;
  }
  .bili-login-perm-desc {
    font-size: 2rem;
  }
}

/* 横屏模式 */
@media (max-height: 600px) and (orientation: landscape) {
  #biliauto-login-overlay {
  font-size: 16px;
    align-items: flex-start;
    padding-top: 8px;
  }
  .bili-login-glass {
    max-height: 92vh;
  }
  .bili-login-left .bili-login-perms {
    max-height: 180px;
    overflow-y: visible;
  }
}

/* ========== Login Status Badge in Header ========== */
.tm-login-status-badge {
  font-size: 11px;
  color: #4caf50;
  background: rgba(76,175,80,0.15);
  padding: 2px 10px;
  border-radius: 10px;
  margin-left: 6px;
  white-space: nowrap;
}

/* ========== 手机端面板额外优化 ========== */
@media (max-width: 600px) {
  #biliauto-panel {
    width: calc(100vw - 24px);
    max-width: none;
    bottom: 16px;
    left: 12px !important;
    right: 12px !important;
    transform: none !important;
  }
  .tm-material-header-title {
    font-size: 14px;
  }
  .tm-material-item-config {
    grid-template-columns: 1fr;
    gap: 4px;
  }
  .tm-material-item-actions {
    justify-content: flex-start;
  }
  .tm-material-toolbar {
    flex-wrap: nowrap; gap: 0.25rem;
  }
  .tm-material-btn {
    min-width: 60px;
    padding: 0 12px;
    height: 36px;
    font-size: 12px;
  }
  .tm-material-btn-sm {
    min-width: 44px;
    padding: 0 8px;
  }
}
</style>

<div class="tm-material-header">
  <span class="tm-material-header-title">
BiliAuto
<span class="tm-material-header-badge">v\${CONFIG.VERSION}</span>
<span class="tm-login-status-badge" data-ba="loginStatusBadge" style="display:\${CONFIG.QQ_ID?'':'none'}">✅ \${CONFIG.QQ_ID}</span>
  </span>
  <span class="tm-material-header-actions">
<button class="tm-material-icon-btn" data-ba="logout" title="退出登录" style="display:\${CONFIG.QQ_ID?'':'none'}">🚪</button>
<button class="tm-material-icon-btn" data-ba="copyPageInfo" title="复制当前页面信息">📋</button>
<button class="tm-material-icon-btn" data-ba="toggleDark" title="切换夜间模式">🌙</button>
<button class="tm-material-icon-btn" data-ba="closePanel" title="关闭面板">✕</button>
  </span>
</div>

<div class="tm-material-body">

  <div class="tm-material-meta" data-ba="meta"></div>

  <div class="tm-material-toolbar">
<input class="tm-material-input" data-ba="addTaskInput" placeholder="添加 task_id" style="flex:1">
<button class="tm-material-btn" data-ba="addTask">添加</button>
  </div>

  <div class="tm-material-input-row">
    <input class="tm-material-input" data-ba="manual" placeholder="输入 task_id 后跳转">
    <button class="tm-material-btn" data-ba="manualJump">跳转</button>
  </div>

  <input class="tm-material-input" data-ba="filter" placeholder="筛选任务名称或 ID">

  <div class="tm-material-list" data-ba="list"></div>

  <div class="tm-material-toolbar" style="margin-top:8px;justify-content:space-between">
<div style="display:flex;gap:4px">
  <button class="tm-material-btn tm-material-btn-primary tm-material-btn-sm" data-ba="runAll">执行全部</button>
  <button class="tm-material-btn tm-material-btn-sm" data-ba="refresh">刷新</button>
</div>
<div style="display:flex;gap:4px">
  <button class="tm-material-btn tm-material-btn-sm" data-ba="defaults">重置</button>
  <button class="tm-material-btn tm-material-btn-accent tm-material-btn-sm" data-ba="clearAll">清空</button>
  <button class="tm-material-btn tm-material-btn-accent tm-material-btn-sm" data-ba="logout" style="display:\${CONFIG.QQ_ID?'':'none'}">退出</button>
</div>
  </div>

  <div style="display:flex;gap:6px;align-items:center;margin-bottom:4px">
<span class="tm-material-chip" data-ba="taskCount">0 个任务</span>
  </div>

  <div class="tm-material-status" data-ba="status"></div>
</div>

<!-- 登录界面 HTML（仿 OIDC 风格） -->
<div id="biliauto-login-overlay">
  <div class="bili-login-glass">
    <div class="bili-login-inner">
      <!-- 左侧：桌面端显示 -->
      <div class="bili-login-left">
        <div class="bili-login-header">
          <div class="bili-login-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5">
              <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor"/>
              <path d="M2 17l10 5 10-5" stroke="currentColor"/>
              <path d="M2 12l10 5 10-5" stroke="currentColor"/>
            </svg>
          </div>
          <div>
            <h1 class="bili-login-title">授权登录</h1>
            <p class="bili-login-subtitle"><strong class="bili-login-accent">BiliAuto 抢码系统</strong> 请求访问你的账号</p>
          </div>
        </div>
        <div>
          <p class="bili-login-perms-title">请求的权限</p>
          <div class="bili-login-perm-item">
            <div class="bili-login-perm-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <div>
              <p class="bili-login-perm-name">openid</p>
              <p class="bili-login-perm-desc">识别你的账号主体，用于登录鉴权。</p>
            </div>
          </div>
          <div class="bili-login-perm-item">
            <div class="bili-login-perm-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <div>
              <p class="bili-login-perm-name">profile</p>
              <p class="bili-login-perm-desc">读取昵称等基础资料，用于展示个人信息。</p>
            </div>
          </div>
          <div class="bili-login-perm-item">
            <div class="bili-login-perm-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <div>
              <p class="bili-login-perm-name">API 访问</p>
              <p class="bili-login-perm-desc">使用抢码任务相关接口权限。</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧：验证码区域 -->
      <div class="bili-login-right">
        <!-- 移动端显示的应用信息 -->
        <div class="bili-login-mobile-only bili-login-mobile-header">
          <div class="bili-login-mobile-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="1.5">
              <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor"/>
              <path d="M2 17l10 5 10-5" stroke="currentColor"/>
              <path d="M2 12l10 5 10-5" stroke="currentColor"/>
            </svg>
          </div>
          <h1 class="bili-login-title">授权登录</h1>
          <p class="bili-login-subtitle"><strong class="bili-login-accent">BiliAuto 抢码系统</strong> 请求访问你的账号</p>
        </div>

        <div class="bili-login-code-section">
          <p class="bili-login-code-label">验证码</p>
          <div class="bili-login-code-chars" data-ba="loginCodeDisplay">
            <span class="bili-login-code-char">-</span>
            <span class="bili-login-code-char">-</span>
            <span class="bili-login-code-char">-</span>
            <span class="bili-login-code-char">-</span>
            <span class="bili-login-code-char">-</span>
            <span class="bili-login-code-char">-</span>
          </div>
        </div>

        <div class="bili-login-send-info">
          <div class="bili-login-send-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
            </svg>
          </div>
          <div>
            <p class="bili-login-send-title">发送到群聊</p>
            <p class="bili-login-send-group">1082333812</p>
          </div>
        </div>

        <div data-ba="loginStatus" class="bili-login-status">等待验证...</div>
        <button class="bili-login-btn" data-ba="startLogin">开始登录</button>
      </div>
    </div>
  </div>
</div><style>
/* 强制一屏显示 - 覆盖原有样式 */
#biliauto-login-overlay {
  align-items: center !important;
  padding: 8px !important;
}
.bili-login-glass {
  max-height: 95vh !important;
  overflow-y: auto !important;
  padding: 0.75rem !important;
}
.bili-login-inner {
  display: flex !important;
  flex-direction: column !important;
}
.bili-login-right {
  padding: 0 !important;
}
.bili-login-mobile-header {
  margin-bottom: 0.5rem !important;
}
.bili-login-mobile-icon {
  width: 2rem !important;
  height: 2rem !important;
  margin-bottom: 0.25rem !important;
}
.bili-login-title {
  font-size: 1rem !important;
  margin-bottom: 0 !important;
}
.bili-login-subtitle {
  font-size: 0.6rem !important;
  margin-top: 0 !important;
}
.bili-login-code-section {
  padding: 0.5rem !important;
  margin-bottom: 0.5rem !important;
}
.bili-login-code-label {
  margin-bottom: 0.25rem !important;
  font-size: 0.55rem !important;
}
.bili-login-code-chars {
  gap: 0.2rem !important;
  flex-wrap: nowrap !important;
}
.bili-login-code-char {
  width: 12vw !important;
  max-width: 2.2rem !important;
  height: 8vw !important;
  max-height: 2rem !important;
  line-height: 8vw !important;
  font-size: 4vw !important;
  border-radius: 0.4rem !important;
}
.bili-login-send-info {
  padding: 0.3rem 0.5rem !important;
  margin-bottom: 0.5rem !important;
  gap: 0.4rem !important;
}
.bili-login-send-icon {
  padding: 0.2rem !important;
}
.bili-login-send-icon svg {
  width: 14px !important;
  height: 14px !important;
}
.bili-login-send-title {
  font-size: 0.5rem !important;
}
.bili-login-send-group {
  font-size: 0.65rem !important;
  margin-top: 0 !important;
}
.bili-login-status {
  font-size: 0.6rem !important;
  margin-bottom: 0.3rem !important;
  min-height: auto !important;
}
.bili-login-btn {
  height: 2rem !important;
  font-size: 0.7rem !important;
  padding: 0 !important;
}
.mobile-only .bili-login-perms {
  max-height: 100px !important;
  overflow-y: auto !important;
}
.bili-login-perm-item {
  padding: 0.3rem !important;
  gap: 0.4rem !important;
}
.bili-login-perm-name {
  font-size: 0.6rem !important;
}
.bili-login-perm-desc {
  font-size: 0.5rem !important;
}
.bili-login-perms-title {
  margin-bottom: 0.2rem !important;
  font-size: 0.55rem !important;
}
</style>
`;
  
  // Mock GM_* APIs
  var _store = {};
  window.GM_getValue = function(k, d) { return _store[k] !== undefined ? _store[k] : d; };
  window.GM_setValue = function(k, v) { _store[k] = v; };
  window.GM_deleteValue = function(k) { delete _store[k]; };
  window.GM_listValues = function() { return Object.keys(_store); };
  window.GM_xmlhttpRequest = function(opts) {
    var xhr = new XMLHttpRequest();
    xhr.open(opts.method || 'GET', opts.url);
    xhr.onload = function() {
      if (opts.onload) opts.onload({ responseText: xhr.responseText, status: xhr.status });
    };
    xhr.onerror = function() {
      if (opts.onerror) opts.onerror({ statusText: xhr.statusText });
    };
    xhr.send(opts.data || null);
  };
  window.GM_notification = function(t) { console.log('[TEST] GM_notification:', t); };
  window.GM_getResourceText = function(name) {
    if (name === 'TEMPLATE_HTML') return window._INJECTED_TEMPLATE;
    return '';
  };
  
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
        return `<div style="padding:20px;color:red;font-size:18px;text-align:center;font-family:sans-serif;">
          <p>⚠️ 模板加载失败</p>
          <p style="font-size:14px;color:#999;">请检查网络或刷新重试</p>
        </div>`;
      }
      return tpl
        .replace(/\$\{VERSION\}/g, CONFIG.VERSION)
        .replace(/\$\{DEVICE_ID_SHORT\}/g, CONFIG.DEVICE_ID.slice(0, 8))
        .replace(/\$\{CONFIG\.QQ_ID\}/g, CONFIG.QQ_ID || '')
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
        else if (action === 'clearAll') this.clearAllTasks();
        else if (action === 'copyPageInfo') this.copyPageInfo();
        else if (action === 'toggleDark') this.toggleDarkMode();
        else if (action === 'logout') this.logout();
        else if (action === 'startLogin') this.startLogin();
      });

      panel.addEventListener('change', (e) => {
        const target = e.target.closest('[data-ba]');
        if (!target) return;
        const action = target.getAttribute('data-ba');
        if (action === 'taskConfig') {
          this.updateTaskConfig(target.getAttribute('data-taskid'), target.getAttribute('data-field'), target.value);
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
      filterInput.addEventListener('input', () => {
        this.state.filter = filterInput.value.trim().toLowerCase();
        this.renderList();
      });
    },

    setData(baseConfig, tasks) {
      this.state.baseConfig = baseConfig || this.state.baseConfig;
      this.state.tasks = Util.normalizeTasks(tasks || this.state.tasks);
      this.state.taskConfigs = Util.loadTaskConfigs(this.state.tasks);
      this.render();
    },

    saveTaskConfigs() {
      GM_setValue('task_configs', this.state.taskConfigs);
    },

    updateTaskConfig(taskId, field, value) {
      if (!taskId) return;
      const current = this.state.taskConfigs[taskId] || Util.defaultTaskConfig(taskId);
      this.state.taskConfigs[taskId] = { ...current, [field]: field === 'selected' ? Boolean(value) : value };
      this.saveTaskConfigs();
      this.renderList();
    },

    setStatus(text) {
      const el = document.querySelector('#biliauto-panel [data-ba="status"]');
      if (el) {
        el.textContent = text || '';
        el.style.color = text && text.includes('失败') ? 'var(--tm-accent)' : '';
      }
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
      GM_setValue('api_key', '');
      GM_setValue('device_id', '');
      CONFIG.QQ_ID = '';
      CONFIG.API_KEY = '';
      this.state.loginStatus = '';
      const badge = document.querySelector('#biliauto-panel [data-ba="loginStatusBadge"]');
      if (badge) badge.style.display = 'none';
      document.querySelectorAll('[data-ba="logout"]').forEach(el => el.style.display = 'none');
      this.setStatus('已退出登录');
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


    showLoginOverlay() {
      let overlay = document.getElementById('biliauto-login-overlay');
      if (overlay) {
        overlay.classList.add('tm-overlay-visible');
        return;
      }
      overlay = document.createElement('div');
      overlay.id = 'biliauto-login-overlay';
      // 根据视口宽度计算缩放比例
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let scale = 1;
      if (vw < 500) {
        scale = Math.min(0.85, vw / 420);
      } else if (vw < 900) {
        scale = Math.min(0.9, vw / 500);
      }
      overlay.style.setProperty('--bili-login-scale', scale);
      overlay.innerHTML = `
        <div id="biliauto-login-card" class="bili-login-glass">
          <div class="bili-login-grid">
            <div class="bili-login-left">
              <div class="bili-login-header">
                <div class="bili-login-icon">
                  <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
                </div>
                <div>
                  <h1 class="bili-login-title">授权登录</h1>
                  <p class="bili-login-subtitle"><strong class="bili-login-accent">BiliAuto 抢码系统</strong> 请求访问你的账号</p>
                </div>
              </div>
              <div class="bili-login-perms">
                <p class="bili-login-perms-title">请求的权限</p>
                <div class="bili-login-perm-item">
                  <div class="bili-login-perm-icon"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>
                  <div><p class="bili-login-perm-name">openid</p><p class="bili-login-perm-desc">识别你的账号主体，用于登录鉴权。</p></div>
                </div>
                <div class="bili-login-perm-item">
                  <div class="bili-login-perm-icon"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>
                  <div><p class="bili-login-perm-name">profile</p><p class="bili-login-perm-desc">读取昵称等基础资料，用于展示个人信息。</p></div>
                </div>
                <div class="bili-login-perm-item">
                  <div class="bili-login-perm-icon"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg></div>
                  <div><p class="bili-login-perm-name">API 访问</p><p class="bili-login-perm-desc">使用抢码任务相关接口权限。</p></div>
                </div>
              </div>
            </div>
            <div class="bili-login-right">
              <div class="bili-login-code-section">
                <p class="bili-login-code-label">验证码</p>
                <div class="bili-login-code-chars" data-ba="loginCodeDisplay">
                  <span class="bili-login-code-char">-</span>
                  <span class="bili-login-code-char">-</span>
                  <span class="bili-login-code-char">-</span>
                  <span class="bili-login-code-char">-</span>
                  <span class="bili-login-code-char">-</span>
                  <span class="bili-login-code-char">-</span>
                </div>
              </div>
              <div class="bili-login-send-info">
                <div class="bili-login-send-icon"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg></div>
                <div>
                  <p class="bili-login-send-title">发送到群聊</p>
                  <p class="bili-login-send-group">1082333812</p>
                </div>
              </div>
              <div data-ba="loginStatus" class="bili-login-status">等待验证...</div>
              <button class="bili-login-btn" data-ba="startLogin">开始登录</button>
            </div>
          </div>
        </div>`;
      overlay.addEventListener('click', (e) => {
        const target = e.target.closest('[data-ba]');
        if (!target) return;
        if (target.getAttribute('data-ba') === 'startLogin') this.startLogin();
      });
      document.documentElement.appendChild(overlay);
      overlay.classList.add('tm-overlay-visible');
    },

    hideLoginOverlay() {
      const overlay = document.getElementById('biliauto-login-overlay');
      if (overlay) {
        overlay.classList.remove('tm-overlay-visible');
        setTimeout(() => overlay.remove(), 400);
      }
    },

    async startLogin() {
      const btn = document.querySelector('#biliauto-login-overlay [data-ba="startLogin"]');
      if (btn) btn.style.display = 'none';
      const display = document.querySelector('#biliauto-login-overlay [data-ba="loginCodeDisplay"]');
      const statusEl = document.querySelector('#biliauto-login-overlay [data-ba="loginStatus"]');
      if (!display || !statusEl) return;

      statusEl.textContent = '正在获取验证码...';
      statusEl.style.color = '';

      try {
        const resp = await API.request('POST', '/api/auth/qq-login');
        const code = resp && resp.data && resp.data.code;
        if (!code) {
          statusEl.textContent = '获取验证码失败，请重试';
          statusEl.style.color = 'var(--tm-accent)';
          return;
        }
        this.state.loginCode = code;
        // 逐位填入验证码
        const chars = display.querySelectorAll('.bili-login-code-char');
        const codeStr = String(code);
        chars.forEach((el, i) => { el.textContent = codeStr[i] || '-'; });
        statusEl.textContent = '等待验证...';
        this.pollLoginStatus(code);
      } catch (e) {
        statusEl.textContent = '网络错误: ' + (e.message || '');
        statusEl.style.color = 'var(--tm-accent)';
      }
    },

    async pollLoginStatus(code) {
      const statusEl = document.querySelector('#biliauto-login-overlay [data-ba="loginStatus"]');
      for (let i = 0; i < 120; i++) {
        await new Promise(r => setTimeout(r, 2500));
        try {
          const resp = await API.request('GET', '/api/auth/qq-status?code=' + code);
          Util.log('轮询响应:', JSON.stringify(resp).slice(0, 300));
          const data = resp && resp.data;
          if (!data) {
            if (statusEl) statusEl.textContent = '等待验证... (响应异常)';
            continue;
          }
          if (data.status === 'verified') {
            const qqId = data.qq_id || '';
            const apiKey = data.api_key || '';
            if (qqId && apiKey) {
              await this.saveLoginData(qqId, apiKey);
            }
            if (statusEl) {
              statusEl.textContent = '✅ 登录成功！';
              statusEl.style.color = '#4caf50';
            }
            return;
          } else if (data.status === 'expired' || data.status === 'invalid') {
            if (statusEl) {
              statusEl.textContent = '验证码已过期，点击重新获取';
              statusEl.style.color = 'var(--tm-accent)';
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
        statusEl.style.color = 'var(--tm-accent)';
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

    async saveLoginData(qqId, apiKey) {
      CONFIG.QQ_ID = qqId;
      CONFIG.API_KEY = apiKey;
      CONFIG.DEVICE_ID = qqId;
      GM_setValue('qq_id', qqId);
      GM_setValue('api_key', apiKey);
      GM_setValue('device_id', qqId);
      this.state.loginStatus = 'logged_in';
      this.hideLoginOverlay();
      const badge = document.querySelector('#biliauto-panel [data-ba="loginStatusBadge"]');
      if (badge) {
        badge.textContent = '✅ ' + qqId;
        badge.style.display = '';
      }
      document.querySelectorAll('[data-ba="logout"]').forEach(el => el.style.display = '');
      this.setStatus('✅ 已登录：' + qqId);
      Util.info('登录完成，QQ:', qqId, 'API Key:', apiKey);
      if (Util.notify) Util.notify('BiliAuto 登录成功', 'QQ: ' + qqId);
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
        const cfg = this.state.taskConfigs[taskId] || Util.defaultTaskConfig(taskId);
        return onlyTaskIds ? onlyTaskIds.includes(taskId) : cfg.selected;
      });
      if (!selected.length) {
        this.setStatus('没有选中的任务');
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
        Util.log(`面板: 执行当前页面任务: ${current.task_value}`);
        await runCurrentPageTask(this.state.baseConfig, current.task_value, this.state.taskConfigs[current.task_value]);
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
        meta.innerHTML = `<div>当前 task_id：${this.escape(currentTask)}</div><div>服务端：${this.escape(CONFIG.API_BASE)}</div><div>奖励页：${this.escape(baseUrl)}</div>`;
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
        list.innerHTML = '<div class="tm-material-empty">暂无任务<br>点击「刷新」拉取或输入 task_id 添加</div>';
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
      html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:4px 0;margin-bottom:4px;font-size:12px;color:var(--tm-text-secondary)">';
      html += '<span>共 ' + filtered.length + ' 个任务</span>';
      html += '<span style="display:flex;gap:4px;align-items:center">';
      html += '<button class="tm-material-btn tm-material-btn-xs" data-ba="pagePrev"';
      if (page <= 1) html += ' disabled style="opacity:0.4"';
      html += '>‹ 上一页</button>';
      html += '<span>' + page + '/' + totalPages + '</span>';
      html += '<button class="tm-material-btn tm-material-btn-xs" data-ba="pageNext"';
      if (page >= totalPages) html += ' disabled style="opacity:0.4"';
      html += '>下一页 ›</button></span></div>';
      for (var ti = 0; ti < pageTasks.length; ti++) {
        var task = pageTasks[ti];
        var taskId = String(task.task_value || task.value || task.task_id || '');
        var name = String(task.task_key || task.name || task.id || '未命名任务');
        var cfg = this.state.taskConfigs[taskId] || Util.defaultTaskConfig(taskId);
        html += '<div class="tm-material-item">';
        html += '<label class="tm-material-check">';
        html += '<input type="checkbox" data-ba="select" data-taskid="' + this.escapeAttr(taskId) + '"';
        if (cfg.selected) html += ' checked';
        html += '>' + this.escape(name) + '</label>';
        html += '<div class="tm-material-item-id">' + this.escape(taskId) + '</div>';
        html += '<div class="tm-material-item-config">';
        html += '<input data-ba="taskConfig" data-field="start_time" data-taskid="' + this.escapeAttr(taskId) + '" value="' + this.escapeAttr(cfg.start_time) + '" placeholder="时间" title="开始时间">';
        html += '<input data-ba="taskConfig" data-field="interval" data-taskid="' + this.escapeAttr(taskId) + '" value="' + this.escapeAttr(cfg.interval) + '" placeholder="间隔" title="点击间隔(秒)">';
        html += '<input data-ba="taskConfig" data-field="duration" data-taskid="' + this.escapeAttr(taskId) + '" value="' + this.escapeAttr(cfg.duration) + '" placeholder="持续" title="持续时长(秒)">';
        html += '</div>';
        html += '<div class="tm-material-item-actions">';
        html += '<button class="tm-material-btn tm-material-btn-sm" data-ba="runOne" data-taskid="' + this.escapeAttr(taskId) + '">执行</button>';
        html += '<button class="tm-material-btn tm-material-btn-sm" data-ba="jump" data-taskid="' + this.escapeAttr(taskId) + '">跳转</button>';
        html += '<button class="tm-material-btn tm-material-btn-sm" data-ba="copy" data-taskid="' + this.escapeAttr(taskId) + '">复制</button>';
        html += '<button class="tm-material-btn tm-material-btn-sm tm-material-btn-accent" data-ba="removeTask" data-taskid="' + this.escapeAttr(taskId) + '">删除</button>';
        html += '</div></div>';
      }
      list.innerHTML = html;
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
      // 判断逻辑：按钮名称为"查看奖励"视为领取成功，否则失败
      if (/查看奖励/.test(text)) {
        return { ok: true, response_code: 0, message: '✅ 按钮文字为"查看奖励"，领取成功' };
      }
      if (/已领取|已拥有|成功|领取成功/.test(text)) {
        return { ok: true, response_code: 0, message: text || '领取成功' };
      }
      return { ok: false, response_code: -1, message: text ? `按钮文字为"${text}"，非"查看奖励"，抢码失败` : '按钮不存在或无文字，抢码失败' };
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

})();
