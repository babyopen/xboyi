import { Storage } from '../../../storage.js';
import { Toast } from '../../../toast.js';
import { StateManager } from '../../../state-manager.js';

export const Favorites = {
  STORAGE_KEY: 'favorites',

  render() {
    try {
      const favorites = Storage.get(this.STORAGE_KEY, []);
      const favoriteList = document.getElementById('favoriteList');
      if (!favoriteList) return;

      if (favorites.length === 0) {
        favoriteList.innerHTML = '<div class="empty-tip">暂无收藏</div>';
        return;
      }

      const fragment = document.createDocumentFragment();

      favorites.forEach((favorite, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'filter-save-item';
        itemDiv.setAttribute('role', 'listitem');
        itemDiv.dataset.index = index;

        itemDiv.innerHTML = `
          <div class="filter-save-item-header">
            <div class="filter-save-item-name">${favorite.name}</div>
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
              <span>过滤条件: ${Object.keys(favorite.filters || {}).length} 项</span>
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
      const state = StateManager._state;
      const favorites = Storage.get(this.STORAGE_KEY, []);
      const favoriteItem = favorites[index];
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
      const favorites = Storage.get(this.STORAGE_KEY, []);
      if (index < 0 || index >= favorites.length) return;

      favorites.splice(index, 1);
      Storage.set(this.STORAGE_KEY, favorites);
      
      this.render();
      Toast.show('删除成功');
    } catch (e) {
      console.error('删除收藏失败:', e);
      Toast.show('删除失败');
    }
  }
};
