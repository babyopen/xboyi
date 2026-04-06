import { Storage } from '../../../storage.js';
import { StateManager } from '../../../state-manager.js';
import { Toast } from '../../../toast.js';
import { HistoryListRenderer } from './history-list-renderer.js';

export const ZodiacHistory = {
  STORAGE_KEY: 'zodiacPredictionHistory',
  _currentData: [],

  render() {
    try {
      const history = Storage.get(this.STORAGE_KEY, []);
      
      HistoryListRenderer.renderList({
        containerId: 'zodiacPredictionHistoryList',
        data: history,
        emptyMessage: '暂无预测历史',
        itemClassName: 'prediction-history-item',
        toggleBtnId: 'zodiacPredictionHistoryToggle',
        dedupe: true,
        renderItemContent: (item) => this.renderItemContent(item),
        onCopy: (index) => this.copyItem(index),
        onDelete: (index) => this.deleteItem(index)
      });
      
      this._currentData = HistoryListRenderer.dedupeData(history);
    } catch (e) {
      console.error('渲染生肖预测历史失败:', e);
    }
  },

  renderItemContent(item) {
    const sortedZodiacs = item.sortedZodiacs || [];
    const topZodiacs = sortedZodiacs.slice(0, 3)
      .map(z => `${z.name || ''}(${z.count || 0})`)
      .join(', ') || '无数据';
    const analyzeLimit = item.analyzeLimit || '未知';

    return `
      <div class="prediction-history-top">
        <span>前3热生肖: ${topZodiacs}</span>
        <span>分析期数: ${analyzeLimit}</span>
      </div>
    `;
  },

  copyItem(index) {
    try {
      const item = this._currentData[index];
      if (!item) return;

      const sortedZodiacs = item.sortedZodiacs || [];
      const text = sortedZodiacs.map(z => `${z.name || ''}(${z.count || 0})`).join(', ');
      
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
