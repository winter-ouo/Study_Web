// js/timer.js
let timeLeft = 25 * 60; // 預設 25 分鐘
let timerId = null;
let isRunning = false;

// 1. 更新畫面顯示
function updateDisplay() {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    const timerElement = document.getElementById('timer');
    if (timerElement) {
        timerElement.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
}

// 2. 開始/暫停計時
function toggleTimer() {
    const startBtn = document.getElementById('start-btn');
    const subjectSelect = document.getElementById('current-subject-select');

    if (isRunning) {
        clearInterval(timerId);
        startBtn.innerText = '開始';
    } else {
        // 開始前確認是否有選科目
        if (subjectSelect && !subjectSelect.value) {
            alert('請先選擇一個科目再開始喔！(๑•̀ㅂ•́)و');
            return;
        }

        timerId = setInterval(() => {
            timeLeft--;
            updateDisplay();
            if (timeLeft <= 0) {
                clearInterval(timerId);
                finishSession();
            }
        }, 1000);
        startBtn.innerText = '暫停';
    }
    isRunning = !isRunning;
}

// 3. 重置計時器
function resetTimer() {
    clearInterval(timerId);
    timeLeft = 25 * 60;
    updateDisplay();
    isRunning = false;
    const startBtn = document.getElementById('start-btn');
    if (startBtn) startBtn.innerText = '開始';
}

// 4. 計時結束處理
function finishSession() {
    isRunning = false;
    document.getElementById('overlay').style.display = 'block';
    document.getElementById('update-modal').style.display = 'block';
    // 提示音 (選配)：可加入音效檔路徑
    // new Audio('assets/bell.mp3').play();
}

// 5. 提交進度 (連動 main.js 的 saveData)
function submitProgress() {
    const subjectId = document.getElementById('current-subject-select').value;
    const newPage = parseInt(document.getElementById('modal-page-input').value);

    if (isNaN(newPage)) {
        alert("請輸入有效的頁碼！");
        return;
    }

    // 更新科目目前頁數
    const sub = studyData.subjects.find(s => s.id == subjectId);
    if (sub) {
        sub.current = newPage;
    }

    // 紀錄讀書紀錄 (供 P3 統計使用)
    const log = {
        date: new Date().toISOString().split('T')[0],
        subjectId: subjectId,
        duration: 25 // 紀錄一個番茄鐘的長度
    };
    studyData.logs.push(log);

    saveData(); // 呼叫 main.js 的儲存函式
    alert("進度已更新！獎盃顏色可能改變囉 (￣▽￣)b");
    window.location.href = 'index.html'; // 導回首頁看獎盃
}