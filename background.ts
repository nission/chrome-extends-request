// 请求录制相关的类型定义
interface RecordedRequest {
  url: string;
  method: string;
  timestamp: string;
  body?: chrome.webRequest.WebRequestBody;
  headers?: chrome.webRequest.HttpHeader[];
}

// 更新扩展图标的函数（带上下文检查）
async function updateExtensionIcon(recording: boolean): Promise<void> {
  // 检查扩展上下文是否有效
  if (!isExtensionContextValid()) {
    return;
  }

  try {
    // 创建不同尺寸的图标
    const sizes = [16, 32, 48, 64, 128];
    const imageData: { [key: number]: ImageData } = {};
    
    // 为每个尺寸创建图标
    for (const size of sizes) {
      // 创建Canvas元素
      const canvas = new OffscreenCanvas(size, size);
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // 填充背景色
        ctx.fillStyle = '#4F46E5'; // Indigo color as default background
        ctx.fillRect(0, 0, size, size);
        
        // 绘制简单的图标形状
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 3, 0, Math.PI * 2);
        ctx.fill();
        
        // 如果正在录制，添加红色录制指示点
        if (recording) {
          ctx.fillStyle = '#EF4444'; // Red color for recording indicator
          ctx.beginPath();
          ctx.arc(size * 0.75, size * 0.25, size / 6, 0, Math.PI * 2);
          ctx.fill();
        }
        
        // 获取图像数据
        imageData[size] = ctx.getImageData(0, 0, size, size);
      }
    }
    
    // 再次检查上下文，然后更新扩展图标
    if (isExtensionContextValid()) {
      await chrome.action.setIcon({ imageData });
    }
  } catch (error) {
    // 静默处理错误，避免在控制台输出
  }
}

// 全局状态变量
let recordedRequests: RecordedRequest[] = [];
let pendingRequests = new Map<string, RecordedRequest>();
let isRecording = true;
let isReplaying = false;

// 过滤静态资源的正则表达式
const staticFilePatterns = /\.(css|js|png|jpg|jpeg|gif|webp|svg|ico|ttf|woff|woff2)$/i;

