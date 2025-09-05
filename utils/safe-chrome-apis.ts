// utils/safe-chrome-apis.ts
// 安全的 Chrome API 调用函数

import { isExtensionContextValid } from './extension-utils';

// 安全的响应发送函数（静默版本）
export function safeSendResponse(sendResponse: (response?: any) => void, response: any): boolean {
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
export function safeChromeTabs<T>(
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
export async function safeGetCookies(domain: string): Promise<chrome.cookies.Cookie[]> {
  try {
    if (!isExtensionContextValid()) {
      return [];
    }
    return await chrome.cookies.getAll({ domain });
  } catch (error) {
    return [];
  }
}

// 安全的WebRequest监听器包装器
export function safeWebRequestListener<T extends chrome.webRequest.WebRequestDetails>(
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