# miao-www

miao 项目管理后台，基于 Astro + shadcn/ui。

## 启动开发服务器

```bash
npm install
npm run dev
```

访问 http://localhost:4321

## 构建生产版本

```bash
npm run build
```

## 配置

复制 `.env.example` 为 `.env`，填入以下变量：

| 变量 | 说明 |
|------|------|
| `API_BASE_URL` | API 基础地址 |
| `API_TOKEN` | API 认证令牌 |

## 项目结构

```
src/
├── components/ui/    # shadcn/ui 组件
├── layouts/          # 布局组件
├── lib/               # 工具函数和 API 封装
├── pages/             # 页面路由
│   └── admin/         # 管理后台页面
└── styles/            # 全局样式
```
