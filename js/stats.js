// 🎯 StudyTrophy 數據分析頁面專屬引擎 (完全不污染全域空間，不與 main.js 衝突)
(function () {
    // 1. 讀取獨立的 localStorage 歷史資料快照
    let statsData = JSON.parse(localStorage.getItem('studyTrophyData')) || {
        settings: { semesterStart: "2026-02-23", semesterWeeks: 18 },
        logs: []
    };

    let statsWeekOffset = 0; // 統計頁面專屬的獨立週次偏移量
    let myChartInstance = null; // 暫存圖表實例，防止重複繪製時引發重疊 Bug

    // 2. 日期計算輔助函式：計算出任何日期的當週星期一
    function getStatsMonday(targetDate) {
        const d = new Date(targetDate);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    }

    // 3. 將按鈕功能安全地掛載到 window 物件上，確保 HTML 的 onclick 能夠觸發
    window.changeWeek = function (direction) {
        statsWeekOffset += direction;
        updateStatsWeekDisplay();
    };

    window.resetToThisWeek = function () {
        statsWeekOffset = 0;
        updateStatsWeekDisplay();
    };

    // 4. 核心控制引擎：計算目前切換週次的日期區間與學期週數
    function updateStatsWeekDisplay() {
        const now = new Date();
        now.setDate(now.getDate() + (statsWeekOffset * 7));
        now.setHours(0, 0, 0, 0);

        const monday = getStatsMonday(now);

        // 整理出切換當週「星期一至星期日」共 7 天的精確 ISO 日期陣列 (YYYY-MM-DD)
        const labels = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(monday.getTime() + (i * 24 * 60 * 60 * 1000));
            labels.push(d.toISOString().split('T')[0]);
        }

        const sundayStr = labels[6];

        // 計算目前切換到的是學期的第幾週
        const semStart = new Date(statsData.settings.semesterStart || "2026-02-23");
        const semStartMonday = getStatsMonday(semStart);
        semStartMonday.setHours(0, 0, 0, 0);

        const diffTime = monday.getTime() - semStartMonday.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        let weekNumber = Math.floor(diffDays / 7) + 1;

        let weekLabel = "";
        if (weekNumber >= 1 && weekNumber <= (statsData.settings.semesterWeeks || 18)) {
            weekLabel = `<span style="background: #bee3f8; color: #2b6cb0; padding: 2px 6px; border-radius: 4px; font-size: 0.85rem; margin-left: 10px;">第 ${weekNumber} 週</span>`;
        }

        // 更新 HTML 上的日期範圍文字顯示
        const rangeText = document.getElementById('week-range-text');
        if (rangeText) {
            rangeText.innerHTML = `當週數據區間：${monday.toLocaleDateString()} ~ ${new Date(sundayStr).toLocaleDateString()} ${weekLabel}`;
        }

        // 控制「返回本週」快捷鍵的顯示狀態
        const returnBtn = document.getElementById('return-this-week-btn');
        if (returnBtn) {
            returnBtn.style.display = statsWeekOffset !== 0 ? 'inline-block' : 'none';
        }

        // 📊 把本週這 7 天的精確日期傳進去繪圖引擎
        renderWeeklyChartWithLabels(labels);
    }

    // 5. 圖表更新與繪製引擎 (智慧型重繪機制，防止重疊)
    function renderWeeklyChartWithLabels(labels) {
        const chartCanvas = document.getElementById('weeklyChart');
        if (!chartCanvas) return;
        const ctx = chartCanvas.getContext('2d');

        // 5-1. 計算每天的總專注時間（用來計算 Y 軸動態上限與本週總計）
        const dailyTotals = labels.map(date => {
            const dayLogs = (statsData.logs || []).filter(log => log.date === date);
            return dayLogs.reduce((sum, log) => sum + (log.duration || log.minutes || 0), 0);
        });

        // 即時計算本週總專注時間並更新到畫面上
        const totalSum = dailyTotals.reduce((a, b) => a + b, 0);
        const totalInfoEl = document.getElementById('total-info');
        if (totalInfoEl) {
            totalInfoEl.innerText = `本週總計專注：${totalSum} 分鐘`;
        }

        // 🎯 核心需求 1：動態計算 Y 軸最大值（預設 30 分鐘，超過時以 30 分鐘為單位向上動態調整）
        const maxDailyTotal = Math.max(...dailyTotals, 0);
        const yMax = Math.max(30, Math.ceil(maxDailyTotal / 30) * 30);

        // 🎯 核心需求 2：提取當週有紀錄的科目，用來建立分流數據集（分顏色紀錄）
        const weekLogs = (statsData.logs || []).filter(log => labels.includes(log.date));
        const uniqueSubjects = Array.from(new Set(weekLogs.map(log => log.subject).filter(Boolean)));

        // 精選舒適且具辨識度的色票池（支援最多 10 種科目循環）
        const colorPalette = [
            '#3182ce', '#38a169', '#e53e3e', '#ecc94b', '#805ad5',
            '#319795', '#ed64a6', '#ed8936', '#4a5568', '#718096'
        ];

        // 依科目封裝 datasets
        const datasets = uniqueSubjects.map((subject, index) => {
            const data = labels.map(date => {
                const dayLogs = (statsData.logs || []).filter(log => log.date === date && log.subject === subject);
                return dayLogs.reduce((sum, log) => sum + (log.duration || log.minutes || 0), 0);
            });
            return {
                label: subject,
                data: data,
                backgroundColor: colorPalette[index % colorPalette.length],
                borderWidth: 1,
                borderRadius: 4
            };
        });

        // 🛡️ 防呆：如果當週完全沒有任何專注紀錄，給予一個預設的空白數據集
        if (datasets.length === 0) {
            datasets.push({
                label: '尚無專注科目',
                data: [0, 0, 0, 0, 0, 0, 0],
                backgroundColor: '#e2e8f0',
                borderWidth: 1,
                borderRadius: 4
            });
        }

        // ✨【智慧重繪機制】如果圖表實例已經存在，代表使用者在切換週次
        if (myChartInstance) {
            myChartInstance.data.labels = labels.map(date => date.slice(5)); // 只取「月-日」
            myChartInstance.data.datasets = datasets;
            myChartInstance.options.scales.y.max = yMax; // 隨切換週次同步更新 Y 軸上限
            myChartInstance.update(); // 絲滑重新重繪
            return;
        }

        // 如果是網頁初次載入（myChartInstance 還不存在），則建立全新的 Chart 實例
        myChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels.map(date => date.slice(5)),
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        stacked: true // 啟用 X 軸堆疊
                    },
                    y: {
                        stacked: true, // 啟用 Y 軸堆疊
                        beginAtZero: true,
                        min: 0,
                        max: yMax, // 綁定動態上限
                        title: { display: true, text: '分鐘' }
                    }
                },
                plugins: {
                    legend: {
                        display: true, // 顯示圖例，讓使用者識別顏色對應的科目
                        position: 'top',
                        labels: {
                            boxWidth: 12,
                            font: { size: 12 }
                        }
                    }
                }
            }
        });
    }

    // 6. 網頁 DOM 樹準備就緒後，全自動執行第一次初始化
    document.addEventListener('DOMContentLoaded', () => {
        updateStatsWeekDisplay();
    });
})();