# 部署指南

## 🚀 Vercel部署策略

### 核心思路
- **本地版本**：完整功能（Playwright + PDF转换）
- **Vercel版本**：智能降级（第三方API + 用户指导）

### 部署步骤

#### 1. 基础部署
```bash
# 安装Vercel CLI
npm i -g vercel

# 部署到Vercel
vercel --prod
```

#### 2. 环境变量配置（可选）
在Vercel Dashboard中设置：

```env
# 可选：Browserless.io API (付费服务，高质量PDF)
BROWSERLESS_TOKEN=your_token_here

# 可选：PDFShift API (付费服务)
PDFSHIFT_API_KEY=your_api_key_here
```

#### 3. 自动部署
连接GitHub仓库，每次push自动部署。

### 功能对比

| 功能 | 本地版本 | Vercel版本 |
|------|----------|------------|
| arXiv论文下载 | ✅ 完整支持 | ✅ 完整支持 |
| 直接PDF下载 | ✅ 完整支持 | ✅ 完整支持 |
| 网页转PDF | ✅ Playwright | 🔄 多策略降级 |
| 批量处理 | ✅ 完整支持 | ✅ 完整支持 |
| 文件存储 | 📁 本地文件 | ☁️ 临时存储 |

### Vercel版本的网页转PDF策略

#### 策略1：Browserless.io API（推荐）
- **优点**：高质量PDF，支持JavaScript
- **缺点**：需要付费API key
- **成本**：$6/月起

#### 策略2：HTMLCSStoImage API
- **优点**：免费使用
- **缺点**：生成图片而非PDF，有限制

#### 策略3：用户指导（兜底）
- **优点**：始终可用，用户体验友好
- **缺点**：需要用户手动操作

### 用户体验设计

#### Vercel版本的用户界面会显示：
```
🔍 网页分析结果
GitHub - microsoft/vscode: Visual Studio Code

云端版本无法直接转换，请使用以下方案：

建议的解决方案：
1. 🖨️ 浏览器打印功能：Ctrl+P → 另存为PDF
2. 🔗 在线转换服务：save-as-pdf.com 或 web2pdfconvert.com  
3. 📱 浏览器扩展：Save as PDF 或 Print Friendly
4. 💻 本地工具：下载桌面版获得完整功能

发现的PDF文件：
- 📄 Release Notes PDF
- 📄 Documentation PDF
```

### 成本分析

#### 免费方案
- **Vercel托管**：免费
- **基础功能**：arXiv + 直接PDF + 用户指导
- **适用场景**：个人使用、演示

#### 付费方案  
- **Vercel Pro**：$20/月（可选）
- **Browserless.io**：$6/月（推荐）
- **完整功能**：包含高质量网页转PDF

### 技术架构

```
用户请求
    ↓
环境检测 (environment.js)
    ↓
┌─────────────────┬─────────────────┐
│   本地环境      │   Vercel环境    │
│                 │                 │
│ Playwright      │ 多策略转换器    │
│ ↓               │ ↓               │
│ 直接PDF生成     │ API调用/指导    │
└─────────────────┴─────────────────┘
    ↓
统一结果格式
    ↓
用户界面展示
```

### 部署检查清单

- [ ] `vercel.json` 配置正确
- [ ] 环境变量设置（如需要）
- [ ] 域名配置（如需要）
- [ ] 功能测试
  - [ ] arXiv论文下载
  - [ ] 直接PDF下载  
  - [ ] 网页分析和指导
  - [ ] 批量处理

### 监控和维护

#### 日志监控
- Vercel Dashboard查看函数日志
- 监控API调用次数和错误率

#### 用户反馈
- 收集用户对替代方案的反馈
- 优化指导文案和链接

#### 成本控制
- 监控第三方API使用量
- 设置使用限制和告警

## 🎯 推荐部署策略

### 阶段1：免费部署
1. 部署到Vercel（免费）
2. 提供arXiv + 直接PDF + 用户指导
3. 收集用户反馈

### 阶段2：付费升级（可选）
1. 添加Browserless.io API
2. 提供完整PDF转换功能
3. 监控使用情况和成本

### 阶段3：优化体验
1. 根据用户反馈优化界面
2. 添加更多第三方API选项
3. 考虑自建PDF服务

这种策略既保证了功能的可用性，又控制了部署成本，同时为用户提供了清晰的升级路径。