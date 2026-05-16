// 核心資料結構
let studyData = JSON.parse(localStorage.getItem('studyTrophyData')) || {
    settings: {
        totalWeeks: 18,
        startDate: "2026-02-16", // 預設一個開學日基準
        // 時間引擎設定
        totalSlots: 8,           // 一天幾節課
        startTime: "08:10",      // 第一節開始時間
        classDuration: 50,       // 上課幾分鐘
        restDuration: 10,        // 下課休息幾分鐘
        noonSlot: 4,             // 午休在第幾節之後
        noonDuration: 70,        // 午休時間幾分鐘
        timeSlots: []            // 自動生成的節次放這裡
    },
    subjects: [],
    schedule: {}, // 格式: { "day-slot": { name: "", events: [] } }
    logs: []
};

// 全局變數：記錄使用者目前切換到畫面的日期偏移量（0 代表本週，-1 代表前一週，1 代表下一週）
let currentWeekOffset = 0;

// 自動時間計算引擎
function calculateTimeSlots() {
    const slots = [];
    const [startHour, startMin] = studyData.settings.startTime.split(':').map(Number);
    let currentMinutes = startHour * 60 + startMin;

    const total = studyData.settings.totalSlots;
    const classLen = studyData.settings.classDuration;
    const restLen = studyData.settings.restDuration;
    const noonAfter = studyData.settings.noonSlot;
    const noonLen = studyData.settings.noonDuration;

    for (let i = 1; i <= total; i++) {
        // 計算這一節的開始與結束時間
        let startH = Math.floor(currentMinutes / 60).toString().padStart(2, '0');
        let startM = (currentMinutes % 60).toString().padStart(2, '0');

        currentMinutes += classLen;

        let endH = Math.floor(currentMinutes / 60).toString().padStart(2, '0');
        let endM = (currentMinutes % 60).toString().padStart(2, '0');

        slots.push({
            label: `${i}`,
            time: `${startH}:${startM}~${endH}:${endM}`
        });

        // 判斷接下來是午休還是普通下課
        if (i === noonAfter) {
            currentMinutes += noonLen; // 加上午休時間
        } else {
            currentMinutes += restLen; // 加上一般下課
        }
    }
    studyData.settings.timeSlots = slots;
}

// 如果是一開始初始化，或是舊資料沒有時間引擎欄位，自動補齊並計算
if (!studyData.settings.classDuration) {
    studyData.settings.totalSlots = 8;
    studyData.settings.startTime = "08:10";
    studyData.settings.classDuration = 50;
    studyData.settings.restDuration = 10;
    studyData.settings.noonSlot = 4;
    studyData.settings.noonDuration = 70;
}
calculateTimeSlots(); // 確保每次載入都動態算好

function saveData() {
    localStorage.setItem('studyTrophyData', JSON.stringify(studyData));
}

// 變更時間引擎設定
function updateTimeEngine() {
    studyData.settings.totalSlots = parseInt(document.getElementById('engine-slots').value);
    studyData.settings.startTime = document.getElementById('engine-start').value;
    studyData.settings.classDuration = parseInt(document.getElementById('engine-class-len').value);
    studyData.settings.restDuration = parseInt(document.getElementById('engine-rest-len').value);
    studyData.settings.noonSlot = parseInt(document.getElementById('engine-noon-slot').value);
    studyData.settings.noonDuration = parseInt(document.getElementById('engine-noon-len').value);

    calculateTimeSlots();
    saveData();
    initSchedule();
    alert("時間引擎已重新計算並更新課表！(๑•̀ㅂ•́)ו");
}

// 週一錨點計算輔助
function getMondayOfDate(targetDate) {
    const d = new Date(targetDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

// 週數與日期切換控制
function changeWeek(direction) {
    currentWeekOffset += direction;
    initSchedule();
}

function resetToThisWeek() {
    currentWeekOffset = 0;
    initSchedule();
}

// 自動計算畫面顯示的週數
function updateCurrentWeekDisplay() {
    const start = new Date(studyData.settings.startDate);
    const now = new Date();
    // 加上偏移量計算畫面上那一週的日期
    now.setDate(now.getDate() + (currentWeekOffset * 7));

    start.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);

    const startMonday = getMondayOfDate(start);
    const nowMonday = getMondayOfDate(now);

    const diffTime = nowMonday.getTime() - startMonday.getTime();
    const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));

    let displayWeek = diffWeeks + 1;

    const infoText = document.getElementById('current-week-info');
    if (infoText) {
        let weekStr = (displayWeek >= 1 && displayWeek <= studyData.settings.totalWeeks)
            ? `【第 ${displayWeek} 週】` : `【學期外】`;

        infoText.innerHTML = `
            <button onclick="changeWeek(-1)" style="padding:5px 10px; cursor:pointer;">◀ 上一週</button>
            <span style="margin: 0 15px; font-weight:bold;">📅 畫面日期基準：${now.toLocaleDateString()} ${weekStr}</span>
            <button onclick="changeWeek(1)" style="padding:5px 10px; cursor:pointer;">下一週 ▶</button>
            <button onclick="resetToThisWeek()" style="margin-left:10px; font-size:0.8rem; padding:2px 5px; cursor:pointer;">返回本週</button>
        `;
    }
}

// 推算畫面中那一週的「週一到週五」實際日期
function getDatesOfDisplayedWeek() {
    const now = new Date();
    now.setDate(now.getDate() + (currentWeekOffset * 7));
    now.setHours(0, 0, 0, 0);

    const monday = getMondayOfDate(now);

    const weekDates = [];
    for (let i = 0; i < 5; i++) {
        const d = new Date(monday.getTime() + (i * 24 * 60 * 60 * 1000));
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const date = d.getDate().toString().padStart(2, '0');
        weekDates.push(`${month}/${date}`);
    }
    return weekDates;
}

