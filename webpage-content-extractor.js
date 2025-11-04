import axios from 'axios';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';

class WebpageContentExtractor {
  constructor() {
    // 初始化Markdown转换器
    this.turndownService = new TurndownService({
      headingStyle: 'atx',
      hr: '---',
      bulletListMarker: '-',
      codeBlockStyle: 'fenced',
      fence: '```',
      emDelimiter: '*',
      strongDelimiter: '**',
      linkStyle: 'inlined',
      linkReferenceStyle: 'full'
    });

    // 自定义转换规则
    this.setupTurndownRules();
  }

  setupTurndownRules() {
    // 处理代码块
    this.turndownService.addRule('codeBlock', {
      filter: ['pre'],
      replacement: function (content, node) {
        const language = node.getAttribute('data-language') || 
                        node.className.match(/language-(\w+)/)?.[1] || '';
        return '\n\n```' + language + '\n' + content + '\n```\n\n';
      }
    });

    // 处理表格
    this.turndownService.addRule('table', {
      filter: 'table',
      replacement: function (content) {
        return '\n\n' + content + '\n\n';
      }
    });

    // 处理图片，保留alt和src
    this.turndownService.addRule('image', {
      filter: 'img',
      replacement: function (content, node) {
        const alt = node.getAttribute('alt') || '';
        const src = node.getAttribute('src') || '';
        const title = node.getAttribute('title') || '';
        
        if (!src) return '';
        
        const titlePart = title ? ` "${title}"` : '';
        return `![${alt}](${src}${titlePart})`;
      }
    });
  }

  // 智能提取网页主要内容
  extractMainContent($) {
    // 尝试多种内容选择器，按优先级排序
    const contentSelectors = [
      // 微信公众号特殊选择器
      '#js_content',
      '.rich_media_content',
      '#img-content',
      // 通用选择器
      'article',
      '[role="main"]',
      '.main-content',
      '.content',
      '.post-content',
      '.entry-content',
      '.article-content',
      '.page-content',
      'main',
      '#content',
      '#main',
      '.container .content',
      'body'
    ];

    for (const selector of contentSelectors) {
      const element = $(selector).first();
      if (element.length > 0 && element.text().trim().length > 100) {
        return element;
      }
    }

    // 如果都没找到，返回body
    return $('body');
  }

  // 清理HTML内容
  cleanHtml($, contentElement, isWechatArticle = false) {
    // 移除不需要的元素
    const unwantedSelectors = [
      'script',
      'style',
      'nav',
      'header',
      'footer',
      '.navigation',
      '.nav',
      '.menu',
      '.sidebar',
      '.ads',
      '.advertisement',
      '.social-share',
      '.comments',
      '.comment',
      '.related-posts',
      '.popup',
      '.modal',
      '.cookie-notice',
      '[class*="ad-"]',
      '[id*="ad-"]'
    ];

    // 微信公众号特殊清理
    if (isWechatArticle) {
      unwantedSelectors.push(
        '.rich_media_tool',
        '.rich_media_meta',
        '.rich_media_extra',
        '.rich_media_area_primary',
        '.rich_media_area_extra',
        '.profile_container',
        '.qr_code_pc',
        '.reward_qrcode',
        '.mp_profile_iframe_wrp',
        '#js_pc_qr_code',
        '.weui-loadmore',
        '.js_jump_icon',
        '.js_share_container',
        '[data-brushtype="tools"]'
      );
    }

    unwantedSelectors.forEach(selector => {
      contentElement.find(selector).remove();
    });

    // 清理空元素
    contentElement.find('*').each(function() {
      const $this = $(this);
      if ($this.is(':empty') && !$this.is('img, br, hr, input')) {
        $this.remove();
      }
    });

    return contentElement;
  }

  // 提取页面元数据
  extractMetadata($) {
    const metadata = {
      title: '',
      description: '',
      author: '',
      publishDate: '',
      url: '',
      keywords: []
    };

    // 标题
    metadata.title = $('title').text().trim() ||
                    $('h1').first().text().trim() ||
                    $('meta[property="og:title"]').attr('content') ||
                    '';

    // 描述
    metadata.description = $('meta[name="description"]').attr('content') ||
                          $('meta[property="og:description"]').attr('content') ||
                          '';

    // 作者
    metadata.author = $('meta[name="author"]').attr('content') ||
                     $('meta[property="article:author"]').attr('content') ||
                     $('.author').first().text().trim() ||
                     '';

    // 发布日期
    metadata.publishDate = $('meta[property="article:published_time"]').attr('content') ||
                          $('meta[name="date"]').attr('content') ||
                          $('time').first().attr('datetime') ||
                          '';

    // 关键词
    const keywordsContent = $('meta[name="keywords"]').attr('content');
    if (keywordsContent) {
      metadata.keywords = keywordsContent.split(',').map(k => k.trim());
    }

    return metadata;
  }

