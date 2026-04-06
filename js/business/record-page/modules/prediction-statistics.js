import { Storage } from '../../../storage.js';

export const PredictionStatistics = {
  render() {
    try {
      const statisticsBody = document.getElementById('predictionStatisticsBody');
      if (!statisticsBody) return;

      const stats = this.calculateStatistics();

      statisticsBody.innerHTML = `
        <div class="prediction-statistics">
          <div class="statistic-item">
            <div class="statistic-label">总预测次数</div>
            <div class="statistic-value">${stats.totalPredictions}</div>
          </div>
          <div class="statistic-item">
            <div class="statistic-label">成功次数</div>
            <div class="statistic-value">${stats.successCount}</div>
          </div>
          <div class="statistic-item">
            <div class="statistic-label">成功率</div>
            <div class="statistic-value">${stats.successRate}%</div>
          </div>
          <div class="statistic-item">
            <div class="statistic-label">最近预测</div>
            <div class="statistic-value">${stats.lastPrediction}</div>
          </div>
        </div>
      `;
    } catch (e) {
      console.error('渲染预测统计失败:', e);
    }
  },

  calculateStatistics() {
    const zodiacHistory = Storage.get('zodiacPredictionHistory', []);
    const specialHistory = Storage.get('specialHistory', []);
    const mlHistory = Storage.get('mlPredictionHistory', []);

    const allHistory = [...zodiacHistory, ...specialHistory, ...mlHistory];
    const totalPredictions = allHistory.length;
    
    let successCount = 0;
    allHistory.forEach(item => {
      if (item.success) successCount++;
    });

    const successRate = totalPredictions > 0 
      ? ((successCount / totalPredictions) * 100).toFixed(1)
      : '0';

    let lastPrediction = '暂无';
    if (allHistory.length > 0) {
      const sorted = allHistory.sort((a, b) => 
        (b.timestamp || 0) - (a.timestamp || 0)
      );
      lastPrediction = new Date(sorted[0].timestamp || Date.now()).toLocaleDateString();
    }

    return {
      totalPredictions,
      successCount,
      successRate,
      lastPrediction
    };
  }
};
