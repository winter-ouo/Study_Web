// 核心資料結構：加入學期與日期自訂功能
let studyData = JSON.parse(localStorage.getItem('studyTrophyData')) || {
    settings: {
        totalWeeks: 18,
        startDate: new Date().toISOString().split('T')[0], // 預設學期今天開始
        timeSlots: [
            { label: "1", time: "08:10~09:00" }, { label: "2", time: "09:10~10:00" },
            { label: "3", time: "10:10~11:00" }, { label: "4", time: "11:10~12:00" },
            { label: "午", time: "12:00~13:10" }, { label: "5", time: "13:10~14:00" },
            { label: "6", time: "14:10~15:00" }, { label: "7", time: "15:10~16:00" },
            { label: "8", time: "16:10~17:00" }, { label: "9", time: "17:10~18:00" },
            { label: "10", time: "18:05~18:55" }, { label: "11", time: "19:00~19:50" },
            { label: "12", time: "19:55~20:45" }, { label: "13", time: "20:50~21:40" }
        ]
    },
    subjects: [],
    schedule: {},
    logs: []
};

function saveData() {
    localStorage.setItem('studyTrophyData', JSON.stringify(studyData));
}

// 系統管理功能
function clearStudyLogs() {
    if (confirm('確定要清除所有讀書統計紀錄嗎？這不會影響你的獎盃與課表。')) {
        studyData.logs = [];
        saveData();
        alert('已清除統計紀錄！');
        if (window.location.pathname.includes('stats.html')) location.reload();
    }
}

function resetEverything() {
    if (confirm('⚠️ 危險操作！這將刪除所有科目、課表與紀錄。確定嗎？')) {
        localStorage.removeItem('studyTrophyData');
        location.reload();
    }
}

// 儲存課表與學期自訂設定
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

    // 重新渲染課表以套用新日期
    initSchedule();
    alert("學期設定已更新！(๑•̀ㅂ•́)و");
}

// 自動計算目前是第幾週
function updateCurrentWeekDisplay() {
    const start = new Date(studyData.settings.startDate);
    const now = new Date();

    // 將時間重設為午夜避免時差計算錯誤
    start.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);

    const diffTime = now.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    let currentWeek = Math.floor(diffDays / 7) + 1;

    const infoText = document.getElementById('current-week-info');
    if (infoText) {
        if (currentWeek > studyData.settings.totalWeeks) {
            infoText.innerHTML = `📅 目前日期：${now.toLocaleDateString()} (學期已結束)`;
        } else if (currentWeek < 1) {
            infoText.innerHTML = `📅 目前日期：${now.toLocaleDateString()} (學期尚未開始)`;
        } else {
            infoText.innerHTML = `📅 目前日期：${now.toLocaleDateString()} <strong>【第 ${currentWeek} 週】</strong>`;
        }
    }
    return currentWeek;
}

// 根據學期起日，推算「本週」週一到週五的實際日期
function getDatesOfCurrentWeek() {
    const start = new Date(studyData.settings.startDate);
    const now = new Date();
    start.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);

    // 計算今天跟學期起始日差幾天
    const diffDays = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    // 推算目前這週的「週一」相對於學期開始日是第幾天
    const currentWeekIdx = Math.floor(diffDays / 7);
    const mondayOfThisWeek = new Date(start.getTime() + (currentWeekIdx * 7 * 24 * 60 * 60 * 1000));

    const weekDates = [];
    for (let i = 0; i < 5; i++) {
        const d = new Date(mondayOfThisWeek.getTime() + (i * 24 * 60 * 60 * 1000));
        // 格式化成 MM/DD
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const date = d.getDate().toString().padStart(2, '0');
        weekDates.push(`${month}/${date}`);
    }
    return weekDates;
}

// 從課表提取科目名稱
function getSubjectsFromSchedule() {
    const subjects = new Set();
    Object.values(studyData.schedule).forEach(cell => {
        if (cell && cell.name) subjects.add(cell.name);
    });
    return Array.from(subjects);
}

// 彈窗與管理控制
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
    const daySelect = document.getElementById('event-day');
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

    if (!isNaN(parseFloat(startVal)) && parseFloat(startVal) < 0) {
        alert("起始範圍不可為負數！");
        return;
    }

    studyData.subjects.push({
        id: Date.now(),
        name: name,
        start: startVal,
        end: endVal,
        current: startVal
    });

    saveData();
    renderTrophies();
    hideModals();
}

function addCalendarEvent() {
    const day = document.getElementById('event-day').value;
    const slot = document.getElementById('event-slot').value;
    const note = document.getElementById('event-note').value;

    if (!note.trim()) {
        alert("請輸入提醒內容！");
        return;
    }

    const cellId = `${day}-${slot}`;
    if (!studyData.schedule[cellId]) studyData.schedule[cellId] = { name: "", events: [] };
    if (!studyData.schedule[cellId].events) studyData.schedule[cellId].events = [];

    studyData.schedule[cellId].events.push({ note: note.trim() });

    saveData();
    initSchedule();
    hideModals();
    document.getElementById('event-note').value = '';
}

// 初始化動態課表 (連動實際動態日期)
function initSchedule() {
    // 更新上方日期與週數提示
    updateCurrentWeekDisplay();

    // 取得本週實際日期數組 [一, 二, 三, 四, 五]
    const dates = getDatesOfCurrentWeek();
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
        tr.innerHTML = `<td><strong>${slot.label}</strong><br><small>${slot.time}</small></td>`;

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
    const newName = prompt("輸入或修改科目名稱 (輸入留白可清除此格):", data.name);
    if (newName !== null) {
        studyData.schedule[cellId] = {
            name: newName.trim(),
            events: data.events || []
        };
        saveData();
        initSchedule();
    }
}

// 增改課表節次定義功能
function changeTimeSlotsCount() {
    const newCount = prompt("你一天想要幾節課？(原本預設為 13 節)", studyData.settings.timeSlots.length);
    if (!newCount || isNaN(newCount)) return;

    const count = parseInt(newCount);
    if (count < 1 || count > 20) {
        alert("節次數量請設定在 1 ~ 20 之間。");
        return;
    }

    // 如果想要增加或減少
    if (count > studyData.settings.timeSlots.length) {
        while (studyData.settings.timeSlots.length < count) {
            const num = studyData.settings.timeSlots.length + 1;
            studyData.settings.timeSlots.push({ label: `${num}`, time: "00:00~00:00" });
        }
    } else {
        if (confirm(`縮減節次可能會丟失第 ${count + 1} 節之後的課表數據，確定嗎？`)) {
            studyData.settings.timeSlots = studyData.settings.timeSlots.slice(0, count);
        } else {
            return;
        }
    }

    // 讓使用者逐一微調新時間（可選，或直接在畫面上修改，此處直接更新重繪）
    saveData();
    initSchedule();
    alert("已成功調整課表節次總數！你可以接著點擊左側節次欄位進行個別時間修改。");
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
                <img src="assets/trophy.png" class="trophy-img ${trophyClass}" alt="${sub.name}獎盃">
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