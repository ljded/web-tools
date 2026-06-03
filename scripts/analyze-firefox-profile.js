/**
 * Firefox性能分析文件解析器
 * 从Firefox profiler JSON中提取关键性能指标
 */

const fs = require('fs');
const zlib = require('zlib');
const { pipeline } = require('stream');
const { promisify } = require('util');

const pipelineAsync = promisify(pipeline);

async function analyzeProfile(filePath) {
  console.log('开始分析性能文件...');
  console.log('文件:', filePath);

  const startTime = Date.now();

  try {
    // 读取并解析JSON（使用gzip压缩版本）
    const isGzip = filePath.endsWith('.gz');
    let content;

    if (isGzip) {
      console.log('正在解压缩文件...');
      const buffer = fs.readFileSync(filePath);
      content = zlib.gunzipSync(buffer).toString('utf8');
    } else {
      console.log('正在读取文件...');
      content = fs.readFileSync(filePath, 'utf8');
    }

    console.log('正在解析JSON...');
    const profile = JSON.parse(content);

    console.log('\n=== Firefox 性能分析报告 ===\n');

    // 1. 基本信息
    console.log('【基本信息】');
    console.log(`  Firefox版本: ${profile.meta.product} ${profile.meta.version}`);
    console.log(`  采样间隔: ${profile.meta.interval}ms`);
    console.log(`  CPU: ${profile.meta.CPUName}`);
    console.log(`  核心数: ${profile.meta.physicalCPUs}物理/${profile.meta.logicalCPUs}逻辑`);
    console.log(`  平台: ${profile.meta.platform} (${profile.meta.oscpu})`);

    // 2. 线程分析
    console.log('\n【线程分析】');
    const threads = profile.threads || [];
    console.log(`  总线程数: ${threads.length}`);

    const performanceData = {
      jsTime: 0,
      gcTime: 0,
      layoutTime: 0,
      graphicsTime: 0,
      idleTime: 0,
      totalSamples: 0,
      topFunctions: new Map(),
      markers: []
    };

    threads.forEach((thread, idx) => {
      const name = thread.name || `Thread ${idx}`;
      console.log(`  - ${name}: ${thread.samples?.length || 0} 采样点`);

      // 分析主线程
      if (thread.name === 'GeckoMain' || thread.name === 'Compositor') {
        analyzeThread(thread, performanceData);
      }
    });

    // 3. 时间分布
    console.log('\n【时间分布统计】');
    const total = performanceData.totalSamples;
    if (total > 0) {
      console.log(`  JavaScript执行: ${((performanceData.jsTime / total) * 100).toFixed(2)}%`);
      console.log(`  垃圾回收(GC): ${((performanceData.gcTime / total) * 100).toFixed(2)}%`);
      console.log(`  布局/重排: ${((performanceData.layoutTime / total) * 100).toFixed(2)}%`);
      console.log(`  图形渲染: ${((performanceData.graphicsTime / total) * 100).toFixed(2)}%`);
      console.log(`  空闲时间: ${((performanceData.idleTime / total) * 100).toFixed(2)}%`);
    }

    // 4. 热点函数
    console.log('\n【Top 20 耗时函数】');
    const sortedFunctions = Array.from(performanceData.topFunctions.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);

    sortedFunctions.forEach(([funcName, count], idx) => {
      const percentage = ((count / total) * 100).toFixed(2);
      console.log(`  ${idx + 1}. ${funcName}: ${count} 次 (${percentage}%)`);
    });

    // 5. Markers分析
    console.log('\n【性能标记分析】');
    analyzeMarkers(profile);

    const endTime = Date.now();
    console.log(`\n分析完成，耗时: ${((endTime - startTime) / 1000).toFixed(2)}秒`);

    return performanceData;

  } catch (error) {
    console.error('分析出错:', error.message);
    throw error;
  }
}

function analyzeThread(thread, data) {
  const samples = thread.samples?.data || [];
  const stackTable = thread.stackTable;
  const frameTable = thread.frameTable;
  const stringArray = thread.stringArray;
  const funcTable = thread.funcTable;

  if (!samples.length || !stackTable || !frameTable || !funcTable) {
    return;
  }

  samples.forEach(sample => {
    data.totalSamples++;

    let stackIndex = sample[0]; // stack index
    const category = sample[1]; // category

    // 统计分类时间
    if (thread.categories) {
      const catName = thread.categories[category]?.name || '';
      if (catName === 'JavaScript') data.jsTime++;
      else if (catName === 'GC / CC') data.gcTime++;
      else if (catName === 'Layout') data.layoutTime++;
      else if (catName === 'Graphics') data.graphicsTime++;
      else if (catName === 'Idle') data.idleTime++;
    }

    // 遍历调用栈
    while (stackIndex !== null && stackIndex !== undefined) {
      const stack = stackTable.data[stackIndex];
      if (!stack) break;

      const frameIndex = stack[1]; // frame index
      const frame = frameTable.data[frameIndex];
      if (frame) {
        const funcIndex = frame[1]; // func index
        const func = funcTable.data[funcIndex];
        if (func) {
          const nameIndex = func[0]; // name string index
          const funcName = stringArray[nameIndex] || 'anonymous';

          // 统计函数调用次数
          data.topFunctions.set(funcName, (data.topFunctions.get(funcName) || 0) + 1);
        }
      }

      stackIndex = stack[0]; // prefix (parent stack)
    }
  });
}

function analyzeMarkers(profile) {
  const threads = profile.threads || [];
  const markerStats = {
    reflow: [],
    styleRecalc: [],
    layout: [],
    paint: [],
    gc: []
  };

  threads.forEach(thread => {
    const markers = thread.markers;
    if (!markers) return;

    const data = markers.data || [];
    const stringArray = thread.stringArray || [];

    data.forEach(marker => {
      const name = stringArray[marker[0]] || '';
      const startTime = marker[1];
      const endTime = marker[2];
      const duration = endTime - startTime;

      if (name.includes('Reflow')) {
        markerStats.reflow.push(duration);
      } else if (name.includes('Styles') || name.includes('Style')) {
        markerStats.styleRecalc.push(duration);
      } else if (name.includes('Layout')) {
        markerStats.layout.push(duration);
      } else if (name.includes('Paint') || name.includes('Rasterization')) {
        markerStats.paint.push(duration);
      } else if (name.includes('GC') || name.includes('GarbageCollection')) {
        markerStats.gc.push(duration);
      }
    });
  });

  // 输出统计
  Object.entries(markerStats).forEach(([type, durations]) => {
    if (durations.length > 0) {
      const total = durations.reduce((a, b) => a + b, 0);
      const avg = total / durations.length;
      const max = Math.max(...durations);
      console.log(`  ${type}: ${durations.length} 次, 平均 ${avg.toFixed(2)}ms, 最大 ${max.toFixed(2)}ms`);
    }
  });
}

// 运行分析
const filePath = process.argv[2] || '.claude/Firefox 2026-06-03 13.16 profile.json.gz';
analyzeProfile(filePath).catch(console.error);
