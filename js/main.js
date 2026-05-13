// 1. 初始化資料庫 (LocalStorage)
// 包含科目、課表、以及讀書紀錄
let studyData = JSON.parse(localStorage.getItem('studyTrophyData')) || {
    subjects: [], // 格式: { id, name, start, end, current }
    schedule: Array(8).fill(null).map(() => Array(5).fill('')), // 8節課 x 5天
    logs: [] // 儲存番茄鐘紀錄
};

// 2. 儲存資料到 LocalStorage
function saveData() {
    localStorage.setItem('studyTrophyData', JSON.stringify(studyData));
}

// 3. 渲染獎盃牆 (動態疊加文字與濾鏡)
function renderTrophies() {
    const grid = document.getElementById('trophy-grid');
    if (!grid) return;
    grid.innerHTML = '';

    studyData.subjects.forEach(sub => {
        // 計算進度百分比
        const totalPages = sub.end - sub.start;
        const progressPages = sub.current - sub.start;
        let percent = totalPages > 0 ? (progressPages / totalPages) * 100 : 0;

        // 防呆：進度不超過 100% 且不低於 0%
        percent = Math.min(Math.max(percent, 0), 100);

        // 決定獎盃等級 (對應 CSS 濾鏡類別)
        let trophyClass = 'locked';
        if (percent >= 100) trophyClass = 'gold'; // 100% 金色
        else if (percent >= 66) trophyClass = 'silver'; // 2/3 銀色
        else if (percent >= 33) trophyClass = 'bronze'; // 1/3 銅色

        const item = document.createElement('div');
        item.className = 'trophy-item';
        item.innerHTML = `
            <img src="assets/trophy.png" class="trophy-img ${trophyClass}" alt="${sub.name}進度獎盃">
            <span class="subject-label">${sub.name.substring(0, 2)}</span>
            <p><strong>${sub.name}</strong><br>${sub.current} / ${sub.end} 頁</p>
            <button onclick="deleteSubject(${sub.id})" style="font-size:10px; color:red;">刪除科目</button>
        `;
        grid.appendChild(item);
    });
}

// 4. 科目管理功能
function addSubject() {
    const name = document.getElementById('new-subject-name').value;
    const start = parseInt(document.getElementById('new-subject-start').value);
    const end = parseInt(document.getElementById('new-subject-end').value);

    if (!name || isNaN(start) || isNaN(end) || start >= end) {
        alert("請填寫正確的資訊 (起始頁須小於目標頁)！");
        return;
    }

    const newSub = {
        id: Date.now(),
        name: name,
        start: start,
        end: end,
        current: start
    };

    studyData.subjects.push(newSub);
    saveData();
    renderTrophies();
    hideModal();

    // 清空輸入框
    document.getElementById('new-subject-name').value = '';
    document.getElementById('new-subject-start').value = '';
    document.getElementById('new-subject-end').value = '';
}

function deleteSubject(id) {
    if (confirm('確定要刪除這個科目嗎？相關獎盃也會消失喔！')) {
        studyData.subjects = studyData.subjects.filter(s => s.id !== id);
        saveData();
        renderTrophies();
    }
}

// 5. 課表編輯功能 (P1 核心)
function initSchedule() {
    const tbody = document.getElementById('schedule-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    for (let i = 0; i < 8; i++) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${i + 1}</td>`;
        for (let j = 0; j < 5; j++) {
            const td = document.createElement('td');
            td.className = 'editable-cell';
            td.innerText = studyData.schedule[i][j] || '';
            td.onclick = () => {
                const newVal = prompt('輸入課程或行程：', td.innerText);
                if (newVal !== null) {
                    studyData.schedule[i][j] = newVal;
                    td.innerText = newVal;
                    saveData();
                }
            };
            tr.appendChild(td);
        }
        tbody.appendChild(tr);
    }
}

// 6. 清除功能 (包含清除舊紀錄與重設系統)
/**
 * 清除所有番茄鐘讀書紀錄 (logs)，但保留科目與課表
 */
function clearStudyLogs() {
    if (confirm('確定要清除所有讀書統計紀錄嗎？這不會影響你的獎盃與課表。')) {
        studyData.logs = [];
        saveData();
        alert('已清除統計紀錄！');
        if (window.location.pathname.includes('stats.html')) location.reload();
    }
}

/**
 * 徹底重設整個系統 (警告：所有資料都會消失)
 */
function resetEverything() {
    if (confirm('危險操作！這將刪除所有科目、課表與紀錄。確定嗎？')) {
        localStorage.removeItem('studyTrophyData');
        location.reload();
    }
}