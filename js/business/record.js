import { StateManager } from '../state-manager.js';
import { Toast } from '../toast.js';
import { Storage } from '../storage.js';
import { HistoryListRenderer } from './record-page/modules/history-list-renderer.js';
import { ZodiacHistory } from './record-page/modules/zodiac-history.js';
import { SpecialHistory } from './record-page/modules/special-history.js';
import { SelectedZodiacHistory } from './record-page/modules/selected-zodiac-history.js';
import { MLPredictionHistory } from './record-page/modules/ml-prediction-history.js';
import { HotNumbersHistory } from './record-page/modules/hot-numbers-history.js';
import { Favorites } from './record-page/modules/favorites.js';
import { PredictionStatistics } from './record-page/modules/prediction-statistics.js';
import { ExportImport } from './record-page/modules/export-import.js';

export const record = {
  initRecordPage() {
    try {
      const recordPage = document.getElementById('recordPage');
      if (!recordPage) return;

      console.log('记录页面初始化完成');
    } catch (e) {
      console.error('初始化记录页面失败:', e);
      Toast.show('页面初始化失败，请刷新重试');
    }
  },

  renderFavorites() {
    Favorites.render();
  },

  renderPredictionStatistics() {
    PredictionStatistics.render();
  },

  renderAllRecords() {
    try {
      record.renderFavorites();
      record.renderPredictionStatistics();
      record.renderZodiacPredictionHistory();
      record.renderSpecialHistory();
      record.renderSelectedZodiacHistory();
      record.renderMLPredictionHistory();
      record.renderHotNumbersHistory();
    } catch (e) {
      console.error('渲染记录失败:', e);
      Toast.show('渲染记录失败，请刷新重试');
    }
  },

  renderZodiacPredictionHistory() {
    ZodiacHistory.render();
  },

  renderSpecialHistory() {
    SpecialHistory.render();
  },

  renderSelectedZodiacHistory() {
    SelectedZodiacHistory.render();
  },

  renderMLPredictionHistory() {
    MLPredictionHistory.render();
  },

  renderHotNumbersHistory() {
    HotNumbersHistory.render();
  },

  clearAllRecords() {
    ExportImport.clearAllRecords(() => {
      record.renderAllRecords();
    });
  },

  exportRecords() {
    ExportImport.exportRecords();
  },

  importRecords() {
    ExportImport.importRecords(() => {
      record.renderAllRecords();
    });
  },

  copyZodiacPredictionHistory(index) {
    ZodiacHistory.copyItem(index);
  },

  deleteZodiacPredictionHistoryItem(index) {
    ZodiacHistory.deleteItem(index);
  },

  copySpecialHistory(index) {
    SpecialHistory.copyItem(index);
  },

  deleteSpecialHistoryItem(index) {
    SpecialHistory.deleteItem(index);
  },

  copySelectedZodiacHistoryItem(index) {
    SelectedZodiacHistory.copyItem(index);
  },

  deleteSelectedZodiacHistoryItem(index) {
    SelectedZodiacHistory.deleteItem(index);
  },

  copyMLPredictionHistory(index) {
    MLPredictionHistory.copyItem(index);
  },

  deleteMLPredictionHistoryItem(index) {
    MLPredictionHistory.deleteItem(index);
  },

  copyHotNumbersHistory(index) {
    HotNumbersHistory.copyItem(index);
  },

  deleteHotNumbersHistoryItem(index) {
    HotNumbersHistory.deleteItem(index);
  },

  loadFavorite(index) {
    Favorites.loadFavorite(index);
  },

  deleteFavorite(index) {
    Favorites.deleteFavorite(index);
  }
};
