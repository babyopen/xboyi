import { Storage } from '../../../storage.js';
import { Toast } from '../../../toast.js';
import { HistoryListRenderer } from './history-list-renderer.js';

export const MLPredictionHistory = {
  STORAGE_KEY: 'mlPredictionHistory',
  _currentData: [],

  render() {
    try {
      const history = Storage.get(this.STORAGE_KEY, []);
      
      HistoryListRenderer.renderList({
        containerId: 'mlPredictionHistoryList',
        data: history,
        emptyMessage: '暂无ML预测历史',
        itemClassName: 'ml-prediction-history-item',
        toggleBtnId: 'mlPredictionHistoryToggle',
        dedupe: true,
        renderItemContent: (item) => this.renderItemContent(item),
        onCopy: (index) => this.copyItem(index),
        onDelete: (index) => this.deleteItem(index)
      });
      
      this._currentData = HistoryListRenderer.dedupeData(history);
    } catch (e) {
      console.error('渲染ML预测历史失败:', e);
    }
  },

  renderItemContent(item) {
    const prediction = item.prediction || [];
    const predictionHtml = prediction.map(num => {
      const numStr = String(num).padStart(2, '0');
      return `<span class="prediction-number">${numStr}</span>`;
    }).join(' ') || '无数据';

    return `
      <div class="prediction-numbers">${predictionHtml}</div>
      <div class="ml-prediction-info">
        <span>模型: ${item.model || '默认'}</span>
        <span>准确率: ${item.accuracy || 'N/A'}</span>
      </div>
    `;
  },

  copyItem(index) {
    try {
      const item = this._currentData[index];
      if (!item) return;

      const text = (item.prediction || []).map(num => String(num).padStart(2, '0')).join(' ');
      HistoryListRenderer.copyToClipboard(text);
    } catch (e) {
      console.error('复制失败:', e);
    }
  },

  deleteItem(index) {
    try {
      const itemToDelete = this._currentData[index];
      if (!itemToDelete) return;

      const allData = Storage.get(this.STORAGE_KEY, []);
      const itemKey = JSON.stringify(itemToDelete);
      const filteredData = allData.filter(item => JSON.stringify(item) !== itemKey);
      
      Storage.set(this.STORAGE_KEY, filteredData);
      this.render();
      
      Toast.show('删除成功');
    } catch (e) {
      console.error('删除失败:', e);
      Toast.show('删除失败，请重试');
    }
  }
};
