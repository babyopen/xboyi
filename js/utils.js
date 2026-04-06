// ====================== 2. 工具函数模块（纯函数，无副作用）======================
/**
 * 通用工具函数
 * @namespace Utils
 */
import { CONFIG } from './config.js';

export const Utils = {
  /**
   * 节流函数（优化高频事件）
   * @param {Function} fn - 要执行的函数
   * @param {number} delay - 节流延迟(ms)
   * @returns {Function} 节流后的函数
   */
  throttle: (fn, delay) => {
    let timer = null;
    return function(...args) {
      if(!timer){
        timer = setTimeout(() => {
          fn.apply(this, args);
          timer = null;
        }, delay);
      }
    }
  },




  /**
   * 防抖函数（优化高频点击）
   * @param {Function} fn - 要执行的函数
   * @param {number} delay - 防抖延迟(ms)
   * @returns {Function} 防抖后的函数
   */
  debounce: (fn, delay) => {
    let timer = null;
    return function(...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    }
  },




  /**
   * 深拷贝对象
   * @param {any} obj - 要拷贝的对象
   * @returns {any} 拷贝后的对象
   */
  deepClone: (obj) => {
    try {
      if(typeof obj !== 'object' || obj === null) {
        return obj;
      }
      if(typeof structuredClone === 'function') {
        return structuredClone(obj);
      }
      return JSON.parse(JSON.stringify(obj));
    } catch(e) {
      console.error('深拷贝失败', e);
      return obj;
    }
  },

  /**
   * 标签值类型转换（解决数字/字符串匹配问题）
   * @param {string|number} value - 标签值
   * @param {string} group - 分组名
   * @returns {string|number} 转换后的值
   */
  formatTagValue: (value, group) => {
    return CONFIG.NUMBER_GROUPS.includes(group) ? Number(value) : value;
  },

  /**
   * 获取安全区顶部高度
   * @returns {number} 安全区高度(px)
   */
  getSafeTop: () => {
    return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--safe-top')) || 0;
  },

  /**
   * 校验筛选方案格式
   * @param {any} item - 要校验的方案对象
   * @returns {boolean} 是否合法
   */
  validateFilterItem: (item) => {
    return item && 
      typeof item === 'object' && 
      typeof item.name === 'string' && 
      item.selected && typeof item.selected === 'object' &&
      Array.isArray(item.excluded);
  },

  /**
   * 生成DocumentFragment优化DOM渲染
   * @param {Array} list - 要渲染的列表
   * @param {Function} renderItem - 单个元素渲染函数
   * @returns {DocumentFragment} 生成的文档片段
   */
  createFragment: (list, renderItem) => {
    const fragment = document.createDocumentFragment();
    list.forEach((item, index) => {
      const el = renderItem(item, index);
      if(el) fragment.appendChild(el);
    });
    return fragment;
  },

  /**
   * HTML转义函数，防止XSS攻击
   * @param {string} text - 要转义的文本
   * @returns {string} 转义后的文本
   */
  escapeHtml: (text) => {
    if (typeof text !== 'string') return text;
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * 通用触摸滑动删除处理器
   */
  /**
   * 滑动处理器基类（工厂函数）
   * 统一处理左滑/右滑逻辑，减少代码重复
   */
  _createSwipeHandler: (options) => {
    const {
      threshold = -150,
      directionThreshold = 30,
      maxAngle = 45,
      isRightSwipe = false,
      onSwipeStart = null,
      onSwipeMove = null,
      onSwipeEnd = null
    } = options;

    return {
      _startX: {},
      _startY: {},
      _currentX: {},
      _currentY: {},
      _startTime: {},
      _isHorizontal: {},
      _hasDirection: {},
      _isValidSwipe: {},
      _threshold: threshold,
      _directionThreshold: directionThreshold,
      _maxAngle: maxAngle,
      _isRightSwipe: isRightSwipe,

      _getKey: (idx, prefix) => `${prefix}_${idx}`,

      _getSwipeAngle: (deltaX, deltaY) => {
        return Math.atan2(Math.abs(deltaY), Math.abs(deltaX)) * 180 / Math.PI;
      },

      _cleanup: function(key) {
        delete this._startX[key];
        delete this._startY[key];
        delete this._currentX[key];
        delete this._currentY[key];
        delete this._startTime[key];
        delete this._isHorizontal[key];
        delete this._hasDirection[key];
        delete this._isValidSwipe[key];
      },

      handleTouchStart: function(e, idx, prefix) {
        const key = this._getKey(idx, prefix);
        const touch = e.touches[0];
        
        this._startX[key] = touch.clientX;
        this._startY[key] = touch.clientY;
        this._currentX[key] = touch.clientX;
        this._currentY[key] = touch.clientY;
        this._startTime[key] = Date.now();
        this._isHorizontal[key] = false;
        this._hasDirection[key] = false;
        this._isValidSwipe[key] = false;

        if (onSwipeStart) {
          onSwipeStart(e, key);
        }
      },

      handleTouchMove: function(e, idx, prefix) {
        const key = this._getKey(idx, prefix);
        if (this._startX[key] === undefined) return;
        
        const touch = e.touches[0];
        this._currentX[key] = touch.clientX;
        this._currentY[key] = touch.clientY;
        
        const deltaX = touch.clientX - this._startX[key];
        const deltaY = touch.clientY - this._startY[key];
        const absDeltaX = Math.abs(deltaX);
        const absDeltaY = Math.abs(deltaY);
        
        // 方向判断阶段
        if (!this._hasDirection[key]) {
          if (absDeltaX > this._directionThreshold || absDeltaY > this._directionThreshold) {
            this._hasDirection[key] = true;
            const angle = this._getSwipeAngle(deltaX, deltaY);
            const isHorizontal = absDeltaX > absDeltaY && angle <= this._maxAngle;
            this._isHorizontal[key] = isHorizontal;
            
            // 判断滑动方向是否符合要求
            if (this._isRightSwipe) {
              this._isValidSwipe[key] = isHorizontal && deltaX > 0;
            } else {
              this._isValidSwipe[key] = isHorizontal && deltaX < 0;
            }
          }
        }
        
        // 如果不是有效滑动，不处理
        if (!this._isValidSwipe[key]) {
          return;
        }
        
        // 阻止默认行为
        e.preventDefault();
        
        if (onSwipeMove) {
          onSwipeMove(e, key, deltaX, absDeltaX);
        }
      },

      handleTouchEnd: function(e, idx, prefix, ...args) {
        const key = this._getKey(idx, prefix);
        
        if (onSwipeEnd) {
          const deltaX = (this._currentX[key] || this._startX[key]) - this._startX[key];
          const deltaTime = Date.now() - (this._startTime[key] || 0);
          onSwipeEnd(e, key, deltaX, deltaTime, ...args);
        }
        
        this._cleanup(key);
      }
    };
  },

  /**
   * 左滑删除处理器（精选特码历史）
   */
  SwipeDeleteHandler: null, // 将在下面初始化

  /**
   * 左滑复制处理器（精选生肖历史-旧版）
   */
  SwipeCopyHandler: null, // 将在下面初始化

  /**
   * 右滑复制处理器（精选特码/生肖历史）
   */

  /**
   * 向右滑动复制处理器（优化版）
   * 支持精选特码和精选生肖历史的右滑复制
   * 特点：低延迟、高精度、60fps动画、视觉反馈
   */
  SwipeRightCopyHandler: {
    _startX: {},
    _startY: {},
    _currentX: {},
    _currentY: {},
    _startTime: {},
    _threshold: 80, // 触发复制的滑动距离阈值（80px）
    _directionThreshold: 15, // 方向判断阈值（15px）
    _maxAngle: 30, // 最大允许角度（30度）
    _isHorizontal: {},
    _hasDirection: {},
    _isRightSwipe: {}, // 是否为向右滑动

    // 获取元素文本内容
    _getElementText: (element) => {
      // 提取所有文本，包括嵌套元素
      const text = element.innerText || element.textContent || '';
      return text.trim().replace(/\s+/g, ' ');
    },

    // 计算滑动角度
    _getSwipeAngle: (deltaX, deltaY) => {
      const angle = Math.atan2(Math.abs(deltaY), Math.abs(deltaX)) * 180 / Math.PI;
      return angle;
    },

    // 显示滑动轨迹指示器
    _showSwipeIndicator: (item, progress) => {
      let indicator = item.querySelector('.swipe-indicator');
      if (!indicator) {
        indicator = document.createElement('div');
        indicator.className = 'swipe-indicator';
        indicator.style.cssText = `
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 4px;
          background: linear-gradient(to bottom, var(--success), #34C759);
          transform: scaleY(0);
          transform-origin: top;
          transition: transform 0.1s ease-out;
          z-index: 10;
          border-radius: 2px;
        `;
        item.appendChild(indicator);
      }
      indicator.style.transform = `scaleY(${Math.min(progress, 1)})`;
    },

    // 隐藏滑动轨迹指示器
    _hideSwipeIndicator: (item) => {
      const indicator = item.querySelector('.swipe-indicator');
      if (indicator) {
        indicator.style.transform = 'scaleY(0)';
        setTimeout(() => indicator.remove(), 200);
      }
    },

    // 显示复制成功反馈
    _showCopyFeedback: (item, text) => {
      // 创建成功提示
      const feedback = document.createElement('div');
      feedback.className = 'copy-feedback';
      feedback.style.cssText = `
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%) scale(0);
        background: var(--success);
        color: #fff;
        padding: 8px 16px;
        border-radius: 20px;
        font-size: 13px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 6px;
        box-shadow: 0 4px 12px rgba(52, 199, 89, 0.4);
        z-index: 100;
        transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        pointer-events: none;
      `;
      feedback.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
        已复制
      `;
      item.appendChild(feedback);

      // 动画显示
      requestAnimationFrame(() => {
        feedback.style.transform = 'translate(-50%, -50%) scale(1)';
      });

      // 2秒后移除
      setTimeout(() => {
        feedback.style.transform = 'translate(-50%, -50%) scale(0)';
        setTimeout(() => feedback.remove(), 300);
      }, 2000);
    },

    // 执行复制操作
    _performCopy: async (text, item) => {
      try {
        if (!text || text.trim() === '') {
          // 暂时保留 Toast 引用，待后续模块拆分后再调整
          console.log('暂无内容可复制');
          return false;
        }

        // 使用现代 Clipboard API
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text);
        } else {
          // 降级方案
          const textArea = document.createElement('textarea');
          textArea.value = text;
          textArea.style.cssText = 'position:fixed;left:-9999px;top:0;';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          const successful = document.execCommand('copy');
          document.body.removeChild(textArea);
          if (!successful) throw new Error('复制失败');
        }

        // 显示成功反馈
        Utils.SwipeRightCopyHandler._showCopyFeedback(item, text);
        console.log(`已复制: ${text.substring(0, 20)}${text.length > 20 ? '...' : ''}`);
        return true;
      } catch (e) {
        console.error('复制失败', e);
        console.log('复制失败，请手动复制');
        return false;
      }
    },

    handleTouchStart: function(e, idx, prefix) {
      const key = `${prefix}_${idx}`;
      const touch = e.touches[0];
      
      Utils.SwipeRightCopyHandler._startX[key] = touch.clientX;
      Utils.SwipeRightCopyHandler._startY[key] = touch.clientY;
      Utils.SwipeRightCopyHandler._currentX[key] = touch.clientX;
      Utils.SwipeRightCopyHandler._currentY[key] = touch.clientY;
      Utils.SwipeRightCopyHandler._startTime[key] = Date.now();
      Utils.SwipeRightCopyHandler._isHorizontal[key] = false;
      Utils.SwipeRightCopyHandler._hasDirection[key] = false;
      Utils.SwipeRightCopyHandler._isRightSwipe[key] = false;
    },

    handleTouchMove: function(e, idx, prefix) {
      const key = `${prefix}_${idx}`;
      if (Utils.SwipeRightCopyHandler._startX[key] === undefined) return;
      
      const touch = e.touches[0];
      Utils.SwipeRightCopyHandler._currentX[key] = touch.clientX;
      Utils.SwipeRightCopyHandler._currentY[key] = touch.clientY;
      
      const deltaX = touch.clientX - Utils.SwipeRightCopyHandler._startX[key];
      const deltaY = touch.clientY - Utils.SwipeRightCopyHandler._startY[key];
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);
      
      // 方向判断阶段（低延迟，15px阈值）
      if (!Utils.SwipeRightCopyHandler._hasDirection[key]) {
        if (absDeltaX > Utils.SwipeRightCopyHandler._directionThreshold || 
            absDeltaY > Utils.SwipeRightCopyHandler._directionThreshold) {
          Utils.SwipeRightCopyHandler._hasDirection[key] = true;
          
          // 计算滑动角度
          const angle = Utils.SwipeRightCopyHandler._getSwipeAngle(deltaX, deltaY);
          
          // 判断是否为水平滑动且角度在允许范围内
          const isHorizontal = absDeltaX > absDeltaY && angle <= Utils.SwipeRightCopyHandler._maxAngle;
          Utils.SwipeRightCopyHandler._isHorizontal[key] = isHorizontal;
          Utils.SwipeRightCopyHandler._isRightSwipe[key] = deltaX > 0; // 向右滑动
          
          // 如果不是向右滑动，不处理
          if (!isHorizontal || deltaX <= 0) {
            return;
          }
        }
      }
      
      // 如果不是向右滑动，不处理
      if (!Utils.SwipeRightCopyHandler._isHorizontal[key] || 
          !Utils.SwipeRightCopyHandler._isRightSwipe[key]) {
        return;
      }
      
      // 阻止默认行为
      e.preventDefault();
      
      const item = e.currentTarget;
      
      // 计算滑动进度（0-1）
      const progress = Math.min(absDeltaX / Utils.SwipeRightCopyHandler._threshold, 1);
      
      // 显示滑动轨迹指示器
      Utils.SwipeRightCopyHandler._showSwipeIndicator(item, progress);
      
      // 添加视觉反馈 - 轻微右移
      const content = item.querySelector('.special-history-content');
      if (content) {
        const translateX = Math.min(deltaX * 0.3, 30); // 最大移动30px
        content.style.transform = `translateX(${translateX}px)`;
        content.style.transition = 'transform 0.05s ease-out';
      }
      
      // 达到阈值时改变指示器颜色
      const indicator = item.querySelector('.swipe-indicator');
      if (indicator && absDeltaX >= Utils.SwipeRightCopyHandler._threshold) {
        indicator.style.background = 'linear-gradient(to bottom, #34C759, #30D158)';
        indicator.style.boxShadow = '0 0 8px rgba(52, 199, 89, 0.6)';
      }
    },

    handleTouchEnd: function(e, idx, prefix, getTextCallback) {
      const key = `${prefix}_${idx}`;
      const item = e.currentTarget;
      
      // 恢复内容位置
      const content = item.querySelector('.special-history-content');
      if (content) {
        content.style.transform = 'translateX(0)';
        content.style.transition = 'transform 0.3s ease-out';
      }
      
      // 如果不是向右滑动，直接清理
      if (!Utils.SwipeRightCopyHandler._isHorizontal[key] || 
          !Utils.SwipeRightCopyHandler._isRightSwipe[key]) {
        Utils.SwipeRightCopyHandler._hideSwipeIndicator(item);
        Utils.SwipeRightCopyHandler._cleanup(key);
        return;
      }
      
      const deltaX = Utils.SwipeRightCopyHandler._currentX[key] - Utils.SwipeRightCopyHandler._startX[key];
      const deltaTime = Date.now() - Utils.SwipeRightCopyHandler._startTime[key];
      
      // 判断是否达到触发条件（距离阈值 或 快速滑动）
      const isQuickSwipe = deltaTime < 200 && deltaX > 40; // 快速滑动（200ms内40px）
      const isLongSwipe = deltaX >= Utils.SwipeRightCopyHandler._threshold; // 长距离滑动
      
      if (isQuickSwipe || isLongSwipe) {
        // 获取要复制的文本
        const text = getTextCallback ? getTextCallback(item) : 
                     Utils.SwipeRightCopyHandler._getElementText(content || item);
        
        // 执行复制
        Utils.SwipeRightCopyHandler._performCopy(text, item);
      }
      
      // 隐藏指示器并清理
      Utils.SwipeRightCopyHandler._hideSwipeIndicator(item);
      Utils.SwipeRightCopyHandler._cleanup(key);
    },

    // 清理状态
    _cleanup: (key) => {
      delete Utils.SwipeRightCopyHandler._startX[key];
      delete Utils.SwipeRightCopyHandler._startY[key];
      delete Utils.SwipeRightCopyHandler._currentX[key];
      delete Utils.SwipeRightCopyHandler._currentY[key];
      delete Utils.SwipeRightCopyHandler._startTime[key];
      delete Utils.SwipeRightCopyHandler._isHorizontal[key];
      delete Utils.SwipeRightCopyHandler._hasDirection[key];
      delete Utils.SwipeRightCopyHandler._isRightSwipe[key];
    }
  },

  // 在应用初始化时设置滑动处理器
  initSwipeHandlers: () => {
    // 只保留右滑复制功能处理器
    // 所有左滑删除处理器已移除
  },

  /**
   * 生成分页HTML
   * @param {number} currentPage - 当前页码
   * @param {number} totalPages - 总页数
   * @param {number} totalItems - 总记录数
   * @param {string} pageFunc - 翻页函数名
   * @returns {string} 分页HTML
   */
  renderPagination: (currentPage, totalPages, totalItems, pageFunc) => {
    if(totalPages <= 1) return '';
    
    let html = '<div style="display:flex;justify-content:center;align-items:center;gap:12px;margin-top:16px;padding:12px;background:var(--bg);border-radius:8px;">';
    if(currentPage > 1) {
      html += `<button class="btn-mini" onclick="Business.${pageFunc}(${currentPage - 1})")">上一页</button>`;
    }
    html += `<span style="color:var(--sub-text);font-size:13px;">第 ${currentPage} / ${totalPages} 页 (共 ${totalItems} 条)</span>`;
    if(currentPage < totalPages) {
      html += `<button class="btn-mini" onclick="Business.${pageFunc}(${currentPage + 1})")">下一页</button>`;
    }
    html += '</div>';
    return html;
  },

  /**
   * 创建通用弹窗
   * @param {Object} options - 弹窗配置
   * @param {string} options.title - 弹窗标题
   * @param {string} options.content - 弹窗内容
   * @param {string} options.className - 弹窗类名
   * @returns {HTMLElement} 弹窗元素
   */
  createModal: (options) => {
    const { title, content, className = 'modal' } = options;
    
    // 创建弹窗容器
    const modal = document.createElement('div');
    modal.className = `${className}-modal`;
    modal.innerHTML = `
      <div class="${className}-content">
        <div class="${className}-header">
          <h3>${title}</h3>
          <button class="close-btn" onclick="this.closest('.${className}-modal').remove()">×</button>
        </div>
        <div class="${className}-body">
          ${content}
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // 点击模态框外部关闭
    modal.addEventListener('click', (e) => {
      if(e.target === modal) {
        modal.remove();
      }
    });
    
    return modal;
  }
};
