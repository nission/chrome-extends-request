// modules/message-handler.ts
// 消息处理模块

import { isExtensionContextValid, updateExtensionIcon } from '../utils/extension-utils';
import { safeSendResponse, safeChromeTabs } from '../utils/safe-chrome-apis';
import { setRecordingStatus, getRecordedRequests, clearRecordedRequests } from '../services/request-recorder';
import { replayRecordedRequests } from '../services/request-replayer';
import type { ChromeMessage } from '../types';

// 全局消息处理器状态
let messageHandlerSetup = false;

// 设置消息处理器
export function setupMessageHandler(): void {
  if (messageHandlerSetup || !isExtensionContextValid()) {
    return;
  }

  try {
    chrome.runtime.onMessage.addListener((message: ChromeMessage, sender, sendResponse) => {
      // 立即检查上下文
      if (!isExtensionContextValid()) {
        safeSendResponse(sendResponse, { success: false, error: 'Extension context invalidated' });
        return false;
      }

      // 处理录制相关消息
      if (message.action === "startRecording") {
        setRecordingStatus(true);
        updateExtensionIcon(true);
        safeSendResponse(sendResponse, { success: true });
        return true;
      }
      
      if (message.action === "stopRecording") {
        setRecordingStatus(false);
        updateExtensionIcon(false);
        safeSendResponse(sendResponse, { success: true });
        return true;
      }
      
      if (message.action === "getRecordedRequests") {
        safeSendResponse(sendResponse, { requests: getRecordedRequests() });
        return true;
      }
      
      if (message.action === "clearRecordedRequests") {
        clearRecordedRequests();
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
                  requests: getRecordedRequests()
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
      if (message.action === "replayRequests") {
        replayRecordedRequests(sendResponse);
        return true;
      }

      return false;
    });
    
    messageHandlerSetup = true;
  } catch (error) {
    // 静默处理错误
  }
}