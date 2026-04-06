import { Storage } from '../../../storage.js';
import { Toast } from '../../../toast.js';
import { HistoryListRenderer } from './history-list-renderer.js';

export const SpecialHistory = {
  STORAGE_KEY: 'specialHistory',
  _currentData: [],

  render() {
    try {
      const history = Storage.get(this.STORAGE_KEY, []);
      
      HistoryListRenderer.renderList({
        containerId: 'specialHistoryList',
        data: history,
        emptyMessage: '暂无精选特码历史',
        itemClassName: 'special-history-item',
        dedupe: true,
        renderItemContent: (item) => this.renderItemContent(item),
        onCopy: (index) => this.copyItem(index),
        onDelete: (index) => this.deleteItem(index)
      });
      
      this._currentData = HistoryListRenderer.dedupeData(history);
    } catch (e) {
      console.error('渲染精选特码历史失败:', e);
    }
  },

  renderItemContent(item) {
    const special = item.special || [];
    const specialHtml = special.map(num => {
      const numStr = String(num).padStart(2, '0');
      return `<span class="special-number">${numStr}</span>`;
    }).join(' ') || '无数据';

    return `
      <div class="special-numbers">${specialHtml}</div>
      ${item.note ? `<div class="special-note">备注: ${item.note}</div>` : ''}
    `;
  },

  copyItem(index) {
    try {
      const item = this._currentData[index];
      if (!item) return;

      const text = (item.special || []).map(num => String(num).padStart(2, '0')).join(' ');
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
