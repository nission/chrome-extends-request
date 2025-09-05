// utils/extension-utils.ts
// 扩展相关的工具函数

// 检查扩展上下文是否有效（增强版本）
export function isExtensionContextValid(): boolean {
  try {
    // 多重检查确保上下文有效
    if (!chrome || !chrome.runtime) {
      return false;
    }
    
    // 尝试访问 runtime.id
    const id = chrome.runtime.id;
    if (!id) {
      return false;
    }
    
    // 检查其他关键 API 是否可用
    if (!chrome.action || !chrome.tabs || !chrome.webRequest) {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

// 更新扩展图标的函数（带上下文检查）
export async function updateExtensionIcon(recording: boolean): Promise<void> {
  // 检查扩展上下文是否有效
  if (!isExtensionContextValid()) {
    return;
  }

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
    
    // 再次检查上下文，然后更新扩展图标
    if (isExtensionContextValid()) {
      await chrome.action.setIcon({ imageData });
    }
  } catch (error) {
    // 静默处理错误，避免在控制台输出
  }
}