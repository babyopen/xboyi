// ====================== 应用入口模块 ======================

// 导入所有必要的模块
import { Render } from './render.js';
import { DataQuery } from './data-query.js';
import { Storage } from './storage.js';
import { StateManager } from './state-manager.js';
import { Business } from './business/index.js';
import { EventBinder } from './event-binder.js';
import { Toast } from './toast.js';
import { CONFIG } from './config.js';
import { Utils } from './utils.js';
import { PerformanceMonitor } from './performance-monitor.js';

/**
 * 应用初始化
 */
async function initApp() {
  try {
    // 初始化性能监控
    PerformanceMonitor.init();
    
    // 1. 生成生肖数据
    Render.buildZodiacCycle();
    // 2. 生成号码基础数据
    Render.buildNumList();
    // 3. 初始化数据查询模块（打通所有数据关联）
    DataQuery.init();
    // 4. 渲染生肖标签
    Render.renderZodiacTags();
    // 5. 渲染排除号码网格
    Render.renderExcludeGrid();
    // 6. 加载本地存储的方案
    Storage.loadSavedFilters();
    // 7. 加载本地存储的收藏
    Storage.loadFavorites();
    // 8. 渲染方案列表
    Render.renderFilterList();
    // 9. 尝试从缓存加载历史数据
    const cache = Storage.loadHistoryCache();
    let hasValidCache = false;
    if(cache.data && cache.data.length > 0) {
      const newAnalysis = { 
        ...StateManager._state.analysis, 
        historyData: cache.data 
      };
      StateManager.setState({ analysis: newAnalysis }, false);
      hasValidCache = true;
      
      // 有缓存数据时，立即渲染一次
      try {
        Business.renderLatest(cache.data[0]);
      } catch(e) { console.warn('renderLatest 执行失败:', e); }
      try {
        Business.renderHistory();
      } catch(e) { console.warn('renderHistory 执行失败:', e); }
      try {
        Business.renderFullAnalysis();
      } catch(e) { console.warn('renderFullAnalysis 执行失败:', e); }
      try {
        Business.renderZodiacAnalysis();
      } catch(e) { console.warn('renderZodiacAnalysis 执行失败:', e); }
      try {
        Business.updateHotColdStatus();
      } catch(e) { console.warn('updateHotColdStatus 执行失败:', e); }
    }
    
    // 无论是否有缓存，都在后台静默刷新获取最新数据
    // 如果有缓存，刷新后如果数据有变化会自动更新
    setTimeout(() => {
      try {
        if(hasValidCache) {
          Business.silentRefreshHistory();
        } else {
          // 没有缓存时，直接正常加载
          Business.refreshHistory(true);
        }
      } catch(e) { console.warn('刷新历史数据失败:', e); }
    }, 1000);
    
    // 10. 加载预测历史勾选状态并渲染
    try {
      Business.loadPredictionHistoryFilter();
    } catch(e) { console.warn('loadPredictionHistoryFilter 执行失败:', e); }
    try {
      Business.renderZodiacPredictionHistory();
    } catch(e) { console.warn('renderZodiacPredictionHistory 执行失败:', e); }
    
    // 11. 加载精选特码历史并渲染
    const specialHistory = Storage.loadSpecialHistory();
    StateManager.setState({ specialHistory: specialHistory }, false);
    // 先加载用户之前保存的筛选状态
    try {
      Business.loadSpecialHistoryFilter();
    } catch(e) { console.warn('loadSpecialHistoryFilter 执行失败:', e); }
    
    // 根据自动模式的初始状态，设置精选特码历史的默认显示模式
    const state = StateManager._state;
    const currentSystemMode = state.analysis.specialMode || 'auto';
    let defaultHistoryMode = state.specialHistoryModeFilter || 'all';
    
    // 如果当前是"全部"模式，根据系统模式自动调整
    if(defaultHistoryMode === 'all') {
      if(currentSystemMode === 'hot') {
        defaultHistoryMode = 'hot';
      } else if(currentSystemMode === 'cold') {
        defaultHistoryMode = 'cold';
      } else if(currentSystemMode === 'auto') {
        // 自动模式：根据当前分析结果决定显示什么模式
        try {
          const data = Business.calcZodiacAnalysis(10);
          if(data) {
            defaultHistoryMode = Business.decideAutoMode(data);
          } else {
            defaultHistoryMode = 'hot';
          }
        } catch(e) {
          console.warn('计算生肖分析失败:', e);
          defaultHistoryMode = 'hot';
        }
      }
    }
    
    // 更新精选特码历史的显示模式
    StateManager.setState({ specialHistoryModeFilter: defaultHistoryMode }, false);
    
    // 更新精选特码历史按钮样式
    document.querySelectorAll('.special-history-mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === defaultHistoryMode);
    });
    
    // 11.5. 加载精选生肖历史
    const selectedZodiacHistory = Storage.loadSelectedZodiacHistory();
    StateManager.setState({ selectedZodiacHistory: selectedZodiacHistory }, false);
    
    // 11.6. 加载特码热门top5历史
    const hotNumbersHistory = Storage.loadHotNumbersHistory();
    StateManager.setState({ hotNumbersHistory: hotNumbersHistory }, false);

    // 12. 初始化滑动处理器
    Utils.initSwipeHandlers();
    // 13. 初始化事件绑定
    EventBinder.init();
    // 14. 启动分析页面倒计时和自动刷新检查
    try {
      Business.startCountdown();
    } catch(e) { console.warn('startCountdown 执行失败:', e); }
    try {
      Business.checkDrawTimeLoop();
    } catch(e) { console.warn('checkDrawTimeLoop 执行失败:', e); }
    // 14.1 初始化分析页面
    try {
      Business.initAnalysisPage();
    } catch(e) { console.warn('initAnalysisPage 执行失败:', e); }
    // 14.2 设置底部导航栏初始样式（筛选页面需要给快捷导航让位置）
    const bottomNav = document.querySelector('.bottom-nav');
    if(bottomNav) {
      bottomNav.classList.add('needs-space');
    }
    
    // 15. 确保记录页面DOM可用，强制渲染一次（即使页面隐藏）
    // 使用单次渲染替代多次重复渲染
    try {
      const recordPage = document.getElementById('recordPage');
      if(recordPage) {
        // 临时显示记录页面以确保渲染成功
        const originalDisplay = recordPage.style.display;
        recordPage.style.display = 'block';
        
        // 统一渲染精选特码历史和精选生肖历史（仅一次）
        try {
          Business.renderSpecialHistory();
        } catch(e) { console.warn('renderSpecialHistory 执行失败:', e); }
        try {
          Business.renderSelectedZodiacHistory();
        } catch(e) { console.warn('renderSelectedZodiacHistory 执行失败:', e); }
        try {
          Business.renderHotNumbersHistory();
        } catch(e) { console.warn('renderHotNumbersHistory 执行失败:', e); }
        
        // 恢复原显示状态
        recordPage.style.display = originalDisplay;
      }
    } catch(e) {
      console.error('预渲染记录页面失败', e);
    }
    
    // 16. 隐藏加载遮罩
    Render.hideLoading();
    
    // 17. 添加页面可见性监听器：页面从后台切换回来时刷新数据
    document.addEventListener('visibilitychange', () => {
      if(document.visibilityState === 'visible') {
        // 页面变为可见时，静默刷新数据
        setTimeout(() => {
          try {
            Business.silentRefreshHistory();
          } catch(e) { console.warn('静默刷新数据失败:', e); }
        }, 500);
      }
    });
    
    // 延迟静默更新预测历史并保存精选特码和精选生肖
    setTimeout(() => {
      try {
        Business.silentUpdateAllPredictionHistory();
      } catch(e) { console.warn('silentUpdateAllPredictionHistory 执行失败:', e); }
      // 同时更新精选特码历史和精选生肖历史的开奖记录比较
      try {
        Business.updateSpecialHistoryComparison();
      } catch(e) { console.warn('updateSpecialHistoryComparison 执行失败:', e); }
      try {
        Business.updateSelectedZodiacHistoryComparison();
      } catch(e) { console.warn('updateSelectedZodiacHistoryComparison 执行失败:', e); }
      try {
        Business.updateHotNumbersHistoryComparison();
      } catch(e) { console.warn('updateHotNumbersHistoryComparison 执行失败:', e); }
      // 统一重新渲染以显示最新比较结果（仅一次）
      try {
        Business.renderSpecialHistory();
      } catch(e) { console.warn('renderSpecialHistory 执行失败:', e); }
      try {
        Business.renderSelectedZodiacHistory();
      } catch(e) { console.warn('renderSelectedZodiacHistory 执行失败:', e); }
      try {
        Business.renderHotNumbersHistory();
      } catch(e) { console.warn('renderHotNumbersHistory 执行失败:', e); }
      
      // 后台静默生成并保存所有精选特码组合
      try {
        Business.silentSaveAllSpecialCombinations();
      } catch(e) {
        console.error('后台静默保存精选特码失败', e);
      }
      
      // 后台静默生成并保存所有精选生肖组合
      try {
        Business.silentSaveAllSelectedZodiacs();
      } catch(e) {
        console.error('后台静默保存精选生肖失败', e);
      }
      
      // 后台静默生成并保存特码热门top5
      try {
        Business.silentSaveHotNumbers();
      } catch(e) {
        console.error('后台静默保存特码热门top5失败', e);
      }
    }, 3000);
    
    // 初始化ML服务状态检测（可选的，不影响主功能）
    try {
      Business.initMLServiceChecker();
    } catch(e) {
      console.debug('ML服务初始化失败，不影响主功能:', e.message);
    }
    
    // 应用初始化完成
    console.log('应用初始化完成');
    PerformanceMonitor.logMetrics();
  } catch(e) {
    console.error('应用初始化失败', e);
    Toast.show('页面初始化失败，请刷新重试');
    Render.hideLoading();
  }
}

