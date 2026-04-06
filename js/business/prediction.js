// ====================== 预测历史模块 ======================

// 导入必要的模块
import { CONFIG } from '../config.js';
import { Utils } from '../utils.js';
import { StateManager } from '../state-manager.js';
import { DOM } from '../dom.js';
import { DataQuery } from '../data-query.js';
import { Storage } from '../storage.js';
import { Toast } from '../toast.js';

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

  silentSaveAllSpecialCombinations: () => {
    // 这里需要完整的实现...
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
    // 这里需要完整的实现...
    return new Map();
  },

  toggleZodiacSelection: (zodiac) => {
    // 这里需要完整的实现...
  },

  clearAllZodiacSelections: () => {
    // 这里需要完整的实现...
  },

  showSelectedZodiacRatingDetail: (zodiac) => {
    // 这里需要完整的实现...
  },

  copySelectedZodiacs: () => {
    // 这里需要完整的实现...
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

  // 生肖预测历史相关
  saveZodiacPredictionHistory: (sortedZodiacs, zodiacDetails) => {
    try {
      const history = Storage.loadZodiacPredictionHistory() || [];
      
      const newItem = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        sortedZodiacs: sortedZodiacs.map(z => ({
          name: z.name,
          count: z.count,
          miss: z.miss,
          streak: z.streak,
          level: z.level
        })),
        zodiacDetails: zodiacDetails || {},
        analyzeLimit: 30
      };
      
      history.unshift(newItem);
      
      // 限制历史记录数量
      if (history.length > 50) {
        history.splice(50);
      }
      
      Storage.saveZodiacPredictionHistory(history);
      
      // 更新状态
      const state = StateManager._state;
      StateManager.setState({ zodiacPredictionHistory: history }, false);
      
      Toast.show('预测历史已保存');
    } catch(e) {
      console.error('保存生肖预测历史失败:', e);
      Toast.show('保存失败，请稍后重试');
    }
  },

  renderZodiacPredictionHistory: () => {
    const history = Storage.loadZodiacPredictionHistory() || [];
    const historyList = document.getElementById('zodiacPredictionHistory');
    if (!historyList) return;

    if (history.length === 0) {
      historyList.innerHTML = '<div style="text-align:center; padding:40px; color:var(--sub-text);">暂无预测历史</div>';
      return;
    }

    const fragment = document.createDocumentFragment();

    history.forEach((item, index) => {
      const itemDiv = document.createElement('div');
      itemDiv.className = 'prediction-history-item';
      itemDiv.setAttribute('role', 'listitem');

      const topZodiacs = item.sortedZodiacs.slice(0, 3).map(z => `${z.name}(${z.count})`).join(', ');

      itemDiv.innerHTML = `
        <div class="prediction-history-header">
          <div class="prediction-history-time">${new Date(item.timestamp).toLocaleString()}</div>
          <div class="prediction-history-actions">
            <button class="action-btn" onclick="Business.copyZodiacPredictionHistory(${index})"><i class="icon-copy"></i> 复制</button>
            <button class="action-btn danger" onclick="Business.deleteZodiacPredictionHistoryItem(${index})"><i class="icon-delete"></i> 删除</button>
          </div>
        </div>
        <div class="prediction-history-content">
          <div class="prediction-history-top">
            <span>前3热生肖: ${topZodiacs}</span>
            <span>分析期数: ${item.analyzeLimit}</span>
          </div>
        </div>
      `;

      fragment.appendChild(itemDiv);
    });

    historyList.innerHTML = '';
    historyList.appendChild(fragment);
  },

  toggleZodiacPredictionHistory: () => {
    // 这里需要完整的实现...
  },

  savePredictionHistoryFilter: (filter) => {
    // 这里需要完整的实现...
  },

  loadPredictionHistoryFilter: () => {
    // 这里需要完整的实现...
    return null;
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

  clearZodiacPredictionHistory: () => {
    // 这里需要完整的实现...
  },

  deleteZodiacPredictionHistoryItem: (index) => {
    // 这里需要完整的实现...
  },

  copyZodiacPredictionHistory: (index) => {
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
   * 后台静默保存精选生肖
   */
  silentSaveAllSelectedZodiacs: () => {
    try {
      // 这里可以添加保存精选生肖的逻辑
      // 例如：将当前选中的生肖保存到历史记录
      console.log('后台静默保存精选生肖');
    } catch(e) {
      console.error('后台静默保存精选生肖失败:', e);
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
  }
};
