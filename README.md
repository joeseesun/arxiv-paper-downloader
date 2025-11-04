# 文章转PDF工具

一个极简的工具，用于将arXiv论文和普通网页转换为PDF文件。无需依赖第三方服务，完全本地化处理。

## 功能特点

- 🔗 **自动识别URL类型**：智能区分arXiv论文和普通网页
- 📚 **arXiv论文下载**：直接下载PDF文件，自动获取论文标题
- 🌐 **网页转PDF**：将任何网页转换为PDF格式
- ⚡ **批量处理**：支持同时处理多个URL
- 🎨 **简洁Web界面**：提供友好的浏览器界面
- 💻 **命令行支持**：支持命令行批量操作
- 📁 **智能命名**：自动生成有意义的文件名

## 安装使用

### 1. 安装依赖

```bash
npm install
```

### 2. 使用方式

#### Web界面（推荐）

```bash
npm start
```

然后在浏览器中访问 `http://localhost:3000`

#### 命令行使用

```bash
# 下载单个arXiv论文
node index.js https://arxiv.org/abs/2301.00001

# 转换普通网页为PDF
node index.js https://example.com/article

# 批量处理多个URL
node index.js https://arxiv.org/abs/2301.00001 https://example.com/article
```

## 支持的URL格式

### arXiv论文
- `https://arxiv.org/abs/2301.00001`
- `https://arxiv.org/abs/cs/0701001`
- `https://arxiv.org/pdf/2301.00001.pdf`

### 普通网页
- 任何HTTP/HTTPS网址
- 自动处理JavaScript渲染的页面
- 支持大部分网站（除了有严格反爬虫机制的）

## 项目结构

```
article-to-pdf/
├── package.json          # 项目配置
├── index.js              # 主程序入口
├── arxiv-downloader.js   # arXiv论文下载器
├── webpage-to-pdf.js     # 网页转PDF转换器
├── server.js             # Web服务器
├── downloads/            # 下载文件存储目录
└── README.md            # 说明文档
```

## 技术实现

- **Node.js + ES Modules**：现代JavaScript语法
- **Puppeteer**：网页转PDF，支持JavaScript渲染
- **Axios**：HTTP请求处理
- **Express**：Web服务器
- **arXiv API**：获取论文元数据

## 使用示例

### 1. 下载arXiv论文

输入：`https://arxiv.org/abs/2301.00001`

输出：`Attention Is All You Need_2301.00001.pdf`

### 2. 转换网页为PDF

输入：`https://github.com/microsoft/vscode`

输出：`GitHub - microsoftvscode Visual Studio Code_2024-01-15T10-30-45.pdf`

### 3. 批量处理

```bash
node index.js \
  https://arxiv.org/abs/2301.00001 \
  https://arxiv.org/abs/2301.00002 \
  https://example.com/article
```

## 注意事项

1. **网络连接**：确保网络连接正常
2. **反爬虫机制**：某些网站可能有反爬虫保护
3. **处理时间**：PDF转换需要时间，请耐心等待
4. **文件大小**：复杂网页生成的PDF可能较大
5. **系统资源**：Puppeteer会占用一定的系统资源

## 故障排除

### 常见问题

1. **下载失败**
   - 检查URL是否正确
   - 确认网络连接
   - 某些arXiv论文可能暂时不可用

2. **PDF转换失败**
   - 网站可能有反爬虫机制
   - 页面加载时间过长
   - JavaScript错误

3. **内存不足**
   - 减少并发处理数量
   - 关闭其他应用程序

### 解决方案

- 重试失败的URL
- 检查错误日志
- 更新依赖包版本

## 开发计划

- [ ] 支持更多文档格式输出
- [ ] 添加PDF合并功能
- [ ] 支持自定义PDF样式
- [ ] 添加进度显示
- [ ] 支持代理设置

## 许可证

MIT License

## 贡献

欢迎提交Issue和Pull Request！