// 为了兼容原 HTML 中的内联 onclick，将 Business 挂载到 window
window.Business = Business;

// 添加缺失的方法作为临时解决方案
if (!Business.switchBottomNav) {
  Business.switchBottomNav = (targetPage) => {
    try {
      // 页面映射：索引 -> 页面 ID
      const pageMap = {
        0: 'filterPage',
        1: 'analysisPage',
        2: 'recordPage',
        3: 'profilePage'
      };

      // 处理数字索引
      let pageId;
      if (typeof targetPage === 'number' || !isNaN(targetPage)) {
        pageId = pageMap[targetPage] || 'filterPage';
      } else {
        pageId = targetPage;
      }

      // 隐藏所有页面
      const pages = ['filterPage', 'analysisPage', 'recordPage', 'profilePage'];
      pages.forEach(id => {
        const page = document.getElementById(id);
        if (page) {
          page.style.display = 'none';
        }
      });

      // 显示目标页面
      const target = document.getElementById(pageId);
      if (target) {
        target.style.display = 'block';
      }

      // 根据当前页面决定是否显示顶部结果展示区
      const topBox = document.getElementById('topBox');
      if (topBox) {
        if (pageId === 'filterPage') {
          topBox.style.display = 'block';
        } else {
          topBox.style.display = 'none';
        }
      }

      // 根据当前页面调整 body-box 的 margin-top
      const bodyBox = document.querySelector('.body-box');
      if (bodyBox) {
        if (pageId === 'filterPage') {
          bodyBox.style.marginTop = 'var(--top-offset)';
        } else {
          bodyBox.style.marginTop = '0';
        }
      }

      // 更新导航按钮状态
      const navButtons = document.querySelectorAll('.bottom-nav-item');
      navButtons.forEach(btn => {
        btn.classList.remove('active');
      });

      // 激活当前按钮
      const activeBtn = document.querySelector(`.bottom-nav-item[data-index="${Object.keys(pageMap).find(key => pageMap[key] === pageId)}"]`);
      if (activeBtn) {
        activeBtn.classList.add('active');
      }

      // 如果切换到记录页面，完整渲染所有记录
      if (pageId === 'recordPage') {
        try {
          Business.renderAllRecords();
        } catch (e) {
          console.error('渲染记录页面失败:', e);
        }
      }
    } catch(e) {
      console.error('切换底部导航失败:', e);
    }
  };
}

