import ArticleProcessor from './index.js';
import fs from 'fs';

// 从你提供的内容中提取的所有URL
const urls = [
  'https://graphics.stanford.edu/papers/brook/brook.pdf',
  'https://arxiv.org/abs/1409.0575',
  'https://arxiv.org/abs/1409.3215',
  'https://arxiv.org/abs/1503.02531',
  'https://arxiv.org/abs/1512.03385',
  'https://arxiv.org/abs/1706.03762',
  'https://www.nature.com/articles/nature24270',
  'https://arxiv.org/abs/1701.06538',
  'https://www.incompleteideas.net/IncIdeas/BitterLesson.html',
  'https://arxiv.org/abs/2106.09685',
  'https://arxiv.org/abs/2201.11903',
  'https://arxiv.org/abs/2210.03629',
  'https://arxiv.org/abs/1910.02054',
  'https://arxiv.org/abs/2001.08361',
  'https://arxiv.org/abs/2203.15556',
  'https://laion.ai/blog/laion-5b/',
  'https://huggingface.co/datasets/tiiuae/falcon-refinedweb',
  'https://arxiv.org/abs/2402.05530',
  'https://arxiv.org/abs/1301.3781',
  'https://arxiv.org/abs/1609.08144',
  'https://cdn.openai.com/research-covers/language-unsupervised/language_understanding_paper.pdf',
  'https://arxiv.org/abs/1810.04805',
  'https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf',
  'https://arxiv.org/abs/2005.14165',
  'https://arxiv.org/abs/2203.02155',
  'https://github.com/allenai/tulu',
  'https://arxiv.org/abs/1312.6204',
  'https://arxiv.org/abs/1406.2199',
  'https://arxiv.org/abs/1406.2661',
  'https://arxiv.org/abs/1503.03585',
  'https://arxiv.org/abs/2006.11239',
  'https://arxiv.org/abs/2010.11929',
  'https://arxiv.org/abs/2103.00020',
  'https://arxiv.org/abs/2112.10752',
  'https://arxiv.org/abs/2212.09748'
];

// 论文信息映射
const paperInfo = {
  'https://graphics.stanford.edu/papers/brook/brook.pdf': 'Brook for GPU (2004)',
  'https://arxiv.org/abs/1409.0575': 'AlexNet - ImageNet Classification (2012)',
  'https://arxiv.org/abs/1409.3215': 'Seq2Seq Learning (2014)',
  'https://arxiv.org/abs/1503.02531': 'Knowledge Distillation (2015)',
  'https://arxiv.org/abs/1512.03385': 'ResNet (2015)',
  'https://arxiv.org/abs/1706.03762': 'Transformer - Attention Is All You Need (2017)',
  'https://www.nature.com/articles/nature24270': 'AlphaGo Zero (2017)',
  'https://arxiv.org/abs/1701.06538': 'MoE - Mixture of Experts (2017)',
  'https://www.incompleteideas.net/IncIdeas/BitterLesson.html': 'The Bitter Lesson (2018)',
  'https://arxiv.org/abs/2106.09685': 'LoRA (2021)',
  'https://arxiv.org/abs/2201.11903': 'Chain-of-Thought (2022)',
  'https://arxiv.org/abs/2210.03629': 'ReAct (2022)',
  'https://arxiv.org/abs/1910.02054': 'ZeRO (2019)',
  'https://arxiv.org/abs/2001.08361': 'Scaling Laws (2020)',
  'https://arxiv.org/abs/2203.15556': 'Chinchilla (2022)',
  'https://laion.ai/blog/laion-5b/': 'LAION-5B Dataset (2022)',
  'https://huggingface.co/datasets/tiiuae/falcon-refinedweb': 'RefinedWeb Dataset (2023)',
  'https://arxiv.org/abs/2402.05530': 'MegaScale (2024)',
  'https://arxiv.org/abs/1301.3781': 'Word2Vec (2013)',
  'https://arxiv.org/abs/1609.08144': 'Google Neural MT (2016)',
  'https://cdn.openai.com/research-covers/language-unsupervised/language_understanding_paper.pdf': 'GPT-1 (2018)',
  'https://arxiv.org/abs/1810.04805': 'BERT (2018)',
  'https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf': 'GPT-2 (2019)',
  'https://arxiv.org/abs/2005.14165': 'GPT-3 (2020)',
  'https://arxiv.org/abs/2203.02155': 'InstructGPT (2022)',
  'https://github.com/allenai/tulu': 'Tulu 3 (2024)',
  'https://arxiv.org/abs/1312.6204': 'DeepVideo (2014)',
  'https://arxiv.org/abs/1406.2199': 'Two-Stream Networks (2014)',
  'https://arxiv.org/abs/1406.2661': 'GAN (2014)',
  'https://arxiv.org/abs/1503.03585': 'Diffusion Models (2015)',
  'https://arxiv.org/abs/2006.11239': 'DDPM (2020)',
  'https://arxiv.org/abs/2010.11929': 'Vision Transformer (2020)',
  'https://arxiv.org/abs/2103.00020': 'CLIP (2021)',
  'https://arxiv.org/abs/2112.10752': 'Stable Diffusion (2021)',
  'https://arxiv.org/abs/2212.09748': 'DiT - Diffusion Transformer (2022)'
};

