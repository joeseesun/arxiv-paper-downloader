import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ArxivDownloader {
  constructor() {
    this.downloadDir = path.join(__dirname, 'downloads');
    this.ensureDownloadDir();
  }

  ensureDownloadDir() {
    if (!fs.existsSync(this.downloadDir)) {
      fs.mkdirSync(this.downloadDir, { recursive: true });
    }
  }

  // 从arXiv URL提取论文ID
  extractArxivId(url) {
    // 支持多种arXiv URL格式
    const patterns = [
      /arxiv\.org\/abs\/([0-9]{4}\.[0-9]{4,5})/,
      /arxiv\.org\/abs\/([a-z-]+\/[0-9]{7})/,
      /arxiv\.org\/pdf\/([0-9]{4}\.[0-9]{4,5})/,
      /arxiv\.org\/pdf\/([a-z-]+\/[0-9]{7})/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    
    throw new Error('无法从URL中提取arXiv ID');
  }

  // 获取论文标题（用于文件命名）
  async getPaperTitle(arxivId) {
    try {
      const apiUrl = `http://export.arxiv.org/api/query?id_list=${arxivId}`;
      const response = await axios.get(apiUrl);
      
      // 简单的XML解析获取标题
      const titleMatch = response.data.match(/<title>(.*?)<\/title>/s);
      if (titleMatch && titleMatch[1]) {
        let title = titleMatch[1].replace(/\n/g, ' ').trim();
        // 移除非法文件名字符
        title = title.replace(/[<>:"/\\|?*]/g, '');
        return title.substring(0, 100); // 限制长度
      }
    } catch (error) {
      console.warn('获取论文标题失败，使用arXiv ID作为文件名');
    }
    
    return arxivId;
  }

  // 下载PDF文件
  async downloadPdf(url) {
    try {
      console.log('正在处理URL:', url);
      
      // 提取arXiv ID
      const arxivId = this.extractArxivId(url);
      console.log('提取到arXiv ID:', arxivId);
      
      // 构建PDF下载URL
      const pdfUrl = `https://arxiv.org/pdf/${arxivId}.pdf`;
      console.log('PDF下载链接:', pdfUrl);
      
      // 获取论文标题
      const title = await this.getPaperTitle(arxivId);
      console.log('论文标题:', title);
      
      // 生成文件名
      const filename = `${title}_${arxivId}.pdf`;
      const filepath = path.join(this.downloadDir, filename);
      
      console.log('开始下载PDF...');
      
      // 下载PDF文件
      const response = await axios({
        method: 'GET',
        url: pdfUrl,
        responseType: 'stream',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      });
      
      // 保存文件
      const writer = fs.createWriteStream(filepath);
      response.data.pipe(writer);
      
      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          console.log('下载完成:', filepath);
          resolve({
            success: true,
            filepath: filepath,
            filename: filename,
            arxivId: arxivId,
            title: title
          });
        });
        
        writer.on('error', (error) => {
          console.error('文件写入错误:', error);
          reject(error);
        });
      });
      
    } catch (error) {
      console.error('下载失败:', error.message);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 批量下载
  async downloadMultiple(urls) {
    const results = [];
    
    for (const url of urls) {
      console.log(`\n处理第 ${results.length + 1}/${urls.length} 个URL...`);
      const result = await this.downloadPdf(url);
      results.push(result);
      
      // 添加延迟避免请求过于频繁
      if (results.length < urls.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }
}

// 命令行使用 - 只在直接运行此文件时执行
if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.length > 2) {
    const downloader = new ArxivDownloader();
    const urls = process.argv.slice(2);
    
    console.log('arXiv论文下载器');
    console.log('=================');
    
    downloader.downloadMultiple(urls).then(results => {
      console.log('\n下载结果汇总:');
      console.log('=================');
      
      results.forEach((result, index) => {
        if (result.success) {
          console.log(`✅ ${index + 1}. ${result.title}`);
          console.log(`   文件: ${result.filename}`);
        } else {
          console.log(`❌ ${index + 1}. 下载失败: ${result.error}`);
        }
      });
      
      const successCount = results.filter(r => r.success).length;
      console.log(`\n总计: ${successCount}/${results.length} 个文件下载成功`);
    });
  }
}

export default ArxivDownloader;