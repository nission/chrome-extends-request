# Cursor Rules

本文件描述本项目的 **Cursor 规则**（目录结构、技术栈与最佳编码实践），供团队成员理解整体架构并保持代码一致性。
此项目基于 **Plasmo Framework** 构建 Chrome 扩展。

---

## 1. 项目目录结构

```
.
├── background.ts                # Chrome Extension 主后台脚本
├── popup.tsx                    # Popup 页面入口
├── contents/                    # Content-Script 相关代码
│   └── request-forwarder.ts     # 请求转发逻辑
├── tabs/                        # Chrome Tabs UI 相关 React 组件
│   └── requests.tsx             # 请求记录页
├── types/                       # 全局 TypeScript 类型定义
│   └── index.ts
├── styles/                      # 全局样式 (TailwindCSS)
│   └── globals.css
├── assets/                      # 静态资源 (图标、图片等)
│   └── icon.png
├── example-webpage.html         # 示例注入页面
├── build/                       # Vite/Crx 打包输出 (自动生成)
├── .wecode/                     # WeCoder 配置与规则
│   └── rules-code/              # 当前规则文件所在目录
├── tsconfig.json                # TypeScript 编译配置
├── tailwind.config.js           # TailwindCSS 配置
├── postcss.config.js            # PostCSS 配置
├── package.json                 # 项目依赖与脚本
└── pnpm-lock.yaml               # pnpm 锁定文件
```

目录设计要点：

- `contents/`：独立于 UI，专注与页面交互逻辑。  
- `tabs/`、`popup.tsx`：均为 React 组件，受 TailwindCSS 样式约束。  
- 所有共享类型统一放置到 `types/`，避免循环依赖。  
- 生产构建产物 (`build/`) 由脚本自动生成，无需手动编辑或提交。

---

## 2. 使用的技术栈

| 类别 | 说明 |
| ---- | ---- |
| 运行环境 | Chrome Extension Manifest V3 |
| 框架 | React 18 + TypeScript 5 |
| 平台 | Plasmo Framework |
| 打包工具 | Vite + vite-plugin-chrome-extension |
| 包管理 | pnpm |
| 样式 | TailwindCSS + PostCSS |
| 代码风格 | Prettier (配置见 `.prettierrc.mjs`) |

依赖安装示例：

```bash
pnpm install
pnpm dev       # 本地开发 (自动打包扩展)
pnpm build     # 生产打包
```

---

## 3. 最佳编码实践

1. **TypeScript**
   - 启用 `strict` 及 `noUncheckedIndexedAccess`，确保类型安全 (见 `tsconfig.json`)。
   - 所有公共 API 与消息类型在 `types/` 中集中声明。

   **示例**：
   ```ts
   // types/user.ts
   export interface User {
     id: string
     name: string
   }
   ```

2. **React**
   - 全部采用 **函数式组件** 与 **Hooks**，避免类组件。
   - 组件文件命名使用 `PascalCase`，辅助组件可使用 `camelCase` 结尾。
   - 不在组件内直接执行副作用，统一使用 `useEffect` / `useLayoutEffect`。

   **示例**：
   ```tsx
   // components/UserCard.tsx
   import { FC } from "react"

   interface UserCardProps {
     name: string
   }

   export const UserCard: FC<UserCardProps> = ({ name }) => {
     return <div className="p-4 rounded bg-gray-100">{name}</div>
   }
   ```

3. **样式 (TailwindCSS)**
   - 禁止自定义 CSS 除非 Tailwind 无法覆盖；共用样式放 `styles/globals.css`。
   - 使用 `@apply` 组合复杂样式，避免 HTML 过长。

   **示例**：
   ```css
   /* styles/globals.css */
   .btn-primary {
     @apply px-4 py-2 bg-blue-600 text-white rounded;
   }
   ```

4. **文件 & 目录**  
   - 单一文件超过 **300 行** 需拆分；保持关注点分离。  
   - 新增功能优先考虑在 `contents/`、`tabs/` 或 `popup.tsx` 中创建对应模块。  

5. **命名规范**  
   - 变量/函数：`camelCase`  
   - 类型/接口/组件：`PascalCase`  
   - 常量：`UPPER_SNAKE_CASE`  

6. **提交信息 (Conventional Commits)**  
   - 格式：`type(scope): subject`  
   - 常用 `type`：`feat`、`fix`、`docs`、`refactor`、`chore`、`test`  

7. **代码检查 & 格式化**  
   - 提交前执行 `pnpm lint`（如 ESLint 配置加入后）。  
   - 所有文件自动通过 Prettier 格式化，可在 IDE 中启用保存时格式化。  

---

**遵循以上规则有助于提升代码可维护性与团队协作效率。若需修改规则，请在 PR 中同步更新本文件。**