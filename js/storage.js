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
    ZODIAC_RECORDS: 'zodiacRecords'
  }),

  /**
   * 缓存有效期（毫秒）- 1小时
   * @readonly
   */
  CACHE_DURATION: 60 * 60 * 1000,



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
   * 保存生肖记录
   * @param {Object} recordData - 生肖记录对象
   * @returns {boolean} 是否成功
   */
  saveZodiacRecord: (recordData) => {
    try {
      if (!recordData || !recordData.issue || !recordData.zodiacs) {
        console.error('保存生肖记录失败：数据不完整');
        return false;
      }

      const records = Storage.get(Storage.KEYS.ZODIAC_RECORDS, []);
      const existingIndex = records.findIndex(r => r.issue === recordData.issue);
      
      if (existingIndex >= 0) {
        // 更新现有记录
        records[existingIndex] = {
          ...records[existingIndex],
          ...recordData,
          updatedAt: Date.now()
        };
      } else {
        // 添加新记录
        records.unshift({
          ...recordData,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          checked: false,
          matched: null
        });
      }
      
      // 只保留最近50条记录
      if (records.length > 50) {
        records.splice(50);
      }
      
      return Storage.set(Storage.KEYS.ZODIAC_RECORDS, records);
    } catch (e) {
      console.error('保存生肖记录失败:', e);
      return false;
    }
  },

  /**
   * 加载生肖记录
   * @returns {Array} 生肖记录列表
   */
  loadZodiacRecords: () => {
    try {
      const records = Storage.get(Storage.KEYS.ZODIAC_RECORDS, []);
      return Array.isArray(records) ? records : [];
    } catch (e) {
      console.error('加载生肖记录失败:', e);
      return [];
    }
  },

  /**
   * 核对生肖记录
   * @param {string} issue - 期号
   * @param {string} actualZodiac - 实际开奖生肖
   * @returns {Object} 核对结果
   */
  checkZodiacRecord: (issue, actualZodiac) => {
    try {
      if (!issue || !actualZodiac) {
        return { success: false, message: '参数不完整' };
      }

      const records = Storage.get(Storage.KEYS.ZODIAC_RECORDS, []);
      const recordIndex = records.findIndex(r => r.issue === issue);
      
      if (recordIndex >= 0) {
        const record = records[recordIndex];
        if (!record.zodiacs || !Array.isArray(record.zodiacs)) {
          return { success: false, message: '记录数据格式错误' };
        }
        
        const matched = record.zodiacs.includes(actualZodiac);
        
        // 更新记录
        records[recordIndex] = {
          ...record,
          checked: true,
          matched: matched,
          actualZodiac: actualZodiac,
          checkedAt: Date.now()
        };
        
        Storage.set(Storage.KEYS.ZODIAC_RECORDS, records);
        return { success: true, matched: matched, record: records[recordIndex] };
      }
      
      return { success: false, message: '未找到对应期号的记录' };
    } catch (e) {
      console.error('核对生肖记录失败:', e);
      return { success: false, message: '核对失败' };
    }
  },

  /**
   * 清除所有生肖记录
   * @returns {boolean} 是否成功
   */
  clearZodiacRecords: () => {
    try {
      return Storage.remove(Storage.KEYS.ZODIAC_RECORDS);
    } catch (e) {
      console.error('清除生肖记录失败:', e);
      return false;
    }
  }

}; 
