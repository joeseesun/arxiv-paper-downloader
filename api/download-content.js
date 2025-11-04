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
    const { content, filename, type } = req.query;
    
    if (!content || !filename) {
      return res.status(400).json({ error: '缺少必要参数：content 和 filename' });
    }
    
    console.log('下载内容:', { filename, type, contentLength: content.length });
    
    // 解码内容（前端现在使用encodeURIComponent编码）
    let decodedContent;
    try {
      // 直接URL解码
      decodedContent = decodeURIComponent(content);
    } catch (error) {
      console.log('URL解码失败:', error.message);
      // 如果URL解码失败，可能是旧的base64编码
      try {
        const binaryString = Buffer.from(content, 'base64').toString('binary');
        decodedContent = decodeURIComponent(escape(binaryString));
      } catch (error2) {
        console.log('Base64解码也失败，使用原始内容:', error2.message);
        decodedContent = content;
      }
    }
    
    // 根据文件类型设置Content-Type
    let contentType = 'text/plain';
    if (filename.endsWith('.md')) {
      contentType = 'text/markdown';
    } else if (filename.endsWith('.txt')) {
      contentType = 'text/plain';
    } else if (filename.endsWith('.html')) {
      contentType = 'text/html';
    }
    
    // 设置响应头强制下载
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Cache-Control', 'no-cache');
    
    // 发送内容
    res.send(decodedContent);
    
  } catch (error) {
    console.error('内容下载错误:', error.message);
    res.status(500).json({ 
      error: '下载失败: ' + error.message 
    });
  }
}