// Supabase 配置文件
// 基于环境变量配置 Supabase 客户端

// 注意：在生产环境中，这些配置应该从环境变量或安全的配置文件中读取
// 对于GitHub Pages部署，由于是纯前端应用，配置会暴露在客户端
// Supabase的匿名密钥设计上就是可以在客户端使用的，但仍需谨慎配置RLS策略

const SUPABASE_CONFIG = {
    // 从环境变量读取，如果没有则使用默认值（仅用于开发）
    url: window.ENV?.SUPABASE_URL || 'https://gxvfcafgnhzjiauukssj.supabase.co',
    key: window.ENV?.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4dmZjYWZnbmh6amlhdXVrc3NqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0MjY4NjAsImV4cCI6MjA3MTAwMjg2MH0.uxO5eyw0Usyd59UKz-S7bTrmOnNPg9Ld9wJ6pDMIQUA',
    bucketName: window.ENV?.SUPABASE_BUCKET_NAME || 'podcast-audios'
};

// 初始化 Supabase 客户端
let supabaseClient;

try {
    // 等待 Supabase 库加载完成
    if (typeof supabase !== 'undefined') {
        supabaseClient = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key);
        console.log('Supabase 客户端初始化成功');
    } else {
        console.error('Supabase 库未加载');
    }
} catch (error) {
    console.error('Supabase 客户端初始化失败:', error);
}

// 导出配置和客户端实例（用于其他模块）
window.SUPABASE_CONFIG = SUPABASE_CONFIG;
window.supabaseClient = supabaseClient;