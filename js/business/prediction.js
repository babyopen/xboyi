// ====================== 预测历史模块 ======================

// 导入必要的模块
import { CONFIG } from '../config.js';
import { Utils } from '../utils.js';
import { StateManager } from '../state-manager.js';
import { DOM } from '../dom.js';
import { DataQuery } from '../data-query.js';
import { Storage } from '../storage.js';
import { Toast } from '../toast.js';
import { analysisCalc } from './analysis/modules/analysis-calc.js';
import { IssueManager } from './issue-manager.js';

export const prediction = {
  _MLServiceState: 'idle',
  _currentMLState: null,
  _mlHealthCheckInterval: null,

  // 精选特码历史相关
  saveSpecialToHistory: () => {
    try {
      const state = StateManager._state;
      const specialHistory = state.specialHistory || [];
      
      // 获取当前选中的特码
      const selectedSpecial = state.selectedSpecial || [];
      if (selectedSpecial.length === 0) {
        Toast.show('请先选择特码');
        return;
      }
      
      const newItem = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        special: selectedSpecial,
        note: ''
      };
      
      const updatedHistory = [newItem, ...specialHistory];
      
      // 限制历史记录数量
      if (updatedHistory.length > 50) {
        updatedHistory.splice(50);
      }
      
      // 保存到存储
      Storage.saveSpecialHistory(updatedHistory);
      
      // 更新状态
      StateManager.setState({ specialHistory: updatedHistory }, false);
      
      Toast.show('精选特码已保存到历史记录');
    } catch(e) {
      console.error('保存精选特码到历史失败:', e);
      Toast.show('保存失败，请稍后重试');
    }
  },

  updateSpecialHistoryComparison: () => {
    // 这里需要完整的实现...
  },

  favoriteZodiacNumbers: (zodiac) => {
    // 这里需要完整的实现...
  },

  renderSpecialHistory: () => {
    const state = StateManager._state;
    const specialHistory = state.specialHistory || [];
    const historyList = document.getElementById('specialHistory');
    if (!historyList) return;

    if (specialHistory.length === 0) {
      historyList.innerHTML = '<div style="text-align:center; padding:40px; color:var(--sub-text);">暂无精选特码历史</div>';
      return;
    }

    const fragment = document.createDocumentFragment();

    specialHistory.forEach((item, index) => {
      const itemDiv = document.createElement('div');
      itemDiv.className = 'special-history-item';
      itemDiv.setAttribute('role', 'listitem');

      const specialHtml = item.special.map(num => {
        const numStr = String(num).padStart(2, '0');
        return `<span class="special-number">${numStr}</span>`;
      }).join(' ');

      itemDiv.innerHTML = `
        <div class="special-history-header">
          <div class="special-history-time">${new Date(item.timestamp).toLocaleString()}</div>
          <div class="special-history-actions">
            <button class="action-btn" onclick="Business.copySpecialHistory(${index})"><i class="icon-copy"></i> 复制</button>
            <button class="action-btn danger" onclick="Business.deleteSpecialHistoryItem(${index})"><i class="icon-delete"></i> 删除</button>
          </div>
        </div>
        <div class="special-history-content">
          <div class="special-numbers">
            ${specialHtml}
          </div>
          ${item.note ? `<div class="special-note">备注: ${item.note}</div>` : ''}
        </div>
      `;

      fragment.appendChild(itemDiv);
    });

    historyList.innerHTML = '';
    historyList.appendChild(fragment);
  },

  toggleSpecialHistory: () => {
    // 这里需要完整的实现...
  },

  clearSpecialHistory: () => {
    // 这里需要完整的实现...
  },

  deleteSpecialHistoryItem: (index) => {
    // 这里需要完整的实现...
  },

  copySpecialHistory: (index) => {
    // 这里需要完整的实现...
  },

  showSpecialHistoryDetail: (index) => {
    // 这里需要完整的实现...
  },

  toggleSpecialFiltersPanel: () => {
    // 这里需要完整的实现...
  },

  confirmSpecialFilters: () => {
    // 这里需要完整的实现...
  },

  getFilteredSpecialHistory: () => {
    // 这里需要完整的实现...
    return [];
  },

  goToSpecialHistoryPage: (page) => {
    // 这里需要完整的实现...
  },

  // 精选生肖历史相关
  silentSaveAllSelectedZodiacs: () => {
    // 这里需要完整的实现...
  },

  updateSelectedZodiacHistoryComparison: () => {
    // 这里需要完整的实现...
  },

  getSelectedZodiacs: () => {
    const periods = [10, 20, 30];
    const selectedZodiacsMap = new Map();
    
    periods.forEach(period => {
      const periodData = analysisCalc.calcZodiacAnalysis(period);
      if(periodData && periodData.sortedZodiacs && periodData.sortedZodiacs.length > 0) {
        const top3Zodiacs = periodData.sortedZodiacs.slice(0, 3).map(([zod]) => zod);
        top3Zodiacs.forEach(zod => {
          if(selectedZodiacsMap.has(zod)) {
            selectedZodiacsMap.get(zod).push(period);
          } else {
            selectedZodiacsMap.set(zod, [period]);
          }
        });
      }
    });
    
    return selectedZodiacsMap;
  },

  toggleZodiacSelection: (zodiac) => {
    // 这里需要完整的实现...
  },

  clearAllZodiacSelections: () => {
    // 这里需要完整的实现...
  },

  showSelectedZodiacRatingDetail: (zodiac) => {
    try {
      const periods = [10, 20, 30];
      const periodLabels = { 10: '10期', 20: '20期', 30: '30期' };
      
      let periodsHtml = '';
      
      periods.forEach(period => {
        const data = analysisCalc.calcZodiacAnalysis(period);
        if (!data) return;
        
        const score = data.zodiacScores ? data.zodiacScores[zodiac] : 0;
        const details = data.zodiacDetails ? data.zodiacDetails[zodiac] : { cold: 0, hot: 0, shape: 0, interval: 0 };
        const count = data.zodCount ? data.zodCount[zodiac] : 0;
        const miss = data.zodMiss ? data.zodMiss[zodiac] : 0;
        const avgMiss = data.zodAvgMiss ? data.zodAvgMiss[zodiac] : 0;
        
        let rank = '-';
        if (data.sortedZodiacs) {
          const idx = data.sortedZodiacs.findIndex(([z]) => z === zodiac);
          if (idx !== -1) rank = `第${idx + 1}名`;
        }
        
        periodsHtml += `
          <div style="margin-bottom:16px;">
            <div style="font-size:14px;font-weight:600;margin-bottom:10px;color:var(--text);">${periodLabels[period]}分析</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div style="display:flex;flex-direction:column;gap:8px;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <span style="font-size:13px;color:var(--text);">排名</span>
                  <span style="font-size:13px;font-weight:600;">${rank}</span>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <span style="font-size:13px;color:var(--text);">出现次数</span>
                  <span style="font-size:13px;">${count}</span>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <span style="font-size:13px;color:var(--text);">遗漏次数</span>
                  <span style="font-size:13px;">${miss}</span>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <span style="font-size:13px;color:var(--text);">平均遗漏</span>
                  <span style="font-size:13px;">${avgMiss.toFixed(1)}</span>
                </div>
              </div>
              <div style="display:flex;flex-direction:column;gap:8px;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <span style="font-size:13px;color:var(--text);">综合评分</span>
                  <span style="font-size:13px;font-weight:600;">${score}</span>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <span style="font-size:13px;color:var(--text);">冷号</span>
                  <span style="font-size:13px;">${details.cold}</span>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <span style="font-size:13px;color:var(--text);">热号</span>
                  <span style="font-size:13px;">${details.hot}</span>
                </div>
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <span style="font-size:13px;color:var(--text);">间隔</span>
                  <span style="font-size:13px;">${details.interval}</span>
                </div>
              </div>
            </div>
          </div>
        `;
      });
      
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      
      modal.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <h3 class="modal-title">${zodiac} 详细评分</h3>
            <button class="modal-close-btn" onclick="this.closest('.modal-overlay').remove()">×</button>
          </div>
          <div class="modal-body">
            ${periodsHtml}
          </div>
        </div>
      `;
      modal.addEventListener('click', (e) => {
        if(e.target === modal) modal.remove();
      });
      
      document.body.appendChild(modal);
    } catch (e) {
      console.error('显示详细评分失败', e);
      Toast.show('显示详情失败');
    }
  },

  copySelectedZodiacs: async () => {
    try {
      const selectedZodiacsMap = prediction.getSelectedZodiacs();
      
      if (!selectedZodiacsMap || selectedZodiacsMap.size === 0) {
        Toast.show('暂无生肖可复制');
        return;
      }
      
      const zodiacNames = Array.from(selectedZodiacsMap.keys());
      const textToCopy = zodiacNames.join(' ');
      
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = textToCopy;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (!successful) {
          throw new Error('复制失败');
        }
      }
      
      Toast.show(`已复制: ${textToCopy}`);
      
      const copyBtn = document.querySelector('.copy-zodiacs-btn');
      if (copyBtn) {
        const originalHtml = copyBtn.innerHTML;
        copyBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          已复制
        `;
        copyBtn.style.background = 'var(--success)';
        copyBtn.style.color = '#fff';
        
        setTimeout(() => {
          copyBtn.innerHTML = originalHtml;
          copyBtn.style.background = '';
          copyBtn.style.color = '';
        }, 2000);
      }
    } catch (e) {
      console.error('复制生肖失败', e);
      Toast.show('复制失败，请手动复制');
    }
  },

  renderSelectedZodiacHistory: () => {
    const state = StateManager._state;
    const selectedZodiacHistory = state.selectedZodiacHistory || [];
    const historyList = document.getElementById('selectedZodiacHistory');
    if (!historyList) return;

    if (selectedZodiacHistory.length === 0) {
      historyList.innerHTML = '<div style="text-align:center; padding:40px; color:var(--sub-text);">暂无精选生肖历史</div>';
      return;
    }

    const fragment = document.createDocumentFragment();

    selectedZodiacHistory.forEach((item, index) => {
      const itemDiv = document.createElement('div');
      itemDiv.className = 'selected-zodiac-history-item';
      itemDiv.setAttribute('role', 'listitem');

      const zodiacsHtml = item.zodiacs.map(zodiac => {
        return `<span class="zodiac-tag">${zodiac}</span>`;
      }).join(' ');

      itemDiv.innerHTML = `
        <div class="selected-zodiac-history-header">
          <div class="selected-zodiac-history-time">${new Date(item.timestamp).toLocaleString()}</div>
          <div class="selected-zodiac-history-actions">
            <button class="action-btn" onclick="Business.copySelectedZodiacHistoryItem(${index})"><i class="icon-copy"></i> 复制</button>
            <button class="action-btn danger" onclick="Business.deleteSelectedZodiacHistoryItem(${index})"><i class="icon-delete"></i> 删除</button>
          </div>
        </div>
        <div class="selected-zodiac-history-content">
          <div class="zodiac-tags">
            ${zodiacsHtml}
          </div>
          ${item.note ? `<div class="zodiac-note">备注: ${item.note}</div>` : ''}
        </div>
      `;

      fragment.appendChild(itemDiv);
    });

    historyList.innerHTML = '';
    historyList.appendChild(fragment);
  },

  goToSelectedZodiacHistoryPage: (page) => {
    // 这里需要完整的实现...
  },

  deleteSelectedZodiacHistoryItem: (index) => {
    // 这里需要完整的实现...
  },

  copySelectedZodiacHistoryItem: (index) => {
    // 这里需要完整的实现...
  },

  showSelectedZodiacDetail: (index) => {
    // 这里需要完整的实现...
  },

  clearSelectedZodiacHistory: () => {
    // 这里需要完整的实现...
  },

  // 特码热门TOP5历史相关
  silentSaveHotNumbers: () => {
    // 这里需要完整的实现...
  },

  updateHotNumbersHistoryComparison: () => {
    // 这里需要完整的实现...
  },

  renderHotNumbersHistory: () => {
    const state = StateManager._state;
    const hotNumbersHistory = state.hotNumbersHistory || [];
    const historyList = document.getElementById('hotNumbersHistory');
    if (!historyList) return;

    if (hotNumbersHistory.length === 0) {
      historyList.innerHTML = '<div style="text-align:center; padding:40px; color:var(--sub-text);">暂无热门特码历史</div>';
      return;
    }

    const fragment = document.createDocumentFragment();

    hotNumbersHistory.forEach((item, index) => {
      const itemDiv = document.createElement('div');
      itemDiv.className = 'hot-numbers-history-item';
      itemDiv.setAttribute('role', 'listitem');

      const hotNumbersHtml = item.hotNumbers.map((num, rank) => {
        const numStr = String(num).padStart(2, '0');
        return `<span class="hot-number rank-${rank + 1}">${numStr}</span>`;
      }).join(' ');

      itemDiv.innerHTML = `
        <div class="hot-numbers-history-header">
          <div class="hot-numbers-history-time">${new Date(item.timestamp).toLocaleString()}</div>
          <div class="hot-numbers-history-actions">
            <button class="action-btn" onclick="Business.copyHotNumbersHistory(${index})"><i class="icon-copy"></i> 复制</button>
            <button class="action-btn danger" onclick="Business.deleteHotNumbersHistoryItem(${index})"><i class="icon-delete"></i> 删除</button>
          </div>
        </div>
        <div class="hot-numbers-history-content">
          <div class="hot-numbers">
            ${hotNumbersHtml}
          </div>
          <div class="hot-numbers-info">
            <span>分析期数: ${item.analyzeLimit}</span>
          </div>
        </div>
      `;

      fragment.appendChild(itemDiv);
    });

    historyList.innerHTML = '';
    historyList.appendChild(fragment);
  },

  switchHotNumbersHistoryPage: (page) => {
    // 这里需要完整的实现...
  },

  goToHotNumbersHistoryPage: (page) => {
    // 这里需要完整的实现...
  },

  deleteHotNumbersHistory: (index) => {
    // 这里需要完整的实现...
  },

  copyHotNumbersHistory: (index) => {
    // 这里需要完整的实现...
  },

  showHotNumbersHistoryDetail: (index) => {
    // 这里需要完整的实现...
  },

  deleteHotNumbersHistoryItem: (index) => {
    // 这里需要完整的实现...
  },

  clearHotNumbersHistory: () => {
    // 这里需要完整的实现...
  },

  toggleHotNumbersHistory: () => {
    // 这里需要完整的实现...
  },

  /**
   * 加载精选特码历史筛选状态
   */
  loadSpecialHistoryFilter: () => {
    // 这里需要完整的实现...
  },

  silentUpdateAllPredictionHistory: () => {
    // 这里需要完整的实现...
  },

  // ML相关
  initMLServiceChecker: () => {
    // 这里需要完整的实现...
  },

  checkMLServiceStatus: () => {
    // 这里需要完整的实现...
  },

  updateMLServiceUI: () => {
    // 这里需要完整的实现...
  },

  startMLService: () => {
    // 这里需要完整的实现...
  },

  toggleMLInstructions: () => {
    // 这里需要完整的实现...
  },

  copyMLStartCommand: () => {
    // 这里需要完整的实现...
  },

  runMLPrediction: async () => {
    // 这里需要完整的实现...
  },

  displayMLPredictionResult: (result) => {
    // 这里需要完整的实现...
  },

  saveMLPredictionHistory: (result) => {
    // 这里需要完整的实现...
  },

  renderMLPredictionHistory: () => {
    // 这里需要完整的实现...
  },

  toggleMLPredictionHistory: () => {
    // 这里需要完整的实现...
  },

  deleteMLPredictionHistoryItem: (index) => {
    // 这里需要完整的实现...
  },

  clearMLPredictionHistory: () => {
    // 这里需要完整的实现...
  },

  // 预测统计相关
  getPredictionStatistics: () => {
    // 这里需要完整的实现...
    return null;
  },

  renderPredictionStatistics: () => {
    // 这里需要完整的实现...
  },

  checkAndUpdatePredictionStatus: () => {
    // 这里需要完整的实现...
  },

  showPredictionHistoryDetail: (index) => {
    // 这里需要完整的实现...
  },

  /**
   * 后台静默保存精选特码组合
   */
  silentSaveAllSpecialCombinations: () => {
    try {
      // 这里可以添加保存精选特码组合的逻辑
      // 例如：将当前选中的特码保存到历史记录
      console.log('后台静默保存精选特码组合');
    } catch(e) {
      console.error('后台静默保存精选特码失败:', e);
    }
  },



  /**
   * 后台静默保存特码热门TOP5
   */
  silentSaveHotNumbers: () => {
    try {
      // 这里可以添加保存特码热门TOP5的逻辑
      // 例如：将当前的热门特码保存到历史记录
      console.log('后台静默保存特码热门TOP5');
    } catch(e) {
      console.error('后台静默保存特码热门TOP5失败:', e);
    }
  },

  /**
   * 获取每期的生肖前6名数据
   * @returns {Array} 前6名生肖数组
   */
  getTop6Zodiacs: () => {
    try {
      // 分析10期、20期、30期的数据
      const periods = [10, 20, 30];
      const zodiacScores = {};
      
      periods.forEach(period => {
        const periodData = analysisCalc.calcZodiacAnalysis(period);
        if(periodData && periodData.zodiacScores) {
          Object.entries(periodData.zodiacScores).forEach(([zod, score]) => {
            if (!zodiacScores[zod]) {
              zodiacScores[zod] = 0;
            }
            zodiacScores[zod] += score;
          });
        }
      });
      
      // 按总分排序，取前6名
      const sortedZodiacs = Object.entries(zodiacScores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([zod]) => zod);
      
      return sortedZodiacs;
    } catch (error) {
      console.error('获取生肖前6名失败:', error);
      return [];
    }
  },

  /**
   * 获取当前期号
   * @returns {string} 当前期号
   */
  getCurrentIssue: () => {
    try {
      // 从DOM中获取期号
      const conclusionTitle = document.querySelector('.conclusion-title');
      if (conclusionTitle) {
        const titleText = conclusionTitle.textContent || conclusionTitle.innerText;
        const issueMatch = titleText.match(/第(\d+)期/);
        if (issueMatch && issueMatch[1]) {
          return issueMatch[1];
        }
      }
      
      // 如果从DOM中获取失败，尝试从IssueManager获取
      try {
        const nextIssue = IssueManager.getNextIssue();
        if (nextIssue && nextIssue.full) {
          return nextIssue.full;
        }
      } catch (issueError) {
        console.error('从IssueManager获取期号失败:', issueError);
      }
      
      return '';
    } catch (error) {
      console.error('获取期号失败:', error);
      return '';
    }
  },

  /**
   * 保存精选生肖到记录页面
   */
  saveSelectedZodiacsToRecord: () => {
    try {
      const top6Zodiacs = prediction.getTop6Zodiacs();
      
      if (!top6Zodiacs || top6Zodiacs.length === 0) {
        console.log('没有生肖数据');
        return;
      }
      
      // 获取当前期号
      const issue = prediction.getCurrentIssue();
      
      if (!issue) {
        console.error('获取期号失败');
        return;
      }
      
      console.log('开始保存生肖数据，期号:', issue);
      console.log('生肖数据:', top6Zodiacs);
      
      // 保存到记录页面
      import('./record.js').then(({ record }) => {
        try {
          const success = record.saveZodiacRecord({
            issue: issue,
            zodiacs: top6Zodiacs,
            periodData: {
              10: prediction.getTopZodiacsByPeriod(10),
              20: prediction.getTopZodiacsByPeriod(20),
              30: prediction.getTopZodiacsByPeriod(30)
            }
          });
          
          if (success) {
            console.log('保存精选生肖到记录页面成功');
          } else {
            console.error('保存精选生肖到记录页面失败');
          }
        } catch (saveError) {
          console.error('保存精选生肖到记录页面失败:', saveError);
        }
      }).catch(importError => {
        console.error('导入record模块失败:', importError);
      });
    } catch(e) {
      console.error('保存精选生肖到记录页面失败:', e);
    }
  },

  /**
   * 根据指定期数获取前6名生肖
   * @param {number} period - 期数
   * @returns {Array} 前6名生肖数组
   */
  getTopZodiacsByPeriod: (period) => {
    try {
      const periodData = analysisCalc.calcZodiacAnalysis(period);
      if(periodData && periodData.sortedZodiacs) {
        return periodData.sortedZodiacs.slice(0, 6).map(([zod]) => zod);
      }
      return [];
    } catch (error) {
      console.error(`获取${period}期生肖前6名失败:`, error);
      return [];
    }
  }
};
