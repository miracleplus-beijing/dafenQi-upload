# 达芬Qi说 - 音频上传界面

## 项目简介

这是一个基于达芬Qi说设计风格的音频上传界面，支持 MP3 和 WAV 格式的音频文件上传到 Supabase 存储服务。

## 功能特性

- ✅ **支持格式**: MP3、WAV 音频文件
- ✅ **文件大小**: 单个文件最大 100MB
- ✅ **多文件上传**: 支持同时选择多个文件批量上传
- ✅ **拖拽上传**: 直接拖拽文件到上传区域
- ✅ **自动提取时长**: 自动读取音频文件时长
- ✅ **实时进度**: 显示上传进度和状态
- ✅ **无需登录**: 直接使用，简化流程
- ✅ **响应式设计**: 适配桌面和移动端

## 技术栈

- **前端**: 纯 HTML5 + CSS3 + JavaScript
- **样式**: 达芬Qi说设计系统
- **存储**: Supabase Storage + Database
- **部署**: GitHub Pages

## 设计风格

遵循达芬Qi说小程序的设计规范：
- **主色调**: `#0884FF` 品牌蓝色
- **字体**: SF Pro, WeChat Sans Std
- **圆角**: 8-12px 统一圆角
- **间距**: 8点网格系统
- **动画**: 0.3s 缓动过渡

## GitHub Pages 部署

### 方法一：通过 GitHub 网页界面

1. **创建仓库**
   - 登录 GitHub，创建新的公开仓库
   - 仓库名建议：`davinci-audio-upload`

2. **上传文件**
   - 将项目文件上传到仓库根目录
   - 确保 `index.html` 在根目录

3. **启用 GitHub Pages**
   - 进入仓库设置（Settings）
   - 滚动到 "Pages" 部分
   - Source 选择 "Deploy from a branch"
   - Branch 选择 "main"
   - 点击 "Save"

4. **访问网站**
   - 部署完成后，访问地址为：`https://用户名.github.io/仓库名`

### 方法二：使用 Git 命令行

```bash
# 初始化 Git 仓库
git init

# 添加所有文件
git add .

# 提交文件
git commit -m "初始版本：达芬Qi说音频上传界面"

# 关联远程仓库
git remote add origin https://github.com/用户名/仓库名.git

# 推送到 GitHub
git push -u origin main
```

### 环境配置

1. **复制环境配置文件**
   ```bash
   cp .env.example .env
   ```

2. **修改配置信息**
   - 编辑 `.env` 文件
   - 填入您的 Supabase 项目信息
   - 不要将 `.env` 文件提交到 Git

### 部署后配置

1. **DNS 配置**（可选）
   - 在仓库根目录添加 `CNAME` 文件
   - 内容填写自定义域名

2. **HTTPS 强制**
   - GitHub Pages 自动启用 HTTPS
   - 建议在 Settings 中勾选 "Enforce HTTPS"

3. **安全配置**
   - 确保 `.gitignore` 保护敏感文件
   - 配置 Supabase RLS 策略
   - 定期检查访问日志

## 项目结构

```
达芬Qi说-音频上传界面/
├── index.html              # 主页面
├── css/
│   └── style.css          # 样式文件
├── js/
│   ├── supabase-config.js # Supabase 配置
│   ├── audio-utils.js     # 音频处理工具
│   └── app.js             # 主应用逻辑
├── .env                   # 环境配置（被.gitignore保护）
├── .env.example           # 环境配置模板
├── .gitignore             # Git忽略文件
└── README.md              # 项目说明
```

## 使用说明

1. **选择文件**
   - 点击上传区域选择文件，或直接拖拽文件到上传区域
   - 支持同时选择多个 MP3/WAV 文件

2. **文件验证**
   - 自动验证文件格式和大小
   - 显示文件信息（名称、大小、时长）

3. **开始上传**
   - 点击"开始上传"按钮
   - 实时显示上传进度

4. **查看结果**
   - 上传完成后显示成功/失败统计
   - 可以重新上传新文件

## 注意事项

1. **环境配置安全**
   - `.env` 文件包含敏感信息，已被 `.gitignore` 保护
   - 生产环境部署时，通过平台环境变量设置配置
   - GitHub Pages 是纯前端托管，配置会暴露在客户端

2. **Supabase 配置**
   - 确保 Supabase 项目已启用 Storage 服务
   - `podcast-audios` bucket 需要设置为公开访问
   - RLS (Row Level Security) 策略需要允许匿名上传
   - 匿名密钥设计上可在客户端使用，但需配置合适的 RLS 策略

2. **浏览器兼容性**
   - 支持现代浏览器（Chrome 60+, Firefox 55+, Safari 12+）
   - 需要支持 Web Audio API 和 File API

3. **网络要求**
   - 需要稳定的网络连接
   - 大文件上传可能需要较长时间

## 常见问题

### Q: 上传失败怎么办？
A: 检查网络连接和文件格式，确保 Supabase 配置正确。

### Q: 支持其他音频格式吗？
A: 目前仅支持 MP3 和 WAV 格式。

### Q: 文件上传后在哪里查看？
A: 文件存储在 Supabase Storage 中，同时记录保存在 podcasts 表中。

## 更新日志

- **v1.0.0** (2024-01-15)
  - 初始版本发布
  - 支持 MP3/WAV 上传
  - 达芬Qi说设计风格适配
  - GitHub Pages 部署支持

## 开源协议

MIT License

## 联系方式

如有问题或建议，请创建 GitHub Issue。