  // 转换为Markdown
  async convertToMarkdown(url) {
    try {
      console.log('开始提取网页内容并转换为Markdown:', url);

      // 检测是否为微信公众号链接
      const isWechatArticle = url.includes('mp.weixin.qq.com');
      
      // 获取网页内容
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          ...(isWechatArticle && {
            'Referer': 'https://mp.weixin.qq.com/',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-origin'
          })
        },
        timeout: 30000,
        maxRedirects: 5,
        responseType: 'arraybuffer' // 获取原始字节数据
      });

      // 处理编码问题
      let htmlContent;
      if (isWechatArticle) {
        // 微信公众号通常使用UTF-8编码
        htmlContent = Buffer.from(response.data).toString('utf8');
      } else {
        // 尝试检测编码
        const contentType = response.headers['content-type'] || '';
        const charsetMatch = contentType.match(/charset=([^;]+)/i);
        const charset = charsetMatch ? charsetMatch[1].toLowerCase() : 'utf8';
        
        try {
          htmlContent = Buffer.from(response.data).toString(charset);
        } catch (error) {
          // 编码失败，回退到UTF-8
          htmlContent = Buffer.from(response.data).toString('utf8');
        }
      }

      const $ = cheerio.load(htmlContent);
      
      // 提取元数据
      const metadata = this.extractMetadata($);
      
      // 提取主要内容
      const contentElement = this.extractMainContent($);
      
      // 清理HTML
      const cleanedContent = this.cleanHtml($, contentElement, isWechatArticle);
      
      // 转换为Markdown
      const markdownContent = this.turndownService.turndown(cleanedContent.html());
      
      // 构建完整的Markdown文档
      let fullMarkdown = '';
      
      // 添加元数据头部
      if (metadata.title) {
        fullMarkdown += `# ${metadata.title}\n\n`;
      }
      
      if (metadata.author || metadata.publishDate) {
        fullMarkdown += '---\n';
        if (metadata.author) fullMarkdown += `作者: ${metadata.author}\n`;
        if (metadata.publishDate) fullMarkdown += `发布时间: ${metadata.publishDate}\n`;
        fullMarkdown += `原文链接: ${url}\n`;
        fullMarkdown += '---\n\n';
      }
      
      if (metadata.description) {
        fullMarkdown += `> ${metadata.description}\n\n`;
      }
      
      // 添加主要内容
      fullMarkdown += markdownContent;
      
      // 生成文件名
      const filename = this.generateFilename(metadata.title || 'webpage', 'md');
      
      return {
        success: true,
        content: fullMarkdown,
        filename: filename,
        metadata: metadata,
        url: url,
        type: 'markdown',
        size: Buffer.byteLength(fullMarkdown, 'utf8')
      };

    } catch (error) {
      console.error('Markdown转换失败:', error.message);
      return {
        success: false,
        error: `转换失败: ${error.message}`,
        url: url,
        type: 'error'
      };
    }
  }

  // 提取纯文本内容
  async extractText(url) {
    try {
      console.log('提取网页纯文本内容:', url);

      // 检测是否为微信公众号链接
      const isWechatArticle = url.includes('mp.weixin.qq.com');

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          ...(isWechatArticle && {
            'Referer': 'https://mp.weixin.qq.com/'
          })
        },
        timeout: 30000,
        responseType: 'arraybuffer'
      });

      // 处理编码
      let htmlContent;
      if (isWechatArticle) {
        htmlContent = Buffer.from(response.data).toString('utf8');
      } else {
        const contentType = response.headers['content-type'] || '';
        const charsetMatch = contentType.match(/charset=([^;]+)/i);
        const charset = charsetMatch ? charsetMatch[1].toLowerCase() : 'utf8';
        
        try {
          htmlContent = Buffer.from(response.data).toString(charset);
        } catch (error) {
          htmlContent = Buffer.from(response.data).toString('utf8');
        }
      }

      const $ = cheerio.load(htmlContent);
      const metadata = this.extractMetadata($);
      const contentElement = this.extractMainContent($);
      
      // 移除不需要的元素
      this.cleanHtml($, contentElement, isWechatArticle);
      
      // 提取纯文本
      const textContent = contentElement.text()
        .replace(/\s+/g, ' ')  // 合并多个空白字符
        .replace(/\n\s*\n/g, '\n\n')  // 清理多余换行
        .trim();

      const filename = this.generateFilename(metadata.title || 'webpage', 'txt');

      return {
        success: true,
        content: textContent,
        filename: filename,
        metadata: metadata,
        url: url,
        type: 'text',
        size: Buffer.byteLength(textContent, 'utf8')
      };

    } catch (error) {
      console.error('文本提取失败:', error.message);
      return {
        success: false,
        error: `提取失败: ${error.message}`,
        url: url,
        type: 'error'
      };
    }
  }

  // 生成安全的文件名
  generateFilename(title, extension) {
    // 清理标题，移除特殊字符
    const cleanTitle = title
      .replace(/[<>:"/\\|?*]/g, '')  // 移除文件名不允许的字符
      .replace(/\s+/g, '_')          // 空格替换为下划线
      .substring(0, 100);            // 限制长度

    const timestamp = new Date().toISOString().slice(0, 10);
    return `${cleanTitle}_${timestamp}.${extension}`;
  }

  // 主处理方法
  async processUrl(url, format = 'markdown') {
    switch (format.toLowerCase()) {
      case 'markdown':
      case 'md':
        return await this.convertToMarkdown(url);
      
      case 'text':
      case 'txt':
        return await this.extractText(url);
      
      default:
        return {
          success: false,
          error: `不支持的格式: ${format}`,
          url: url,
          supportedFormats: ['markdown', 'text']
        };
    }
  }
}

export default WebpageContentExtractor;