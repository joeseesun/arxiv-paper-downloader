// 客户端PDF生成器 - 在浏览器中运行
class ClientPdfGenerator {
  constructor() {
    this.loadLibraries();
  }

  // 动态加载PDF生成库
  async loadLibraries() {
    if (typeof window === 'undefined') return; // 服务端环境跳过

    // 加载jsPDF
    if (!window.jsPDF) {
      await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    }

    // 加载html2canvas
    if (!window.html2canvas) {
      await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
    }

    // 加载pdfmake
    if (!window.pdfMake) {
      await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/pdfmake.min.js');
      await this.loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.7/vfs_fonts.js');
    }
  }

  // 动态加载脚本
  loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // 方法1: 从URL生成PDF（使用iframe + html2canvas）
  async generateFromUrl(url, options = {}) {
    try {
      console.log('客户端生成PDF:', url);
      
      // 创建隐藏的iframe
      const iframe = document.createElement('iframe');
      iframe.src = url;
      iframe.style.width = '1200px';
      iframe.style.height = '800px';
      iframe.style.position = 'absolute';
      iframe.style.left = '-9999px';
      iframe.style.border = 'none';
      
      document.body.appendChild(iframe);
      
      // 等待iframe加载
      await new Promise((resolve, reject) => {
        iframe.onload = resolve;
        iframe.onerror = reject;
        setTimeout(() => reject(new Error('加载超时')), 10000);
      });

      // 等待内容渲染
      await new Promise(resolve => setTimeout(resolve, 2000));

      // 使用html2canvas截图
      const canvas = await window.html2canvas(iframe.contentDocument.body, {
        useCORS: true,
        allowTaint: true,
        scale: 1,
        width: 1200,
        height: 800
      });

      // 生成PDF
      const { jsPDF } = window.jsPDF;
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210; // A4宽度
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      
      // 生成文件名
      const filename = this.generateFilename(url, options.title);
      pdf.save(filename);

      // 清理
      document.body.removeChild(iframe);

      return {
        success: true,
        filename: filename,
        type: 'client_pdf',
        method: 'iframe_capture'
      };

    } catch (error) {
      console.error('客户端URL转PDF失败:', error);
      return {
        success: false,
        error: error.message,
        suggestion: '请尝试服务端生成或手动保存'
      };
    }
  }

  // 方法2: 从HTML内容生成PDF
  async generateFromHtml(html, options = {}) {
    try {
      console.log('从HTML生成PDF');

      // 创建临时容器
      const container = document.createElement('div');
      container.innerHTML = html;
      container.style.width = '210mm';
      container.style.padding = '20px';
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.backgroundColor = 'white';
      
      document.body.appendChild(container);

      // 使用html2canvas
      const canvas = await window.html2canvas(container, {
        useCORS: true,
        allowTaint: true,
        scale: 2
      });

      // 生成PDF
      const { jsPDF } = window.jsPDF;
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      const imgData = canvas.toDataURL('image/png');
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      
      const filename = options.filename || `document_${Date.now()}.pdf`;
      pdf.save(filename);

      // 清理
      document.body.removeChild(container);

      return {
        success: true,
        filename: filename,
        type: 'client_pdf',
        method: 'html_render'
      };

    } catch (error) {
      console.error('HTML转PDF失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 方法3: 使用pdfmake生成结构化PDF
  async generateStructured(content, options = {}) {
    try {
      console.log('生成结构化PDF');

      const docDefinition = {
        content: content,
        styles: {
          header: {
            fontSize: 18,
            bold: true,
            margin: [0, 0, 0, 10]
          },
          subheader: {
            fontSize: 14,
            bold: true,
            margin: [0, 10, 0, 5]
          },
          quote: {
            italics: true,
            margin: [10, 0, 0, 0]
          }
        },
        defaultStyle: {
          fontSize: 12,
          lineHeight: 1.3
        },
        pageMargins: [40, 60, 40, 60]
      };

      const filename = options.filename || `document_${Date.now()}.pdf`;
      
      window.pdfMake.createPdf(docDefinition).download(filename);

      return {
        success: true,
        filename: filename,
        type: 'client_pdf',
        method: 'pdfmake'
      };

    } catch (error) {
      console.error('结构化PDF生成失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // 方法4: 智能选择最佳生成方式
  async generatePdf(input, options = {}) {
    // 根据输入类型选择最佳方法
    if (typeof input === 'string') {
      if (input.startsWith('http')) {
        // URL输入 - 尝试iframe方式
        return await this.generateFromUrl(input, options);
      } else {
        // HTML字符串 - 使用HTML渲染
        return await this.generateFromHtml(input, options);
      }
    } else if (Array.isArray(input) || typeof input === 'object') {
      // 结构化内容 - 使用pdfmake
      return await this.generateStructured(input, options);
    } else {
      return {
        success: false,
        error: '不支持的输入类型'
      };
    }
  }

  // 生成文件名
  generateFilename(url, title) {
    let name;
    
    if (title) {
      name = title.replace(/[<>:"/\\|?*]/g, '').substring(0, 50);
    } else {
      const urlObj = new URL(url);
      name = urlObj.hostname.replace('www.', '') + '_' + urlObj.pathname.replace(/\//g, '_');
    }
    
    const timestamp = new Date().toISOString().slice(0, 10);
    return `${name}_${timestamp}.pdf`;
  }

  // 检查浏览器兼容性
  checkCompatibility() {
    const features = {
      canvas: !!document.createElement('canvas').getContext,
      fileApi: !!(window.File && window.FileReader && window.FileList && window.Blob),
      download: 'download' in document.createElement('a')
    };

    const compatible = Object.values(features).every(Boolean);
    
    return {
      compatible,
      features,
      message: compatible ? '浏览器完全兼容' : '部分功能可能不可用'
    };
  }
}

// 导出给浏览器使用
if (typeof window !== 'undefined') {
  window.ClientPdfGenerator = ClientPdfGenerator;
}

export default ClientPdfGenerator;