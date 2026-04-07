// ====================== 记录页面业务逻辑模块 ======================

import { Storage } from '../storage.js';
import { StateManager } from '../state-manager.js';
import { Toast } from '../toast.js';

/**
 * 记录页面业务逻辑
 * @namespace record
 */
export const record = {
  /**
   * 初始化记录页面
   */
  init: () => {
    record.loadZodiacRecords();
    record.bindEvents();
    record.startAutoRefresh();
  },

  /**
   * 开始自动刷新
   */
  startAutoRefresh: () => {
    // 每30秒自动刷新一次数据
    record._refreshInterval = setInterval(() => {
      record.loadZodiacRecords();
    }, 30 * 1000);
  },

  /**
   * 停止自动刷新
   */
  stopAutoRefresh: () => {
    if (record._refreshInterval) {
      clearInterval(record._refreshInterval);
      record._refreshInterval = null;
    }
  },

  /**
   * 加载生肖记录
   */
  loadZodiacRecords: () => {
    try {
      const records = Storage.loadZodiacRecords();
      record.renderZodiacRecords(records);
    } catch (error) {
      console.error('加载生肖记录失败:', error);
    }
  },

  /**
   * 渲染生肖记录
   * @param {Array} records - 生肖记录列表
   */
  renderZodiacRecords: (records) => {
    const recordList = document.getElementById('zodiacRecordList');
    if (!recordList) return;

    if (!Array.isArray(records)) {
      recordList.innerHTML = '<div class="empty-tip">数据格式错误</div>';
      return;
    }

    if (records.length === 0) {
      recordList.innerHTML = '<div class="empty-tip">暂无记录</div>';
      return;
    }

    recordList.innerHTML = records.map(recordItem => {
      const formattedTime = record._formatDate(recordItem.createdAt);

      let resultHTML = '';
      if (recordItem.checked) {
        const hitClass = recordItem.matched ? 'hit' : 'miss';
        resultHTML = `<div class="record-item-actual ${hitClass}">${recordItem.actualZodiac}</div>`;
      }

      return `
        <div class="record-item">
          <div class="record-item-header">
            <div class="record-item-issue">第${recordItem.issue}期</div>
            <div class="record-item-time">${formattedTime}</div>
          </div>
          <div class="record-item-content">
            <div class="record-item-zodiacs">
              ${record._renderZodiacItems(recordItem)}
            </div>
            ${resultHTML}
          </div>
        </div>
      `;
    }).join('');
  },

  /**
   * 格式化日期
   * @private
   * @param {number} timestamp - 时间戳
   * @returns {string} 格式化后的日期字符串
   */
  _formatDate: (timestamp) => {
    if (!timestamp) return '';
    
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  /**
   * 渲染生肖项
   * @private
   * @param {Object} recordItem - 记录项
   * @returns {string} 渲染后的HTML字符串
   */
  _renderZodiacItems: (recordItem) => {
    if (!recordItem.zodiacs || !Array.isArray(recordItem.zodiacs)) {
      return '';
    }
    
    return recordItem.zodiacs.map(zodiac => {
      const matchedClass = recordItem.checked && recordItem.matched && zodiac === recordItem.actualZodiac ? 'matched' : '';
      return `<div class="record-item-zodiac ${matchedClass}">${zodiac}</div>`;
    }).join('');
  },

  /**
   * 绑定事件
   */
  bindEvents: () => {
    // 清空记录按钮
    const clearButton = document.querySelector('[data-action="clearZodiacRecords"]');
    if (clearButton) {
      clearButton.addEventListener('click', () => {
        const userConfirmed = confirm('确定要清空所有生肖记录吗？');
        if (userConfirmed) {
          const success = Storage.clearZodiacRecords();
          if (success) {
            Toast.show('记录已清空');
            record.loadZodiacRecords();
          } else {
            Toast.show('清空记录失败');
          }
        }
      });
    }
  },

  /**
   * 保存生肖记录
   * @param {Object} recordData - 记录数据
   * @returns {boolean} 是否成功
   */
  saveZodiacRecord: (recordData) => {
    return Storage.saveZodiacRecord(recordData);
  },

  /**
   * 核对生肖记录
   * @param {string} issue - 期号
   * @param {string} actualZodiac - 实际开奖生肖
   * @returns {Object} 核对结果
   */
  checkZodiacRecord: (issue, actualZodiac) => {
    const result = Storage.checkZodiacRecord(issue, actualZodiac);
    if (result.success) {
      record.loadZodiacRecords();
    }
    return result;
  }
};
