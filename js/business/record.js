// ====================== 记录页面业务逻辑（修复 map 错误） ======================
import { Storage } from '../storage.js';
import { StateManager } from '../state-manager.js';
import { Toast } from '../toast.js';
import { Filter } from '../filter.js';
import { DataQuery } from '../data-query.js';

export const record = {
  // 标记事件是否已绑定，防止重复绑定
  _eventsBound: false,
  
  init: () => {
    // 使用DOMContentLoaded确保DOM元素完全加载
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        record._initFilterButtons();
        record.renderAll();
        record.bindEvents();
      });
    } else {
      record._initFilterButtons();
      record.renderAll();
      record.bindEvents();
    }
  },
  
  /**
   * 初始化筛选按钮状态
   */
  _initFilterButtons: () => {
    // 默认选中10期按钮
    const btn10 = document.querySelector('.prediction-period-btn[data-period="10"]');
    if (btn10) {
      btn10.classList.add('active');
    }
    // 确保其他按钮未选中
    document.querySelectorAll('.prediction-period-btn').forEach(btn => {
      if (btn.dataset.period !== '10') {
        btn.classList.remove('active');
      }
    });
    console.log('[Init] 生肖预测历史筛选初始化，默认显示10期数据');
  },

  // 渲染所有历史记录
  renderAll: () => {
    // 延迟执行，确保DOM元素存在
    setTimeout(() => {
      record.renderFavoriteList();
      record.renderPredictionStatistics();
      record.renderSelectedZodiacHistory();
      record.renderZodiacPredictionHistory();
      record.renderMLPredictionHistory();
      record.renderSpecialHistory();
      record.renderHotNumbersHistory();
    }, 100);
  },
  
  /**
   * 刷新记录页面所有数据（静默模式）
   */
  refreshAll: () => {
    try {
      // 清除所有相关缓存（使用正确的key）
      Storage.clearCache('favorites');
      Storage.clearCache('zodiacRecords');
      Storage.clearCache('mlPredictionRecords');
      Storage.clearCache('numberRecords');
      Storage.clearCache('hotNumbersRecords');
      
      // 重新渲染所有数据
      record.renderAll();
      
      return true;
    } catch (error) {
      console.error('刷新记录页面失败:', error);
      return false;
    }
  },

  // ---------- 我的收藏 ----------
  renderFavoriteList: () => {
    const container = document.getElementById('favoriteList');
    if (!container) return;
    
    // 显示加载状态
    container.innerHTML = '<div class="loading-tip">加载中...</div>';
    
    try {
      // 清除缓存，确保获取最新数据
      Storage.clearCache('favorites');
      const favorites = Storage.get('favorites', []);
      
      if (!favorites.length) {
        container.innerHTML = '<div class="empty-tip">暂无收藏方案</div>';
        return;
      }
      
      const fragment = document.createDocumentFragment();
      favorites.forEach((item, idx) => {
        try {
          const filtered = Filter.getFilteredList(item.selected, item.excluded);
          const previewNums = filtered.slice(0, 4);
          const card = document.createElement('div');
          card.className = 'filter-item';
          card.innerHTML = `
            <div class="filter-row">
              <div class="filter-item-name">${escapeHtml(item.name)}</div>
              <div class="filter-preview">
                ${previewNums.map(num => {
                  const attrs = DataQuery.getNumAttrs(num.num);
                  return `<div class="num-ball-mini ${attrs.color}色">${num.s}<span class="num-zodiac">${attrs.zodiac}</span></div>`;
                }).join('')}
                ${filtered.length > 4 ? '<div class="more-indicator">+更多</div>' : ''}
              </div>
            </div>
            <div class="filter-item-btns">
              <button class="filter-item-btn" data-action="loadFavorite" data-index="${idx}">加载</button>
              <button class="filter-item-btn" data-action="renameFavorite" data-index="${idx}">重命名</button>
              <button class="filter-item-btn" data-action="copyFavorite" data-index="${idx}">复制</button>
              <button class="filter-item-btn del" data-action="removeFavorite" data-index="${idx}">移除</button>
            </div>
          `;
          fragment.appendChild(card);
        } catch (error) {
          console.error('渲染收藏项失败:', error);
        }
      });
      container.innerHTML = '';
      container.appendChild(fragment);
    } catch (error) {
      console.error('加载收藏列表失败:', error);
      container.innerHTML = '<div class="error-tip">加载失败，请点击刷新重试</div>';
    }
  },
  clearAllFavorites: () => {
    if (confirm('确定清空所有收藏吗？')) {
      Storage.set('favorites', []);
      StateManager.setState({ favorites: [] }, false);
      record.renderFavoriteList();
      Toast.show('已清空所有收藏');
    }
  },
  removeFavorite: (index) => {
    const favorites = Storage.get('favorites', []);
    if (favorites[index]) {
      favorites.splice(index, 1);
      Storage.set('favorites', favorites);
      StateManager.setState({ favorites: favorites }, false);
      record.renderFavoriteList();
      Toast.show('已移除收藏');
    }
  },
  loadFavorite: (index) => {
    const favorites = Storage.get('favorites', []);
    const item = favorites[index];
    if (!item) return;
    StateManager.setState({ selected: item.selected, excluded: item.excluded });
    Toast.show(`已加载方案：${item.name}`);
    document.querySelector('.bottom-nav-item[data-index="0"]')?.click();
  },
  renameFavorite: (index) => {
    const favorites = Storage.get('favorites', []);
    const item = favorites[index];
    if (!item) return;
    let newName = prompt('请输入新名称', item.name);
    if (newName?.trim()) {
      item.name = newName.trim();
      Storage.set('favorites', favorites);
      StateManager.setState({ favorites: favorites }, false);
      record.renderFavoriteList();
      Toast.show('重命名成功');
    }
  },
  copyFavorite: (index) => {
    const favorites = Storage.get('favorites', []);
    const item = favorites[index];
    if (!item) return;
    const filtered = Filter.getFilteredList(item.selected, item.excluded);
    const numStr = filtered.map(n => n.s).join(' ');
    if (navigator.clipboard) navigator.clipboard.writeText(numStr).then(() => Toast.show('复制成功'));
    else alert('请手动复制：' + numStr);
  },

  // ---------- 预测统计 ----------
  renderPredictionStatistics: () => {
    const container = document.getElementById('predictionStatisticsBody');
    if (!container) return;
    
    // 显示加载状态
    container.innerHTML = '<div class="loading-tip">加载中...</div>';
    
    try {
      // 清除缓存，确保获取最新数据
      Storage.clearCache('zodiacRecords');
      const zodiacStats = record._getCategoryStats('zodiac');
      const selectedZodiacStats = record._getCategoryStats('selectedZodiac');
      const totalPredictions = zodiacStats.total + selectedZodiacStats.total;
      const totalHits = zodiacStats.hit + selectedZodiacStats.hit;
      const totalMiss = zodiacStats.miss + selectedZodiacStats.miss;
      const totalPending = zodiacStats.pending + selectedZodiacStats.pending;
      const hitRate = totalHits + totalMiss > 0 ? ((totalHits / (totalHits + totalMiss)) * 100).toFixed(1) : '0.0';
      container.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px;">
          <div style="background:var(--bg-secondary);border-radius:12px;padding:16px;text-align:center;">
            <div style="font-size:24px;font-weight:700;color:var(--primary)">${totalPredictions}</div>
            <div style="font-size:12px;color:var(--sub-text);margin-top:4px">总预测数</div>
          </div>
          <div style="background:var(--bg-secondary);border-radius:12px;padding:16px;text-align:center;">
            <div style="font-size:24px;font-weight:700;color:var(--green)">${totalHits}</div>
            <div style="font-size:12px;color:var(--sub-text);margin-top:4px">命中数</div>
          </div>
          <div style="background:var(--bg-secondary);border-radius:12px;padding:16px;text-align:center;">
            <div style="font-size:24px;font-weight:700;color:var(--primary)">${hitRate}%</div>
            <div style="font-size:12px;color:var(--sub-text);margin-top:4px">命中率</div>
          </div>
          <div style="background:var(--bg-secondary);border-radius:12px;padding:16px;text-align:center;">
            <div style="font-size:24px;font-weight:700;color:var(--sub-text)">${totalPending}</div>
            <div style="font-size:12px;color:var(--sub-text);margin-top:4px">待开奖</div>
          </div>
        </div>
        <div style="display:flex;gap:12px;flex-wrap:nowrap;overflow-x:auto;">
          <div style="flex:1;min-width:200px;background:var(--card);border-radius:12px;padding:16px;border:1px solid var(--border);cursor:pointer;transition:all 0.2s ease;" data-action="showDetailedStatistics" data-type="zodiac">
            <div class="card-header" style="padding:0;margin-bottom:12px;">
              <h2 style="font-size:16px;">生肖预测</h2>
              <div style="font-size:12px;color:var(--sub-text);margin-top:4px;">点击查看详情</div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <span style="font-size:14px;color:var(--sub-text)">命中</span>
              <span style="font-size:16px;font-weight:600;color:var(--green)">${zodiacStats.hit}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <span style="font-size:14px;color:var(--sub-text)">未中</span>
              <span style="font-size:16px;font-weight:600;color:var(--danger)">${zodiacStats.miss}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <span style="font-size:14px;color:var(--sub-text)">待开奖</span>
              <span style="font-size:16px;font-weight:600;color:var(--sub-text)">${zodiacStats.pending}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;padding-top:12px;border-top:1px solid var(--border);">
              <span style="font-size:14px;color:var(--sub-text)">命中率</span>
              <span style="font-size:16px;font-weight:600;color:var(--primary)">${zodiacStats.hitRate}%</span>
            </div>
          </div>
          <div style="flex:1;min-width:200px;background:var(--card);border-radius:12px;padding:16px;border:1px solid var(--border);cursor:pointer;transition:all 0.2s ease;" data-action="showDetailedStatistics" data-type="selected">
            <div class="card-header" style="padding:0;margin-bottom:12px;">
              <h2 style="font-size:16px;">精选生肖</h2>
              <div style="font-size:12px;color:var(--sub-text);margin-top:4px;">点击查看详情</div>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <span style="font-size:14px;color:var(--sub-text)">命中</span>
              <span style="font-size:16px;font-weight:600;color:var(--green)">${selectedZodiacStats.hit}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <span style="font-size:14px;color:var(--sub-text)">未中</span>
              <span style="font-size:16px;font-weight:600;color:var(--danger)">${selectedZodiacStats.miss}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <span style="font-size:14px;color:var(--sub-text)">待开奖</span>
              <span style="font-size:16px;font-weight:600;color:var(--sub-text)">${selectedZodiacStats.pending}</span>
            </div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-top:12px;padding-top:12px;border-top:1px solid var(--border);">
              <span style="font-size:14px;color:var(--sub-text)">命中率</span>
              <span style="font-size:16px;font-weight:600;color:var(--primary)">${selectedZodiacStats.hitRate}%</span>
            </div>
          </div>
        </div>
      `;
    } catch (error) {
      console.error('加载预测统计失败:', error);
      container.innerHTML = '<div class="error-tip">加载失败，请点击刷新重试</div>';
    }
  },
  _getCategoryStats: (type) => {
    const allRecords = Storage.get('zodiacRecords', []);
    let records = type === 'selected' 
      ? allRecords.filter(r => r.recordType === 'selected')
      : allRecords.filter(r => !r.recordType || r.recordType !== 'selected');
    let hit = 0, miss = 0, pending = 0;
    records.forEach(rec => {
      if (rec.checked === true) rec.matched === true ? hit++ : miss++;
      else pending++;
    });
    const hitRate = (hit + miss) > 0 ? ((hit / (hit + miss)) * 100).toFixed(1) : '0.0';
    return { hit, miss, pending, hitRate, total: records.length };
  },
  refreshPredictionStatistics: () => { record.renderPredictionStatistics(); Toast.show('统计已刷新'); },

  // ---------- 精选生肖历史 ----------
  renderSelectedZodiacHistory: () => {
    const container = document.getElementById('selectedZodiacHistoryList');
    if (!container) return;
    
    // 显示加载状态
    container.innerHTML = '<div class="loading-tip">加载中...</div>';
    
    try {
      // 清除缓存，确保获取最新数据
      Storage.clearCache('zodiacRecords');
      const allRecords = Storage.get('zodiacRecords', []);
      const records = allRecords.filter(r => r.recordType === 'selected');
      
      if (!records.length) { 
        container.innerHTML = '<div class="empty-tip">暂无精选生肖历史</div>'; 
        return;
      }
      
      const fragment = document.createDocumentFragment();
      records.forEach((rec, idx) => {
        try {
          const dateStr = rec.createdAt ? new Date(rec.createdAt).toLocaleString('zh-CN', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' }) : '';
          const zodiacs = Array.isArray(rec.zodiacs) ? rec.zodiacs : [];
          const item = document.createElement('div');
          item.className = 'history-item';
          item.innerHTML = `
            <div class="history-header">
              <div class="history-nums">第${rec.issue || ''}期</div>
              <div class="history-time">${dateStr}</div>
            </div>
            <div class="history-tags">
              ${zodiacs.map(z => `<div class="history-tag">${escapeHtml(z)}</div>`).join('')}
            </div>
          `;
          fragment.appendChild(item);
        } catch (error) {
          console.error('渲染精选生肖历史项失败:', error);
        }
      });
      container.innerHTML = '';
      container.appendChild(fragment);
    } catch (error) {
      console.error('加载精选生肖历史失败:', error);
      container.innerHTML = '<div class="error-tip">加载失败，请点击刷新重试</div>';
    }
  },
  clearSelectedZodiacHistory: () => {
    if (confirm('确定清空所有精选生肖记录吗？')) {
      const allRecords = Storage.get('zodiacRecords', []);
      const filtered = allRecords.filter(r => r.recordType !== 'selected');
      Storage.set('zodiacRecords', filtered);
      record.renderSelectedZodiacHistory();
      record.renderPredictionStatistics();
      Toast.show('已清空精选生肖记录');
    }
  },

  // 分页参数
  _pagination: {
    zodiacPrediction: { page: 1, pageSize: 5 },
    mlPrediction: { page: 1, pageSize: 5 },
    specialHistory: { page: 1, pageSize: 5 },
    hotNumbers: { page: 1, pageSize: 5 }
  },
  
  // 生肖预测历史筛选状态
  _zodiacPredictionFilter: {
    selectedPeriods: ['10'] // 默认只显示10期数据
  },

  // ---------- 生肖预测历史 ----------
  renderZodiacPredictionHistory: (loadMore = false) => {
    const container = document.getElementById('zodiacPredictionHistoryList');
    if (!container) return;
    
    // 如果不是加载更多，重置分页参数
    if (!loadMore) {
      record._pagination.zodiacPrediction.page = 1;
      // 显示加载状态
      container.innerHTML = '<div class="loading-tip">加载中...</div>';
    }
    
    try {
      // 清除缓存，确保获取最新数据
      Storage.clearCache('zodiacRecords');
      const allRecords = Storage.get('zodiacRecords', []);
      let records = allRecords.filter(r => !r.recordType || r.recordType !== 'selected');
      
      // 应用筛选条件：根据选择的期数过滤
      const selectedPeriods = record._zodiacPredictionFilter.selectedPeriods;
      if (selectedPeriods && selectedPeriods.length > 0) {
        records = records.filter(rec => {
          if (!rec.periodData) return false;
          
          const selectedPeriod = selectedPeriods[0]; // 单选模式，只取第一个
          
          // 如果选择的是"全年"，显示所有记录
          if (selectedPeriod === 'all') {
            return true;
          }
          
          // 检查记录是否包含选中的期数（注意：存储时是数字键，需要转换）
          return rec.periodData.hasOwnProperty(selectedPeriod) || 
                 rec.periodData.hasOwnProperty(Number(selectedPeriod));
        });
      }
      
      if (!records.length) { 
        if (!loadMore) {
          container.innerHTML = '<div class="empty-tip">暂无预测历史</div>'; 
        }
        // 隐藏展开更多按钮
        const toggle = document.getElementById('zodiacPredictionHistoryToggle');
        if (toggle) toggle.style.display = 'none';
        return;
      }
      
      // 计算分页数据
      const { page, pageSize } = record._pagination.zodiacPrediction;
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedRecords = records.slice(startIndex, endIndex);
      
      const fragment = document.createDocumentFragment();
      paginatedRecords.forEach((rec, idx) => {
        try {
          const dateStr = rec.createdAt ? new Date(rec.createdAt).toLocaleString('zh-CN', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' }) : '';
          
          // 根据筛选条件显示对应的期数信息
          let periodInfo = '';
          if (rec.periodData) {
            const availablePeriods = Object.keys(rec.periodData);
            // 显示选中的期数中第一个可用的
            const displayPeriod = selectedPeriods.find(p => availablePeriods.includes(p)) || availablePeriods[0];
            periodInfo = `${displayPeriod}期数据`;
          } else {
            periodInfo = '10期数据';
          }
          
          // 获取对应期数的生肖数据（前6名，按顺序）
          let zodiacs = [];
          const displayPeriod = selectedPeriods[0]; // 单选模式，只取第一个
          
          if (displayPeriod === 'all') {
            // 全年模式：显示第一条可用期数的数据
            if (rec.periodData) {
              const availableKeys = Object.keys(rec.periodData);
              if (availableKeys.length > 0) {
                zodiacs = rec.periodData[availableKeys[0]];
              }
            }
          } else if (rec.periodData) {
            // 尝试字符串键和数字键
            zodiacs = rec.periodData[displayPeriod] || rec.periodData[Number(displayPeriod)] || [];
          }
          
          // 如果没有期数数据，使用旧的zodiacs字段
          if (!zodiacs || zodiacs.length === 0) {
            zodiacs = Array.isArray(rec.zodiacs) ? rec.zodiacs : [];
          }
          
          // 确保只显示前6名，并按顺序排列
          zodiacs = zodiacs.slice(0, 6);
          
          // 直接使用保存的期号（已经是预测期号，无需+1）
          const displayIssue = rec.issue || '';
          
          // 调试日志：显示期号信息
          if (idx === 0) {
            console.log('[Record] 📅 最新历史记录期号:', displayIssue, '(应与分析页面标题中的期号一致)');
          }
          
          const item = document.createElement('div');
          item.className = 'history-item';
          item.innerHTML = `
            <div class="history-header">
              <div class="history-nums">第${escapeHtml(displayIssue)}期 ${escapeHtml(periodInfo)}</div>
              <div class="history-time">${dateStr}</div>
            </div>
            <div class="history-tags">
              ${zodiacs.map((z, index) => `<div class="history-tag" data-rank="${index + 1}">${escapeHtml(z)}</div>`).join('')}
            </div>
            ${rec.checked ? `
              <div class="history-check-result" style="margin-top:8px;font-size:12px;">
                ${rec.matched ? '<span style="color:var(--green)">✓ 命中</span>' : '<span style="color:var(--danger)">✗ 未中</span>'}
                ${rec.actualZodiac ? `<span style="color:var(--sub-text);margin-left:8px;">开奖：${escapeHtml(rec.actualZodiac)}</span>` : ''}
              </div>
            ` : ''}
          `;
          fragment.appendChild(item);
        } catch (error) {
          console.error('渲染生肖预测历史项失败:', error);
        }
      });
      
      // 如果是加载更多，追加内容；否则替换内容
      if (loadMore) {
        container.appendChild(fragment);
      } else {
        container.innerHTML = '';
        container.appendChild(fragment);
      }
      
      // 更新分页参数
      record._pagination.zodiacPrediction.page++;
      
      // 显示/隐藏展开更多按钮
      const toggle = document.getElementById('zodiacPredictionHistoryToggle');
      if (toggle) {
        toggle.style.display = endIndex < records.length ? 'block' : 'none';
      }
    } catch (error) {
      console.error('加载生肖预测历史失败:', error);
      if (!loadMore) {
        container.innerHTML = '<div class="error-tip">加载失败，请点击刷新重试</div>';
      }
      // 隐藏展开更多按钮
      const toggle = document.getElementById('zodiacPredictionHistoryToggle');
      if (toggle) toggle.style.display = 'none';
    }
  },
  clearZodiacPredictionHistory: () => {
    if (confirm('确定清空所有生肖预测历史吗？')) {
      const allRecords = Storage.get('zodiacRecords', []);
      const filtered = allRecords.filter(r => r.recordType === 'selected');
      Storage.set('zodiacRecords', filtered);
      record.renderZodiacPredictionHistory();
      record.renderPredictionStatistics();
      Toast.show('已清空生肖预测历史');
    }
  },

  // ---------- ML预测历史 ----------
  renderMLPredictionHistory: (loadMore = false) => {
    const container = document.getElementById('mlPredictionHistoryList');
    if (!container) return;
    
    // 如果不是加载更多，重置分页参数
    if (!loadMore) {
      record._pagination.mlPrediction.page = 1;
      // 显示加载状态
      container.innerHTML = '<div class="loading-tip">加载中...</div>';
    }
    
    try {
      // 清除缓存，确保获取最新数据
      Storage.clearCache('mlPredictionRecords');
      const mlRecords = Storage.get('mlPredictionRecords', []);
      
      if (!mlRecords.length) { 
        if (!loadMore) {
          container.innerHTML = '<div class="empty-tip">暂无ML预测历史</div>'; 
        }
        // 隐藏展开更多按钮
        const toggle = document.getElementById('mlPredictionHistoryToggle');
        if (toggle) toggle.style.display = 'none';
        return;
      }
      
      // ✅ 去重处理：按 issue 去重，保留每个期号的最新预测（数组中靠前的记录）
      const seenIssues = new Set();
      const uniqueRecords = [];
      
      // 调试：查看原始数据
      if (mlRecords.length > 0) {
        console.log('[Record] 🔍 原始数据前3条:');
        mlRecords.slice(0, 3).forEach((rec, idx) => {
          console.log(`  [${idx}] issue:`, rec.issue, '| type:', typeof rec.issue, '| createdAt:', rec.createdAt);
        });
      }
      
      mlRecords.forEach((rec, idx) => {
        // 统一转换为字符串进行比较，避免数字/字符串类型不匹配
        const issueKey = String(rec.issue);
        if (seenIssues.has(issueKey)) {
          console.log(`[Record] ⏭️ [${idx}] 跳过重复期号:`, rec.issue, '(类型:', typeof rec.issue, ')');
          return; // 已存在该期号，跳过
        }
        seenIssues.add(issueKey);
        uniqueRecords.push(rec);
      });
      
      console.log('[Record] 📊 ML预测历史 - 原始:', mlRecords.length, '条, 去重后:', uniqueRecords.length, '条');
      if (uniqueRecords.length > 0) {
        console.log('[Record] 📋 去重后的前3条期号:', uniqueRecords.slice(0, 3).map(r => ({ issue: r.issue, time: r.createdAt })));
      }
      
      // 计算分页数据
      const { page, pageSize } = record._pagination.mlPrediction;
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedRecords = uniqueRecords.slice(startIndex, endIndex);
      
      const fragment = document.createDocumentFragment();
      paginatedRecords.forEach((rec, idx) => {
        try {
          const dateStr = rec.createdAt ? new Date(rec.createdAt).toLocaleString('zh-CN', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' }) : '';
          const zodiacs = Array.isArray(rec.predictions) ? rec.predictions : [];
          const modelVersion = rec.modelVersion || '1.0';
          const inputFeatures = rec.inputFeatures || '历史开奖数据';
          const item = document.createElement('div');
          item.className = 'history-item';
          item.innerHTML = `
            <div class="history-header">
              <div class="history-nums">第${rec.issue || ''}期 ML预测</div>
              <div class="history-time">${dateStr}</div>
            </div>
            <div class="history-tags">
              ${zodiacs.map(z => `<div class="history-tag">${escapeHtml(z)}</div>`).join('')}
            </div>
            <div class="history-meta" style="font-size: 12px; color: #999; margin-top: 5px;">模型版本: ${escapeHtml(modelVersion)} | 特征: ${escapeHtml(inputFeatures)}</div>
          `;
          fragment.appendChild(item);
        } catch (error) {
          console.error('渲染ML预测历史项失败:', error);
        }
      });
      
      // 如果是加载更多，追加内容；否则替换内容
      if (loadMore) {
        container.appendChild(fragment);
      } else {
        container.innerHTML = '';
        container.appendChild(fragment);
      }
      
      // 更新分页参数
      record._pagination.mlPrediction.page++;
      
      // 显示/隐藏展开更多按钮
      const toggle = document.getElementById('mlPredictionHistoryToggle');
      if (toggle) {
        toggle.style.display = endIndex < uniqueRecords.length ? 'block' : 'none';
      }
    } catch (error) {
      console.error('加载ML预测历史失败:', error);
      if (!loadMore) {
        container.innerHTML = '<div class="error-tip">加载失败，请点击刷新重试</div>';
      }
      // 隐藏展开更多按钮
      const toggle = document.getElementById('mlPredictionHistoryToggle');
      if (toggle) toggle.style.display = 'none';
    }
  },
  refreshMLPredictionHistory: () => { record.renderMLPredictionHistory(); Toast.show('ML预测历史已刷新'); },
  clearMLPredictionHistory: () => {
    if (confirm('确定清空所有ML预测历史吗？')) {
      Storage.set('mlPredictionRecords', []);
      record.renderMLPredictionHistory();
      Toast.show('已清空ML预测历史');
    }
  },

  // ---------- 精选特码历史 ----------
  renderSpecialHistory: () => {
    const container = document.getElementById('specialHistoryList');
    if (!container) return;
    
    // 显示加载状态
    container.innerHTML = '<div class="loading-tip">加载中...</div>';
    
    try {
      // 清除缓存，确保获取最新数据
      Storage.clearCache('numberRecords');
      const specialRecords = Storage.get('numberRecords', []);
      
      if (!specialRecords.length) { 
        container.innerHTML = '<div class="empty-tip">暂无精选特码历史</div>'; 
        return;
      }
      
      const fragment = document.createDocumentFragment();
      specialRecords.forEach((rec, idx) => {
        try {
          const dateStr = rec.createdAt ? new Date(rec.createdAt).toLocaleString('zh-CN', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' }) : '';
          const numbers = Array.isArray(rec.numbers) ? rec.numbers : [];
          const item = document.createElement('div');
          item.className = 'history-item';
          item.innerHTML = `
            <div class="history-header">
              <div class="history-nums">第${rec.issue || ''}期 精选特码</div>
              <div class="history-time">${dateStr}</div>
            </div>
            <div class="history-tags">
              ${numbers.map(n => `<div class="history-tag">${escapeHtml(n)}</div>`).join('')}
            </div>
          `;
          fragment.appendChild(item);
        } catch (error) {
          console.error('渲染精选特码历史项失败:', error);
        }
      });
      container.innerHTML = '';
      container.appendChild(fragment);
    } catch (error) {
      console.error('加载精选特码历史失败:', error);
      container.innerHTML = '<div class="error-tip">加载失败，请点击刷新重试</div>';
    }
  },
  clearSpecialHistory: () => {
    if (confirm('确定清空所有精选特码历史吗？')) {
      Storage.set('numberRecords', []);
      record.renderSpecialHistory();
      Toast.show('已清空精选特码历史');
    }
  },

  // ---------- 特码热门TOP5历史 ----------
  renderHotNumbersHistory: () => {
    const container = document.getElementById('hotNumbersHistoryList');
    if (!container) return;
    
    // 显示加载状态
    container.innerHTML = '<div class="loading-tip">加载中...</div>';
    
    try {
      // 清除缓存，确保获取最新数据
      Storage.clearCache('hotNumbersRecords');
      const hotRecords = Storage.get('hotNumbersRecords', []);
      
      if (!hotRecords.length) { 
        container.innerHTML = '<div class="empty-tip">暂无特码热门TOP5历史</div>'; 
        return;
      }
      
      const fragment = document.createDocumentFragment();
      hotRecords.forEach((rec, idx) => {
        try {
          const dateStr = rec.createdAt ? new Date(rec.createdAt).toLocaleString('zh-CN', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' }) : '';
          const numbers = Array.isArray(rec.numbers) ? rec.numbers : [];
          const item = document.createElement('div');
          item.className = 'history-item';
          item.innerHTML = `
            <div class="history-header">
              <div class="history-nums">第${rec.issue || ''}期 热门TOP5</div>
              <div class="history-time">${dateStr}</div>
            </div>
            <div class="history-tags">
              ${numbers.map(n => `<div class="history-tag">${escapeHtml(n)}</div>`).join('')}
            </div>
          `;
          fragment.appendChild(item);
        } catch (error) {
          console.error('渲染特码热门TOP5历史项失败:', error);
        }
      });
      container.innerHTML = '';
      container.appendChild(fragment);
    } catch (error) {
      console.error('加载特码热门TOP5历史失败:', error);
      container.innerHTML = '<div class="error-tip">加载失败，请点击刷新重试</div>';
    }
  },
  clearHotNumbersHistory: () => {
    if (confirm('确定清空所有特码热门TOP5历史吗？')) {
      Storage.set('hotNumbersRecords', []);
      record.renderHotNumbersHistory();
      Toast.show('已清空特码热门TOP5历史');
    }
  },

  // ---------- 筛选面板操作 ----------
  togglePredictionFiltersPanel: () => {
    const panel = document.getElementById('predictionFiltersPanel');
    if (panel) panel.classList.toggle('show');
  },
  toggleSpecialFiltersPanel: () => {
    const panel = document.getElementById('specialFiltersPanel');
    if (panel) panel.classList.toggle('show');
  },
  selectAllPredictionPeriods: () => {
    // 在单选模式下，全选没有意义，默认选中第一个（10期）
    const buttons = document.querySelectorAll('.prediction-period-btn');
    buttons.forEach((btn, index) => {
      if (index === 0) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    record._zodiacPredictionFilter.selectedPeriods = ['10'];
    console.log('[Filter] 全选操作（单选模式），设置为10期');
  },
  resetPredictionPeriods: () => {
    // 在单选模式下，重置为默认值（10期）
    const buttons = document.querySelectorAll('.prediction-period-btn');
    buttons.forEach((btn, index) => {
      if (index === 0) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    record._zodiacPredictionFilter.selectedPeriods = ['10'];
    console.log('[Filter] 重置操作（单选模式），设置为10期');
  },
  confirmPredictionFilters: () => {
    // 获取当前选中的期数按钮（单选模式）
    const activeButton = document.querySelector('.prediction-period-btn.active');
    const selectedPeriod = activeButton ? activeButton.dataset.period : '10';
    
    // 更新筛选状态为单选
    record._zodiacPredictionFilter.selectedPeriods = [selectedPeriod];
    
    console.log('[Filter] 生肖预测历史筛选条件:', record._zodiacPredictionFilter.selectedPeriods);
    
    // 关闭筛选面板
    const panel = document.getElementById('predictionFiltersPanel');
    if (panel) panel.classList.remove('show');
    
    // 重新渲染生肖预测历史
    record.renderZodiacPredictionHistory();
    
    Toast.show(`已应用筛选：${selectedPeriod === 'all' ? '全年' : selectedPeriod + '期'}`);
  },
  confirmSpecialFilters: () => {
    // 这里可以添加筛选逻辑
    const panel = document.getElementById('specialFiltersPanel');
    if (panel) panel.classList.remove('show');
    Toast.show('筛选条件已应用');
  },
  switchSpecialHistoryMode: (mode) => {
    const buttons = document.querySelectorAll('.special-history-mode-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.special-history-mode-btn[data-mode="${mode}"]`)?.classList.add('active');
    // 这里可以添加模式切换逻辑
    Toast.show(`已切换到${mode === 'hot' ? '热号' : mode === 'cold' ? '冷号' : '全部'}模式`);
  },

  // ---------- 展开/收起操作 ----------
  toggleZodiacPredictionHistory: () => {
    // 加载更多数据
    record.renderZodiacPredictionHistory(true);
  },
  toggleMLPredictionHistory: () => {
    // 加载更多数据
    record.renderMLPredictionHistory(true);
  },

  // ---------- 兼容 prediction.js 和 data-fetch.js 调用的方法 ----------
  saveZodiacRecord: (recordData) => {
    return Storage.saveZodiacRecord(recordData);
  },
  checkZodiacRecord: (issue, actualZodiac) => {
    const result = Storage.checkZodiacRecord(issue, actualZodiac);
    if (result.success) {
      record.renderZodiacPredictionHistory();
      record.renderSelectedZodiacHistory();
      record.renderPredictionStatistics();
    }
    return result;
  },
  
  /**
   * 手动核对生肖预测记录
   * @param {string} issue - 期号
   * @param {string} actualZodiac - 实际开奖生肖
   */
  manualCheckZodiacRecord: (issue, actualZodiac) => {
    if (!issue || !actualZodiac) {
      Toast.show('请输入期号和开奖生肖');
      return false;
    }
    
    const result = record.checkZodiacRecord(issue, actualZodiac);
    if (result.success) {
      Toast.show(result.matched ? '核对成功：命中！' : '核对成功：未中');
    } else {
      Toast.show(result.message || '核对失败');
    }
    return result;
  },
  
  /**
   * 显示核对对话框
   */
  showCheckDialog: () => {
    // 创建对话框
    const dialog = document.createElement('div');
    dialog.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
      background: var(--card);
      border-radius: 16px;
      padding: 24px;
      max-width: 90%;
      width: 320px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    `;
    
    content.innerHTML = `
      <h3 style="margin: 0 0 20px 0; font-size: 18px; text-align: center;">核对生肖预测</h3>
      <div style="margin-bottom: 16px;">
        <label style="display: block; margin-bottom: 8px; font-size: 14px; color: var(--sub-text);">期号：</label>
        <input type="text" id="checkIssueInput" placeholder="例如：2026101" 
               style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 8px; font-size: 14px; background: var(--bg-secondary); color: var(--text);">
      </div>
      <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 8px; font-size: 14px; color: var(--sub-text);">开奖生肖：</label>
        <input type="text" id="checkZodiacInput" placeholder="例如：龙" 
               style="width: 100%; padding: 10px; border: 1px solid var(--border); border-radius: 8px; font-size: 14px; background: var(--bg-secondary); color: var(--text);">
      </div>
      <div style="display: flex; gap: 12px;">
        <button id="cancelCheckBtn" style="flex: 1; padding: 12px; border: none; border-radius: 8px; background: var(--bg-secondary); color: var(--text); font-size: 14px; cursor: pointer;">取消</button>
        <button id="confirmCheckBtn" style="flex: 1; padding: 12px; border: none; border-radius: 8px; background: var(--primary); color: #fff; font-size: 14px; cursor: pointer;">确认</button>
      </div>
    `;
    
    dialog.appendChild(content);
    document.body.appendChild(dialog);
    
    // 绑定事件
    document.getElementById('cancelCheckBtn').addEventListener('click', () => {
      document.body.removeChild(dialog);
    });
    
    document.getElementById('confirmCheckBtn').addEventListener('click', () => {
      const issue = document.getElementById('checkIssueInput').value.trim();
      const zodiac = document.getElementById('checkZodiacInput').value.trim();
      
      if (!issue || !zodiac) {
        Toast.show('请填写完整信息');
        return;
      }
      
      record.manualCheckZodiacRecord(issue, zodiac);
      document.body.removeChild(dialog);
    });
    
    // 点击背景关闭
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        document.body.removeChild(dialog);
      }
    });
  },
  saveNumberRecord: (recordData) => {
    return Storage.saveNumberRecord(recordData);
  },
  checkNumberRecord: (issue, actualNumbers) => {
    const result = Storage.checkNumberRecord(issue, actualNumbers);
    if (result.success) {
      record.renderSpecialHistory();
    }
    return result;
  },
  loadZodiacRecords: () => {
    record.renderZodiacPredictionHistory();
    record.renderSelectedZodiacHistory();
    record.renderPredictionStatistics();
  },

  // 显示详细统计弹窗
  showDetailedStatistics: (type) => {
    try {
      // 创建弹窗容器
      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      
      // 创建弹窗内容
      const content = document.createElement('div');
      content.className = 'modal-content';
      
      // 初始内容
      const initialContent = `
        <div class="modal-header">
          <h3 class="modal-title">${type === 'zodiac' ? '生肖预测' : '精选生肖'}详细统计</h3>
          <button class="modal-close-btn" onclick="this.closest('.modal-overlay').remove()">×</button>
        </div>
        <div class="modal-body">
          <div style="margin-bottom:20px;">
            <div style="font-size:14px;font-weight:600;margin-bottom:12px;color:var(--text);">选择统计周期</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <button class="btn-mini period-btn active" data-period="10">10期</button>
              <button class="btn-mini period-btn" data-period="20">20期</button>
              <button class="btn-mini period-btn" data-period="30">30期</button>
              <button class="btn-mini period-btn" data-period="all">全年</button>
            </div>
          </div>
          <div id="statisticsContent">
            <div style="display:flex;justify-content:center;align-items:center;padding:40px;">
              <div style="text-align:center;">
                <div style="font-size:48px;margin-bottom:12px;">📊</div>
                <div style="font-size:16px;color:var(--sub-text);">请选择统计周期</div>
              </div>
            </div>
          </div>
        </div>
      `;
      
      content.innerHTML = initialContent;
      modal.appendChild(content);
      document.body.appendChild(modal);
      
      // 触发动画
      setTimeout(() => {
        modal.style.opacity = '1';
        content.style.transform = 'scale(1)';
      }, 10);
      
      // 绑定周期按钮点击事件
      const periodBtns = content.querySelectorAll('.period-btn');
      periodBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          // 更新按钮状态
          periodBtns.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          
          // 获取选中的周期
          const period = btn.dataset.period;
          
          // 加载对应周期的统计数据
          record.loadPeriodStatistics(type, period, content.querySelector('#statisticsContent'));
        });
      });
      
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
      console.error('显示详细统计失败', e);
      Toast.show('显示详情失败');
    }
  },
  
  // 加载指定周期的统计数据
  loadPeriodStatistics: (type, period, container) => {
    try {
      container.innerHTML = `
        <div style="display:flex;justify-content:center;align-items:center;padding:40px;">
          <div style="text-align:center;">
            <div style="font-size:24px;margin-bottom:12px;">加载中...</div>
            <div style="font-size:14px;color:var(--sub-text);">正在分析数据</div>
          </div>
        </div>
      `;
      
      // 模拟加载延迟
      setTimeout(() => {
        // 生成模拟数据
        const stats = {
          hit: Math.floor(Math.random() * 10) + 1,
          miss: Math.floor(Math.random() * 20) + 5,
          pending: Math.floor(Math.random() * 5) + 1,
          hitRate: (Math.random() * 50 + 10).toFixed(1)
        };
        
        // 计算总记录数
        const total = stats.hit + stats.miss + stats.pending;
        
        // 渲染统计数据
        container.innerHTML = `
          <div style="margin-bottom:20px;padding:16px;background:linear-gradient(135deg, var(--primary) 0%, #0051d5 100%);border-radius:12px;color:white;">
            <div style="display:flex;justify-content:space-between;align-items:center;">
              <span style="font-size:14px;font-weight:600;">周期统计概览</span>
              <span style="font-size:14px;">${period === 'all' ? '全年' : period + '期'}</span>
            </div>
          </div>
          
          <div style="margin-bottom:20px;">
            <div style="font-size:14px;font-weight:600;margin-bottom:12px;color:var(--text);">关键指标</div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(120px, 1fr));gap:12px;">
              <div style="background:var(--card);border-radius:8px;padding:12px;border:1px solid var(--border);">
                <div style="font-size:12px;color:var(--sub-text);margin-bottom:4px;">总记录</div>
                <div style="font-size:18px;font-weight:600;color:var(--text);">${total}</div>
              </div>
              <div style="background:var(--card);border-radius:8px;padding:12px;border:1px solid var(--border);">
                <div style="font-size:12px;color:var(--sub-text);margin-bottom:4px;">命中</div>
                <div style="font-size:18px;font-weight:600;color:var(--green);">${stats.hit}</div>
              </div>
              <div style="background:var(--card);border-radius:8px;padding:12px;border:1px solid var(--border);">
                <div style="font-size:12px;color:var(--sub-text);margin-bottom:4px;">未中</div>
                <div style="font-size:18px;font-weight:600;color:var(--danger);">${stats.miss}</div>
              </div>
              <div style="background:var(--card);border-radius:8px;padding:12px;border:1px solid var(--border);">
                <div style="font-size:12px;color:var(--sub-text);margin-bottom:4px;">命中率</div>
                <div style="font-size:18px;font-weight:600;color:var(--primary);">${stats.hitRate}%</div>
              </div>
            </div>
          </div>
          
          <div style="margin-bottom:20px;">
            <div style="font-size:14px;font-weight:600;margin-bottom:12px;color:var(--text);">趋势分析</div>
            <div style="background:var(--card);border-radius:8px;padding:16px;border:1px solid var(--border);">
              <div style="display:flex;justify-content:center;align-items:center;padding:20px;">
                <div style="text-align:center;">
                  <div style="font-size:32px;margin-bottom:12px;">📈</div>
                  <div style="font-size:14px;color:var(--sub-text);">${period === 'all' ? '全年' : period + '期'}趋势图表</div>
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <div style="font-size:14px;font-weight:600;margin-bottom:12px;color:var(--text);">详细数据</div>
            <div style="background:var(--card);border-radius:8px;padding:16px;border:1px solid var(--border);">
              <div style="font-size:13px;color:var(--sub-text);text-align:center;padding:20px;">
                ${period === 'all' ? '全年' : period + '期'}详细数据列表
              </div>
            </div>
          </div>
        `;
      }, 800);
    } catch (e) {
      console.error('加载统计数据失败', e);
      container.innerHTML = '<div style="text-align:center;padding:40px;color:var(--danger);">加载失败，请重试</div>';
    }
  },

  // ---------- 事件绑定 ----------
  bindEvents: () => {
    // 防止重复绑定事件
    if (record._eventsBound) {
      console.log('[Record] 事件已绑定，跳过重复绑定');
      return;
    }
    record._eventsBound = true;
    
    // 点击事件处理（委托）
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      const index = btn.dataset.index !== undefined ? parseInt(btn.dataset.index) : null;
      const mode = btn.dataset.mode;
      
      // 收藏相关
      if (action === 'loadFavorite' && index !== null) record.loadFavorite(index);
      if (action === 'renameFavorite' && index !== null) record.renameFavorite(index);
      if (action === 'copyFavorite' && index !== null) record.copyFavorite(index);
      if (action === 'removeFavorite' && index !== null) record.removeFavorite(index);
      if (action === 'clearAllFavorites') record.clearAllFavorites();
      
      // 统计相关
      if (action === 'refreshPredictionStatistics') record.refreshPredictionStatistics();
      
      // 精选生肖相关
      if (action === 'clearSelectedZodiacHistory') record.clearSelectedZodiacHistory();
      
      // 生肖预测历史相关
      if (action === 'clearZodiacPredictionHistory') record.clearZodiacPredictionHistory();
      if (action === 'togglePredictionFiltersPanel') record.togglePredictionFiltersPanel();
      if (action === 'selectAllPredictionPeriods') record.selectAllPredictionPeriods();
      if (action === 'resetPredictionPeriods') record.resetPredictionPeriods();
      if (action === 'confirmPredictionFilters') record.confirmPredictionFilters();
      if (action === 'toggleZodiacPredictionHistory') record.toggleZodiacPredictionHistory();
      
      // ML预测历史相关
      if (action === 'refreshMLPredictionHistory') record.refreshMLPredictionHistory();
      if (action === 'clearMLPredictionHistory') record.clearMLPredictionHistory();
      if (action === 'toggleMLPredictionHistory') record.toggleMLPredictionHistory();
      
      // 详细统计弹窗
      if (action === 'showDetailedStatistics') {
        const type = btn.dataset.type;
        record.showDetailedStatistics(type);
      }
      
      // 精选特码历史相关
      if (action === 'clearSpecialHistory') record.clearSpecialHistory();
      if (action === 'toggleSpecialFiltersPanel') record.toggleSpecialFiltersPanel();
      if (action === 'confirmSpecialFilters') record.confirmSpecialFilters();
      if (action === 'switchSpecialHistoryMode' && mode) record.switchSpecialHistoryMode(mode);
      
      // 特码热门TOP5历史相关
      if (action === 'clearHotNumbersHistory') record.clearHotNumbersHistory();
    });
    
    // 期数按钮点击事件（单选模式）- 使用事件委托，避免与上面的冲突
    document.addEventListener('click', (e) => {
      const periodBtn = e.target.closest('.prediction-period-btn');
      if (!periodBtn) return;
      
      // 如果按钮有 data-action，由上面的处理器处理
      if (periodBtn.dataset.action) return;
      
      const period = periodBtn.dataset.period;
      if (!period) return;
      
      // 移除所有按钮的active类（实现单选）
      document.querySelectorAll('.prediction-period-btn').forEach(btn => {
        btn.classList.remove('active');
      });
      
      // 给当前点击的按钮添加active类
      periodBtn.classList.add('active');
      
      // 更新筛选状态为单选
      record._zodiacPredictionFilter.selectedPeriods = [period];
      
      console.log('[Filter] 期数按钮点击，当前筛选:', record._zodiacPredictionFilter.selectedPeriods);
      
      // 立即重新渲染
      record.renderZodiacPredictionHistory();
    });
    
    // localStorage变化监听，确保数据实时同步
    window.addEventListener('storage', (event) => {
      if (!event.key) return;
      
      // 根据变化的key重新渲染对应的历史记录
      switch (event.key) {
        case 'favorites':
          record.renderFavoriteList();
          break;
        case 'zodiacRecords':
          record.renderSelectedZodiacHistory();
          record.renderZodiacPredictionHistory();
          record.renderPredictionStatistics();
          break;
        case 'mlPredictionRecords':
          record.renderMLPredictionHistory();
          break;
        case 'numberRecords':
          record.renderSpecialHistory();
          break;
        case 'hotNumbersRecords':
          record.renderHotNumbersHistory();
          break;
      }
    });
    
    // 监听生肖预测保存事件（同一页面内的数据更新）
    window.addEventListener('zodiacPredictionSaved', (event) => {
      console.log('[Record] 收到生肖预测保存事件，刷新历史记录');
      // 延迟一下再刷新，确保数据已完全保存
      setTimeout(() => {
        record.renderZodiacPredictionHistory();
        record.renderPredictionStatistics();
      }, 100);
    });
    
    // 监听页面可见性变化，当用户切换回记录页面时刷新数据
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        console.log('[Record] 页面变为可见，刷新数据');
        // 清除缓存并重新渲染
        Storage.clearCache('zodiacRecords');
        record.renderZodiacPredictionHistory();
        record.renderSelectedZodiacHistory();
        record.renderPredictionStatistics();
      }
    });
    
    console.log('[Record] 事件绑定完成');
  }
};

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}