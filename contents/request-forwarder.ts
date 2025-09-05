// contents/request-forwarder.ts

// 导入全局错误处理器
import './global-error-handler';

// 全局变量来跟踪状态
let isInitialized = false;
let isContextInvalid = false;
let hasShownReloadNotification = false;

// 检查扩展上下文是否有效（增强版本）
function isExtensionContextValid(): boolean {
  try {
    // 检查 chrome 对象和 runtime 是否存在
    if (!chrome || !chrome.runtime) {
      markContextInvalid();
      return false;
    }
    
    // 尝试访问 runtime.id，这是最可靠的检查方式
    const id = chrome.runtime.id;
    if (!id) {
      markContextInvalid();
      return false;
    }
    
    return true;
  } catch (error) {
    markContextInvalid();
    return false;
  }
}

// 标记上下文为无效并处理
function markContextInvalid(): void {
  if (isContextInvalid) {
    return;
  }
  
  isContextInvalid = true;
  
  // 显示用户友好的通知（只显示一次）
  if (!hasShownReloadNotification) {
    hasShownReloadNotification = true;
    showReloadNotification();
  }
}

// 显示重新加载通知
function showReloadNotification(): void {
  try {
    // 创建一个不显眼的通知元素
    const notification = document.createElement('div');
    notification.id = 'extension-context-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      padding: 12px 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      color: #495057;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      z-index: 10000;
      max-width: 300px;
      cursor: pointer;
      transition: opacity 0.3s ease;
    `;
    
    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <div style="width: 8px; height: 8px; background: #ffc107; border-radius: 50%; flex-shrink: 0;"></div>
        <div>
          <div style="font-weight: 500; margin-bottom: 4px;">扩展已更新</div>
          <div style="font-size: 12px; color: #6c757d;">点击刷新页面以使用最新版本</div>
        </div>
      </div>
    `;
    
    // 点击刷新页面
    notification.addEventListener('click', () => {
      window.location.reload();
    });
    
    // 添加到页面
    document.body.appendChild(notification);
    
    // 5秒后自动淡出
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 5000);
    
  } catch (error) {
    // 如果无法创建通知，尝试使用简单的控制台消息
    console.log('Extension updated. Please refresh the page.');
  }
}

// 安全的消息发送函数
function safePostMessage(data: any): boolean {
  try {
    if (window && typeof window.postMessage === 'function') {
      window.postMessage(data, "*");
      return true;
    }
  } catch (error) {
    // 完全静默
  }
  return false;
}

// 安全的响应发送函数
function safeSendResponse(sendResponse: (response?: any) => void, response: any): void {
  try {
    if (typeof sendResponse === 'function') {
      sendResponse(response);
    }
  } catch (error) {
    // 完全静默
  }
}

// 消息监听器函数（简化版本）
function messageListener(message: any, sender: any, sendResponse: (response?: any) => void): boolean {
  // 如果上下文已经标记为无效，直接返回
  if (isContextInvalid) {
    return false;
  }

  // 检查上下文是否有效
  if (!isExtensionContextValid()) {
    isContextInvalid = true;
    return false;
  }

  if (message && message.action === "forwardRecordedRequests") {
    // 将录制的请求转发给 web page
    const success = safePostMessage({
      type: "RECORDED_REQUESTS",
      requests: message.requests || []
    });
    
    safeSendResponse(sendResponse, { success });
    return true;
  }
  
  return false;
}

// 尝试设置消息监听器
function trySetupListener(): void {
  // 如果已经初始化或上下文无效，直接返回
  if (isInitialized || isContextInvalid) {
    return;
  }

  // 检查上下文是否有效
  if (!isExtensionContextValid()) {
    isContextInvalid = true;
    return;
  }

  try {
    chrome.runtime.onMessage.addListener(messageListener);
    isInitialized = true;
  } catch (error) {
    isContextInvalid = true;
  }
}

// 页面卸载时的清理
function cleanup(): void {
  isContextInvalid = true;
  
  if (isInitialized && isExtensionContextValid()) {
    try {
      chrome.runtime.onMessage.removeListener(messageListener);
    } catch (error) {
      // 静默处理
    }
  }
  
  isInitialized = false;
}

// 设置页面卸载监听器
function setupPageUnloadListener(): void {
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', cleanup, { passive: true });
    window.addEventListener('unload', cleanup, { passive: true });
    window.addEventListener('pagehide', cleanup, { passive: true });
  }
}

// 初始化函数
function initialize(): void {
  // 避免重复初始化
  if (isInitialized || isContextInvalid) {
    return;
  }

  // 设置页面卸载监听器
  setupPageUnloadListener();
  
  // 尝试设置消息监听器
  trySetupListener();
}

// 使用多种方式确保初始化
function safeInitialize(): void {
  try {
    initialize();
  } catch (error) {
    // 完全静默
  }
}

// 立即尝试初始化
safeInitialize();

// 如果页面还在加载，等待加载完成后再次尝试
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', safeInitialize, { once: true, passive: true });
}

// 延迟初始化作为备用
setTimeout(safeInitialize, 50);
setTimeout(safeInitialize, 200);

export {};