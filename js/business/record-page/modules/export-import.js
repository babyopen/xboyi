import { Storage } from '../../../storage.js';
import { StateManager } from '../../../state-manager.js';
import { Toast } from '../../../toast.js';

export const ExportImport = {
  RECORD_KEYS: [
    'zodiacPredictionHistory',
    'specialHistory',
    'selectedZodiacHistory',
    'hotNumbersHistory',
    'mlPredictionHistory'
  ],

  clearAllRecords(callback) {
    if (!confirm('确定要清除所有记录吗？此操作不可恢复！')) return;

    try {
      this.RECORD_KEYS.forEach(key => {
        Storage.remove(key);
      });

      const stateUpdate = {};
      this.RECORD_KEYS.forEach(key => {
        stateUpdate[key] = [];
      });
      StateManager.setState(stateUpdate, false);

      if (typeof callback === 'function') {
        callback();
      }

      Toast.show('所有记录已清除');
    } catch (e) {
      console.error('清除记录失败:', e);
      Toast.show('清除记录失败，请重试');
    }
  },

  exportRecords() {
    try {
      const records = {};
      this.RECORD_KEYS.forEach(key => {
        records[key] = Storage.get(key, []);
      });

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
    } catch (e) {
      console.error('导出记录失败:', e);
      Toast.show('导出记录失败，请重试');
    }
  },

  importRecords(callback) {
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

            if (typeof records === 'object' && records !== null) {
              this.RECORD_KEYS.forEach(key => {
                if (records[key]) {
                  Storage.set(key, records[key]);
                }
              });

              const stateUpdate = {};
              this.RECORD_KEYS.forEach(key => {
                stateUpdate[key] = records[key] || [];
              });
              StateManager.setState(stateUpdate, false);

              if (typeof callback === 'function') {
                callback();
              }

              Toast.show('记录导入成功');
            } else {
              Toast.show('导入失败：文件格式错误');
            }
          } catch (e) {
            console.error('解析文件失败:', e);
            Toast.show('导入失败：文件格式错误');
          }
        };
        reader.readAsText(file);
      };
      input.click();
    } catch (e) {
      console.error('导入记录失败:', e);
      Toast.show('导入记录失败，请重试');
    }
  }
};
