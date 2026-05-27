// 1. 核心資料結構
let studyData = JSON.parse(localStorage.getItem('studyTrophyData')) || {
    settings: { isCustomMode: false, timeSlots: [] },
    subjects: [],
    schedule: {},
    events: [],
    logs: [],
    customSubjects: []
};

if (!studyData.customSubjects) {
    studyData.customSubjects = [];
}

// 2. 計時器全域變數與防作弊狀態鎖
let currentMode = 'pomo';
let timerInterval = null;
let isRunning = false;
let isFocusLocked = false;

let pomoSecondsLeft = 25 * 60;
let stopwatchSecondsElapsed = 0;

// 3. 智慧洗牌渲染下拉選單
function initSubjectDropdown(forceSelectValue = null) {
    const select = document.getElementById('subject-selector');
    if (!select) return;

    const savedValue = forceSelectValue || select.value;

    const activeSubjects = new Set();
    Object.values(studyData.schedule || {}).forEach(cell => {
        if (cell && cell.name && cell.name.trim() !== "") {
            activeSubjects.add(cell.name.trim());
        }
    });

    // ✨ 核心改動：最前面加上一行預設的提示字，設定為 disabled（不可選）與 selected（預設選中）
    let optionsHtml = `<option value="" disabled selected hidden>👉 請點擊本下拉式選單做選擇</option>`;

    if (activeSubjects.size > 0) {
        optionsHtml += `<optgroup label="📋 課表內科目">`;
        activeSubjects.forEach(sub => {
            optionsHtml += `<option value="${sub}">${sub}</option>`;
        });
        optionsHtml += `</optgroup>`;
    }

    optionsHtml += `<optgroup label="✨ 自由專注選項">`;
    if (studyData.customSubjects && studyData.customSubjects.length > 0) {
        studyData.customSubjects.forEach(sub => {
            optionsHtml += `<option value="[自訂] ${sub}">✨ ${sub}</option>`;
        });
    }
    optionsHtml += `<option value="__NEW_CUSTOM__">➕ [建立全新自由自訂項目] ...</option>`;
    optionsHtml += `</optgroup>`;

    select.innerHTML = optionsHtml;

    // 如果有指定要選中的值，且該值存在於選單中，才切換過去
    if (savedValue && select.querySelector(`option[value="${savedValue}"]`)) {
        select.value = savedValue;
    }

    updateControlUIState();
}

// 4. 監聽選單變更核心
function handleDropdownChange() {
    const select = document.getElementById('subject-selector');
    if (!select) return;

    if (select.value === '__NEW_CUSTOM__') {
        const newName = prompt("✍️ 請輸入全新自由專注的科目或雜務名稱：");

        if (newName && newName.trim() !== "") {
            const trimmed = newName.trim();

            if (!studyData.customSubjects.includes(trimmed)) {
                studyData.customSubjects.push(trimmed);
                localStorage.setItem('studyTrophyData', JSON.stringify(studyData));
            }

            initSubjectDropdown(`[自訂] ${trimmed}`);
        } else {
            select.selectedIndex = 0;
            updateControlUIState();
        }
    } else {
        updateControlUIState();
    }
}

// 統一管理選單與刪除按鈕在「專注中 vs 閒置中」的鎖定狀態
function updateControlUIState() {
    const select = document.getElementById('subject-selector');
    const delBtn = document.getElementById('btn-del-custom');
    if (!select || !delBtn) return;

    if (isFocusLocked) {
        select.disabled = true;
        delBtn.disabled = true;
        delBtn.style.display = 'none';
    } else {
        select.disabled = false;

        if (select.value && select.value.startsWith('[自訂] ')) {
            delBtn.disabled = false;
            delBtn.style.display = 'block';
            delBtn.style.opacity = '1';
        } else {
            delBtn.disabled = true;
            delBtn.style.display = 'none';
        }
    }
}

// 🗑️ 點擊按鈕主動刪除歷史自訂
function deleteActiveCustomOption() {
    const select = document.getElementById('subject-selector');
    if (!select || !select.value.startsWith('[自訂] ')) return;

    const originalName = select.value.replace('[自訂] ', '');

    if (confirm(`確定要將【${originalName}】從自由專注歷史選單中永久刪除嗎？`)) {
        studyData.customSubjects = (studyData.customSubjects || []).filter(item => item !== originalName);
        localStorage.setItem('studyTrophyData', JSON.stringify(studyData));
        initSubjectDropdown();
    }
}