// 修复事件绑定中的导航操作，让它能够正确处理 data-index 属性
if (EventBinder && EventBinder.handleGlobalClick) {
  const originalHandleGlobalClick = EventBinder.handleGlobalClick;
  EventBinder.handleGlobalClick = (e) => {
    const target = e.target;
    const actionBtn = target.closest('[data-action]');
    if(actionBtn && actionBtn.dataset.action === 'switchBottomNav') {
      // 优先使用 data-index
      if(actionBtn.dataset.index) {
        Business.switchBottomNav(Number(actionBtn.dataset.index));
        return;
      }
    }
    originalHandleGlobalClick(e);
  };
}

// 页面加载完成后，确保默认显示筛选页
window.addEventListener('DOMContentLoaded', () => {
  try {
    // 隐藏所有页面
    const pages = ['filterPage', 'analysisPage', 'recordPage', 'profilePage'];
    pages.forEach(id => {
      const page = document.getElementById(id);
      if (page) {
        page.style.display = 'none';
      }
    });

    // 显示筛选页
    const filterPage = document.getElementById('filterPage');
    if (filterPage) {
      filterPage.style.display = 'block';
    }

    // 显示顶部结果展示区（因为默认显示的是筛选页）
    const topBox = document.getElementById('topBox');
    if (topBox) {
      topBox.style.display = 'block';
    }

    // 设置 body-box 的 margin-top（因为默认显示的是筛选页）
    const bodyBox = document.querySelector('.body-box');
    if (bodyBox) {
      bodyBox.style.marginTop = 'var(--top-offset)';
    }

    // 更新导航按钮状态
    const navButtons = document.querySelectorAll('.bottom-nav-item');
    navButtons.forEach(btn => {
      btn.classList.remove('active');
    });

    // 激活筛选按钮
    const filterBtn = document.querySelector('.bottom-nav-item[data-index="0"]');
    if (filterBtn) {
      filterBtn.classList.add('active');
    }
  } catch(e) {
    console.error('初始化页面失败:', e);
  }
});

