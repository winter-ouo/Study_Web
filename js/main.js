// 1. 核心資料結構
let studyData = JSON.parse(localStorage.getItem('studyTrophyData')) || {
    settings: {
        isCustomMode: false,
        timeSlots: [],
        customSettings: {
            totalSlots: 8,
            startTime: "08:10",
            classDuration: 50,
            restDuration: 10,
            noonSlot: 4,
            noonDuration: 70
        }
    },
    subjects: [],
    schedule: {},
    logs: []
};

// 2. 核心時間引擎
function calculateTimeSlots() {
    const slots = [];

    if (!studyData.settings.isCustomMode) {
        const defaultTimes = [
            "08:10~09:00", "09:10~10:00", "10:10~11:00", "11:10~12:00",
            "13:10~14:00", "14:10~15:00", "15:10~16:00", "16:10~17:00",
            "17:10~18:00", "18:05~18:55", "19:00~19:50", "19:55~20:45", "20:50~21:40"
        ];

        defaultTimes.forEach((timeStr, idx) => {
            slots.push({
                label: `${idx + 1}`,
                time: timeStr
            });
        });
        studyData.settings.timeSlots = slots;
        return;
    }

    const cfg = studyData.settings.customSettings || {
        totalSlots: 8, startTime: "08:10", classDuration: 50, restDuration: 10, noonSlot: 4, noonDuration: 70
    };

    const [startHour, startMin] = (cfg.startTime || "08:10").split(':').map(Number);
    let currentMinutes = startHour * 60 + startMin;

    const total = parseInt(cfg.totalSlots) || 8;
    const classLen = parseInt(cfg.classDuration) || 50;
    const restLen = parseInt(cfg.restDuration) || 10;
    const noonAfter = parseInt(cfg.noonSlot) || 4;
    const noonLen = parseInt(cfg.noonDuration) || 70;

    for (let i = 1; i <= total; i++) {
        let startH = Math.floor(currentMinutes / 60).toString().padStart(2, '0');
        let startM = (currentMinutes % 60).toString().padStart(2, '0');

        currentMinutes += classLen;

        let endH = Math.floor(currentMinutes / 60).toString().padStart(2, '0');
        let endM = (currentMinutes % 60).toString().padStart(2, '0');

        slots.push({
            label: `${i}`,
            time: `${startH}:${startM}~${endH}:${endM}`
        });

        if (i === noonAfter) {
            currentMinutes += noonLen;
        } else {
            if (i === 9 && !studyData.settings.isCustomMode) {
                currentMinutes += 5;
            } else {
                currentMinutes += restLen;
            }
        }
    }
    studyData.settings.timeSlots = slots;
}

calculateTimeSlots();

function saveData() {
    localStorage.setItem('studyTrophyData', JSON.stringify(studyData));
}

function updateTimeEngineToCustom() {
    studyData.settings.isCustomMode = true;
    studyData.settings.customSettings = {
        totalSlots: parseInt(document.getElementById('engine-slots').value) || 8,
        startTime: document.getElementById('engine-start').value || "08:10",
        classDuration: parseInt(document.getElementById('engine-class-len').value) || 50,
        restDuration: parseInt(document.getElementById('engine-rest-len').value) || 10,
        noonSlot: parseInt(document.getElementById('engine-noon-slot').value) || 4,
        noonDuration: parseInt(document.getElementById('engine-noon-len').value) || 70
    };
    calculateTimeSlots();
    saveData();
    location.reload();
}

function useSystemDefaultMode() {
    if (confirm("確定要放棄自訂時間，回復成系統預設的固定 13 節課表嗎？")) {
        studyData.settings.isCustomMode = false;
        calculateTimeSlots();
        saveData();
        location.reload();
    }
}

// 4. 真實日期與前後週引擎
let currentWeekOffset = 0;

function getMondayOfDate(targetDate) {
    const d = new Date(targetDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

function changeWeek(direction) {
    currentWeekOffset += direction;
    initSchedule();
}

function resetToThisWeek() {
    currentWeekOffset = 0;
    initSchedule();
}

function updateCurrentWeekDisplay() {
    const now = new Date();
    now.setDate(now.getDate() + (currentWeekOffset * 7));
    now.setHours(0, 0, 0, 0);

    const monday = getMondayOfDate(now);
    const friday = new Date(monday.getTime() + (4 * 24 * 60 * 60 * 1000));

    const infoText = document.getElementById('current-week-info');
    if (infoText) {
        infoText.innerHTML = `
            <button onclick="changeWeek(-1)" style="padding:5px 10px; cursor:pointer;">◀ 上一週</button>
            <span style="margin: 0 15px; font-weight:bold; font-size:1.1rem;">📅 當週日期區間：${monday.toLocaleDateString()} ~ ${friday.toLocaleDateString()}</span>
            <button onclick="changeWeek(1)" style="padding:5px 10px; cursor:pointer;">下一週 ▶</button>
            ${currentWeekOffset !== 0 ? '<button onclick="resetToThisWeek()" style="margin-left:10px; font-size:0.8rem; padding:2px 5px; cursor:pointer;">返回本週</button>' : ''}
        `;
    }
}

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

// 5. 課表渲染與編輯 (在此處完美嵌入午休半透明分隔線)
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

    // 取得目前的午休安排位置（預設是第 4 節後）
    const noonAfter = studyData.settings.isCustomMode
        ? (studyData.settings.customSettings.noonSlot || 4)
        : 4;

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

        // ✨ 核心亮點：當前渲染完第 4 節（或自訂的午休節次）時，動態插入一條半透明、合併儲存格的午休線
        if (parseInt(slot.label) === parseInt(noonAfter)) {
            const lunchTr = document.createElement('tr');
            lunchTr.className = 'lunch-break-row';

            // 計算或取得午休的確切時間範圍
            let lunchTimeRange = "12:00 ~ 13:10"; // 預設模式的時間
            if (studyData.settings.isCustomMode) {
                // 如果是自訂模式，由第 4 節的結束時間往後推算
                const [, endPart] = slot.time.split('~');
                const [endH, endM] = endPart.split(':').map(Number);
                let totalMin = endH * 60 + endM;
                let noonLen = parseInt(studyData.settings.customSettings.noonDuration) || 70;
                let nextTotalMin = totalMin + noonLen;

                let nextH = Math.floor(nextTotalMin / 60).toString().padStart(2, '0');
                let nextM = (nextTotalMin % 60).toString().padStart(2, '0');
                lunchTimeRange = `${endPart} ~ ${nextH}:${nextM}`;
            }

            lunchTr.innerHTML = `<td colspan="6">🍱 午 休 時 間 (${lunchTimeRange}) 🍱</td>`;
            tbody.appendChild(lunchTr);
        }
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

// 6. 獎盃與行事曆管理
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