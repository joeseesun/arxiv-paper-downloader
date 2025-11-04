import ArticleProcessor from '../index.js';

// 创建处理器实例
const processor = new ArticleProcessor();

export default async function handler(req, res) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
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
    
    // 检查是否有多个arXiv论文链接（应该显示预览）
    // 先检查URL是否都是arXiv论文链接
    const arxivUrls = urls.filter(url => url.includes('arxiv.org/abs/'));
    
    if (arxivUrls.length >= 3) {
      // 如果有3个或更多arXiv论文URL，直接返回预览（不获取标题以避免reCAPTCHA）
      console.log(`检测到 ${arxivUrls.length} 个arXiv论文链接，返回预览界面`);
      
      const papersWithInfo = arxivUrls.map(url => {
        const match = url.match(/\/abs\/(\d{4}\.\d{4,5})/);
        const arxivId = match ? match[1] : 'unknown';
        return {
          url: url,
          pdfUrl: `https://arxiv.org/pdf/${arxivId}.pdf`,
          id: arxivId,
          title: `arXiv:${arxivId}` // 使用arXiv ID作为标题，避免reCAPTCHA
        };
      });
      
      return res.json({
        success: true,
        type: 'arxiv_list_extracted',
        extractedCount: papersWithInfo.length,
        papersWithInfo: papersWithInfo,
        results: [],
        message: `检测到 ${papersWithInfo.length} 篇arXiv论文，请选择要下载的论文`
      });
    }
    
    // 如果已经处理完成，检查结果中的arXiv论文
    const arxivPaperResults = results.filter(r => r.success && r.arxivId);
    
    if (arxivPaperResults.length >= 3) {
      // 如果有3个或更多arXiv论文，显示预览让用户选择
      const papersWithInfo = arxivPaperResults.map(paper => ({
        url: paper.url,
        pdfUrl: paper.pdfUrl || `https://arxiv.org/pdf/${paper.arxivId}.pdf`,
        id: paper.arxivId,
        title: paper.title || `论文 ${paper.arxivId}`
      }));
      
      return res.json({
        success: true,
        type: 'arxiv_list_extracted',
        extractedCount: papersWithInfo.length,
        papersWithInfo: papersWithInfo,
        results: results,
        message: `从输入中提取到 ${papersWithInfo.length} 篇arXiv论文`
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
}