import fs from 'fs';
import readline from 'readline';

console.log('正在分析 Firefox 性能数据...\n');

const profilePath = '.claude/Firefox 2026-06-03 13.16 profile.json';

// 统计信息
let stats = {
  jsTime: 0,
  layoutTime: 0,
  gcTime: 0,
  networkTime: 0,
  graphicsTime: 0,
  idleTime: 0,
  totalSamples: 0,
  longTasks: [],
  categories: new Map()
};

// 使用流式读取处理大文件
const fileStream = fs.createReadStream(profilePath);
const rl = readline.createInterface({
  input: fileStream,
  crlfDelay: Infinity
});

let buffer = '';
let lineCount = 0;

rl.on('line', (line) => {
  lineCount++;
  buffer += line;

  // 每 1000 行处理一次
  if (lineCount % 1000 === 0) {
    // 搜索性能关键字
    const jsMatches = (buffer.match(/"JavaScript"/g) || []).length;
    const layoutMatches = (buffer.match(/"Layout"/g) || []).length;
    const gcMatches = (buffer.match(/"GC"/g) || []).length;
    const networkMatches = (buffer.match(/"Network"/g) || []).length;

    stats.jsTime += jsMatches;
    stats.layoutTime += layoutMatches;
    stats.gcTime += gcMatches;
    stats.networkTime += networkMatches;

    buffer = ''; // 清空缓冲区
  }
});

rl.on('close', () => {
  console.log('=== 性能分析摘要 ===\n');
  console.log('处理了', lineCount, '行数据');
  console.log('');

  console.log('JavaScript 相关:', stats.jsTime, '次提及');
  console.log('Layout 相关:', stats.layoutTime, '次提及');
  console.log('GC 相关:', stats.gcTime, '次提及');
  console.log('Network 相关:', stats.networkTime, '次提及');
  console.log('');

  console.log('=== 优化建议 ===\n');
  console.log('基于 Firefox Profiler 数据，建议：');
  console.log('');
  console.log('1. 使用 Firefox Profiler Web 查看完整分析:');
  console.log('   https://profiler.firefox.com');
  console.log('');
  console.log('2. 关注关键指标:');
  console.log('   - 页面加载时间 (DOMContentLoaded, Load 事件)');
  console.log('   - 首次内容绘制 (FCP)');
  console.log('   - 最大内容绘制 (LCP)');
  console.log('   - 主线程阻塞时间');
  console.log('   - JavaScript 执行时间');
  console.log('');
  console.log('3. 请提供以下信息以便针对性优化:');
  console.log('   - 页面加载总时长');
  console.log('   - 最耗时的 3-5 个函数');
  console.log('   - 是否有长任务 (>50ms)');
  console.log('   - 首屏渲染时间');
});

rl.on('error', (err) => {
  console.error('处理出错:', err.message);
});