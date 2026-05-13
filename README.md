---

## 🎨 自定義說明 (Customization)

- **更換獎盃**：請將你設計的 $512 \times 512$ px 透明背景 PNG 放入 `assets/` 並命名為 `trophy.png`。
- **文字疊加**：CSS 已設定 `.subject-label` 類別，可自動將科目名稱的前兩個字壓在獎盃中心。



## 📄 授權協議 (License)

本專案採用 **MIT License**。歡迎自由修改並打造屬於你的學習神器！


---

# 🏆 StudyTrophy (動態獎盃學習系統)

一個基於遊戲化（Gamification）設計的個人學習管理平台。透過自定義科目範圍與番茄鐘，將你的學習進度轉化為直觀的「金、銀、銅」獎盃成就。

![Project Version](https://img.shields.io/badge/Version-1.0.0-blue)
![License](https://img.shields.io/badge/License-MIT-green)
![Tech Stack](https://img.shields.io/badge/Stack-HTML--CSS--JS-orange)

## 🌟 核心特色

- **🏆 動態獎盃系統**：自定義科目進度，達成 1/3、2/3 及全滿時，獎盃會即時變換顏色。
- **📅 互動式課表**：P1 提供動態可編輯的課表，隨時掌握每日行程。
- **🍅 番茄鐘計時**：P2 整合專注時鐘，結束後直接更新科目讀書頁碼。
- **📊 數據可視化**：P3 使用 Chart.js 呈現本週學習時間分佈。
- **💾 LocalFirst**：無須後端資料庫，所有數據加密存儲於瀏覽器 LocalStorage。

---

## 🛠️ 頁面規格 (Page Specifications)

### P1：管理中心 (Dashboard)
- **科目管理**：使用者可動態新增科目，設定 `起始頁` 與 `目標頁`。
- **獎盃牆**：視覺化展示所有科目的進度狀態。

### P2：專注模式 (Focus Mode)
- **計時器**：預設 25 分鐘專注 / 5 分鐘休息。
- **進度回饋**：計時結束後連動更新科目 `當前頁碼`。

### P3：統計報表 (Analytics)
- **週整理**：自動計算過去 7 天的專注時數。
- **比例分析**：顯示不同科目的學習時間佔比。

---

## 📐 進度門檻與變色邏輯

系統會根據你的完成百分比，自動為通用獎盃疊加 CSS 濾鏡（Filter）：

| 進度範圍 | 獎盃等級 | 視覺表現 |
| :--- | :--- | :--- |
| `0% ~ 32%` | **未解鎖** | 灰色半透明 (Locked) |
| `33% ~ 65%` | **銅獎盃** | 銅色濾鏡 (Bronze) |
| `66% ~ 99%` | **銀獎盃** | 銀色濾鏡 (Silver) |
| `100%` | **金獎盃** | 原始金色 (Gold) |

---

## 🚀 快速上手 (Quick Start)

1. **複製專案**
 ```bash
git clone [https://github.com/你的帳號/study-trophy.git](https://github.com/你的帳號/study-trophy.git)

```

2. **開啟網頁**
直接在瀏覽器開啟 `index.html` 即可運行。
3. **部署至 GitHub Pages**
* 將代碼推送到 `main` 分支。
* 在 Repository 的 **Settings > Pages** 中開啟功能。



---

## 📁 檔案結構

```text
/
├── index.html       # P1 課表與獎盃牆
├── pomodoro.html    # P2 番茄鐘與進度輸入
├── stats.html       # P3 週統計圖表
├── assets/
│   └── trophy.png   # 你畫的通用獎盃圖片 (512x512)
├── css/
│   └── style.css    # 包含獎盃濾鏡與佈局樣式
└── js/
    ├── main.js      # 處理 LocalStorage 與獎盃邏輯
    └── timer.js     # 番茄鐘計時引擎

```

---

## 🎨 自定義說明 (Customization)

* **更換獎盃**：請將你設計的 $512 \times 512$ px 透明背景 PNG 放入 `assets/` 並命名為 `trophy.png`。
* **文字疊加**：CSS 已設定 `.subject-label` 類別，可自動將科目名稱的前兩個字壓在獎盃中心。


