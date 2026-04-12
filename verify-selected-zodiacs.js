/**
 * 精选生肖数据验证脚本
 * 
 * 使用方法：
 * 1. 打开浏览器开发者工具（F12）
 * 2. 切换到 Console 标签
 * 3. 复制粘贴此文件的全部内容到控制台
 * 4. 按 Enter 执行
 */

(async function verifySelectedZodiacs() {
  console.log('\n%c🔍 开始验证精选生肖数据...', 'color: #00ff00; font-weight: bold; font-size: 16px;');
  console.log('='.repeat(80));
  
  try {
    // 动态导入必要的模块
    const { prediction } = await import('./js/business/prediction.js');
    const { analysisCalc } = await import('./js/business/analysis/modules/analysis-calc.js');
    
    console.log('\n%c📊 步骤1: 检查各期原始数据', 'color: #00bfff; font-weight: bold;');
    console.log('-'.repeat(80));
    
    const periods = [10, 20, 30];
    const expectedTop3 = {
      10: ['狗', '鼠', '牛'],
      20: ['虎', '狗', '龙'],
      30: ['虎', '狗', '鸡']
    };
    
    let allCorrect = true;
    
    periods.forEach(period => {
      const data = analysisCalc.calcZodiacAnalysis(period);
      const actualTop3 = data?.sortedZodiacs?.slice(0, 3).map(([z]) => z) || [];
      const expected = expectedTop3[period];
      
      const isMatch = JSON.stringify(actualTop3) === JSON.stringify(expected);
      const status = isMatch ? '✅' : '❌';
      const color = isMatch ? '#00ff00' : '#ff0000';
      
      console.log(`%c${status} ${period}期前3名:`, `color: ${color}; font-weight: bold;`);
      console.log(`   预期: ${expected.join(', ')}`);
      console.log(`   实际: ${actualTop3.join(', ')}`);
      
      if (!isMatch) {
        allCorrect = false;
        console.warn(`   ⚠️  ${period}期数据不匹配！`);
      }
    });
    
    console.log('\n%c📊 步骤2: 检查去重逻辑', 'color: #00bfff; font-weight: bold;');
    console.log('-'.repeat(80));
    
    const selectedZodiacsMap = prediction.getSelectedZodiacs();
    const resultArray = Array.from(selectedZodiacsMap.entries());
    
    console.log(`%c去重后生肖数量: ${resultArray.length}`, 'color: #ffff00; font-weight: bold;');
    console.log('%c完整列表:', 'color: #ffff00; font-weight: bold;');
    
    resultArray.forEach(([zod, periodList], index) => {
      const periodTags = periodList.map(p => {
        const map = {10: '1', 20: '2', 30: '3'};
        return map[p] || p;
      }).join(', ');
      
      console.log(`   ${index + 1}. ${zod} [${periodTags}] (出现在${periodList.length}个维度)`);
    });
    
    console.log('\n%c📊 步骤3: 验证最终结果', 'color: #00bfff; font-weight: bold;');
    console.log('-'.repeat(80));
    
    const expectedFinal = ['狗', '鼠', '牛', '虎', '龙', '鸡'];
    const actualFinal = resultArray.map(([zod]) => zod);
    
    const hasAllExpected = expectedFinal.every(z => actualFinal.includes(z));
    const noExtra = actualFinal.every(z => expectedFinal.includes(z));
    const correctCount = actualFinal.length === expectedFinal.length;
    
    if (hasAllExpected && noExtra && correctCount) {
      console.log('%c✅ 最终结果完全正确！', 'color: #00ff00; font-weight: bold; font-size: 14px;');
      console.log(`   包含所有预期生肖: ${expectedFinal.join(', ')}`);
    } else {
      console.error('%c❌ 最终结果有误！', 'color: #ff0000; font-weight: bold; font-size: 14px;');
      
      if (!hasAllExpected) {
        const missing = expectedFinal.filter(z => !actualFinal.includes(z));
        console.error(`   缺少的生肖: ${missing.join(', ')}`);
      }
      
      if (!noExtra) {
        const extra = actualFinal.filter(z => !expectedFinal.includes(z));
        console.error(`   多余的生肖: ${extra.join(', ')}`);
      }
      
      if (!correctCount) {
        console.error(`   数量不符: 预期${expectedFinal.length}个，实际${actualFinal.length}个`);
      }
    }
    
    console.log('\n%c📊 步骤4: 检查DOM渲染', 'color: #00bfff; font-weight: bold;');
    console.log('-'.repeat(80));
    
    const gridElement = document.getElementById('selectedZodiacsGrid');
    
    if (!gridElement) {
      console.error('%c❌ 未找到 selectedZodiacsGrid 元素！', 'color: #ff0000; font-weight: bold;');
    } else {
      const domItems = gridElement.querySelectorAll('.selected-zodiac-item');
      console.log(`%cDOM中的生肖数量: ${domItems.length}`, 'color: #ffff00; font-weight: bold;');
      
      const domZodiacs = Array.from(domItems).map(item => ({
        name: item.dataset.zodiac,
        periods: Array.from(item.querySelectorAll('.selected-zodiac-period-tag')).map(tag => tag.textContent)
      }));
      
      console.log('%cDOM内容:', 'color: #ffff00; font-weight: bold;');
      domZodiacs.forEach((item, index) => {
        console.log(`   ${index + 1}. ${item.name} [${item.periods.join(', ')}]`);
      });
      
      const domNames = domZodiacs.map(item => item.name);
      const domMatches = JSON.stringify(actualFinal) === JSON.stringify(domNames);
      
      if (domMatches) {
        console.log('%c✅ DOM渲染与计算结果一致！', 'color: #00ff00; font-weight: bold;');
      } else {
        console.error('%c❌ DOM渲染与计算结果不一致！', 'color: #ff0000; font-weight: bold;');
        console.error('   计算结果:', actualFinal.join(', '));
        console.error('   DOM显示:', domNames.join(', '));
      }
    }
    
    console.log('\n' + '='.repeat(80));
    
    if (allCorrect && hasAllExpected && noExtra && correctCount) {
      console.log('%c🎉 所有验证通过！精选生肖功能正常。', 'color: #00ff00; font-weight: bold; font-size: 18px; background: #003300; padding: 10px;');
    } else {
      console.log('%c⚠️  发现一些问题，请检查上述错误信息。', 'color: #ffaa00; font-weight: bold; font-size: 18px; background: #332200; padding: 10px;');
    }
    
    console.log('='.repeat(80) + '\n');
    
  } catch (error) {
    console.error('%c❌ 验证过程中发生错误:', 'color: #ff0000; font-weight: bold;', error);
  }
})();
