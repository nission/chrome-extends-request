// contents/request-forwarder.ts

// 检查扩展上下文是否有效
function isExtensionContextValid(): boolean {
  try {
    return !!(chrome && chrome.runtime && chrome.runtime.id);
  } catch (error) {
    return false;
  }
}

// 安全的消息发送函数
function safePostMessage(data: any) {
  try {
    if (window && typeof window.postMessage === 'function') {
      window.postMessage(data, "*");
      return true;
    }
  } catch (error) {
    console.error('Failed to post message to window:', error);
  }
  return false;
}

// 消息监听器
function setupMessageListener() {
  if (!isExtensionContextValid()) {
    console.warn('Extension context is invalid, skipping message listener setup');
    return;
  }

  try {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      // 再次检查上下文是否有效
      if (!isExtensionContextValid()) {
        console.warn('Extension context invalidated during message handling');
        sendResponse({ success: false, error: 'Extension context invalidated' });
        return false;
      }

      if (message.action === "forwardRecordedRequests") {
        // 将录制的请求转发给 web page
        const success = safePostMessage({
          type: "RECORDED_REQUESTS",
          requests: message.requests
        });
        
        sendResponse({ success });
      }
      
      return true; // 保持消息通道开放以支持异步响应
    });
  } catch (error) {
    console.error('Failed to setup message listener:', error);
  }
}

// 监听扩展上下文失效事件
function handleContextInvalidation() {
  // 定期检查扩展上下文
  const checkInterval = setInterval(() => {
    if (!isExtensionContextValid()) {
      console.warn('Extension context has been invalidated');
      clearInterval(checkInterval);
      
      // 尝试重新设置监听器（在扩展重新加载后）
      setTimeout(() => {
        if (isExtensionContextValid()) {
          console.log('Extension context restored, re-setting up listeners');
          setupMessageListener();
          handleContextInvalidation();
        }
      }, 1000);
    }
  }, 5000); // 每5秒检查一次
}

// 初始化
if (isExtensionContextValid()) {
  setupMessageListener();
  handleContextInvalidation();
} else {
  console.warn('Extension context is not available at initialization');
}

export {};