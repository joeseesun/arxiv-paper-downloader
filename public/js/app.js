

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM加载完成，开始初始化...');
    
    // 检查表单是否存在
    const form = document.getElementById('urlForm');
    if (form) {
        console.log('找到表单元素');
    } else {
        console.error('未找到表单元素');
    }
    

    
    // 绑定表单提交事件
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
        console.log('表单事件监听器已绑定');
    } else {
        console.error('无法绑定表单事件：表单元素不存在');
    }
    
    console.log('初始化完成');
});

// URL提取函数
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

// 表单提交处理函数
async function handleFormSubmit(e) {
    console.log('表单提交事件触发');
    e.preventDefault();
    
    const inputText = document.getElementById('urls').value.trim();
    console.log('输入的文本:', inputText);
    if (!inputText) {
        console.log('输入为空，返回');
        return;
    }
    
    // 自动提取URL
    const extractedUrls = extractUrlsFromText(inputText);
    console.log('提取到的URLs:', extractedUrls);
    
    if (extractedUrls.length === 0) {
        alert('未在输入文本中找到有效的URL链接');
        return;
    }
    
    // 如果提取到的URL数量与输入行数不同，显示提取结果
    const inputLines = inputText.split('\n').filter(line => line.trim()).length;
    if (extractedUrls.length !== inputLines) {
        const confirmMsg = `从输入文本中提取到 ${extractedUrls.length} 个URL：\n\n${extractedUrls.slice(0, 5).join('\n')}${extractedUrls.length > 5 ? '\n...' : ''}\n\n是否继续处理这些URL？`;
        if (!confirm(confirmMsg)) {
            return;
        }
    }
    
    const urlList = extractedUrls;
    const submitBtn = document.getElementById('submitBtn');
    const loading = document.getElementById('loading');
    const result = document.getElementById('result');
    
    // 显示加载状态
    submitBtn.disabled = true;
    loading.style.display = 'block';
    result.style.display = 'none';
    
    try {
        // 直接使用服务端处理
        const data = await processServerSide(urlList);
        
        // 检查是否是arXiv相关结果
        if (data.type === 'arxiv_list_extracted') {
            showArxivListResult(data, loading, result);
        } else if (data.type === 'arxiv_batch_download') {
            showArxivBatchResult(data, loading, result);
        } else {
            showFinalResult(data, loading, result);
        }
        
    } catch (error) {
        console.error('处理过程中出错:', error);
        loading.style.display = 'none';
        result.style.display = 'block';
        result.className = 'result error';
        
        let errorMessage = '未知错误';
        if (error && error.message) {
            errorMessage = error.message;
        } else if (typeof error === 'string') {
            errorMessage = error;
        } else if (error) {
            errorMessage = JSON.stringify(error);
        }
        
        result.innerHTML = '<h3>❌ 处理失败</h3><p>' + errorMessage + '</p>';
    } finally {
        submitBtn.disabled = false;
    }
}





function clearUrls() {
    document.getElementById('urls').value = '';
}

// 打赏Modal功能
function openDonateModal() {
    document.getElementById('donateModal').style.display = 'block';
    document.body.style.overflow = 'hidden'; // 防止背景滚动
}

function closeDonateModal() {
    document.getElementById('donateModal').style.display = 'none';
    document.body.style.overflow = 'auto'; // 恢复滚动
}

// 点击modal背景关闭
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('donateModal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeDonateModal();
            }
        });
    }
    
    // ESC键关闭modal
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeDonateModal();
        }
    });
});

// 增强的进度显示
function showProgress(current, total) {
    const loading = document.getElementById('loading');
    const progressHtml = '<div class="spinner"></div>' +
        '<p>正在处理中，请稍候...</p>' +
        '<div class="progress-info">' +
            '<div>进度: ' + current + '/' + total + ' (' + Math.round(current/total*100) + '%)</div>' +
            '<div class="progress-bar">' +
                '<div class="progress-fill" style="width: ' + (current/total*100) + '%"></div>' +
            '</div>' +
        '</div>';
    loading.innerHTML = progressHtml;
}



