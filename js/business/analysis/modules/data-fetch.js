// ====================== 数据获取模块 ======================

import { CONFIG } from '../../../config.js';
import { Storage } from '../../../storage.js';
import { StateManager } from '../../../state-manager.js';
import { analysis } from '../../analysis.js';
import { PerformanceMonitor } from '../../../performance-monitor.js';

export const dataFetch = {
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
        const res = await dataFetch._fetchWithTimeout(url);
        
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
        const res = await dataFetch._fetchWithTimeout(url);
        
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
    if (!rawData || !Array.isArray(rawData)) return [];
    
    // 过滤无效数据
    const filteredData = rawData.filter(item => {
      const expect = item?.expect || '';
      const openCode = item?.openCode || '';
      return expect && openCode && openCode.split(',').length === 7;
    });

    // 去重并排序
    const uniqueMap = new Map();
    filteredData.forEach(item => {
      const expectNum = Number(item?.expect || 0);
      if(expectNum && !isNaN(expectNum)) {
        uniqueMap.set(expectNum, item);
      }
    });

    return Array.from(uniqueMap.values()).sort((a, b) => {
      return Number(b?.expect || 0) - Number(a?.expect || 0);
    });
  },

  /**
   * 处理数据更新
   * @private
   * @param {Array} sortedData - 处理后的数据
   * @param {boolean} silent - 是否静默模式
   */
  _handleDataUpdate: (sortedData, silent = false) => {
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
      import('../../prediction.js').then(({ prediction }) => {
        prediction.silentUpdateAllPredictionHistory();
        // 同时更新精选特码历史的开奖记录比较
        prediction.updateSpecialHistoryComparison();
        // 重新渲染精选特码历史以显示最新比较结果
        prediction.renderSpecialHistory();
      });
      
      if(!silent) Toast.show('数据加载成功');
    } else if (!silent) {
      Toast.show('数据已是最新');
    }
  },

  /**
   * 尝试使用模拟数据
   * @private
   * @param {boolean} silent - 是否静默模式
   */
  _tryUseMockData: (silent = false) => {
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
  },

  /**
   * 静默刷新历史数据（不显示加载状态）
   */
  silentRefreshHistory: async () => {
    try {
      // 先获取最新开奖记录
      const latestData = await dataFetch._fetchLatestData();
      // 然后获取历史数据
      const year = new Date().getFullYear();
      const historyData = await dataFetch._fetchHistoryData(year);
      
      // 合并数据，最新开奖记录优先
      const combinedData = [...latestData, ...historyData];
      const sortedData = dataFetch._processHistoryData(combinedData);

      // 处理数据更新
      dataFetch._handleDataUpdate(sortedData, true);
    } catch(e) {
      console.debug('静默刷新失败（API可能不可用）:', e.message);
      // 不显示错误，保持静默
      // 尝试使用模拟数据
      dataFetch._tryUseMockData(true);
    }
  },

  /**
   * 刷新历史数据
   * @param {boolean} silent - 是否静默模式（不显示提示）
   */
  refreshHistory: async (silent = false) => {
    return PerformanceMonitor.monitorFetch(async () => {
      const historyList = document.getElementById('historyList');
      if(historyList && !silent) historyList.innerHTML = '<div style="padding:20px;text-align:center;">加载中...</div>';
      
      try {
        // 先获取最新开奖记录
        const latestData = await dataFetch._fetchLatestData();
        // 然后获取历史数据
        const year = new Date().getFullYear();
        const historyData = await dataFetch._fetchHistoryData(year);
        
        // 合并数据，最新开奖记录优先
        const combinedData = [...latestData, ...historyData];
        const sortedData = dataFetch._processHistoryData(combinedData);

        // 处理数据更新
        dataFetch._handleDataUpdate(sortedData, silent);
      } catch(e) {
        console.error('加载历史数据失败', e);
        if(historyList && !silent) {
          historyList.innerHTML = '<div style="padding:20px;text-align:center;color:var(--danger);">数据加载失败，可能是网络问题</div>';
        }
        if(!silent) Toast.show('数据加载失败，可能是网络问题');
        
        // 尝试使用模拟数据
        dataFetch._tryUseMockData(silent);
      }
      
      const loadMore = document.getElementById('loadMore');
      if(loadMore) {
        loadMore.style.display = StateManager._state.analysis.historyData.length > StateManager._state.analysis.showCount ? 'block' : 'none';
      }
    }, 'dataFetch');
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
  }
};