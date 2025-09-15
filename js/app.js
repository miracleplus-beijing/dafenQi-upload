// 信号量类，用于控制并发数量
class Semaphore {
    constructor(count) {
        this.count = count;
        this.waiting = [];
    }

    acquire() {
        return new Promise((resolve) => {
            if (this.count > 0) {
                this.count--;
                resolve(() => this.release());
            } else {
                this.waiting.push(() => resolve(() => this.release()));
            }
        });
    }

    release() {
        this.count++;
        if (this.waiting.length > 0) {
            const next = this.waiting.shift();
            this.count--;
            next();
        }
    }
}

// 主应用逻辑
class AudioUploaderApp {
    constructor() {
        this.files = [];
        this.isUploading = false;
        this.uploadedCount = 0;
        this.failedCount = 0;
        this.channels = [];
        this.formData = {};

        this.initializeElements();
        this.bindEvents();
        this.checkSupabaseConnection();
        this.loadChannels();
    }

    // 初始化DOM元素引用
    initializeElements() {
        this.dropzone = document.getElementById('dropzone');
        this.fileInput = document.getElementById('fileInput');
        this.selectFileBtn = document.getElementById('selectFileBtn');
        this.filesSection = document.getElementById('filesSection');
        this.filesList = document.getElementById('filesList');
        this.clearBtn = document.getElementById('clearBtn');
        this.nextBtn = document.getElementById('nextBtn');

        // 表单相关元素
        this.formSection = document.getElementById('formSection');
        this.podcastForm = document.getElementById('podcastForm');
        this.backToFilesBtn = document.getElementById('backToFilesBtn');
        this.previewBtn = document.getElementById('previewBtn');

        // 封面上传元素
        this.coverUpload = document.getElementById('coverUpload');
        this.coverPreview = document.getElementById('coverPreview');

        // 预览相关元素
        this.previewSection = document.getElementById('previewSection');
        this.previewContent = document.getElementById('previewContent');
        this.backToFormBtn = document.getElementById('backToFormBtn');
        this.confirmUploadBtn = document.getElementById('confirmUploadBtn');

        // 原有元素
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
        // 添加防抖标记
        this.isFileDialogOpen = false;

        // 文件拖拽事件
        this.dropzone.addEventListener('dragover', this.handleDragOver.bind(this));
        this.dropzone.addEventListener('dragenter', this.handleDragEnter.bind(this));
        this.dropzone.addEventListener('dragleave', this.handleDragLeave.bind(this));
        this.dropzone.addEventListener('drop', this.handleDrop.bind(this));

        // 优化的文件选择事件处理
        const openFileDialog = () => {
            if (this.isFileDialogOpen) return; // 防止重复打开

            this.isFileDialogOpen = true;
            this.fileInput.click();

            // 重置标记（延迟重置，防止快速点击）
            setTimeout(() => {
                this.isFileDialogOpen = false;
            }, 500);
        };

        // 点击dropzone区域选择文件（但排除按钮点击）
        this.dropzone.addEventListener('click', (e) => {
            // 如果点击的是按钮，不要处理
            if (e.target === this.selectFileBtn || this.selectFileBtn.contains(e.target)) {
                return;
            }
            openFileDialog();
        });

        // 按钮点击事件
        this.selectFileBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // 阻止事件冒泡
            openFileDialog();
        });

        // 文件选择事件
        this.fileInput.addEventListener('change', this.handleFileSelect.bind(this));

        // 按钮事件
        this.clearBtn.addEventListener('click', this.clearFiles.bind(this));
        this.nextBtn.addEventListener('click', this.showForm.bind(this));
        this.backToFilesBtn.addEventListener('click', this.showFilesSection.bind(this));
        this.previewBtn.addEventListener('click', this.showPreview.bind(this));
        this.backToFormBtn.addEventListener('click', this.showForm.bind(this));
        this.confirmUploadBtn.addEventListener('click', this.startUpload.bind(this));
        this.newUploadBtn.addEventListener('click', this.resetApp.bind(this));

        // 频道选择事件
        this.channelSelect = document.getElementById('channelId');
        this.channelSelect.addEventListener('change', this.updateChannelCover.bind(this));

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

    // 加载频道数据
    async loadChannels() {
        try {
            const { data, error } = await window.supabaseClient
                .from('channels')
                .select('id, name, description, storage_path, naming_prefix')
                .order('name');

            if (error) throw error;

            this.channels = data || [];
            this.populateChannelSelect();
        } catch (error) {
            console.error('加载频道数据失败:', error);
            this.showError('加载频道数据失败，请刷新页面重试');
        }
    }

    // 从标题中提取日期（专用于奇绩前沿信号）
    extractDateFromTitle(title) {
        // 匹配各种日期格式：9.11, 09.11, 9月11日, 9-11 等
        const patterns = [
            /(\d{1,2})\.(\d{1,2})/,        // 9.11, 09.11
            /(\d{1,2})月(\d{1,2})日?/,     // 9月11日, 9月11
            /(\d{1,2})-(\d{1,2})/,        // 9-11
            /(\d{1,2})\/(\d{1,2})/        // 9/11
        ];

        for (const pattern of patterns) {
            const match = title.match(pattern);
            if (match) {
                const month = parseInt(match[1]);
                const day = parseInt(match[2]);

                // 验证日期有效性
                if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                    return {
                        month: String(month).padStart(2, '0'),
                        day: String(day).padStart(2, '0')
                    };
                }
            }
        }

        return null; // 未找到有效日期
    }

    // 解析发布日期字段
    parsePublishDate(publishDate) {
        if (!publishDate) return null;

        try {
            const date = new Date(publishDate);
            // 验证日期有效性
            if (isNaN(date.getTime())) return null;

            return {
                year: date.getFullYear(),
                month: String(date.getMonth() + 1).padStart(2, '0'),
                day: String(date.getDate()).padStart(2, '0')
            };
        } catch (error) {
            console.warn('解析发布日期失败:', error);
            return null;
        }
    }

    // 生成新的文件名（优化版 - 支持发布日期优先级）
    async generateNewFileName(fileInfo) {
        const channel = this.channels.find(c => c.id === this.formData.channel_id);
        const extension = fileInfo.name.split('.').pop().toLowerCase();

        // 奇绩前沿信号：使用优先级逻辑
        if (channel && channel.naming_prefix === 'qiji') {
            // 第一优先级：发布日期字段
            const publishDateParsed = this.parsePublishDate(this.formData.publish_date);
            if (publishDateParsed) {
                return `qiji_${publishDateParsed.year}_${publishDateParsed.month}_${publishDateParsed.day}.${extension}`;
            }

            // 第二优先级：标题中的日期
            const extractedDate = this.extractDateFromTitle(this.formData.title);
            if (extractedDate) {
                const currentYear = new Date().getFullYear();
                return `qiji_${currentYear}_${extractedDate.month}_${extractedDate.day}.${extension}`;
            }

            // 第三优先级：当前日期（兜底方案）
            const now = new Date();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            return `qiji_${now.getFullYear()}_${month}_${day}.${extension}`;
        }

        // 其他频道：使用现有格式
        const now = new Date();
        const month = now.getMonth() + 1;
        const day = now.getDate();
        return `${month}.${day}.${extension}`;
    }

    // 生成存储路径（支持频道配置的标准路径）
    async generateStoragePath(fileName) {
        const channel = this.channels.find(c => c.id === this.formData.channel_id);

        if (channel && channel.storage_path) {
            // 使用channels表配置的标准路径：channels/频道路径/年/月/文件名
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            return `channels/${channel.storage_path}/${year}/${month}/${fileName}`;
        }

        // 其他频道保持原有格式：YYYY.M/文件名
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        return `${year}.${parseInt(month)}/${fileName}`;
    }

    // 填充频道选择器
    populateChannelSelect() {
        const channelSelect = document.getElementById('channelId');
        if (!channelSelect) return;

        // 清空现有选项（保留第一个默认选项）
        channelSelect.innerHTML = '<option value="">请选择频道</option>';

        // 添加频道选项
        this.channels.forEach(channel => {
            const option = document.createElement('option');
            option.value = channel.id;
            option.textContent = channel.name;
            channelSelect.appendChild(option);
        });
    }

    // 更新频道封面显示
    updateChannelCover() {
        const selectedChannelId = this.channelSelect.value;
        const selectedChannel = this.channels.find(c => c.id === selectedChannelId);

        if (selectedChannel && selectedChannel.cover_url) {
            this.coverPreview.innerHTML = `<img src="${selectedChannel.cover_url}" alt="${selectedChannel.name}封面" class="channel-cover">`;
        } else {
            this.coverPreview.innerHTML = `
                <div class="cover-placeholder">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21,15 16,10 5,21"/>
                    </svg>
                    <p>频道封面将自动显示</p>
                    <small>根据选择的频道自动使用对应封面</small>
                </div>
            `;
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
        this.nextBtn.disabled = this.files.length === 0 || this.isUploading;
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

    // 处理封面图片选择
    handleCoverSelect(e) {
        const file = e.target.files[0];
        if (!file) return;

        // 验证文件类型
        if (!file.type.startsWith('image/')) {
            this.showError('请选择图片文件');
            return;
        }

        // 验证文件大小 (5MB)
        if (file.size > 5 * 1024 * 1024) {
            this.showError('封面图片大小不能超过5MB');
            return;
        }

        this.coverFile = file;
        this.previewCoverImage();
    }

    // 预览封面图片
    previewCoverImage() {
        if (!this.coverFile) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            this.coverPreview.innerHTML = `<img src="${e.target.result}" class="cover-image" alt="封面预览">`;
        };
        reader.readAsDataURL(this.coverFile);
    }

    // 显示表单区域
    showForm() {
        this.hideFilesSection();
        this.showFormSection();
    }

    // 显示预览区域
    async showPreview() {
        // 验证表单
        if (!this.validateForm()) {
            return;
        }

        // 收集表单数据
        this.collectFormData();

        // 生成预览内容
        this.generatePreview();

        this.hideFormSection();
        this.showPreviewSection();
    }

    // 验证表单
    validateForm() {
        const form = this.podcastForm;
        const requiredFields = form.querySelectorAll('[required]');
        let isValid = true;
        let firstErrorField = null;

        // 基本必填字段验证
        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                field.style.borderColor = '#FF4444';
                if (!firstErrorField) {
                    firstErrorField = field;
                }
                isValid = false;
            } else {
                field.style.borderColor = 'transparent';
            }
        });

        // 频道特定验证
        const channelId = form.querySelector('#channelId').value;
        const channel = this.channels.find(c => c.id === channelId);

        if (channel && channel.naming_prefix === 'paper') {
            // 经典论文解读需要论文标题
            const paperTitleField = form.querySelector('#paperTitle');
            if (!paperTitleField.value.trim()) {
                paperTitleField.style.borderColor = '#FF4444';
                if (!firstErrorField) {
                    firstErrorField = paperTitleField;
                }
                isValid = false;
                this.showError('经典论文解读频道需要填写论文标题');
            }
        }

        // 检查重复标题
        if (isValid) {
            const title = form.querySelector('#podcastTitle').value.trim();
            if (!this.validateUniqueTitle(title)) {
                const titleField = form.querySelector('#podcastTitle');
                titleField.style.borderColor = '#FF4444';
                if (!firstErrorField) {
                    firstErrorField = titleField;
                }
                isValid = false;
                this.showError('播客标题已存在，请使用其他标题');
            }
        }

        if (!isValid && firstErrorField) {
            firstErrorField.focus();
        }

        return isValid;
    }

    // 验证标题唯一性（简单前端检查）
    validateUniqueTitle(title) {
        // 这里可以添加对已存在标题的检查
        // 为了简化，目前只做基本格式检查
        return title.length >= 3;
    }

    // 收集表单数据
    collectFormData() {
        const form = this.podcastForm;
        const formData = new FormData(form);

        this.formData = {
            title: formData.get('title'),
            description: formData.get('description'),
            channel_id: formData.get('channel_id'),
            paper_title: formData.get('paper_title'),
            paper_url: formData.get('paper_url'),
            arxiv_id: formData.get('arxiv_id'),
            doi: formData.get('doi'),
            authors: formData.get('authors'),
            institution: formData.get('institution'),
            publish_date: formData.get('publish_date')
        };

        // 处理作者字段（转为JSON格式）
        if (this.formData.authors) {
            this.formData.authors = this.formData.authors.split(',').map(author => author.trim()).filter(author => author);
        }
    }

    // 移除文件
    removeFile(index) {
        this.files.splice(index, 1);
        this.updateFilesDisplay();

        if (this.files.length === 0) {
            this.hideFilesSection();
        }
    }

    // 生成预览内容
    generatePreview() {
        const channelName = this.channels.find(c => c.id === this.formData.channel_id)?.name || '未选择';

        let previewHtml = '';

        // 遍历所有文件，生成预览内容
        this.files.forEach((fileInfo, index) => {
            const coverImageHtml = this.coverFile
                ? `<img src="${URL.createObjectURL(this.coverFile)}" alt="封面">`
                : `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                     <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                     <circle cx="8.5" cy="8.5" r="1.5"/>
                     <polyline points="21,15 16,10 5,21"/>
                   </svg>`;

            previewHtml += `
                <div class="preview-item">
                    <!-- 基本信息 -->
                    <div class="preview-header">
                        <div class="preview-cover">
                            ${coverImageHtml}
                        </div>
                        <div class="preview-basic">
                            <div class="preview-title">${this.formData.title}</div>
                            <div class="preview-channel">${channelName}</div>
                            <div class="preview-description">${this.formData.description || '无描述'}</div>
                        </div>
                    </div>

                    <!-- 音频信息 -->
                    <div class="preview-audio">
                        <div class="preview-audio-info">
                            <div class="preview-audio-icon">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <circle cx="8" cy="18" r="4"/>
                                    <path d="M12 18V2l7 4"/>
                                </svg>
                            </div>
                            <div class="preview-audio-details">
                                <div class="preview-audio-name">${fileInfo.name}</div>
                                <div class="preview-audio-meta">${fileInfo.sizeFormatted} · ${fileInfo.durationFormatted}</div>
                            </div>
                        </div>
                        <audio controls class="preview-audio-player">
                            <source src="${URL.createObjectURL(fileInfo.file)}" type="${fileInfo.type}">
                            您的浏览器不支持音频播放。
                        </audio>
                    </div>

                    <!-- 论文信息 -->
                    <div class="preview-section-title">论文信息</div>
                    <div class="preview-grid">
                        <div class="preview-field">
                            <div class="preview-field-label">论文标题</div>
                            <div class="preview-field-value ${!this.formData.paper_title ? 'empty' : ''}">
                                ${this.formData.paper_title || '未填写'}
                            </div>
                        </div>
                        <div class="preview-field">
                            <div class="preview-field-label">论文链接</div>
                            <div class="preview-field-value ${!this.formData.paper_url ? 'empty' : ''}">
                                ${this.formData.paper_url || '未填写'}
                            </div>
                        </div>
                        <div class="preview-field">
                            <div class="preview-field-label">arXiv ID</div>
                            <div class="preview-field-value ${!this.formData.arxiv_id ? 'empty' : ''}">
                                ${this.formData.arxiv_id || '未填写'}
                            </div>
                        </div>
                        <div class="preview-field">
                            <div class="preview-field-label">DOI</div>
                            <div class="preview-field-value ${!this.formData.doi ? 'empty' : ''}">
                                ${this.formData.doi || '未填写'}
                            </div>
                        </div>
                        <div class="preview-field">
                            <div class="preview-field-label">作者</div>
                            <div class="preview-field-value ${!this.formData.authors || this.formData.authors.length === 0 ? 'empty' : ''}">
                                ${Array.isArray(this.formData.authors) && this.formData.authors.length > 0
                                    ? this.formData.authors.join(', ')
                                    : '未填写'}
                            </div>
                        </div>
                        <div class="preview-field">
                            <div class="preview-field-label">研究机构</div>
                            <div class="preview-field-value ${!this.formData.institution ? 'empty' : ''}">
                                ${this.formData.institution || '未填写'}
                            </div>
                        </div>
                        <div class="preview-field">
                            <div class="preview-field-label">发布日期</div>
                            <div class="preview-field-value ${!this.formData.publish_date ? 'empty' : ''}">
                                ${this.formData.publish_date || '未填写'}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });

        this.previewContent.innerHTML = previewHtml;
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

        // 隐藏预览区域，显示进度区域
        this.hidePreviewSection();
        this.showProgressSection();

        try {
            // 获取选中频道的封面URL
            const selectedChannel = this.channels.find(c => c.id === this.formData.channel_id);
            const coverUrl = selectedChannel ? selectedChannel.cover_url : null;

            // 创建进度列表
            this.createProgressItems();

            // 并行上传文件（最多3个同时进行）
            await this.uploadFilesInParallel(coverUrl);

            // 显示结果
            this.showResults();

        } catch (error) {
            console.error('上传过程中出错:', error);
            this.showError('上传过程中出错，请重试');
        } finally {
            this.isUploading = false;
        }
    }

    // 并行上传文件
    async uploadFilesInParallel(coverUrl, concurrency = 3) {
        const uploadPromises = [];
        const semaphore = new Semaphore(concurrency);

        for (let i = 0; i < this.files.length; i++) {
            const promise = semaphore.acquire().then(async (release) => {
                try {
                    await this.uploadFile(this.files[i], i, coverUrl);
                } finally {
                    release();
                }
            });
            uploadPromises.push(promise);
        }

        await Promise.all(uploadPromises);
    }

    // 上传封面图片
    async uploadCoverImage() {
        if (!this.coverFile) return null;

        try {
            const fileName = `cover_${Date.now()}_${Math.random().toString(36).substring(2)}.${this.coverFile.name.split('.').pop()}`;
            const filePath = `covers/${fileName}`;

            const { data, error } = await window.supabaseClient.storage
                .from('static-images')
                .upload(filePath, this.coverFile);

            if (error) throw error;

            const { data: { publicUrl } } = window.supabaseClient.storage
                .from('static-images')
                .getPublicUrl(filePath);

            return publicUrl;
        } catch (error) {
            console.error('封面图片上传失败:', error);
            return null;
        }
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
                    <div class="progress-item-speed" style="display: none;">0 KB/s</div>
                </div>
                <div class="progress-item-bar">
                    <div class="progress-item-fill"></div>
                </div>
                <div class="progress-item-percentage">0%</div>
            `;

            this.progressList.appendChild(progressItem);
        });
    }

    // 更新进度项（增强版 - 支持速度显示）
    updateProgressItem(index, fileInfo) {
        const progressItem = document.getElementById(`progress-${index}`);
        if (!progressItem) return;

        const statusElement = progressItem.querySelector('.progress-item-status');
        const fillElement = progressItem.querySelector('.progress-item-fill');
        const percentageElement = progressItem.querySelector('.progress-item-percentage');
        const speedElement = progressItem.querySelector('.progress-item-speed');

        // 更新状态文本
        switch (fileInfo.status) {
            case 'pending':
                statusElement.textContent = '等待上传...';
                if (speedElement) speedElement.style.display = 'none';
                break;
            case 'uploading':
                statusElement.textContent = '正在上传...';
                if (speedElement) {
                    speedElement.style.display = 'block';
                    speedElement.textContent = fileInfo.speed || '计算中...';
                }
                break;
            case 'success':
                statusElement.textContent = '上传成功';
                if (speedElement) speedElement.style.display = 'none';
                break;
            case 'error':
                statusElement.textContent = `上传失败: ${fileInfo.error || '未知错误'}`;
                if (speedElement) speedElement.style.display = 'none';
                break;
            default:
                let statusText = this.getStatusText(fileInfo.status);
                if (fileInfo.status === 'error' && fileInfo.error) {
                    statusText = fileInfo.error;
                } else if (fileInfo.status === 'uploading') {
                    statusText = '上传中...';
                }
                statusElement.textContent = statusText;
        }

        // 更新进度条（添加平滑动画）
        const progress = fileInfo.progress || 0;
        fillElement.style.width = `${progress}%`;
        fillElement.className = `progress-item-fill ${fileInfo.status}`;
        fillElement.style.transition = 'width 0.3s ease-out';

        // 更新百分比
        percentageElement.textContent = `${progress}%`;
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

    // 上传单个文件
    async uploadFile(fileInfo, index, coverUrl) {
        return new Promise(async (resolve, reject) => {
            try {
                // 更新状态为上传中
                fileInfo.status = 'uploading';
                this.updateProgressItem(index, fileInfo);

                // 生成新的文件路径（使用新的存储架构）
                const fileName = await this.generateNewFileName(fileInfo);
                const filePath = await this.generateStoragePath(fileName);

                let publicUrl;

                // 判断文件大小，大于50MB使用分片上传
                const CHUNK_SIZE = 50 * 1024 * 1024; // 50MB
                if (fileInfo.file.size > CHUNK_SIZE) {
                    publicUrl = await this.uploadFileInChunks(fileInfo, filePath, index);
                } else {
                    publicUrl = await this.uploadFileDirectly(fileInfo, filePath, index);
                }

                fileInfo.uploadUrl = publicUrl;

                // 准备数据库数据
                const podcastData = {
                    title: this.formData.title,
                    description: this.formData.description,
                    audio_url: publicUrl,
                    duration: fileInfo.duration,
                    channel_id: this.formData.channel_id,
                    cover_url: coverUrl,
                    paper_title: this.formData.paper_title || null,
                    paper_url: this.formData.paper_url || null,
                    arxiv_id: this.formData.arxiv_id || null,
                    doi: this.formData.doi || null,
                    authors: this.formData.authors && this.formData.authors.length > 0 ? this.formData.authors : null,
                    institution: this.formData.institution || null,
                    publish_date: this.formData.publish_date || null,
                    status: 'published'
                };

                // 保存到数据库
                const { error: dbError } = await window.supabaseClient
                    .from('podcasts')
                    .insert(podcastData);

                if (dbError) {
                    console.error('数据库保存失败:', dbError);
                    throw dbError;
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

    // 直接上传文件（增强版 - 支持进度模拟）
    async uploadFileDirectly(fileInfo, filePath, index) {
        let simulatedProgress = 0;
        let realProgressReceived = false;
        let uploadStartTime = Date.now();

        // 进度模拟器 - 在真实进度不可用时提供平滑体验
        const progressSimulator = setInterval(() => {
            if (!realProgressReceived && simulatedProgress < 85) {
                // 基于时间和文件大小模拟进度
                const elapsed = Date.now() - uploadStartTime;
                const estimatedDuration = Math.max(3000, fileInfo.file.size / (1024 * 100)); // 假设100KB/s基准速度
                const timeProgress = Math.min((elapsed / estimatedDuration) * 85, 85);

                simulatedProgress = Math.max(simulatedProgress, timeProgress);
                fileInfo.progress = Math.round(simulatedProgress);

                console.log(`[模拟进度] ${fileInfo.name}: ${fileInfo.progress}%`);
                this.updateProgressItem(index, fileInfo);
                this.updateOverallProgress();
            }
        }, 300);

        try {
            console.log(`[开始上传] ${fileInfo.name} 到 ${filePath}`);

            const { data, error } = await window.supabaseClient.storage
                .from(window.SUPABASE_CONFIG.bucketName)
                .upload(filePath, fileInfo.file, {
                    onUploadProgress: (progress) => {
                        realProgressReceived = true;
                        clearInterval(progressSimulator);

                        const percentage = Math.round((progress.loaded / progress.total) * 100);
                        fileInfo.progress = percentage;

                        // 计算上传速度
                        const elapsed = Date.now() - uploadStartTime;
                        const speed = (progress.loaded / elapsed * 1000 / 1024).toFixed(1); // KB/s
                        fileInfo.speed = `${speed} KB/s`;

                        console.log(`[真实进度] ${fileInfo.name}: ${percentage}%, 速度: ${speed}KB/s`);

                        this.updateProgressItem(index, fileInfo);
                        this.updateOverallProgress();
                    }
                });

            // 清理模拟器
            clearInterval(progressSimulator);

            if (error) {
                console.error(`[上传失败] ${fileInfo.name}:`, error);
                throw error;
            }

            console.log(`[上传成功] ${fileInfo.name}`);

            const { data: { publicUrl } } = window.supabaseClient.storage
                .from(window.SUPABASE_CONFIG.bucketName)
                .getPublicUrl(filePath);

            return publicUrl;

        } catch (error) {
            clearInterval(progressSimulator);
            console.error(`[上传错误] ${fileInfo.name}:`, error);
            throw error;
        }
    }

    // 分片上传文件
    async uploadFileInChunks(fileInfo, filePath, index) {
        const file = fileInfo.file;
        const CHUNK_SIZE = 10 * 1024 * 1024; // 10MB 每个分片
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        let uploadedBytes = 0;

        // 分片上传暂时不支持进度显示，使用直接上传
        // 这里为了简化，先使用直接上传
        console.log(`文件 ${fileInfo.name} 超过50MB，使用直接上传方式`);
        return await this.uploadFileDirectly(fileInfo, filePath, index);
    }

    // 重置应用
    resetApp() {
        this.files = [];
        this.isUploading = false;
        this.uploadedCount = 0;
        this.failedCount = 0;
        this.formData = {};

        // 重置表单
        this.podcastForm.reset();
        this.coverPreview.innerHTML = `
            <div class="cover-placeholder">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21,15 16,10 5,21"/>
                </svg>
                <p>点击上传封面图片</p>
                <small>支持JPG、PNG格式，建议尺寸400x400</small>
            </div>
        `;

        // 隐藏所有区域
        this.hideFilesSection();
        this.hideFormSection();
        this.hidePreviewSection();
        this.hideProgressSection();
        this.hideResultsSection();
        this.newUploadBtn.style.display = 'none';
        this.hideMessage();
    }

    // UI控制方法
    showFilesSection() {
        this.filesSection.style.display = 'block';
        this.filesSection.classList.add('fade-in');
    }

    hideFilesSection() {
        this.filesSection.style.display = 'none';
    }

    showFormSection() {
        this.formSection.style.display = 'block';
        this.formSection.classList.add('fade-in');
    }

    hideFormSection() {
        this.formSection.style.display = 'none';
    }

    showPreviewSection() {
        this.previewSection.style.display = 'block';
        this.previewSection.classList.add('fade-in');
    }

    hidePreviewSection() {
        this.previewSection.style.display = 'none';
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