if (!Business.toggleQuickNav) {
  Business.toggleQuickNav = (force) => {
    const quickNavMenu = document.getElementById('quickNavMenu');
    if(quickNavMenu) {
      if(force === true) {
        quickNavMenu.classList.add('show');
      } else if(force === false) {
        quickNavMenu.classList.remove('show');
      } else {
        quickNavMenu.classList.toggle('show');
      }
    }
  };
}

if (!Business.silentSaveAllSpecialCombinations) {
  Business.silentSaveAllSpecialCombinations = () => {
    try {
      console.log('后台静默保存精选特码组合');
    } catch(e) {
      console.error('后台静默保存精选特码失败:', e);
    }
  };
}

if (!Business.silentSaveAllSelectedZodiacs) {
  Business.silentSaveAllSelectedZodiacs = () => {
    try {
      console.log('后台静默保存精选生肖');
    } catch(e) {
      console.error('后台静默保存精选生肖失败:', e);
    }
  };
}

if (!Business.silentSaveHotNumbers) {
  Business.silentSaveHotNumbers = () => {
    try {
      console.log('后台静默保存特码热门TOP5');
    } catch(e) {
      console.error('后台静默保存特码热门TOP5失败:', e);
    }
  };
}

if (!Business.scrollToModule) {
  Business.scrollToModule = (targetId) => {
    try {
      const element = document.getElementById(targetId);
      if(element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } catch(e) {
      console.error('滚动到指定模块失败:', e);
    }
  };
}

if (!Business.toggleExclude) {
  Business.toggleExclude = (num) => {
    try {
      const state = StateManager._state;
      if(state.lockExclude) return;

      const newExcluded = [...state.excluded];
      const newHistory = [...state.excludeHistory];

      if(newExcluded.includes(num)){
        newHistory.push([num, 'out']);
        const index = newExcluded.indexOf(num);
        newExcluded.splice(index, 1);
      } else {
        newHistory.push([num, 'in']);
        newExcluded.push(num);
      }

      StateManager.setState({ excluded: newExcluded, excludeHistory: newHistory });
    } catch(e) {
      console.error('切换号码排除状态失败:', e);
    }
  };
}

if (!Business.saveFilterPrompt) {
  Business.saveFilterPrompt = () => {
    try {
      const name = prompt('请输入方案名称:');
      if(!name || !name.trim()) return;

      const state = StateManager._state;
      const filterItem = {
        name: name.trim(),
        selected: Utils.deepClone(state.selected),
        excluded: [...state.excluded],
        timestamp: Date.now()
      };

      const success = Storage.saveFilter(filterItem);
      if(success) {
        Toast.show('方案保存成功');
      } else {
        Toast.show('方案保存失败');
      }
    } catch(e) {
      console.error('保存方案失败:', e);
      Toast.show('保存方案失败');
    }
  };
}

if (!Business.invertExclude) {
  Business.invertExclude = () => {
    try {
      const state = StateManager._state;
      if(state.lockExclude) return;

      const allNums = Array.from({length: 49}, (_, i) => i + 1);
      const newExcluded = allNums.filter(num => !state.excluded.includes(num));
      const newHistory = [...state.excludeHistory, ...newExcluded.map(num => [num, 'in'])];

      StateManager.setState({ excluded: newExcluded, excludeHistory: newHistory });
    } catch(e) {
      console.error('反选排除号码失败:', e);
    }
  };
}

if (!Business.undoExclude) {
  Business.undoExclude = () => {
    try {
      const state = StateManager._state;
      if(state.lockExclude || state.excludeHistory.length === 0) return;

      const lastAction = state.excludeHistory.pop();
      const [num, action] = lastAction;
      const newExcluded = [...state.excluded];

      if(action === 'in') {
        const index = newExcluded.indexOf(num);
        if(index > -1) newExcluded.splice(index, 1);
      } else {
        newExcluded.push(num);
      }

      StateManager.setState({ excluded: newExcluded, excludeHistory: state.excludeHistory });
    } catch(e) {
      console.error('撤销排除号码失败:', e);
    }
  };
}

if (!Business.batchExcludePrompt) {
  Business.batchExcludePrompt = () => {
    try {
      const input = prompt('请输入要排除的号码，用逗号分隔:');
      if(!input) return;

      const nums = input.split(',').map(n => Number(n.trim())).filter(n => !isNaN(n) && n >= 1 && n <= 49);
      if(nums.length === 0) return;

      const state = StateManager._state;
      const newExcluded = [...state.excluded];
      const newHistory = [...state.excludeHistory];

      nums.forEach(num => {
        if(!newExcluded.includes(num)) {
          newExcluded.push(num);
          newHistory.push([num, 'in']);
        }
      });

      StateManager.setState({ excluded: newExcluded, excludeHistory: newHistory });
    } catch(e) {
      console.error('批量排除号码失败:', e);
    }
  };
}

if (!Business.clearExclude) {
  Business.clearExclude = () => {
    try {
      StateManager.setState({ excluded: [], excludeHistory: [] });
    } catch(e) {
      console.error('清除排除号码失败:', e);
    }
  };
}

if (!Business.toggleShowAllFilters) {
  Business.toggleShowAllFilters = () => {
    try {
      const state = StateManager._state;
      StateManager.setState({ showAllFilters: !state.showAllFilters });
    } catch(e) {
      console.error('切换显示所有方案失败:', e);
    }
  };
}

if (!Business.loadFilter) {
  Business.loadFilter = (index) => {
    try {
      const state = StateManager._state;
      const filterItem = state.savedFilters[index];
      if(!filterItem) return;

      StateManager.setState({ selected: filterItem.selected, excluded: filterItem.excluded });
    } catch(e) {
      console.error('加载方案失败:', e);
    }
  };
}

if (!Business.renameFilter) {
  Business.renameFilter = (index) => {
    try {
      const state = StateManager._state;
      const filterItem = state.savedFilters[index];
      if(!filterItem) return;

      const newName = prompt('请输入新的方案名称:', filterItem.name);
      if(!newName || !newName.trim()) return;

      filterItem.name = newName.trim();
      Storage.set(Storage.KEYS.SAVED_FILTERS, state.savedFilters);
      StateManager.setState({ savedFilters: state.savedFilters });
    } catch(e) {
      console.error('重命名方案失败:', e);
    }
  };
}

if (!Business.copyFilterNums) {
  Business.copyFilterNums = (index) => {
    try {
      const state = StateManager._state;
      const filterItem = state.savedFilters[index];
      if(!filterItem) return;

      StateManager.setState({ selected: filterItem.selected, excluded: filterItem.excluded });
    } catch(e) {
      console.error('复制方案号码失败:', e);
    }
  };
}

if (!Business.topFilter) {
  Business.topFilter = (index) => {
    try {
      const state = StateManager._state;
      const filterItem = state.savedFilters[index];
      if(!filterItem) return;

      const newList = [filterItem, ...state.savedFilters.filter((_, i) => i !== index)];
      Storage.set(Storage.KEYS.SAVED_FILTERS, newList);
      StateManager.setState({ savedFilters: newList });
    } catch(e) {
      console.error('置顶方案失败:', e);
    }
  };
}

if (!Business.favoriteFilter) {
  Business.favoriteFilter = (index) => {
    try {
      const state = StateManager._state;
      const filterItem = state.savedFilters[index];
      if(!filterItem) return;

      const favorites = Storage.get('favorites', []);
      favorites.push(filterItem);
      Storage.set('favorites', favorites);
      StateManager.setState({ favorites: favorites });
    } catch(e) {
      console.error('收藏方案失败:', e);
    }
  };
}

if (!Business.loadFavorite) {
  Business.loadFavorite = (index) => {
    try {
      const state = StateManager._state;
      const favoriteItem = state.favorites[index];
      if(!favoriteItem) return;

      StateManager.setState({ selected: favoriteItem.selected, excluded: favoriteItem.excluded });
    } catch(e) {
      console.error('加载收藏方案失败:', e);
    }
  };
}

if (!Business.renameFavorite) {
  Business.renameFavorite = (index) => {
    try {
      const state = StateManager._state;
      const favoriteItem = state.favorites[index];
      if(!favoriteItem) return;

      const newName = prompt('请输入新的收藏名称:', favoriteItem.name);
      if(!newName || !newName.trim()) return;

      favoriteItem.name = newName.trim();
      Storage.set('favorites', state.favorites);
      StateManager.setState({ favorites: state.favorites });
    } catch(e) {
      console.error('重命名收藏方案失败:', e);
    }
  };
}

if (!Business.copyFavorite) {
  Business.copyFavorite = (index) => {
    try {
      const state = StateManager._state;
      const favoriteItem = state.favorites[index];
      if(!favoriteItem) return;

      StateManager.setState({ selected: favoriteItem.selected, excluded: favoriteItem.excluded });
    } catch(e) {
      console.error('复制收藏方案号码失败:', e);
    }
  };
}

if (!Business.syncZodiacAnalyze) {
  Business.syncZodiacAnalyze = () => {
    try {
      console.log('同步生肖分析');
    } catch(e) {
      console.error('同步生肖分析失败:', e);
    }
  };
}

if (!Business.toggleDetail) {
  Business.toggleDetail = (targetId) => {
    try {
      const targetElementId = targetId || 'detailPanel';
      const detailPanel = document.getElementById(targetElementId);
      if(detailPanel) {
        detailPanel.classList.toggle('show');
        // 同时更新按钮文本
        const button = document.querySelector(`[data-action="toggleDetail"][data-target="${targetElementId}"]`);
        if(button) {
          if(detailPanel.classList.contains('show')) {
            button.textContent = '收起详情';
          } else {
            button.textContent = '展开详情';
          }
        }
      }
    } catch(e) {
      console.error('切换详情失败:', e);
    }
  };
}

if (!Business.loadMoreHistory) {
  Business.loadMoreHistory = () => {
    try {
      console.log('加载更多历史数据');
    } catch(e) {
      console.error('加载更多历史数据失败:', e);
    }
  };
}

if (!Business.copyHotNumbers) {
  Business.copyHotNumbers = () => {
    try {
      console.log('复制热门号码');
    } catch(e) {
      console.error('复制热门号码失败:', e);
    }
  };
}

if (!Business.copyZodiacNumbers) {
  Business.copyZodiacNumbers = () => {
    try {
      console.log('复制生肖号码');
    } catch(e) {
      console.error('复制生肖号码失败:', e);
    }
  };
}

if (!Business.favoriteZodiacNumbers) {
  Business.favoriteZodiacNumbers = () => {
    try {
      console.log('收藏生肖号码');
    } catch(e) {
      console.error('收藏生肖号码失败:', e);
    }
  };
}

if (!Business.refreshHotCold) {
  Business.refreshHotCold = () => {
    try {
      console.log('刷新冷热状态');
    } catch(e) {
      console.error('刷新冷热状态失败:', e);
    }
  };
}

if (!Business.selectAllPredictionPeriods) {
  Business.selectAllPredictionPeriods = () => {
    try {
      console.log('全选预测历史期数');
    } catch(e) {
      console.error('全选预测历史期数失败:', e);
    }
  };
}

if (!Business.resetPredictionPeriods) {
  Business.resetPredictionPeriods = () => {
    try {
      console.log('重置预测历史期数');
    } catch(e) {
      console.error('重置预测历史期数失败:', e);
    }
  };
}

if (!Business.togglePredictionFiltersPanel) {
  Business.togglePredictionFiltersPanel = () => {
    try {
      console.log('切换预测历史筛选面板');
    } catch(e) {
      console.error('切换预测历史筛选面板失败:', e);
    }
  };
}

if (!Business.confirmPredictionFilters) {
  Business.confirmPredictionFilters = () => {
    try {
      console.log('确认预测历史筛选条件');
    } catch(e) {
      console.error('确认预测历史筛选条件失败:', e);
    }
  };
}

if (!Business.toggleZodiacPredictionHistory) {
  Business.toggleZodiacPredictionHistory = () => {
    try {
      console.log('切换预测历史展开/折叠');
    } catch(e) {
      console.error('切换预测历史展开/折叠失败:', e);
    }
  };
}

if (!Business.checkAndUpdatePredictionStatus) {
  Business.checkAndUpdatePredictionStatus = () => {
    try {
      console.log('检查并更新预测状态');
    } catch(e) {
      console.error('检查并更新预测状态失败:', e);
    }
  };
}

if (!Business.updateSelectedZodiacHistoryComparison) {
  Business.updateSelectedZodiacHistoryComparison = () => {
    try {
      console.log('更新精选生肖历史比较');
    } catch(e) {
      console.error('更新精选生肖历史比较失败:', e);
    }
  };
}

if (!Business.renderPredictionStatistics) {
  Business.renderPredictionStatistics = () => {
    try {
      console.log('渲染预测统计');
    } catch(e) {
      console.error('渲染预测统计失败:', e);
    }
  };
}

if (!Business.renderSelectedZodiacHistory) {
  Business.renderSelectedZodiacHistory = () => {
    try {
      console.log('渲染精选生肖历史');
    } catch(e) {
      console.error('渲染精选生肖历史失败:', e);
    }
  };
}

if (!Business.toggleMLPredictionHistory) {
  Business.toggleMLPredictionHistory = () => {
    try {
      console.log('切换ML预测历史展开/折叠');
    } catch(e) {
      console.error('切换ML预测历史展开/折叠失败:', e);
    }
  };
}

if (!Business.renderMLPredictionHistory) {
  Business.renderMLPredictionHistory = () => {
    try {
      console.log('渲染ML预测历史');
    } catch(e) {
      console.error('渲染ML预测历史失败:', e);
    }
  };
}

if (!Business.toggleSpecialHistory) {
  Business.toggleSpecialHistory = () => {
    try {
      console.log('切换精选特码历史展开/折叠');
    } catch(e) {
      console.error('切换精选特码历史展开/折叠失败:', e);
    }
  };
}

if (!Business.toggleSpecialFiltersPanel) {
  Business.toggleSpecialFiltersPanel = () => {
    try {
      console.log('切换精选特码历史筛选面板');
    } catch(e) {
      console.error('切换精选特码历史筛选面板失败:', e);
    }
  };
}

if (!Business.confirmSpecialFilters) {
  Business.confirmSpecialFilters = () => {
    try {
      console.log('确认精选特码历史筛选条件');
    } catch(e) {
      console.error('确认精选特码历史筛选条件失败:', e);
    }
  };
}

if (!Business.switchSpecialHistoryMode) {
  Business.switchSpecialHistoryMode = (mode) => {
    try {
      console.log('切换精选特码历史模式筛选:', mode);
    } catch(e) {
      console.error('切换精选特码历史模式筛选失败:', e);
    }
  };
}

if (!Business.showStreakDetail) {
  Business.showStreakDetail = (streakType) => {
    try {
      console.log('显示连出详情:', streakType);
    } catch(e) {
      console.error('显示连出详情失败:', e);
    }
  };
}

if (!Business.showStatDetail) {
  Business.showStatDetail = (statType) => {
    try {
      console.log('显示统计详情:', statType);
    } catch(e) {
      console.error('显示统计详情失败:', e);
    }
  };
}

if (!Business.switchSpecialMode) {
  Business.switchSpecialMode = (mode) => {
    try {
      console.log('切换精选特码模式:', mode);
    } catch(e) {
      console.error('切换精选特码模式失败:', e);
    }
  };
}

if (!Business.toggleSelectedZodiacHistory) {
  Business.toggleSelectedZodiacHistory = () => {
    try {
      console.log('切换精选生肖历史展开/折叠');
    } catch(e) {
      console.error('切换精选生肖历史展开/折叠失败:', e);
    }
  };
}

if (!Business.toggleHotNumbersHistory) {
  Business.toggleHotNumbersHistory = () => {
    try {
      console.log('切换特码热门top5历史展开/折叠');
    } catch(e) {
      console.error('切换特码热门top5历史展开/折叠失败:', e);
    }
  };
}

if (!Business.switchHotNumbersHistoryPage) {
  Business.switchHotNumbersHistoryPage = (page) => {
    try {
      console.log('切换特码热门top5历史页码:', page);
    } catch(e) {
      console.error('切换特码热门top5历史页码失败:', e);
    }
  };
}



if (!Business.showZodiacDetail) {
  Business.showZodiacDetail = (zodiac) => {
    try {
      console.log('显示生肖详情:', zodiac);
    } catch(e) {
      console.error('显示生肖详情失败:', e);
    }
  };
}











// 页面加载完成后启动应用
window.addEventListener('DOMContentLoaded', initApp);
