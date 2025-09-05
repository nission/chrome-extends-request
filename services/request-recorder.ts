// services/request-recorder.ts
// 请求录制服务

import type { RecordedRequest } from '../types';
import { safeWebRequestListener } from '../utils/safe-chrome-apis';

// 过滤静态资源的正则表达式
const staticFilePatterns = /\.(css|js|png|jpg|jpeg|gif|webp|svg|ico|ttf|woff|woff2)$/i;

// 全局状态变量
let recordedRequests: RecordedRequest[] = [];
let pendingRequests = new Map<string, RecordedRequest>();
let isRecording = true;
let isReplaying = false;

// 设置回放状态
export function setReplayingStatus(status: boolean): void {
  isReplaying = status;
}

// 设置录制状态
export function setRecordingStatus(status: boolean): void {
  isRecording = status;
}

// 获取录制的请求
export function getRecordedRequests(): RecordedRequest[] {
  return recordedRequests;
}

// 清空录制的请求
export function clearRecordedRequests(): void {
  recordedRequests = [];
  pendingRequests.clear();
}

// 拦截请求开始事件（带安全检查）
export function setupRequestRecordingListeners(): void {
  // 拦截请求开始事件
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

  // 拦截请求头发送事件
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

  // 拦截请求完成事件
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

  // 监听请求错误事件
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
}