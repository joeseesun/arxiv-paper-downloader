import axios from 'axios';

export default async function handler(req, res) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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
}