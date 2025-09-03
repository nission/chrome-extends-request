This is a [Plasmo extension](https://docs.plasmo.com/) project bootstrapped with [`plasmo init`](https://www.npmjs.com/package/plasmo).

## Getting Started

First, run the development server:

```bash
pnpm dev
# or
npm run dev
```

Open your browser and load the appropriate development build. For example, if you are developing for the chrome browser, using manifest v3, use: `build/chrome-mv3-dev`.

You can start editing the popup by modifying `popup.tsx`. It should auto-update as you make changes. To add an options page, simply add a `options.tsx` file to the root of the project, with a react component default exported. Likewise to add a content page, add a `content.ts` file to the root of the project, importing some module and do some logic, then reload the extension on your browser.

For further guidance, [visit our Documentation](https://docs.plasmo.com/)

## Making production build

Run the following:

```bash
pnpm build
# or
npm run build
```

This should create a production bundle for your extension, ready to be zipped and published to the stores.

## Submit to the webstores

The easiest way to deploy your Plasmo extension is to use the built-in [bpp](https://bpp.browser.market) GitHub action. Prior to using this action however, make sure to build your extension and upload the first version to the store to establish the basic credentials. Then, simply follow [this setup instruction](https://docs.plasmo.com/framework/workflows/submit) and you should be on your way for automated submission!

## 转发录制的请求到网页

本扩展支持将录制的请求转发到网页，以便在网页中进一步处理。要使用此功能：

1. 在扩展弹出窗口中录制一些请求
2. 点击"转发请求"按钮将录制的请求发送到当前活动的网页
3. 网页中的 content script 会接收到这些请求，并通过 `window.postMessage` 将它们转发给网页

网页可以通过监听 `message` 事件来接收这些请求：

```javascript
window.addEventListener("message", function(event) {
  if (event.data.type === "RECORDED_REQUESTS") {
    console.log("接收到录制的请求:", event.data.requests);
    // 在这里处理接收到的请求
  }
});
```

有关完整的示例，请参见 `example-webpage.html` 文件。
