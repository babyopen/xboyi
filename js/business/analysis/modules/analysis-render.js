// ====================== 分析渲染模块 ======================

import { CONFIG } from '../../../config.js';
import { StateManager } from '../../../state-manager.js';
import { analysisCalc } from './analysis-calc.js';
import { analysis } from '../../analysis.js';
import { PerformanceMonitor } from '../../../performance-monitor.js';
import { Toast } from '../../../toast.js';
import { DataQuery } from '../../../data-query.js';
import { IssueManager } from '../../issue-manager.js';

export const analysisRender = {
  /**
   * 渲染最新开奖
   * @param {Object} item - 最新数据项
   */
  renderLatest: (item) => {
    try {
      if(!item) return;
      const codeArr = (item.openCode || '0,0,0,0,0,0,0').split(',');
      const s = analysisCalc.getSpecial(item);
      const zodArr = s?.fullZodArr || [];
      
      let html = '';
      for(let i = 0; i < 6; i++) {
        const num = Number(codeArr[i]);
        html += analysisCalc.buildBall(codeArr[i], analysisCalc.getColor(num), zodArr[i] || '');
      }
      html += '<div class="ball-sep">+</div>' + analysisCalc.buildBall(codeArr[6], s?.wave || 'red', zodArr[6] || '');
      
      const latestBalls = document.getElementById('latestBalls');
      const curExpect = document.getElementById('curExpect');
      if(latestBalls) latestBalls.innerHTML = html;
      if(curExpect) curExpect.innerText = item.expect || '--';
    } catch(e) {
      console.error('渲染最新开奖失败:', e);
    }
  },

  /**
   * 渲染历史记录
   */
  renderHistory: () => {
    return PerformanceMonitor.monitorRendering(() => {
      try {
        const state = StateManager._state;
        const historyData = state?.analysis?.historyData || [];
        const showCount = state?.analysis?.showCount || 20;
        const list = historyData.slice(0, showCount);
        const historyList = document.getElementById('historyList');
        
        if(!list.length) {
          if(historyList) historyList.innerHTML = '<div style="padding:20px;text-align:center;">暂无历史数据</div>';
          return;
        }
        
        if(historyList) {
          // 使用文档片段减少DOM操作次数
          const fragment = document.createDocumentFragment();
          
          list.forEach(item => {
            try {
              const codeArr = (item.openCode || '0,0,0,0,0,0,0').split(',');
              const s = analysisCalc.getSpecial(item);
              const zodArr = s?.fullZodArr || [];
              let balls = '';
              for(let i = 0; i < 6; i++) {
                const num = Number(codeArr[i]);
                balls += analysisCalc.buildBall(codeArr[i], analysisCalc.getColor(num), zodArr[i] || '');
              }
              const teNum = Number(codeArr[6]);
              balls += '<div class="ball-sep">+</div>' + analysisCalc.buildBall(codeArr[6], analysisCalc.getColor(teNum), zodArr[6] || '');
              
              const itemDiv = document.createElement('div');
              itemDiv.className = 'history-item';
              itemDiv.innerHTML = `
                <div class="history-expect">第${item.expect || ''}期</div>
                <div class="ball-group">${balls}</div>
              `;
              fragment.appendChild(itemDiv);
            } catch(e) {
              console.error('渲染历史记录项失败:', e);
              const itemDiv = document.createElement('div');
              itemDiv.className = 'history-item';
              itemDiv.innerHTML = `
                <div class="history-expect">数据错误</div>
                <div class="ball-group">数据加载失败</div>
              `;
              fragment.appendChild(itemDiv);
            }
          });
          
          historyList.innerHTML = '';
          historyList.appendChild(fragment);
        }
      } catch(e) {
        console.error('渲染历史记录失败:', e);
        const historyList = document.getElementById('historyList');
        if(historyList) historyList.innerHTML = '<div style="padding:20px;text-align:center;color:var(--danger);">渲染失败，请刷新页面</div>';
      }
    }, 'renderHistory');
  },

  /**
   * 渲染全维度分析
   */
  renderFullAnalysis: () => {
    return PerformanceMonitor.monitorRendering(() => {
      const data = analysisCalc.calcFullAnalysis();
      if(!data) {
        const hotWrap = document.getElementById('hotWrap');
        const emptyTip = document.getElementById('emptyTip');
        if(hotWrap) hotWrap.style.display = 'none';
        if(emptyTip) emptyTip.style.display = 'block';
        return;
      }
      
      const hotWrap = document.getElementById('hotWrap');
      const emptyTip = document.getElementById('emptyTip');
      if(hotWrap) hotWrap.style.display = 'block';
      if(emptyTip) emptyTip.style.display = 'none';

      // 建立完整的号码-生肖映射（用于多维度筛选）
      const fullNumZodiacMap = new Map();
      for(let num = 1; num <= 49; num++) {
        const zod = DataQuery._getZodiacByNum(num);
        if(zod) fullNumZodiacMap.set(num, zod);
      }

      // 构建热门特码的球号显示（使用多维度筛选算法）
      const buildHotNumberBalls = (hotNumStr) => {
        // 使用多维度筛选算法获取热门号码
        let hotNums = analysisCalc.getHotNumbers(data, 5, fullNumZodiacMap);
        
        // 按数字大小排序
        hotNums.sort((a, b) => a - b);
        
        let ballHtml = '<div class="ball-group">';
        hotNums.forEach(num => {
          const color = analysisCalc.getColor(num);
          const zodiac = DataQuery._getZodiacByNum(num);
          const element = analysisCalc.getWuxing(num);
          const numStr = String(num).padStart(2, '0');
          const zodiacText = element ? `${zodiac}/${element}` : zodiac;
          ballHtml += `
            <div class="ball-item">
              <div class="ball ${color}">${numStr}</div>
              <div class="ball-zodiac">${zodiacText}</div>
            </div>
          `;
        });
        ballHtml += '</div>';
        return ballHtml;
      };

      // 更新DOM元素
      const elements = {
        'hotShape': `${data.hotSD[0]} / ${data.hotBS[0]}`,
        'hotZodiac': data.hotZod,
        'hotHeadTail': `${data.hotHead[0]}头 / ${data.hotTail[0]}尾`,
        'hotColorWx': `${data.hotColor[0]} / ${data.hotWx[0]}`,
        'hotMiss': `热:${data.miss.hot} 温:${data.miss.warm} 冷:${data.miss.cold} | 最大遗漏:${data.miss.maxMiss}期`,
        'odd': data.singleDouble['单'],
        'even': data.singleDouble['双'],
        'big': data.bigSmall['大'],
        'small': data.bigSmall['小'],
        'r1': data.range['1-9'],
        'r2': data.range['10-19'],
        'r3': data.range['20-29'],
        'r4': data.range['30-39'],
        'r5': data.range['40-49'],
        'h0': data.head[0],
        'h1': data.head[1],
        'h2': data.head[2],
        'h3': data.head[3],
        'h4': data.head[4],
        'cRed': data.color['红'],
        'cBlue': data.color['蓝'],
        'cGreen': data.color['绿'],
        'wJin': data.wuxing['金'],
        'wMu': data.wuxing['木'],
        'wShui': data.wuxing['水'],
        'wHuo': data.wuxing['火'],
        'wTu': data.wuxing['土'],
        'aniHome': data.animal['家禽'],
        'aniWild': data.animal['野兽'],
        'hotShape2': analysisRender.getTopHot(Object.entries(data.singleDouble).concat(Object.entries(data.bigSmall))),
        'hotRange2': analysisRender.getTopHot(Object.entries(data.range)),
        'hotHead2': analysisRender.getTopHot(Object.entries(data.head)),
        'hotTail2': analysisRender.getTopHot(Object.entries(data.tail)),
        'hotColor2': analysisRender.getTopHot(Object.entries(data.color)),
        'hotWuxing2': analysisRender.getTopHot(Object.entries(data.wuxing)),
        'hotAnimal': analysisRender.getTopHot(Object.entries(data.animal)),
        'hotZodiac2': Object.entries(data.zodiac).sort((a, b) => b[1] - a[1]).slice(0, 5).map(i => `${i[0]}(${i[1]})`).join(' '),
        'missCur': data.miss.curMaxMiss,
        'missAvg': data.miss.avgMiss,
        'missMax': data.miss.maxMiss,
        'missHot': data.miss.hot,
        'missWarm': data.miss.warm,
        'missCold': data.miss.cold,
        'hotColdTip': `热:${data.miss.hot} 温:${data.miss.warm} 冷:${data.miss.cold}`,
        'streakCur': data.streak.curStreak,
        'streakMax': data.streak.maxStreak,
        'streakTip': `当前:${data.streak.curStreak}期 最长:${data.streak.maxStreak}期`
      };

      Object.entries(elements).forEach(([id, value]) => {
        const el = document.getElementById(id);
        if(el) el.innerText = value;
      });

      // 特殊处理热门特码的显示
      const hotNumberEl = document.getElementById('hotNumber');
      if(hotNumberEl) {
        hotNumberEl.innerHTML = buildHotNumberBalls(data.hotNum);
        hotNumberEl.style.color = 'inherit';
      }

      // 尾数行渲染
      const tailRow = document.getElementById('tailRow');
      if(tailRow) {
        let tailHtml = '';
        for(let t = 0; t <= 9; t++) {
          tailHtml += `<div class="analysis-item" data-action="showStatDetail" data-stat-type="tail${t}" style="cursor:pointer;"><div class="label">尾${t}</div><div class="value">${data.tail[t]}</div></div>`;
        }
        tailRow.innerHTML = tailHtml;
      }

      // 完整排行渲染
      analysisRender.renderFullRank('singleDoubleRank', data.singleDouble, data.total);
      analysisRender.renderFullRank('bigSmallRank', data.bigSmall, data.total);
      analysisRender.renderFullRank('rangeRank', data.range, data.total);
      analysisRender.renderFullRank('headRank', data.head, data.total);
      analysisRender.renderFullRank('tailRank', data.tail, data.total);
      analysisRender.renderFullRank('colorRank', data.color, data.total);
      analysisRender.renderFullRank('wuxingRank', data.wuxing, data.total);
      analysisRender.renderFullRank('animalRank', data.animal, data.total);
      analysisRender.renderFullRank('zodiacRank', data.zodiac, data.total);
    }, 'renderFullAnalysis');
  },

  /**
   * 渲染完整排行
   * @param {string} containerId - 容器ID
   * @param {Object} dataObj - 数据对象
   * @param {number} total - 总期数
   */
  renderFullRank: (containerId, dataObj, total) => {
    const container = document.getElementById(containerId);
    if(!container) return;
    if(total === 0) { container.innerHTML = ''; return; }
    
    const sorted = Object.entries(dataObj).sort((a, b) => b[1] - a[1]);
    let html = `
    <div class="rank-header">
      <div class="rank-no">名次</div>
      <div class="rank-name">分类</div>
      <div class="rank-count">次数</div>
      <div class="rank-rate">占比</div>
      <div class="rank-miss">遗漏</div>
    </div>`;
    
    sorted.forEach(([name, count], idx) => {
      const rate = ((count / total) * 100).toFixed(0) + '%';
      const miss = count > 0 ? Math.floor((total - count) / count) : total;
      html += `
      <div class="rank-row">
        <div class="rank-no">${idx + 1}</div>
        <div class="rank-name">${name}</div>
        <div class="rank-count">${count}</div>
        <div class="rank-rate">${rate}</div>
        <div class="rank-miss">${miss}</div>
      </div>`;
    });
    
    container.innerHTML = html;
  },

  /**
   * 渲染生肖关联分析
   */
  renderZodiacAnalysis: () => {
    return PerformanceMonitor.monitorRendering(() => {
      const data = analysisCalc.calcZodiacAnalysis();
      const zodiacEmptyTip = document.getElementById('zodiacEmptyTip');
      const zodiacContent = document.getElementById('zodiacContent');
      
      if(!data) {
        if(zodiacEmptyTip) zodiacEmptyTip.style.display = 'block';
        if(zodiacContent) zodiacContent.style.display = 'none';
        return;
      }
      
      if(zodiacEmptyTip) zodiacEmptyTip.style.display = 'none';
      if(zodiacContent) zodiacContent.style.display = 'block';
      
      IssueManager.updatePredictionTitles();

      // 生肖预测
      const zodiacPredictionGrid = document.getElementById('zodiacPredictionGrid');
      if(zodiacPredictionGrid) {
        if(data.sortedZodiacs && data.sortedZodiacs.length > 0) {
          let predictionHtml = '';
          data.sortedZodiacs.forEach(([zod, score], idx) => {
            const details = data.zodiacDetails[zod];
            let topClass = '';
            if(idx === 0) topClass = 'top-1';
            else if(idx === 1) topClass = 'top-2';
            else if(idx === 2) topClass = 'top-3';

            const tags = [];
            if(details.cold > 0) tags.push(`冷${details.cold}`);
            if(details.hot > 0) tags.push(`热${details.hot}`);
            if(details.shape > 0) tags.push(`形${details.shape}`);
            if(details.interval > 0) tags.push(`间${details.interval}`);

            predictionHtml += `
              <div class="zodiac-prediction-item ${topClass}" data-zodiac="${zod}">
                <div class="zodiac-prediction-zodiac">${zod}</div>
                <div class="zodiac-prediction-score">${score}分</div>
                <div class="zodiac-prediction-details">
                  ${tags.map(t => `<span class="zodiac-prediction-tag">${t}</span>`).join('')}
                </div>
              </div>
            `;
          });
          zodiacPredictionGrid.innerHTML = predictionHtml;
          
          // 生肖预测历史功能已移除
        } else {
          zodiacPredictionGrid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 20px; color: var(--sub-text);">暂无预测数据</div>';
        }
      }
      
      // 精选生肖
      const selectedZodiacsGrid = document.getElementById('selectedZodiacsGrid');
      if(selectedZodiacsGrid) {
        // 动态导入 prediction.js 以避免循环依赖
        import('../../prediction.js').then(({ prediction }) => {
          const selectedZodiacsMap = prediction.getSelectedZodiacs();
          
          // 渲染精选生肖
          if(selectedZodiacsMap.size > 0) {
            let selectedHtml = '';
            selectedZodiacsMap.forEach((periods, zod) => {
              // 生成期数标签（将10期、20期、30期映射为1、2、3）
              const periodTags = periods.map(period => {
                const periodMap = {
                  10: '1',
                  20: '2',
                  30: '3'
                };
                return `
                  <span class="selected-zodiac-period-tag">${periodMap[period] || period}</span>
                `;
              }).join('');
              
              selectedHtml += `
                <div class="selected-zodiac-item" data-zodiac="${zod}" onclick="import('../../../prediction.js').then(({ prediction }) => prediction.showSelectedZodiacRatingDetail('${zod}'))">
                  <div class="zodiac-periods">
                    ${periodTags}
                  </div>
                  <div class="zodiac-name">${zod}</div>
                </div>
              `;
            });
            selectedZodiacsGrid.innerHTML = selectedHtml;
          } else {
            selectedZodiacsGrid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 20px; color: var(--sub-text);">暂无精选生肖数据</div>';
          }
          
          // 精选生肖分析功能已移除
        });
      }

      // 共振组合
      const combo1 = document.getElementById('combo1');
      const combo2 = document.getElementById('combo2');
      const combo3 = document.getElementById('combo3');
      if(combo1) combo1.innerText = `1. 首选：尾${data.topTail[0]?.t ?? '-'} + ${data.topZod[0]?.[0] ?? '-'}（出现${data.topZod[0]?.[1] ?? 0}次）`;
      if(combo2) combo2.innerText = `2. 次选：尾${data.topTail[1]?.t ?? '-'} + ${data.topZod[1]?.[0] ?? '-'}（出现${data.topZod[1]?.[1] ?? 0}次）`;
      if(combo3) combo3.innerText = `3. 备选：尾${data.topTail[2]?.t ?? '-'} + ${data.topZod[2]?.[0] ?? '-'}（出现${data.topZod[2]?.[1] ?? 0}次）`;

      // 尾数→生肖网格
      const tailZodiacGrid = document.getElementById('tailZodiacGrid');
      if(tailZodiacGrid) {
        let tailHtml = '';
        for(let t = 0; t <= 9; t++) {
          const arr = Object.entries(data.tailZodMap[t]).sort((a, b) => b[1] - a[1]);
          const topZ = arr.length ? arr[0][0] : '-';
          const cnt = arr.length ? arr[0][1] : 0;
          const level = analysisCalc.getZodiacLevel(cnt, data.zodMiss[topZ] || 0, data.total);
          tailHtml += `<div class="data-item-z ${level.cls}">尾${t}<br>${topZ}<br>${cnt}次</div>`;
        }
        tailZodiacGrid.innerHTML = tailHtml;
      }

      // 跟随表格
      const zodiacFollowTable = document.getElementById('zodiacFollowTable');
      if(zodiacFollowTable) {
        let followHtml = `<tr><th>上期生肖</th><th>首选(次数)</th><th>次选(次数)</th><th>排除生肖</th></tr>`;
        const followKeys = Object.keys(data.followMap).slice(0, 4);
        followKeys.forEach(k => {
          const arr = Object.entries(data.followMap[k]).sort((a, b) => b[1] - a[1]);
          const first = arr[0] ? `${arr[0][0]}(${arr[0][1]})` : '-';
          const second = arr[1] ? `${arr[1][0]}(${arr[1][1]})` : '-';
          const exclude = CONFIG.ANALYSIS.ZODIAC_ALL.filter(z => !arr.some(x => x[0] === z)).slice(0, 2).join('、');
          followHtml += `<tr><td>${k}</td><td>${first}</td><td>${second}</td><td>${exclude || '-'}</td></tr>`;
        });
        zodiacFollowTable.innerHTML = followHtml;
      }

      // 12生肖统计
      const zodiacTotalGrid = document.getElementById('zodiacTotalGrid');
      if(zodiacTotalGrid) {
        let zodHtml = '';
        CONFIG.ANALYSIS.ZODIAC_ALL.forEach(z => {
          const cnt = data.zodCount[z];
          const miss = data.zodMiss[z];
          const rate = ((cnt / data.total) * 100).toFixed(0) + '%';
          const level = analysisCalc.getZodiacLevel(cnt, miss, data.total);
          zodHtml += `<div class="data-item-z ${level.cls}">${z}<br>${cnt}次/${rate}<br>遗${miss}</div>`;
        });
        zodiacTotalGrid.innerHTML = zodHtml;
      }

      // 高遗漏生肖
      const zodiacMissGrid = document.getElementById('zodiacMissGrid');
      if(zodiacMissGrid) {
        const missSort = Object.entries(data.zodMiss).sort((a, b) => b[1] - a[1]).slice(0, 3);
        let missHtml = '';
        missSort.forEach(([z, m]) => {
          const avgMiss = data.zodAvgMiss[z];
          const tag = m > avgMiss ? '超平均' : '';
          missHtml += `<div class="data-item-z cold">${z}<br>遗${m}期<br>${tag}</div>`;
        });
        zodiacMissGrid.innerHTML = missHtml;
      }

      // 精选特码
      analysisRender.renderZodiacFinalNums(data);
    }, 'renderZodiacAnalysis');
  },

  /**
   * 渲染精选特码
   * @param {Object} data 分析数据
   */
  renderZodiacFinalNums: (data) => {
    const state = StateManager._state;
    const zodiacFinalNumContent = document.getElementById('zodiacFinalNumContent');
    const mode = state.analysis.specialMode || 'hot';
    
    // 同步模式按钮状态
    document.querySelectorAll('.mode-btn[data-mode]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    
    if(!data || !data.sortedZodiacs || data.sortedZodiacs.length === 0) {
      if(zodiacFinalNumContent) {
        zodiacFinalNumContent.innerHTML = '✅ 精选特码：暂无数据';
        zodiacFinalNumContent.classList.remove('final-recommend-z-balls');
      }
      return;
    }
    
    // 建立完整的号码-生肖映射
    const fullNumZodiacMap = new Map();
    for(let num = 1; num <= 49; num++) {
      const zod = DataQuery._getZodiacByNum(num);
      if(zod) fullNumZodiacMap.set(num, zod);
    }

    // 获取号码的颜色
    const getNumColor = (num) => {
      if(CONFIG.COLOR_MAP['红'].includes(num)) return 'red';
      if(CONFIG.COLOR_MAP['蓝'].includes(num)) return 'blue';
      if(CONFIG.COLOR_MAP['绿'].includes(num)) return 'green';
      return 'red';
    };

    // 获取号码的五行
    const getNumElement = (num) => {
      if(CONFIG.ELEMENT_MAP['金'].includes(num)) return '金';
      if(CONFIG.ELEMENT_MAP['木'].includes(num)) return '木';
      if(CONFIG.ELEMENT_MAP['水'].includes(num)) return '水';
      if(CONFIG.ELEMENT_MAP['火'].includes(num)) return '火';
      if(CONFIG.ELEMENT_MAP['土'].includes(num)) return '土';
      return '';
    };

    const targetCount = state.analysis.selectedNumCount;
    let finalNums = [];

    // 根据模式选择不同的筛选策略
    if(mode === 'cold') {
      // ❄️ 冷号反弹模式
      finalNums = analysisCalc.getColdReboundNumbers(data, targetCount, fullNumZodiacMap);
    } else if(mode === 'auto') {
      // 🤖 自动模式：智能判断使用热号还是冷号模式
      const modeDecision = analysisCalc.decideAutoMode(data);
      if(modeDecision === 'cold') {
        finalNums = analysisCalc.getColdReboundNumbers(data, targetCount, fullNumZodiacMap);
      } else {
        finalNums = analysisCalc.getHotNumbers(data, targetCount, fullNumZodiacMap);
      }
    } else {
      // 🔥 热号模式（默认）
      finalNums = analysisCalc.getHotNumbers(data, targetCount, fullNumZodiacMap);
    }

    // 排序
    finalNums.sort((a, b) => a - b);

    // 渲染成带颜色、生肖和五行的球号
    let ballHtml = '<div class="ball-group">';
    finalNums.forEach(num => {
      const color = getNumColor(num);
      const zodiac = fullNumZodiacMap.get(num) || '';
      const element = getNumElement(num);
      const numStr = String(num).padStart(2, '0');
      const zodiacText = element ? `${zodiac}/${element}` : zodiac;
      ballHtml += `
        <div class="ball-item">
          <div class="ball ${color}">${numStr}</div>
          <div class="ball-zodiac">${zodiacText}</div>
        </div>
      `;
    });
    ballHtml += '</div>';
    
    // 为自动模式添加子模式显示
    if(mode === 'auto') {
      const modeDecision = analysisCalc.decideAutoMode(data);
      const subModeText = modeDecision === 'cold' ? '❄️ 冷号模式' : '🔥 热号模式';
      ballHtml = `<div class="auto-mode-submode" style="text-align:center; margin-bottom:10px; font-size:14px; color:#666;">自动模式当前选择：${subModeText}</div>` + ballHtml;
    }

    if(zodiacFinalNumContent) {
      zodiacFinalNumContent.innerHTML = ballHtml;
      zodiacFinalNumContent.classList.add('final-recommend-z-balls');
    }
  },

  /**
   * 获取热门数据
   * @param {Array} arr - 数据数组
   * @param {number} limit - 限制数量
   * @returns {string} 热门数据字符串
   */
  getTopHot: (arr, limit = 2) => {
    return arr.sort((a, b) => b[1] - a[1]).slice(0, limit).map(i => i[0]).join(' / ');
  },

  /**
   * 显示统计详情
   * @param {string} statType - 统计类型
   */
  showStatDetail: (statType) => {
    const data = analysisCalc.calcFullAnalysis();
    if(!data) {
      Toast.show('暂无数据可分析');
      return;
    }

    // 统计类型映射
    const statTypeMap = {
      'odd': { name: '单数', data: data.singleDouble['单'], total: data.total },
      'even': { name: '双数', data: data.singleDouble['双'], total: data.total },
      'big': { name: '大(≥25)', data: data.bigSmall['大'], total: data.total },
      'small': { name: '小(&lt;25)', data: data.bigSmall['小'], total: data.total },
      'range1': { name: '1-9', data: data.range['1-9'], total: data.total },
      'range2': { name: '10-19', data: data.range['10-19'], total: data.total },
      'range3': { name: '20-29', data: data.range['20-29'], total: data.total },
      'range4': { name: '30-39', data: data.range['30-39'], total: data.total },
      'range5': { name: '40-49', data: data.range['40-49'], total: data.total },
      'head0': { name: '头0', data: data.head[0], total: data.total },
      'head1': { name: '头1', data: data.head[1], total: data.total },
      'head2': { name: '头2', data: data.head[2], total: data.total },
      'head3': { name: '头3', data: data.head[3], total: data.total },
      'head4': { name: '头4', data: data.head[4], total: data.total },
      'red': { name: '红波', data: data.color['红'], total: data.total },
      'blue': { name: '蓝波', data: data.color['蓝'], total: data.total },
      'green': { name: '绿波', data: data.color['绿'], total: data.total },
      'jin': { name: '金', data: data.wuxing['金'], total: data.total },
      'mu': { name: '木', data: data.wuxing['木'], total: data.total },
      'shui': { name: '水', data: data.wuxing['水'], total: data.total },
      'huo': { name: '火', data: data.wuxing['火'], total: data.total },
      'tu': { name: '土', data: data.wuxing['土'], total: data.total },
      'home': { name: '家禽', data: data.animal['家禽'], total: data.total },
      'wild': { name: '野兽', data: data.animal['野兽'], total: data.total }
    };

    // 处理尾数统计
    if(statType.startsWith('tail')) {
      const tailNum = parseInt(statType.replace('tail', ''));
      statTypeMap[statType] = {
        name: `尾${tailNum}`,
        data: data.tail[tailNum],
        total: data.total
      };
    }

    const stat = statTypeMap[statType];
    if(!stat) {
      Toast.show('无效的统计类型');
      return;
    }

    const percentage = data.total > 0 ? ((stat.data / data.total) * 100).toFixed(2) : '0.00';
    const average = data.total > 0 ? (data.total / stat.data).toFixed(2) : '0.00';

    // 创建弹窗
    const modal = document.createElement('div');
    modal.className = 'stat-detail-modal';
    modal.innerHTML = `
      <div class="stat-detail-content">
        <div class="stat-detail-header">
          <h3>${stat.name}统计详情</h3>
          <button class="close-btn" onclick="this.closest('.stat-detail-modal').remove()">×</button>
        </div>
        <div class="stat-detail-body">
          <div class="stat-detail-item">
            <span class="label">出现次数：</span>
            <span class="value">${stat.data}次</span>
          </div>
          <div class="stat-detail-item">
            <span class="label">总期数：</span>
            <span class="value">${stat.total}期</span>
          </div>
          <div class="stat-detail-item">
            <span class="label">占比：</span>
            <span class="value">${percentage}%</span>
          </div>
          <div class="stat-detail-item">
            <span class="label">平均周期：</span>
            <span class="value">${average}期</span>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // 点击模态框外部关闭
    modal.addEventListener('click', (e) => {
      if(e.target === modal) {
        modal.remove();
      }
    });
  },

  /**
   * 显示连出详情
   * @param {string} streakType - 连出类型
   */
  showStreakDetail: (streakType) => {
    const data = analysisCalc.calcFullAnalysis();
    if(!data) {
      Toast.show('暂无数据可分析');
      return;
    }

    const streakData = streakType === 'current' ? data.streak.curStreakData : data.streak.maxStreakData;
    const streakName = streakType === 'current' ? '当前连出' : '最长连出';

    if(!streakData || streakData.length === 0) {
      Toast.show('暂无连出数据');
      return;
    }

    // 创建弹窗
    const modal = document.createElement('div');
    modal.className = 'streak-detail-modal';
    
    let detailHtml = '';
    streakData.forEach(item => {
      detailHtml += `
        <div class="streak-detail-item">
          <span class="expect">第${item.expect}期</span>
          <span class="te">特码：${item.te}</span>
          <span class="shape">形态：${item.shape}</span>
        </div>
      `;
    });

    modal.innerHTML = `
      <div class="streak-detail-content">
        <div class="streak-detail-header">
          <h3>${streakName}详情</h3>
          <button class="close-btn" onclick="this.closest('.streak-detail-modal').remove()">×</button>
        </div>
        <div class="streak-detail-body">
          <div class="streak-detail-list">
            ${detailHtml}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // 点击模态框外部关闭
    modal.addEventListener('click', (e) => {
      if(e.target === modal) {
        modal.remove();
      }
    });
  },

  /**
   * 显示生肖详情
   * @param {string} zodiac - 生肖
   */
  showZodiacDetail: (zodiac) => {
    const data = analysisCalc.calcZodiacAnalysis();
    if(!data) {
      Toast.show('暂无数据可分析');
      return;
    }

    const count = data.zodCount[zodiac] || 0;
    const miss = data.zodMiss[zodiac] || 0;
    const avgMiss = data.zodAvgMiss[zodiac] || 0;
    const percentage = data.total > 0 ? ((count / data.total) * 100).toFixed(2) : '0.00';

    // 获取该生肖对应的号码
    const zodiacNumbers = [];
    for(let num = 1; num <= 49; num++) {
      const numZodiac = DataQuery._getZodiacByNum(num);
      if(numZodiac === zodiac) {
        zodiacNumbers.push(num);
      }
    }

    // 按波色分组
    const colorGroups = {
      '红': [],
      '蓝': [],
      '绿': []
    };

    zodiacNumbers.forEach(num => {
      const color = analysisCalc.getColorName(num);
      if(colorGroups[color]) {
        colorGroups[color].push(num);
      }
    });

    // 创建号码分组HTML
    let numbersHtml = '';
    Object.entries(colorGroups).forEach(([color, numbers]) => {
      if(numbers.length > 0) {
        numbersHtml += `
          <div class="zodiac-numbers-group">
            <h4>${color}波</h4>
            <div class="zodiac-numbers">
              ${numbers.map(num => {
                const colorClass = analysisCalc.getColor(num);
                return `<span class="zodiac-number ${colorClass}">${String(num).padStart(2, '0')}</span>`;
              }).join(' ')}
            </div>
          </div>
        `;
      }
    });

    // 创建弹窗
    const modal = document.createElement('div');
    modal.className = 'zodiac-detail-modal';
    modal.innerHTML = `
      <div class="zodiac-detail-content">
        <div class="zodiac-detail-header">
          <h3>${zodiac}统计详情</h3>
          <button class="close-btn" onclick="this.closest('.zodiac-detail-modal').remove()">×</button>
        </div>
        <div class="zodiac-detail-body">
          <div class="zodiac-detail-stats">
            <div class="zodiac-detail-item">
              <span class="label">出现次数：</span>
              <span class="value">${count}次</span>
            </div>
            <div class="zodiac-detail-item">
              <span class="label">遗漏期数：</span>
              <span class="value">${miss}期</span>
            </div>
            <div class="zodiac-detail-item">
              <span class="label">平均遗漏：</span>
              <span class="value">${avgMiss}期</span>
            </div>
            <div class="zodiac-detail-item">
              <span class="label">占比：</span>
              <span class="value">${percentage}%</span>
            </div>
          </div>
          <div class="zodiac-detail-numbers">
            <h4>对应号码</h4>
            ${numbersHtml}
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // 点击模态框外部关闭
    modal.addEventListener('click', (e) => {
      if(e.target === modal) {
        modal.remove();
      }
    });
  },

  /**
   * 开始倒计时
   */
  startCountdown: () => {
    // 倒计时功能实现
    const countdown = document.getElementById('countdown');
    if(!countdown) return;

    const updateCountdown = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const seconds = now.getSeconds();
      
      // 计算距离下一次开奖的时间
      let nextOpenHour = 21;
      let nextOpenMinute = 30;
      
      let timeLeft = (nextOpenHour - hours) * 3600 + (nextOpenMinute - minutes) * 60 - seconds;
      if(timeLeft < 0) {
        timeLeft += 24 * 3600;
      }
      
      const h = Math.floor(timeLeft / 3600);
      const m = Math.floor((timeLeft % 3600) / 60);
      const s = timeLeft % 60;
      
      countdown.innerText = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    updateCountdown();
    setInterval(updateCountdown, 1000);
  },

  /**
   * 开始自动刷新
   */
  startAutoRefresh: () => {
    // 每5分钟自动刷新一次数据
    setInterval(() => {
      import('./data-fetch.js').then(({ dataFetch }) => {
        dataFetch.silentRefreshHistory();
      });
    }, 5 * 60 * 1000);
  },

  /**
   * 更新冷热状态
   */
  updateHotColdStatus: () => {
    // 更新冷热状态的实现
    const hotColdStatus = document.getElementById('hotColdStatus');
    if(!hotColdStatus) return;

    const data = analysisCalc.calcFullAnalysis();
    if(!data) return;

    const hotCount = data.miss.hot;
    const warmCount = data.miss.warm;
    const coldCount = data.miss.cold;

    hotColdStatus.innerText = `热:${hotCount} 温:${warmCount} 冷:${coldCount}`;
  },


};
