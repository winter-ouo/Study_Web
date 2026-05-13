// 核心資料結構：整合自訂節次與行事曆
let studyData = JSON.parse(localStorage.getItem('studyTrophyData')) || {
    settings: {
        totalWeeks: 18,
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

//清除讀書紀錄
function clearStudyLogs() {
    if (confirm('確定要清除所有讀書統計紀錄嗎？這不會影響你的獎盃與課表。')) {
        studyData.logs = [];
        saveData();
        alert('已清除統計紀錄！');
        if (window.location.pathname.includes('stats.html')) location.reload();
    }
}

// 重設整個系統
function resetEverything() {
    if (confirm('⚠️ 危險操作！這將刪除所有科目、課表與紀錄。確定嗎？')) {
        localStorage.removeItem('studyTrophyData');
        location.reload();
    }
}

// 從課表提取科目名稱供選擇
function getSubjectsFromSchedule() {
    const subjects = new Set();
    Object.values(studyData.schedule).forEach(cell => {
        if (cell.name) subjects.add(cell.name);
    });
    return Array.from(subjects);
}

// 顯示新增科目彈窗 (動態生成下拉選單)
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

function hideModal() {
    document.getElementById('add-modal').style.display = 'none';
}

// 新增科目目標 (支援數字與章節)
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
    hideModal();
}

// 初始化動態課表 (支援行事曆底色)
function initSchedule() {
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
            td.className = cellData.events && cellData.events.length > 0 ? 'editable-cell has-event' : 'editable-cell';
            td.innerHTML = `<div>${cellData.name || ''}</div>${cellData.events && cellData.events.length > 0 ? '📅' : ''}`;
            td.onclick = () => openCellEditor(cellId);
            tr.appendChild(td);
        }
        tbody.appendChild(tr);
    });
}

function openCellEditor(cellId) {
    const data = studyData.schedule[cellId] || { name: "", events: [] };
    const newName = prompt("輸入科目名稱:", data.name);
    if (newName === null) return;
    const eventNote = prompt("新增行事曆提醒 (留白則不新增):", "");

    studyData.schedule[cellId] = {
        name: newName,
        events: eventNote ? [...(data.events || []), { note: eventNote }] : (data.events || [])
    };
    saveData();
    initSchedule();
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