// 服务端处理
async function processServerSide(urlList) {
    try {
        const response = await fetch('/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ urls: urlList })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // 检查服务器返回的错误
        if (!data.success && data.error) {
            throw new Error(data.error);
        }
        
        return data;
    } catch (error) {
        console.error('服务端处理错误:', error);
        throw error;
    }
}

// 显示arXiv列表提取结果
function showArxivListResult(data, loading, result) {
    loading.style.display = 'none';
    result.style.display = 'block';
    result.className = 'result success';
    
    const arxivResult = data.results.find(r => r.type === 'arxiv_list');
    
    if (arxivResult && arxivResult.success) {
        let html = '<h3>📋 arXiv论文列表 (共 ' + arxivResult.extractedCount + ' 篇)</h3>';
        
        // 操作按钮
        html += '<div style="margin: 20px 0; display: flex; gap: 12px;">';
        html += '<button class="btn" onclick="batchDownloadDirectPdfs()">一键下载全部PDF</button>';
        html += '<button class="btn btn-secondary" onclick="copyExtractedLinks()">复制所有链接</button>';
        html += '</div>';
        
        // 论文列表
        html += '<div class="paper-list">';
        html += '<h4>论文列表：</h4>';
        
        const papersWithInfo = arxivResult.papersWithInfo || [];
        const papers = arxivResult.papers || [];
        
        papers.forEach((paperUrl, index) => {
            // 获取论文信息
            const paperInfo = papersWithInfo[index];
            const paperTitle = paperInfo ? paperInfo.title : `论文 ${paperUrl.match(/\/abs\/([0-9]{4}\.[0-9]{4,5})/)?.[1] || 'Unknown'}`;
            const pdfUrl = paperInfo ? paperInfo.pdfUrl : paperUrl.replace('/abs/', '/pdf/') + '.pdf';
            
            html += '<div class="paper-item" data-url="' + paperUrl + '" data-pdf-url="' + pdfUrl + '" data-index="' + index + '">';
            html += '<div class="paper-info">';
            html += '<div class="paper-title">' + paperTitle + '</div>';
            html += '<div class="paper-url">' + paperUrl + '</div>';
            html += '</div>';
            html += '<div class="paper-actions">';
            html += '<button class="btn-small" onclick="downloadDirectPdf(\'' + pdfUrl + '\', ' + index + ')">直接下载PDF</button>';
            html += '</div>';
            html += '<div class="paper-status" id="status-' + index + '"></div>';
            html += '</div>';
        });
        
        html += '</div>';
        
        // 批量下载进度区域
        html += '<div id="batchProgress" style="display: none; margin-top: 20px;">';
        html += '<h4>下载进度</h4>';
        html += '<div class="progress-bar-container">';
        html += '<div class="progress-bar" id="progressBar"></div>';
        html += '</div>';
        html += '<div id="progressText">准备下载...</div>';
        html += '<div id="downloadResults"></div>';
        html += '</div>';
        
        result.innerHTML = html;
        
        // 存储提取的论文链接
        window.extractedPapers = arxivResult.papers;
        window.extractedPapersInfo = arxivResult.papersWithInfo || [];
    } else {
        result.className = 'result error';
        result.innerHTML = '<h3>❌ 提取失败</h3><p>无法从页面中提取论文链接</p>';
    }
}

function showExtractedLinks() {
    const linksDiv = document.getElementById('extractedLinks');
    if (linksDiv.style.display === 'none') {
        linksDiv.style.display = 'block';
    } else {
        linksDiv.style.display = 'none';
    }
}

function copyExtractedLinks() {
    if (window.extractedPapersInfo && window.extractedPapersInfo.length > 0) {
        // 复制PDF直接下载链接
        const pdfLinks = window.extractedPapersInfo.map(paper => paper.pdfUrl);
        navigator.clipboard.writeText(pdfLinks.join('\n')).then(() => {
            alert('PDF下载链接已复制到剪贴板！');
        });
    } else if (window.extractedPapers) {
        // 降级方案：转换为PDF链接
        const pdfLinks = window.extractedPapers.map(url => url.replace('/abs/', '/pdf/') + '.pdf');
        navigator.clipboard.writeText(pdfLinks.join('\n')).then(() => {
            alert('PDF下载链接已复制到剪贴板！');
        });
    }
}

// 直接下载PDF（让用户选择保存位置）
async function downloadDirectPdf(pdfUrl, index) {
    const statusEl = document.getElementById('status-' + index);
    const btnEl = document.querySelector(`[onclick="downloadDirectPdf('${pdfUrl}', ${index})"]`);
    
    try {
        statusEl.textContent = '下载中...';
        statusEl.style.color = '#1a1a1a';
        btnEl.disabled = true;
        
        // 使用服务器代理下载PDF
        const proxyUrl = `/download-pdf?url=${encodeURIComponent(pdfUrl)}`;
        
        // 创建一个隐藏的链接来触发下载
        const link = document.createElement('a');
        link.href = proxyUrl;
        link.download = ''; // 让服务器决定文件名
        
        // 添加到DOM并点击
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        statusEl.innerHTML = '<span style="color: #22c55e;">✅ 下载已开始</span>';
        
    } catch (error) {
        console.error('下载错误:', error);
        statusEl.textContent = '❌ 下载失败';
        statusEl.style.color = '#ef4444';
    } finally {
        btnEl.disabled = false;
    }
}

// 单个论文下载（通过服务器）
async function downloadSinglePaper(url, index) {
    const statusEl = document.getElementById('status-' + index);
    const btnEl = document.querySelector(`[onclick="downloadSinglePaper('${url}', ${index})"]`);
    
    try {
        statusEl.textContent = '下载中...';
        statusEl.style.color = '#1a1a1a';
        btnEl.disabled = true;
        
        const response = await fetch('/process', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ urls: [url] })
        });
        
        const data = await response.json();
        
        if (data.success && data.results[0].success) {
            statusEl.innerHTML = '<a href="/downloads/' + data.results[0].filename + '" download style="color: #22c55e; text-decoration: none;">✅ 下载</a>';
        } else {
            statusEl.textContent = '❌ 失败';
            statusEl.style.color = '#ef4444';
        }
    } catch (error) {
        statusEl.textContent = '❌ 错误';
        statusEl.style.color = '#ef4444';
    } finally {
        btnEl.disabled = false;
    }
}

// 批量直接下载PDF
async function batchDownloadDirectPdfs() {
    if (!window.extractedPapersInfo || window.extractedPapersInfo.length === 0) {
        alert('没有可下载的论文链接');
        return;
    }
    
    const batchBtn = document.querySelector('[onclick="batchDownloadDirectPdfs()"]');
    batchBtn.disabled = true;
    batchBtn.textContent = '下载中...';
    
    try {
        // 逐个触发PDF下载
        for (let i = 0; i < window.extractedPapersInfo.length; i++) {
            const paper = window.extractedPapersInfo[i];
            
            // 使用服务器代理下载PDF
            const proxyUrl = `/download-pdf?url=${encodeURIComponent(paper.pdfUrl)}`;
            
            // 创建下载链接
            const link = document.createElement('a');
            link.href = proxyUrl;
            link.download = ''; // 让服务器决定文件名
            
            // 触发下载
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // 更新状态
            const statusEl = document.getElementById('status-' + i);
            if (statusEl) {
                statusEl.innerHTML = '<span style="color: #22c55e;">✅ 下载已开始</span>';
            }
            
            // 添加延迟避免浏览器阻止多个下载
            if (i < window.extractedPapersInfo.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 800));
            }
        }
        
        alert(`已触发 ${window.extractedPapersInfo.length} 个PDF下载，请检查浏览器下载文件夹`);
        
    } catch (error) {
        alert('批量下载失败: ' + error.message);
    } finally {
        batchBtn.disabled = false;
        batchBtn.textContent = '一键下载全部PDF';
    }
}

// 批量下载论文（通过服务器）
async function batchDownloadPapers() {
    if (!window.extractedPapers || window.extractedPapers.length === 0) {
        alert('没有可下载的论文链接');
        return;
    }
    
    const progressDiv = document.getElementById('batchProgress');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const resultsDiv = document.getElementById('downloadResults');
    
    // 显示进度区域
    progressDiv.style.display = 'block';
    progressBar.style.width = '0%';
    progressText.textContent = '准备下载...';
    resultsDiv.innerHTML = '';
    
    // 禁用批量下载按钮
    const batchBtn = document.querySelector('[onclick="batchDownloadPapers()"]');
    batchBtn.disabled = true;
    batchBtn.textContent = '下载中...';
    
    try {
        // 使用SSE进行批量下载
        const response = await fetch('/batch-download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ urls: window.extractedPapers })
        });
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        handleBatchDownloadEvent(data, progressBar, progressText, resultsDiv);
                    } catch (e) {
                        console.error('解析SSE数据失败:', e);
                    }
                }
            }
        }
        
    } catch (error) {
        progressText.textContent = '下载失败: ' + error.message;
        progressText.style.color = '#ef4444';
    } finally {
        batchBtn.disabled = false;
        batchBtn.textContent = '一键下载全部';
    }
}

// 处理批量下载事件
function handleBatchDownloadEvent(data, progressBar, progressText, resultsDiv) {
    switch (data.type) {
        case 'progress':
            const progress = (data.current / data.total) * 100;
            progressBar.style.width = progress + '%';
            progressText.textContent = data.message;
            break;
            
        case 'result':
            // 更新单个论文的状态
            const statusEl = document.getElementById('status-' + data.index);
            if (statusEl) {
                if (data.result.success) {
                    statusEl.innerHTML = '<a href="/downloads/' + data.result.filename + '" download style="color: #22c55e; text-decoration: none;">✅ 下载</a>';
                } else {
                    statusEl.textContent = '❌ 失败';
                    statusEl.style.color = '#ef4444';
                }
            }
            break;
            
        case 'complete':
            progressBar.style.width = '100%';
            progressText.textContent = `下载完成！成功 ${data.successCount}/${data.total} 篇`;
            progressText.style.color = '#22c55e';
            
            // 显示汇总结果
            const successFiles = data.results.filter(r => r.success);
            if (successFiles.length > 0) {
                let html = '<h4 style="margin-top: 20px;">📁 下载完成的文件</h4>';
                html += '<ul class="file-list">';
                successFiles.forEach(file => {
                    html += '<li>';
                    html += '<span>' + (file.title || file.filename) + '</span>';
                    html += '<a href="/downloads/' + file.filename + '" class="download-link" download>下载</a>';
                    html += '</li>';
                });
                html += '</ul>';
                resultsDiv.innerHTML = html;
            }
            break;
            
        case 'error':
            progressText.textContent = '下载失败: ' + data.error;
            progressText.style.color = '#ef4444';
            break;
    }
}

// 显示arXiv批量下载结果
function showArxivBatchResult(data, loading, result) {
    loading.style.display = 'none';
    result.style.display = 'block';
    result.className = 'result success';
    
    let html = '<h3>📋 arXiv批量下载完成</h3>';
    html += `<p>从列表中提取 <strong>${data.extractedCount}</strong> 篇论文，成功下载 <strong>${data.downloadedCount}</strong> 篇PDF</p>`;
    
    // 显示下载的文件
    const downloadedFiles = data.results.filter(r => r.success && (r.type === 'direct_pdf' || r.arxivId));
    
    if (downloadedFiles.length > 0) {
        html += '<h4>📁 已下载的PDF文件</h4>';
        html += '<ul class="file-list">';
        downloadedFiles.forEach(file => {
            html += '<li>';
            html += '<span>' + (file.title || file.filename) + '</span>';
            html += '<a href="/downloads/' + file.filename + '" class="download-link" download>下载</a>';
            html += '</li>';
        });
        html += '</ul>';
    }
    
    // 显示失败的文件
    const failedFiles = data.results.filter(r => !r.success && r.url);
    if (failedFiles.length > 0) {
        html += '<h4>❌ 下载失败的论文</h4>';
        failedFiles.forEach(failed => {
            html += '<div style="margin-bottom: 8px; padding: 8px; background: #fef2f2; border-radius: 4px; font-size: 14px;">';
            html += '<strong>URL:</strong> ' + failed.url + '<br>';
            html += '<strong>错误:</strong> ' + failed.error;
            html += '</div>';
        });
    }
    
    result.innerHTML = html;
}

function showFinalResult(data, loading, result) {
    loading.style.display = 'none';
    result.style.display = 'block';
    
    const results = data.results || [];
    const successCount = data.successCount || results.filter(r => r.success).length;
    const total = data.total || results.length;
    
    if (data.success || successCount > 0) {
        result.className = 'result success';
        
        let html = '<h3>✅ 处理完成！</h3>';
        html += '<p>成功处理 ' + successCount + '/' + total + ' 个URL</p>';
        
        // 分类显示结果
        const downloadedFiles = results.filter(r => r.success && (r.type === 'direct_pdf' || r.type === 'webpage_pdf' || r.arxivId));
        const webpageAnalysis = results.filter(r => r.success && r.type === 'webpage_analysis');
        const failedResults = results.filter(r => !r.success);
        
        // 显示已下载的文件
        if (downloadedFiles.length > 0) {
            html += '<h4>📁 已下载的文件</h4>';
            html += '<ul class="file-list">';
            downloadedFiles.forEach(file => {
                html += '<li>' +
                    '<span>' + (file.title || file.filename) + '</span>' +
                    '<a href="/downloads/' + file.filename + '" class="download-link" download>下载</a>' +
                '</li>';
            });
            html += '</ul>';
        }
        
        // 显示网页分析结果
        if (webpageAnalysis.length > 0) {
            html += '<h4>🔍 网页分析结果</h4>';
            webpageAnalysis.forEach(analysis => {
                html += '<div style="margin-bottom: 16px; padding: 16px; background: #f8f9fa; border-radius: 6px; border-left: 4px solid #fbbf24;">';
                html += '<strong>' + analysis.title + '</strong><br>';
                html += '<div style="color: #666; margin: 8px 0;">' + analysis.message + '</div>';
                
                // 显示替代方案
                if (analysis.alternatives && analysis.alternatives.length > 0) {
                    html += '<div style="margin-top: 12px;">';
                    html += '<strong style="color: #1a1a1a;">建议的解决方案：</strong>';
                    html += '<ul style="margin: 8px 0; padding-left: 20px;">';
                    analysis.alternatives.forEach(alt => {
                        html += '<li style="margin: 4px 0; color: #374151;">' + alt + '</li>';
                    });
                    html += '</ul>';
                    html += '</div>';
                }
                
                // 显示PDF链接
                if (analysis.pdfLinks && analysis.pdfLinks.length > 0) {
                    html += '<div style="margin-top: 12px;">';
                    html += '<strong style="color: #1a1a1a;">发现的PDF文件：</strong>';
                    html += '<div style="margin-top: 8px;">';
                    analysis.pdfLinks.forEach(link => {
                        html += '<div style="margin: 4px 0;"><a href="' + link.url + '" target="_blank" style="color: #1a1a1a; text-decoration: underline; font-weight: 500;">' + link.text + '</a></div>';
                    });
                    html += '</div>';
                    html += '</div>';
                }
                
                html += '</div>';
            });
        }
        
        // 显示失败的结果
        if (failedResults.length > 0) {
            html += '<h4>❌ 处理失败</h4>';
            failedResults.forEach(failed => {
                html += '<div style="margin-bottom: 8px; padding: 8px; background: #fef2f2; border-radius: 4px; font-size: 14px;">';
                html += '<strong>URL:</strong> ' + failed.url + '<br>';
                html += '<strong>错误:</strong> ' + failed.error;
                if (failed.suggestion) {
                    html += '<br><strong>建议:</strong> ' + failed.suggestion;
                }
                html += '</div>';
            });
        }
        
        result.innerHTML = html;
    } else {
        result.className = 'result error';
        const errorMsg = data.error || '处理失败，请重试';
        result.innerHTML = '<h3>❌ 处理失败</h3><p>' + errorMsg + '</p>';
    }
}

