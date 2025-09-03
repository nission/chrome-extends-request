// contents/request-forwarder.ts

// 监听来自 background script 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "forwardRecordedRequests") {
    // 将录制的请求转发给 web page
    window.postMessage({
      type: "RECORDED_REQUESTS",
      requests: message.requests
    }, "*");
    
    sendResponse({ success: true });
  }
  
  return true; // 保持消息通道开放以支持异步响应
});

export {};