// 5. 雙模式切換（內部切換安全阻攔）
function switchMode(mode) {
    if (currentMode === mode) return;

    if (isFocusLocked) {
        clearInterval(timerInterval);

        if (!confirm("⚠️ 注意：目前專注進度尚未結束！\n變更頂部模式將會中斷並重置當前的所有進度（時間不會被記錄）。\n\n確定要放棄當前進度並切換模式嗎？")) {
            if (isRunning) {
                if (currentMode === 'pomo') {
                    timerInterval = setInterval(runPomoCountdown, 1000);
                } else {
                    timerInterval = setInterval(runStopwatchCountup, 1000);
                }
            }
            updateControlUIState();
            return;
        }
    }

    stopTimerWorker();
    isFocusLocked = false;
    currentMode = mode;

    const pomoBtn = document.getElementById('mode-pomodoro');
    const stopBtn = document.getElementById('mode-stopwatch');
    const title = document.getElementById('timer-title');
    const display = document.getElementById('time-string');

    if (mode === 'pomo') {
        pomoBtn.className = 'mode-btn active';
        stopBtn.className = 'mode-btn';
        title.innerText = "保持專注，衝刺吧！";
        pomoSecondsLeft = 25 * 60;
        display.innerText = "25:00";
    } else {
        pomoBtn.className = 'mode-btn';
        stopBtn.className = 'mode-btn timer-active';
        title.innerText = "盡情享受讀書心流狀態... 🧠";
        stopwatchSecondsElapsed = 0;
        display.innerText = "00:00";
    }

    resetMainButtonUI();
    updateControlUIState();
}

// 6. 計時核心控制（加入未選科目防呆攔截）
function toggleTimer() {
    // 🎯 核心防呆：如果目前還沒開始計時，且選單的值是空的（提示字狀態），阻攔並提示
    if (!isRunning) {
        const select = document.getElementById('subject-selector');
        if (!select || select.value === "") {
            alert("❌ 請先點擊下拉式選單，選擇一個你想專注的科目或自訂項目喔！");
            return; // 直接中斷，不允許啟動計時
        }
    }

    if (isRunning) {
        stopTimerWorker();
        document.getElementById('btn-main').innerText = "繼續專注";
        document.getElementById('btn-main').className = "control-btn btn-pause";
    } else {
        isRunning = true;
        isFocusLocked = true;
        document.getElementById('btn-main').innerText = "暫停一下";
        document.getElementById('btn-main').className = "control-btn btn-pause";

        if (currentMode === 'pomo') {
            timerInterval = setInterval(runPomoCountdown, 1000);
        } else {
            timerInterval = setInterval(runStopwatchCountup, 1000);
        }
    }
    updateControlUIState();
}

function runPomoCountdown() {
    if (pomoSecondsLeft > 0) {
        pomoSecondsLeft--;
        updateDisplayString(pomoSecondsLeft);
    } else {
        stopTimerWorker();
        handleFocusFinished(25);
    }
}

function runStopwatchCountup() {
    stopwatchSecondsElapsed++;
    updateDisplayString(stopwatchSecondsElapsed);
}

// 🌟 核心進化：未滿一分鐘時，改造彈窗機制，新增「返回繼續（取消）」的分支選項
function resetTimer() {
    if (isFocusLocked || (currentMode === 'pomo' && pomoSecondsLeft < 25 * 60) || (currentMode === 'stopwatch' && stopwatchSecondsElapsed > 0)) {

        if (currentMode === 'stopwatch') {
            if (confirm("要結束讀書，並把目前累積的時間存入紀錄中嗎？")) {
                const mins = Math.round(stopwatchSecondsElapsed / 60);

                // 先強制停止時間，防止彈窗時時間繼續在背景亂跑
                clearInterval(timerInterval);

                if (mins >= 1) {
                    handleFocusFinished(mins);
                } else {
                    // 🛡️ 亮點功能：改用 confirm，讓「取消」變成「返回繼續專注」的救回鍵
                    if (confirm("🛑 目前專注未滿 1 分鐘，不予寫入紀錄！\n\n【確定】：確認放棄並將時間歸零。\n【取消】：返回剛剛的進度繼續讀。")) {
                        // 使用者選「確定」：徹底放棄
                        stopwatchSecondsElapsed = 0;
                        isFocusLocked = false;
                        isRunning = false;
                        updateDisplayString(0);
                        resetMainButtonUI();
                        updateControlUIState();
                    } else {
                        // 使用者選「取消」：救回進度，無縫接軌繼續跑
                        timerInterval = setInterval(runStopwatchCountup, 1000);
                        isRunning = true;
                        isFocusLocked = true;
                        document.getElementById('btn-main').innerText = "暫停一下";
                        document.getElementById('btn-main').className = "control-btn btn-pause";
                        updateControlUIState();
                    }
                }
                return;
            }
        } else {
            // 番茄鐘途中放棄
            if (!confirm("確定要放棄這次的番茄鐘衝刺嗎？時間不會被記錄喔！")) return;

            stopTimerWorker();
            alert("⚠️ 這次的番茄鐘已放棄，時間將重新彈回滿格狀態。");
            pomoSecondsLeft = 25 * 60;
            isFocusLocked = false;
            updateDisplayString(25 * 60);
            resetMainButtonUI();
            updateControlUIState();
            return;
        }
    }

    // 兜底重置
    stopTimerWorker();
    isFocusLocked = false;
    if (currentMode === 'pomo') {
        pomoSecondsLeft = 25 * 60;
        updateDisplayString(25 * 60);
    } else {
        stopwatchSecondsElapsed = 0;
        updateDisplayString(0);
    }
    resetMainButtonUI();
    updateControlUIState();
}

