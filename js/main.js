// 1. 核心資料結構
let studyData = JSON.parse(localStorage.getItem('studyTrophyData')) || {
    settings: {
        isCustomMode: false,
        timeSlots: [],
        customSettings: {
            totalSlots: 8, startTime: "08:10", classDuration: 50, restDuration: 10, noonSlot: 4, noonDuration: 70
        }
    },
    subjects: [],
    schedule: {},
    events: [],
    logs: []
};

// 全域操作暫存
let currentActiveEventId = null;
let selectedColor = "#4299e1";

function calculateTimeSlots() {
    const slots = [];
    if (!studyData.settings.isCustomMode) {
        const defaultTimes = [
            "08:10~09:00", "09:10~10:00", "10:10~11:00", "11:10~12:00",
            "13:10~14:00", "14:10~15:00", "15:10~16:00", "16:10~17:00",
            "17:10~18:00", "18:05~18:55", "19:00~19:50", "19:55~20:45", "20:50~21:40"
        ];
        defaultTimes.forEach((timeStr, idx) => {
            slots.push({ label: `${idx + 1}`, time: timeStr });
        });
        studyData.settings.timeSlots = slots;
        return;
    }

    const cfg = studyData.settings.customSettings;
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

        slots.push({ label: `${i}`, time: `${startH}:${startM}~${endH}:${endM}` });
        if (i === noonAfter) currentMinutes += noonLen;
        else currentMinutes += restLen;
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

// 日期引擎
let currentWeekOffset = 0;
function getMondayOfDate(targetDate) {
    const d = new Date(targetDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}
function changeWeek(direction) { currentWeekOffset += direction; initSchedule(); }
function resetToThisWeek() { currentWeekOffset = 0; initSchedule(); }

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

function getFullDatesOfDisplayedWeek() {
    const now = new Date();
    now.setDate(now.getDate() + (currentWeekOffset * 7));
    now.setHours(0, 0, 0, 0);
    const monday = getMondayOfDate(now);
    const weekDates = [];
    for (let i = 0; i < 5; i++) { weekDates.push(new Date(monday.getTime() + (i * 24 * 60 * 60 * 1000))); }
    return weekDates;
}

// 4. 智慧比例色塊渲染
function initSchedule() {
    updateCurrentWeekDisplay();
    const fullDates = getFullDatesOfDisplayedWeek();

    const nowLocal = new Date();
    const todayStr = nowLocal.getFullYear() + '-' +
        (nowLocal.getMonth() + 1).toString().padStart(2, '0') + '-' +
        nowLocal.getDate().toString().padStart(2, '0');

    const ths = document.querySelectorAll('#schedule-table-head th');
    if (ths.length === 6) {
        fullDates.forEach((d, i) => {
            const m = (d.getMonth() + 1).toString().padStart(2, '0');
            const dateStr = d.getDate().toString().padStart(2, '0');
            ths[i + 1].innerText = `${['一', '二', '三', '四', '五'][i]} (${m}/${dateStr})`;
        });
    }

    const tbody = document.getElementById('schedule-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    const noonAfter = studyData.settings.isCustomMode ? (studyData.settings.customSettings.noonSlot || 4) : 4;

    studyData.settings.timeSlots.forEach((slot, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td><strong>第 ${slot.label} 節</strong><br><small>${slot.time}</small></td>`;

        const [slotStartStr, slotEndStr] = slot.time.split('~');
        const [sH, sM] = slotStartStr.split(':').map(Number);
        const [eH, eM] = slotEndStr.split(':').map(Number);
        const slotStartMin = sH * 60 + sM;
        const slotEndMin = eH * 60 + eM;
        const slotTotalDuration = slotEndMin - slotStartMin;

        for (let day = 1; day <= 5; day++) {
            const cellId = `${day}-${index}`;
            const cellData = studyData.schedule[cellId] || { name: "" };
            const td = document.createElement('td');
            td.className = 'editable-cell';
            td.onclick = (e) => {
                editSubjectOnly(cellId);
            };

            const subjectDiv = document.createElement('div');
            subjectDiv.className = 'cell-subject-name';
            subjectDiv.innerText = cellData.name || '';
            td.appendChild(subjectDiv);

            const targetDateObj = fullDates[day - 1];
            const targetDateISO = targetDateObj.getFullYear() + '-' +
                (targetDateObj.getMonth() + 1).toString().padStart(2, '0') + '-' +
                targetDateObj.getDate().toString().padStart(2, '0');

            const matchingEvents = (studyData.events || []).filter(ev => {
                if (ev.date !== targetDateISO) return false;
                const [evSH, evSM] = ev.startTime.split(':').map(Number);
                const [evEH, evEM] = ev.endTime.split(':').map(Number);
                return ((evEH * 60 + evEM) > slotStartMin && (evSH * 60 + evSM) < slotEndMin);
            });

            matchingEvents.forEach(ev => {
                const [evSH, evSM] = ev.startTime.split(':').map(Number);
                const [evEH, evEM] = ev.endTime.split(':').map(Number);
                const evStartMin = evSH * 60 + evSM;
                const evEndMin = evEH * 60 + evEM;

                const renderStart = Math.max(evStartMin, slotStartMin);
                const renderEnd = Math.min(evEndMin, slotEndMin);
                const renderDuration = renderEnd - renderStart;

                const topPercent = ((renderStart - slotStartMin) / slotTotalDuration) * 100;
                const heightPercent = (renderDuration / slotTotalDuration) * 100;

                const block = document.createElement('div');

                const isExpired = (ev.date < todayStr) && !ev.isPinned;
                block.className = isExpired ? 'timetable-event-block event-expired' : 'timetable-event-block';

                const hexColor = ev.color || '#4299e1';
                block.style.backgroundColor = convertHexToRgba(hexColor, 0.4);
                block.style.borderLeft = `4px solid ${hexColor}`;
                block.style.color = getContrastYIQ(hexColor);
                block.title = `【點擊設定】${ev.startTime}~${ev.endTime}\n${ev.note}`;

                block.onclick = (e) => {
                    e.stopPropagation();
                    triggerCustomMenu(e, ev.id);
                };

                if (heightPercent > 25) {
                    const noteSpan = document.createElement('span');
                    noteSpan.className = 'event-block-note';
                    noteSpan.innerText = ev.note;
                    block.appendChild(noteSpan);
                }
                td.appendChild(block);
            });
            tr.appendChild(td);
        }
        tbody.appendChild(tr);

        // 午休列
        if (parseInt(slot.label) === parseInt(noonAfter)) {
            const lunchTr = document.createElement('tr');
            lunchTr.className = 'lunch-break-row';
            let lunchTimeRange = "12:00 ~ 13:10";
            if (studyData.settings.isCustomMode) {
                const [, endPart] = slot.time.split('~');
                const [endH, endM] = endPart.split(':').map(Number);
                let nextTotalMin = (endH * 60 + endM) + (parseInt(studyData.settings.customSettings.noonDuration) || 70);
                lunchTimeRange = `${endPart} ~ ${Math.floor(nextTotalMin / 60).toString().padStart(2, '0')}:${(nextTotalMin % 60).toString().padStart(2, '0')}`;
            }
            lunchTr.innerHTML = `<td colspan="6">🍱 午 休 時 間 (${lunchTimeRange}) 🍱</td>`;
            tbody.appendChild(lunchTr);
        }
    });
}

// 5. 行事曆管理模組
function selectModalColor(hexColor) {
    selectedColor = hexColor;
    const dots = document.querySelectorAll('.modal .color-dot');
    dots.forEach(dot => {
        if (dot.getAttribute('data-color') === hexColor) {
            dot.classList.add('selected');
        } else {
            dot.classList.remove('selected');
        }
    });
}

function showAddEventModal() {
    document.getElementById('event-modal-title').innerText = "📅 新增行事曆事件";
    document.getElementById('editing-event-id').value = "";
    document.getElementById('event-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('event-start-time').value = "10:20";
    document.getElementById('event-end-time').value = "10:50";
    document.getElementById('event-note').value = '';

    selectModalColor("#4299e1");
    document.getElementById('event-modal').style.display = 'block';
}

function addCalendarEvent() {
    const editId = document.getElementById('editing-event-id').value;
    const dateVal = document.getElementById('event-date').value;
    const sTimeVal = document.getElementById('event-start-time').value;
    const eTimeVal = document.getElementById('event-end-time').value;
    const noteVal = document.getElementById('event-note').value;

    if (!dateVal || !sTimeVal || !eTimeVal || !noteVal.trim()) {
        alert("請完整填寫所有欄位資訊！");
        return;
    }
    if (sTimeVal >= eTimeVal) {
        alert("結束時間一定要晚於開始時間喔！(>_<)");
        return;
    }

    if (!studyData.events) studyData.events = [];

    if (editId) {
        const ev = studyData.events.find(e => e.id == editId);
        if (ev) {
            ev.date = dateVal;
            ev.startTime = sTimeVal;
            ev.endTime = eTimeVal;
            ev.note = noteVal.trim();
            ev.color = selectedColor;
        }
    } else {
        studyData.events.push({
            id: Date.now(),
            date: dateVal,
            startTime: sTimeVal,
            endTime: eTimeVal,
            note: noteVal.trim(),
            isPinned: false,
            color: selectedColor
        });
    }

    saveData();
    initSchedule();
    renderGlobalEventList();
    hideModals();
}

function renderGlobalEventList() {
    const container = document.getElementById('global-event-list');
    if (!container) return;
    const list = studyData.events || [];
    if (list.length === 0) {
        container.innerHTML = `<p style="color:#a0aec0; text-align:center; font-size:0.85rem; margin:10px 0;">目前沒有安排任何事件。</p>`;
        return;
    }

    const nowLocal = new Date();
    const todayStr = nowLocal.getFullYear() + '-' +
        (nowLocal.getMonth() + 1).toString().padStart(2, '0') + '-' +
        nowLocal.getDate().toString().padStart(2, '0');

    list.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        const isAExpired = a.date < todayStr;
        const isBExpired = b.date < todayStr;
        if (!isAExpired && isBExpired) return -1;
        if (isAExpired && !isBExpired) return 1;
        return (a.date + a.startTime).localeCompare(b.date + b.startTime);
    });

    container.innerHTML = list.map(ev => {
        const [, m, d] = ev.date.split('-');
        const isExpired = (ev.date < todayStr) && !ev.isPinned ? 'event-expired' : '';
        const isPinned = ev.isPinned ? 'event-pinned-style' : '';
        const badge = ev.isPinned ? '📌 ' : '';
        const hexColor = ev.color || '#4299e1';

        return `
            <div class="event-list-item ${isExpired} ${isPinned}" onclick="triggerCustomMenu(event, ${ev.id})">
                <div style="max-width: 95%; display:flex; align-items:center; gap:8px;">
                    <span style="width:10px; height:10px; border-radius:50%; background:${hexColor}; display:inline-block; flex-shrink:0;"></span>
                    <div>
                        <span style="font-weight:bold; font-size:0.78rem; color:#4a5568;">${badge}${m}/${d} ${ev.startTime}~${ev.endTime}</span>
                        <div style="color:#2d3748; font-size:0.85rem; margin-top:2px;">${ev.note}</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function triggerCustomMenu(e, eventId) {
    e.preventDefault();
    e.stopPropagation();
    currentActiveEventId = eventId;

    const menu = document.getElementById('custom-click-menu');
    menu.style.display = 'block';
    menu.style.left = `${e.clientX}px`;
    menu.style.top = `${e.clientY}px`;

    const ev = studyData.events.find(item => item.id === eventId);
    const pinTextBtn = document.getElementById('ctx-pin-text');
    if (ev && pinTextBtn) {
        pinTextBtn.innerText = ev.isPinned ? "取消置頂" : "置頂排程";
    }
}

document.addEventListener('click', () => {
    const menu = document.getElementById('custom-click-menu');
    if (menu) menu.style.display = 'none';
});

function handleContextAction(actionType) {
    if (!currentActiveEventId) return;
    const targetId = currentActiveEventId;

    if (actionType === 'pin') {
        const ev = studyData.events.find(e => e.id === targetId);
        if (ev) ev.isPinned = !ev.isPinned;
        saveData();
        initSchedule();
        renderGlobalEventList();
    }
    else if (actionType === 'delete') {
        if (confirm("確定要刪除這個行事曆排程嗎？")) {
            studyData.events = studyData.events.filter(e => e.id !== targetId);
            saveData();
            initSchedule();
            renderGlobalEventList();
        }
    }
    else if (actionType === 'edit') {
        const ev = studyData.events.find(e => e.id === targetId);
        if (ev) {
            document.getElementById('event-modal-title').innerText = "📝 編輯行事曆事件";
            document.getElementById('editing-event-id').value = ev.id;
            document.getElementById('event-date').value = ev.date;
            document.getElementById('event-start-time').value = ev.startTime;
            document.getElementById('event-end-time').value = ev.endTime;
            document.getElementById('event-note').value = ev.note;

            selectModalColor(ev.color || "#4299e1");
            document.getElementById('event-modal').style.display = 'block';
        }
    }
}

function hideModals() {
    document.getElementById('add-modal').style.display = 'none';
    document.getElementById('event-modal').style.display = 'none';

    const clickMenu = document.getElementById('custom-click-menu');
    if (clickMenu) clickMenu.style.display = 'none';
}

// 顏色處理工具
function convertHexToRgba(hex, opacity) {
    let c;
    if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
        c = hex.substring(1).split('');
        if (c.length == 3) { c = [c[0], c[0], c[1], c[1], c[2], c[2]]; }
        c = '0x' + c.join('');
        return 'rgba(' + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',') + ',' + opacity + ')';
    }
    return hex;
}
function getContrastYIQ(hexcolor) {
    hexcolor = hexcolor.replace("#", "");
    var r = parseInt(hexcolor.substr(0, 2), 16), g = parseInt(hexcolor.substr(2, 2), 16), b = parseInt(hexcolor.substr(4, 2), 16);
    return (((r * 299) + (g * 587) + (b * 114)) / 1000 >= 128) ? '#1a202c' : '#ffffff';
}

function editSubjectOnly(cellId) {
    const data = studyData.schedule[cellId] || { name: "" };
    const newName = prompt("輸入或修改科目名稱 (輸入留白可清除):", data.name);
    if (newName !== null) { studyData.schedule[cellId] = { name: newName.trim() }; saveData(); initSchedule(); }
}
function renderTrophies() {
    const grid = document.getElementById('trophy-grid'); if (!grid) return; grid.innerHTML = '';
    studyData.subjects.forEach(sub => {
        const s = parseFloat(sub.start), e = parseFloat(sub.end), c = parseFloat(sub.current);
        let percent = (!isNaN(s) && !isNaN(e) && !isNaN(c)) ? ((c - s) / (e - s)) * 100 : (c === e ? 100 : 0);
        percent = Math.min(Math.max(percent, 0), 100);
        let trophyClass = percent >= 100 ? 'gold' : percent >= 66 ? 'silver' : percent >= 33 ? 'bronze' : 'locked';
        grid.innerHTML += `<div class="trophy-item"><img src="assets/trophy.png" class="trophy-img ${trophyClass}"><span class="subject-label">${sub.name.substring(0, 2)}</span><p><strong>${sub.name}</strong><br>${sub.current} ~ ${sub.end}</p><button onclick="deleteSubject(${sub.id})" style="font-size:10px; color:red;">刪除</button></div>`;
    });
}
function deleteSubject(id) { if (confirm('刪除此目標？')) { studyData.subjects = studyData.subjects.filter(s => s.id !== id); saveData(); renderTrophies(); } }
function clearStudyLogs() { if (confirm('確定要清除所有讀書紀錄嗎？')) { studyData.logs = []; saveData(); location.reload(); } }
function resetEverything() { if (confirm('⚠️ 確定重設整個系統？')) { localStorage.removeItem('studyTrophyData'); location.reload(); } }

// 🌟 6. 鍵盤監聽核心常駐引擎 (新增：Enter 鍵神速儲存替代機制)
document.addEventListener('DOMContentLoaded', () => {
    // A. 行事曆事件內容框監聽
    const eventNoteInput = document.getElementById('event-note');
    if (eventNoteInput) {
        eventNoteInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addCalendarEvent();
            }
        });
    }

    // B. 新增目標最後一個輸入框監聽
    const subjectEndInput = document.getElementById('new-subject-end');
    if (subjectEndInput) {
        subjectEndInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addSubject();
            }
        });
    }

    // C. 自訂時間引擎所有數字輸入框監聽
    const engineIds = ['engine-slots', 'engine-start', 'engine-class-len', 'engine-rest-len', 'engine-noon-slot', 'engine-noon-len'];
    engineIds.forEach(id => {
        const inputEl = document.getElementById(id);
        if (inputEl) {
            inputEl.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    updateTimeEngineToCustom();
                }
            });
        }
    });
});