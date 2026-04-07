// ====================== 记录页面业务逻辑模块 ======================

import { StateManager } from '../state-manager.js';
import { Storage } from '../storage.js';
import { Toast } from '../toast.js';
import { Utils } from '../utils.js';

// 记录页面业务逻辑
const record = {
  // 初始化记录页面
  initRecordPage() {
    try {
      // 加载最新开奖信息
      this.loadLatestDraw();
      // 加载历史记录
      this.loadHistoryRecords();
      // 加载特码历史
      this.loadSpecialHistory();
      // 加载热门TOP5历史
      this.loadHotHistory();
      // 加载预测历史
      this.loadPredictionHistory();
      // 绑定记录页面事件
      this.bindRecordEvents();
    } catch (e) {
      console.error('初始化记录页面失败:', e);
    }
  },

  // 加载最新开奖信息
  loadLatestDraw() {
    try {
      const historyData = StateManager._state?.analysis?.historyData || [];
      if (historyData.length > 0) {
        const latestDraw = historyData[0];
        this.renderLatestDraw(latestDraw);
      } else {
        // 如果没有历史数据，尝试使用模拟数据
        this._tryUseMockData();
      }
    } catch (e) {
      console.error('加载最新开奖信息失败:', e);
      // 发生错误时也尝试使用模拟数据
      this._tryUseMockData();
    }
  },

  // 尝试使用模拟数据
  _tryUseMockData() {
    try {
      Toast.show('网络异常，使用本地数据', { type: 'warning', duration: 3000 });
      const mockData = this.getMockHistoryData();
      if (mockData && mockData.length > 0) {
        // 更新状态
        const currentAnalysis = StateManager._state?.analysis || {};
        const newAnalysis = {
          ...currentAnalysis,
          historyData: mockData
        };
        StateManager.setState({ analysis: newAnalysis }, false);
        
        // 渲染最新开奖信息
        this.renderLatestDraw(mockData[0]);
        // 渲染历史记录
        this.renderHistoryTable(mockData);
        this.renderHistoryPagination(mockData, 1, 10);
        // 渲染特码历史
        this.renderSpecialTable(mockData);
        this.renderSpecialPagination(mockData, 1, 10);
        // 渲染热门TOP5历史
        const hotNumbers = this.calculateHotNumbers(mockData);
        this.renderHotTable(hotNumbers);
      } else {
        // 如果模拟数据也失败，显示默认值
        this.renderLatestDraw(null);
      }
    } catch (e) {
      console.error('使用模拟数据失败:', e);
      // 模拟数据也失败时，显示默认值
      this.renderLatestDraw(null);
    }
  },

  // 获取模拟历史数据
  getMockHistoryData() {
    const mockData = [];
    const zodiacs = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
    
    for(let i = 1; i <= 50; i++) {
      const te = Math.floor(Math.random() * 49) + 1;
      const codeArr = [];
      
      // 生成6个普通号码
      for(let j = 0; j < 6; j++) {
        let num;
        do {
          num = Math.floor(Math.random() * 49) + 1;
        } while(codeArr.includes(num));
        codeArr.push(num);
      }
      
      // 添加特码
      codeArr.push(te);
      
      mockData.push({
        expect: `2026${String(i).padStart(3, '0')}`,
        opentime: `2026-0${Math.floor(Math.random() * 12) + 1}-${String(Math.floor(Math.random() * 28) + 1).padStart(2, '0')}`,
        opencode: codeArr.join(','),
        openCode: codeArr.join(',') // 兼容不同的数据格式
      });
    }
    
    return mockData;
  },

  // 渲染最新开奖信息
  renderLatestDraw(drawData) {
    try {
      const latestPeriod = document.getElementById('latestPeriod');
      const latestTime = document.getElementById('latestTime');
      const latestNumbers = document.getElementById('latestNumbers');

      if (drawData) {
        latestPeriod.textContent = drawData.expect;
        latestTime.textContent = drawData.opentime || drawData.openTime || '';
        
        // 渲染开奖号码
        latestNumbers.innerHTML = '';
        const openCode = drawData.opencode || drawData.openCode || '';
        if (openCode) {
          const numbers = openCode.split(',');
          numbers.forEach(num => {
            const numItem = document.createElement('div');
            numItem.className = 'num-item';
            const ball = document.createElement('div');
            ball.className = 'num-ball';
            // 根据号码设置颜色
            const number = parseInt(num);
            if (number >= 1 && number <= 16) {
              ball.classList.add('红色');
            } else if (number >= 17 && number <= 32) {
              ball.classList.add('蓝色');
            } else {
              ball.classList.add('绿色');
            }
            ball.textContent = num;
            numItem.appendChild(ball);
            latestNumbers.appendChild(numItem);
          });
        }
      } else {
        latestPeriod.textContent = '--';
        latestTime.textContent = '--';
        latestNumbers.innerHTML = '<div style="color: var(--sub-text);">暂无开奖数据</div>';
      }
    } catch (e) {
      console.error('渲染最新开奖信息失败:', e);
    }
  },

  // 加载历史记录
  loadHistoryRecords() {
    try {
      const historyData = StateManager._state?.analysis?.historyData || [];
      this.renderHistoryTable(historyData);
      this.renderHistoryPagination(historyData, 1, 10);
    } catch (e) {
      console.error('加载历史记录失败:', e);
    }
  },

  // 渲染历史记录表格
  renderHistoryTable(data, page = 1, pageSize = 10) {
    try {
      const tableBody = document.getElementById('historyTableBody');
      if (!tableBody) return;

      tableBody.innerHTML = '';

      if (data.length === 0) {
        tableBody.innerHTML = '<div class="empty-tip">暂无历史记录</div>';
        return;
      }

      // 分页处理
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedData = data.slice(startIndex, endIndex);

      paginatedData.forEach(item => {
        const row = document.createElement('div');
        row.className = 'history-row';
        const openCode = item.opencode || item.openCode || '';
        const openTime = item.opentime || item.openTime || '';
        row.innerHTML = `
          <div class="history-col">
            <div class="history-label">期号</div>
            <div class="history-value">${item.expect}</div>
          </div>
          <div class="history-col">
            <div class="history-label">开奖号码</div>
            <div class="draw-numbers" style="justify-content: flex-start;">
              ${openCode.split(',').map(num => {
                const number = parseInt(num);
                let colorClass = '';
                if (number >= 1 && number <= 16) {
                  colorClass = '红色';
                } else if (number >= 17 && number <= 32) {
                  colorClass = '蓝色';
                } else {
                  colorClass = '绿色';
                }
                return `<div class="num-item"><div class="num-ball ${colorClass}">${num}</div></div>`;
              }).join('')}
            </div>
          </div>
          <div class="history-col">
            <div class="history-label">开奖时间</div>
            <div class="history-value">${openTime}</div>
          </div>
          <div class="history-col">
            <div class="history-label">操作</div>
            <div class="history-value">
              <button class="btn-mini" onclick="Business.viewDrawDetail('${item.expect}')">查看</button>
            </div>
          </div>
        `;
        tableBody.appendChild(row);
      });
    } catch (e) {
      console.error('渲染历史记录表格失败:', e);
    }
  },

  // 渲染历史记录分页
  renderHistoryPagination(data, currentPage, pageSize) {
    try {
      const pagination = document.getElementById('historyPagination');
      if (!pagination) return;

      const totalPages = Math.ceil(data.length / pageSize);
      pagination.innerHTML = '';

      if (totalPages <= 1) return;

      // 上一页按钮
      const prevBtn = document.createElement('button');
      prevBtn.textContent = '上一页';
      prevBtn.disabled = currentPage === 1;
      prevBtn.onclick = () => {
        if (currentPage > 1) {
          this.renderHistoryTable(data, currentPage - 1, pageSize);
          this.renderHistoryPagination(data, currentPage - 1, pageSize);
        }
      };
      pagination.appendChild(prevBtn);

      // 页码按钮
      for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i;
        pageBtn.className = i === currentPage ? 'active' : '';
        pageBtn.onclick = () => {
          this.renderHistoryTable(data, i, pageSize);
          this.renderHistoryPagination(data, i, pageSize);
        };
        pagination.appendChild(pageBtn);
      }

      // 下一页按钮
      const nextBtn = document.createElement('button');
      nextBtn.textContent = '下一页';
      nextBtn.disabled = currentPage === totalPages;
      nextBtn.onclick = () => {
        if (currentPage < totalPages) {
          this.renderHistoryTable(data, currentPage + 1, pageSize);
          this.renderHistoryPagination(data, currentPage + 1, pageSize);
        }
      };
      pagination.appendChild(nextBtn);
    } catch (e) {
      console.error('渲染历史记录分页失败:', e);
    }
  },

  // 加载特码历史
  loadSpecialHistory() {
    try {
      const historyData = StateManager._state?.analysis?.historyData || [];
      this.renderSpecialTable(historyData);
      this.renderSpecialPagination(historyData, 1, 10);
    } catch (e) {
      console.error('加载特码历史失败:', e);
    }
  },

  // 渲染特码历史表格
  renderSpecialTable(data, page = 1, pageSize = 10) {
    try {
      const tableBody = document.getElementById('specialTableBody');
      if (!tableBody) return;

      tableBody.innerHTML = '';

      if (data.length === 0) {
        tableBody.innerHTML = '<div class="empty-tip">暂无特码历史记录</div>';
        return;
      }

      // 分页处理
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedData = data.slice(startIndex, endIndex);

      paginatedData.forEach(item => {
        const openCode = item.opencode || item.openCode || '';
        const numbers = openCode.split(',');
        const specialNum = numbers[numbers.length - 1]; // 假设特码是最后一个号码
        const number = parseInt(specialNum);
        
        // 获取生肖和波色
        const zodiac = this.getZodiacByNumber(number);
        let color = '';
        if (number >= 1 && number <= 16) {
          color = '红波';
        } else if (number >= 17 && number <= 32) {
          color = '蓝波';
        } else {
          color = '绿波';
        }

        const row = document.createElement('div');
        row.className = 'history-row';
        const openTime = item.opentime || item.openTime || '';
        row.innerHTML = `
          <div class="history-col">
            <div class="history-label">期号</div>
            <div class="history-value">${item.expect}</div>
          </div>
          <div class="history-col">
            <div class="history-label">特码</div>
            <div class="history-value"><div class="num-ball ${number >= 1 && number <= 16 ? '红色' : number >= 17 && number <= 32 ? '蓝色' : '绿色'}">${specialNum}</div></div>
          </div>
          <div class="history-col">
            <div class="history-label">生肖</div>
            <div class="history-value">${zodiac}</div>
          </div>
          <div class="history-col">
            <div class="history-label">波色</div>
            <div class="history-value">${color}</div>
          </div>
          <div class="history-col">
            <div class="history-label">开奖时间</div>
            <div class="history-value">${openTime}</div>
          </div>
        `;
        tableBody.appendChild(row);
      });
    } catch (e) {
      console.error('渲染特码历史表格失败:', e);
    }
  },

  // 渲染特码历史分页
  renderSpecialPagination(data, currentPage, pageSize) {
    try {
      const pagination = document.getElementById('specialPagination');
      if (!pagination) return;

      const totalPages = Math.ceil(data.length / pageSize);
      pagination.innerHTML = '';

      if (totalPages <= 1) return;

      // 上一页按钮
      const prevBtn = document.createElement('button');
      prevBtn.textContent = '上一页';
      prevBtn.disabled = currentPage === 1;
      prevBtn.onclick = () => {
        if (currentPage > 1) {
          this.renderSpecialTable(data, currentPage - 1, pageSize);
          this.renderSpecialPagination(data, currentPage - 1, pageSize);
        }
      };
      pagination.appendChild(prevBtn);

      // 页码按钮
      for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i;
        pageBtn.className = i === currentPage ? 'active' : '';
        pageBtn.onclick = () => {
          this.renderSpecialTable(data, i, pageSize);
          this.renderSpecialPagination(data, i, pageSize);
        };
        pagination.appendChild(pageBtn);
      }

      // 下一页按钮
      const nextBtn = document.createElement('button');
      nextBtn.textContent = '下一页';
      nextBtn.disabled = currentPage === totalPages;
      nextBtn.onclick = () => {
        if (currentPage < totalPages) {
          this.renderSpecialTable(data, currentPage + 1, pageSize);
          this.renderSpecialPagination(data, currentPage + 1, pageSize);
        }
      };
      pagination.appendChild(nextBtn);
    } catch (e) {
      console.error('渲染特码历史分页失败:', e);
    }
  },

  // 加载热门TOP5历史
  loadHotHistory() {
    try {
      const historyData = StateManager._state?.analysis?.historyData || [];
      const hotNumbers = this.calculateHotNumbers(historyData);
      this.renderHotTable(hotNumbers);
    } catch (e) {
      console.error('加载热门TOP5历史失败:', e);
    }
  },

  // 计算热门号码
  calculateHotNumbers(data) {
    try {
      const numberCount = {};
      const lastOccurrence = {};

      data.forEach(item => {
        const numbers = item.opencode.split(',');
        numbers.forEach(num => {
          numberCount[num] = (numberCount[num] || 0) + 1;
          lastOccurrence[num] = item.expect;
        });
      });

      // 转换为数组并排序
      const hotArray = Object.entries(numberCount).map(([num, count]) => ({
        num,
        count,
        lastOccurrence: lastOccurrence[num]
      }));

      // 按出现次数排序，取前5名
      hotArray.sort((a, b) => b.count - a.count);
      return hotArray.slice(0, 5);
    } catch (e) {
      console.error('计算热门号码失败:', e);
      return [];
    }
  },

  // 渲染热门TOP5历史表格
  renderHotTable(hotNumbers) {
    try {
      const tableBody = document.getElementById('hotTableBody');
      if (!tableBody) return;

      tableBody.innerHTML = '';

      if (hotNumbers.length === 0) {
        tableBody.innerHTML = '<div class="empty-tip">暂无热门号码数据</div>';
        return;
      }

      hotNumbers.forEach((item, index) => {
        const row = document.createElement('div');
        row.className = 'history-row';
        const number = parseInt(item.num);
        row.innerHTML = `
          <div class="history-col">
            <div class="history-label">排名</div>
            <div class="history-value">${index + 1}</div>
          </div>
          <div class="history-col">
            <div class="history-label">号码</div>
            <div class="history-value"><div class="num-ball ${number >= 1 && number <= 16 ? '红色' : number >= 17 && number <= 32 ? '蓝色' : '绿色'}">${item.num}</div></div>
          </div>
          <div class="history-col">
            <div class="history-label">出现次数</div>
            <div class="history-value">${item.count}次</div>
          </div>
          <div class="history-col">
            <div class="history-label">最近出现</div>
            <div class="history-value">第${item.lastOccurrence}期</div>
          </div>
          <div class="history-col">
            <div class="history-label">历史记录</div>
            <div class="history-value">
              <button class="btn-mini" onclick="Business.viewNumberHistory('${item.num}')">查看</button>
            </div>
          </div>
        `;
        tableBody.appendChild(row);
      });
    } catch (e) {
      console.error('渲染热门TOP5历史表格失败:', e);
    }
  },

  // 加载预测历史
  loadPredictionHistory() {
    try {
      const predictionHistory = Storage.get('predictionHistory', []);
      this.renderPredictionTable(predictionHistory);
      this.renderPredictionPagination(predictionHistory, 1, 10);
    } catch (e) {
      console.error('加载预测历史失败:', e);
    }
  },

  // 渲染预测历史表格
  renderPredictionTable(data, page = 1, pageSize = 10) {
    try {
      const tableBody = document.getElementById('predictionTableBody');
      if (!tableBody) return;

      tableBody.innerHTML = '';

      if (data.length === 0) {
        tableBody.innerHTML = '<div class="empty-tip">暂无预测历史记录</div>';
        return;
      }

      // 分页处理
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const paginatedData = data.slice(startIndex, endIndex);

      paginatedData.forEach(item => {
        const row = document.createElement('div');
        row.className = 'history-row';
        row.innerHTML = `
          <div class="history-col">
            <div class="history-label">预测时间</div>
            <div class="history-value">${new Date(item.timestamp).toLocaleString()}</div>
          </div>
          <div class="history-col">
            <div class="history-label">预测号码</div>
            <div class="history-value">
              <div class="draw-numbers" style="justify-content: flex-start;">
                ${item.numbers.map(num => {
                  const number = parseInt(num);
                  let colorClass = '';
                  if (number >= 1 && number <= 16) {
                    colorClass = '红色';
                  } else if (number >= 17 && number <= 32) {
                    colorClass = '蓝色';
                  } else {
                    colorClass = '绿色';
                  }
                  return `<div class="num-item"><div class="num-ball ${colorClass}">${num}</div></div>`;
                }).join('')}
              </div>
            </div>
          </div>
          <div class="history-col">
            <div class="history-label">预测结果</div>
            <div class="history-value">${item.result ? '命中' : '未命中'}</div>
          </div>
          <div class="history-col">
            <div class="history-label">期号</div>
            <div class="history-value">${item.issue || '--'}</div>
          </div>
          <div class="history-col">
            <div class="history-label">操作</div>
            <div class="history-value">
              <button class="btn-mini" onclick="Business.viewPredictionDetail(${data.indexOf(item)})">查看</button>
            </div>
          </div>
        `;
        tableBody.appendChild(row);
      });
    } catch (e) {
      console.error('渲染预测历史表格失败:', e);
    }
  },

  // 渲染预测历史分页
  renderPredictionPagination(data, currentPage, pageSize) {
    try {
      const pagination = document.getElementById('predictionPagination');
      if (!pagination) return;

      const totalPages = Math.ceil(data.length / pageSize);
      pagination.innerHTML = '';

      if (totalPages <= 1) return;

      // 上一页按钮
      const prevBtn = document.createElement('button');
      prevBtn.textContent = '上一页';
      prevBtn.disabled = currentPage === 1;
      prevBtn.onclick = () => {
        if (currentPage > 1) {
          this.renderPredictionTable(data, currentPage - 1, pageSize);
          this.renderPredictionPagination(data, currentPage - 1, pageSize);
        }
      };
      pagination.appendChild(prevBtn);

      // 页码按钮
      for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i;
        pageBtn.className = i === currentPage ? 'active' : '';
        pageBtn.onclick = () => {
          this.renderPredictionTable(data, i, pageSize);
          this.renderPredictionPagination(data, i, pageSize);
        };
        pagination.appendChild(pageBtn);
      }

      // 下一页按钮
      const nextBtn = document.createElement('button');
      nextBtn.textContent = '下一页';
      nextBtn.disabled = currentPage === totalPages;
      nextBtn.onclick = () => {
        if (currentPage < totalPages) {
          this.renderPredictionTable(data, currentPage + 1, pageSize);
          this.renderPredictionPagination(data, currentPage + 1, pageSize);
        }
      };
      pagination.appendChild(nextBtn);
    } catch (e) {
      console.error('渲染预测历史分页失败:', e);
    }
  },

  // 绑定记录页面事件
  bindRecordEvents() {
    try {
      // 筛选面板切换（新版2.0风格）
      const filterButtons = document.querySelectorAll('[data-action^="toggle"]');
      filterButtons.forEach(button => {
        button.addEventListener('click', () => {
          const action = button.dataset.action;
          const panelId = action.replace('toggle', '') + 'Panel';
          const panel = document.getElementById(panelId);
          if (panel) {
            // 使用style.display切换显示/隐藏
            const isHidden = panel.style.display === 'none' || panel.style.display === '';
            panel.style.display = isHidden ? 'block' : 'none';
          }
        });
      });

      // 刷新按钮
      const refreshButtons = document.querySelectorAll('[data-action^="refresh"]');
      refreshButtons.forEach(button => {
        button.addEventListener('click', () => {
          const action = button.dataset.action;
          switch (action) {
            case 'refreshRecord':
              this.initRecordPage();
              Toast.show('刷新成功');
              break;
            case 'refreshLatest':
              this.loadLatestDraw();
              Toast.show('刷新成功');
              break;
            case 'refreshHotHistory':
              this.loadHotHistory();
              Toast.show('刷新成功');
              break;
          }
        });
      });

      // 期数筛选按钮
      const periodButtons = document.querySelectorAll('.history-period-btn, .special-period-btn, .prediction-period-btn');
      periodButtons.forEach(button => {
        button.addEventListener('click', () => {
          // 移除同组按钮的激活状态
          const siblings = button.parentElement.querySelectorAll('button');
          siblings.forEach(sib => sib.classList.remove('active'));
          // 添加当前激活状态
          button.classList.add('active');
        });
      });

      // 确认筛选按钮
      const confirmButtons = document.querySelectorAll('[data-action^="confirm"]');
      confirmButtons.forEach(button => {
        button.addEventListener('click', () => {
          const action = button.dataset.action;
          switch (action) {
            case 'confirmHistoryFilter':
              this.applyHistoryFilter();
              break;
            case 'confirmSpecialFilter':
              this.applySpecialFilter();
              break;
            case 'confirmPredictionFilter':
              this.applyPredictionFilter();
              break;
          }
        });
      });

      // 重置筛选按钮
      const resetButtons = document.querySelectorAll('[data-action^="reset"]');
      resetButtons.forEach(button => {
        button.addEventListener('click', () => {
          const action = button.dataset.action;
          switch (action) {
            case 'resetHistoryFilter':
              this.resetHistoryFilter();
              break;
            case 'resetSpecialFilter':
              this.resetSpecialFilter();
              break;
            case 'resetPredictionFilter':
              this.resetPredictionFilter();
              break;
          }
        });
      });
    } catch (e) {
      console.error('绑定记录页面事件失败:', e);
    }
  },



  // 应用历史记录筛选
  applyHistoryFilter() {
    try {
      const activePeriod = document.querySelector('.history-period-btn.active');
      const period = activePeriod ? activePeriod.dataset.period : 'all';
      
      const historyData = StateManager._state?.analysis?.historyData || [];
      let filteredData = historyData;
      
      if (period !== 'all') {
        const periodNum = parseInt(period);
        filteredData = historyData.slice(0, periodNum);
      }
      
      this.renderHistoryTable(filteredData);
      this.renderHistoryPagination(filteredData, 1, 10);
      
      // 隐藏筛选面板
      const panel = document.getElementById('historyFilterPanel');
      if (panel) {
        panel.style.display = 'none';
      }
      
      Toast.show('筛选成功');
    } catch (e) {
      console.error('应用历史记录筛选失败:', e);
    }
  },

  // 重置历史记录筛选
  resetHistoryFilter() {
    try {
      const buttons = document.querySelectorAll('.history-period-btn');
      buttons.forEach(btn => btn.classList.remove('active'));
      const allBtn = document.querySelector('.history-period-btn[data-period="all"]');
      if (allBtn) {
        allBtn.classList.add('active');
      }
      
      this.loadHistoryRecords();
    } catch (e) {
      console.error('重置历史记录筛选失败:', e);
    }
  },

  // 应用特码历史筛选
  applySpecialFilter() {
    try {
      const activePeriod = document.querySelector('.special-period-btn.active');
      const period = activePeriod ? activePeriod.dataset.period : 'all';
      
      const historyData = StateManager._state?.analysis?.historyData || [];
      let filteredData = historyData;
      
      if (period !== 'all') {
        const periodNum = parseInt(period);
        filteredData = historyData.slice(0, periodNum);
      }
      
      this.renderSpecialTable(filteredData);
      this.renderSpecialPagination(filteredData, 1, 10);
      
      // 隐藏筛选面板
      const panel = document.getElementById('specialFilterPanel');
      if (panel) {
        panel.style.display = 'none';
      }
      
      Toast.show('筛选成功');
    } catch (e) {
      console.error('应用特码历史筛选失败:', e);
    }
  },

  // 重置特码历史筛选
  resetSpecialFilter() {
    try {
      const buttons = document.querySelectorAll('.special-period-btn');
      buttons.forEach(btn => btn.classList.remove('active'));
      const allBtn = document.querySelector('.special-period-btn[data-period="all"]');
      if (allBtn) {
        allBtn.classList.add('active');
      }
      
      this.loadSpecialHistory();
    } catch (e) {
      console.error('重置特码历史筛选失败:', e);
    }
  },

  // 应用预测历史筛选
  applyPredictionFilter() {
    try {
      const activePeriod = document.querySelector('.prediction-period-btn.active');
      const period = activePeriod ? activePeriod.dataset.period : 'all';
      
      const predictionHistory = Storage.get('predictionHistory', []);
      let filteredData = predictionHistory;
      
      if (period !== 'all') {
        const periodDays = parseInt(period);
        const cutoffTime = Date.now() - (periodDays * 24 * 60 * 60 * 1000);
        filteredData = predictionHistory.filter(item => item.timestamp >= cutoffTime);
      }
      
      this.renderPredictionTable(filteredData);
      this.renderPredictionPagination(filteredData, 1, 10);
      
      // 隐藏筛选面板
      const panel = document.getElementById('predictionFilterPanel');
      if (panel) {
        panel.style.display = 'none';
      }
      
      Toast.show('筛选成功');
    } catch (e) {
      console.error('应用预测历史筛选失败:', e);
    }
  },

  // 重置预测历史筛选
  resetPredictionFilter() {
    try {
      const buttons = document.querySelectorAll('.prediction-period-btn');
      buttons.forEach(btn => btn.classList.remove('active'));
      const allBtn = document.querySelector('.prediction-period-btn[data-period="all"]');
      if (allBtn) {
        allBtn.classList.add('active');
      }
      
      this.loadPredictionHistory();
    } catch (e) {
      console.error('重置预测历史筛选失败:', e);
    }
  },

  // 根据号码获取生肖
  getZodiacByNumber(number) {
    const zodiacs = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
    return zodiacs[(number - 1) % 12];
  },

  // 查看开奖详情
  viewDrawDetail(issue) {
    try {
      console.log('查看开奖详情:', issue);
      // 这里可以实现查看详情的逻辑
    } catch (e) {
      console.error('查看开奖详情失败:', e);
    }
  },

  // 查看号码历史
  viewNumberHistory(number) {
    try {
      console.log('查看号码历史:', number);
      // 这里可以实现查看号码历史的逻辑
    } catch (e) {
      console.error('查看号码历史失败:', e);
    }
  },

  // 查看预测详情
  viewPredictionDetail(index) {
    try {
      console.log('查看预测详情:', index);
      // 这里可以实现查看预测详情的逻辑
    } catch (e) {
      console.error('查看预测详情失败:', e);
    }
  }
};

export { record };