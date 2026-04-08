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
    record.loadNumberRecords();
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
      record.loadNumberRecords();
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
   * 加载号码记录
   */
  loadNumberRecords: () => {
    try {
      const records = Storage.loadNumberRecords();
      record.renderNumberRecords(records);
    } catch (error) {
      console.error('加载号码记录失败:', error);
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

    // 按创建时间排序，最新的在最上面
    records.sort((a, b) => b.createdAt - a.createdAt);

    // 使用文档片段批量更新DOM，减少重排
    const fragment = document.createDocumentFragment();
    
    // 创建主卡片容器
    const mainCard = document.createElement('div');
    mainCard.className = 'record-item';
    
    // 渲染最新一期（始终显示）
    const latestRecord = records[0];
    const latestFormattedTime = record._formatDate(latestRecord.createdAt);
    
    let latestResultHTML = '';
    if (latestRecord.checked) {
      const hitClass = latestRecord.matched ? 'hit' : 'miss';
      const actualResult = latestRecord.actualZodiac || '-';
      latestResultHTML = `<div class="record-item-actual ${hitClass}">${actualResult}</div>`;
    }
    
    const displayIssue = latestRecord.issue || '';
    
    mainCard.innerHTML = `
      <div class="record-item-header" style="cursor: pointer;" onclick="record.toggleRecords()">
        <div class="record-item-issue">第${displayIssue}期</div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <div class="record-item-time">${latestFormattedTime}</div>
          <div id="recordToggleIcon" style="font-size: 12px; transition: transform 0.3s;">▼</div>
        </div>
      </div>
      <div class="record-item-content">
        <div class="record-item-zodiacs">
          ${record._renderZodiacItems(latestRecord)}
        </div>
        ${latestResultHTML}
      </div>
      ${latestRecord.periodData ? record._renderPeriodData(latestRecord.periodData) : ''}
      <div id="recordCollapseContent" class="record-collapse-content" style="display: none; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border);">
        <div class="record-collapse-list">
          ${records.slice(1).map(recordItem => {
            const formattedTime = record._formatDate(recordItem.createdAt);
            let resultHTML = '';
            if (recordItem.checked) {
              const hitClass = recordItem.matched ? 'hit' : 'miss';
              const actualResult = recordItem.actualZodiac || '-';
              resultHTML = `<div class="record-item-actual ${hitClass}">${actualResult}</div>`;
            }
            const itemDisplayIssue = recordItem.issue || '';
            return `
              <div class="record-collapse-item">
                <div class="record-item-header">
                  <div class="record-item-issue">第${itemDisplayIssue}期</div>
                  <div class="record-item-time">${formattedTime}</div>
                </div>
                <div class="record-item-content">
                  <div class="record-item-zodiacs">
                    ${record._renderZodiacItems(recordItem)}
                  </div>
                  ${resultHTML}
                </div>
                ${recordItem.periodData ? record._renderPeriodData(recordItem.periodData) : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
    
    fragment.appendChild(mainCard);

    // 一次性更新DOM
    recordList.innerHTML = '';
    recordList.appendChild(fragment);
  },

  /**
   * 切换记录折叠状态
   */
  toggleRecords: () => {
    const collapseContent = document.getElementById('recordCollapseContent');
    const toggleIcon = document.getElementById('recordToggleIcon');
    if (collapseContent && toggleIcon) {
      if (collapseContent.style.display === 'none') {
        collapseContent.style.display = 'block';
        toggleIcon.style.transform = 'rotate(180deg)';
      } else {
        collapseContent.style.display = 'none';
        toggleIcon.style.transform = 'rotate(0deg)';
      }
    }
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
    
    return recordItem.zodiacs.map((zodiac, index) => {
      const matchedClass = recordItem.checked && recordItem.matched && zodiac === recordItem.actualZodiac ? 'matched' : '';
      const positionClass = `position-${index + 1}`;
      return `<div class="record-item-zodiac ${matchedClass} ${positionClass}">${zodiac}</div>`;
    }).join('');
  },

  /**
   * 渲染期数数据
   * @private
   * @param {Object} periodData - 期数数据
   * @returns {string} 渲染后的HTML字符串
   */
  _renderPeriodData: (periodData) => {
    return `
      <div class="record-item-periods">
        ${Object.entries(periodData).map(([period, zodiacs]) => {
          if (!zodiacs || !Array.isArray(zodiacs)) return '';
          return `
            <div class="record-item-period">
              <div class="period-label">${period}期</div>
              <div class="period-zodiacs">
                ${zodiacs.slice(0, 6).map((zodiac) => `<span class="period-zodiac">${zodiac}</span>`).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  },

  /**
   * 绑定事件
   */
  bindEvents: () => {
    // 清空生肖记录按钮
    const clearZodiacButton = document.querySelector('[data-action="clearZodiacRecords"]');
    if (clearZodiacButton) {
      clearZodiacButton.addEventListener('click', () => {
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

    // 清空号码记录按钮
    const clearNumberButton = document.querySelector('[data-action="clearNumberRecords"]');
    if (clearNumberButton) {
      clearNumberButton.addEventListener('click', () => {
        const userConfirmed = confirm('确定要清空所有号码记录吗？');
        if (userConfirmed) {
          const success = Storage.clearNumberRecords();
          if (success) {
            Toast.show('记录已清空');
            record.loadNumberRecords();
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
  },

  /**
   * 渲染号码记录
   * @param {Array} records - 号码记录列表
   */
  renderNumberRecords: (records) => {
    const recordList = document.getElementById('numberRecordList');
    if (!recordList) return;

    if (!Array.isArray(records)) {
      recordList.innerHTML = '<div class="empty-tip">数据格式错误</div>';
      return;
    }

    if (records.length === 0) {
      recordList.innerHTML = '<div class="empty-tip">暂无记录</div>';
      return;
    }

    // 按创建时间排序，最新的在最上面
    records.sort((a, b) => b.createdAt - a.createdAt);

    // 使用文档片段批量更新DOM，减少重排
    const fragment = document.createDocumentFragment();
    
    // 创建主卡片容器
    const mainCard = document.createElement('div');
    mainCard.className = 'record-item';
    
    // 渲染最新一期（始终显示）
    const latestRecord = records[0];
    const latestFormattedTime = record._formatDate(latestRecord.createdAt);
    
    let latestResultHTML = '';
    if (latestRecord.checked) {
      const hitClass = latestRecord.matched ? 'hit' : 'miss';
      const lastNumber = latestRecord.actualNumbers && latestRecord.actualNumbers.length > 0 ? latestRecord.actualNumbers[latestRecord.actualNumbers.length - 1] : '-';
      latestResultHTML = `<div class="record-item-actual ${hitClass}">${lastNumber}</div>`;
    }
    
    const displayIssue = latestRecord.issue || '';
    
    mainCard.innerHTML = `
      <div class="record-item-header" style="cursor: pointer;" onclick="record.toggleNumberRecords()">
        <div class="record-item-issue">第${displayIssue}期</div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <div class="record-item-time">${latestFormattedTime}</div>
          <div id="numberRecordToggleIcon" style="font-size: 12px; transition: transform 0.3s;">▼</div>
        </div>
      </div>
      <div class="record-item-content">
        <div class="record-item-numbers">
          ${record._renderNumberItems(latestRecord)}
        </div>
        ${latestResultHTML}
      </div>
      ${latestRecord.type ? `<div class="record-item-type">类型: ${latestRecord.type === 'hot' ? '热号' : '冷号'}</div>` : ''}
      <div id="numberRecordCollapseContent" class="record-collapse-content" style="display: none; margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--border);">
        <div class="record-collapse-list">
          ${records.slice(1).map(recordItem => {
            const formattedTime = record._formatDate(recordItem.createdAt);
            let resultHTML = '';
            if (recordItem.checked) {
              const hitClass = recordItem.matched ? 'hit' : 'miss';
              const lastNumber = recordItem.actualNumbers && recordItem.actualNumbers.length > 0 ? recordItem.actualNumbers[recordItem.actualNumbers.length - 1] : '-';
              resultHTML = `<div class="record-item-actual ${hitClass}">${lastNumber}</div>`;
            }
            const itemDisplayIssue = recordItem.issue || '';
            return `
              <div class="record-collapse-item">
                <div class="record-item-header">
                  <div class="record-item-issue">第${itemDisplayIssue}期</div>
                  <div class="record-item-time">${formattedTime}</div>
                </div>
                <div class="record-item-content">
                  <div class="record-item-numbers">
                    ${record._renderNumberItems(recordItem)}
                  </div>
                  ${resultHTML}
                </div>
                ${recordItem.type ? `<div class="record-item-type">类型: ${recordItem.type === 'hot' ? '热号' : '冷号'}</div>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
    
    fragment.appendChild(mainCard);

    // 一次性更新DOM
    recordList.innerHTML = '';
    recordList.appendChild(fragment);
  },

  /**
   * 切换号码记录折叠状态
   */
  toggleNumberRecords: () => {
    const collapseContent = document.getElementById('numberRecordCollapseContent');
    const toggleIcon = document.getElementById('numberRecordToggleIcon');
    if (collapseContent && toggleIcon) {
      if (collapseContent.style.display === 'none') {
        collapseContent.style.display = 'block';
        toggleIcon.style.transform = 'rotate(180deg)';
      } else {
        collapseContent.style.display = 'none';
        toggleIcon.style.transform = 'rotate(0deg)';
      }
    }
  },

  /**
   * 渲染号码项
   * @private
   * @param {Object} recordItem - 记录项
   * @returns {string} 渲染后的HTML字符串
   */
  _renderNumberItems: (recordItem) => {
    if (!recordItem.numbers || !Array.isArray(recordItem.numbers)) {
      return '';
    }
    
    return recordItem.numbers.map((number) => {
      const matchedClass = recordItem.checked && recordItem.matched && recordItem.actualNumbers && recordItem.actualNumbers.includes(number) ? 'matched' : '';
      return `<div class="record-item-number ${matchedClass}">${number}</div>`;
    }).join('');
  },

  /**
   * 保存号码记录
   * @param {Object} recordData - 记录数据
   * @returns {boolean} 是否成功
   */
  saveNumberRecord: (recordData) => {
    const success = Storage.saveNumberRecord(recordData);
    if (success) {
      record.loadNumberRecords();
    }
    return success;
  },

  /**
   * 核对号码记录
   * @param {string} issue - 期号
   * @param {Array} actualNumbers - 实际开奖号码
   * @returns {Object} 核对结果
   */
  checkNumberRecord: (issue, actualNumbers) => {
    const result = Storage.checkNumberRecord(issue, actualNumbers);
    if (result.success) {
      record.loadNumberRecords();
    }
    return result;
  }
};
