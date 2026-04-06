import { Storage } from '../../../storage.js';
import { Toast } from '../../../toast.js';
import { StateManager } from '../../../state-manager.js';

export const Favorites = {
  STORAGE_KEY: 'savedFilters',
  _currentData: [],

  validateIssueNumber(issueNumber) {
    if (!issueNumber) return false;
    const issueStr = String(issueNumber);
    return /^\d{6}$/.test(issueStr);
  },

  formatIssueNumber(issueNumber) {
    if (!issueNumber) return null;
    const issueStr = String(issueNumber).padStart(6, '0');
    if (!this.validateIssueNumber(issueStr)) return null;
    return issueStr;
  },

  dedupeByIssueNumber(favorites) {
    const seen = new Map();
    
    favorites.forEach(favorite => {
      const issueNumber = favorite.issueNumber;
      if (issueNumber && this.validateIssueNumber(issueNumber)) {
        const existing = seen.get(issueNumber);
        if (!existing || (favorite.timestamp > existing.timestamp)) {
          seen.set(issueNumber, favorite);
        }
      } else {
        const key = JSON.stringify(favorite);
        seen.set(key, favorite);
      }
    });

    return Array.from(seen.values()).sort((a, b) => {
      return (b.timestamp || 0) - (a.timestamp || 0);
    });
  },

  render() {
    try {
      const favorites = Storage.get(this.STORAGE_KEY, []);
      const dedupedFavorites = this.dedupeByIssueNumber(favorites);
      this._currentData = dedupedFavorites;
      
      const favoriteList = document.getElementById('favoriteList');
      if (!favoriteList) return;

      if (dedupedFavorites.length === 0) {
        favoriteList.innerHTML = '<div class="empty-tip">暂无收藏</div>';
        return;
      }

      const fragment = document.createDocumentFragment();

      dedupedFavorites.forEach((favorite, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'filter-save-item';
        itemDiv.setAttribute('role', 'listitem');
        itemDiv.dataset.index = index;

        let titleHtml = '';
        if (favorite.issueNumber && this.validateIssueNumber(favorite.issueNumber)) {
          titleHtml = `
            <div class="favorite-title-group">
              <div class="favorite-primary-title">第${favorite.issueNumber}期</div>
              <div class="favorite-subtitle">收藏时间</div>
            </div>
          `;
        } else {
          titleHtml = `
            <div class="favorite-title-group">
              <div class="favorite-primary-title">${favorite.name}</div>
              <div class="favorite-subtitle">收藏时间</div>
            </div>
          `;
        }

        itemDiv.innerHTML = `
          <div class="filter-save-item-header">
            ${titleHtml}
            <div class="filter-save-item-actions">
              <button class="action-btn" data-action="load" data-index="${index}">
                <i class="icon-load"></i> 加载
              </button>
              <button class="action-btn danger" data-action="delete" data-index="${index}">
                <i class="icon-delete"></i> 删除
              </button>
            </div>
          </div>
          <div class="filter-save-item-content">
            <div class="filter-save-item-info">
              <span>保存时间: ${new Date(favorite.timestamp).toLocaleString()}</span>
              <span>过滤条件: ${Object.keys(favorite.selected || {}).length} 项</span>
            </div>
          </div>
        `;

        fragment.appendChild(itemDiv);
      });

      favoriteList.innerHTML = '';
      favoriteList.appendChild(fragment);

      this.bindEvents(favoriteList);
    } catch (e) {
      console.error('渲染收藏失败:', e);
    }
  },

  bindEvents(container) {
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;

      const index = parseInt(btn.dataset.index, 10);
      const action = btn.dataset.action;

      if (action === 'load') {
        this.loadFavorite(index);
      } else if (action === 'delete') {
        this.deleteFavorite(index);
      }
    });
  },

  loadFavorite(index) {
    try {
      const favoriteItem = this._currentData[index];
      if (!favoriteItem) return;

      StateManager.setState({
        selected: favoriteItem.selected,
        excluded: favoriteItem.excluded
      });
      
      Toast.show('加载成功');
    } catch (e) {
      console.error('加载收藏失败:', e);
      Toast.show('加载失败');
    }
  },

  deleteFavorite(index) {
    try {
      const itemToDelete = this._currentData[index];
      if (!itemToDelete) return;

      const allFavorites = Storage.get(this.STORAGE_KEY, []);
      
      let filteredFavorites;
      if (itemToDelete.issueNumber && this.validateIssueNumber(itemToDelete.issueNumber)) {
        filteredFavorites = allFavorites.filter(item => {
          return item.issueNumber !== itemToDelete.issueNumber;
        });
      } else {
        const itemKey = JSON.stringify(itemToDelete);
        filteredFavorites = allFavorites.filter(item => JSON.stringify(item) !== itemKey);
      }
      
      Storage.set(this.STORAGE_KEY, filteredFavorites);
      this.render();
      Toast.show('删除成功');
    } catch (e) {
      console.error('删除收藏失败:', e);
      Toast.show('删除失败');
    }
  }
};
