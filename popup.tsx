import { useEffect, useState } from "react"

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

  // 页面加载时获取录制状态和已录制的请求
  useEffect(() => {
    // 从 storage 获取录制状态
    chrome.storage.local.get("isRecording", (data) => {
      setIsRecording(data.isRecording || false)
    })

    // 获取已录制的请求
    chrome.runtime.sendMessage({ action: "getRecordedRequests" }, (response) => {
      if (response && response.requests) {
        setRecordedRequests(response.requests)
      }
    })
  }, [])

  // 切换录制状态
  const toggleRecording = () => {
    const newRecordingState = !isRecording

    if (newRecordingState) {
      chrome.storage.local.set({ isRecording: true })
      chrome.runtime.sendMessage({ action: "startRecording" })
    } else {
      chrome.storage.local.set({ isRecording: false })
      chrome.runtime.sendMessage({ action: "stopRecording" })
    }

    setIsRecording(newRecordingState)
  }

  // 回放请求
  const replayRequests = () => {
    if (recordedRequests.length === 0) {
      alert("没有录制的请求可以回放")
      return
    }

    setIsReplaying(true)
    chrome.runtime.sendMessage({ action: "replayRequests" }, (response) => {
      setIsReplaying(false)
      if (response && response.success) {
        alert(`请求回放成功，状态码: ${response.status}`)
      } else {
        alert(`请求回放失败: ${response?.error || "未知错误"}`)
      }
    })
  }

  // 清空录制的请求
  const clearRequests = () => {
    chrome.runtime.sendMessage({ action: "clearRecordedRequests" }, (response) => {
      if (response && response.success) {
        setRecordedRequests([])
        alert("已清空录制的请求")
      }
    })
  }

  return (
    <div
      style={{
        padding: 16,
        minWidth: 300,
        fontFamily: "Arial, sans-serif"
      }}>
      <h2 style={{ margin: "0 0 16px 0", fontSize: "18px" }}>
        Request Recorder
      </h2>
      
      <div style={{ marginBottom: 16 }}>
        <button
          onClick={toggleRecording}
          style={{
            padding: "10px 16px",
            backgroundColor: isRecording ? "#dc3545" : "#007bff",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            marginRight: "8px",
            fontSize: "14px"
          }}
          disabled={isReplaying}
        >
          {isRecording ? "停止录制" : "开始录制"}
        </button>
        
        <button
          onClick={replayRequests}
          style={{
            padding: "10px 16px",
            backgroundColor: "#28a745",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            marginRight: "8px",
            fontSize: "14px"
          }}
          disabled={isReplaying || recordedRequests.length === 0}
        >
          {isReplaying ? "回放中..." : "回放请求"}
        </button>
        
        <button
          onClick={clearRequests}
          style={{
            padding: "10px 16px",
            backgroundColor: "#6c757d",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "14px"
          }}
          disabled={isReplaying}
        >
          清空记录
        </button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <p style={{ margin: "0 0 8px 0", fontSize: "14px", fontWeight: "bold" }}>
          录制状态: <span style={{ color: isRecording ? "#28a745" : "#dc3545" }}>
            {isRecording ? "录制中" : "已停止"}
          </span>
        </p>
        <p style={{ margin: "0", fontSize: "14px" }}>
          已录制请求数量: {recordedRequests.length}
        </p>
      </div>

      {recordedRequests.length > 0 && (
        <div>
          <h3 style={{ margin: "0 0 8px 0", fontSize: "16px" }}>录制的请求:</h3>
          <div style={{ maxHeight: "200px", overflowY: "auto" }}>
            {recordedRequests.map((request, index) => (
              <div
                key={index}
                style={{
                  padding: "8px",
                  marginBottom: "8px",
                  backgroundColor: "#f8f9fa",
                  borderRadius: "4px",
                  fontSize: "12px"
                }}
              >
                <div style={{ fontWeight: "bold" }}>
                  {request.method} {request.url}
                </div>
                <div style={{ color: "#6c757d" }}>
                  {new Date(request.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default IndexPopup
