// 请求录制相关的类型定义
interface RecordedRequest {
  url: string;
  method: string;
  timestamp: string;
  body?: chrome.webRequest.WebRequestBody;
  headers?: chrome.webRequest.HttpHeader[];
}

// 全局状态变量
let recordedRequests: RecordedRequest[] = [];
let pendingRequests = new Map<string, RecordedRequest>();
let isRecording = true;
let isReplaying = false;

// 过滤静态资源的正则表达式
const staticFilePatterns = /\.(css|js|png|jpg|jpeg|gif|webp|svg|ico|ttf|woff|woff2)$/i;

// 监听 start/stop 请求录制的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "startRecording") {
    isRecording = true;
    console.log("Recording started...");
    sendResponse({ success: true });
  } else if (message.action === "stopRecording") {
    isRecording = false;
    console.log("Recording stopped...");
    sendResponse({ success: true });
  } else if (message.action === "getRecordedRequests") {
    sendResponse({ requests: recordedRequests });
  } else if (message.action === "clearRecordedRequests") {
    recordedRequests = [];
    pendingRequests.clear();
    sendResponse({ success: true });
  }
  return true; // 保持消息通道开放以支持异步响应
});

// 拦截请求开始事件
chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (isReplaying) return; // 如果正在回放请求，则不记录
    if (isRecording) {
      // 只记录非静态资源的 XMLHttpRequest 请求
      if (!staticFilePatterns.test(details.url) && details.type === "xmlhttprequest") {
        const request: RecordedRequest = {
          url: details.url,
          method: details.method,
          timestamp: new Date().toISOString(),
        };

        // 获取请求体信息
        if (details.requestBody) {
          request.body = details.requestBody;
        }

        // 将请求存储在 pendingRequests 中
        pendingRequests.set(details.requestId, request);
      }
    }
  },
  { urls: ["<all_urls>"] },
  ["requestBody"]
);

// 拦截请求头发送事件
chrome.webRequest.onSendHeaders.addListener(
  (details) => {
    if (isReplaying) return; // 如果正在回放请求，则不记录
    if (isRecording) {
      // 只记录非静态资源的 XMLHttpRequest 请求
      if (!staticFilePatterns.test(details.url) && details.type === "xmlhttprequest") {
        // 获取 pendingRequests 中的请求
        const request = pendingRequests.get(details.requestId);
        if (request) {
          // 获取请求头信息
          request.headers = details.requestHeaders;
        }
      }
    }
  },
  { urls: ["<all_urls>"] },
  ["requestHeaders"]
);

// 拦截请求完成事件
chrome.webRequest.onCompleted.addListener(
  (details) => {
    if (isReplaying) return; // 如果正在回放请求，则不记录
    if (isRecording) {
      // 只记录非静态资源的 XMLHttpRequest 请求
      if (!staticFilePatterns.test(details.url) && details.type === "xmlhttprequest") {
        // 从 pendingRequests 中获取请求
        const request = pendingRequests.get(details.requestId);
        if (request) {
          // 将完整的请求添加到 recordedRequests
          recordedRequests.push(request);
          // 从 pendingRequests 中删除
          pendingRequests.delete(details.requestId);
        }
      }
    }
  },
  { urls: ["<all_urls>"] }
);

// 监听请求错误事件
chrome.webRequest.onErrorOccurred.addListener(
  (details) => {
    if (isReplaying) return; // 如果正在回放请求，则不记录
    if (isRecording) {
      // 只记录非静态资源的 XMLHttpRequest 请求
      if (!staticFilePatterns.test(details.url) && details.type === "xmlhttprequest") {
        // 从 pendingRequests 中获取请求
        const request = pendingRequests.get(details.requestId);
        if (request) {
          // 将请求添加到 recordedRequests (即使有错误)
          recordedRequests.push(request);
          // 从 pendingRequests 中删除
          pendingRequests.delete(details.requestId);
        }
      }
    }
  },
  { urls: ["<all_urls>"] }
);

// 监听转发请求到 content script 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "forwardRequestsToContentScript") {
    // 获取当前活动的 tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length > 0 && tabs[0].id) {
        // 将录制的请求发送给 content script
        chrome.tabs.sendMessage(tabs[0].id, {
          action: "forwardRecordedRequests",
          requests: recordedRequests
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error("Error sending message to content script:", chrome.runtime.lastError);
            sendResponse({ success: false, error: chrome.runtime.lastError.message });
          } else {
            sendResponse({ success: true, response });
          }
        });
      } else {
        sendResponse({ success: false, error: "No active tab found" });
      }
    });
    return true; // 保持消息通道开放以支持异步响应
  }
});

// 监听回放请求
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "replayRequests" && recordedRequests.length > 0) {
    // 使用 Fetch API 来回放请求
    // 只回放第一个请求
    const req = recordedRequests[0];
    (async () => {
      try {
        // 设置正在回放请求的标志
        isReplaying = true;
        
        // 获取域名
        const url = new URL(req.url);
        const domain = url.hostname;
        
        // 获取该域名的cookie
        const cookies = await chrome.cookies.getAll({ domain: domain });
        
        // 构建cookie字符串
        let cookieString = '';
        if (cookies && cookies.length > 0) {
          cookieString = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
        }

        // 创建请求头
        const headers = new Headers();
        // 如果 req.headers 存在且为数组，则添加到 headers 中
        if (req.headers && Array.isArray(req.headers)) {
          req.headers.forEach(header => {
            headers.append(header.name, header.value);
          });
        }
        
        // 如果有cookie，则添加到请求头中
        if (cookieString) {
          headers.set('Cookie', cookieString);
        }
        
        // 处理请求体
        let body: string | null = null;
        if (req.body) {
          if (req.body.formData) {
            // 处理表单数据
            const formData = new FormData();
            Object.entries(req.body.formData).forEach(([key, values]) => {
              if (Array.isArray(values)) {
                values.forEach(value => formData.append(key, value));
              }
            });
            body = new URLSearchParams(formData as any).toString();
          } else if (req.body.raw) {
            // 处理原始数据
            const decoder = new TextDecoder();
            body = decoder.decode(req.body.raw[0].bytes);
          }
        }
        
        // 发送请求
        const response = await fetch(req.url, {
          method: req.method,
          headers: headers,
          body: body,
        });

        console.log(`Replayed request to ${req.url} with status: ${response.status}`);
        sendResponse({ success: true, status: response.status });
        
      } catch (err) {
        console.error('Error replaying request:', err);
        sendResponse({ success: false, error: err.message });
      } finally {
        // 回放完成后，重置标志
        isReplaying = false;
      }
    })();
    return true; // 保持消息通道开放以支持异步响应
  }
});

export {};