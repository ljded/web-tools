/**
 * 流式 Firefox 性能分析器
 * 使用流式处理大型 profile.json 文件
 */

const fs = require('fs');
const zlib = require('zlib');
const { Transform } = require('stream');

// 提取关键性能指标，不加载完整 JSON
class ProfileStreamAnalyzer {
  constructor() {
    this.buffer = '';
    this.metrics = {
      sampleCount: 0,
      threadNames: new Set(),
      markerTypes: new Map(),
      functionCalls: new Map(),
      categories: new Map(),
      meta: null,
    };
  }

  // 简单的 JSON 模式匹配
  processChunk(chunk) {
    this.buffer += chunk;

    // 提取元数据（meta 部分）
    if (!this.metrics.meta && this.buffer.includes('"meta":{')) {
      const metaMatch = this.buffer.match(/"meta":\{[^}]*"interval":(\d+)[^}]*"product":"([^"]+)"[^}]*"version":(\d+)/);
      if (metaMatch) {
        this.metrics.meta = {
          interval: parseInt(metaMatch[1]),
          product: metaMatch[2],
          version: parseInt(metaMatch[3]),
        };
      }
    }

    // 统计线程
    const threadMatches = this.buffer.matchAll(/"name":"([^"]+)","processType"/g);
    for (const match of threadMatches) {
      this.metrics.threadNames.add(match[1]);
    }

    // 统计采样点
    const sampleMatches = this.buffer.match(/"samples":\{"data":\[\[/g);
    if (sampleMatches) {
      this.metrics.sampleCount += sampleMatches.length;
    }

    // 统计 marker 类型
    const markerMatches = this.buffer.matchAll(/"name":"([^"]+)","tooltipLabel"/g);
    for (const match of markerMatches) {
      const name = match[1];
      this.metrics.markerTypes.set(name, (this.metrics.markerTypes.get(name) || 0) + 1);
    }

    // 保持缓冲区大小可控（保留最后 10KB 用于跨边界匹配）
    if (this.buffer.length > 100000) {
      this.buffer = this.buffer.slice(-10000);
    }
  }

  getReport() {
    const lines = [
      '='.repeat(60),
      '  Firefox 性能分析报告（流式分析）',
      '='.repeat(60),
      '',
    ];

    if (this.metrics.meta) {
      lines.push('【元数据】');
      lines.push(`  产品: ${this.metrics.meta.product} v${this.metrics.meta.version}`);
      lines.push(`  采样间隔: ${this.metrics.meta.interval}ms`);
      lines.push('');
    }

    lines.push('【线程统计】');
    lines.push(`  检测到 ${this.metrics.threadNames.size} 个线程:`);
    for (const name of Array.from(this.metrics.threadNames).slice(0, 10)) {
      lines.push(`    - ${name}`);
    }
    if (this.metrics.threadNames.size > 10) {
      lines.push(`    ... 还有 ${this.metrics.threadNames.size - 10} 个`);
    }
    lines.push('');

    lines.push('【采样统计】');
    lines.push(`  采样数据块: ~${this.metrics.sampleCount}`);
    lines.push('');

    if (this.metrics.markerTypes.size > 0) {
      lines.push('【性能标记类型 Top 20】');
      const sorted = Array.from(this.metrics.markerTypes.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20);

      for (const [name, count] of sorted) {
        lines.push(`  ${name}: ${count} 次`);
      }
      lines.push('');
    }

    lines.push('='.repeat(60));

    return lines.join('\n');
  }
}

async function analyzeProfileStream(filePath) {
  console.log('开始流式分析 Firefox profile...\n');
  console.log('文件:', filePath);
  console.log('');

  const startTime = Date.now();
  const analyzer = new ProfileStreamAnalyzer();
  const isGzip = filePath.endsWith('.gz');

  return new Promise((resolve, reject) => {
    let readStream = fs.createReadStream(filePath);

    if (isGzip) {
      console.log('检测到 gzip 压缩文件，正在解压...\n');
      readStream = readStream.pipe(zlib.createGunzip());
    }

    readStream.setEncoding('utf8');

    let chunkCount = 0;
    readStream.on('data', (chunk) => {
      chunkCount++;
      if (chunkCount % 100 === 0) {
        process.stdout.write(`\r处理中... 已读取 ${chunkCount} 个数据块`);
      }
      analyzer.processChunk(chunk);
    });

    readStream.on('end', () => {
      console.log(`\n\n分析完成！耗时: ${((Date.now() - startTime) / 1000).toFixed(2)}秒\n`);
      console.log(analyzer.getReport());
      resolve(analyzer.metrics);
    });

    readStream.on('error', (error) => {
      console.error('读取文件出错:', error);
      reject(error);
    });
  });
}

// 运行
const filePath = process.argv[2] || '.claude/Firefox 2026-06-03 13.16 profile.json.gz';
analyzeProfileStream(filePath).catch(console.error);
