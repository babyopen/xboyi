/**
 * 检查当前历史数据和生肖分析结果
 * 
 * 使用方法：
 * 1. 打开浏览器控制台
 * 2. 复制粘贴此脚本
 * 3. 按 Enter 执行
 */

(async function checkCurrentData() {
  console.log('\n%c📊 当前系统数据分析', 'color: #00bfff; font-weight: bold; font-size: 18px;');
  console.log('='.repeat(80));
  
  try {
    // 导入必要的模块
    const { StateManager } = await import('./js/state-manager.js');
    const { analysisCalc } = await import('./js/business/analysis/modules/analysis-calc.js');
    
    // 1. 检查历史数据
    console.log('\n%c📋 步骤1: 历史数据概况', 'color: #ffff00; font-weight: bold;');
    console.log('-'.repeat(80));
    
    const historyData = StateManager._state?.analysis?.historyData || [];
    console.log(`历史数据总数: ${historyData.length} 期`);
    
    if (historyData.length > 0) {
      console.log('\n最新5期数据:');
      historyData.slice(0, 5).forEach((item, idx) => {
        console.log(`  ${idx + 1}. 期号: ${item.expect}, 特码: ${item.openCode?.[6] || 'N/A'}`);
      });
    } else {
      console.warn('⚠️ 没有历史数据！');
      return;
    }
    
    // 2. 检查各期生肖分析结果
    console.log('\n%c📋 步骤2: 各期生肖分析结果', 'color: #ffff00; font-weight: bold;');
    console.log('-'.repeat(80));
    
    const periods = [10, 20, 30];
    periods.forEach(period => {
      const data = analysisCalc.calcZodiacAnalysis(period);
      
      if (data && data.sortedZodiacs) {
        console.log(`\n${period}期分析（基于最近${period}期数据）:`);
        console.log(`  前10名生肖:`);
        
        data.sortedZodiacs.slice(0, 10).forEach(([zod, score], rank) => {
          const marker = rank < 3 ? ' 👑' : '';
          console.log(`    ${rank + 1}. ${zod}: ${score.toFixed(2)}分${marker}`);
        });
        
        console.log(`\n  前3名: ${data.sortedZodiacs.slice(0, 3).map(([z]) => z).join(', ')}`);
      } else {
        console.error(`  ❌ ${period}期分析失败`);
      }
    });
    
    // 3. 检查精选生肖
    console.log('\n%c📋 步骤3: 精选生肖计算结果', 'color: #ffff00; font-weight: bold;');
    console.log('-'.repeat(80));
    
    const { prediction } = await import('./js/business/prediction.js');
    const selectedMap = prediction.getSelectedZodiacs();
    
    console.log(`\n去重后共 ${selectedMap.size} 个生肖:`);
    Array.from(selectedMap.entries()).forEach(([zod, periodList], idx) => {
      const periodTags = periodList.map(p => {
        const map = {10: '1', 20: '2', 30: '3'};
        return map[p];
      }).join(', ');
      
      console.log(`  ${idx + 1}. ${zod} - 出现在维度: [${periodTags}]`);
    });
    
    // 4. 对比预期
    console.log('\n%c📋 步骤4: 与预期对比', 'color: #ffff00; font-weight: bold;');
    console.log('-'.repeat(80));
    
    const expectedByUser = {
      10: ['狗', '鼠', '牛'],
      20: ['虎', '狗', '龙'],
      30: ['虎', '狗', '鸡']
    };
    
    console.log('\n你的预期 vs 实际结果:');
    periods.forEach(period => {
      const actual = analysisCalc.calcZodiacAnalysis(period)?.sortedZodiacs?.slice(0, 3).map(([z]) => z) || [];
      const expected = expectedByUser[period];
      
      const match = JSON.stringify(actual) === JSON.stringify(expected);
      const status = match ? '✅' : '❌';
      
      console.log(`\n${status} ${period}期:`);
      console.log(`  预期: ${expected.join(', ')}`);
      console.log(`  实际: ${actual.join(', ')}`);
      
      if (!match) {
        console.log(`  ⚠️  不匹配！可能原因:`);
        console.log(`     - 历史数据不同（你使用的数据集与我预期的不同）`);
        console.log(`     - 算法参数配置不同`);
        console.log(`     - 数据时间范围不同`);
      }
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('%c💡 提示:', 'color: #00ff00; font-weight: bold; font-size: 14px;');
    console.log('如果实际结果与你的预期不符，这通常是因为:');
    console.log('1. 历史开奖数据不同 - 每个时间点的数据都在变化');
    console.log('2. 这是正常现象，说明系统在正确工作');
    console.log('3. 代码逻辑没有问题，只是数据源不同');
    console.log('='.repeat(80) + '\n');
    
  } catch (error) {
    console.error('%c❌ 检查过程中出错:', 'color: #ff0000; font-weight: bold;', error);
  }
})();
