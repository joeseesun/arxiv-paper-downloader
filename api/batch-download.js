import ArticleProcessor from '../index.js';

// 创建处理器实例
const processor = new ArticleProcessor();

export default async function handler(req, res) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
}