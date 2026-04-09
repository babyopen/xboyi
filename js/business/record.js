// ====================== 记录页面业务逻辑（修复 map 错误） ======================
import { Storage } from '../storage.js';
import { StateManager } from '../state-manager.js';
import { Toast } from '../toast.js';
import { Filter } from '../filter.js';
import { DataQuery } from '../data-query.js';

export const record = {
  init: () => {
    record.renderFavoriteList();
    record.renderPredictionStats();
    record.renderLatestSelectedZodiac();
    record.renderZodiacPredictionHistory();
    record.bindEvents();
  },

  // ---------- 我的收藏 ----------
  renderFavoriteList: () => {
    const container = document.getElementById('favoriteList');
    if (!container) return;
    const favorites = Storage.get('favorites', []);
    if (!favorites.length) {
      container.innerHTML = '<div class="empty-tip">暂无收藏方案</div>';
      return;
    }
    const fragment = document.createDocumentFragment();
    favorites.forEach((item, idx) => {
      const filtered = Filter.getFilteredList(item.selected, item.excluded);
      const previewNums = filtered.slice(0, 4);
      const card = document.createElement('div');
      card.className = 'favorite-card';
      card.innerHTML = `
        <div class="fav-header"><span class="fav-name">${escapeHtml(item.name)}</span></div>
        <div class="fav-numbers">
          ${previewNums.map(num => {
            const attrs = DataQuery.getNumAttrs(num.num);
            return `<div class="num-ball-mini ${attrs.color}色">${num.s}<span class="num-zodiac">${attrs.zodiac}</span></div>`;
          }).join('')}
          ${filtered.length > 4 ? '<div class="more-indicator">+更多</div>' : ''}
        </div>
        <div class="fav-actions">
          <button class="fav-btn" data-action="loadFavorite" data-index="${idx}">加载</button>
          <button class="fav-btn" data-action="renameFavorite" data-index="${idx}">重命名</button>
          <button class="fav-btn" data-action="copyFavorite" data-index="${idx}">复制</button>
          <button class="fav-btn fav-remove" data-action="removeFavorite" data-index="${idx}">移除</button>
        </div>
      `;
      fragment.appendChild(card);
    });
    container.innerHTML = '';
    container.appendChild(fragment);
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
  renderPredictionStats: () => {
    const container = document.getElementById('predictionStatsContainer');
    if (!container) return;
    const zodiacStats = record._getCategoryStats('zodiac');
    const selectedZodiacStats = record._getCategoryStats('selectedZodiac');
    const totalPredictions = zodiacStats.total + selectedZodiacStats.total;
    const totalHits = zodiacStats.hit + selectedZodiacStats.hit;
    const totalMiss = zodiacStats.miss + selectedZodiacStats.miss;
    const totalPending = zodiacStats.pending + selectedZodiacStats.pending;
    const hitRate = totalHits + totalMiss > 0 ? ((totalHits / (totalHits + totalMiss)) * 100).toFixed(1) : '0.0';
    container.innerHTML = `
      <div class="stats-summary">
        <div class="stat-item"><span class="stat-label">总预测数</span><span class="stat-value">${totalPredictions}</span></div>
        <div class="stat-item"><span class="stat-label">命中数</span><span class="stat-value">${totalHits}</span></div>
        <div class="stat-item"><span class="stat-label">命中率</span><span class="stat-value">${hitRate}%</span></div>
        <div class="stat-item"><span class="stat-label">待开奖</span><span class="stat-value">${totalPending}</span></div>
      </div>
      <div class="stats-categories">
        <div class="cat-card"><div class="cat-title">生肖预测</div><div class="cat-detail">命中 ${zodiacStats.hit} | 未中 ${zodiacStats.miss} | 待开奖 ${zodiacStats.pending}</div><div class="cat-rate">命中率 ${zodiacStats.hitRate}%</div></div>
        <div class="cat-card"><div class="cat-title">精选生肖</div><div class="cat-detail">命中 ${selectedZodiacStats.hit} | 未中 ${selectedZodiacStats.miss} | 待开奖 ${selectedZodiacStats.pending}</div><div class="cat-rate">命中率 ${selectedZodiacStats.hitRate}%</div></div>
      </div>
    `;
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
  refreshPredictionStats: () => { record.renderPredictionStats(); Toast.show('统计已刷新'); },

  // ---------- 精选生肖卡片 ----------
  renderLatestSelectedZodiac: () => {
    const container = document.getElementById('latestSelectedZodiac');
    if (!container) return;
    const allRecords = Storage.get('zodiacRecords', []);
    const records = allRecords.filter(r => r.recordType === 'selected');
    if (!records.length) { container.innerHTML = '<div class="empty-tip">暂无精选生肖记录</div>'; return; }
    const latest = records[0];
    const dateStr = latest.createdAt ? new Date(latest.createdAt).toLocaleString('zh-CN', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' }) : '';
    const zodiacs = Array.isArray(latest.zodiacs) ? latest.zodiacs : [];
    container.innerHTML = `
      <div class="selected-zodiac-item-card">
        <div class="selected-header"><span class="selected-issue">第${latest.issue || ''}期</span><span class="selected-date">${dateStr}</span><button class="clear-selected-btn" data-action="clearSelectedZodiac">清空</button></div>
        <div class="selected-zodiacs-list">${zodiacs.map(z => `<span class="zodiac-tag">${escapeHtml(z)}</span>`).join('')}</div>
      </div>
    `;
  },
  clearSelectedZodiacHistory: () => {
    if (confirm('确定清空所有精选生肖记录吗？')) {
      const allRecords = Storage.get('zodiacRecords', []);
      const filtered = allRecords.filter(r => r.recordType !== 'selected');
      Storage.set('zodiacRecords', filtered);
      record.renderLatestSelectedZodiac();
      record.renderPredictionStats();
      Toast.show('已清空精选生肖记录');
    }
  },

  // ---------- 生肖预测历史 ----------
  renderZodiacPredictionHistory: () => {
    const container = document.getElementById('zodiacPredictionHistoryList');
    if (!container) return;
    const allRecords = Storage.get('zodiacRecords', []);
    const records = allRecords.filter(r => !r.recordType || r.recordType !== 'selected');
    if (!records.length) { container.innerHTML = '<div class="empty-tip">暂无生肖预测历史</div>'; return; }
    const fragment = document.createDocumentFragment();
    records.forEach((rec, idx) => {
      const dateStr = rec.createdAt ? new Date(rec.createdAt).toLocaleString('zh-CN', { month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' }) : '';
      const periodInfo = rec.periodData ? Object.keys(rec.periodData)[0] : '10期数据';
      const zodiacs = Array.isArray(rec.zodiacs) ? rec.zodiacs : [];
      const item = document.createElement('div');
      item.className = 'prediction-history-item';
      item.innerHTML = `
        <div class="history-checkbox"><input type="checkbox" class="history-select" data-idx="${idx}"></div>
        <div class="history-content">
          <div class="history-header"><span class="history-issue">第${rec.issue || ''}期</span><span class="history-period">${escapeHtml(periodInfo)}</span><span class="history-date">${dateStr}</span></div>
          <div class="history-zodiacs">${zodiacs.map(z => `<span class="zodiac-tag small">${escapeHtml(z)}</span>`).join('')}</div>
        </div>
      `;
      fragment.appendChild(item);
    });
    container.innerHTML = '';
    container.appendChild(fragment);
  },
  getSelectedHistoryRecords: () => {
    const checkboxes = document.querySelectorAll('#zodiacPredictionHistoryList .history-select:checked');
    if (!checkboxes.length) { Toast.show('请先勾选记录'); return; }
    const selectedIndices = Array.from(checkboxes).map(cb => parseInt(cb.dataset.idx));
    const records = Storage.get('zodiacRecords', []);
    const text = selectedIndices.map(i => records[i]?.issue).filter(Boolean).join(',');
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(() => Toast.show('已复制选中期号'));
    else alert('选中期号：' + text);
  },
  clearAllPredictionHistory: () => {
    if (confirm('确定清空所有生肖预测历史吗？')) {
      Storage.set('zodiacRecords', []);
      record.renderZodiacPredictionHistory();
      record.renderPredictionStats();
      Toast.show('已清空生肖预测历史');
    }
  },

  // ---------- 兼容 prediction.js 和 data-fetch.js 调用的方法 ----------
  saveZodiacRecord: (recordData) => {
    return Storage.saveZodiacRecord(recordData);
  },
  checkZodiacRecord: (issue, actualZodiac) => {
    const result = Storage.checkZodiacRecord(issue, actualZodiac);
    if (result.success) {
      record.renderZodiacPredictionHistory();
      record.renderLatestSelectedZodiac();
      record.renderPredictionStats();
    }
    return result;
  },
  saveNumberRecord: (recordData) => {
    return Storage.saveNumberRecord(recordData);
  },
  checkNumberRecord: (issue, actualNumbers) => {
    const result = Storage.checkNumberRecord(issue, actualNumbers);
    if (result.success) {
      // 如果有号码记录列表需要刷新，可在此调用相应渲染函数
    }
    return result;
  },
  loadZodiacRecords: () => {
    record.renderZodiacPredictionHistory();
    record.renderLatestSelectedZodiac();
    record.renderPredictionStats();
  },

  // ---------- 事件绑定 ----------
  bindEvents: () => {
    document.getElementById('clearAllFavoritesBtn')?.addEventListener('click', () => record.clearAllFavorites());
    document.getElementById('refreshStatsBtn')?.addEventListener('click', () => record.refreshPredictionStats());
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const action = btn.dataset.action;
      const index = btn.dataset.index !== undefined ? parseInt(btn.dataset.index) : null;
      if (action === 'loadFavorite' && index !== null) record.loadFavorite(index);
      if (action === 'renameFavorite' && index !== null) record.renameFavorite(index);
      if (action === 'copyFavorite' && index !== null) record.copyFavorite(index);
      if (action === 'removeFavorite' && index !== null) record.removeFavorite(index);
      if (action === 'clearSelectedZodiac') record.clearSelectedZodiacHistory();
      if (action === 'selectHistory') record.getSelectedHistoryRecords();
      if (action === 'clearHistory') record.clearAllPredictionHistory();
    });
  }
};

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}