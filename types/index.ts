// Chrome 扩展消息类型定义
export interface ChromeMessage {
  action: string;
  [key: string]: any;
}

// 录制请求的消息类型
export interface RecordingMessage extends ChromeMessage {
  action: "startRecording" | "stopRecording";
}

// 获取请求的消息类型
export interface GetRequestsMessage extends ChromeMessage {
  action: "getRecordedRequests";
}

// 回放请求的消息类型
export interface ReplayMessage extends ChromeMessage {
  action: "replayRequests";
}

// 清空请求的消息类型
export interface ClearRequestsMessage extends ChromeMessage {
  action: "clearRecordedRequests";
}

// 录制的请求数据结构
export interface RecordedRequest {
  url: string;
  method: string;
  timestamp: string;
  body?: chrome.webRequest.WebRequestBody;
  headers?: chrome.webRequest.HttpHeader[];
}

// Chrome 消息响应类型
export interface ChromeResponse {
  success: boolean;
  [key: string]: any;
}

// 获取请求的响应类型
export interface GetRequestsResponse extends ChromeResponse {
  requests: RecordedRequest[];
}

// 回放请求的响应类型
export interface ReplayResponse extends ChromeResponse {
  status?: number;
  error?: string;
}

// 存储数据类型
export interface StorageData {
  isRecording?: boolean;
}