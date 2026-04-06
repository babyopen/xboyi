import { Storage } from '../../../storage.js';
import { Toast } from '../../../toast.js';
import { HistoryListRenderer } from './history-list-renderer.js';

export const SelectedZodiacHistory = {
  STORAGE_KEY: 'selectedZodiacHistory',
  _currentData: [],

  render() {
    try {
      const history = Storage.get(this.STORAGE_KEY, []);
      
      HistoryListRenderer.renderList({
        containerId: 'selectedZodiacHistoryList',
        data: history,
        emptyMessage: '暂无精选生肖历史',
        itemClassName: 'selected-zodiac-history-item',
        dedupe: true,
        renderItemContent: (item) => this.renderItemContent(item),
        onCopy: (index) => this.copyItem(index),
        onDelete: (index) => this.deleteItem(index)
      });
      
      this._currentData = HistoryListRenderer.dedupeData(history);
    } catch (e) {
      console.error('渲染精选生肖历史失败:', e);
    }
  },

  renderItemContent(item) {
    const zodiacs = item.zodiacs || [];
    const zodiacsHtml = zodiacs.map(zodiac => {
      return `<span class="zodiac-tag">${zodiac}</span>`;
    }).join(' ') || '无数据';

    return `
      <div class="zodiac-tags">${zodiacsHtml}</div>
      ${item.note ? `<div class="zodiac-note">备注: ${item.note}</div>` : ''}
    `;
  },

  copyItem(index) {
    try {
      const item = this._currentData[index];
      if (!item) return;

      const text = (item.zodiacs || []).join(' ');
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