async function batchDownload() {
  const processor = new ArticleProcessor();
  
  console.log('🚀 开始批量下载AI发展史重要论文');
  console.log('=====================================');
  console.log(`总共 ${urls.length} 篇论文待处理\n`);
  
  // 检查已下载的文件
  const downloadDir = './downloads';
  let existingFiles = [];
  if (fs.existsSync(downloadDir)) {
    existingFiles = fs.readdirSync(downloadDir);
  }
  
  console.log(`已存在 ${existingFiles.length} 个文件\n`);
  
  // 分批处理，避免过载
  const batchSize = 5;
  const results = [];
  
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    
    console.log(`\n📦 处理第 ${Math.floor(i/batchSize) + 1} 批 (${i + 1}-${Math.min(i + batchSize, urls.length)}/${urls.length})`);
    console.log('=' .repeat(50));
    
    for (const url of batch) {
      const info = paperInfo[url] || 'Unknown Paper';
      console.log(`\n🔄 正在处理: ${info}`);
      console.log(`📎 URL: ${url}`);
      
      try {
        const result = await processor.processUrl(url);
        results.push({ url, info, result });
        
        if (result.success) {
          console.log(`✅ 成功: ${result.filename}`);
        } else {
          console.log(`❌ 失败: ${result.error}`);
        }
      } catch (error) {
        console.log(`❌ 异常: ${error.message}`);
        results.push({ url, info, result: { success: false, error: error.message } });
      }
      
      // 添加延迟避免过载
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // 批次间休息
    if (i + batchSize < urls.length) {
      console.log('\n⏸️  批次间休息 5 秒...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  // 生成报告
  console.log('\n\n📊 下载结果报告');
  console.log('=====================================');
  
  const successful = results.filter(r => r.result.success);
  const failed = results.filter(r => !r.result.success);
  
  console.log(`✅ 成功下载: ${successful.length} 篇`);
  console.log(`❌ 下载失败: ${failed.length} 篇`);
  console.log(`📈 成功率: ${(successful.length / results.length * 100).toFixed(1)}%\n`);
  
  if (successful.length > 0) {
    console.log('✅ 成功下载的论文:');
    successful.forEach((item, index) => {
      console.log(`${index + 1}. ${item.info}`);
      console.log(`   文件: ${item.result.filename}`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\n❌ 下载失败的论文:');
    failed.forEach((item, index) => {
      console.log(`${index + 1}. ${item.info}`);
      console.log(`   错误: ${item.result.error}`);
      console.log(`   URL: ${item.url}`);
    });
  }
  
  console.log(`\n📁 所有文件保存在: ${downloadDir}/ 目录`);
  console.log('🎉 批量下载完成！');
}

// 运行批量下载
batchDownload().catch(error => {
  console.error('批量下载过程中发生错误:', error);
  process.exit(1);
});