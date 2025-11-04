import axios from 'axios';
import puppeteer from 'puppeteer';
import { promises as fs } from 'fs';
import path from 'path';

class ArticleToPDFConverter {
  constructor() {
    this.browser = null;
  }

  async init() {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  // 检测URL类型
  detectUrlType(url) {
    if (url.includes('arxiv.org')) {
      return 'arxiv';
    }
    return 'webpage';
  }

  // 处理arXiv URL，获取PDF下载链接
  getArxivPdfUrl(url) {
    // 支持多种arXiv URL格式
    const patterns = [
      /arxiv\.org\/abs\/(\d+\.\d+)/,
      /arxiv\.org\/pdf\/(\d+\.\d+)/,
      /arxiv\.org\/html\/(\d+\.\d+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        const paperId = match[1];
        return `https://arxiv.org/pdf/${paperId}.pdf`;
      }
    }
    
    throw new Error('无法识别的arXiv URL格式');
  }

  // 下载arXiv PDF
  async downloadArxivPdf(url, outputPath) {
    try {
      const pdfUrl = this.getArxivPdfUrl(url);
      console.log(`正在下载arXiv PDF: ${pdfUrl}`);
      
      const response = await axios({
        method: 'GET',
        url: pdfUrl,
        responseType: 'stream',
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        }
      });

      const writer = fs.createWriteStream(outputPath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          console.log(`arXiv PDF下载完成: ${outputPath}`);
          resolve(outputPath);
        });
        writer.on('error', reject);
      });
    } catch (error) {
      throw new Error(`arXiv PDF下载失败: ${error.message}`);
    }
  }

  // 将网页转换为PDF
  async convertWebpageToPdf(url, outputPath) {
    await this.init();
    
    try {
      console.log(`正在转换网页为PDF: ${url}`);
      
      const page = await this.browser.newPage();
      
      // 设置用户代理和视口
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36');
      await page.setViewport({ width: 1200, height: 800 });
      
      // 访问页面
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      // 等待页面完全加载
      await page.waitForTimeout(2000);

      // 生成PDF
      await page.pdf({
        path: outputPath,
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '