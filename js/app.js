// 主应用逻辑
class AudioUploaderApp {
    constructor() {
        this.files = [];
        this.isUploading = false;
        this.uploadedCount = 0;
        this.failedCount = 0;

        this.initializeElements();
        this.bindEvents();
        this.checkSupabaseConnection();
    }

    // 初始化DOM元素引用
    initializeElements() {
        this.dropzone = document.getElementById('dropzone');
        this.fileInput = document.getElementById('fileInput');
        this.filesSection = document.getElementById('filesSection');
        this.filesList = document.getElementById('filesList');
        this.clearBtn = document.getElementById('clearBtn');
        this.uploadBtn = document.getElementById('uploadBtn');
        this.progressSection = document.getElementById('progressSection');
        this.progressList = document.getElementById('progressList');
        this.overallProgress = document.getElementById('overallProgress');
        this.overallPercentage = document.getElementById('overallPercentage');
        this.resultsSection = document.getElementById('resultsSection');
        this.resultsSummary = document.getElementById('resultsSummary');
        this.resultsList = document.getElementById('resultsList');
        this.newUploadBtn = document.getElementById('newUploadBtn');
    }

    // 绑定事件监听器
    bindEvents() {
        // 文件拖拽事件
        this.dropzone.addEventListener('dragover', this.handleDragOver.bind(this));
        this.dropzone.addEventListener('dragenter', this.handleDragEnter.bind(this));
        this.dropzone.addEventListener('dragleave', this.handleDragLeave.bind(this));
        this.dropzone.addEventListener('drop', this.handleDrop.bind(this));

        // 点击上传区域选择文件
        this.dropzone.addEventListener('click', () => {
            this.fileInput.click();
        });

        // 文件选择事件
        this.fileInput.addEventListener('change', this.handleFileSelect.bind(this));

        // 按钮事件
        this.clearBtn.addEventListener('click', this.clearFiles.bind(this));
        this.uploadBtn.addEventListener('click', this.startUpload.bind(this));
        this.newUploadBtn.addEventListener('click', this.resetApp.bind(this));

        // 防止页面默认拖拽行为
        document.addEventListener('dragover', (e) => e.preventDefault());
        document.addEventListener('drop', (e) => e.preventDefault());
    }

    // 检查Supabase连接
    checkSupabaseConnection() {
        if (!window.supabaseClient) {
            this.showError('Supabase连接失败，请刷新页面重试');
        }
    }

    // 拖拽事件处理
    handleDragOver(e) {
        e.preventDefault();
        this.dropzone.classList.add('dragover');
    }

    handleDragEnter(e) {
        e.preventDefault();
        this.dropzone.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        // 只有当鼠标离开dropzone区域时才移除样式
        if (!this.dropzone.contains(e.relatedTarget)) {
            this.dropzone.classList.remove('dragover');
        }
    }

    handleDrop(e) {
        e.preventDefault();
        this.dropzone.classList.remove('dragover');

        const files = Array.from(e.dataTransfer.files);
        this.addFiles(files);
    }

    // 文件选择处理
    handleFileSelect(e) {
        const files = Array.from(e.target.files);
        this.addFiles(files);
        // 清空input以允许选择相同文件
        e.target.value = '';
    }

    // 添加文件到列表
    async addFiles(files) {
        const audioFiles = files.filter(file => {
            return window.AudioUtils.validateAudioFormat(file);
        });

        if (audioFiles.length === 0) {
            this.showError('请选择MP3或WAV格式的音频文件');
            return;
        }

        // 检查是否有超大文件
        const oversizedFiles = audioFiles.filter(file => !window.AudioUtils.validateFileSize(file));
        if (oversizedFiles.length > 0) {
            this.showError(`以下文件超过100MB限制：${oversizedFiles.map(f => f.name).join(', ')}`);
        }

        // 过滤掉超大文件
        const validFiles = audioFiles.filter(file => window.AudioUtils.validateFileSize(file));

        if (validFiles.length === 0) {
            return;
        }

        // 显示加载状态
        this.showMessage('正在处理文件...', 'info');

        try {
            // 异步处理文件信息
            for (const file of validFiles) {
                const fileInfo = await window.AudioUtils.createAudioFileInfo(file);
                this.files.push(fileInfo);
            }

            this.hideMessage();
            this.updateFilesDisplay();
            this.showFilesSection();

        } catch (error) {
            console.error('处理文件时出错:', error);
            this.showError('处理文件时出错，请重试');
        }
    }

    // 更新文件列表显示
    updateFilesDisplay() {
        this.filesList.innerHTML = '';

        this.files.forEach((fileInfo, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item fade-in';
            fileItem.innerHTML = `
                <div class="file-icon">
                    ${window.AudioUtils.getFileTypeIcon(fileInfo.name)}
                </div>
                <div class="file-info">
                    <div class="file-name">${fileInfo.name}</div>
                    <div class="file-details">
                        <span>${fileInfo.sizeFormatted}</span>
                        <span>${fileInfo.durationFormatted}</span>
                    </div>
                </div>
                <div class="file-status ${fileInfo.status}">${this.getStatusText(fileInfo.status)}</div>
                <button class="file-remove" onclick="audioApp.removeFile(${index})" title="移除文件">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"/>
                        <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                </button>
            `;

            this.filesList.appendChild(fileItem);
        });

        // 更新按钮状态
        this.uploadBtn.disabled = this.files.length === 0 || this.isUploading;
    }

    // 获取状态文本
    getStatusText(status) {
        const statusMap = {
            pending: '待上传',
            uploading: '上传中',
            success: '成功',
            error: '失败'
        };
        return statusMap[status] || status;
    }

    // 移除文件
    removeFile(index) {
        this.files.splice(index, 1);
        this.updateFilesDisplay();

        if (this.files.length === 0) {
            this.hideFilesSection();
        }
    }

    // 清空文件列表
    clearFiles() {
        this.files = [];
        this.updateFilesDisplay();
        this.hideFilesSection();
    }

    // 开始上传
    async startUpload() {
        if (this.files.length === 0 || this.isUploading) {
            return;
        }

        this.isUploading = true;
        this.uploadedCount = 0;
        this.failedCount = 0;

        // 显示进度区域
        this.showProgressSection();
        this.updateUploadButton();

        try {
            // 创建进度列表
            this.createProgressItems();

            // 依次上传文件
            for (let i = 0; i < this.files.length; i++) {
                const fileInfo = this.files[i];
                await this.uploadFile(fileInfo, i);
            }

            // 显示结果
            this.showResults();

        } catch (error) {
            console.error('上传过程中出错:', error);
            this.showError('上传过程中出错，请重试');
        } finally {
            this.isUploading = false;
            this.updateUploadButton();
        }
    }

    // 上传单个文件
    async uploadFile(fileInfo, index) {
        return new Promise(async (resolve, reject) => {
            try {
                // 更新状态为上传中
                fileInfo.status = 'uploading';
                this.updateProgressItem(index, fileInfo);

                // 生成唯一文件名
                const fileName = fileInfo.uniqueName;
                const filePath = `uploads/${fileName}`;

                // 上传到 Supabase Storage
                const { data, error } = await window.supabaseClient.storage
                    .from(window.SUPABASE_CONFIG.bucketName)
                    .upload(filePath, fileInfo.file, {
                        onUploadProgress: (progress) => {
                            const percentage = Math.round((progress.loaded / progress.total) * 100);
                            fileInfo.progress = percentage;
                            this.updateProgressItem(index, fileInfo);
                            this.updateOverallProgress();
                        }
                    });

                if (error) {
                    throw error;
                }

                // 获取公共URL
                const { data: { publicUrl } } = window.supabaseClient.storage
                    .from(window.SUPABASE_CONFIG.bucketName)
                    .getPublicUrl(filePath);

                fileInfo.uploadUrl = publicUrl;

                // 保存到数据库
                const { error: dbError } = await window.supabaseClient
                    .from('podcasts')
                    .insert({
                        title: fileInfo.name.replace(/\.[^/.]+$/, ''), // 移除文件扩展名作为标题
                        audio_url: publicUrl,
                        duration: fileInfo.duration,
                        status: 'published'
                    });

                if (dbError) {
                    console.error('数据库保存失败:', dbError);
                    // 即使数据库保存失败，文件仍然上传成功
                }

                // 更新为成功状态
                fileInfo.status = 'success';
                fileInfo.progress = 100;
                this.uploadedCount++;

            } catch (error) {
                console.error('文件上传失败:', error);
                fileInfo.status = 'error';
                fileInfo.error = error.message || '上传失败';
                this.failedCount++;
            }

            this.updateProgressItem(index, fileInfo);
            this.updateOverallProgress();
            resolve();
        });
    }

    // 创建进度项
    createProgressItems() {
        this.progressList.innerHTML = '';

        this.files.forEach((fileInfo, index) => {
            const progressItem = document.createElement('div');
            progressItem.className = 'progress-item';
            progressItem.id = `progress-${index}`;

            progressItem.innerHTML = `
                <div class="progress-item-info">
                    <div class="progress-item-name">${fileInfo.name}</div>
                    <div class="progress-item-status">准备上传...</div>
                </div>
                <div class="progress-item-bar">
                    <div class="progress-item-fill"></div>
                </div>
                <div class="progress-item-percentage">0%</div>
            `;

            this.progressList.appendChild(progressItem);
        });
    }

