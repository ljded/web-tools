import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('开始分析 Firefox 性能数据...\n');

const profilePath = path.join(path.dirname(__dirname), '.claude', 'Firefox 2026-06-03 13.16 profile.json');

// 由于文件太大，我们流式读取并提取关键信息
const stream = fs.createReadStream(profilePath, { encoding: 'utf8' });
let buffer = '';
let metaInfo = null;
let samplesCount = 0;
let threadsFound = false;

stream.on('data', (chunk) => {
  buffer += chunk;

  // 只处理前几MB来提取元数据和基本信息
  if (buffer.length > 5000000 && metaInfo) {
    stream.destroy();
    return;
  }

  // 尝试提取 meta 信息
  if (!metaInfo && buffer.includes('"meta"')) {
    try {
      const metaMatch = buffer.match(/"meta":\{[^}]*"interval":(\d+),"startTime":([0-9.]+).*?"product":"([^"]+)".*?"version":(\d+)/);
      if (metaMatch) {
        metaInfo = {
          interval: parseInt(metaMatch[1]),
          startTime: parseFloat(metaMatch[2]),
          product: metaMatch[3],
          version: metaMatch[4]
        };
        console.log('✓ 性能分析工具:', metaInfo.product);
        console.log('✓ 版本:', metaInfo.version);
        console.log('✓ 采样间隔:', metaInfo.interval, 'ms');
        console.log('✓ 开始时间:', new Date(metaInfo.startTime).toLocaleString());
        console.log('');
      }
    } catch (e) {}
  }

  // 统计 samples 数量
  const sampleMatches = buffer.match(/"samples":\{/g);
  if (sampleMatches) {
    samplesCount = sampleMatches.length;
  }

  // 检测线程信息
  if (buffer.includes('"threads"') && !threadsFound) {
    threadsFound = true;
    console.log('✓ 检测到线程信息');
  }
});

stream.on('end', () => {
  console.log('\n=== 基本信息 ===');
  console.log('文件大小:', (fs.statSync(profilePath).size / 1024 / 1024).toFixed(2), 'MB');
  console.log('包含线程:', threadsFound ? '是' : '否');
  console.log('');

  console.log('=== 分析建议 ===');
  console.log('');
  console.log('由于性能文件很大 (217MB)，建议：');
  console.log('');
  console.log('1. 在浏览器中打开分析:');
  console.log('   - 访问: https://profiler.firefox.com');
  console.log('   - 加载本地文件: Firefox 2026-06-03 13.16 profile.json');
  console.log('   - 查看火焰图、调用树和时间线');
  console.log('');
  console.log('2. 关注以下性能瓶颈:');
  console.log('   - JavaScript 执行时间');
  console.log('   - Layout/Reflow 次数');
  console.log('   - Network 请求');
  console.log('   - GC (垃圾回收) 时间');
  console.log('');
  console.log('3. 重点关注:');
  console.log('   - 主线程长任务 (> 50ms)');
  console.log('   - Vue 组件渲染时间');
  console.log('   - 资源加载顺序');
  console.log('   - 首次内容绘制 (FCP) 和最大内容绘制 (LCP)');
  console.log('');

  // 提供简化的性能分析命令
  console.log('=== 简化分析 ===');
  console.log('');
  console.log('如果你能提供以下关键指标，我可以针对性优化:');
  console.log('');
  console.log('从 Firefox Profiler 中查看:');
  console.log('1. 页面加载总时间');
  console.log('2. JavaScript 执行占比 (%)');
  console.log('3. Layout/Reflow 时间');
  console.log('4. 最耗时的函数/组件 (前 5 个)');
  console.log('5. 网络请求时间线');
  console.log('');
});

stream.on('error', (err) => {
  console.error('读取文件出错:', err.message);
});