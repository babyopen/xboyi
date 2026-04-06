// ====================== 记录页面模块 ======================

// 导入必要的模块
import { Storage } from '../storage.js';
import { Toast } from '../toast.js';
import { StateManager } from '../state-manager.js';

export const record = {
  /**
   * 初始化记录页面
   */
  initRecordPage: () => {
    try {
      const recordPage = document.getElementById('recordPage');
      if (!recordPage) return;

      // 初始化页面元素
      console.log('记录页面初始化完成');
    } catch(e) {
      console.error('初始化记录页面失败:', e);
      Toast.show('页面初始化失败，请刷新重试');
    }
  },

  /**
   * 渲染所有记录
   */
  renderAllRecords: () => {
    try {
      // 渲染生肖预测历史
      record.renderZodiacPredictionHistory();
      
      // 渲染精选特码历史
      record.renderSpecialHistory();
      
      // 渲染精选生肖历史
      record.renderSelectedZodiacHistory();
      
      // 渲染热门特码历史
      record.renderHotNumbersHistory();
    } catch(e) {
      console.error('渲染记录失败:', e);
      Toast.show('渲染记录失败，请刷新重试');
    }
  },

  /**
   * 渲染生肖预测历史
   */
  renderZodiacPredictionHistory: () => {
    try {
      const history = Storage.get('zodiacPredictionHistory', []);
      const historyList = document.getElementById('zodiacPredictionHistory');
      if (!historyList) return;

      if (history.length === 0) {
        historyList.innerHTML = '<div style="text-align:center; padding:40px; color:var(--sub-text);">暂无生肖预测历史</div>';
        return;
      }

      const fragment = document.createDocumentFragment();

      history.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'prediction-history-item';
        itemDiv.setAttribute('role', 'listitem');

        const topZodiacs = item.sortedZodiacs.slice(0, 3).map(z => `${z.name}(${z.count})`).join(', ');

        itemDiv.innerHTML = `
          <div class="prediction-history-header">
            <div class="prediction-history-time">${new Date(item.timestamp).toLocaleString()}</div>
            <div class="prediction-history-actions">
              <button class="action-btn" onclick="Business.copyZodiacPredictionHistory(${index})"><i class="icon-copy"></i> 复制</button>
              <button class="action-btn danger" onclick="Business.deleteZodiacPredictionHistoryItem(${index})"><i class="icon-delete"></i> 删除</button>
            </div>
          </div>
          <div class="prediction-history-content">
            <div class="prediction-history-top">
              <span>前3热生肖: ${topZodiacs}</span>
              <span>分析期数: ${item.analyzeLimit}</span>
            </div>
          </div>
        `;

        fragment.appendChild(itemDiv);
      });

      historyList.innerHTML = '';
      historyList.appendChild(fragment);
    } catch(e) {
      console.error('渲染生肖预测历史失败:', e);
    }
  },

  /**
   * 渲染精选特码历史
   */
  renderSpecialHistory: () => {
    try {
      const history = Storage.get('specialHistory', []);
      const historyList = document.getElementById('specialHistory');
      if (!historyList) return;

      if (history.length === 0) {
        historyList.innerHTML = '<div style="text-align:center; padding:40px; color:var(--sub-text);">暂无精选特码历史</div>';
        return;
      }

      const fragment = document.createDocumentFragment();

      history.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'special-history-item';
        itemDiv.setAttribute('role', 'listitem');

        const specialHtml = item.special.map(num => {
          const numStr = String(num).padStart(2, '0');
          return `<span class="special-number">${numStr}</span>`;
        }).join(' ');

        itemDiv.innerHTML = `
          <div class="special-history-header">
            <div class="special-history-time">${new Date(item.timestamp).toLocaleString()}</div>
            <div class="special-history-actions">
              <button class="action-btn" onclick="Business.copySpecialHistory(${index})"><i class="icon-copy"></i> 复制</button>
              <button class="action-btn danger" onclick="Business.deleteSpecialHistoryItem(${index})"><i class="icon-delete"></i> 删除</button>
            </div>
          </div>
          <div class="special-history-content">
            <div class="special-numbers">
              ${specialHtml}
            </div>
            ${item.note ? `<div class="special-note">备注: ${item.note}</div>` : ''}
          </div>
        `;

        fragment.appendChild(itemDiv);
      });

      historyList.innerHTML = '';
      historyList.appendChild(fragment);
    } catch(e) {
      console.error('渲染精选特码历史失败:', e);
    }
  },

  /**
   * 渲染精选生肖历史
   */
  renderSelectedZodiacHistory: () => {
    try {
      const history = Storage.get('selectedZodiacHistory', []);
      const historyList = document.getElementById('selectedZodiacHistory');
      if (!historyList) return;

      if (history.length === 0) {
        historyList.innerHTML = '<div style="text-align:center; padding:40px; color:var(--sub-text);">暂无精选生肖历史</div>';
        return;
      }

      const fragment = document.createDocumentFragment();

      history.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'selected-zodiac-history-item';
        itemDiv.setAttribute('role', 'listitem');

        const zodiacsHtml = item.zodiacs.map(zodiac => {
          return `<span class="zodiac-tag">${zodiac}</span>`;
        }).join(' ');

        itemDiv.innerHTML = `
          <div class="selected-zodiac-history-header">
            <div class="selected-zodiac-history-time">${new Date(item.timestamp).toLocaleString()}</div>
            <div class="selected-zodiac-history-actions">
              <button class="action-btn" onclick="Business.copySelectedZodiacHistoryItem(${index})"><i class="icon-copy"></i> 复制</button>
              <button class="action-btn danger" onclick="Business.deleteSelectedZodiacHistoryItem(${index})"><i class="icon-delete"></i> 删除</button>
            </div>
          </div>
          <div class="selected-zodiac-history-content">
            <div class="zodiac-tags">
              ${zodiacsHtml}
            </div>
            ${item.note ? `<div class="zodiac-note">备注: ${item.note}</div>` : ''}
          </div>
        `;

        fragment.appendChild(itemDiv);
      });

      historyList.innerHTML = '';
      historyList.appendChild(fragment);
    } catch(e) {
      console.error('渲染精选生肖历史失败:', e);
    }
  },

  /**
   * 渲染热门特码历史
   */
  renderHotNumbersHistory: () => {
    try {
      const history = Storage.get('hotNumbersHistory', []);
      const historyList = document.getElementById('hotNumbersHistory');
      if (!historyList) return;

      if (history.length === 0) {
        historyList.innerHTML = '<div style="text-align:center; padding:40px; color:var(--sub-text);">暂无热门特码历史</div>';
        return;
      }

      const fragment = document.createDocumentFragment();

      history.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'hot-numbers-history-item';
        itemDiv.setAttribute('role', 'listitem');

        const hotNumbersHtml = item.hotNumbers.map((num, rank) => {
          const numStr = String(num).padStart(2, '0');
          return `<span class="hot-number rank-${rank + 1}">${numStr}</span>`;
        }).join(' ');

        itemDiv.innerHTML = `
          <div class="hot-numbers-history-header">
            <div class="hot-numbers-history-time">${new Date(item.timestamp).toLocaleString()}</div>
            <div class="hot-numbers-history-actions">
              <button class="action-btn" onclick="Business.copyHotNumbersHistory(${index})"><i class="icon-copy"></i> 复制</button>
              <button class="action-btn danger" onclick="Business.deleteHotNumbersHistoryItem(${index})"><i class="icon-delete"></i> 删除</button>
            </div>
          </div>
          <div class="hot-numbers-history-content">
            <div class="hot-numbers">
              ${hotNumbersHtml}
            </div>
            <div class="hot-numbers-info">
              <span>分析期数: ${item.analyzeLimit}</span>
            </div>
          </div>
        `;

        fragment.appendChild(itemDiv);
      });

      historyList.innerHTML = '';
      historyList.appendChild(fragment);
    } catch(e) {
      console.error('渲染热门特码历史失败:', e);
    }
  },

  /**
   * 清除所有记录
   */
  clearAllRecords: () => {
    if (!confirm('确定要清除所有记录吗？此操作不可恢复！')) return;

    try {
      // 清除所有历史记录
      Storage.remove('zodiacPredictionHistory');
      Storage.remove('specialHistory');
      Storage.remove('selectedZodiacHistory');
      Storage.remove('hotNumbersHistory');
      Storage.remove('mlPredictionHistory');

      // 更新状态
      StateManager.setState({
        zodiacPredictionHistory: [],
        specialHistory: [],
        selectedZodiacHistory: [],
        hotNumbersHistory: [],
        mlPredictionHistory: []
      }, false);

      // 重新渲染
      record.renderAllRecords();

      Toast.show('所有记录已清除');
    } catch(e) {
      console.error('清除记录失败:', e);
      Toast.show('清除记录失败，请重试');
    }
  },

  /**
   * 导出记录
   */
  exportRecords: () => {
    try {
      const records = {
        zodiacPredictionHistory: Storage.get('zodiacPredictionHistory', []),
        specialHistory: Storage.get('specialHistory', []),
        selectedZodiacHistory: Storage.get('selectedZodiacHistory', []),
        hotNumbersHistory: Storage.get('hotNumbersHistory', []),
        mlPredictionHistory: Storage.get('mlPredictionHistory', [])
      };

      const jsonStr = JSON.stringify(records, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `records-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      Toast.show('记录导出成功');
    } catch(e) {
      console.error('导出记录失败:', e);
      Toast.show('导出记录失败，请重试');
    }
  },

  /**
   * 导入记录
   */
  importRecords: () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const records = JSON.parse(event.target.result);

            // 验证数据格式
            if (typeof records === 'object' && records !== null) {
              // 保存记录
              if (records.zodiacPredictionHistory) {
                Storage.set('zodiacPredictionHistory', records.zodiacPredictionHistory);
              }
              if (records.specialHistory) {
                Storage.set('specialHistory', records.specialHistory);
              }
              if (records.selectedZodiacHistory) {
                Storage.set('selectedZodiacHistory', records.selectedZodiacHistory);
              }
              if (records.hotNumbersHistory) {
                Storage.set('hotNumbersHistory', records.hotNumbersHistory);
              }
              if (records.mlPredictionHistory) {
                Storage.set('mlPredictionHistory', records.mlPredictionHistory);
              }

              // 更新状态
              StateManager.setState({
                zodiacPredictionHistory: records.zodiacPredictionHistory || [],
                specialHistory: records.specialHistory || [],
                selectedZodiacHistory: records.selectedZodiacHistory || [],
                hotNumbersHistory: records.hotNumbersHistory || [],
                mlPredictionHistory: records.mlPredictionHistory || []
              }, false);

              // 重新渲染
              record.renderAllRecords();

              Toast.show('记录导入成功');
            } else {
              Toast.show('导入失败：文件格式错误');
            }
          } catch(e) {
            console.error('解析文件失败:', e);
            Toast.show('导入失败：文件格式错误');
          }
        };
        reader.readAsText(file);
      };
      input.click();
    } catch(e) {
      console.error('导入记录失败:', e);
      Toast.show('导入记录失败，请重试');
    }
  }
};
