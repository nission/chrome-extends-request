// services/request-replayer.ts
// 请求回放服务

import { getRecordedRequests, setReplayingStatus } from './request-recorder';
import { safeGetCookies, safeSendResponse } from '../utils/safe-chrome-apis';

// 回放录制的请求
export async function replayRecordedRequests(sendResponse: (response?: any) => void): Promise<void> {
  const recordedRequests = getRecordedRequests();
  
  if (recordedRequests.length === 0) {
    safeSendResponse(sendResponse, { success: false, error: 'No recorded requests to replay' });
    return;
  }

  const req = recordedRequests[0];
  try {
    setReplayingStatus(true);
    
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
        if (header.name && header.value) {
          headers.append(header.name, header.value);
        }
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
    setReplayingStatus(false);
  }
}