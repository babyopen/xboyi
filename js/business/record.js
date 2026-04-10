// ====================== 记录页面业务逻辑（修复 map 错误） ======================
import { Storage } from '../storage.js';
import { StateManager } from '../state-manager.js';
import { Toast } from '../toast.js';
import { Filter } from '../filter.js';
import { DataQuery } from '../data-query.js';

export const record = {
  init: () => {
    // 使用DOMContentLoaded确保DOM元素完全加载
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        record.renderAll();
        record.bindEvents();
      });
    } else {
      record.renderAll();
      record.bindEvents();
    }
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
        <div style="display:flex;gap:12px;flex-wrap:wrap;">
          <div style="flex:1;min-width:200px;background:var(--card);border-radius:12px;padding:16px;border:1px solid var(--border);">
            <div class="card-header" style="padding:0;margin-bottom:12px;">
              <h2 style="font-size:16px;">生肖预测</h2>
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
          <div style="flex:1;min-width:200px;background:var(--card);border-radius:12px;padding:16px;border:1px solid var(--border);">
            <div class="card-header" style="padding:0;margin-bottom:12px;">
              <h2 style="font-size:16px;">精选生肖</h2>
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
            <div class="history-nums">第${rec.issue || ''}期</div>
            <div class="history-tags">
              ${zodiacs.map(z => `<div class="history-tag">${escapeHtml(z)}</div>`).join('')}
            </div>
            <div class="history-time">${dateStr}</div>
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
      const records = allRecords.filter(r => !r.recordType || r.recordType !== 'selected');
      
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
          const periodInfo = rec.periodData ? Object.keys(rec.periodData)[0] : '10期数据';
          const zodiacs = Array.isArray(rec.zodiacs) ? rec.zodiacs : [];
          const item = document.createElement('div');
          item.className = 'history-item';
          item.innerHTML = `
            <div class="history-nums">第${rec.issue || ''}期 ${escapeHtml(periodInfo)}</div>
            <div class="history-tags">
              ${zodiacs.map(z => `<div class="history-tag">${escapeHtml(z)}</div>`).join('')}
            </div>
            <div class="history-time">${dateStr}</div>
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
      
      // 计算分页数据
      const { page, pageSize } = record._pagination.mlPrediction;
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedRecords = mlRecords.slice(startIndex, endIndex);
      
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
            <div class="history-nums">第${rec.issue || ''}期 ML预测</div>
            <div class="history-tags">
              ${zodiacs.map(z => `<div class="history-tag">${escapeHtml(z)}</div>`).join('')}
            </div>
            <div class="history-meta" style="font-size: 12px; color: #999; margin-top: 5px;">模型版本: ${escapeHtml(modelVersion)} | 特征: ${escapeHtml(inputFeatures)}</div>
            <div class="history-time">${dateStr}</div>
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
        toggle.style.display = endIndex < mlRecords.length ? 'block' : 'none';
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
            <div class="history-nums">第${rec.issue || ''}期 精选特码</div>
            <div class="history-tags">
              ${numbers.map(n => `<div class="history-tag">${escapeHtml(n)}</div>`).join('')}
            </div>
            <div class="history-time">${dateStr}</div>
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
            <div class="history-nums">第${rec.issue || ''}期 热门TOP5</div>
            <div class="history-tags">
              ${numbers.map(n => `<div class="history-tag">${escapeHtml(n)}</div>`).join('')}
            </div>
            <div class="history-time">${dateStr}</div>
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
    const buttons = document.querySelectorAll('.prediction-period-btn');
    buttons.forEach(btn => btn.classList.add('active'));
  },
  resetPredictionPeriods: () => {
    const buttons = document.querySelectorAll('.prediction-period-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
  },
  confirmPredictionFilters: () => {
    // 这里可以添加筛选逻辑
    const panel = document.getElementById('predictionFiltersPanel');
    if (panel) panel.classList.remove('show');
    Toast.show('筛选条件已应用');
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

  // ---------- 事件绑定 ----------
  bindEvents: () => {
    // 点击事件处理
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
      
      // 精选特码历史相关
      if (action === 'clearSpecialHistory') record.clearSpecialHistory();
      if (action === 'toggleSpecialFiltersPanel') record.toggleSpecialFiltersPanel();
      if (action === 'confirmSpecialFilters') record.confirmSpecialFilters();
      if (action === 'switchSpecialHistoryMode' && mode) record.switchSpecialHistoryMode(mode);
      
      // 特码热门TOP5历史相关
      if (action === 'clearHotNumbersHistory') record.clearHotNumbersHistory();
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
        case 'specialNumberRecords':
          record.renderSpecialHistory();
          break;
        case 'hotNumbersRecords':
          record.renderHotNumbersHistory();
          break;
      }
    });
  }
};

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}