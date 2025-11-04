# 学术资源工具

一个强大的学术资源处理工具，支持arXiv论文PDF下载和网页内容转Markdown。采用serverless架构，部署在Vercel上，提供稳定的在线服务。

## 🌟 功能特点

- 📚 **arXiv论文PDF下载**：直接下载PDF文件，自动获取论文标题和元数据
- 📝 **网页转Markdown**：将网页内容转换为Markdown格式，保留完整结构
- 📱 **微信公众号支持**：专门优化微信公众号文章的内容提取
- ⚡ **批量处理**：支持同时处理多个URL，智能识别URL类型
- 🔍 **arXiv搜索**：内置关键词搜索功能，快速找到相关论文
- 🌐 **URL自动提取**：从混合文本中自动提取URL链接
- 🎨 **现代化界面**：简洁美观的Web界面，支持预览和下载
- ☁️ **Serverless部署**：基于Vercel的serverless架构，无需本地部署

## 🚀 在线使用

### 访问地址

**🌐 在线版本：[https://paper.qiaomu.ai](https://paper.qiaomu.ai)**

无需安装，直接在浏览器中使用！

### 使用方法

1. **输入URL**：在文本框中输入arXiv论文链接或网页URL
2. **批量处理**：每行一个URL，或直接粘贴包含URL的文本
3. **一键处理**：点击"开始处理"按钮
4. **下载结果**：
   - arXiv论文：直接下载PDF文件
   - 网页内容：下载Markdown文件或在线预览

## 💻 本地开发

### 1. 克隆项目

```bash
git clone https://github.com/your-username/article-to-pdf.git
cd article-to-pdf
```

### 2. 安装依赖

```bash
npm install
```

### 3. 本地运行

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

### 4. 部署到Vercel

```bash
# 安装Vercel CLI
npm i -g vercel

# 部署
vercel --prod
```

## 📋 支持的内容类型

### 📚 arXiv论文
- **论文页面**：`https://arxiv.org/abs/2301.00001`
- **PDF直链**：`https://arxiv.org/pdf/2301.00001.pdf`
- **列表页面**：`https://arxiv.org/list/cs.AI/recent`
- **搜索结果**：`https://arxiv.org/search/?query=transformer`
- **旧格式**：`https://arxiv.org/abs/cs/0701001`

### 🌐 网页文章
- **技术博客**：Paul Graham、Hacker News等
- **微信公众号**：`https://mp.weixin.qq.com/s/xxx`
- **GitHub页面**：项目README、文档等
- **新闻文章**：大部分新闻网站
- **学术网站**：大学、研究机构的文章页面

### 🔍 智能识别
- **自动URL提取**：从包含多个链接的文本中自动提取
- **批量处理**：支持混合类型的URL同时处理
- **格式适配**：根据内容类型选择最佳处理方式

## 🏗️ 项目结构

```
article-to-pdf/
├── api/                           # Vercel Serverless API
│   ├── process.js                 # 主处理接口
│   ├── download-pdf.js            # PDF代理下载
│   ├── download-content.js        # 内容文件下载
│   └── batch-download.js          # 批量处理接口
├── public/                        # 静态文件
│   ├── index.html                 # 主页面
│   ├── js/app.js                  # 前端JavaScript
│   └── images/                    # 图片资源
├── arxiv-downloader.js            # arXiv论文下载器
├── webpage-content-extractor.js   # 网页内容提取器
├── webpage-to-pdf.js              # 网页转换器（兼容性）
├── index.js                       # 核心处理逻辑
├── vercel.json                    # Vercel部署配置
├── package.json                   # 项目配置
└── README.md                      # 说明文档
```

## ⚙️ 技术架构

### 前端技术
- **原生JavaScript**：无框架依赖，轻量高效
- **现代CSS**：响应式设计，支持深色模式
- **Server-Sent Events**：实时进度反馈

### 后端技术
- **Node.js + ES Modules**：现代JavaScript语法
- **Vercel Serverless**：无服务器架构，自动扩缩容
- **Axios**：HTTP请求处理，支持多种编码
- **Cheerio**：HTML解析和内容提取
- **Turndown**：HTML到Markdown转换

### 核心功能
- **智能内容提取**：基于CSS选择器的内容识别
- **编码处理**：支持UTF-8、GBK等多种编码
- **错误恢复**：多重fallback机制确保稳定性
- **缓存优化**：合理的HTTP缓存策略

## 📖 使用示例

### 1. arXiv论文下载

**输入**：`https://arxiv.org/abs/1706.03762`

**输出**：
- 📄 `Attention_Is_All_You_Need_1706.03762.pdf`
- 📊 自动获取论文标题和作者信息
- 🔗 支持直接PDF链接下载

### 2. 网页转Markdown

**输入**：`https://paulgraham.com/do.html`

**输出**：
```markdown
# What to Do

---
作者: Paul Graham
原文链接: https://paulgraham.com/do.html
---

> What should one do? That may seem a strange question...

March 2025

What should one do? One should help people, and take care of the world...
```

### 3. 微信公众号文章

**输入**：`https://mp.weixin.qq.com/s/OyO_KaxWpBI4ECSsRT1ljA`

**输出**：
- 📝 完整的Markdown格式文章
- 🖼️ 保留图片链接和格式
- 👤 自动提取作者和发布信息

### 4. 批量处理

**输入文本**：
```
今天看到几篇不错的文章：
1. https://arxiv.org/abs/1706.03762
2. https://paulgraham.com/do.html
3. https://mp.weixin.qq.com/s/xxx
```

**结果**：自动提取3个URL并分别处理

## ⚠️ 使用说明

### 功能限制
- **arXiv论文**：支持所有公开论文的PDF下载
- **网页内容**：转换为Markdown格式，不支持PDF（serverless环境限制）
- **处理时间**：单个URL通常在5-15秒内完成
- **并发限制**：建议单次处理不超过10个URL

### 最佳实践
1. **URL格式**：确保URL完整且可访问
2. **批量处理**：大量URL建议分批处理
3. **网络环境**：某些网站可能需要特定网络环境
4. **内容质量**：复杂页面的Markdown转换效果更好

## 🔧 故障排除

### 常见问题

**❌ arXiv论文下载失败**
- 检查论文ID格式是否正确
- 确认论文是否已公开发布
- 网络连接问题导致的超时

**❌ 网页内容提取失败**
- 网站有反爬虫机制
- 页面需要JavaScript渲染
- 内容区域识别失败

**❌ 微信公众号文章乱码**
- 编码问题已修复，如仍有问题请反馈
- 某些特殊格式可能不完全支持

### 解决方案
- 🔄 重试失败的URL
- 📧 通过GitHub Issues反馈问题
- 🌐 尝试使用不同的网络环境

## 🚀 开发计划

### 已完成 ✅
- [x] arXiv论文PDF下载
- [x] 网页转Markdown功能
- [x] 微信公众号支持
- [x] 批量处理和进度显示
- [x] Serverless部署
- [x] UTF-8编码支持

### 计划中 📋
- [ ] 支持更多网站的内容提取优化
- [ ] 添加PDF合并功能（本地版本）
- [ ] 支持自定义Markdown样式
- [ ] 添加内容搜索和过滤功能
- [ ] API接口文档和SDK

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request！