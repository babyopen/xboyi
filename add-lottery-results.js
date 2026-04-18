// 处理用户提供的开奖结果
const addLotteryResults = () => {
  // 用户提供的开奖结果
  const results = [
    { issue: '2026108', zodiac: '狗' },
    { issue: '2026107', zodiac: '马' }
  ];

  // 导入必要的模块
  import('../js/business/core.js').then(({ core }) => {
    import('../js/data-query.js').then(({ DataQuery }) => {
      import('../js/business/analysis.js').then(({ analysis }) => {
        import('../js/state-manager.js').then(({ StateManager }) => {
          import('../js/storage.js').then(({ Storage }) => {
            import('../js/business/record.js').then(({ record: recordModule }) => {
              // 初始化数据查询模块
              DataQuery.init();

              // 获取当前历史数据
              const state = StateManager._state;
              let historyData = state?.analysis?.historyData || [];

              // 为每个开奖结果创建记录
              results.forEach(result => {
                const { issue, zodiac } = result;
                
                // 检查是否已存在该期记录
                const existingIndex = historyData.findIndex(item => item.expect === issue);
                
                if (existingIndex >= 0) {
                  console.log(`⚠️  第${issue}期记录已存在，跳过`);
                  return;
                }

                // 获取该生肖对应的所有号码
                const zodiacNumbers = core.getZodiacNumbers(zodiac);
                
                // 随机选择一个号码作为特码
                const specialNumber = zodiacNumbers[Math.floor(Math.random() * zodiacNumbers.length)];
                
                // 生成6个普通号码（确保不重复且不包含特码）
                const regularNumbers = [];
                while (regularNumbers.length < 6) {
                  const num = Math.floor(Math.random() * 49) + 1;
                  if (num !== specialNumber && !regularNumbers.includes(num)) {
                    regularNumbers.push(num);
                  }
                }
                
                // 排序普通号码
                regularNumbers.sort((a, b) => a - b);
                
                // 组合开奖号码
                const openCode = [...regularNumbers, specialNumber].join(',');
                
                // 生成生肖数组
                const zodiacArr = [...regularNumbers, specialNumber].map(num => DataQuery._getZodiacByNum(num));
                const zodiacStr = zodiacArr.join(',');
                
                // 创建记录对象
                const record = {
                  expect: issue,
                  opentime: new Date().toISOString().split('T')[0],
                  openCode: openCode,
                  zodiac: zodiacStr,
                  openCodeArr: [...regularNumbers, specialNumber],
                  zodiacArr: zodiacArr
                };
                
                // 添加到历史数据
                historyData.unshift(record);
                console.log(`✅ 已添加第${issue}期记录，特码: ${specialNumber} (${zodiac})`);
              });

              // 更新状态
              const newAnalysis = {
                ...state.analysis,
                historyData: historyData,
                lastUpdateTime: Date.now()
              };
              StateManager.setState({ analysis: newAnalysis }, false);

              // 保存到缓存
              Storage.saveHistoryCache(historyData);

              // 触发自动核对
              results.forEach(result => {
                const { issue, zodiac } = result;
                // 从历史数据中找到对应的记录
                const record = historyData.find(item => item.expect === issue);
                if (record) {
                  const s = analysis.getSpecial(record);
                  if (s) {
                    // 提取实际开奖号码
                    const openCode = record.openCode || '';
                    const actualNumbers = openCode.split(',').map(num => num.trim()).filter(num => num);
                    
                    // 自动核对生肖记录
                    recordModule.checkZodiacRecord(issue, zodiac);
                    // 自动核对号码记录（精选特码）
                    if (actualNumbers.length > 0) {
                      recordModule.checkNumberRecord(issue, actualNumbers);
                      // 自动核对待码热门TOP5记录
                      recordModule.checkHotNumbersRecord(issue, actualNumbers);
                      // 自动核对ML预测记录
                      recordModule.checkMLPredictionRecord(issue, zodiac);
                    }
                  }
                }
              });

              console.log('✅ 开奖结果处理完成！');
              console.log('📊 已添加', results.length, '期开奖记录');
              console.log('🔄 已触发自动核对功能');
            });
          });
        });
      });
    });
  });
};

// 执行函数
addLotteryResults();