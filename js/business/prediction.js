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
      
      // 数据缓存
      const dataCache = {
        lastUpdated: 0,
        data: {}
      };
      
      // 计算分析数据（带缓存）
      const calculateData = (period) => {
        const now = Date.now();
        // 缓存有效期为10秒
        if (dataCache.data[period] && (now - dataCache.lastUpdated) < 10000) {
          return dataCache.data[period];
        }
        
        const data = analysisCalc.calcZodiacAnalysis(period);
        dataCache.data[period] = data;
        dataCache.lastUpdated = now;
        return data;
      };
      
      // 转义特殊字符
      const escapeHtml = (text) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      };

      // 渲染弹窗内容（使用requestAnimationFrame优化）
      const renderContent = (content, zodiac) => {
        // 使用requestAnimationFrame优化DOM更新
        requestAnimationFrame(() => {
          let periodsHtml = '';
          let overallScore = 0;
          let periodCount = 0;
          
          periods.forEach(period => {
            const data = calculateData(period);
            if (!data) return;
            
            const score = data.zodiacScores ? data.zodiacScores[zodiac] : 0;
            const details = data.zodiacDetails ? data.zodiacDetails[zodiac] : { cold: 0, hot: 0, shape: 0, interval: 0 };
            const count = data.zodCount ? data.zodCount[zodiac] : 0;
            const miss = data.zodMiss ? data.zodMiss[zodiac] : 0;
            const avgMiss = data.zodAvgMiss ? data.zodAvgMiss[zodiac] : 0;
            const percentage = data.total > 0 ? ((count / data.total) * 100).toFixed(2) : '0.00';
            
            let rank = '-';
            if (data.sortedZodiacs) {
              const idx = data.sortedZodiacs.findIndex(([z]) => z === zodiac);
              if (idx !== -1) rank = `第${idx + 1}名`;
            }
            
            // 计算总评分
            overallScore += score;
            periodCount++;
            
            periodsHtml += `
              <div style="margin-bottom:16px;">
                <div style="font-size:14px;font-weight:600;margin-bottom:10px;color:#333;">${escapeHtml(periodLabels[period])}分析</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                  <div style="display:flex;flex-direction:column;gap:8px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                      <span style="font-size:13px;color:#666;">排名</span>
                      <span style="font-size:13px;font-weight:600;">${escapeHtml(rank)}</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                      <span style="font-size:13px;color:#666;">出现次数</span>
                      <span style="font-size:13px;">${escapeHtml(count.toString())}次</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                      <span style="font-size:13px;color:#666;">遗漏次数</span>
                      <span style="font-size:13px;">${escapeHtml(miss.toString())}期</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                      <span style="font-size:13px;color:#666;">平均遗漏</span>
                      <span style="font-size:13px;">${escapeHtml(typeof avgMiss === 'number' ? avgMiss.toFixed(1) : '0')}期</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                      <span style="font-size:13px;color:#666;">占比</span>
                      <span style="font-size:13px;">${escapeHtml(percentage)}%</span>
                    </div>
                  </div>
                  <div style="display:flex;flex-direction:column;gap:8px;">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                      <span style="font-size:13px;color:#666;">综合评分</span>
                      <span style="font-size:13px;font-weight:600;">${escapeHtml(score.toString())}分</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                      <span style="font-size:13px;color:#666;">冷号得分</span>
                      <span style="font-size:13px;">${escapeHtml(details.cold.toString())}分</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                      <span style="font-size:13px;color:#666;">热号得分</span>
                      <span style="font-size:13px;">${escapeHtml(details.hot.toString())}分</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                      <span style="font-size:13px;color:#666;">形态得分</span>
                      <span style="font-size:13px;">${escapeHtml(details.shape.toString())}分</span>
                    </div>
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                      <span style="font-size:13px;color:#666;">间隔得分</span>
                      <span style="font-size:13px;">${escapeHtml(details.interval.toString())}分</span>
                    </div>
                  </div>
                </div>
              </div>
            `;
          });
          
          // 计算平均评分
          const averageScore = periodCount > 0 ? (overallScore / periodCount).toFixed(1) : '0.0';
          
          // 获取当前期号
          const currentIssue = document.getElementById('curExpect')?.innerText || '2026100';
          
          // 使用文档片段减少DOM操作
          const fragment = document.createDocumentFragment();
          const newContent = document.createElement('div');
          newContent.innerHTML = `
            <div class="modal-header" style="padding: 20px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: center;">
              <h3 class="modal-title" style="margin: 0; font-size: 18px; color: #333;">${escapeHtml(zodiac)} 详细评分 (第${escapeHtml(currentIssue)}期精选)</h3>
              <div style="display: flex; gap: 10px; align-items: center;">
                <button class="refresh-btn" style="background: #f5f5f5; border: 1px solid #ddd; border-radius: 4px; padding: 4px 8px; font-size: 12px; cursor: pointer;">刷新</button>
                <button class="modal-close-btn" onclick="this.closest('.modal-overlay').remove()" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #999;">×</button>
              </div>
            </div>
            <div class="modal-body" style="padding: 20px;">
              <div style="margin-bottom:20px;padding:12px;background:#f5f5f5;border-radius:8px;">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                  <span style="font-size:14px;font-weight:600;color:#333;">综合平均评分</span>
                  <span style="font-size:16px;font-weight:700;color:#007AFF;">${escapeHtml(averageScore)}分</span>
                </div>
              </div>
              ${periodsHtml}
            </div>
          `;
          
          fragment.appendChild(newContent);
          
          // 清空并添加新内容
          content.innerHTML = '';
          content.appendChild(fragment);
          
          // 添加刷新按钮事件
          const refreshBtn = content.querySelector('.refresh-btn');
          if(refreshBtn) {
            // 清除缓存
            refreshBtn.addEventListener('click', () => {
              dataCache.lastUpdated = 0;
              renderContent(content, zodiac);
            });
          }
        });
      };
      
      // 创建弹窗容器
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      
      // 添加样式确保居中显示和遮罩效果
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        opacity: 0;
        transition: opacity 0.3s ease-in-out;
        backdrop-filter: blur(3px);
      `;
      
      // 创建弹窗内容
      const content = document.createElement('div');
      content.className = 'modal-content';
      content.style.cssText = `
        background: white;
        border-radius: 12px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        max-width: 90%;
        max-height: 80%;
        overflow-y: auto;
        transform: scale(0.9);
        transition: transform 0.3s ease-in-out;
      `;
      
      // 渲染初始内容
      renderContent(content, zodiac);
      
      // 组装弹窗
      modal.appendChild(content);
      document.body.appendChild(modal);
      
      // 触发动画
      setTimeout(() => {
        modal.style.opacity = '1';
        content.style.transform = 'scale(1)';
      }, 10);
      
      // 点击模态框外部关闭
      modal.addEventListener('click', (e) => {
        if(e.target === modal) {
          modal.style.opacity = '0';
          content.style.transform = 'scale(0.9)';
          setTimeout(() => {
            modal.remove();
          }, 300);
        }
      });
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
      
      // 保存到记录页面（标记为精选生肖类型）
      import('./record.js').then(({ record }) => {
        try {
          const success = record.saveZodiacRecord({
            issue: issue,
            zodiacs: top6Zodiacs,
            recordType: 'selected',
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
   * 保存生肖预测到记录页面（普通预测，不带类型标记）
   */
  saveZodiacPredictionToRecord: () => {
    try {
      const topZodiacs = prediction.getTopZodiacsByPeriod(10);
      
      if (!topZodiacs || topZodiacs.length === 0) {
        console.log('没有生肖预测数据');
        return;
      }
      
      const issue = prediction.getCurrentIssue();
      if (!issue) {
        console.error('获取期号失败');
        return;
      }
      
      console.log('开始保存生肖预测数据，期号:', issue);
      console.log('生肖预测数据:', topZodiacs);
      
      import('./record.js').then(({ record }) => {
        try {
          const success = record.saveZodiacRecord({
            issue: issue,
            zodiacs: topZodiacs,
            periodData: {
              10: prediction.getTopZodiacsByPeriod(10),
              20: prediction.getTopZodiacsByPeriod(20),
              30: prediction.getTopZodiacsByPeriod(30)
            }
          });
          
          if (success) {
            console.log('保存生肖预测到记录页面成功');
            Toast.show('生肖预测已保存到记录页面');
          } else {
            console.error('保存生肖预测到记录页面失败');
          }
        } catch (saveError) {
          console.error('保存生肖预测到记录页面失败:', saveError);
        }
      }).catch(importError => {
        console.error('导入record模块失败:', importError);
      });
    } catch(e) {
      console.error('保存生肖预测到记录页面失败:', e);
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