function stopTimerWorker() {
    clearInterval(timerInterval);
    isRunning = false;
}

function resetMainButtonUI() {
    document.getElementById('btn-main').innerText = "開始專注";
    document.getElementById('btn-main').className = "control-btn btn-start";
}

function updateDisplayString(totalSec) {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0');
    const s = (totalSec % 60).toString().padStart(2, '0');
    const displayEl = document.getElementById('time-string');
    if (h > 0) displayEl.innerText = `${h}:${m}:${s}`;
    else displayEl.innerText = `${m}:${s}`;
}

// 7. 專注結算與智慧儲存
function handleFocusFinished(minutesEarned) {
    const select = document.getElementById('subject-selector');
    let rawSubjectName = select.value;

    if (rawSubjectName.startsWith('[自訂] ')) {
        rawSubjectName = rawSubjectName.replace('[自訂] ', '');
    }

    // 修正：利用套件或原生標準格式，確保產出 YYYY-MM-DD 格式（與 stats.js 一致）
    const nowLocal = new Date();
    const year = nowLocal.getFullYear();
    const month = (nowLocal.getMonth() + 1).toString().padStart(2, '0');
    const day = nowLocal.getDate().toString().padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    if (!studyData.logs) studyData.logs = [];

    // 修正：將 minutes 改為 duration，這樣 stats.js 才能正確加總
    studyData.logs.push({
        id: Date.now(),
        subject: rawSubjectName,
        duration: minutesEarned, // 修改這裡：minutes -> duration
        type: currentMode,
        date: todayStr
    });

    if (studyData.subjects && studyData.subjects.length > 0) {
        studyData.subjects.forEach(sub => {
            if (sub.name === rawSubjectName) {
                let currNum = parseFloat(sub.current);
                if (!isNaN(currNum)) sub.current = (currNum + (minutesEarned / 50)).toFixed(1);
            }
        });
    }

    localStorage.setItem('studyTrophyData', JSON.stringify(studyData));
    alert(`🎉 太棒了！你剛剛成功完成了【${rawSubjectName}】的專注，共累積了 ${minutesEarned} 分鐘讀書時數！`);

    isFocusLocked = false;
    initSubjectDropdown(select.value);

    if (currentMode === 'pomo') {
        pomoSecondsLeft = 25 * 60;
        updateDisplayString(25 * 60);
    } else {
        stopwatchSecondsElapsed = 0;
        updateDisplayString(0);
    }
    resetMainButtonUI();
    updateControlUIState();
}

// 8. 全網頁切換安全鎖鎖定引擎
window.addEventListener('beforeunload', (e) => {
    if (isFocusLocked) {
        e.preventDefault();
        e.returnValue = '系統偵測到您正在專注讀書中！如果離開此頁面，當前的時間進度將不會被記錄。確定要離開嗎？';
        return e.returnValue;
    }
});

// 9. 監聽初始化與點擊優化
document.addEventListener('DOMContentLoaded', () => {
    initSubjectDropdown();

    const select = document.getElementById('subject-selector');
    if (select) {
        // 當使用者點擊展開下拉式選單時
        select.addEventListener('mousedown', () => {
            // 暫存原本選中的值（例如 '__NEW_CUSTOM__'）
            const currentValue = select.value;

            // 智慧型障眼法：清空目前選定值，迫使瀏覽器認為接下來的點擊「都是新選擇」
            select.value = '';

            // 如果使用者展開後反悔，點旁邊關閉選單（沒點任何選項），就把值還原回去
            const restoreValue = () => {
                if (select.value === '') {
                    select.value = currentValue;
                }
                select.removeEventListener('blur', restoreValue);
                select.removeEventListener('change', restoreValue);
            };
            select.addEventListener('blur', restoreValue);
            select.addEventListener('change', restoreValue);
        });
    }
});