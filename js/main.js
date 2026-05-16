// 核心資料結構
let studyData = JSON.parse(localStorage.getItem('studyTrophyData')) || {
    settings: {
        totalWeeks: 18,
        startDate: "2026-02-16",
        totalSlots: 8,
        startTime: "08:10",
        classDuration: 50,
        restDuration: 10,
        noonSlot: 4,
        noonDuration: 70,
        timeSlots: []
    },
    subjects: [],
    schedule: {},
    logs: []
};

let currentWeekOffset = 0;

// 自動時間計算引擎 (完美修正：午休時間累加邏輯)
function calculateTimeSlots() {
    const slots = [];

    // 如果 startTime 沒有值或格式不對，給予防呆預設
    if (!studyData.settings.startTime || !studyData.settings.startTime.includes(':')) {
        studyData.settings.startTime = "08:10";
    }

    const [startHour, startMin] = studyData.settings.startTime.split(':').map(Number);
    let currentMinutes = startHour * 60 + startMin;

    const total = parseInt(studyData.settings.totalSlots) || 8;
    const classLen = parseInt(studyData.settings.classDuration) || 50;
    const restLen = parseInt(studyData.settings.restDuration) || 10;
    const noonAfter = parseInt(studyData.settings.noonSlot) || 4;
    const noonLen = parseInt(studyData.settings.noonDuration) || 70;

    for (let i = 1; i <= total; i++) {
        let startH = Math.floor(currentMinutes / 60).toString().padStart(2, '0');
        let startM = (currentMinutes % 60).toString().padStart(2, '0');

        // 加上這一節的上課長度
        currentMinutes += classLen;

        let endH = Math.floor(currentMinutes / 60).toString().padStart(2, '0');
        let endM = (currentMinutes % 60).toString().padStart(2, '0');

        slots.push({
            label: `${i}`,
            time: `${startH}:${startM}~${endH}:${endM}`
        });

        // 修正：下課時間或午休時間，是在「這節課下課後」才加上去的
        if (i === noonAfter) {
            currentMinutes += noonLen; // 加上午休時間（例如 70 分鐘）
        } else {
            currentMinutes += restLen; // 加上普通下課休息
        }
    }
    studyData.settings.timeSlots = slots;
}

// 補齊預設值
if (!studyData.settings.classDuration) {
    studyData.settings.totalWeeks = 18;
    studyData.settings.startDate = "2026-02-16";
    studyData.settings.totalSlots = 8;
    studyData.settings.startTime = "08:10";
    studyData.settings.classDuration = 50;
    studyData.settings.restDuration = 10;
    studyData.settings.noonSlot = 4;
    studyData.settings.noonDuration = 70;
}
calculateTimeSlots();

function saveData() {
    localStorage.setItem('studyTrophyData', JSON.stringify(studyData));
}

// 儲存手動輸入的數值
function updateTimeEngine() {
    studyData.settings.totalSlots = parseInt(document.getElementById('engine-slots').value) || 8;
    studyData.settings.startTime = document.getElementById('engine-start').value || "08:10";
    studyData.settings.classDuration = parseInt(document.getElementById('engine-class-len').value) || 50;
    studyData.settings.restDuration = parseInt(document.getElementById('engine-rest-len').value) || 10;
    studyData.settings.noonSlot = parseInt(document.getElementById('engine-noon-slot').value) || 4;
    studyData.settings.noonDuration = parseInt(document.getElementById('engine-noon-len').value) || 70;

    calculateTimeSlots();
    saveData();
    initSchedule();
    alert("時間引擎已重新計算並更新課表！(๑•̀ㅂ•́)ו");
}

function saveSemesterSettings() {
    const weeks = parseInt(document.getElementById('setup-weeks').value);
    const sDate = document.getElementById('setup-start-date').value;

    if (isNaN(weeks) || weeks <= 0 || !sDate) {
        alert("請輸入正確的學期設定！");
        return;
    }

    studyData.settings.totalWeeks = weeks;
    studyData.settings.startDate = sDate;
    saveData();
}

// ✨ 新增功能：回復系統初始時間引擎預設值
function restoreDefaultEngineSettings() {
    if (confirm("確定要將時間設定恢復成系統預設值嗎？（不會影響你填寫的課表科目）")) {
        studyData.settings.totalWeeks = 18;
        studyData.settings.startDate = "2026-02-16";
        studyData.settings.totalSlots = 8;
        studyData.settings.startTime = "08:10";
        studyData.settings.classDuration = 50;
        studyData.settings.restDuration = 10;
        studyData.settings.noonSlot = 4;
        studyData.settings.noonDuration = 70;

        calculateTimeSlots();
        saveData();

        // 重新整理網頁輸入框的畫面數值
        if (typeof loadSettingsToInputs === "function") {
            loadSettingsToInputs();
        }
        initSchedule();
        alert("已回復成預設時間設定！(･ω･)b");
    }
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