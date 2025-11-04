// 环境检测和配置
export const isVercel = process.env.VERCEL === '1';
export const isProduction = process.env.NODE_ENV === 'production';
export const isLocal = !isVercel && !isProduction;

// 检查Playwright是否可用
export async function checkPlaywrightAvailable() {
  if (isVercel) {
    return false; // Vercel不支持Playwright
  }
  
  try {
    const { chromium } = await import('playwright-core');
    await chromium.launch({ headless: true });
    return true;
  } catch (error) {
    console.log('Playwright不可用:', error.message);
    return false;
  }
}

// 获取PDF转换策略
export function getPdfStrategy() {
  if (isVercel) {
    return 'api'; // 使用第三方API
  } else if (isLocal) {
    return 'playwright'; // 使用本地Playwright
  } else {
    return 'hybrid'; // 混合策略
  }
}

// 第三方PDF API配置
export const pdfApiConfig = {
  // 可以使用免费的API服务
  htmlCssToImage: 'https://htmlcsstoimage.com/demo_run',
  pdfShift: process.env.PDFSHIFT_API_KEY ? 'https://api.pdfshift.io/v3/convert/pdf' : null,
  // 或者使用无服务器函数
  browserless: process.env.BROWSERLESS_TOKEN ? 'https://chrome.browserless.io/pdf' : null
};

export default {
  isVercel,
  isProduction,
  isLocal,
  checkPlaywrightAvailable,
  getPdfStrategy,
  pdfApiConfig
};