import { Storage } from '../../../storage.js';
import { Toast } from '../../../toast.js';
import { HistoryListRenderer } from './history-list-renderer.js';

export const HotNumbersHistory = {
  STORAGE_KEY: 'hotNumbersHistory',
  _currentData: [],

  render() {
    try {
      const history = Storage.get(this.STORAGE_KEY, []);
      
      HistoryListRenderer.renderList({
        containerId: 'hotNumbersHistoryList',
        data: history,
        emptyMessage: '暂无热门特码历史',
        itemClassName: 'hot-numbers-history-item',
        dedupe: true,
        renderItemContent: (item) => this.renderItemContent(item),
        onCopy: (index) => this.copyItem(index),
        onDelete: (index) => this.deleteItem(index)
      });
      
      this._currentData = HistoryListRenderer.dedupeData(history);
    } catch (e) {
      console.error('渲染热门特码历史失败:', e);
    }
  },

  renderItemContent(item) {
    const hotNumbers = item.hotNumbers || [];
    const hotNumbersHtml = hotNumbers.map((num, rank) => {
      const numStr = String(num).padStart(2, '0');
      return `<span class="hot-number rank-${rank + 1}">${numStr}</span>`;
    }).join(' ') || '无数据';

    return `
      <div class="hot-numbers">${hotNumbersHtml}</div>
      <div class="hot-numbers-info">
        <span>分析期数: ${item.analyzeLimit || '未知'}</span>
      </div>
    `;
  },

  copyItem(index) {
    try {
      const item = this._currentData[index];
      if (!item) return;

      const text = (item.hotNumbers || []).map(num => String(num).padStart(2, '0')).join(' ');
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
