#!/usr/bin/env node
const { execSync } = require('child_process');

console.log('🚀 开始部署构建...');

try {
  console.log('📦 安装依赖...');
  execSync('pnpm install --ignore-scripts', { stdio: 'inherit' });
  
  console.log('🔨 构建项目...');
  execSync('pnpm build', { stdio: 'inherit' });
  
  console.log('✅ 部署构建完成！');
} catch (error) {
  console.error('❌ 部署构建失败:', error.message);
  process.exit(1);
}
