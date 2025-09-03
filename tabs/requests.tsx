import { useEffect, useState } from "react"
import "../styles/globals.css"
import type { RecordedRequest } from "../types"

function RequestsPage() {
  const [recordedRequests, setRecordedRequests] = useState<RecordedRequest[]>([])
  const [selectedRequest, setSelectedRequest] = useState<RecordedRequest | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedMethod, setSelectedMethod] = useState<string>("all")

  // 页面加载时获取录制的请求
  useEffect(() => {
    chrome.runtime.sendMessage({ action: "getRecordedRequests" }, (response) => {
      if (response && response.requests) {
        setRecordedRequests(response.requests)
      }
    })
  }, [])

  // 刷新请求列表
  const refreshRequests = () => {
    chrome.runtime.sendMessage({ action: "getRecordedRequests" }, (response) => {
      if (response && response.requests) {
        setRecordedRequests(response.requests)
      }
    })
  }

  // 打开请求详情弹窗
  const openRequestDetails = (request: RecordedRequest) => {
    setSelectedRequest(request)
    setIsModalOpen(true)
  }

  // 关闭弹窗
  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedRequest(null)
  }

  // 过滤请求
  const filteredRequests = recordedRequests.filter(request => {
    const matchesSearch = request.url.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesMethod = selectedMethod === "all" || request.method === selectedMethod
    return matchesSearch && matchesMethod
  })

  // 获取唯一的HTTP方法
  const uniqueMethods = Array.from(new Set(recordedRequests.map(req => req.method)))

  // 获取方法颜色类名
  const getMethodColorClass = (method: string) => {
    switch (method) {
      case 'GET': return 'text-emerald-700 bg-emerald-100 border-emerald-200'
      case 'POST': return 'text-blue-700 bg-blue-100 border-blue-200'
      case 'PUT': return 'text-amber-700 bg-amber-100 border-amber-200'
      case 'DELETE': return 'text-red-700 bg-red-100 border-red-200'
      case 'PATCH': return 'text-purple-700 bg-purple-100 border-purple-200'
      default: return 'text-gray-700 bg-gray-100 border-gray-200'
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 头部 */}
      <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Request Monitor</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">实时请求监控与分析</p>
            </div>
            <button
              onClick={refreshRequests}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              刷新
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 搜索和过滤 */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="搜索 URL..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <select
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">所有方法</option>
              {uniqueMethods.map(method => (
                <option key={method} value={method}>{method}</option>
              ))}
            </select>
          </div>
          
          <div className="text-sm text-gray-600 dark:text-gray-400">
            共 {filteredRequests.length} 个请求
          </div>
        </div>

        {/* 请求列表 */}
        {filteredRequests.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">暂无请求记录</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {searchTerm || selectedMethod !== "all" ? "没有找到匹配的请求" : "开始录制请求后，它们将在这里显示"}
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredRequests.map((request, index) => {
                let domain = request.url
                let path = ""
                
                try {
                  const url = new URL(request.url)
                  domain = url.hostname
                  path = url.pathname + url.search
                } catch (error) {
                  // 如果URL解析失败，使用原始URL
                  domain = request.url
                  path = ""
                }
                
                return (
                  <li key={index}>
                    <div
                      onClick={() => openRequestDetails(request)}
                      className="px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center min-w-0 flex-1">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getMethodColorClass(request.method)}`}>
                            {request.method}
                          </span>
                          <div className="ml-4 min-w-0 flex-1">
                            <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {domain}
                            </div>
                            {path && (
                              <div className="text-sm text-gray-500 dark:text-gray-400 font-mono truncate">
                                {path}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="ml-4 flex-shrink-0 text-sm text-gray-500 dark:text-gray-400">
                          {new Date(request.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>
        )}

        {/* 请求详情弹窗 */}
        {isModalOpen && selectedRequest && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white dark:bg-gray-800">
              <div className="mt-3">
                {/* 弹窗头部 */}
                <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">请求详情</h3>
                  <button
                    onClick={closeModal}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {/* 弹窗内容 */}
                <div className="mt-4 space-y-4 max-h-96 overflow-y-auto">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">请求方法</label>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getMethodColorClass(selectedRequest.method)}`}>
                      {selectedRequest.method}
                    </span>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL</label>
                    <div className="bg-gray-50 dark:bg-gray-700 rounded p-3">
                      <p className="text-sm text-gray-900 dark:text-white break-all font-mono">
                        {selectedRequest.url}
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">时间</label>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {new Date(selectedRequest.timestamp).toLocaleString()}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">请求头</label>
                    {selectedRequest.headers && selectedRequest.headers.length > 0 ? (
                      <div className="bg-gray-50 dark:bg-gray-700 rounded p-3 max-h-40 overflow-y-auto">
                        <pre className="text-xs text-gray-900 dark:text-white">
                          {JSON.stringify(selectedRequest.headers, null, 2)}
                        </pre>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">无请求头信息</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">请求体</label>
                    {selectedRequest.body ? (
                      <div className="bg-gray-50 dark:bg-gray-700 rounded p-3 max-h-40 overflow-y-auto">
                        <pre className="text-xs text-gray-900 dark:text-white">
                          {JSON.stringify(selectedRequest.body, null, 2)}
                        </pre>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400">无请求体信息</p>
                    )}
                  </div>
                </div>
                
                {/* 弹窗底部 */}
                <div className="mt-6 pt-3 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={closeModal}
                    className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  >
                    关闭
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default RequestsPage