// ====================== 4. 存储模块（统一管理本地存储，加校验和兜底）======================
/**
 * 本地存储管理器
 * @namespace Storage
 */

// 导入必要的模块
import { CONFIG } from './config.js';
import { Utils } from './utils.js';
import { StateManager } from './state-manager.js';
import { Toast } from './toast.js';

export const Storage = {
  /**
   * 存储key常量
   * @readonly
   * @enum {string}
   */
  KEYS: Object.freeze({
    SAVED_FILTERS: 'savedFilters',
    DATA_VERSION: 'dataVersion',
    HISTORY_CACHE: 'historyCache',
    HISTORY_CACHE_TIME: 'historyCacheTime',
    SPECIAL_HISTORY: 'specialHistory',
    SELECTED_ZODIAC_HISTORY: 'selectedZodiacHistory',
    HOT_NUMBERS_HISTORY: 'hotNumbersHistory',
    ZODIAC_PREDICTION_HISTORY: 'zodiacPredictionHistory',
    PREDICTION_HISTORY_FILTER: 'predictionHistoryFilter',
    ML_PREDICTION_HISTORY: 'mlPredictionHistory'
  }),

  /**
   * 缓存有效期（毫秒）- 1小时
   * @readonly
   */
  CACHE_DURATION: 60 * 60 * 1000,

  /**
   * 精选特码历史缓存有效期（毫秒）- 30天
   * @readonly
   */
  SPECIAL_HISTORY_DURATION: 30 * 24 * 60 * 60 * 1000,

  /**
   * 精选特码历史最大记录数
   * @readonly
   */
  SPECIAL_HISTORY_MAX_COUNT: 350,

  /**
   * 精选生肖历史缓存有效期（毫秒）- 30天
   * @readonly
   */
  SELECTED_ZODIAC_HISTORY_DURATION: 30 * 24 * 60 * 60 * 1000,

  /**
   * 精选生肖历史最大记录数
   * @readonly
   */
  SELECTED_ZODIAC_HISTORY_MAX_COUNT: 350,

  /**
   * 特码热门top5历史缓存有效期（毫秒）- 30天
   * @readonly
   */
  HOT_NUMBERS_HISTORY_DURATION: 30 * 24 * 60 * 60 * 1000,

  /**
   * 特码热门top5历史最大记录数
   * @readonly
   */
  HOT_NUMBERS_HISTORY_MAX_COUNT: 350,

  /**
   * 预测历史最大记录数
   * @readonly
   */
  PREDICTION_HISTORY_MAX_COUNT: 100,

  /**
   * 预测状态枚举
   * @readonly
   */
  PREDICTION_STATUS: Object.freeze({
    PENDING: 'pending',
    HIT: 'hit',
    MISS: 'miss',
    PARTIAL: 'partial'
  }),

  /**
   * 内存兜底存储（隐私模式下localStorage不可用时使用）
   * @private
   */
  _memoryStorage: {},

  /**
   * 内存缓存（减少localStorage访问次数）
   * @private
   */
  _memoryCache: {},

  /**
   * 内存缓存有效期（毫秒）- 5分钟
   * @readonly
   */
  MEMORY_CACHE_DURATION: 5 * 60 * 1000,

  /**
   * 检测localStorage是否可用
   * @returns {boolean} 是否可用
   */
  isLocalStorageAvailable: () => {
    try {
      const testKey = '__test__';
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
      return true;
    } catch(e) {
      return false;
    }
  },

  /**
   * 获取存储数据
   * @param {string} key - 存储key
   * @param {any} defaultValue - 默认值
   * @returns {any} 存储的值
   */
  get: (key, defaultValue = null) => {
    try {
      // 检查内存缓存
      const cached = Storage._memoryCache[key];
      if (cached) {
        const now = Date.now();
        if (now - cached.timestamp < Storage.MEMORY_CACHE_DURATION) {
          return cached.value;
        }
        // 缓存过期，删除
        delete Storage._memoryCache[key];
      }

      let value;
      if(Storage.isLocalStorageAvailable()){
        const storedValue = localStorage.getItem(key);
        value = storedValue ? JSON.parse(storedValue) : defaultValue;
      } else {
        value = Storage._memoryStorage[key] || defaultValue;
      }

      // 更新内存缓存
      Storage._memoryCache[key] = {
        value: value,
        timestamp: Date.now()
      };

      return value;
    } catch(e) {
      console.error('存储读取失败', e);
      return defaultValue;
    }
  },

  /**
   * 写入存储数据
   * @param {string} key - 存储key
   * @param {any} value - 要存储的值
   * @returns {boolean} 是否成功
   */
  set: (key, value) => {
    try {
      const serialized = JSON.stringify(value);
      if(Storage.isLocalStorageAvailable()){
        localStorage.setItem(key, serialized);
      } else {
        Storage._memoryStorage[key] = value;
      }

      // 更新内存缓存
      Storage._memoryCache[key] = {
        value: value,
        timestamp: Date.now()
      };

      return true;
    } catch(e) {
      console.error('存储写入失败', e);
      Toast.show('保存失败，存储空间可能已满');
      return false;
    }
  },

  /**
   * 移除存储数据
   * @param {string} key - 存储key
   * @returns {boolean} 是否成功
   */
  remove: (key) => {
    try {
      if(Storage.isLocalStorageAvailable()){
        localStorage.removeItem(key);
      } else {
        delete Storage._memoryStorage[key];
      }

      // 从内存缓存中删除
      delete Storage._memoryCache[key];

      return true;
    } catch(e) {
      console.error('存储移除失败', e);
      return false;
    }
  },

  /**
   * 加载并校验保存的方案
   * @returns {Array} 合法的方案列表
   */
  loadSavedFilters: () => {
    // 数据版本校验
    const savedVersion = Storage.get(Storage.KEYS.DATA_VERSION, 0);
    if(savedVersion < CONFIG.DATA_VERSION){
      // 后续可添加数据迁移逻辑
      Storage.set(Storage.KEYS.DATA_VERSION, CONFIG.DATA_VERSION);
    }

    const rawList = Storage.get(Storage.KEYS.SAVED_FILTERS, []);
    const validList = Array.isArray(rawList) ? rawList.filter(Utils.validateFilterItem) : [];
    StateManager.setState({ savedFilters: validList }, false);
    return validList;
  },

  /**
   * 保存方案到本地
   * @param {Object} filterItem - 方案对象
   * @returns {boolean} 是否成功
   */
  saveFilter: (filterItem) => {
    const state = StateManager._state;
    const newList = [filterItem, ...state.savedFilters];
    const success = Storage.set(Storage.KEYS.SAVED_FILTERS, newList);
    if(success) StateManager.setState({ savedFilters: newList });
    return success;
  },

  /**
   * 加载收藏的方案
   * @returns {Array} 收藏的方案列表
   */
  loadFavorites: () => {
    const rawList = Storage.get('favorites', []);
    const validList = Array.isArray(rawList) ? rawList.filter(Utils.validateFilterItem) : [];
    StateManager.setState({ favorites: validList }, false);
    return validList;
  },

  /**
   * 保存历史数据到缓存
   * @param {Array} historyData - 历史数据
   */
  saveHistoryCache: (historyData) => {
    Storage.set(Storage.KEYS.HISTORY_CACHE, historyData);
    Storage.set(Storage.KEYS.HISTORY_CACHE_TIME, Date.now());
  },

  /**
   * 加载缓存的历史数据
   * @returns {Object|null} 缓存的数据和是否过期
   */
  loadHistoryCache: () => {
    const cacheTime = Storage.get(Storage.KEYS.HISTORY_CACHE_TIME, 0);
    const now = Date.now();
    
    // 检查缓存是否过期
    if(now - cacheTime > Storage.CACHE_DURATION) {
      return { data: null, expired: true };
    }
    
    const historyData = Storage.get(Storage.KEYS.HISTORY_CACHE, []);
    return { data: historyData, expired: false };
  },

  /**
   * 清除历史数据缓存
   */
  clearHistoryCache: () => {
    Storage.remove(Storage.KEYS.HISTORY_CACHE);
    Storage.remove(Storage.KEYS.HISTORY_CACHE_TIME);
  },

  /**
   * 保存精选特码历史
   * @param {Array} history - 精选特码历史记录
   */
  saveSpecialHistory: (history) => {
    Storage.set(Storage.KEYS.SPECIAL_HISTORY, history);
  },

  /**
   * 加载精选特码历史缓存
   * @returns {Array} 过滤后的历史记录（只保留30天内的）
   */
  loadSpecialHistory: () => {
    const data = Storage.get(Storage.KEYS.SPECIAL_HISTORY, null);
    if(!data || !Array.isArray(data)) {
      return [];
    }

    const now = Date.now();
    const thirtyDaysAgo = now - Storage.SPECIAL_HISTORY_DURATION;

    // 过滤掉超过30天的记录
    const filteredHistory = data.filter(item => {
      const itemTime = item.timestamp || now;
      return itemTime >= thirtyDaysAgo;
    });

    // 如果有过期的记录被过滤掉，更新缓存
    if(filteredHistory.length < data.length) {
      Storage.saveSpecialHistory(filteredHistory);
    }

    return filteredHistory;
  },

  /**
   * 清除精选特码历史缓存
   */
  clearSpecialHistory: () => {
    Storage.remove(Storage.KEYS.SPECIAL_HISTORY);
  },

  /**
   * 保存精选生肖历史
   * @param {Array} history - 精选生肖历史记录
   */
  saveSelectedZodiacHistory: (history) => {
    Storage.set(Storage.KEYS.SELECTED_ZODIAC_HISTORY, history);
  },

  /**
   * 加载精选生肖历史缓存
   * @returns {Array} 过滤后的历史记录（只保留30天内的）
   */
  loadSelectedZodiacHistory: () => {
    const data = Storage.get(Storage.KEYS.SELECTED_ZODIAC_HISTORY, null);
    if(!data || !Array.isArray(data)) {
      return [];
    }

    const now = Date.now();
    const thirtyDaysAgo = now - Storage.SELECTED_ZODIAC_HISTORY_DURATION;

    // 过滤掉超过30天的记录
    const filteredHistory = data.filter(item => {
      const itemTime = item.timestamp || now;
      return itemTime >= thirtyDaysAgo;
    });

    // 如果有过期的记录被过滤掉，更新缓存
    if(filteredHistory.length < data.length) {
      Storage.saveSelectedZodiacHistory(filteredHistory);
    }

    return filteredHistory;
  },

  /**
   * 清除精选生肖历史缓存
   */
  clearSelectedZodiacHistory: () => {
    Storage.remove(Storage.KEYS.SELECTED_ZODIAC_HISTORY);
  },

  /**
   * 保存特码热门top5历史
   * @param {Array} history - 特码热门top5历史记录
   */
  saveHotNumbersHistory: (history) => {
    Storage.set(Storage.KEYS.HOT_NUMBERS_HISTORY, history);
  },

  /**
   * 加载特码热门top5历史缓存
   * @returns {Array} 过滤后的历史记录（只保留30天内的）
   */
  loadHotNumbersHistory: () => {
    const data = Storage.get(Storage.KEYS.HOT_NUMBERS_HISTORY, null);
    if(!data || !Array.isArray(data)) {
      return [];
    }

    const now = Date.now();
    const thirtyDaysAgo = now - Storage.HOT_NUMBERS_HISTORY_DURATION;

    // 过滤掉超过30天的记录
    const filteredHistory = data.filter(item => {
      const itemTime = item.timestamp || now;
      return itemTime >= thirtyDaysAgo;
    });

    // 如果有过期的记录被过滤掉，更新缓存
    if(filteredHistory.length < data.length) {
      Storage.saveHotNumbersHistory(filteredHistory);
    }

    return filteredHistory;
  },

  /**
   * 清除特码热门top5历史缓存
   */
  clearHotNumbersHistory: () => {
    Storage.remove(Storage.KEYS.HOT_NUMBERS_HISTORY);
  },

  /**
   * 保存生肖预测历史
   * @param {Array} history - 生肖预测历史记录
   */
  saveZodiacPredictionHistory: (history) => {
    Storage.set(Storage.KEYS.ZODIAC_PREDICTION_HISTORY, history);
  },

  /**
   * 加载生肖预测历史缓存
   * @returns {Array} 过滤后的历史记录（只保留30天内的）
   */
  loadZodiacPredictionHistory: () => {
    const data = Storage.get(Storage.KEYS.ZODIAC_PREDICTION_HISTORY, null);
    if(!data || !Array.isArray(data)) {
      return [];
    }

    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    // 过滤掉超过30天的记录
    const filteredHistory = data.filter(item => {
      const itemTime = new Date(item.timestamp).getTime() || now;
      return itemTime >= thirtyDaysAgo;
    });

    // 如果有过期的记录被过滤掉，更新缓存
    if(filteredHistory.length < data.length) {
      Storage.saveZodiacPredictionHistory(filteredHistory);
    }

    return filteredHistory;
  },

  /**
   * 清除生肖预测历史缓存
   */
  clearZodiacPredictionHistory: () => {
    Storage.remove(Storage.KEYS.ZODIAC_PREDICTION_HISTORY);
  }
};
