// 1. 核心資料結構（相容寫法，預設開學日修正為 2026-02-23）
if (typeof studyData === 'undefined') {
    window.studyData = JSON.parse(localStorage.getItem('studyTrophyData')) || {
        settings: {
            isCustomMode: false,
            timeSlots: [],
            customSettings: {
                totalSlots: 8, startTime: "08:10", classDuration: 50, restDuration: 10, noonSlot: 4, noonDuration: 70
            },
            // 🎯 預設開學日期修改為 2/23
            semesterStart: "2026-02-23",
            semesterWeeks: 18
        },
        subjects: [],
        schedule: {},
        events: [],
        logs: []
    };
}

// 防呆：確保使用者舊有的 localStorage 資料也有更新到正確的預設值
if (!studyData.settings.semesterStart || studyData.settings.semesterStart === "2026-02-16") {
    studyData.settings.semesterStart = "2026-02-23";
}
if (!studyData.settings.semesterWeeks) studyData.settings.semesterWeeks = 18;

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

// 🎯 將函式名稱修改為 updateTimeEngineToCustom，完美對接你 HTML 按鈕的 onclick="updateTimeEngineToCustom();"
function updateTimeEngineToCustom() {
    const slotsEl = document.getElementById('engine-slots');
    const startEl = document.getElementById('engine-start');
    const classLenEl = document.getElementById('engine-class-len');
    const restLenEl = document.getElementById('engine-rest-len');
    const noonSlotEl = document.getElementById('engine-noon-slot');
    const noonLenEl = document.getElementById('engine-noon-len');

    // 🎯 順便抓取開學日與週數的欄位
    const semStartInput = document.getElementById('semester-start-date');
    const semWeeksInput = document.getElementById('semester-total-weeks');

    if (slotsEl && startEl && classLenEl && restLenEl && noonSlotEl && noonLenEl) {
        studyData.settings.isCustomMode = true;
        studyData.settings.customSettings = {
            totalSlots: parseInt(slotsEl.value, 10) || 8,
            startTime: startEl.value || "08:10",
            classDuration: parseInt(classLenEl.value, 10) || 50,
            restDuration: parseInt(restLenEl.value, 10) || 10,
            noonSlot: parseInt(noonSlotEl.value, 10) || 4,
            noonDuration: parseInt(noonLenEl.value, 10) || 70
        };

        // 🎯 只要在這裡順便把開學日和總週數存進去即可！
        if (semStartInput && semStartInput.value) {
            studyData.settings.semesterStart = semStartInput.value;
        }
        if (semWeeksInput && semWeeksInput.value) {
            studyData.settings.semesterWeeks = parseInt(semWeeksInput.value, 10) || 18;
        }

        saveData();
        initSchedule();
        alert("已成功切換為自訂時間引擎計算模式！⚙️");
        location.reload();
    }
}

function useSystemDefaultMode() {
    if (confirm("確定要放棄自訂時間，回復成系統預設的固定 13 節課表嗎？")) {
        studyData.settings.isCustomMode = false;
        calculateTimeSlots();
        saveData();
        location.reload();
    }
}

