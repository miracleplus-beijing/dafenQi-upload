// 音频处理工具函数

/**
 * 获取音频文件时长
 * @param {File} file - 音频文件
 * @returns {Promise<number>} 时长(秒)
 */
async function getAudioDuration(file) {
    return new Promise((resolve, reject) => {
        const audio = document.createElement('audio');
        const objectUrl = URL.createObjectURL(file);

        audio.addEventListener('loadedmetadata', () => {
            const duration = Math.floor(audio.duration);
            URL.revokeObjectURL(objectUrl);
            resolve(duration);
        });

        audio.addEventListener('error', (e) => {
            URL.revokeObjectURL(objectUrl);
            reject(new Error('无法读取音频时长'));
        });

        audio.src = objectUrl;
        audio.load();
    });
}

/**
 * 验证音频文件格式
 * @param {File} file - 文件对象
 * @returns {boolean} 是否为支持的音频格式
 */
function validateAudioFormat(file) {
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave'];
    const allowedExtensions = ['.mp3', '.wav'];

    // 检查 MIME 类型
    if (allowedTypes.includes(file.type)) {
        return true;
    }

    // 检查文件扩展名（备用检查）
    const fileName = file.name.toLowerCase();
    return allowedExtensions.some(ext => fileName.endsWith(ext));
}

/**
 * 验证文件大小
 * @param {File} file - 文件对象
 * @param {number} maxSize - 最大文件大小（字节），默认100MB
 * @returns {boolean} 文件大小是否符合要求
 */
function validateFileSize(file, maxSize = 100 * 1024 * 1024) {
    return file.size <= maxSize;
}

/**
 * 格式化文件大小
 * @param {number} bytes - 文件大小（字节）
 * @returns {string} 格式化后的文件大小
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 格式化音频时长
 * @param {number} seconds - 时长（秒）
 * @returns {string} 格式化后的时长 (MM:SS)
 */
function formatDuration(seconds) {
    if (!seconds || seconds < 0) return '00:00';

    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);

    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 生成唯一的文件名
 * @param {string} originalName - 原始文件名
 * @returns {string} 唯一的文件名
 */
function generateUniqueFileName(originalName) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    const extension = originalName.split('.').pop();

    return `audio_${timestamp}_${random}.${extension}`;
}

/**
 * 获取文件类型图标
 * @param {string} fileName - 文件名
 * @returns {string} 图标SVG字符串
 */
function getFileTypeIcon(fileName) {
    const extension = fileName.split('.').pop().toLowerCase();

    const musicIcon = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="8" cy="18" r="4"/>
            <path d="M12 18V2l7 4"/>
        </svg>
    `;

    return musicIcon;
}

/**
 * 验证音频文件完整性
 * @param {File} file - 音频文件
 * @returns {Promise<boolean>} 文件是否完整且可读
 */
async function validateAudioFile(file) {
    try {
        // 检查文件格式
        if (!validateAudioFormat(file)) {
            throw new Error('不支持的音频格式');
        }

        // 检查文件大小
        if (!validateFileSize(file)) {
            throw new Error('文件大小超过100MB限制');
        }

        // 尝试读取音频时长来验证文件完整性
        await getAudioDuration(file);

        return true;
    } catch (error) {
        console.error('音频文件验证失败:', error);
        return false;
    }
}

/**
 * 创建音频文件信息对象
 * @param {File} file - 音频文件
 * @returns {Promise<Object>} 文件信息对象
 */
async function createAudioFileInfo(file) {
    try {
        const duration = await getAudioDuration(file);

        return {
            file: file,
            name: file.name,
            size: file.size,
            sizeFormatted: formatFileSize(file.size),
            duration: duration,
            durationFormatted: formatDuration(duration),
            type: file.type,
            lastModified: file.lastModified,
            uniqueName: generateUniqueFileName(file.name),
            status: 'pending', // pending, uploading, success, error
            progress: 0,
            error: null,
            uploadUrl: null
        };
    } catch (error) {
        return {
            file: file,
            name: file.name,
            size: file.size,
            sizeFormatted: formatFileSize(file.size),
            duration: 0,
            durationFormatted: '未知',
            type: file.type,
            lastModified: file.lastModified,
            uniqueName: generateUniqueFileName(file.name),
            status: 'error',
            progress: 0,
            error: '无法读取音频信息',
            uploadUrl: null
        };
    }
}

// 导出工具函数供其他模块使用
window.AudioUtils = {
    getAudioDuration,
    validateAudioFormat,
    validateFileSize,
    formatFileSize,
    formatDuration,
    generateUniqueFileName,
    getFileTypeIcon,
    validateAudioFile,
    createAudioFileInfo
};