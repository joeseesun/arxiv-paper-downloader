// 测试URL提取功能
function extractUrlsFromText(text) {
    // 支持多种URL格式的正则表达式
    const urlRegex = /(?:https?:\/\/|www\.)[^\s\|\`\(\)\[\]<>]+/gi;
    
    // 提取所有匹配的URL
    const matches = text.match(urlRegex) || [];
    
    // 清理和验证URL
    const validUrls = matches.map(url => {
        // 移除末尾的标点符号
        url = url.replace(/[.,;:!?)\]}>]+$/, '');
        
        // 如果URL以www开头但没有协议，添加https://
        if (url.startsWith('www.')) {
            url = 'https://' + url;
        }
        
        return url;
    }).filter(url => {
        // 验证URL格式
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    });
    
    // 去重
    return [...new Set(validUrls)];
}

// 测试文本
const testText = `
## 第一部分：模型的范式变迁（Model Paradigm Shift）

- **Brook for GPU (2004 年 8 月)**：该论文提出了一个针对 GPU 的高级编程框架

### 第一部分论文链接汇总

|论文名称|发表时间|可下载链接|
|---|---|---|
|Brook for GPU|2004-08| \`https://graphics.stanford.edu/papers/brook/brook.pdf\` |
|AlexNet|2012-10| \`https://papers.nips.cc/paper/2012/file/6c1b2dbf.txt\`  (或 arXiv: \`https://arxiv.org/abs/1409.0575\` )|
|Sequence to Sequence|2014-09| \`https://arxiv.org/abs/1409.3215\` |
|Distilling|2015-03| \`https://arxiv.org/abs/1503.02531\` |
|ResNet|2015-12| \`https://arxiv.org/abs/1512.03385\` |
|Transformer|2017-06| \`https://arxiv.org/abs/1706.03762\` |
`;

// 执行测试
const extractedUrls = extractUrlsFromText(testText);
console.log('提取到的URL数量:', extractedUrls.length);
console.log('提取到的URLs:');
extractedUrls.forEach((url, index) => {
    console.log(`${index + 1}. ${url}`);
});