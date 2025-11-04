import axios from 'axios';
import * as cheerio from 'cheerio';

class VercelPdfConverter {
  constructor() {
    this.strategies = [
      'browserless_io',
      'html_css_to_image', 
      'fallback_guide'
    ];
  }

  // 策略1: 使用Browserless.io (如果有API key)
  async convertWithBrowserless(url) {
    const token = process.env.BROWSERLESS_TOKEN;
    if (!token) {
      throw new Error('Browserless token not available');
    }

    try {
      const response = await axios.post(
        `https://chrome.browserless.io/pdf?token=${token}`,
        { url: url },
        {
          headers: { 'Content-Type': 'application/json' },
          responseType: 'arraybuffer',
          timeout: 30000
        }
      );

      return {
        success: true,
        buffer: response.data,
        contentType: 'application/pdf'
      };
    } catch (error) {
      throw new Error(`Browserless conversion failed: ${error.message}`);
    }
  }

  // 策略2: 使用HTMLCSStoImage (免费但有限制)
  async convertWithHtmlCssToImage(url) {
    try {
      // 这个API主要用于截图，但可以作为备选
      const response = await axios.post(
        'https://htmlcsstoimage.com/demo_run',
        {
          html: `<iframe src="${url}" width="1200" height="800"></iframe>`,
          css: 'body { margin: 0; }',
          google_fonts: '',
          selector: 'body',
          ms_delay: 1000,
          device_scale: 1,
          format: 'png'
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000
        }
      );

      // 注意：这返回的是图片，不是PDF
      return {
        success: true,
        imageUrl: response.data.url,
        contentType: 'image/png',
        note: 'Generated as image, not PDF'
      };
    } catch (error) {
      throw new Error(`HTMLCSStoImage conversion failed: ${error.message}`);
    }
  }

  // 策略3: 提供详细的用户指导
  async provideFallbackGuide(url) {
    try {
      // 分析页面获取更多信息
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        },
        timeout: 10000
      });

      const $ = cheerio.load(response.data);
      const title = $('title').text().trim() || 'Untitled';
      
      // 查找PDF链接
      const pdfLinks = [];
      $('a[href*=".pdf"], a[href*="pdf"]').each((i, elem) => {
        const href = $(elem).attr('href');
        const text = $(elem).text().trim();
        if (href) {
          const fullUrl = new URL(href, url).href;
          pdfLinks.push({ url: fullUrl, text: text || 'PDF文件' });
        }
      });

      return {
        success: true,
        title: title,
        url: url,
        pdfLinks: pdfLinks,
        type: 'guide',
        message: '云端版本无法直接转换，请使用以下方案：',
        alternatives: [
          '1. 🖨️ 浏览器打印功能：Ctrl+P → 另存为PDF',
          '2. 🔗 在线转换服务：save-as-pdf.com 或 web2pdfconvert.com',
          '3. 📱 浏览器扩展：Save as PDF 或 Print Friendly',
          '4. 💻 本地工具：下载桌面版获得完整功能',
          pdfLinks.length > 0 ? `5. 📄 直接PDF：发现 ${pdfLinks.length} 个PDF链接` : null
        ].filter(Boolean),
        downloadLocalVersion: 'https://github.com/your-repo/releases'
      };
    } catch (error) {
      return {
        success: false,
        error: `无法分析页面: ${error.message}`,
        url: url
      };
    }
  }

  // 主转换方法
  async convertToPdf(url) {
    console.log('Vercel环境 - 尝试PDF转换:', url);

    // 尝试各种策略
    for (const strategy of this.strategies) {
      try {
        switch (strategy) {
          case 'browserless_io':
            if (process.env.BROWSERLESS_TOKEN) {
              console.log('尝试Browserless.io转换...');
              return await this.convertWithBrowserless(url);
            }
            break;

          case 'html_css_to_image':
            console.log('尝试HTMLCSStoImage转换...');
            return await this.convertWithHtmlCssToImage(url);

          case 'fallback_guide':
            console.log('提供用户指导方案...');
            return await this.provideFallbackGuide(url);
        }
      } catch (error) {
        console.log(`策略 ${strategy} 失败:`, error.message);
        continue;
      }
    }

    // 所有策略都失败
    return {
      success: false,
      error: '所有转换策略都失败了',
      url: url,
      suggestion: '请尝试使用本地版本或浏览器的打印功能'
    };
  }
}

export default VercelPdfConverter;