// ========== 搜索功能 ==========

// 打开搜索弹窗
function openSearchModal() {
    const modal = document.getElementById('searchModal');
    const input = document.getElementById('searchKeyword');
    
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
    
    // 聚焦到输入框
    setTimeout(() => {
        input.focus();
    }, 100);
}

// 关闭搜索弹窗
function closeSearchModal() {
    const modal = document.getElementById('searchModal');
    const input = document.getElementById('searchKeyword');
    
    modal.classList.remove('show');
    document.body.style.overflow = 'auto';
    
    // 清空输入框
    input.value = '';
}

// 处理搜索输入框的回车键
function handleSearchKeyPress(event) {
    if (event.key === 'Enter') {
        performSearch();
    }
}

// 执行搜索
async function performSearch() {
    const input = document.getElementById('searchKeyword');
    const keyword = input.value.trim();
    
    if (!keyword) {
        alert('请输入搜索关键词');
        return;
    }
    
    // 构建arXiv搜索URL
    const searchUrl = `https://arxiv.org/search/?query=${encodeURIComponent(keyword)}&searchtype=all`;
    
    // 关闭搜索弹窗
    closeSearchModal();
    
    // 将搜索URL填入输入框
    const urlsTextarea = document.getElementById('urls');
    urlsTextarea.value = searchUrl;
    
    // 自动触发搜索
    try {
        // 显示加载状态
        const submitBtn = document.getElementById('submitBtn');
        const loading = document.getElementById('loading');
        const result = document.getElementById('result');
        
        submitBtn.disabled = true;
        loading.style.display = 'block';
        result.style.display = 'none';
        
        // 处理搜索URL
        const data = await processServerSide([searchUrl]);
        
        // 显示结果
        if (data.type === 'arxiv_list_extracted') {
            showArxivListResult(data, loading, result);
        } else {
            showFinalResult(data, loading, result);
        }
        
    } catch (error) {
        console.error('搜索失败:', error);
        
        const loading = document.getElementById('loading');
        const result = document.getElementById('result');
        
        loading.style.display = 'none';
        result.style.display = 'block';
        result.className = 'result error';
        result.innerHTML = '<h3>❌ 搜索失败</h3><p>' + (error.message || '未知错误') + '</p>';
    } finally {
        const submitBtn = document.getElementById('submitBtn');
        submitBtn.disabled = false;
    }
}

// 搜索弹窗事件监听
document.addEventListener('DOMContentLoaded', function() {
    const searchModal = document.getElementById('searchModal');
    
    // 点击背景关闭弹窗
    if (searchModal) {
        searchModal.addEventListener('click', function(e) {
            if (e.target === searchModal) {
                closeSearchModal();
            }
        });
    }
    
    // ESC键关闭搜索弹窗
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const modal = document.getElementById('searchModal');
            if (modal && modal.classList.contains('show')) {
                closeSearchModal();
            }
        }
    });
});