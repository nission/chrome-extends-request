// contents/global-error-handler.ts
// 全局错误处理器，用于捕获和静默处理扩展上下文失效错误

// 全局错误处理状态
let errorHandlerSetup = false;

// 设置全局错误处理器
function setupGlobalErrorHandler(): void {
  if (errorHandlerSetup) {
    return;
  }

  try {
    // 捕获未处理的错误
    window.addEventListener('error', (event) => {
      const error = event.error;
      if (error && error.message && error.message.includes('Extension context invalidated')) {
        // 阻止错误冒泡到控制台
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    }, true);

    // 捕获未处理的 Promise 拒绝
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      if (reason && reason.message && reason.message.includes('Extension context invalidated')) {
        // 阻止错误输出到控制台
        event.preventDefault();
        return false;
      }
    }, true);

    // 重写 console.error 来过滤扩展上下文错误
    const originalConsoleError = console.error;
    console.error = function(...args: any[]) {
      const message = args.join(' ');
      if (message.includes('Extension context invalidated') || 
          message.includes('context invalidated') ||
          message.includes('Extension context has been invalidated')) {
        // 静默处理，不输出到控制台
        return;
      }
      originalConsoleError.apply(console, args);
    };

    // 重写 console.warn 来过滤扩展上下文警告
    const originalConsoleWarn = console.warn;
    console.warn = function(...args: any[]) {
      const message = args.join(' ');
      if (message.includes('Extension context invalidated') || 
          message.includes('context invalidated') ||
          message.includes('Extension context has been invalidated')) {
        // 静默处理，不输出到控制台
        return;
      }
      originalConsoleWarn.apply(console, args);
    };

    errorHandlerSetup = true;
  } catch (error) {
    // 静默处理设置错误
  }
}

// 立即设置错误处理器
setupGlobalErrorHandler();

export {};