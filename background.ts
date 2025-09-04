// 请求录制相关的类型定义
interface RecordedRequest {
  url: string;
  method: string;
  timestamp: string;
  body?: chrome.webRequest.WebRequestBody;
  headers?: chrome.webRequest.HttpHeader[];
}

// 更新扩展图标的函数
async function updateExtensionIcon(recording: boolean) {
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
    
    // 更新扩展图标
    await chrome.action.setIcon({ imageData });
    console.log(`Extension icon updated: ${recording ? 'Recording' : 'Not Recording'}`);
  } catch (error) {
    console.error('Failed to update extension icon:', error);
  }
}

// 全局状态变量
let recordedRequests: RecordedRequest[] = [];
let pendingRequests = new Map<string, RecordedRequest>();
let isRecording = true;
let isReplaying = false;

// 过滤静态资源的正则表达式
const staticFilePatterns = /\.(css|js|png|jpg|jpeg|gif|webp|svg|ico|ttf|woff|woff2)$/i;

// 检查扩展上下文是否有效
function isExtensionContextValid(): boolean {
  try {
    return !!(chrome && chrome.runtime && chrome.runtime.id);
  } catch (error) {
    return false;
  }
}

// 安全的响应发送函数
function safeSendResponse(sendResponse: (response?: any) => void, response: any) {
  try {
    if (isExtensionContextValid() && typeof sendResponse === 'function') {
      sendResponse(response);
      return true;
    }
  } catch (error) {
    console.error('Failed to send response:', error);
  }
  return false;
}

// 统一的消息处理器
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    if (!isExtensionContextValid()) {
      console.warn('Extension context invalidated during message handling');
      safeSendResponse(sendResponse, { success: false, error: 'Extension context invalidated' });
      return false;
    }

    // 处理录制相关消息
    if (message.action === "startRecording") {
      isRecording = true;
      console.log("Recording started...");
      updateExtensionIcon(true).catch(error => {
        console.error('Failed to update icon:', error);
      });
      safeSendResponse(sendResponse, { success: true });
      return true;
    }
    
    if (message.action === "stopRecording") {
      isRecording = false;
      console.log("Recording stopped...");
      updateExtensionIcon(false).catch(error => {
        console.error('Failed to update icon:', error);
      });
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
      // 获取当前活动的 tab
      chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
        try {
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
                  if (chrome.runtime.lastError) {
                    console.error("Error sending message to content script:", chrome.runtime.lastError);
                    safeSendResponse(sendResponse, { success: false, error: chrome.runtime.lastError.message });
                  } else {
                    safeSendResponse(sendResponse, { success: true, response });
                  }
                });
              } catch (error) {
                console.error("Error sending message to content script:", error);
                safeSendResponse(sendResponse, { success: false, error: error.message });
              }
            } else {
              safeSendResponse(sendResponse, { success: false, error: "Content script only works on github.com" });
            }
          } else {
            safeSendResponse(sendResponse, { success: false, error: "No active tab found" });
          }
        } catch (error) {
          console.error("Error in tab query callback:", error);
          safeSendResponse(sendResponse, { success: false, error: error.message });
        }
      });
      return true;
    }

    // 处理回放请求
    if (message.action === "replayRequests" && recordedRequests.length > 0) {
      // 使用 Fetch API 来回放请求
      // 只回放第一个请求
      const req = recordedRequests[0];
      (async () => {
        try {
          // 设置正在回放请求的标志
          isReplaying = true;
          
          // 再次检查上下文
          if (!isExtensionContextValid()) {
            safeSendResponse(sendResponse, { success: false, error: 'Extension context invalidated during replay' });
            return;
          }
          
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
          safeSendResponse(sendResponse, { success: true, status: response.status });
          
        } catch (err) {
          console.error('Error replaying request:', err);
          safeSendResponse(sendResponse, { success: false, error: err.message });
        } finally {
          // 回放完成后，重置标志
          isReplaying = false;
        }
      })();
      return true;
    }

    // 如果没有匹配的 action，返回 false
    return false;
    
  } catch (error) {
    console.error('Error handling message:', error);
    safeSendResponse(sendResponse, { success: false, error: error.message });
    return false;
  }
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


// // 在扩展启动时设置初始图标状态
// // 延迟执行以确保扩展完全初始化
// setTimeout(() => {
//   updateExtensionIcon(isRecording).catch(error => {
//     console.error('Failed to set initial extension icon:', error);
//   });
// }, 1000);

// 在扩展启动时设置初始图标状态
updateExtensionIcon(isRecording);

export {};