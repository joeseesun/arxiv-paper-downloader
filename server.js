import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import ArticleProcessor from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3001;

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/downloads', express.static(path.join(__dirname, 'downloads')));
app.use(express.static(path.join(__dirname, 'public')));

// 创建处理器实例
const processor = new ArticleProcessor();

// 主页面 - 现在使用静态文件
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 批量处理URL的API端点（支持进度更新）
app.post('/process-batch', async (req, res) => {
  try {
    const { urls } = req.body;
    
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({
        success: false,
        error: '请提供有效的URL列表'
      });
    }
    
    console.log('收到批量处理请求:', urls.length, '个URL');
    
    // 设置SSE响应头
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    
    const results = [];
    
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      
      // 发送进度更新
      res.write(`data: ${JSON.stringify({
        type: 'progress',
        current: i + 1,
        total: urls.length,
        url: url,
        message: `正在处理第 ${i + 1}/${urls.length} 个URL...`
      })}\n\n`);
      
      try {
        const result = await processor.processUrl(url);
        results.push(result);
        
        // 发送单个结果
        res.write(`data: ${JSON.stringify({
          type: 'result',
          index: i,
          result: result,
          current: i + 1,
          total: urls.length
        })}\n\n`);
        
      } catch (error) {
        const errorResult = { success: false, error: error.message, url: url };
        results.push(errorResult);
        
        res.write(`data: ${JSON.stringify({
          type: 'result',
          index: i,
          result: errorResult,
          current: i + 1,
          total: urls.length
        })}\n\n`);
      }
      
      // 添加延迟避免过载
      if (i < urls.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // 发送最终结果
    const successResults = results.filter(r => r.success);
    res.write(`data: ${JSON.stringify({
      type: 'complete',
      success: successResults.length > 0,
      total: results.length,
      successCount: successResults.length,
      files: successResults,
      results: results
    })}\n\n`);
    
    res.end();
    
  } catch (error) {
    console.error('批量处理错误:', error);
    res.write(`data: ${JSON.stringify({
      type: 'error',
      error: error.message
    })}\n\n`);
    res.end();
  }
});

// 处理URL的API端点
app.post('/process', async (req, res) => {
  try {
    const { urls } = req.body;
    
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({
        success: false,
        error: '请提供有效的URL列表'
      });
    }
    
    console.log(`收到处理请求: ${urls.length} 个URL`);
    
    // 对于大量URL，添加处理提示
    if (urls.length > 10) {
      console.log(`处理大量URL (${urls.length}个)，预计需要 ${Math.ceil(urls.length * 2)} 秒...`);
    }
    
    // 处理URL
    const results = await processor.processMultiple(urls);
    
    console.log(`处理完成: ${results.length} 个结果`);
    
    // 检查是否有arXiv列表提取结果
    const arxivListResults = results.filter(r => r.success && r.type === 'arxiv_list');
    
    if (arxivListResults.length > 0) {
      // 如果有arXiv列表，返回提取的论文链接供用户选择
      return res.json({
        success: true,
        type: 'arxiv_list_extracted',
        total: results.length,
        results: results,
        message: '检测到arXiv列表页面，已提取论文链接'
      });
    }
    
    // 统计结果
    const successResults = results.filter(r => r.success);
    const successCount = successResults.length;
    
    res.json({
      success: successCount > 0,
      total: results.length,
      successCount: successCount,
      files: successResults,
      results: results
    });
    
  } catch (error) {
    console.error('处理错误:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// PDF代理下载端点
app.get('/download-pdf', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: '缺少PDF URL参数' });
    }
    
    console.log('代理下载PDF:', url);
    
    // 从URL中提取文件名
    const urlParts = url.split('/');
    const filename = urlParts[urlParts.length - 1];
    const paperIdMatch = filename.match(/(\d{4}\.\d{4,5})/);
    const downloadFilename = paperIdMatch ? `arxiv_${paperIdMatch[1]}.pdf` : filename;
    
    // 获取PDF文件
    const response = await axios({
      method: 'GET',
      url: url,
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      timeout: 60000
    });
    
    // 设置响应头强制下载
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
    res.setHeader('Cache-Control', 'no-cache');
    
    // 管道传输PDF数据
    response.data.pipe(res);
    
  } catch (error) {
    console.error('PDF下载错误:', error.message);
    res.status(500).json({ 
      error: '下载失败: ' + error.message 
    });
  }
});

// 批量下载API（支持进度反馈）
app.post('/batch-download', async (req, res) => {
  try {
    const { urls } = req.body;
    
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({
        success: false,
        error: '请提供有效的URL列表'
      });
    }
    
    console.log('收到批量下载请求:', urls.length, '个URL');
    
    // 设置SSE响应头
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });
    
    const results = [];
    
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      
      // 发送进度更新
      res.write(`data: ${JSON.stringify({
        type: 'progress',
        current: i + 1,
        total: urls.length,
        url: url,
        message: `正在下载第 ${i + 1}/${urls.length} 篇论文...`
      })}\n\n`);
      
      try {
        const result = await processor.processUrl(url);
        results.push(result);
        
        // 发送单个结果
        res.write(`data: ${JSON.stringify({
          type: 'result',
          index: i,
          result: result,
          current: i + 1,
          total: urls.length
        })}\n\n`);
        
      } catch (error) {
        const errorResult = { success: false, error: error.message, url: url };
        results.push(errorResult);
        
        res.write(`data: ${JSON.stringify({
          type: 'result',
          index: i,
          result: errorResult,
          current: i + 1,
          total: urls.length
        })}\n\n`);
      }
      
      // 添加延迟
      if (i < urls.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // 发送完成信号
    const successCount = results.filter(r => r.success).length;
    res.write(`data: ${JSON.stringify({
      type: 'complete',
      total: results.length,
      successCount: successCount,
      results: results
    })}\n\n`);
    
    res.end();
    
  } catch (error) {
    console.error('批量下载错误:', error);
    res.write(`data: ${JSON.stringify({
      type: 'error',
      error: error.message
    })}\n\n`);
    res.end();
  }
});

// 启动服务器
app.listen(port, () => {
  console.log(`
🚀 文章转PDF工具已启动！

📱 Web界面: http://localhost:${port}
💻 命令行用法: node index.js <URL>

功能特点:
✅ 支持arXiv论文下载
✅ 支持普通网页转PDF  
✅ 批量处理多个URL
✅ 简洁的Web界面
✅ 自动文件命名

按 Ctrl+C 停止服务
  `);
});