// 检查扩展上下文是否有效（增强版本）
function isExtensionContextValid(): boolean {
  try {
    // 多重检查确保上下文有效
    if (!chrome || !chrome.runtime) {
      return false;
    }
    
    // 尝试访问 runtime.id
    const id = chrome.runtime.id;
    if (!id) {
      return false;
    }
    
    // 检查其他关键 API 是否可用
    if (!chrome.action || !chrome.tabs || !chrome.webRequest) {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

// 安全的响应发送函数（静默版本）
function safeSendResponse(sendResponse: (response?: any) => void, response: any): boolean {
  try {
    if (isExtensionContextValid() && typeof sendResponse === 'function') {
      sendResponse(response);
      return true;
    }
  } catch (error) {
    // 静默处理错误
  }
  return false;
}

// 安全的Chrome API调用包装器
function safeChromeTabs<T>(
  operation: () => Promise<T> | T,
  fallback?: T
): Promise<T | undefined> {
  return new Promise((resolve) => {
    try {
      if (!isExtensionContextValid()) {
        resolve(fallback);
        return;
      }
      
      const result = operation();
      if (result instanceof Promise) {
        result.then(resolve).catch(() => resolve(fallback));
      } else {
        resolve(result);
      }
    } catch (error) {
      resolve(fallback);
    }
  });
}

// 安全的Chrome cookies调用
async function safeGetCookies(domain: string): Promise<chrome.cookies.Cookie[]> {
  try {
    if (!isExtensionContextValid()) {
      return [];
    }
    return await chrome.cookies.getAll({ domain });
  } catch (error) {
    return [];
  }
}

// 全局消息处理器状态
let messageHandlerSetup = false;

// 设置消息处理器
function setupMessageHandler(): void {
  if (messageHandlerSetup || !isExtensionContextValid()) {
    return;
  }

  try {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      // 立即检查上下文
      if (!isExtensionContextValid()) {
        safeSendResponse(sendResponse, { success: false, error: 'Extension context invalidated' });
        return false;
      }

      // 处理录制相关消息
      if (message.action === "startRecording") {
        isRecording = true;
        updateExtensionIcon(true);
        safeSendResponse(sendResponse, { success: true });
        return true;
      }
      
      if (message.action === "stopRecording") {
        isRecording = false;
        updateExtensionIcon(false);
        safeSendResponse(sendResponse, { success: true });
        return true;
      }
      
      if (message.action === "getRecordedRequests") {
        safeSendResponse(sendResponse, { requests: recordedRequests });
        return true;
      }
      
      if (message.action === "clearRecordedRequests") {
        recordedRequests = [];
        pendingRequests.clear();
        safeSendResponse(sendResponse, { success: true });
        return true;
      }

      // 处理转发请求到 content script 的消息
      if (message.action === "forwardRequestsToContentScript") {
        safeChromeTabs(async () => {
          const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
          
          if (!isExtensionContextValid()) {
            safeSendResponse(sendResponse, { success: false, error: 'Extension context invalidated' });
            return;
          }

          if (tabs.length > 0 && tabs[0].id) {
            const tab = tabs[0];
            
            // 检查 tab 是否有 URL 且是 github.com 或其子域名
            if (tab.url && tab.url.startsWith('https://github.com')) {
              // 将录制的请求发送给 content script
              try {
                chrome.tabs.sendMessage(tab.id, {
                  action: "forwardRecordedRequests",
                  requests: recordedRequests
                }, (response) => {
                  if (chrome.runtime.lastError || !isExtensionContextValid()) {
                    safeSendResponse(sendResponse, { success: false, error: 'Failed to send message to content script' });
                  } else {
                    safeSendResponse(sendResponse, { success: true, response });
                  }
                });
              } catch (error) {
                safeSendResponse(sendResponse, { success: false, error: 'Failed to send message to content script' });
              }
            } else {
              safeSendResponse(sendResponse, { success: false, error: "Content script only works on github.com" });
            }
          } else {
            safeSendResponse(sendResponse, { success: false, error: "No active tab found" });
          }
        });
        return true;
      }

      // 处理回放请求
      if (message.action === "replayRequests" && recordedRequests.length > 0) {
        const req = recordedRequests[0];
        (async () => {
          try {
            isReplaying = true;
            
            if (!isExtensionContextValid()) {
              safeSendResponse(sendResponse, { success: false, error: 'Extension context invalidated during replay' });
              return;
            }
            
            const url = new URL(req.url);
            const domain = url.hostname;
            const cookies = await safeGetCookies(domain);
            
            let cookieString = '';
            if (cookies && cookies.length > 0) {
              cookieString = cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
            }

            const headers = new Headers();
            if (req.headers && Array.isArray(req.headers)) {
              req.headers.forEach(header => {
                headers.append(header.name, header.value);
              });
            }
            
            if (cookieString) {
              headers.set('Cookie', cookieString);
            }
            
            let body: string | null = null;
            if (req.body) {
              if (req.body.formData) {
                const formData = new FormData();
                Object.entries(req.body.formData).forEach(([key, values]) => {
                  if (Array.isArray(values)) {
                    values.forEach(value => formData.append(key, value));
                  }
                });
                body = new URLSearchParams(formData as any).toString();
              } else if (req.body.raw) {
                const decoder = new TextDecoder();
                body = decoder.decode(req.body.raw[0].bytes);
              }
            }
            
            const response = await fetch(req.url, {
              method: req.method,
              headers: headers,
              body: body,
            });

            safeSendResponse(sendResponse, { success: true, status: response.status });
            
          } catch (err) {
            safeSendResponse(sendResponse, { success: false, error: 'Replay failed' });
          } finally {
            isReplaying = false;
          }
        })();
        return true;
      }

      return false;
    });
    
    messageHandlerSetup = true;
  } catch (error) {
    // 静默处理错误
  }
}

// 安全的WebRequest监听器包装器
function safeWebRequestListener<T extends chrome.webRequest.WebRequestDetails>(
  callback: (details: T) => void
) {
  return (details: T) => {
    try {
      if (!isExtensionContextValid()) {
        return;
      }
      callback(details);
    } catch (error) {
      // 静默处理错误
    }
  };
}

// 拦截请求开始事件（带安全检查）
chrome.webRequest.onBeforeRequest.addListener(
  safeWebRequestListener((details) => {
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
  }),
  { urls: ["<all_urls>"] },
  ["requestBody"]
);

// 拦截请求头发送事件（带安全检查）
chrome.webRequest.onSendHeaders.addListener(
  safeWebRequestListener((details) => {
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
  }),
  { urls: ["<all_urls>"] },
  ["requestHeaders"]
);

// 拦截请求完成事件（带安全检查）
chrome.webRequest.onCompleted.addListener(
  safeWebRequestListener((details) => {
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
  }),
  { urls: ["<all_urls>"] }
);

// 监听请求错误事件（带安全检查）
chrome.webRequest.onErrorOccurred.addListener(
  safeWebRequestListener((details) => {
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
  }),
  { urls: ["<all_urls>"] }
);

// 重新注入content script到所有已打开的标签页
// 监听扩展启动事件
chrome.runtime.onStartup.addListener(() => {
  if (isExtensionContextValid()) {
    // 扩展启动时的初始化
    setupMessageHandler();
    updateExtensionIcon(isRecording);
  }
});

// 监听扩展安装/更新事件
chrome.runtime.onInstalled.addListener((details) => {
  if (isExtensionContextValid()) {
    // 扩展安装或更新时的初始化
    setupMessageHandler();
    updateExtensionIcon(isRecording);
  }
});
// 初始化扩展
function initializeExtension(): void {
  if (!isExtensionContextValid()) {
    return;
  }

  // 设置消息处理器
  setupMessageHandler();
  
  // 初始化图标状态
  updateExtensionIcon(isRecording);
}

// 多次尝试初始化，确保成功
initializeExtension();
setTimeout(initializeExtension, 500);
setTimeout(initializeExtension, 1500);

export {};