// 原始日期引擎完全還原
let currentWeekOffset = 0;
function getMondayOfDate(targetDate) {
    const d = new Date(targetDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}
function changeWeek(direction) { currentWeekOffset += direction; initSchedule(); }
function resetToThisWeek() { currentWeekOffset = 0; initSchedule(); }

// 更新自訂學期基本資訊（防呆避免欄位找不到噴錯）
function updateSemesterSettings() {
    const startInput = document.getElementById('semester-start-date');
    const weeksInput = document.getElementById('semester-total-weeks');
    if (startInput && weeksInput) {
        if (!startInput.value) { alert("請選擇開學日期！"); return; }
        studyData.settings.semesterStart = startInput.value;
        studyData.settings.semesterWeeks = parseInt(weeksInput.value, 10) || 18;
        saveData();
        initSchedule();
        alert("學期開學資訊已更新！✨");
        location.reload();
    }
}

function updateCurrentWeekDisplay() {
    const now = new Date();
    now.setDate(now.getDate() + (currentWeekOffset * 7));
    now.setHours(0, 0, 0, 0);
    const monday = getMondayOfDate(now);
    const friday = new Date(monday.getTime() + (4 * 24 * 60 * 60 * 1000));

    // 核心計算：根據開學日期算出當週是第幾週
    const semStart = new Date(studyData.settings.semesterStart);
    const semStartMonday = getMondayOfDate(semStart);
    semStartMonday.setHours(0, 0, 0, 0);

    const diffTime = monday.getTime() - semStartMonday.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    let weekNumber = Math.floor(diffDays / 7) + 1;

    let weekLabel = "";
    if (weekNumber >= 1 && weekNumber <= studyData.settings.semesterWeeks) {
        weekLabel = `<span style="background: #e2e8f0; color: #2d3748; padding: 3px 8px; border-radius: 4px; font-size: 0.9rem; margin-left: 10px;">第 ${weekNumber} 週 / 共 ${studyData.settings.semesterWeeks} 週</span>`;
    } else if (weekNumber < 1) {
        weekLabel = `<span style="background: #edf2f7; color: #718096; padding: 3px 8px; border-radius: 4px; font-size: 0.9rem; margin-left: 10px;">🎒 尚未開學 (寒暑假)</span>`;
    } else {
        weekLabel = `<span style="background: #edf2f7; color: #718096; padding: 3px 8px; border-radius: 4px; font-size: 0.9rem; margin-left: 10px;">🌴 學期已結束</span>`;
    }

    const infoText = document.getElementById('current-week-info');
    if (infoText) {
        infoText.innerHTML = `
            <button onclick="changeWeek(-1)" style="padding:5px 10px; cursor:pointer;">◀ 上一週</button>
            <span style="margin: 0 15px; font-weight:bold; font-size:1.1rem;">📅 當週日期區間：${monday.toLocaleDateString()} ~ ${friday.toLocaleDateString()} ${weekLabel}</span>
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
    for (let i = 0; i < 7; i++) { weekDates.push(new Date(monday.getTime() + (i * 24 * 60 * 60 * 1000))); }
    return weekDates;
}

// 🌟 2. 智慧比例色塊與課表渲染引擎完全還原
function initSchedule() {
    updateCurrentWeekDisplay();
    const fullDates = getFullDatesOfDisplayedWeek();

    const nowLocal = new Date();
    const todayStr = nowLocal.getFullYear() + '-' +
        (nowLocal.getMonth() + 1).toString().padStart(2, '0') + '-' +
        nowLocal.getDate().toString().padStart(2, '0');

    const ths = document.querySelectorAll('#schedule-table-head th');
    if (ths.length === 8) {
        fullDates.forEach((d, i) => {
            const m = (d.getMonth() + 1).toString().padStart(2, '0');
            const dateStr = d.getDate().toString().padStart(2, '0');
            ths[i + 1].innerText = `${['一', '二', '三', '四', '五', '六', '日'][i]} (${m}/${dateStr})`;
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

        for (let day = 1; day <= 7; day++) {
            const cellId = `${day}-${index}`;
            const cellData = studyData.schedule[cellId] || { name: "", duration: 1, room: "" };
            const td = document.createElement('td');
            td.className = 'editable-cell';

            td.onclick = (e) => {
                editSubjectOnly(cellId);
            };

            const subjectDiv = document.createElement('div');
            subjectDiv.className = 'cell-subject-name';

            if (cellData.name) {
                let displayText = cellData.name;
                if (cellData.room) {
                    displayText += `<br><small style="color: #718096; font-weight: normal;">(${cellData.room})</small>`;
                }
                subjectDiv.innerHTML = displayText;

                let duration = parseInt(cellData.duration, 10) || 1;
                if (duration > 1) {
                    td.rowSpan = duration;
                }
            }
            td.appendChild(subjectDiv);

            let isCovered = false;
            for (let checkIndex = 0; checkIndex < index; checkIndex++) {
                let upperCellId = `${day}-${checkIndex}`;
                let upperCellData = studyData.schedule[upperCellId];
                if (upperCellData && upperCellData.name) {
                    let upperDuration = parseInt(upperCellData.duration, 10) || 1;
                    if (checkIndex + upperDuration > index) {
                        isCovered = true;
                        break;
                    }
                }
            }

            if (isCovered) {
                continue;
            }

            // 🎯 【修復順序亂掉與刷新神隱】改用不帶時間限制的「當天全域日期」固定音軌
            const targetDateObj = fullDates[day - 1];
            const targetDateISO = targetDateObj.getFullYear() + '-' +
                (targetDateObj.getMonth() + 1).toString().padStart(2, '0') + '-' +
                targetDateObj.getDate().toString().padStart(2, '0');

            const dayEvents = (studyData.events || []).filter(ev => ev.date === targetDateISO);
            dayEvents.sort((a, b) => a.id - b.id);

            const matchingEvents = (studyData.events || []).filter(ev => {
                if (ev.date !== targetDateISO) return false;
                const [evSH, evSM] = ev.startTime.split(':').map(Number);
                const [evEH, evEM] = ev.endTime.split(':').map(Number);
                return ((evEH * 60 + evEM) > slotStartMin && (evSH * 60 + evSM) < slotEndMin);
            });

            matchingEvents.forEach((ev) => {
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
                block.style.top = `${topPercent}%`;
                block.style.height = `${heightPercent}%`;
                block.style.backgroundColor = hexColor;
                block.style.color = getContrastYIQ(hexColor);
                block.style.border = 'none';

                const trackIdx = dayEvents.findIndex(item => item.id === ev.id);

                const lineWidth = 6;
                const lineGap = 1;   // 🎯 完美微調貼齊間距

                const offsetRight = trackIdx * (lineWidth + lineGap + 8);

                block.style.right = `${offsetRight}px`;
                block.style.width = `${lineWidth}px`;

                block.title = `⏰ 時間：${ev.startTime} ~ ${ev.endTime}\n📝 內容：${ev.note}`;
                block.onclick = (e) => {
                    e.stopPropagation();
                    triggerCustomMenu(e, ev.id);
                };

                td.appendChild(block);
            });
            tr.appendChild(td);
        }
        tbody.appendChild(tr);

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
            lunchTr.innerHTML = `<td colspan="8">🍱 午 休 時 間 (${lunchTimeRange}) 🍱</td>`;
            tbody.appendChild(lunchTr);
        }
    });
}

function editSubjectOnly(cellId) {
    const data = studyData.schedule[cellId] || { name: "", duration: 1, room: "" };

    document.getElementById('editing-cell-id').value = cellId;
    document.getElementById('cell-subject-input').value = data.name || '';

    // 🎯 修改這裡：如果原本這格沒課，就讓欄位留空（顯示 Placeholder 底字）；有課才帶入原本的節數
    document.getElementById('cell-duration-input').value = data.name ? (data.duration || 1) : '';

    document.getElementById('cell-room-input').value = data.room || '';

    document.getElementById('schedule-cell-modal').style.display = 'block';
}

function saveCellSubject() {
    const cellId = document.getElementById('editing-cell-id').value;
    const newName = document.getElementById('cell-subject-input').value.trim();
    const newDuration = parseInt(document.getElementById('cell-duration-input').value, 10) || 1;
    const newRoom = document.getElementById('cell-room-input').value.trim();

    if (cellId) {
        if (newName === "") {
            delete studyData.schedule[cellId];
        } else {
            studyData.schedule[cellId] = {
                name: newName,
                duration: newDuration,
                room: newRoom
            };
        }
        saveData();
        initSchedule();
        //renderTrophies();
        hideModals();
    }
}

function clearCellSubject() {
    const cellId = document.getElementById('editing-cell-id').value;
    if (cellId && studyData.schedule[cellId]) {
        delete studyData.schedule[cellId];
        saveData();
        initSchedule();
        //renderTrophies();
        hideModals();
    }
}

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

function selectColor(el, color) {
    document.querySelectorAll('.color-dot').forEach(dot => dot.classList.remove('active'));
    el.classList.add('active');
    selectedColor = color;
}

function showEventModal() {
    document.getElementById('event-modal-title').innerText = "📅 新增行事曆事件";
    document.getElementById('event-date').value = new Date().toISOString().split('T')[0];
    document.getElementById('event-start-time').value = "10:20";
    document.getElementById('event-end-time').value = "10:50";
    document.getElementById('event-note').value = '';
    document.getElementById('event-modal').style.display = 'block';
}

function addCalendarEvent() {
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

    studyData.events.push({
        id: Date.now(),
        date: dateVal,
        startTime: sTimeVal,
        endTime: eTimeVal,
        note: noteVal.trim(),
        isPinned: false,
        color: selectedColor
    });

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
        container.innerHTML = `<p style="color:#a0aec0; text-align:center; font-size:0.85rem; margin:10px 0;">目前沒有安排 any 事件。</p>`;
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
}

function executeMenuDelete() {
    if (currentActiveEventId) {
        if (confirm("⚠️ 確定要刪除這個行事曆行程嗎？\n刪除後資料將無法復原喔！(>_<)")) {
            studyData.events = studyData.events.filter(e => e.id !== currentActiveEventId);
            saveData();
            initSchedule();
            renderGlobalEventList();
            hideModals();
        }
    }
}

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

// 🎯 修改後的新增目標彈窗觸發函式
function showAddModal() {
    const selectEl = document.getElementById('new-subject-name');
    if (selectEl) {
        // 先清空除了第一行「-- 請選擇課表科目 --」以外的所有舊選項
        selectEl.innerHTML = '<option value="">-- 請選擇課表科目 --</option>';

        // 🤖 自動掃描當前課表上的所有課程名稱
        const scheduleCells = Object.values(studyData.schedule || {});
        const uniqueNames = [...new Set(scheduleCells.map(cell => cell.name).filter(name => name && name.trim() !== ""))];

        // 將掃描到的科目動態變成 <option> 塞進下拉選單
        uniqueNames.forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.innerText = name;
            selectEl.appendChild(opt);
        });
    }

    // 原本的打開彈窗邏輯
    document.getElementById('add-modal').style.display = 'block';
}

function addSubject() {
    const name = document.getElementById('new-subject-name').value.trim();
    const start = document.getElementById('new-subject-start').value.trim();
    const end = document.getElementById('new-subject-target').value.trim();

    // 🎯 加上如果沒選科目的提示
    if (!name) { alert('請選擇一個課表科目！'); return; }
    if (!end) { alert('請填寫目標進度！'); return; }

    studyData.subjects.push({ id: Date.now(), name, start, current: start, end });
    saveData();
    //renderTrophies();
    hideModals();

    // 儲存後將輸入框復原
    document.getElementById('new-subject-start').value = "0";
    document.getElementById('new-subject-target').value = "";
}

function renderTrophies() {
    const grid = document.getElementById('trophy-grid');
    if (!grid) return;
    grid.innerHTML = '';

    // 1. 收集所有要顯示的科目目標
    // 先複製一份使用者手動新增的自訂目標
    let displayedSubjects = [...(studyData.subjects || [])];

    // 2. 🤖 自動掃描課表：找出課表上有填寫、但手動目標裡還沒有的科目
    const scheduleCells = Object.values(studyData.schedule || {});
    const uniqueScheduleNames = [...new Set(scheduleCells.map(cell => cell.name).filter(name => name && name.trim() !== ""))];

    uniqueScheduleNames.forEach(name => {
        // 檢查這個課表科目是否已經存在於手動目標中（比對名稱）
        const alreadyExists = displayedSubjects.some(sub => sub.name.trim() === name.trim());
        if (!alreadyExists) {
            // 如果不存在，就自動幫它生成一個「虛擬目標」（預設從 0 開始，目標 100%）
            displayedSubjects.push({
                id: `auto-${name}`, // 標記為自動抓取的識別碼
                name: name,
                start: "0",
                current: "0",
                end: "100",
                isAuto: true // 註記這是自動抓取的
            });
        }
    });

    // 3. 開始渲染所有科目獎盃
    displayedSubjects.forEach(sub => {
        const s = parseFloat(sub.start), e = parseFloat(sub.end), c = parseFloat(sub.current);
        let percent = (!isNaN(s) && !isNaN(e) && !isNaN(c)) ? ((c - s) / (e - s)) * 100 : (c === e ? 100 : 0);
        percent = Math.min(Math.max(percent, 0), 100);
        let trophyClass = percent >= 100 ? 'gold' : percent >= 66 ? 'silver' : percent >= 33 ? 'bronze' : 'locked';

        // 判斷按鈕：如果是自動抓取的科目，顯示「移除課程」，點擊直接去清空課表；如果是手動的則維持「刪除目標」
        let deleteBtn = sub.isAuto
            ? `<span style="font-size:10px; color:#a0aec0; block; margin-top:2px;">🔄 課表同步中</span>`
            : `<button onclick="deleteSubject(${sub.id})" style="font-size:10px; color:red; cursor:pointer; background:none; border:none; padding:0;">刪除目標</button>`;

        grid.innerHTML += `
            <div class="trophy-item">
                <img src="assets/trophy.png" class="trophy-img ${trophyClass}">
                <span class="subject-label">${sub.name.substring(0, 2)}</span>
                <p><strong>${sub.name}</strong><br>${sub.current} ~ ${sub.end}</p>
                ${deleteBtn}
            </div>`;
    });
}
function deleteSubject(id) {
    if (confirm('❌ 確定要刪除此科目目標嗎？')) {
        studyData.subjects = studyData.subjects.filter(s => s.id !== id);
        saveData();
        //renderTrophies();
    }
}
function clearStudyLogs() { if (confirm('確定要清除所有讀書紀錄嗎？')) { studyData.logs = []; saveData(); location.reload(); } }
function resetEverything() { if (confirm('⚠️ 確定重設整個系統？')) { localStorage.removeItem('studyTrophyData'); location.reload(); } }

function hideModals() {
    document.getElementById('add-modal').style.display = 'none';
    document.getElementById('event-modal').style.display = 'none';
    if (document.getElementById('edit-event-modal')) document.getElementById('edit-event-modal').style.display = 'none';

    const cellModal = document.getElementById('schedule-cell-modal');
    if (cellModal) cellModal.style.display = 'none';
    const clickMenu = document.getElementById('custom-click-menu');
    if (clickMenu) clickMenu.style.display = 'none';
}

document.addEventListener('DOMContentLoaded', () => {
    const semStartInput = document.getElementById('semester-start-date');
    const semWeeksInput = document.getElementById('semester-total-weeks');
    if (semStartInput) semStartInput.value = studyData.settings.semesterStart;
    if (semWeeksInput) semWeeksInput.value = studyData.settings.semesterWeeks;

    const eventNoteInput = document.getElementById('event-note');
    if (eventNoteInput) {
        eventNoteInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); addCalendarEvent(); }
        });
    }

    const subjectEndInput = document.getElementById('new-subject-target');
    if (subjectEndInput) {
        subjectEndInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); addSubject(); }
        });
    }

    const engineIds = ['engine-slots', 'engine-start', 'engine-class-len', 'engine-rest-len', 'engine-noon-slot', 'engine-noon-len'];
    engineIds.forEach(id => {
        const inputEl = document.getElementById(id);
        if (inputEl) {
            inputEl.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); updateTimeEngineToCustom(); }
            });
        }
    });

    const cellSubjectInput = document.getElementById('cell-subject-input');
    if (cellSubjectInput) {
        cellSubjectInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') { e.preventDefault(); saveCellSubject(); }
        });
    }

    document.addEventListener('click', () => {
        const menu = document.getElementById('custom-click-menu');
        if (menu) menu.style.display = 'none';
    });
});

function executeMenuEdit() {
    if (!currentActiveEventId) return;
    const ev = studyData.events.find(e => e.id === currentActiveEventId);
    if (!ev) return;

    document.getElementById('custom-click-menu').style.display = 'none';

    document.getElementById('edit-event-id').value = ev.id;
    document.getElementById('edit-event-date').value = ev.date;
    document.getElementById('edit-event-start-time').value = ev.startTime;
    document.getElementById('edit-event-end-time').value = ev.endTime;
    document.getElementById('edit-event-note').value = ev.note;

    selectedColor = ev.color || '#4299e1';
    document.querySelectorAll('.edit-color-dot').forEach(dot => {
        if (dot.getAttribute('data-color') === selectedColor) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });

    document.getElementById('edit-event-modal').style.display = 'block';
}

function selectEditColor(el, color) {
    document.querySelectorAll('.edit-color-dot').forEach(dot => dot.classList.remove('active'));
    el.classList.add('active');
    selectedColor = color;
}

function saveEditedCalendarEvent() {
    const idVal = parseInt(document.getElementById('edit-event-id').value, 10);
    const dateVal = document.getElementById('edit-event-date').value;
    const sTimeVal = document.getElementById('edit-event-start-time').value; // 🎯 修正 ID 命名錯誤
    const eTimeVal = document.getElementById('edit-event-end-time').value;
    const noteVal = document.getElementById('edit-event-note').value;

    if (!dateVal || !sTimeVal || !eTimeVal || !noteVal.trim()) {
        alert("請完整填寫所有欄位資訊！");
        return;
    }
    if (sTimeVal >= eTimeVal) {
        alert("結束時間一定要晚於開始時間喔！(>_<)");
        return;
    }

    const evIdx = studyData.events.findIndex(e => e.id === idVal);
    if (evIdx !== -1) {
        studyData.events[evIdx].date = dateVal;
        studyData.events[evIdx].startTime = sTimeVal;
        studyData.events[evIdx].endTime = eTimeVal;
        studyData.events[evIdx].note = noteVal.trim();
        studyData.events[evIdx].color = selectedColor;

        saveData();
        initSchedule();
        renderGlobalEventList();
        hideModals();
    }
}

function executeMenuTogglePin() {
    if (!currentActiveEventId) return;
    const evIdx = studyData.events.findIndex(e => e.id === currentActiveEventId);
    if (evIdx !== -1) {
        studyData.events[evIdx].isPinned = !studyData.events[evIdx].isPinned;

        saveData();
        initSchedule();
        renderGlobalEventList();
        hideModals();
    }
}