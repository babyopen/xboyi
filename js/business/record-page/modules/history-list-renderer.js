import { Toast } from '../../../toast.js';
import { Storage } from '../../../storage.js';

export const HistoryListRenderer = {
  createEmptyTip(message = '暂无数据') {
    return `<div class="empty-tip">${message}</div>`;
  },

  formatTimestamp(timestamp) {
    return new Date(timestamp || Date.now()).toLocaleString();
  },

  dedupeData(data, dedupeKey = null) {
    if (!data || data.length === 0) return [];
    
    const seen = new Set();
    return data.filter(item => {
      let key;
      if (dedupeKey) {
        key = item[dedupeKey];
      } else {
        key = JSON.stringify(item);
      }
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  },

  renderList(options) {
    const {
      containerId,
      data,
      emptyMessage,
      itemClassName,
      renderItemContent,
      storageKey,
      onCopy,
      onDelete,
      toggleBtnId,
      maxItemsBeforeToggle = 5,
      dedupe = false,
      dedupeKey = null
    } = options;

    const container = document.getElementById(containerId);
    if (!container) return;

    let processedData = data || [];
    
    if (dedupe) {
      processedData = this.dedupeData(processedData, dedupeKey);
    }

    if (processedData.length === 0) {
      container.innerHTML = this.createEmptyTip(emptyMessage);
      if (toggleBtnId) {
        const toggleBtn = document.getElementById(toggleBtnId);
        if (toggleBtn) toggleBtn.style.display = 'none';
      }
      return;
    }

    const fragment = document.createDocumentFragment();

    processedData.forEach((item, index) => {
      const itemDiv = document.createElement('div');
      itemDiv.className = itemClassName;
      itemDiv.setAttribute('role', 'listitem');
      itemDiv.dataset.index = index;

      itemDiv.innerHTML = `
        <div class="${itemClassName}-header">
          <div class="${itemClassName}-time">${this.formatTimestamp(item.timestamp)}</div>
          <div class="${itemClassName}-actions">
            <button class="action-btn" data-action="copy" data-index="${index}">
              <i class="icon-copy"></i> 复制
            </button>
            <button class="action-btn danger" data-action="delete" data-index="${index}">
              <i class="icon-delete"></i> 删除
            </button>
          </div>
        </div>
        <div class="${itemClassName}-content">
          ${renderItemContent(item, index)}
        </div>
      `;

      fragment.appendChild(itemDiv);
    });

    container.innerHTML = '';
    container.appendChild(fragment);

    if (toggleBtnId) {
      const toggleBtn = document.getElementById(toggleBtnId);
      if (toggleBtn) {
        toggleBtn.style.display = processedData.length > maxItemsBeforeToggle ? 'block' : 'none';
      }
    }

    this.bindEvents(container, { storageKey, onCopy, onDelete });
  },

  bindEvents(container, { storageKey, onCopy, onDelete }) {
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;

      const index = parseInt(btn.dataset.index, 10);
      const action = btn.dataset.action;

      if (action === 'copy' && typeof onCopy === 'function') {
        onCopy(index);
      } else if (action === 'delete' && typeof onDelete === 'function') {
        onDelete(index);
      }
    });
  },

  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      Toast.show('复制成功');
    } catch (e) {
      console.error('复制失败:', e);
      Toast.show('复制失败，请手动复制');
    }
  },

  deleteItem(storageKey, index, callback) {
    try {
      const data = Storage.get(storageKey, []);
      if (index < 0 || index >= data.length) return;

      data.splice(index, 1);
      Storage.set(storageKey, data);
      
      if (typeof callback === 'function') {
        callback(data);
      }
      
      Toast.show('删除成功');
    } catch (e) {
      console.error('删除失败:', e);
      Toast.show('删除失败，请重试');
    }
  }
};
