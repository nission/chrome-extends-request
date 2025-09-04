import { useEffect, useState } from "react"
import "./styles/globals.css"

interface RecordedRequest {
  url: string;
  method: string;
  timestamp: string;
  body?: any;
  headers?: any[];
}

function IndexPopup() {
  const [isRecording, setIsRecording] = useState(false)
  const [recordedRequests, setRecordedRequests] = useState<RecordedRequest[]>([])
  const [isReplaying, setIsReplaying] = useState(false)
  const [isForwarding, setIsForwarding] = useState(false)

  // 检查扩展上下文是否有效
  const isExtensionContextValid = (): boolean => {
    try {
      return !!(chrome && chrome.runtime && chrome.runtime.id);
    } catch (error) {
      return false;
    }
  }

  // 安全的消息发送函数
  const safeSendMessage = (message: any, callback?: (response: any) => void) => {
    try {
      if (!isExtensionContextValid()) {
        console.warn('Extension context is invalid');
        if (callback) callback({ success: false, error: 'Extension context invalidated' });
        return;
      }
      chrome.runtime.sendMessage(message, (response) => {
        if (chrome.runtime.lastError) {
          console.error('Runtime error:', chrome.runtime.lastError);
          if (callback) callback({ success: false, error: chrome.runtime.lastError.message });
        } else {
          if (callback) callback(response);
        }
      });
    } catch (error) {
      console.error('Error sending message:', error);
      if (callback) callback({ success: false, error: error.message });
    }
  }

  // 页面加载时获取录制状态和已录制的请求
  useEffect(() => {
    if (!isExtensionContextValid()) {
      console.warn('Extension context is not available');
      return;
    }

    try {
      // 从 storage 获取录制状态
      chrome.storage.local.get("isRecording", (data) => {
        if (chrome.runtime.lastError) {
          console.error('Storage error:', chrome.runtime.lastError);
        } else {
          setIsRecording(data.isRecording || false);
        }
      });

      // 获取已录制的请求
      safeSendMessage({ action: "getRecordedRequests" }, (response) => {
        if (response && response.success !== false && response.requests) {
          setRecordedRequests(response.requests);
        }
      });
    } catch (error) {
      console.error('Error in useEffect:', error);
    }
  }, [])

  // 切换录制状态
  const toggleRecording = () => {
    if (!isExtensionContextValid()) {
      alert("扩展上下文已失效，请重新加载扩展");
      return;
    }

    const newRecordingState = !isRecording;

    try {
      if (newRecordingState) {
        chrome.storage.local.set({ isRecording: true });
        safeSendMessage({ action: "startRecording" }, (response) => {
          if (response && response.success !== false) {
            setIsRecording(true);
          } else {
            alert(`启动录制失败: ${response?.error || "未知错误"}`);
          }
        });
      } else {
        chrome.storage.local.set({ isRecording: false });
        safeSendMessage({ action: "stopRecording" }, (response) => {
          if (response && response.success !== false) {
            setIsRecording(false);
          } else {
            alert(`停止录制失败: ${response?.error || "未知错误"}`);
          }
        });
      }
    } catch (error) {
      console.error('Error toggling recording:', error);
      alert(`操作失败: ${error.message}`);
    }
  }

  // 回放请求
  const replayRequests = () => {
    if (recordedRequests.length === 0) {
      alert("没有录制的请求可以回放");
      return;
    }

    if (!isExtensionContextValid()) {
      alert("扩展上下文已失效，请重新加载扩展");
      return;
    }

    setIsReplaying(true);
    safeSendMessage({ action: "replayRequests" }, (response) => {
      setIsReplaying(false);
      if (response && response.success) {
        alert(`请求回放成功，状态码: ${response.status}`);
      } else {
        alert(`请求回放失败: ${response?.error || "未知错误"}`);
      }
    });
  }

  // 转发请求到 content script
  const forwardRequests = () => {
    if (recordedRequests.length === 0) {
      alert("没有录制的请求可以转发");
      return;
    }

    if (!isExtensionContextValid()) {
      alert("扩展上下文已失效，请重新加载扩展");
      return;
    }

    setIsForwarding(true);
    safeSendMessage({ action: "forwardRequestsToContentScript" }, (response) => {
      setIsForwarding(false);
      if (response && response.success) {
        alert("请求已成功转发到 content script");
      } else {
        alert(`请求转发失败: ${response?.error || "未知错误"}`);
      }
    });
  }

  // 清空录制的请求
  const clearRequests = () => {
    if (!isExtensionContextValid()) {
      alert("扩展上下文已失效，请重新加载扩展");
      return;
    }

    safeSendMessage({ action: "clearRecordedRequests" }, (response) => {
      if (response && response.success) {
        setRecordedRequests([]);
        alert("已清空录制的请求");
      } else {
        alert(`清空请求失败: ${response?.error || "未知错误"}`);
      }
    });
  }
  return (
    <div className="min-w-[340px] max-w-[420px] p-4 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 rounded-xl shadow border border-neutral-200 font-sans">
      <h2 className="text-xl font-bold mb-4">
        Request Recorder
      </h2>
      
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          onClick={toggleRecording}
          className={`px-4 py-2 rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            isRecording
              ? "bg-red-500 hover:bg-red-600 text-white"
              : "bg-blue-500 hover:bg-blue-600 text-white"
          }`}
          disabled={isReplaying}
        >
          {isRecording ? "停止录制" : "开始录制"}
        </button>
        
        <button
          onClick={replayRequests}
          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isReplaying || recordedRequests.length === 0}
        >
          {isReplaying ? "回放中..." : "回放请求"}
        </button>
        <button
          onClick={forwardRequests}
          className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isForwarding || recordedRequests.length === 0}
        >
          {isForwarding ? "转发中..." : "转发请求"}
        </button>
        <button
          onClick={clearRequests}
          className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isReplaying}
        >
          清空记录
        </button>
      </div>

      <div className="mb-4">
        <p className="text-sm mb-1">
          录制状态:
          <span
            className={`ml-2 inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${
              isRecording ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            }`}
          >
            {isRecording ? "录制中" : "已停止"}
          </span>
        </p>
        <p className="text-xs text-neutral-500">
          已录制请求数量: {recordedRequests.length}
        </p>
      </div>

      {recordedRequests.length > 0 && (
        <div>
          <h3 className="text-base font-medium mb-2">录制的请求</h3>
          <div className="max-h-[200px] overflow-y-auto">
            {recordedRequests.map((request, index) => (
              <div
                key={index}
                className="p-2 mb-2 bg-gray-100 rounded text-xs"
              >
                <div className="font-bold">
                  {request.method} {request.url}
                </div>
                <div className="text-gray-500">
                  {new Date(request.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {recordedRequests.length === 0 && (
        <div className="mt-2 rounded-lg border border-dashed border-neutral-200 p-4 text-sm text-neutral-500">
          暂无录制请求
        </div>
      )}
    </div>
  )
}

export default IndexPopup