// 初始化課表結構
function initSchedule() {
    updateCurrentWeekDisplay();

    const dates = getDatesOfDisplayedWeek();
    const ths = document.querySelectorAll('#schedule-table-head th');
    if (ths.length === 6) {
        ths[1].innerText = `一 (${dates[0]})`;
        ths[2].innerText = `二 (${dates[1]})`;
        ths[3].innerText = `三 (${dates[2]})`;
        ths[4].innerText = `四 (${dates[3]})`;
        ths[5].innerText = `五 (${dates[4]})`;
    }

    const tbody = document.getElementById('schedule-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    studyData.settings.timeSlots.forEach((slot, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td><strong>第 ${slot.label} 節</strong><br><small>${slot.time}</small></td>`;

        for (let day = 1; day <= 5; day++) {
            const cellId = `${day}-${index}`;
            const cellData = studyData.schedule[cellId] || { name: "", events: [] };
            const td = document.createElement('td');

            const hasEvent = cellData.events && cellData.events.length > 0;
            td.className = hasEvent ? 'editable-cell has-event' : 'editable-cell';

            let cellContent = `<div>${cellData.name || ''}</div>`;
            if (hasEvent) {
                const tooltipText = cellData.events.map(e => e.note).join(', ');
                cellContent += `<span class="event-tag" title="${tooltipText}">📅</span>`;
            }

            td.innerHTML = cellContent;
            td.onclick = () => editSubjectOnly(cellId);
            tr.appendChild(td);
        }
        tbody.appendChild(tr);
    });
}

function editSubjectOnly(cellId) {
    const data = studyData.schedule[cellId] || { name: "", events: [] };
    const newName = prompt("輸入或修改科目名稱 (輸入留白可清除):", data.name);
    if (newName !== null) {
        studyData.schedule[cellId] = {
            name: newName.trim(),
            events: data.events || []
        };
        saveData();
        initSchedule();
    }
}

// 提取科目與獎盃牆邏輯
function getSubjectsFromSchedule() {
    const subjects = new Set();
    Object.values(studyData.schedule).forEach(cell => {
        if (cell && cell.name) subjects.add(cell.name);
    });
    return Array.from(subjects);
}

function showAddSubjectModal() {
    const availableSubjects = getSubjectsFromSchedule();
    if (availableSubjects.length === 0) {
        alert("請先在課表中填寫科目名稱，才能設定目標喔！");
        return;
    }
    const select = document.getElementById('new-subject-name');
    select.innerHTML = availableSubjects.map(sub => `<option value="${sub}">${sub}</option>`).join('');
    document.getElementById('add-modal').style.display = 'block';
}

function showAddEventModal() {
    const slotSelect = document.getElementById('event-slot');
    slotSelect.innerHTML = studyData.settings.timeSlots.map((slot, index) =>
        `<option value="${index}">第 ${slot.label} 節 (${slot.time})</option>`
    ).join('');
    document.getElementById('event-modal').style.display = 'block';
}

function hideModals() {
    document.getElementById('add-modal').style.display = 'none';
    document.getElementById('event-modal').style.display = 'none';
}

function addSubject() {
    const name = document.getElementById('new-subject-name').value;
    const startVal = document.getElementById('new-subject-start').value;
    const endVal = document.getElementById('new-subject-end').value;

    studyData.subjects.push({
        id: Date.now(), name: name, start: startVal, end: endVal, current: startVal
    });
    saveData();
    renderTrophies();
    hideModals();
}

function addCalendarEvent() {
    const day = document.getElementById('event-day').value;
    const slot = document.getElementById('event-slot').value;
    const note = document.getElementById('event-note').value;

    if (!note.trim()) return alert("請輸入提醒內容！");

    const cellId = `${day}-${slot}`;
    if (!studyData.schedule[cellId]) studyData.schedule[cellId] = { name: "", events: [] };
    if (!studyData.schedule[cellId].events) studyData.schedule[cellId].events = [];

    studyData.schedule[cellId].events.push({ note: note.trim() });
    saveData();
    initSchedule();
    hideModals();
    document.getElementById('event-note').value = '';
}

function renderTrophies() {
    const grid = document.getElementById('trophy-grid');
    if (!grid) return;
    grid.innerHTML = '';
    studyData.subjects.forEach(sub => {
        const s = parseFloat(sub.start), e = parseFloat(sub.end), c = parseFloat(sub.current);
        let percent = (!isNaN(s) && !isNaN(e) && !isNaN(c)) ? ((c - s) / (e - s)) * 100 : (c === e ? 100 : 0);
        percent = Math.min(Math.max(percent, 0), 100);
        let trophyClass = percent >= 100 ? 'gold' : percent >= 66 ? 'silver' : percent >= 33 ? 'bronze' : 'locked';
        grid.innerHTML += `
            <div class="trophy-item">
                <img src="assets/trophy.png" class="trophy-img ${trophyClass}">
                <span class="subject-label">${sub.name.substring(0, 2)}</span>
                <p><strong>${sub.name}</strong><br>${sub.current} ~ ${sub.end}</p>
                <button onclick="deleteSubject(${sub.id})" style="font-size:10px; color:red;">刪除</button>
            </div>`;
    });
}

function deleteSubject(id) {
    if (confirm('刪除此目標？')) {
        studyData.subjects = studyData.subjects.filter(s => s.id !== id);
        saveData();
        renderTrophies();
    }
}

function clearStudyLogs() {
    if (confirm('確定要清除所有讀書紀錄嗎？')) { studyData.logs = []; saveData(); location.reload(); }
}
function resetEverything() {
    if (confirm('⚠️ 確定重設整個系統？')) { localStorage.removeItem('studyTrophyData'); location.reload(); }
}