    // 更新进度项
    updateProgressItem(index, fileInfo) {
        const progressItem = document.getElementById(`progress-${index}`);
        if (!progressItem) return;

        const statusElement = progressItem.querySelector('.progress-item-status');
        const fillElement = progressItem.querySelector('.progress-item-fill');
        const percentageElement = progressItem.querySelector('.progress-item-percentage');

        // 更新状态文本
        let statusText = this.getStatusText(fileInfo.status);
        if (fileInfo.status === 'error' && fileInfo.error) {
            statusText = fileInfo.error;
        } else if (fileInfo.status === 'uploading') {
            statusText = '上传中...';
        }

        statusElement.textContent = statusText;

        // 更新进度条
        fillElement.style.width = `${fileInfo.progress}%`;
        fillElement.className = `progress-item-fill ${fileInfo.status}`;

        // 更新百分比
        percentageElement.textContent = `${fileInfo.progress}%`;
        percentageElement.className = `progress-item-percentage ${fileInfo.status}`;
    }

    // 更新总体进度
    updateOverallProgress() {
        const completedFiles = this.files.filter(f => f.status === 'success' || f.status === 'error').length;
        const totalProgress = Math.round((completedFiles / this.files.length) * 100);

        this.overallProgress.style.width = `${totalProgress}%`;
        this.overallPercentage.textContent = `${totalProgress}%`;
    }

    // 显示结果
    showResults() {
        // 创建结果摘要
        this.resultsSummary.innerHTML = `
            <div class="summary-item">
                <div class="summary-number success">${this.uploadedCount}</div>
                <div class="summary-label">成功</div>
            </div>
            <div class="summary-item">
                <div class="summary-number error">${this.failedCount}</div>
                <div class="summary-label">失败</div>
            </div>
        `;

        // 创建结果列表
        this.resultsList.innerHTML = '';

        this.files.forEach(fileInfo => {
            const resultItem = document.createElement('div');
            resultItem.className = 'result-item';

            const iconClass = fileInfo.status === 'success' ? 'success' : 'error';
            const iconSvg = fileInfo.status === 'success'
                ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20,6 9,17 4,12"/></svg>'
                : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';

            const message = fileInfo.status === 'success'
                ? '上传成功'
                : (fileInfo.error || '上传失败');

            resultItem.innerHTML = `
                <div class="result-icon ${iconClass}">
                    ${iconSvg}
                </div>
                <div class="result-info">
                    <div class="result-name">${fileInfo.name}</div>
                    <div class="result-message">${message}</div>
                </div>
            `;

            this.resultsList.appendChild(resultItem);
        });

        // 显示结果区域和重新上传按钮
        this.showResultsSection();
        this.newUploadBtn.style.display = 'inline-flex';
    }

    // 重置应用
    resetApp() {
        this.files = [];
        this.isUploading = false;
        this.uploadedCount = 0;
        this.failedCount = 0;

        this.hideFilesSection();
        this.hideProgressSection();
        this.hideResultsSection();
        this.newUploadBtn.style.display = 'none';
        this.hideMessage();

        this.updateUploadButton();
    }

    // UI控制方法
    showFilesSection() {
        this.filesSection.style.display = 'block';
        this.filesSection.classList.add('fade-in');
    }

    hideFilesSection() {
        this.filesSection.style.display = 'none';
    }

    showProgressSection() {
        this.progressSection.style.display = 'block';
        this.progressSection.classList.add('fade-in');
    }

    hideProgressSection() {
        this.progressSection.style.display = 'none';
    }

    showResultsSection() {
        this.resultsSection.style.display = 'block';
        this.resultsSection.classList.add('fade-in');
    }

    hideResultsSection() {
        this.resultsSection.style.display = 'none';
    }

    updateUploadButton() {
        if (this.isUploading) {
            this.uploadBtn.textContent = '上传中...';
            this.uploadBtn.disabled = true;
            this.uploadBtn.classList.add('loading');
        } else {
            this.uploadBtn.textContent = '开始上传';
            this.uploadBtn.disabled = this.files.length === 0;
            this.uploadBtn.classList.remove('loading');
        }
    }

    // 消息显示
    showError(message) {
        this.showMessage(message, 'error');
    }

    showSuccess(message) {
        this.showMessage(message, 'success');
    }

    showMessage(message, type = 'info') {
        // 移除现有消息
        this.hideMessage();

        const messageElement = document.createElement('div');
        messageElement.className = `${type}-message fade-in`;
        messageElement.textContent = message;
        messageElement.id = 'app-message';

        // 插入到第一个section之前
        const firstSection = document.querySelector('.upload-section');
        firstSection.parentNode.insertBefore(messageElement, firstSection);

        // 3秒后自动隐藏（除了错误消息）
        if (type !== 'error') {
            setTimeout(() => {
                this.hideMessage();
            }, 3000);
        }
    }

    hideMessage() {
        const existingMessage = document.getElementById('app-message');
        if (existingMessage) {
            existingMessage.remove();
        }
    }
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    window.audioApp = new AudioUploaderApp();
});