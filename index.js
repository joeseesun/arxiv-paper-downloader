import ArxivDownloader from './arxiv-downloader.js';
import WebpageProcessor from './webpage-to-pdf.js';

class ArticleProcessor {
  constructor() {
    this.arxivDownloader = new ArxivDownloader();
    this.webpageProcessor = new WebpageProcessor();
  }

  // 检测URL类型
  detectUrlType(url) {
    // 检查是否为arXiv列表页面
    if (url.includes('arxiv.org/list/') || 
        url.includes('arxiv.org/search/') ||
        (url.includes('arxiv.org') && (url.includes('/recent') || url.includes('/new')))) {
      return 'webpage'; // arXiv列表页面作为网页处理
    }
    
    // 检查是否为arXiv论文页面
    if (url.includes('arxiv.org') && (url.includes('/abs/') || url.includes('/pdf/'))) {
      return 'arxiv';
    }
    
    return 'webpage';
  }

  // 处理单个URL
  async processUrl(url) {
    const urlType = this.detectUrlType(url);
    
    console.log(`检测到URL类型: ${urlType}`);
    
    if (urlType === 'arxiv') {
      return await this.arxivDownloader.downloadPdf(url);
    } else {
      return await this.webpageProcessor.processUrl(url);
    }
  }

  // 批量处理URL
  async processMultiple(urls) {
    const results = [];
    
    for (const url of urls) {
      console.log(`\n处理第 ${results.length + 1}/${urls.length} 个URL...`);
      console.log(`URL: ${url}`);
      
      try {
        const result = await this.processUrl(url);
        results.push(result);
        
        if (result.success) {
          console.log(`✅ 成功: ${result.title || result.filename || 'URL处理完成'}`);
        } else {
          console.log(`⚠️ 失败: ${result.error || '未知错误'}`);
        }
      } catch (error) {
        console.error(`❌ 处理URL时发生错误: ${error.message}`);
        
        // 即使单个URL失败，也要继续处理其他URL
        results.push({
          success: false,
          url: url,
          error: error.message || '处理失败',
          type: 'error'
        });
      }
      
      // 添加延迟，避免请求过于频繁
      if (results.length < urls.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    console.log(`\n📊 批量处理完成: ${successCount}/${urls.length} 成功`);
    
    return results;
  }

  // 显示使用帮助
  static showHelp() {
    console.log(`
文章转PDF工具
=============

用法:
  node index.js <URL1> [URL2] [URL3] ...

支持的URL类型:
  1. arXiv论文页面 (https://arxiv.org/abs/xxxx.xxxxx)
  2. 普通网页 (任何HTTP/HTTPS网址)

示例:
  # 下载单个arXiv论文
  node index.js https://arxiv.org/abs/2301.00001
  
  # 转换普通网页为PDF
  node index.js https://example.com/article
  
  # 批量处理多个URL
  node index.js https://arxiv.org/abs/2301.00001 https://example.com/article

功能特点:
  - 自动识别URL类型
  - arXiv论文直接下载PDF文件
  - 普通网页转换为PDF格式
  - 支持批量处理
  - 自动生成有意义的文件名
  - 所有文件保存在 downloads/ 目录

注意事项:
  - 确保网络连接正常
  - 某些网站可能有反爬虫机制
  - PDF转换需要一定时间，请耐心等待
    `);
  }
}

// 命令行使用 - 只在直接运行此文件时执行
if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.length < 3) {
    ArticleProcessor.showHelp();
    process.exit(1);
  }

  const processor = new ArticleProcessor();
  const urls = process.argv.slice(2);

  console.log('文章转PDF处理器');
  console.log('==================');
  console.log(`准备处理 ${urls.length} 个URL`);

  processor.processMultiple(urls).then(results => {
    console.log('\n处理结果汇总:');
    console.log('==================');
    
    results.forEach((result, index) => {
      if (result.success) {
        if (result.type === 'webpage_analysis') {
          console.log(`📄 ${index + 1}. ${result.title}`);
          console.log(`   ${result.message}`);
          if (result.alternatives) {
            result.alternatives.forEach(alt => {
              console.log(`   - ${alt}`);
            });
          }
        } else {
          console.log(`✅ ${index + 1}. ${result.title || result.filename}`);
          console.log(`   文件: ${result.filename}`);
          if (result.arxivId) {
            console.log(`   arXiv ID: ${result.arxivId}`);
          }
        }
      } else {
        console.log(`❌ ${index + 1}. 处理失败: ${result.error}`);
        console.log(`   URL: ${result.url || urls[index]}`);
      }
    });
    
    const successCount = results.filter(r => r.success).length;
    console.log(`\n总计: ${successCount}/${results.length} 个文件处理成功`);
    
    if (successCount > 0) {
      console.log(`\n所有文件已保存到: downloads/ 目录`);
    }
  }).catch(error => {
    console.error('处理过程中发生错误:', error);
    process.exit(1);
  });
}

export default ArticleProcessor;