// ====================== 分析页面模块 ======================

// 导入必要的模块
import { CONFIG } from '../config.js';
import { Utils } from '../utils.js';
import { StateManager } from '../state-manager.js';
import { DOM } from '../dom.js';
import { DataQuery } from '../data-query.js';
import { Storage } from '../storage.js';
import { Toast } from '../toast.js';

export const analysis = {
  _calcZodiacAnalysisCache: new Map(),

  /**
   * 初始化分析页面
   */
  initAnalysisPage: () => {
    const state = StateManager._state;
    if(state.analysis.historyData.length === 0) {
      // 尝试从缓存加载
      const cache = Storage.loadHistoryCache();
      if(cache.data && cache.data.length > 0) {
        // 使用缓存数据
        const newAnalysis = { 
          ...state.analysis, 
          historyData: cache.data 
        };
        StateManager.setState({ analysis: newAnalysis }, false);
        
        // 渲染数据
        analysis.renderLatest(cache.data[0]);
        analysis.renderHistory();
        analysis.renderFullAnalysis();
        analysis.renderZodiacAnalysis();
        analysis.updateHotColdStatus();
        
        Toast.show('已从缓存加载数据');
        
        // 后台静默刷新
        setTimeout(() => analysis.silentRefreshHistory(), 2000);
      } else {
        // 没有缓存，正常加载
        analysis.refreshHistory();
      }
    } else {
      // 已有数据，直接渲染，不再额外刷新（initApp已经处理了）
      analysis.renderLatest(state.analysis.historyData[0]);
      analysis.renderHistory();
      analysis.renderFullAnalysis();
      analysis.renderZodiacAnalysis();
      analysis.updateHotColdStatus();
    }
    analysis.startCountdown();
    analysis.startAutoRefresh();
  },

  /**
   * 带超时的 fetch 请求
   * @private
   * @param {string} url - 请求 URL
   * @param {number} timeout - 超时时间（毫秒）
   * @returns {Promise} - 返回 fetch 响应
   */
  _fetchWithTimeout: (url, timeout = 10000) => {
    return Promise.race([
      fetch(url),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('请求超时')), timeout)
      )
    ]);
  },

  /**
   * 获取最新开奖记录
   * @private
   * @param {number} retries - 重试次数
   * @returns {Promise<Array>} - 返回最新开奖记录
   */
  _fetchLatestData: async (retries = 3) => {
    console.log(`开始获取最新开奖记录，重试次数: ${retries}`);
    const url = CONFIG.API.LATEST;
    console.log(`请求URL: ${url}`);
    
    for (let i = 0; i < retries; i++) {
      try {
        console.log(`尝试 ${i + 1}/${retries} 获取数据...`);
        const res = await analysis._fetchWithTimeout(url);
        
        console.log(`响应状态: ${res.status} ${res.statusText}`);
        
        if (!res.ok) {
          throw new Error(`API请求失败: ${res.status} ${res.statusText}`);
        }
        
        console.log('响应成功，开始解析数据...');
        const data = await res.json();
        console.log(`数据解析成功，数据长度: ${data ? data.length : 0}`);
        
        return data || [];
      } catch (e) {
        console.error(`获取最新开奖记录失败（尝试 ${i + 1}/${retries}）:`, e);
        if (i === retries - 1) {
          throw e;
        }
        // 等待一段时间后重试
        console.log(`等待 ${1000 * (i + 1)} 毫秒后重试...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  },

  /**
   * 带重试机制的历史数据获取
   * @private
   * @param {number} year - 年份
   * @param {number} retries - 重试次数
   * @returns {Promise<Array>} - 返回历史数据
   */
  _fetchHistoryData: async (year, retries = 3) => {
    console.log(`开始获取历史数据，年份: ${year}，重试次数: ${retries}`);
    const url = CONFIG.API.HISTORY + year;
    console.log(`请求URL: ${url}`);
    
    for (let i = 0; i < retries; i++) {
      try {
        console.log(`尝试 ${i + 1}/${retries} 获取数据...`);
        const res = await analysis._fetchWithTimeout(url);
        
        console.log(`响应状态: ${res.status} ${res.statusText}`);
        
        if (!res.ok) {
          throw new Error(`API请求失败: ${res.status} ${res.statusText}`);
        }
        
        console.log('响应成功，开始解析数据...');
        const data = await res.json();
        console.log(`数据解析成功，数据长度: ${data.data ? data.data.length : 0}`);
        
        return data.data || [];
      } catch (e) {
        console.error(`获取历史数据失败（尝试 ${i + 1}/${retries}）:`, e);
        if (i === retries - 1) {
          throw e;
        }
        // 等待一段时间后重试
        console.log(`等待 ${1000 * (i + 1)} 毫秒后重试...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  },

  /**
   * 处理历史数据
   * @private
   * @param {Array} rawData - 原始数据
   * @returns {Array} - 处理后的数据
   */
  _processHistoryData: (rawData) => {
    // 过滤无效数据
    const filteredData = rawData.filter(item => {
      const expect = item.expect || '';
      const openCode = item.openCode || '';
      return expect && openCode && openCode.split(',').length === 7;
    });

    // 去重并排序
    const uniqueMap = new Map();
    filteredData.forEach(item => {
      const expectNum = Number(item.expect || 0);
      if(expectNum && !isNaN(expectNum)) {
        uniqueMap.set(expectNum, item);
      }
    });

    return Array.from(uniqueMap.values()).sort((a, b) => {
      return Number(b.expect || 0) - Number(a.expect || 0);
    });
  },

  /**
   * 静默刷新历史数据（不显示加载状态）
   */
  silentRefreshHistory: async () => {
    try {
      // 先获取最新开奖记录
      const latestData = await analysis._fetchLatestData();
      // 然后获取历史数据
      const year = new Date().getFullYear();
      const historyData = await analysis._fetchHistoryData(year);
      
      // 合并数据，最新开奖记录优先
      const combinedData = [...latestData, ...historyData];
      const sortedData = analysis._processHistoryData(combinedData);

      // 检查数据是否有变化
      const currentData = StateManager._state.analysis.historyData;
      const hasDataChanged = analysis.hasDataChanged(currentData, sortedData);

      if (hasDataChanged) {
        // 更新状态
        const newAnalysis = { 
          ...StateManager._state.analysis, 
          historyData: sortedData 
        };
        StateManager.setState({ analysis: newAnalysis }, false);

        // 保存到缓存
        Storage.saveHistoryCache(sortedData);

        // 渲染
        analysis.renderLatest(sortedData[0]);
        analysis.renderHistory();
        analysis.renderFullAnalysis();
        analysis.renderZodiacAnalysis();
        analysis.updateHotColdStatus();
        
        // 静默更新所有期数的预测历史
        // 注意：这里需要调用 prediction.js 中的方法，但为了避免循环依赖，暂时注释
        // Business.silentUpdateAllPredictionHistory();
        // 同时更新精选特码历史的开奖记录比较
        // Business.updateSpecialHistoryComparison();
        // 重新渲染精选特码历史以显示最新比较结果
        // Business.renderSpecialHistory();
      }
    } catch(e) {
      console.debug('静默刷新失败（API可能不可用）:', e.message);
      // 不显示错误，保持静默
      // 尝试使用模拟数据
      try {
        const mockData = analysis.getMockHistoryData();
        const currentData = StateManager._state.analysis.historyData;
        const hasDataChanged = analysis.hasDataChanged(currentData, mockData);
        
        if (hasDataChanged) {
          const newAnalysis = { 
            ...StateManager._state.analysis, 
            historyData: mockData 
          };
          StateManager.setState({ analysis: newAnalysis }, false);
          
          // 渲染
          analysis.renderLatest(mockData[0]);
          analysis.renderHistory();
          analysis.renderFullAnalysis();
          analysis.renderZodiacAnalysis();
          analysis.updateHotColdStatus();
        }
      } catch(mockError) {
        console.debug('使用模拟数据失败:', mockError.message);
      }
    }
  },

  /**
   * 刷新历史数据
   * @param {boolean} silent - 是否静默模式（不显示提示）
   */
  refreshHistory: async (silent = false) => {
    const historyList = document.getElementById('historyList');
    if(historyList && !silent) historyList.innerHTML = '<div style="padding:20px;text-align:center;">加载中...</div>';
    
    try {
      // 先获取最新开奖记录
      const latestData = await analysis._fetchLatestData();
      // 然后获取历史数据
      const year = new Date().getFullYear();
      const historyData = await analysis._fetchHistoryData(year);
      
      // 合并数据，最新开奖记录优先
      const combinedData = [...latestData, ...historyData];
      const sortedData = analysis._processHistoryData(combinedData);

      // 检查数据是否有变化
      const currentData = StateManager._state.analysis.historyData;
      const hasDataChanged = analysis.hasDataChanged(currentData, sortedData);

      if (hasDataChanged) {
        // 更新状态
        const newAnalysis = { ...StateManager._state.analysis, historyData: sortedData };
        StateManager.setState({ analysis: newAnalysis }, false);

        // 保存到缓存
        Storage.saveHistoryCache(sortedData);

        // 渲染
        analysis.renderLatest(sortedData[0]);
        analysis.renderHistory();
        analysis.renderFullAnalysis();
        analysis.renderZodiacAnalysis();
        
        // 更新冷热号状态
        analysis.updateHotColdStatus();
        
        // 静默更新所有期数的预测历史
        // 注意：这里需要调用 prediction.js 中的方法，但为了避免循环依赖，暂时注释
        // Business.silentUpdateAllPredictionHistory();
        // 同时更新精选特码历史的开奖记录比较
        // Business.updateSpecialHistoryComparison();
        // 重新渲染精选特码历史以显示最新比较结果
        // Business.renderSpecialHistory();
        
        if(!silent) Toast.show('数据加载成功');
      } else if (!silent) {
        Toast.show('数据已是最新');
      }
    } catch(e) {
      console.error('加载历史数据失败', e);
      if(historyList && !silent) {
        historyList.innerHTML = '<div style="padding:20px;text-align:center;color:var(--danger);">数据加载失败，可能是网络问题</div>';
      }
      if(!silent) Toast.show('数据加载失败，可能是网络问题');
      
      // 尝试使用模拟数据
      try {
        const mockData = analysis.getMockHistoryData();
        const currentData = StateManager._state.analysis.historyData;
        const hasDataChanged = analysis.hasDataChanged(currentData, mockData);
        
        if (hasDataChanged) {
          const newAnalysis = { 
            ...StateManager._state.analysis, 
            historyData: mockData 
          };
          StateManager.setState({ analysis: newAnalysis }, false);
          
          // 渲染
          analysis.renderLatest(mockData[0]);
          analysis.renderHistory();
          analysis.renderFullAnalysis();
          analysis.renderZodiacAnalysis();
          analysis.updateHotColdStatus();
          
          if(!silent) Toast.show('已使用模拟数据');
        }
      } catch(mockError) {
        console.debug('使用模拟数据失败:', mockError.message);
      }
    }
    
    const loadMore = document.getElementById('loadMore');
    if(loadMore) {
      loadMore.style.display = StateManager._state.analysis.historyData.length > StateManager._state.analysis.showCount ? 'block' : 'none';
    }
  },

  /**
   * 获取模拟历史数据
   * @returns {Array} 模拟历史数据
   */
  getMockHistoryData: () => {
    const mockData = [];
    const zodiacs = CONFIG.ANALYSIS.ZODIAC_ALL;
    const colors = ['红', '蓝', '绿'];
    
    for(let i = 1; i <= 50; i++) {
      const te = Math.floor(Math.random() * 49) + 1;
      const codeArr = [];
      const zodArr = [];
      
      // 生成6个普通号码
      for(let j = 0; j < 6; j++) {
        let num;
        do {
          num = Math.floor(Math.random() * 49) + 1;
        } while(codeArr.includes(num));
        codeArr.push(num);
        zodArr.push(zodiacs[Math.floor(Math.random() * 12)]);
      }
      
      // 添加特码
      codeArr.push(te);
      zodArr.push(zodiacs[Math.floor(Math.random() * 12)]);
      
      mockData.push({
        expect: `2026${String(i).padStart(3, '0')}`,
        opentime: `2026-0${Math.floor(Math.random() * 12) + 1}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
        openCode: codeArr.join(','),
        zodiac: zodArr.join(','),
        openCodeArr: codeArr,
        zodiacArr: zodArr
      });
    }
    
    return mockData;
  },

  /**
   * 获取特码信息
   * @param {Object} item - 历史数据项
   * @returns {Object} 特码信息
   */
  getSpecial: (item) => {
    const codeArr = (item.openCode || "0,0,0,0,0,0,0").split(",");
    const zodArrRaw = (item.zodiac || ",,,,,,,,,,,,").split(",");
    const zodArr = zodArrRaw.map(z => CONFIG.ANALYSIS.ZODIAC_TRAD_TO_SIMP[z] || z);
    const te = Math.max(0, Number(codeArr[6]));
    
    return {
      te,
      tail: te % 10,
      head: Math.floor(te / 10),
      wave: analysis.getColor(te),
      colorName: analysis.getColorName(te),
      zod: zodArr[6] || "-",
      odd: te % 2 === 1,
      big: te >= 25,
      animal: CONFIG.ANALYSIS.HOME_ZODIAC.includes(zodArr[6]) ? "家禽" : "野兽",
      wuxing: analysis.getWuxing(te),
      fullZodArr: zodArr
    };
  },

  getColor: (n) => {
    const color = Object.keys(CONFIG.COLOR_MAP).find(c => CONFIG.COLOR_MAP[c].includes(n));
    const colorMap = { '红': 'red', '蓝': 'blue', '绿': 'green' };
    return colorMap[color] || 'red';
  },
  
  getColorName: (n) => {
    const color = Object.keys(CONFIG.COLOR_MAP).find(c => CONFIG.COLOR_MAP[c].includes(n));
    return color || '红';
  },
  
  getWuxing: (n) => {
    const element = Object.keys(CONFIG.ELEMENT_MAP).find(e => CONFIG.ELEMENT_MAP[e].includes(n));
    return element || '金';
  },

  getZodiacLevel: (count, miss, total) => {
    const avgCount = total / 12;
    if(count >= avgCount * 1.5 && miss <= 3) return { cls: 'hot', text: '热' };
    if(count <= avgCount * 0.5 || miss >= 8) return { cls: 'cold', text: '冷' };
    return { cls: 'warm', text: '温' };
  },

  /**
   * 渲染最新开奖
   * @param {Object} item - 最新数据项
   */
  renderLatest: (item) => {
    if(!item) return;
    const codeArr = (item.openCode || '0,0,0,0,0,0,0').split(',');
    const s = analysis.getSpecial(item);
    const zodArr = s.fullZodArr;
    
    let html = '';
    for(let i = 0; i < 6; i++) {
      const num = Number(codeArr[i]);
      html += analysis.buildBall(codeArr[i], analysis.getColor(num), zodArr[i]);
    }
    html += '<div class="ball-sep">+</div>' + analysis.buildBall(codeArr[6], s.wave, zodArr[6]);
    
    const latestBalls = document.getElementById('latestBalls');
    const curExpect = document.getElementById('curExpect');
    if(latestBalls) latestBalls.innerHTML = html;
    if(curExpect) curExpect.innerText = item.expect || '--';
  },

  buildBall: (num, color, zodiac) => {
    return `
    <div class="ball-item">
      <div class="ball ${color}">${num}</div>
      <div class="ball-zodiac">${zodiac}</div>
    </div>`;
  },

  /**
   * 渲染历史记录
   */
  renderHistory: () => {
    const state = StateManager._state;
    const list = state.analysis.historyData.slice(0, state.analysis.showCount);
    const historyList = document.getElementById('historyList');
    
    if(!list.length) {
      if(historyList) historyList.innerHTML = '<div style="padding:20px;text-align:center;">暂无历史数据</div>';
      return;
    }
    
    if(historyList) {
      historyList.innerHTML = list.map(item => {
        const codeArr = (item.openCode || '0,0,0,0,0,0,0').split(',');
        const s = analysis.getSpecial(item);
        const zodArr = s.fullZodArr;
        let balls = '';
        for(let i = 0; i < 6; i++) {
          const num = Number(codeArr[i]);
          balls += analysis.buildBall(codeArr[i], analysis.getColor(num), zodArr[i]);
        }
        const teNum = Number(codeArr[6]);
        balls += '<div class="ball-sep">+</div>' + analysis.buildBall(codeArr[6], analysis.getColor(teNum), zodArr[6]);
        return `
        <div class="history-item">
          <div class="history-expect">第${item.expect || ''}期</div>
          <div class="ball-group">${balls}</div>
        </div>`;
      }).join('');
    }
  },

  /**
   * 计算全维度分析
   * @returns {Object} 分析数据
   */
  calcFullAnalysis: () => {
    const state = StateManager._state;
    const { historyData, analyzeLimit } = state.analysis;
    if(!historyData.length) return null;

    const list = historyData.slice(0, Math.min(analyzeLimit, historyData.length));
    const total = list.length;

    // 初始化统计对象
    const singleDouble = { '单': 0, '双': 0 };
    const bigSmall = { '大': 0, '小': 0 };
    const range = { '1-9': 0, '10-19': 0, '20-29': 0, '30-39': 0, '40-49': 0 };
    const head = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };
    const tail = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0 };
    const color = { '红': 0, '蓝': 0, '绿': 0 };
    const wuxing = { '金': 0, '木': 0, '水': 0, '火': 0, '土': 0 };
    const animal = { '家禽': 0, '野兽': 0 };
    const zodiac = {};
    CONFIG.ANALYSIS.ZODIAC_ALL.forEach(z => zodiac[z] = 0);
    const numCount = {};
    for(let i = 1; i <= 49; i++) numCount[String(i).padStart(2, '0')] = 0;
    const lastAppear = {};
    for(let i = 1; i <= 49; i++) lastAppear[i] = -1;

    // 统计
    list.forEach((item, idx) => {
      const s = analysis.getSpecial(item);
      s.odd ? singleDouble['单']++ : singleDouble['双']++;
      s.big ? bigSmall['大']++ : bigSmall['小']++;
      s.te <= 9 ? range['1-9']++ : s.te <= 19 ? range['10-19']++ : s.te <= 29 ? range['20-29']++ : s.te <= 39 ? range['30-39']++ : range['40-49']++;
      head[s.head]++;
      tail[s.tail]++;
      color[s.colorName]++;
      wuxing[s.wuxing]++;
      animal[s.animal]++;
      if(CONFIG.ANALYSIS.ZODIAC_ALL.includes(s.zod)) zodiac[s.zod]++;
      numCount[String(s.te).padStart(2, '0')]++;
      if(lastAppear[s.te] === -1) lastAppear[s.te] = idx;
    });

    // 遗漏计算
    let totalMissSum = 0, maxMiss = 0, hot = 0, warm = 0, cold = 0;
    const allMiss = [];
    for(let m = 1; m <= 49; m++) {
      const p = lastAppear[m];
      const currentMiss = p === -1 ? total : p;
      allMiss.push(currentMiss);
      totalMissSum += currentMiss;
      if(currentMiss > maxMiss) maxMiss = currentMiss;
      if(currentMiss <= 3) hot++;
      else if(currentMiss <= 9) warm++;
      else cold++;
    }
    const avgMiss = (totalMissSum / 49).toFixed(1);
    const curMaxMiss = Math.max(...allMiss);

    // 连出计算
    let curStreak = 1, maxStreak = 1, current = 1;
    let curStreakData = [];
    let maxStreakData = [];
    let tempStreakData = [];
    
    // 辅助函数：将布尔值转换为中文形态
    const getShapeText = (odd, big) => {
      const oddText = odd ? '单' : '双';
      const bigText = big ? '大' : '小';
      return `${oddText}_${bigText}`;
    };
    
    if(list.length >= 2) {
      const firstSpecial = analysis.getSpecial(list[0]);
      const firstShape = getShapeText(firstSpecial.odd, firstSpecial.big);
      curStreakData.push({
        expect: list[0].expect,
        te: firstSpecial.te,
        shape: firstShape
      });
      for(let i = 1; i < list.length; i++) {
        const s = analysis.getSpecial(list[i]);
        const shape = getShapeText(s.odd, s.big);
        if(shape === firstShape) {
          curStreak++;
          curStreakData.push({
            expect: list[i].expect,
            te: s.te,
            shape: shape
          });
        } else break;
      }
      
      let prevShape = getShapeText(firstSpecial.odd, firstSpecial.big);
      tempStreakData.push({
        expect: list[0].expect,
        te: firstSpecial.te,
        shape: prevShape
      });
      
      for(let i = 1; i < list.length; i++) {
        const s = analysis.getSpecial(list[i]);
        const shape = getShapeText(s.odd, s.big);
        if(shape === prevShape) {
          current++;
          tempStreakData.push({
            expect: list[i].expect,
            te: s.te,
            shape: shape
          });
          if(current > maxStreak) {
            maxStreak = current;
            maxStreakData = [...tempStreakData];
          }
        } else {
          current = 1;
          prevShape = shape;
          tempStreakData = [{
            expect: list[i].expect,
            te: s.te,
            shape: shape
          }];
        }
      }
    }

    // 热门排序
    const hotSD = Object.entries(singleDouble).sort((a, b) => b[1] - a[1])[0];
    const hotBS = Object.entries(bigSmall).sort((a, b) => b[1] - a[1])[0];
    const hotHead = Object.entries(head).sort((a, b) => b[1] - a[1])[0];
    const hotTail = Object.entries(tail).sort((a, b) => b[1] - a[1])[0];
    const hotColor = Object.entries(color).sort((a, b) => b[1] - a[1])[0];
    const hotWx = Object.entries(wuxing).sort((a, b) => b[1] - a[1])[0];
    const hotZod = Object.entries(zodiac).sort((a, b) => b[1] - a[1]).slice(0, 3).map(i => i[0]).join('、');
    const hotAni = Object.entries(animal).sort((a, b) => b[1] - a[1])[0];
    const hotNum = Object.entries(numCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(i => i[0]).join(' ');

    return {
      total, singleDouble, bigSmall, range, head, tail, color, wuxing, animal, zodiac, numCount,
      hotSD, hotBS, hotHead, hotTail, hotColor, hotWx, hotZod, hotAni, hotNum,
      miss: { curMaxMiss, avgMiss, maxMiss, hot, warm, cold },
      streak: { curStreak, maxStreak, curStreakData, maxStreakData }
    };
  },

  getTopHot: (arr, limit = 2) => {
    return arr.sort((a, b) => b[1] - a[1]).slice(0, limit).map(i => i[0]).join(' / ');
  },

  renderFullAnalysis: () => {
    const data = analysis.calcFullAnalysis();
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
      let hotNums = analysis.getHotNumbers(data, 5, fullNumZodiacMap);
      
      // 按数字大小排序
      hotNums.sort((a, b) => a - b);
      
      let ballHtml = '<div class="ball-group">';
      hotNums.forEach(num => {
        const color = analysis.getColor(num);
        const zodiac = DataQuery._getZodiacByNum(num);
        const element = analysis.getWuxing(num);
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
      'hotShape2': analysis.getTopHot(Object.entries(data.singleDouble).concat(Object.entries(data.bigSmall))),
      'hotRange2': analysis.getTopHot(Object.entries(data.range)),
      'hotHead2': analysis.getTopHot(Object.entries(data.head)),
      'hotTail2': analysis.getTopHot(Object.entries(data.tail)),
      'hotColor2': analysis.getTopHot(Object.entries(data.color)),
      'hotWuxing2': analysis.getTopHot(Object.entries(data.wuxing)),
      'hotAnimal': analysis.getTopHot(Object.entries(data.animal)),
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
    analysis.renderFullRank('singleDoubleRank', data.singleDouble, data.total);
    analysis.renderFullRank('bigSmallRank', data.bigSmall, data.total);
    analysis.renderFullRank('rangeRank', data.range, data.total);
    analysis.renderFullRank('headRank', data.head, data.total);
    analysis.renderFullRank('tailRank', data.tail, data.total);
    analysis.renderFullRank('colorRank', data.color, data.total);
    analysis.renderFullRank('wuxingRank', data.wuxing, data.total);
    analysis.renderFullRank('animalRank', data.animal, data.total);
    analysis.renderFullRank('zodiacRank', data.zodiac, data.total);
  },

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
   * 计算生肖关联分析（带缓存）
   * @returns {Object} 分析数据
   */
  calcZodiacAnalysis: (customAnalyzeLimit) => {
    const state = StateManager._state;
    const { historyData } = state.analysis;
    const analyzeLimit = customAnalyzeLimit !== undefined ? customAnalyzeLimit : state.analysis.analyzeLimit;
    
    // 检查缓存
    const cacheKey = String(analyzeLimit);
    const cached = analysis._calcZodiacAnalysisCache.get(cacheKey);
    
    // 验证缓存有效性：检查历史数据是否变化
    if(cached && historyData && historyData.length > 0) {
      const latestExpect = historyData[0].expect;
      if(cached.latestExpect === latestExpect) {
        return cached.result; // 缓存有效，直接返回
      }
    }
    
    // 缓存无效或不存在，执行原始计算逻辑
    const result = analysis._calcZodiacAnalysisOriginal(analyzeLimit);
    
    // 更新缓存
    if(result && historyData && historyData.length > 0) {
      analysis._calcZodiacAnalysisCache.set(cacheKey, {
        latestExpect: historyData[0].expect,
        result: result
      });
    }
    
    return result;
  },
  
  /**
   * 原始的生肖关联分析计算
   * @private
   * @returns {Object} 分析数据
   */
  _calcZodiacAnalysisOriginal: (customAnalyzeLimit) => {
    const state = StateManager._state;
    const { historyData } = state.analysis;
    const analyzeLimit = customAnalyzeLimit !== undefined ? customAnalyzeLimit : state.analysis.analyzeLimit;
    
    let list = [];
    let total = 0;
    let avgExpect = 12;
    let zodCount = {};
    let lastAppear = {};
    let tailZodMap = {};
    let followMap = {};
    let topZod = [];
    let topTail = [];
    let topColor = [];
    let topHead = [];
    
    // 初始化统计对象
    CONFIG.ANALYSIS.ZODIAC_ALL.forEach(z => { zodCount[z] = 0; lastAppear[z] = -1; });
    for(let t = 0; t <= 9; t++) tailZodMap[t] = {};
    
    // 如果有历史数据，进行统计
    if(historyData.length >= 2) {
      // 处理"全年数据"选项：只统计当前农历年份的数据
      if(analyzeLimit === 'all' || analyzeLimit === 365) {
        const currentLunarYear = analysis.getCurrentLunarYear();
        // 筛选当前农历年份的数据
        list = historyData.filter(item => {
          const itemLunarYear = analysis.getLunarYearByDate(item.date);
          return itemLunarYear === currentLunarYear;
        });
      } else {
        list = historyData.slice(0, Math.min(analyzeLimit, historyData.length));
      }
      total = list.length;
      avgExpect = total / 12;

      // 波色和头数统计
      const colorCount = { '红': 0, '蓝': 0, '绿': 0 };
      const headCount = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0 };

      // 循环统计
      list.forEach((item, idx) => {
        const s = analysis.getSpecial(item);
        if(CONFIG.ANALYSIS.ZODIAC_ALL.includes(s.zod)) {
          zodCount[s.zod]++;
          if(lastAppear[s.zod] === -1) lastAppear[s.zod] = idx;
        }
        if(CONFIG.ANALYSIS.ZODIAC_ALL.includes(s.zod)) {
          tailZodMap[s.tail][s.zod] = (tailZodMap[s.tail][s.zod] || 0) + 1;
        }
        // 统计波色
        if(s.colorName && colorCount.hasOwnProperty(s.colorName)) {
          colorCount[s.colorName]++;
        }
        // 统计头数
        if(s.head >= 0 && s.head <= 4) {
          headCount[s.head]++;
        }
      });

      // 跟随统计
      for(let i = 1; i < list.length; i++) {
        const preZod = analysis.getSpecial(list[i-1]).zod;
        const curZod = analysis.getSpecial(list[i]).zod;
        if(CONFIG.ANALYSIS.ZODIAC_ALL.includes(preZod) && CONFIG.ANALYSIS.ZODIAC_ALL.includes(curZod)) {
          if(!followMap[preZod]) followMap[preZod] = {};
          followMap[preZod][curZod] = (followMap[preZod][curZod] || 0) + 1;
        }
      }

      // 热门排序
      topZod = Object.entries(zodCount).sort((a, b) => b[1] - a[1]);
      topTail = Array.from({ length: 10 }, (_, t) => ({
        t, sum: Object.values(tailZodMap[t]).reduce((a, b) => a + b, 0)
      })).sort((a, b) => b.sum - a.sum);
      
      // 热门波色排序
      topColor = Object.entries(colorCount).sort((a, b) => b[1] - a[1]);
      
      // 热门头数排序
      topHead = Object.entries(headCount).sort((a, b) => b[1] - a[1]);
    }

    // 遗漏期数计算
    const zodMiss = {};
    const zodAvgMiss = {};
    CONFIG.ANALYSIS.ZODIAC_ALL.forEach(z => {
      zodMiss[z] = lastAppear[z] === -1 ? total : lastAppear[z];
      zodAvgMiss[z] = zodCount[z] > 0 ? (total / zodCount[z]).toFixed(1) : total;
    });

    // ========== 生肖预测算法 ==========
    const zodiacScores = {};
    const zodiacDetails = {};

    // 1. 热号状态分析 (0-20分)
    const hotZodiacs = topZod.slice(0, 3).map(z => z[0]);
    
    // 2. 冷号状态分析 (0-30分) - 需要更长历史数据
    let maxMiss = 0;
    Object.values(zodMiss).forEach(m => { if(m > maxMiss) maxMiss = m; });

    // 3. 间隔规律分析
    const zodiacOrder = ['鼠','牛','虎','兔','龙','蛇','马','羊','猴','鸡','狗','猪'];
    const intervalStats = {};
    for(let i = 0; i < 12; i++) intervalStats[i] = 0;
    
    for(let i = 1; i < list.length && i < 30; i++) {
      const preZod = analysis.getSpecial(list[i-1]).zod;
      const curZod = analysis.getSpecial(list[i]).zod;
      const preIdx = zodiacOrder.indexOf(preZod);
      const curIdx = zodiacOrder.indexOf(curZod);
      if(preIdx !== -1 && curIdx !== -1) {
        let diff = curIdx - preIdx;
        if(diff > 6) diff -= 12;
        if(diff < -6) diff += 12;
        intervalStats[diff + 6]++;
      }
    }
    const commonIntervals = Object.entries(intervalStats).sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => parseInt(x[0]) - 6);

    // 4. 上期生肖用于形态匹配
    const lastZod = list.length > 0 ? analysis.getSpecial(list[0]).zod : '';
    
    // 五行相生关系
    const elementGenerate = {
      '金': ['水'],
      '水': ['木'],
      '木': ['火'],
      '火': ['土'],
      '土': ['金']
    };

    // 生肖五行映射
    const zodiacElement = {
      '鼠': '水', '牛': '土', '虎': '木', '兔': '木',
      '龙': '土', '蛇': '火', '马': '火', '羊': '土',
      '猴': '金', '鸡': '金', '狗': '土', '猪': '水'
    };

    // 计算每个生肖的综合分数
    CONFIG.ANALYSIS.ZODIAC_ALL.forEach(zod => {
      let score = 0;
      const details = { cold: 0, hot: 0, shape: 0, interval: 0 };

      // 冷号状态 (0-30分)
      const missValue = zodMiss[zod] || 0;
      if(maxMiss > 0 && missValue >= maxMiss * 0.8) {
        details.cold = 30;
        score += 30;
      } else if(missValue >= 24) {
        details.cold = 20;
        score += 20;
      } else if(missValue >= 12) {
        details.cold = 10;
        score += 10;
      }

      // 热号状态 (0-20分)
      if(hotZodiacs.includes(zod)) {
        details.hot = 20;
        score += 20;
      }

      // 形态匹配 (0-30分) - 五行相生
      if(lastZod && zodiacElement[lastZod] && zodiacElement[zod]) {
        const lastElement = zodiacElement[lastZod];
        const currentElement = zodiacElement[zod];
        if(elementGenerate[lastElement] && elementGenerate[lastElement].includes(currentElement)) {
          details.shape = 15;
          score += 15;
        }
      }

      // 间隔匹配 (0-20分)
      if(lastZod) {
        const lastIdx = zodiacOrder.indexOf(lastZod);
        const currentIdx = zodiacOrder.indexOf(zod);
        if(lastIdx !== -1 && currentIdx !== -1) {
          let diff = currentIdx - lastIdx;
          if(diff > 6) diff -= 12;
          if(diff < -6) diff += 12;
          if(commonIntervals.includes(diff)) {
            details.interval = 20;
            score += 20;
          }
        }
      }

      zodiacScores[zod] = score;
      zodiacDetails[zod] = details;
    });

    // 按分数排序
    const sortedZodiacs = Object.entries(zodiacScores).sort((a, b) => b[1] - a[1]);

    return { list, total, avgExpect, zodCount, zodMiss, zodAvgMiss, tailZodMap, followMap, topZod, topTail, topColor, topHead, zodiacScores, zodiacDetails, sortedZodiacs };
  },

  /**
   * 渲染生肖关联分析
   */
  renderZodiacAnalysis: () => {
    const data = analysis.calcZodiacAnalysis();
    const zodiacEmptyTip = document.getElementById('zodiacEmptyTip');
    const zodiacContent = document.getElementById('zodiacContent');
    
    if(!data) {
      if(zodiacEmptyTip) zodiacEmptyTip.style.display = 'block';
      if(zodiacContent) zodiacContent.style.display = 'none';
      return;
    }
    
    if(zodiacEmptyTip) zodiacEmptyTip.style.display = 'none';
    if(zodiacContent) zodiacContent.style.display = 'block';

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
        
        // 保存预测历史
        // 注意：这里需要调用 prediction.js 中的方法，但为了避免循环依赖，暂时注释
        // Business.saveZodiacPredictionHistory(data.sortedZodiacs, data.zodiacDetails);
        // 渲染预测历史
        // Business.renderZodiacPredictionHistory();
      } else {
        zodiacPredictionGrid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 20px; color: var(--sub-text);">暂无预测数据</div>';
      }
    }
    
    // 精选生肖
    const selectedZodiacsGrid = document.getElementById('selectedZodiacsGrid');
    if(selectedZodiacsGrid) {
      // 注意：这里需要调用 prediction.js 中的方法，但为了避免循环依赖，暂时注释
      // const selectedZodiacsMap = Business.getSelectedZodiacs();
      const selectedZodiacsMap = new Map();
      
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
            <div class="selected-zodiac-item" data-zodiac="${zod}" onclick="Business.showSelectedZodiacRatingDetail('${zod}')">
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
        const level = analysis.getZodiacLevel(cnt, data.zodMiss[topZ] || 0, data.total);
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
        const level = analysis.getZodiacLevel(cnt, miss, data.total);
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
    analysis.renderZodiacFinalNums(data);
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
      finalNums = analysis.getColdReboundNumbers(data, targetCount, fullNumZodiacMap);
    } else if(mode === 'auto') {
      // 🤖 自动模式：智能判断使用热号还是冷号模式
      const modeDecision = analysis.decideAutoMode(data);
      if(modeDecision === 'cold') {
        finalNums = analysis.getColdReboundNumbers(data, targetCount, fullNumZodiacMap);
      } else {
        finalNums = analysis.getHotNumbers(data, targetCount, fullNumZodiacMap);
      }
    } else {
      // 🔥 热号模式（默认）
      finalNums = analysis.getHotNumbers(data, targetCount, fullNumZodiacMap);
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
      const modeDecision = analysis.decideAutoMode(data);
      const subModeText = modeDecision === 'cold' ? '❄️ 冷号模式' : '🔥 热号模式';
      ballHtml = `<div class="auto-mode-submode" style="text-align:center; margin-bottom:10px; font-size:14px; color:#666;">自动模式当前选择：${subModeText}</div>` + ballHtml;
    }

    if(zodiacFinalNumContent) {
      zodiacFinalNumContent.innerHTML = ballHtml;
      zodiacFinalNumContent.classList.add('final-recommend-z-balls');
    }
  },

  /**
   * 获取热门号码
   * @param {Object} data - 分析数据
   * @param {number} targetCount - 目标数量
   * @param {Map} fullNumZodiacMap - 号码生肖映射
   * @returns {Array} 号码数组
   */
  getHotNumbers: (data, targetCount, fullNumZodiacMap) => {
    // 适配两种数据结构：精选特码的完整数据结构 和 综合分析的简化数据结构
    
    // 锁定核心生肖池：优先使用精选生肖，若没有则使用预测高分的前6个生肖
    let coreZodiacs = [];
    
    // 首先尝试使用精选生肖
    // 注意：这里需要调用 prediction.js 中的方法，但为了避免循环依赖，暂时注释
    // const selectedZodiacsMap = Business.getSelectedZodiacs();
    // if(selectedZodiacsMap && selectedZodiacsMap.size > 0) {
    //   coreZodiacs = Array.from(selectedZodiacsMap.keys());
    // } 
    // 如果没有精选生肖，使用原来的逻辑
    if(data.sortedZodiacs && data.sortedZodiacs.length > 0) {
      // 精选特码的数据结构
      coreZodiacs = data.sortedZodiacs.slice(0, 6).map(i => i[0]);
    } else if(data.topZod && Array.isArray(data.topZod)) {
      // 兼容结构
      coreZodiacs = data.topZod.slice(0, 6).map(i => i[0]);
    } else if(data.zodiac) {
      // 综合分析的数据结构：从zodiac对象计算前6个热门生肖
      coreZodiacs = Object.entries(data.zodiac)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(i => i[0]);
    }

    // 锁定热门尾数TOP6
    let hotTails = [];
    if(data.topTail && Array.isArray(data.topTail) && data.topTail.length > 0) {
      hotTails = data.topTail.slice(0, 6).map(i => i.t !== undefined ? i.t : parseInt(i[0]));
    } else if(data.tail) {
      // 从tail对象计算
      hotTails = Object.entries(data.tail)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(i => parseInt(i[0]));
    }
    
    // 锁定热门波色TOP2
    let hotColors = [];
    if(data.topColor && Array.isArray(data.topColor) && data.topColor.length > 0) {
      hotColors = data.topColor.slice(0, 2).map(i => i[0]);
    } else if(data.color) {
      // 从color对象计算
      hotColors = Object.entries(data.color)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(i => i[0]);
    }
    
    // 锁定热门头数TOP3
    let hotHeads = [];
    if(data.topHead && Array.isArray(data.topHead) && data.topHead.length > 0) {
      hotHeads = data.topHead.slice(0, 3).map(i => parseInt(i[0]));
    } else if(data.head) {
      // 从head对象计算
      hotHeads = Object.entries(data.head)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(i => parseInt(i[0]));
    }

    // 筛选候选号码（必须同时满足4个条件）
    const candidateNums = [];
    for(let num = 1; num <= 49; num++) {
      const zod = fullNumZodiacMap.get(num);
      const tail = num % 10;
      const head = Math.floor(num / 10);
      const colorName = analysis.getColorName(num);
      
      if(coreZodiacs.includes(zod) && 
         hotTails.includes(tail) && 
         hotColors.includes(colorName) && 
         hotHeads.includes(head)) {
        const miss = data.zodMiss && data.zodMiss[zod] ? data.zodMiss[zod] : 0;
        const count = data.zodCount && data.zodCount[zod] ? data.zodCount[zod] : 0;
        // 获取生肖预测分数作为额外权重
        const zodScore = data.zodiacScores && data.zodiacScores[zod] ? data.zodiacScores[zod] : 0;
        candidateNums.push({
          num,
          weight: count * 10 + (10 - miss) + zodScore * 2
        });
      }
    }

    // 按权重排序，取目标数量
    candidateNums.sort((a, b) => b.weight - a.weight);
    let finalNums = candidateNums.slice(0, targetCount).map(i => i.num);

    // 兜底机制：如果候选号码不足，在核心生肖池里补充
    if(finalNums.length < targetCount) {
      const fillNums = [];
      for(let num = 1; num <= 49 && fillNums.length < targetCount - finalNums.length; num++) {
        const zod = fullNumZodiacMap.get(num);
        if(coreZodiacs.includes(zod) && !finalNums.includes(num) && !fillNums.includes(num)) {
          fillNums.push(num);
        }
      }
      finalNums.push(...fillNums);
    }

    return finalNums;
  },

  getColdReboundNumbers: (data, targetCount, fullNumZodiacMap) => {
    // 锁定核心生肖池：优先使用高遗漏的前6个生肖
    let coreZodiacs = [];
    if(data.zodMiss) {
      coreZodiacs = Object.entries(data.zodMiss)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(i => i[0]);
    }

    // 锁定热门尾数TOP6
    let hotTails = [];
    if(data.topTail && Array.isArray(data.topTail) && data.topTail.length > 0) {
      hotTails = data.topTail.slice(0, 6).map(i => i.t !== undefined ? i.t : parseInt(i[0]));
    } else if(data.tail) {
      hotTails = Object.entries(data.tail)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(i => parseInt(i[0]));
    }
    
    // 锁定热门波色TOP2
    let hotColors = [];
    if(data.topColor && Array.isArray(data.topColor) && data.topColor.length > 0) {
      hotColors = data.topColor.slice(0, 2).map(i => i[0]);
    } else if(data.color) {
      hotColors = Object.entries(data.color)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 2)
        .map(i => i[0]);
    }
    
    // 锁定热门头数TOP3
    let hotHeads = [];
    if(data.topHead && Array.isArray(data.topHead) && data.topHead.length > 0) {
      hotHeads = data.topHead.slice(0, 3).map(i => parseInt(i[0]));
    } else if(data.head) {
      hotHeads = Object.entries(data.head)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(i => parseInt(i[0]));
    }

    // 筛选候选号码（必须同时满足4个条件）
    const candidateNums = [];
    for(let num = 1; num <= 49; num++) {
      const zod = fullNumZodiacMap.get(num);
      const tail = num % 10;
      const head = Math.floor(num / 10);
      const colorName = analysis.getColorName(num);
      
      if(coreZodiacs.includes(zod) && 
         hotTails.includes(tail) && 
         hotColors.includes(colorName) && 
         hotHeads.includes(head)) {
        const miss = data.zodMiss && data.zodMiss[zod] ? data.zodMiss[zod] : 0;
        const count = data.zodCount && data.zodCount[zod] ? data.zodCount[zod] : 0;
        // 冷号权重：遗漏期数越高权重越大
        candidateNums.push({
          num,
          weight: miss * 2 + (10 - count) + (data.zodiacScores && data.zodiacScores[zod] ? data.zodiacScores[zod] : 0)
        });
      }
    }

    // 按权重排序，取目标数量
    candidateNums.sort((a, b) => b.weight - a.weight);
    let finalNums = candidateNums.slice(0, targetCount).map(i => i.num);

    // 兜底机制：如果候选号码不足，在核心生肖池里补充
    if(finalNums.length < targetCount) {
      const fillNums = [];
      for(let num = 1; num <= 49 && fillNums.length < targetCount - finalNums.length; num++) {
        const zod = fullNumZodiacMap.get(num);
        if(coreZodiacs.includes(zod) && !finalNums.includes(num) && !fillNums.includes(num)) {
          fillNums.push(num);
        }
      }
      finalNums.push(...fillNums);
    }

    return finalNums;
  },

  decideAutoMode: (data) => {
    if(!data || !data.streak) return 'hot';
    
    // 基于连出模式决定
    const { curStreak, maxStreak } = data.streak;
    
    // 如果当前连出超过5期，切换到冷号模式
    if(curStreak >= 5) {
      return 'cold';
    }
    
    // 如果最大连出超过8期，也切换到冷号模式
    if(maxStreak >= 8) {
      return 'cold';
    }
    
    // 默认使用热号模式
    return 'hot';
  },

  calcZodiacAnalysisForPeriod: (excludePeriods) => {
    const state = StateManager._state;
    const { historyData } = state.analysis;
    
    // 排除指定期数后的数据
    let filteredData = historyData;
    if(excludePeriods && excludePeriods.length > 0) {
      filteredData = historyData.filter(item => !excludePeriods.includes(item.expect));
    }
    
    // 重新计算分析
    const originalLimit = state.analysis.analyzeLimit;
    state.analysis.analyzeLimit = filteredData.length;
    const result = analysis.calcZodiacAnalysis();
    state.analysis.analyzeLimit = originalLimit;
    
    return result;
  },

  syncAnalyze: () => {
    analysis.renderFullAnalysis();
    analysis.renderZodiacAnalysis();
    analysis.updateHotColdStatus();
  },

  syncZodiacAnalyze: () => {
    analysis.renderZodiacAnalysis();
  },

  toggleDetail: () => {
    const detailPanel = document.getElementById('detailPanel');
    if(detailPanel) {
      detailPanel.style.display = detailPanel.style.display === 'none' ? 'block' : 'none';
    }
  },

  switchAnalysisTab: (tab) => {
    const state = StateManager._state;
    StateManager.setState({ 
      analysis: { 
        ...state.analysis, 
        currentTab: tab 
      } 
    });
    
    // 隐藏所有标签按钮的 active 状态
    const tabButtons = document.querySelectorAll('.analysis-tab-btn');
    tabButtons.forEach(btn => {
      btn.classList.remove('active');
    });

    // 隐藏所有面板
    const panels = document.querySelectorAll('.analysis-tab-panel');
    panels.forEach(panel => {
      panel.classList.remove('active');
    });

    // 显示当前标签按钮的 active 状态
    const activeTabBtn = document.querySelector(`.analysis-tab-btn[data-analysis-tab="${tab}"]`);
    if (activeTabBtn) {
      activeTabBtn.classList.add('active');
    }

    // 显示当前面板
    let panelId;
    if (tab === 'history') {
      panelId = 'historyPanel';
    } else if (tab === 'analysis') {
      panelId = 'analysisPanelContent';
    } else if (tab === 'zodiac') {
      panelId = 'zodiacAnalysisPanel';
    }

    if (panelId) {
      const activePanel = document.getElementById(panelId);
      if (activePanel) {
        activePanel.classList.add('active');
      }
    }
  },

  loadMoreHistory: () => {
    const state = StateManager._state;
    const newShowCount = state.analysis.showCount + 20;
    StateManager.setState({ 
      analysis: { 
        ...state.analysis, 
        showCount: newShowCount 
      } 
    });
    analysis.renderHistory();
    
    const loadMore = document.getElementById('loadMore');
    if(loadMore) {
      loadMore.style.display = state.analysis.historyData.length > newShowCount ? 'block' : 'none';
    }
  },

  startCountdown: () => {
    const countdownEl = document.getElementById('countdown');
    if(!countdownEl) return;
    
    const updateCountdown = () => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const seconds = now.getSeconds();
      
      // 计算距离下一次开奖的时间
      let nextDrawHour = 21;
      let nextDrawMinute = 30;
      let nextDrawDate = new Date();
      
      if(hours > nextDrawHour || (hours === nextDrawHour && minutes >= nextDrawMinute)) {
        nextDrawDate.setDate(nextDrawDate.getDate() + 1);
      }
      
      nextDrawDate.setHours(nextDrawHour, nextDrawMinute, 0, 0);
      const timeLeft = nextDrawDate - now;
      
      if(timeLeft > 0) {
        const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));
        const minutesLeft = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const secondsLeft = Math.floor((timeLeft % (1000 * 60)) / 1000);
        
        countdownEl.innerText = `${hoursLeft.toString().padStart(2, '0')}:${minutesLeft.toString().padStart(2, '0')}:${secondsLeft.toString().padStart(2, '0')}`;
      } else {
        countdownEl.innerText = '开奖中';
      }
    };
    
    updateCountdown();
    setInterval(updateCountdown, 1000);
  },

  isInDrawTime: () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    // 开奖时间：21:30-21:45
    return hours === 21 && minutes >= 30 && minutes <= 45;
  },

  hasDataChanged: (currentData, newData) => {
    if(!currentData || !newData) return true;
    if(currentData.length !== newData.length) return true;
    
    // 比较最新的几期数据
    const compareCount = Math.min(5, currentData.length);
    for(let i = 0; i < compareCount; i++) {
      if(currentData[i]?.expect !== newData[i]?.expect) {
        return true;
      }
      if(currentData[i]?.openCode !== newData[i]?.openCode) {
        return true;
      }
    }
    
    return false;
  },

  startAutoRefresh: () => {
    const state = StateManager._state;
    
    // 清除之前的定时器
    if(state.analysis.autoRefreshTimer) {
      clearInterval(state.analysis.autoRefreshTimer);
    }
    
    // 每5分钟自动刷新一次
    state.analysis.autoRefreshTimer = setInterval(() => {
      if(analysis.isInDrawTime()) {
        analysis.silentRefreshHistory();
      }
    }, 5 * 60 * 1000);
  },

  checkDrawTimeLoop: () => {
    setInterval(() => {
      if(analysis.isInDrawTime()) {
        analysis.silentRefreshHistory();
      }
    }, 30 * 1000);
  },

  updateHotColdStatus: () => {
    const state = StateManager._state;
    const { historyData } = state.analysis;
    
    if(!historyData.length) return;
    
    // 计算每个号码的冷热状态
    const numStatus = {};
    for(let num = 1; num <= 49; num++) {
      let count = 0;
      let lastAppear = -1;
      
      historyData.forEach((item, idx) => {
        const codeArr = (item.openCode || '').split(',');
        if(codeArr.includes(num.toString())) {
          count++;
          if(lastAppear === -1) lastAppear = idx;
        }
      });
      
      const miss = lastAppear === -1 ? historyData.length : lastAppear;
      let status = '温号';
      if(miss <= 3) status = '热号';
      else if(miss >= 10) status = '冷号';
      
      numStatus[num] = status;
    }
    
    // 更新号码列表中的冷热状态
    const newNumList = state.numList.map(item => ({
      ...item,
      hot: numStatus[item.num] || '温号'
    }));
    
    StateManager.setState({ numList: newNumList }, false);
  },

  refreshHotCold: () => {
    analysis.updateHotColdStatus();
    Toast.show('冷热号状态已更新');
  },

  showStatDetail: (statType) => {
    // 这里可以实现详细的统计信息展示
    Toast.show(`显示${statType}详细统计`);
  },

  showStreakDetail: () => {
    // 这里可以实现连出详情展示
    Toast.show('显示连出详情');
  },

  showZodiacDetail: (zodiac) => {
    // 这里可以实现生肖详情展示
    Toast.show(`显示${zodiac}详情`);
  },

  /**
   * 获取生肖对应的号码
   * @param {string} zodiac - 生肖名称
   * @returns {Array} 号码数组
   */
  getZodiacNumbers: (zodiac) => {
    const numbers = [];
    for(let num = 1; num <= 49; num++) {
      const zod = DataQuery._getZodiacByNum(num);
      if(zod === zodiac) {
        numbers.push(num);
      }
    }
    return numbers;
  },

  switchSpecialMode: (mode) => {
    const state = StateManager._state;
    StateManager.setState({ 
      analysis: { 
        ...state.analysis, 
        specialMode: mode 
      } 
    });
    
    // 更新UI
    document.querySelectorAll('.special-mode-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    const activeBtn = document.querySelector(`.special-mode-btn[data-mode="${mode}"]`);
    if(activeBtn) activeBtn.classList.add('active');
    
    // 重新分析
    analysis.renderZodiacAnalysis();
  }
};
