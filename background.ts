// background.ts
// Chrome 扩展后台脚本主文件

import { isExtensionContextValid, updateExtensionIcon } from './utils/extension-utils';
import { setupMessageHandler } from './modules/message-handler';
import { setupRequestRecordingListeners } from './services/request-recorder';

// 监听扩展启动事件
chrome.runtime.onStartup.addListener(() => {
  if (isExtensionContextValid()) {
    // 扩展启动时的初始化
    setupMessageHandler();
    setupRequestRecordingListeners();
    updateExtensionIcon(true);
    
    // 设置默认录制状态
    chrome.storage.local.set({ isRecording: true });
  }
});

// 监听扩展安装/更新事件
chrome.runtime.onInstalled.addListener((details) => {
  if (isExtensionContextValid()) {
    // 扩展安装或更新时的初始化
    setupMessageHandler();
    setupRequestRecordingListeners();
    updateExtensionIcon(true);
    
    // 设置默认录制状态
    chrome.storage.local.set({ isRecording: true });
  }
});

// 初始化扩展
function initializeExtension(): void {
  if (!isExtensionContextValid()) {
    return;
  }

  // 设置消息处理器
  setupMessageHandler();
  
  // 设置请求录制监听器
  setupRequestRecordingListeners();
  
  // 初始化图标状态
  updateExtensionIcon(true);
  
  // 设置默认录制状态
  chrome.storage.local.set({ isRecording: true });
}

export {};