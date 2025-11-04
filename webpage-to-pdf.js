import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { isVercel, checkPlaywrightAvailable } from './environment.js';
import VercelPdfConverter from './pdf-converter-vercel.js';
import WebpageContentExtractor from './webpage-content-extractor.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class WebpageProcessor {
  constructor() {
    // 检测是否在serverless环境中
    this.isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY;
    
    if (!this.isServerless) {
      this.downloadDir = path.join(__dirname, 'downloads');
      this.ensureDownloadDir();
    }
    
    this.vercelConverter = new VercelPdfConverter();
    this.contentExtractor = new WebpageContentExtractor();
    this.playwrightAvailable = null; // 延迟检测
  }

  ensureDownloadDir() {
    if (!this.isServerless && !fs.existsSync(this.downloadDir)) {
      fs.mkdirSync(this.downloadDir, { recursive: true });
    }
  }

  // 检测是否为直接PDF链接
  isPdfUrl(url) {
    return url.toLowerCase().includes('.pdf') || 
           url.includes('pdf') && (url.includes('arxiv.org') || url.includes('openai.com'));
  }

  // 检测是否为arXiv列表页面
  isArxivListPage(url) {
    return url.includes('arxiv.org/list/') || 
           url.includes('arxiv.org/search') ||
           (url.includes('arxiv.org') && (url.includes('/recent') || url.includes('/new')));
  }

  // 提取arXiv列表页面中的论文链接
  async extractArxivPapers(url) {
    try {
      console.log('正在提取arXiv列表页面中的论文链接...');
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 30000
      });

      const $ = cheerio.load(response.data);
      const paperLinks = [];

      // 检测页面类型并使用相应的解析逻辑
      const isSearchPage = url.includes('/search');
      
      if (isSearchPage) {
        // 搜索页面：使用 li.arxiv-result 结构
        $('li.arxiv-result').each((i, element) => {
          const $element = $(element);
          
          // 查找论文ID链接
          const absLink = $element.find('p.list-title a[href*="/abs/"]').first();
          if (absLink.length > 0) {
            const href = absLink.attr('href');
            const match = href.match(/\/abs\/(\d{4}\.\d{4,5})/);
            
            if (match) {
              const paperId = match[1];
              const paperUrl = `https://arxiv.org/abs/${paperId}`;
              
              // 从标题元素中提取标题
              let title = '';
              const titleElement = $element.find('p.title');
              if (titleElement.length > 0) {
                // 获取纯文本并清理HTML标签
                title = titleElement.text().trim();
                // 移除可能的搜索高亮标记
                title = title.replace(/\s+/g, ' ');
              }
              
              // 如果没有找到标题，使用论文ID作为后备
              if (!title || title.length < 3) {
                title = `论文 ${paperId}`;
              }
              
              // 避免重复
              const existingPaper = paperLinks.find(p => p.url === paperUrl);
              if (!existingPaper) {
                paperLinks.push({
                  url: paperUrl,
                  pdfUrl: `https://arxiv.org/pdf/${paperId}.pdf`,
                  id: paperId,
                  title: title
                });
              }
            }
          }
        });
      } else {
        // 列表页面：使用 dt/dd 结构
        $('dt').each((i, dtElement) => {
          const $dt = $(dtElement);
          const $dd = $dt.next('dd');
          
          // 在dt中查找论文链接
          const absLink = $dt.find('a[href*="/abs/"]').first();
          if (absLink.length > 0) {
            const href = absLink.attr('href');
            const match = href.match(/\/abs\/(\d{4}\.\d{4,5})/);
            
            if (match) {
              const paperId = match[1];
              const paperUrl = `https://arxiv.org/abs/${paperId}`;
              
              // 从对应的dd元素中提取标题
              let title = '';
              const titleElement = $dd.find('.list-title');
              if (titleElement.length > 0) {
                // 移除"Title:"前缀并获取纯文本
                title = titleElement.clone().children('.descriptor').remove().end().text().trim();
              }
              
              // 如果没有找到标题，使用论文ID作为后备
              if (!title || title.length < 3) {
                title = `论文 ${paperId}`;
              }
              
              // 避免重复
              const existingPaper = paperLinks.find(p => p.url === paperUrl);
              if (!existingPaper) {
                paperLinks.push({
                  url: paperUrl,
                  pdfUrl: `https://arxiv.org/pdf/${paperId}.pdf`,
                  id: paperId,
                  title: title
                });
              }
            }
          }
        });
      }

      console.log(`找到 ${paperLinks.length} 篇论文`);
      
      return {
        success: true,
        type: 'arxiv_list',
        title: `arXiv论文列表 (${paperLinks.length}篇)`,
        papers: paperLinks.map(p => p.url), // 保持兼容性，返回URL数组
        papersWithInfo: paperLinks, // 新增：包含完整信息的数组
        message: `成功提取到 ${paperLinks.length} 篇论文链接`,
        extractedCount: paperLinks.length
      };

    } catch (error) {
      console.error('提取arXiv论文列表失败:', error.message);
      return {
        success: false,
        error: `提取论文列表失败: ${error.message}`,
        suggestion: '请检查URL是否正确，或尝试直接复制论文链接'
      };
    }
  }

  // 直接下载PDF文件
  async downloadDirectPdf(url) {
    try {
      console.log('检测到PDF链接，直接下载:', url);
      
      const response = await axios({
        method: 'GET',
        url: url,
        responseType: 'stream',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      });
      
      // 从URL生成文件名
      const urlObj = new URL(url);
      let filename = urlObj.pathname.split('/').pop();
      if (!filename.endsWith('.pdf')) {
        filename += '.pdf';
      }
      
      // 添加时间戳避免重复
      const timestamp = new Date().toISOString().slice(0, 10);
      const finalFilename = `${filename.replace('.pdf', '')}_${timestamp}.pdf`;
      const filepath = path.join(this.downloadDir, finalFilename);
      
      const writer = fs.createWriteStream(filepath);
      response.data.pipe(writer);
      
      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          console.log('PDF下载完成:', filepath);
          resolve({
            success: true,
            filepath: filepath,
            filename: finalFilename,
            title: filename.replace('.pdf', ''),
            url: url,
            type: 'direct_pdf'
          });
        });
        
        writer.on('error', (error) => {
          console.error('文件写入错误:', error);
          reject(error);
        });
      });
      
    } catch (error) {
      console.error('PDF下载失败:', error.message);
      return {
        success: false,
        error: error.message,
        url: url
      };
    }
  }

  // 智能选择转换策略
  async convertWebpageToPdf(url, format = 'auto') {
    // Serverless环境优先使用Markdown转换
    if (this.isServerless) {
      console.log('Serverless环境 - 优先使用Markdown转换');
      
      // 如果用户明确要求PDF，尝试PDF转换，否则默认Markdown
      if (format === 'pdf') {
        const pdfResult = await this.vercelConverter.convertToPdf(url);
        if (pdfResult.success) {
          return pdfResult;
        }
        // PDF转换失败，回退到Markdown
        console.log('PDF转换失败，回退到Markdown');
      }
      
      // 尝试Markdown转换
      const markdownResult = await this.contentExtractor.convertToMarkdown(url);
      if (markdownResult.success) {
        return {
          ...markdownResult,
          message: 'Serverless环境已转换为Markdown格式，更适合阅读和编辑',
          alternatives: [
            '📝 Markdown格式：保留完整结构，支持编辑',
            '📄 如需PDF：可使用Typora、Mark Text等工具转换',
            '🖨️ 浏览器打印：Ctrl+P → 另存为PDF',
            '💻 本地版本：获得完整PDF转换功能'
          ]
        };
      }
      
      // Markdown也失败，提供指导
      return await this.vercelConverter.convertToPdf(url);
    }

    // 本地环境 - 检查Playwright可用性
    if (this.playwrightAvailable === null) {
      this.playwrightAvailable = await checkPlaywrightAvailable();
    }

    if (this.playwrightAvailable) {
      return await this.convertWithPlaywright(url);
    } else {
      console.log('Playwright不可用，提供替代方案');
      return await this.provideAlternatives(url);
    }
  }

  // 使用Playwright转换（本地环境）
  async convertWithPlaywright(url) {
    try {
      console.log('正在转换网页为PDF:', url);
      
      // 动态导入Playwright
      const { chromium } = await import('playwright-core');
      
      const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      
      await page.setExtraHTTPHeaders({
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      });
      
      console.log('正在加载页面...');
      
      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: 30000
      });
      
      const title = await page.title();
      console.log('页面标题:', title);
      
      const sanitizedTitle = title.replace(/[<>:"/\\|?*]/g, '').substring(0, 100);
      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `${sanitizedTitle}_${timestamp}.pdf`;
      const filepath = path.join(this.downloadDir, filename);
      
      console.log('正在生成PDF...');
      
      await page.pdf({
        path: filepath,
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px'
        }
      });
      
      await browser.close();
      console.log('PDF生成完成:', filepath);
      
      return {
        success: true,
        filepath: filepath,
        filename: filename,
        title: title,
        url: url,
        type: 'webpage_pdf'
      };
      
    } catch (error) {
      console.log('Playwright转换失败:', error.message);
      return await this.provideAlternatives(url);
    }
  }

  // 提供替代方案
  async provideAlternatives(url) {
    try {
      console.log('正在分析网页内容:', url);
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        },
        timeout: 10000
      });
      
      const $ = cheerio.load(response.data);
      
      // 提取页面信息
      const title = $('title').text().trim() || 'Untitled';
      
      // 查找可能的PDF链接
      const pdfLinks = [];
      $('a[href*=".pdf"], a[href*="pdf"]').each((i, elem) => {
        const href = $(elem).attr('href');
        const text = $(elem).text().trim();
        if (href) {
          const fullUrl = new URL(href, url).href;
          pdfLinks.push({ url: fullUrl, text: text || 'PDF文件' });
        }
      });
      
      console.log('网页分析完成:', title);
      
      return {
        success: true,
        title: title,
        url: url,
        pdfLinks: pdfLinks,
        type: 'webpage_analysis',
        message: '无法直接转换为PDF，请尝试以下方案：',
        alternatives: [
          '1. 使用浏览器的"打印 → 另存为PDF"功能',
          '2. 使用在线PDF转换服务（如：html-pdf.com）',
          '3. 使用浏览器扩展（如：Save as PDF）',
          pdfLinks.length > 0 ? `4. 直接下载页面中的PDF文件（发现${pdfLinks.length}个）` : null
        ].filter(Boolean)
      };
      
    } catch (error) {
      console.error('网页分析失败:', error.message);
      return {
        success: false,
        error: `无法访问网页: ${error.message}`,
        url: url,
        suggestion: '请检查URL是否正确，或尝试使用浏览器直接访问'
      };
    }
  }

  // 统一处理入口
  async processUrl(url) {
    // 检查是否为arXiv列表页面
    if (this.isArxivListPage(url)) {
      return await this.extractArxivPapers(url);
    }
    // 检查是否为直接PDF链接
    else if (this.isPdfUrl(url)) {
      return await this.downloadDirectPdf(url);
    } else {
      return await this.convertWebpageToPdf(url);
    }
  }

  // 批量处理
  async processMultiple(urls) {
    const results = [];
    
    for (const url of urls) {
      console.log(`\n处理第 ${results.length + 1}/${urls.length} 个URL...`);
      const result = await this.processUrl(url);
      results.push(result);
      
      // 添加延迟避免资源占用过高
      if (results.length < urls.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    return results;
  }
}

// 命令行使用
if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.length > 2) {
    const processor = new WebpageProcessor();
    const urls = process.argv.slice(2);
    
    console.log('网页处理工具');
    console.log('=================');
    
    processor.processMultiple(urls).then(results => {
      console.log('\n处理结果汇总:');
      console.log('=================');
      
      results.forEach((result, index) => {
        if (result.success) {
          if (result.type === 'direct_pdf') {
            console.log(`✅ ${index + 1}. ${result.title} (PDF已下载)`);
            console.log(`   文件: ${result.filename}`);
          } else {
            console.log(`📄 ${index + 1}. ${result.title}`);
            console.log(`   ${result.message}`);
            if (result.pdfLinks.length > 0) {
              result.pdfLinks.forEach((link, i) => {
                console.log(`   PDF${i+1}: ${link.text} - ${link.url}`);
              });
            }
          }
        } else {
          console.log(`❌ ${index + 1}. 处理失败: ${result.error}`);
          console.log(`   建议: ${result.suggestion || '请检查URL'}`);
        }
      });
      
      const successCount = results.filter(r => r.success).length;
      console.log(`\n总计: ${successCount}/${results.length} 个URL处理成功`);
    });
  }
}

export default WebpageProcessor;