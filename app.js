const firebaseConfig = {
    apiKey: "AIzaSyCPAYMe0TMPGsBHHocO4FaEH9KONB_KV3Q",
    authDomain: "vietlott-cvn.firebaseapp.com",
    databaseURL: "https://vietlott-cvn-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "vietlott-cvn",
    storageBucket: "vietlott-cvn.firebasestorage.app",
    messagingSenderId: "851092496389",
    appId: "1:851092496389:web:f8859cf96a742f545a3c6c"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let currentType = 'lotto';
let currentView = 'matrix';
let globalOnlineData = { lotto: [], mega: [], power: [] };
let currentUserRole = 'member'; 
let currentUserName = '';
let currentLogSessionKey = null; 
let currentPredictionCount = 0; 
let cachedLogSnapshotText = ""; 
let testSets = { lotto: { main: [], spec: null }, mega: { main: [] }, power: { main: [], spec: null } };
let activePredictions = [];
let isIframeZoomed = false;

let tabStatesStorage = {
    lotto: { mainLock: [], specLock: '', algo: 'combined', size: '1', html: '', activePreds: [] },
    mega: { mainLock: [], specLock: '', algo: 'combined', size: '1', html: '', activePreds: [] },
    power: { mainLock: [], specLock: '', algo: 'combined', size: '1', html: '', activePreds: [] }
};

function initLoginVisualEffects() {
    setupDollarRain('dollarRainContainer', 25);
    setupDollarRain('lockDollarRainContainer', 25);

    ['fw1', 'fw2', 'fw3', 'fw4', 'fw5'].forEach(id => setupMultiFireworks(id));
    ['lfw1', 'lfw2', 'lfw3', 'lfw4', 'lfw5'].forEach(id => setupMultiFireworks(id));

    setInterval(updateRealtimeClock, 1000);
    updateRealtimeClock();
}

function setupDollarRain(containerId, count) {
    let container = document.getElementById(containerId);
    if (!container || container.innerHTML !== "") return;
    for (let i = 0; i < count; i++) {
        let d = document.createElement('div');
        d.className = 'falling-dollar';
        d.innerText = '💵';
        d.style.left = Math.random() * 100 + '%';
        d.style.animationDuration = (2.5 + Math.random() * 3.5) + 's';
        d.style.animationDelay = (Math.random() * 4) + 's';
        container.appendChild(d);
    }
}

function setupMultiFireworks(clusterId) {
    let container = document.getElementById(clusterId);
    if (!container || container.innerHTML !== "") return;

    setInterval(() => {
        let isLoginVisible = document.getElementById('loginOverlay').style.display !== 'none';
        let isLockVisible = document.getElementById('lockOverlay').style.display !== 'none';
        if (!isLoginVisible && !isLockVisible) return;

        for (let i = 0; i < 12; i++) {
            let p = document.createElement('div');
            p.className = 'firework-particle';
            let angle = Math.random() * Math.PI * 2;
            let distance = 35 + Math.random() * 70;
            p.style.setProperty('--dx', Math.cos(angle) * distance + 'px');
            p.style.setProperty('--dy', Math.sin(angle) * distance + 'px');
            p.style.background = ['#ff007f', '#00f2fe', '#ffab00', '#00ff66', '#b366ff'][Math.floor(Math.random() * 5)];
            container.appendChild(p);
            setTimeout(() => p.remove(), 1200);
        }
    }, 1400);
}

function updateRealtimeClock() {
    let now = new Date();
    let timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    let dateStr = now.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' });
    
    let timeEl = document.getElementById('realtimeClockDisplay');
    let dateEl = document.getElementById('realtimeDateDisplay');
    if (timeEl) timeEl.innerText = timeStr;
    if (dateEl) dateEl.innerText = dateStr;
}

function updateThemeColors() {
    let mColor = document.getElementById('pickerMainColor').value;
    let sColor = document.getElementById('pickerSpecColor').value;
    let tColor = document.getElementById('pickerTextColor').value;
    let hColor = document.getElementById('pickerHoverColor').value;
    
    document.documentElement.style.setProperty('--custom-main-color', mColor);
    document.documentElement.style.setProperty('--custom-spec-color', sColor);
    document.documentElement.style.setProperty('--custom-text-color', tColor);
    
    let r = parseInt(hColor.substr(1,2),16);
    let g = parseInt(hColor.substr(3,2),16);
    let b = parseInt(hColor.substr(5,2),16);
    document.documentElement.style.setProperty('--custom-hover-color', `rgba(${r}, ${g}, ${b}, 0.25)`);
}

function resetThemeColorsDefault() {
    document.getElementById('pickerMainColor').value = "#005229";
    document.getElementById('pickerSpecColor').value = "#cc5c00";
    document.getElementById('pickerTextColor').value = "#ffffff";
    document.getElementById('pickerHoverColor').value = "#00f2fe";
    updateThemeColors();
}

function handleSystemLogin() {
    let u = document.getElementById('loginUser').value.trim().toLowerCase();
    let p = document.getElementById('loginPass').value.trim();
    let rem = document.getElementById('loginRemember').checked;
    
    if(!u || !p) {
        let errBox = document.getElementById('loginError');
        errBox.innerText = "Vui lòng nhập đầy đủ Tên đăng nhập và Mật khẩu!";
        errBox.style.display = 'block';
        return;
    }

    if ((u === 'daica' && p === '123') || (u === 'admin' && p === '123')) {
        executeLoginSuccess(u, 'admin', rem);
        return;
    }

    db.ref('system_accounts').once('value', (snapshot) => {
        let accounts = snapshot.val() || {};
        if (accounts[u] && accounts[u].password === p) {
            executeLoginSuccess(u, accounts[u].role || 'member', rem);
        } else {
            let errBox = document.getElementById('loginError');
            errBox.innerText = "Mật khẩu hoặc tên đăng nhập không đúng thưa Đại ca!";
            errBox.style.display = 'block';
        }
    }).catch(() => {
        if (u === 'daica' || u === 'admin') {
            executeLoginSuccess(u, 'admin', rem);
        } else {
            executeLoginSuccess(u, 'member', rem);
        }
    });
}

function executeLoginSuccess(username, role, rem) {
    currentUserRole = role;
    currentUserName = username;
    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('lockOverlay').style.display = 'none';
    document.getElementById('headerButtonsGroup').style.display = 'flex';

    if(rem) {
        localStorage.setItem('cvn_remember_user', username);
        localStorage.setItem('cvn_remember_role', role);
    }

    let timeStr = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    let initialSnapshot = "Chưa kích hoạt dự đoán";
    let pushRef = db.ref('login_history').push({ 
        username: username, 
        role: username === 'daica' ? 'Đại ca tối cao' : (role === 'admin' ? 'Admin thường' : 'Thành viên'), 
        time: timeStr, 
        snapshot: initialSnapshot 
    });
    currentLogSessionKey = pushRef.key;
    currentPredictionCount = 0; 
    cachedLogSnapshotText = initialSnapshot;

    document.getElementById('viewAdminBtn').style.display = 'block';

    if (currentUserName === 'daica' || currentUserRole === 'admin') {
        document.getElementById('adminDeleteBtn').style.display = 'flex';
        document.getElementById('adminUpdateBoard').style.display = 'flex'; 
        document.getElementById('viewAdminBtn').innerText = "🛡️ QUẢN TRỊ";
        document.getElementById('adminLayoutWrapper').style.display = 'grid';
        document.getElementById('memberLayoutWrapper').style.display = 'none';
        
        if (currentUserName === 'daica') {
            document.getElementById('headerTitle').innerText = "HỆ THỐNG VIETLOTT - XIN CHÀO ĐẠI CA TỐI CAO!";
        } else {
            document.getElementById('headerTitle').innerText = `Hệ thống Vietlott - Admin: ${username}`;
        }
        loadAdminPanels();
    } else {
        document.getElementById('adminDeleteBtn').style.display = 'none';
        document.getElementById('adminUpdateBoard').style.display = 'none'; 
        document.getElementById('viewAdminBtn').innerText = "📋 LỊCH SỬ & ĐỔI MK";
        document.getElementById('adminLayoutWrapper').style.display = 'none';
        document.getElementById('memberLayoutWrapper').style.display = 'grid';
        document.getElementById('headerTitle').innerText = `Hệ thống Vietlott - Thành viên: ${username}`;
        loadMemberPanelLogs();
    }
    startSyncingDatabase();
}

function handleSystemLock() {
    document.getElementById('lockOverlay').style.display = 'flex';
    document.getElementById('lockTitleText').innerHTML = `Xin chào [ ${currentUserName.toUpperCase()} ],<br>Phiên làm việc đang khóa`;
    document.getElementById('lockPassInput').value = '';
    document.getElementById('lockError').style.display = 'none';
    document.getElementById('lockPassInput').focus();
}

function handleUnlockSystem() {
    let pass = document.getElementById('lockPassInput').value.trim();
    if (!pass) return;

    if ((currentUserName === 'daica' || currentUserName === 'admin') && pass === '123') {
        document.getElementById('lockOverlay').style.display = 'none';
        return;
    }

    db.ref(`system_accounts/${currentUserName}`).once('value', (snapshot) => {
        let data = snapshot.val() || {};
        if (data.password === pass) {
            document.getElementById('lockOverlay').style.display = 'none';
        } else {
            let err = document.getElementById('lockError');
            err.style.display = 'block';
        }
    }).catch(() => {
        if (pass === '123') {
            document.getElementById('lockOverlay').style.display = 'none';
        } else {
            let err = document.getElementById('lockError');
            err.style.display = 'block';
        }
    });
}

function handleSwitchToOtherAccount() {
    document.getElementById('lockOverlay').style.display = 'none';
    document.getElementById('loginOverlay').style.display = 'flex';
    document.getElementById('headerButtonsGroup').style.display = 'none';
    document.getElementById('loginUser').value = '';
    document.getElementById('loginPass').value = '';
    localStorage.removeItem('cvn_remember_user');
    localStorage.removeItem('cvn_remember_role');
}

function pushCurrentPredictionsToSessionLog(triggerContextName) {
    if (!currentLogSessionKey) return;
    let validPreds = activePredictions.filter(x => x !== null);
    if (validPreds.length === 0) return;

    currentPredictionCount++;
    let currentLocalTime = new Date().toLocaleTimeString('vi-VN');

    let formattedList = validPreds.map((p, idx) => {
        let rowLabel = String.fromCharCode(65 + (idx % 6)); 
        let ticketNum = Math.floor(idx / 6) + 1;
        let dataStr = p.spec ? `${p.main.join(' ')} | ĐB: ${p.spec}` : p.main.join(' ');
        return `   + Tuyến ${ticketNum}-${rowLabel}: [ ${dataStr} ]`;
    });

    let chunkLogHeader = `[Lần ${currentPredictionCount} - Lúc ${currentLocalTime} từ Hành động: ${triggerContextName}] (Đài: ${currentType.toUpperCase()})`;
    let newLogBlockSegment = chunkLogHeader + `\n` + formattedList.join('\n');

    db.ref(`login_history/${currentLogSessionKey}/snapshot`).once('value', (snapshot) => {
        let existingDataText = snapshot.val() || "";
        let updatedCumulativeLogText = "";
        if (existingDataText === "Chưa kích hoạt dự đoán" || existingDataText === "") {
            updatedCumulativeLogText = newLogBlockSegment;
        } else {
            updatedCumulativeLogText = existingDataText + `\n\n` + newLogBlockSegment;
        }
        cachedLogSnapshotText = updatedCumulativeLogText; 
        db.ref(`login_history/${currentLogSessionKey}/snapshot`).set(updatedCumulativeLogText);
    });
}

function handleSystemLogout() {
    localStorage.removeItem('cvn_remember_user');
    localStorage.removeItem('cvn_remember_role');
    location.reload();
}

function toggleIframeZoomState() {
    let container = document.getElementById('sidebarResultIframeContainer');
    let btn = document.getElementById('iframeZoomTriggerBtn');
    isIframeZoomed = !isIframeZoomed;
    
    if (isIframeZoomed) {
        container.classList.add('zoomed-state');
        btn.innerHTML = '✕';
        btn.style.background = 'linear-gradient(135deg, #2a2a3d 0%, #161622 100%)';
        btn.style.borderColor = 'var(--accent-pink)';
    } else {
        container.classList.remove('zoomed-state');
        btn.innerHTML = '⛶';
        btn.style.background = 'linear-gradient(135deg, var(--accent-pink) 0%, #b30059 100%)';
        btn.style.borderColor = 'rgba(255, 255, 255, 0.2)';
    }
}

function loadAdminPanels() {
    db.ref('system_accounts').on('value', (snapshot) => {
        let accounts = snapshot.val() || {};
        let html = `<table class="admin-table"><tr><th>Tài khoản</th><th>Mật khẩu</th><th>Vai trò</th><th>Hành động</th></tr>`;
        for (let acc in accounts) {
            if (acc === 'daica' && currentUserName !== 'daica') continue;
            let currentRole = accounts[acc].role || 'member';
            let isTargetDaica = (acc === 'daica');

            html += `<tr>
                <td><input type="text" id="userInput_${acc}" class="admin-input admin-input-user" value="${acc}"></td>
                <td><input type="text" id="passInput_${acc}" class="admin-input" value="${accounts[acc].password}"></td>
                <td>
                    <select id="roleInput_${acc}" class="admin-select-role" ${isTargetDaica ? 'disabled' : ''}>
                        <option value="member" ${currentRole==='member'?'selected':''}>Thành viên</option>
                        <option value="admin" ${currentRole==='admin'?'selected':''}>Admin thường</option>
                        ${isTargetDaica ? '<option value="admin" selected>Đại ca tối cao</option>' : ''}
                    </select>
                </td>
                <td>
                    <div class="admin-actions-flex-cell">
                        <button class="btn-table-action" style="background:#007bff;" onclick="modifyAccountOnline('${acc}')">Thay đổi</button>
                        ${isTargetDaica ? '-' : `<button class="btn-table-action" style="background:var(--accent-pink);" onclick="deleteAccountOnline('${acc}')">Thu hồi</button>`}
                    </div>
                </td>
            </tr>`;
        }
        html += `</table>`;
        document.getElementById('accountsListArea').innerHTML = html;
    });

    db.ref('login_history').limitToLast(50).on('value', (snapshot) => {
        let logs = snapshot.val() || {};
        let html = `<table class="admin-table"><tr><th>Tên định danh</th><th>Vai trò cấp</th><th>Mốc thời gian</th><th>Dữ liệu</th></tr>`;
        let logArray = [];
        for (let id in logs) { let item = logs[id]; item.id = id; logArray.unshift(item); }
        logArray.forEach(log => { 
            if (currentUserName !== 'daica') {
                if (log.username === 'daica' || (log.role && log.role.includes('Đại ca'))) return;
            }
            let snapEscaped = log.snapshot ? encodeURIComponent(log.snapshot) : "Trống";
            html += `<tr>
                <td style="color:var(--border-glow); font-weight:bold;">${log.username}</td>
                <td>${log.role}</td>
                <td style="color:#ffab00;">${log.time}</td>
                <td><a href="#" style="color:var(--accent-green); font-weight:bold; text-decoration:none;" onclick="viewLogSnapshot('${snapEscaped}')">Lịch sử</a></td>
            </tr>`; 
        });
        html += `</table>`;
        document.getElementById('logsListArea').innerHTML = html;
    });
}

function loadMemberPanelLogs() {
    db.ref('login_history').on('value', (snapshot) => {
        let logs = snapshot.val() || {};
        let html = `<table class="admin-table"><tr><th>Mốc thời gian đăng nhập</th><th>Bộ số phân tích trong phiên</th></tr>`;
        let matchedLogArray = [];
        for (let id in logs) {
            if (logs[id].username === currentUserName) {
                let item = logs[id]; item.id = id; matchedLogArray.unshift(item);
            }
        }
        matchedLogArray.forEach(log => {
            let snapEscaped = log.snapshot ? encodeURIComponent(log.snapshot) : "Trống";
            html += `<tr>
                <td style="color:#ffab00; font-weight:bold; padding:8px 4px;">${log.time}</td>
                <td><a href="#" style="color:var(--border-glow); font-weight:bold; text-decoration:none;" onclick="viewLogSnapshot('${snapEscaped}')">Xem lại bộ số đã lưu</a></td>
            </tr>`;
        });
        html += `</table>`;
        document.getElementById('memberSelfLogsArea').innerHTML = html;
    });
}

function executeSelfProfileMutation() {
    let userCheck = document.getElementById('pwdConfirmUser').value.trim().toLowerCase();
    let oldPass = document.getElementById('pwdOldPass').value.trim();
    let newUser = document.getElementById('pwdNewUser').value.trim().toLowerCase();
    let newPass = document.getElementById('pwdNewPass').value.trim();

    if (!userCheck || !oldPass) { alert("Vui lòng nhập Tên đăng nhập cũ và Mật khẩu hiện tại để xác thực!"); return; }
    if (userCheck !== currentUserName) { alert("Tên đăng nhập cũ xác nhận không khớp!"); return; }
    if (!newUser && !newPass) { alert("Vui lòng nhập ít nhất Tên mới hoặc Mật khẩu mới cần đổi!"); return; }

    if (currentUserName !== 'daica' && newUser === 'daica') {
        alert("Hành vi bất hợp pháp! Quyền trượng tối cao không thể bị chiếm đoạt.");
        return;
    }

    db.ref(`system_accounts/${currentUserName}`).once('value', (snapshot) => {
        let data = snapshot.val() || {};
        if (!snapshot.exists() || data.password !== oldPass) { alert("Mật khẩu hiện tại không chính xác!"); return; }
        
        let updatedRole = data.role || 'member';
        let targetUserKey = newUser ? newUser : currentUserName;
        let targetPassword = newPass ? newPass : oldPass;

        let proceedMutation = () => {
            db.ref(`system_accounts/${targetUserKey}`).set({
                password: targetPassword,
                role: updatedRole
            }).then(() => {
                if (newUser && newUser !== currentUserName) {
                    db.ref(`system_accounts/${currentUserName}`).remove();
                    localStorage.setItem('cvn_remember_user', targetUserKey);
                    currentUserName = targetUserKey;
                }
                alert("Đã cập nhật thông tin thành công!");
                document.getElementById('pwdConfirmUser').value = '';
                document.getElementById('pwdOldPass').value = '';
                document.getElementById('pwdNewUser').value = '';
                document.getElementById('pwdNewPass').value = '';
                
                if (currentUserName !== 'daica' && currentUserRole !== 'admin') {
                    document.getElementById('headerTitle').innerText = `Hệ thống Vietlott - Thành viên: ${targetUserKey}`;
                }
            });
        };

        if (newUser && newUser !== currentUserName) {
            db.ref(`system_accounts/${newUser}`).once('value', (checkSnap) => {
                if (checkSnap.exists()) { alert("Tên tài khoản mới này đã có người sử dụng!"); } else { proceedMutation(); }
            });
        } else {
            proceedMutation();
        }
    });
}

function viewLogSnapshot(snapTextEncoded) {
    let text = decodeURIComponent(snapTextEncoded);
    if ((text === "Chưa kích hoạt dự đoán" || !text.trim()) && cachedLogSnapshotText && cachedLogSnapshotText !== "Chưa kích hoạt dự đoán") {
        text = cachedLogSnapshotText;
    }
    cachedLogSnapshotText = text;

    document.getElementById('modalTitleText').innerText = "Nhật ký lưu trữ các lần dự đoán của phiên";
    
    if (text === "Chưa kích hoạt dự đoán" || !text.trim()) {
        document.getElementById('modalTextContent').innerHTML = `<div style="color:var(--text-muted); text-align:center; padding:20px;">Chưa kích hoạt lượt dự đoán nào trong phiên này!</div>`;
        document.getElementById('composeModal').style.display = 'flex';
        return;
    }

    let htmlContainerContent = "";
    let chunkBlocks = text.split(/\n(?=\[Lần)/g); 

    chunkBlocks.forEach((block, blockIndex) => {
        if (!block.trim()) return;
        let lines = block.split('\n');
        let blockHeaderTitle = lines[0] || "Lượt nhật ký";
        
        let targetBroadcastingPlatform = "LOTTO"; 
        if (blockHeaderTitle.toUpperCase().includes("MEGA")) targetBroadcastingPlatform = "MEGA";
        else if (blockHeaderTitle.toUpperCase().includes("POWER")) targetBroadcastingPlatform = "POWER";

        htmlContainerContent += `<div class="history-chunk-box">`;
        htmlContainerContent += `<div class="history-chunk-title">${blockHeaderTitle}</div>`;
        htmlContainerContent += `<div class="history-chunk-body-layout">`;
        htmlContainerContent += `<div class="history-chunk-left-lines">`;
        
        let checkboxLineCounter = 0;
        for (let idx = 1; idx < lines.length; idx++) {
            let currentLineRaw = lines[idx].trim();
            if (!currentLineRaw.startsWith('+')) continue;
            
            let dataCoreSegment = currentLineRaw.substring(currentLineRaw.indexOf(':') + 1).replace('[', '').replace(']', '').trim();
            let leftLabelPrefix = currentLineRaw.substring(0, currentLineRaw.indexOf(':')).replace('+', '').trim();

            htmlContainerContent += `
                <div class="history-ticket-line">
                    <div>
                        <span style="color:var(--text-muted); margin-right:8px; font-weight:bold;">${leftLabelPrefix}:</span>
                        <span class="history-line-data" id="data_string_${blockIndex}_${checkboxLineCounter}">${dataCoreSegment}</span>
                    </div>
                    <input type="checkbox" class="history-rebuy-checkbox rebuy-check-node-${blockIndex}" data-index="${checkboxLineCounter}" checked>
                </div>`;
            checkboxLineCounter++;
        }
        htmlContainerContent += `</div>`;
        htmlContainerContent += `
            <div class="history-chunk-right-action">
                <button class="btn-chunk-master-rebuy" onclick="triggerBatchLinesRebuy(${blockIndex}, '${targetBroadcastingPlatform}')">Mua<br>Lại 🛒</button>
            </div>`;
        htmlContainerContent += `</div>`;
        htmlContainerContent += `</div>`;
    });

    document.getElementById('modalTextContent').innerHTML = htmlContainerContent;
    document.getElementById('composeModal').style.display = 'flex';
}

function triggerBatchLinesRebuy(blockId, broadcastingPlatformName) {
    let checkNodes = document.querySelectorAll(`.rebuy-check-node-${blockId}`);
    let compiledSmsLinesArray = [];

    checkNodes.forEach(node => {
        if (node.checked) {
            let dataIdx = node.getAttribute('data-index');
            let rawNumbersText = document.getElementById(`data_string_${blockId}_${dataIdx}`).innerText.trim();
            
            let parsedNumbersPayload = "";
            if (broadcastingPlatformName === "LOTTO") {
                if (rawNumbersText.includes('|')) {
                    let structures = rawNumbersText.split('|');
                    let mainPart = structures[0].trim().replace(/\s+/g, ' ');
                    let specPart = structures[1].replace('ĐB:', '').trim();
                    parsedNumbersPayload = `${mainPart}-${specPart}`;
                } else {
                    parsedNumbersPayload = rawNumbersText.replace(/\s+/g, ' ');
                }
            } else {
                parsedNumbersPayload = rawNumbersText.replace('ĐB:', '').replace('|', '').trim().replace(/\s+/g, ' ');
            }
            compiledSmsLinesArray.push(`S ${parsedNumbersPayload}`);
        }
    });

    if (compiledSmsLinesArray.length === 0) { alert("Đại ca chưa tích chọn dòng dãy số nào để tiến hành mua lại!"); return; }

    let prefixCode = "535 K1";
    if (broadcastingPlatformName === "MEGA") prefixCode = "645 K1";
    else if (broadcastingPlatformName === "POWER") prefixCode = "655 K1";

    document.getElementById('modalTitleText').innerText = "CẤU TRÚC PHÔI VÉ MUA LẠI";
    let container = document.getElementById('modalTextContent');
    container.innerHTML = '';

    let linesPerTicket = 6;
    let ticketCount = Math.ceil(compiledSmsLinesArray.length / linesPerTicket);

    for (let t = 0; t < ticketCount; t++) {
        let currentSmsLines = [];
        for (let l = 0; l < linesPerTicket; l++) {
            let globalIdx = t * linesPerTicket + l;
            if (globalIdx < compiledSmsLinesArray.length) {
                currentSmsLines.push(compiledSmsLinesArray[globalIdx]);
            }
        }
        if (currentSmsLines.length > 0) {
            let fullSmsText = `${prefixCode} ${currentSmsLines.join(' ')}`;
            let blockIndex = t + 1;
            let blockDiv = document.createElement('div');
            blockDiv.className = 'sms-block';
            blockDiv.innerHTML = `
                <div class="sms-header">
                    <span style="color:var(--accent-green)">🎟️ PHÔI VÉ MUA LẠI SỐ ${blockIndex} (ĐÀI ${broadcastingPlatformName})</span>
                    <button class="btn-copy-sms" onclick="copyIndividualSms('rebuy_sms_block_${blockIndex}')">SAO CHÉP VÉ ${blockIndex}</button>
                </div>
                <div class="sms-text" id="rebuy_sms_block_${blockIndex}">${fullSmsText}</div>`;
            container.appendChild(blockDiv);
        }
    }

    let navigationBackDiv = document.createElement('div');
    navigationBackDiv.style.textAlign = 'center';
    navigationBackDiv.style.marginTop = '12px';
    navigationBackDiv.innerHTML = `<button class="modal-btn-cancel" style="border-color:var(--border-glow); color:var(--border-glow);" onclick="reloadPreviousHistoryPopupSession()">↩️ Quay lại Nhật ký</button>`;
    container.appendChild(navigationBackDiv);
}

function reloadPreviousHistoryPopupSession() {
    viewLogSnapshot(encodeURIComponent(cachedLogSnapshotText));
}

function addNewAccountOnline() {
    let u = document.getElementById('newAccUser').value.trim().toLowerCase();
    let p = document.getElementById('newAccPass').value.trim();
    let r = document.getElementById('newAccRole').value;
    if(!u || !p) { alert("Đại ca/Admin nhập thiếu thông tin cấu hình!"); return; }
    if(u === 'daica') { alert("Không cho phép tạo bản sao trùng lặp của Đại ca tối cao!"); return; }
    db.ref('system_accounts/' + u).set({ password: p, role: r });
    document.getElementById('newAccUser').value = ''; document.getElementById('newAccPass').value = '';
}

function modifyAccountOnline(originalKey) {
    let newUsername = document.getElementById(`userInput_${originalKey}`).value.trim().toLowerCase();
    let newPass = document.getElementById(`passInput_${originalKey}`).value.trim();
    let newRole = (originalKey === 'daica') ? 'admin' : document.getElementById(`roleInput_${originalKey}`).value;
    
    if(!newUsername || !newPass) { alert("Không được bỏ trống thông tin!"); return; }
    if(originalKey !== 'daica' && newUsername === 'daica') { alert("Không cho phép đổi tên tài khoản thành tài khoản tối cao!"); return; }
    
    let applyChange = () => {
        db.ref(`system_accounts/${newUsername}`).set({ password: newPass, role: newRole }).then(() => {
            if (newUsername !== originalKey) {
                db.ref(`system_accounts/${originalKey}`).remove();
                if (currentUserName === originalKey) {
                    currentUserName = newUsername;
                    localStorage.setItem('cvn_remember_user', newUsername);
                }
            }
            alert(`Đã cập nhật cấu hình [${newUsername}] thành công!`);
        });
    };

    if(newUsername !== originalKey) {
        db.ref(`system_accounts/${newUsername}`).once('value', (snap) => {
            if (snap.exists()) { alert("Tên tài khoản mới bị trùng lặp!"); } else { applyChange(); }
        });
    } else {
        applyChange();
    }
}

function deleteAccountOnline(username) { 
    if(username === 'daica') { alert("Không thể xóa tài khoản Tối cao của hệ thống!"); return; }
    if (confirm(`Bạn có chắc muốn thu hồi quyền truy cập tài khoản [${username}]?`)) { db.ref('system_accounts/' + username).remove(); } 
}

function startSyncingDatabase() {
    db.ref('vietlott_matrix_data').on('value', (snapshot) => {
        let data = snapshot.val() || {};
        globalOnlineData.lotto = data.lotto || [];
        globalOnlineData.mega = data.mega || [];
        globalOnlineData.power = data.power || [];

        let hasLotto = globalOnlineData.lotto.length > 0;
        let hasMega = globalOnlineData.mega.length > 0;
        let hasPower = globalOnlineData.power.length > 0;

        document.getElementById('statusLotto').classList.toggle('active', hasLotto);
        document.getElementById('statusMega').classList.toggle('active', hasMega);
        document.getElementById('statusPower').classList.toggle('active', hasPower);

        let box = document.getElementById('globalStatusBox');
        if (hasLotto && hasMega && hasPower) {
            box.style.borderColor = 'var(--accent-green)';
            box.style.boxShadow = '0 0 12px rgba(0, 255, 102, 0.35), inset 0 0 6px rgba(0, 255, 102, 0.1)';
        } else {
            box.style.borderColor = '#2e2e42';
            box.style.boxShadow = 'inset 0 0 5px rgba(0,0,0,0.5)';
        }
        reloadCurrentMatrix();
    });
}

function getHeatmapColor(count, maxCount) {
    if (count === 0) return '#101016';
    if (maxCount <= 0) return '#1b4d22';
    let ratio = count / maxCount;
    let r, g, b;
    if (ratio <= 0.5) {
        let localRatio = ratio / 0.5;
        r = Math.round(15 + (180 - 15) * localRatio); g = Math.round(80 + (130 - 80) * localRatio); b = Math.round(40 + (20 - 40) * localRatio);
    } else {
        let localRatio = (ratio - 0.5) / 0.5;
        r = Math.round(180 + (230 - 180) * localRatio); g = Math.round(130 + (30 - 130) * localRatio); b = Math.round(20 + (10 - 20) * localRatio);
    }
    return `rgb(${r}, ${g}, ${b})`;
}

function handleMultiFileSelect(e) {
    let files = e.target.files;
    if (files.length === 0) return;
    let loadedTypes = []; let processed = 0;
    Array.from(files).forEach(file => {
        let filename = file.name.toLowerCase();
        let targetType = '';
        if (filename.includes('535') || filename === '535.txt') targetType = 'lotto';
        else if (filename.includes('645') || filename === '645.txt') targetType = 'mega';
        else if (filename.includes('655') || filename === '655.txt') targetType = 'power';
        if (targetType) {
            let reader = new FileReader();
            reader.onload = function(evt) {
                let text = evt.target.result;
                let lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                let parsedRows = [];
                lines.forEach(line => {
                    let parts = line.split('|').map(p => p.trim());
                    if(parts.length >= 2) {
                        let dateStr = parts[0];
                        let mainNums = parts[1].split(/\s+/).map(n => String(parseInt(n)).padStart(2, '0'));
                        let specNum = parts[2] ? String(parseInt(parts[2])).padStart(2, '0') : null;
                        parsedRows.push({ date: dateStr, main: mainNums, spec: specNum });
                    }
                });
                let limitedRows = parsedRows.slice(0, 60);
                if (limitedRows.length > 0) {
                    db.ref('vietlott_matrix_data/' + targetType).set(limitedRows);
                    loadedTypes.push(targetType.toUpperCase());
                }
                processed++; if(processed === files.length) { alert("Đồng bộ dữ liệu tệp thành công: " + loadedTypes.join(', ')); }
            };
            reader.readAsText(file);
        } else { processed++; }
    });
    e.target.value = '';
}

function downloadTextFile(filename, text) {
    let element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename); element.style.display = 'none';
    document.body.appendChild(element); element.click(); document.body.removeChild(element);
}

function convertDataToText(rows) {
    return rows.map(r => {
        let line = `${r.date} | ${r.main.join(' ')}`;
        if (r.spec) line += ` | ${r.spec}`;
        return line;
    }).join('\n');
}

function exportAllCloudData() {
    let exportedCount = 0;
    if (globalOnlineData.lotto && globalOnlineData.lotto.length > 0) { downloadTextFile('535.txt', convertDataToText(globalOnlineData.lotto)); exportedCount++; }
    if (globalOnlineData.mega && globalOnlineData.mega.length > 0) { downloadTextFile('645.txt', convertDataToText(globalOnlineData.mega)); exportedCount++; }
    if (globalOnlineData.power && globalOnlineData.power.length > 0) { downloadTextFile('655.txt', convertDataToText(globalOnlineData.power)); exportedCount++; }
    if (exportedCount > 0) { alert(`Hệ thống bảo mật đã xuất ${exportedCount} tệp lưu trữ thành công thưa Đại ca!`); }
}

function handleBoardDataPush() {
    let text = document.getElementById('boardRawInput').value.trim();
    if (!text) { 
        startSyncingDatabase(); 
        alert(`Đã làm mới dữ liệu đài ${currentType.toUpperCase()} từ Đám mây thưa Đại ca!`); 
        return; 
    }

    let rawLines = text.split('\n');
    let parsedNewRows = [];

    rawLines.forEach(line => {
        let cleanLine = line.trim();
        if (!cleanLine) return;

        let parts = cleanLine.split(/[|\t]+/).map(p => p.trim()).filter(p => p.length > 0);
        
        if (parts.length >= 2) {
            let dateStr = parts[0];
            let numMatches = parts[1].match(/\d+/g);
            if (numMatches && numMatches.length >= 5) {
                let mainNums = numMatches.slice(0, (numMatches.length === 5 || numMatches.length === 7) ? 5 : 6)
                                         .map(n => String(parseInt(n)).padStart(2, '0'));
                
                let specNum = null;
                if (parts[2]) {
                    let specMatch = parts[2].match(/\d+/);
                    if (specMatch) specNum = String(parseInt(specMatch[0])).padStart(2, '0');
                } else if (numMatches.length > mainNums.length) {
                    specNum = String(parseInt(numMatches[numMatches.length - 1])).padStart(2, '0');
                }

                parsedNewRows.push({ date: dateStr, main: mainNums, spec: specNum });
            }
        }
    });

    if (parsedNewRows.length === 0) { 
        alert("Không tìm thấy bộ số hợp lệ trong văn bản dán vào thưa Đại ca!"); 
        return; 
    }

    let sampleRow = parsedNewRows[0]; 
    let autoDetectedType = currentType; 
    let firstRowRaw = text.toLowerCase();

    if (firstRowRaw.includes('535') || firstRowRaw.includes('lotto')) autoDetectedType = 'lotto';
    else if (firstRowRaw.includes('645') || firstRowRaw.includes('mega')) autoDetectedType = 'mega';
    else if (firstRowRaw.includes('655') || firstRowRaw.includes('power')) autoDetectedType = 'power';
    else {
        if (sampleRow.main.length === 5) autoDetectedType = 'lotto';
        else if (sampleRow.main.length === 6) {
            if (sampleRow.spec !== null) autoDetectedType = 'power';
            else autoDetectedType = sampleRow.main.some(n => parseInt(n) > 45) ? 'power' : 'mega';
        }
    }

    let finalDataset = [];
    let addedCount = 0;

    if (parsedNewRows.length >= 50) {
        finalDataset = parsedNewRows.slice(0, 60);
        addedCount = finalDataset.length;
    } else {
        let existingData = globalOnlineData[autoDetectedType] || [];
        let mergedRows = [...existingData];

        let isExist = mergedRows.some(oldRow => {
            let sameDate = (oldRow.date === parsedNewRows[0].date);
            let sameMain = (oldRow.main.join(',') === parsedNewRows[0].main.join(','));
            let sameSpec = (oldRow.spec === parsedNewRows[0].spec);
            return sameDate && sameMain && sameSpec;
        });

        if (!isExist) {
            for (let i = parsedNewRows.length - 1; i >= 0; i--) {
                mergedRows.unshift(parsedNewRows[i]);
                addedCount++;
            }
        }
        finalDataset = mergedRows.slice(0, 60);
    }

    db.ref('vietlott_matrix_data/' + autoDetectedType).set(finalDataset).then(() => {
        document.getElementById('boardRawInput').value = ''; 
        alert(`CẬP NHẬT THÀNH CÔNG!\n- Đài: ${autoDetectedType.toUpperCase()}\n- Đã nhận diện: ${addedCount} kỳ mới\n- Tổng lưu trữ hệ thống: ${finalDataset.length} kỳ`);
    });
}

function saveCurrentTabState() {
    let state = tabStatesStorage[currentType];
    let mainInputs = document.querySelectorAll('.lock-main-val');
    state.mainLock = [];
    mainInputs.forEach(inp => state.mainLock.push(inp.value.trim()));
    let specInp = document.querySelector('.lock-spec-val');
    state.specLock = specInp ? specInp.value.trim() : '';
    state.algo = document.getElementById('algoSelect').value;
    state.size = document.getElementById('predictSizeSelect').value;
    state.html = document.getElementById('predictContainer').innerHTML;
    state.activePreds = [...activePredictions];
}

function switchType(type) {
    saveCurrentTabState(); 
    currentType = type; document.querySelectorAll('.sidebar .tab-btn').forEach(btn => btn.classList.remove('active'));
    let idx = type === 'lotto' ? 0 : (type === 'mega' ? 1 : 2); document.querySelectorAll('.sidebar .tab-btn')[idx].classList.add('active');
    let sideIframe = document.getElementById('sidebarResultIframe');
    if(type === 'lotto') sideIframe.src = "https://www.ketquadientoan.com/tat-ca-ky-xo-so-lotto-535.html";
    else if(type === 'mega') sideIframe.src = "https://www.ketquadientoan.com/tat-ca-ky-xo-so-mega-6-45.html";
    else if(type === 'power') sideIframe.src = "https://www.ketquadientoan.com/tat-ca-ky-xo-so-power-655.html";
    
    restoreTabState(type); 
    reloadCurrentMatrix();
}

function restoreTabState(type) {
    let state = tabStatesStorage[type];
    let mainGroup = document.getElementById('mainLockGroup'); 
    let specGroup = document.getElementById('specLockGroup'); 
    let specSection = document.getElementById('specLockSection');
    
    mainGroup.innerHTML = ''; specGroup.innerHTML = ''; 
    let mainCount = type === 'lotto' ? 5 : 6;
    for(let i = 0; i < mainCount; i++) { 
        let val = state.mainLock[i] || '';
        mainGroup.innerHTML += `<input type="text" maxlength="2" class="lock-input lock-main-val" oninput="saveCurrentTabState()" placeholder="-" value="${val}">`; 
    }
    if(type === 'mega') { 
        specSection.style.display = 'none'; 
    } else { 
        specSection.style.display = 'flex'; 
        let val = state.specLock || '';
        specGroup.innerHTML += `<input type="text" maxlength="2" class="lock-input spec-lock lock-spec-val" oninput="saveCurrentTabState()" placeholder="-" value="${val}">`; 
    }
    
    document.getElementById('algoSelect').value = state.algo;
    document.getElementById('predictSizeSelect').value = state.size;
    document.getElementById('predictContainer').innerHTML = state.html;
    activePredictions = [...state.activePreds];
}

function switchView(view) {
    currentView = view;
    document.getElementById('matrixView').style.display = view === 'matrix' ? 'block' : 'none';
    document.getElementById('iframeView').style.display = view === 'iframe' ? 'block' : 'none';
    document.getElementById('adminView').style.display = view === 'admin' ? 'block' : 'none';
    document.getElementById('viewMatrixBtn').classList.toggle('active', view === 'matrix');
    document.getElementById('viewIframeBtn').classList.toggle('active', view === 'iframe');
    document.getElementById('viewAdminBtn').classList.toggle('active', view === 'admin');
}

function tryOnMatrix(type, mainNumsStr, specNumStr) { let arr = mainNumsStr.split(','); testSets[type].main = arr; testSets[type].spec = specNumStr ? specNumStr : null; reloadCurrentMatrix(); }
function clearTestMatrix(type) { testSets[type].main = []; testSets[type].spec = null; reloadCurrentMatrix(); }
function reloadCurrentMatrix() { 
    let rows = globalOnlineData[currentType] || []; 
    if(currentType === 'lotto') renderMatrix(rows); 
    else if(currentType === 'mega') renderMegaMatrix(rows); 
    else if(currentType === 'power') renderPowerMatrix(rows); 
}

function updateFloatingHeaderContent() {
    let mainTable = document.getElementById('matrixTable');
    let floatTable = document.getElementById('floatingHeaderTable');
    if (!mainTable || mainTable.rows.length < 3) return;

    let headRowHTML = mainTable.rows[0].outerHTML;
    let countRowHTML = mainTable.rows[1].outerHTML;
    let testRowHTML = mainTable.rows[2].outerHTML;

    floatTable.innerHTML = headRowHTML + countRowHTML + testRowHTML;

    let mainCells = mainTable.rows[0].cells;
    let floatCells = floatTable.rows[0].cells;
    for (let i = 0; i < mainCells.length; i++) {
        let colWidth = mainCells[i].getBoundingClientRect().width;
        if (colWidth > 0) {
            floatCells[i].style.width = colWidth + 'px';
            floatCells[i].style.minWidth = colWidth + 'px';
            floatCells[i].style.maxWidth = colWidth + 'px';
        }
    }
}

function handleMatrixViewportScroll(viewport) {
    let floatTable = document.getElementById('floatingHeaderTable');
    if (!floatTable) return;

    if (viewport.scrollTop > 10) {
        floatTable.style.display = 'table';
        floatTable.style.top = viewport.scrollTop + 'px';
        floatTable.style.left = viewport.scrollLeft + 'px';
        floatTable.style.transform = 'none';
    } else {
        floatTable.style.display = 'none';
    }
}

function renderMatrix(rows) {
    let table = document.getElementById('matrixTable'); table.innerHTML = ''; if (rows.length === 0) return;
    let mainCounts = Array(36).fill(0); let specCounts = Array(13).fill(0);
    rows.forEach(r => { r.main.forEach(num => { let n = parseInt(num); if(n>=1 && n<=35) mainCounts[n]++; }); if(r.spec) { let s = parseInt(r.spec); if(s>=1 && s<=12) specCounts[s]++; } });
    let maxMainCount = Math.max(...mainCounts); let maxSpecCount = Math.max(...specCounts);
    let headTr = document.createElement('tr'); headTr.className = 'header-nums'; headTr.innerHTML = `<th class="col-fixed-idx">Kỳ</th><th class="col-fixed-date">Ngày quay</th>`;
    for(let i = 1; i <= 35; i++) { let numStr = String(i).padStart(2, '0'); let bgColor = getHeatmapColor(mainCounts[i], maxMainCount); headTr.innerHTML += `<th class="main-num-head" style="background-color: ${bgColor};">${numStr}</th>`; }
    headTr.innerHTML += `<th style="background:#07070a; width:4px;"></th>`;
    for(let i = 1; i <= 12; i++) { let numStr = String(i).padStart(2, '0'); let bgColor = getHeatmapColor(specCounts[i], maxSpecCount); headTr.innerHTML += `<th class="spec-num-head" style="background-color: ${bgColor};">${numStr}</th>`; }
    table.appendChild(headTr);

    let limit = parseInt(document.getElementById('countLimitSelect').value); let limitRows = rows.slice(0, limit);
    let freqMain = Array(36).fill(0); let freqSpec = Array(13).fill(0);
    limitRows.forEach(r => { r.main.forEach(num => { let n = parseInt(num); if(n>=1 && n<=35) freqMain[n]++; }); if(r.spec) { let s = parseInt(r.spec); if(s>=1 && s<=12) freqSpec[s]++; } });
    let countTr = document.createElement('tr'); countTr.className = 'count-row'; countTr.innerHTML = `<td class="cell-idx">📊</td><td class="cell-date" style="text-align:left; padding-left:5px; font-weight:bold; white-space:nowrap; color:var(--accent-green); background:#13241a;">XUẤT HIỆN (${limit}K)</td>`;
    for(let i = 1; i <= 35; i++) { countTr.innerHTML += `<td>${freqMain[i] > 0 ? freqMain[i] : ''}</td>`; }
    countTr.innerHTML += `<td style="background:#07070a;"></td>`;
    for(let i = 1; i <= 12; i++) { countTr.innerHTML += `<td>${freqSpec[i] > 0 ? freqSpec[i] : ''}</td>`; }
    table.appendChild(countTr);

    let testTr = document.createElement('tr'); testTr.className = 'test-row'; testTr.innerHTML = `<td class="cell-idx">🧪</td><td class="cell-date" style="text-align:left; padding-left:5px; font-weight:bold; white-space:nowrap; background:#081524;">THỬ NGHIỆM</td>`;
    let tSet = testSets.lotto;
    for(let i = 1; i <= 35; i++) { let numStr = String(i).padStart(2, '0'); let activeClass = tSet.main.includes(numStr) ? 'cell-test-active' : ''; testTr.innerHTML += `<td class="${activeClass}">${tSet.main.includes(numStr) ? numStr : ''}</td>`; }
    testTr.innerHTML += `<td style="background:#07070a;"></td>`;
    for(let i = 1; i <= 12; i++) { let numStr = String(i).padStart(2, '0'); let activeClass = (tSet.spec === numStr) ? 'cell-test-spec-active' : ''; testTr.innerHTML += `<td class="${activeClass}">${(tSet.spec === numStr) ? numStr : ''}</td>`; }
    table.appendChild(testTr);

    rows.forEach((row, idx) => {
        let tr = document.createElement('tr'); let displayIdx = idx + 1; tr.innerHTML = `<td class="cell-idx">${String(displayIdx).padStart(2, '0')}</td><td class="cell-date">${row.date}</td>`;
        for(let i = 1; i <= 35; i++) { let numStr = String(i).padStart(2, '0'); let isAct = row.main.includes(numStr); let isTestAct = tSet.main.includes(numStr); let cls = isAct ? 'cell-main-num active' : (isTestAct ? 'cell-main-num test-active' : 'cell-main-num'); tr.innerHTML += `<td class="${cls}">${isAct ? numStr : ''}</td>`; }
        tr.innerHTML += `<td style="background:#07070a;"></td>`;
        for(let i = 1; i <= 12; i++) { let numStr = String(i).padStart(2, '0'); let isAct = (row.spec === numStr); let isTestAct = (tSet.spec === numStr); let cls = isAct ? 'cell-spec-num active-spec' : (isTestAct ? 'cell-spec-num test-spec-active' : 'cell-spec-num'); tr.innerHTML += `<td class="${cls}">${isAct ? numStr : ''}</td>`; }
        table.appendChild(tr);
    });

    updateFloatingHeaderContent();
}

function renderMegaMatrix(rows) {
    let table = document.getElementById('matrixTable'); table.innerHTML = ''; if (rows.length === 0) return;
    let mainCounts = Array(46).fill(0); rows.forEach(r => { r.main.forEach(num => { let n = parseInt(num); if(n>=1 && n<=45) mainCounts[n]++; }); });
    let maxMainCount = Math.max(...mainCounts);
    let headTr = document.createElement('tr'); headTr.className = 'header-nums'; headTr.innerHTML = `<th class="col-fixed-idx">Kỳ</th><th class="col-fixed-date">Ngày quay</th>`;
    for(let i = 1; i <= 45; i++) { let numStr = String(i).padStart(2, '0'); let bgColor = getHeatmapColor(mainCounts[i], maxMainCount); headTr.innerHTML += `<th class="main-num-head" style="background-color: ${bgColor};">${numStr}</th>`; }
    table.appendChild(headTr);

    let limit = parseInt(document.getElementById('countLimitSelect').value); let limitRows = rows.slice(0, limit);
    let freqMain = Array(46).fill(0); limitRows.forEach(r => { r.main.forEach(num => { let n = parseInt(num); if(n>=1 && n<=45) freqMain[n]++; }); });
    let countTr = document.createElement('tr'); countTr.className = 'count-row'; countTr.innerHTML = `<td class="cell-idx">📊</td><td class="cell-date" style="text-align:left; padding-left:5px; font-weight:bold; white-space:nowrap; color:var(--accent-green); background:#13241a;">XUẤT HIỆN (${limit}K)</td>`;
    for(let i = 1; i <= 45; i++) { countTr.innerHTML += `<td>${freqMain[i] > 0 ? freqMain[i] : ''}</td>`; }
    table.appendChild(countTr);

    let testTr = document.createElement('tr'); testTr.className = 'test-row'; testTr.innerHTML = `<td class="cell-idx">🧪</td><td class="cell-date" style="text-align:left; padding-left:5px; font-weight:bold; white-space:nowrap; background:#081524;">THỬ NGHIỆM</td>`;
    let tSet = testSets.mega;
    for(let i = 1; i <= 45; i++) { let numStr = String(i).padStart(2, '0'); let activeClass = tSet.main.includes(numStr) ? 'cell-test-active' : ''; testTr.innerHTML += `<td class="${activeClass}">${tSet.main.includes(numStr) ? numStr : ''}</td>`; }
    table.appendChild(testTr);

    rows.forEach((row, idx) => {
        let tr = document.createElement('tr'); let displayIdx = idx + 1; tr.innerHTML = `<td class="cell-idx">${String(displayIdx).padStart(2, '0')}</td><td class="cell-date">${row.date}</td>`;
        for(let i = 1; i <= 45; i++) { let numStr = String(i).padStart(2, '0'); let isAct = row.main.includes(numStr); let isTestAct = tSet.main.includes(numStr); let cls = isAct ? 'cell-main-num active' : (isTestAct ? 'cell-main-num test-active' : 'cell-main-num'); tr.innerHTML += `<td class="${cls}">${isAct ? numStr : ''}</td>`; }
        table.appendChild(tr);
    });

    updateFloatingHeaderContent();
}

function renderPowerMatrix(rows) {
    let table = document.getElementById('matrixTable'); table.innerHTML = ''; if (rows.length === 0) return;
    let combinedCounts = Array(56).fill(0); rows.forEach(r => { r.main.forEach(num => { let n = parseInt(num); if(n>=1 && n<=55) combinedCounts[n]++; }); if(r.spec) { let s = parseInt(r.spec); if(s>=1 && s<=55) combinedCounts[s]++; } });
    let maxCount = Math.max(...combinedCounts);
    let headTr = document.createElement('tr'); headTr.className = 'header-nums'; headTr.innerHTML = `<th class="col-fixed-idx">Kỳ</th><th class="col-fixed-date">Ngày quay</th>`;
    for(let i = 1; i <= 55; i++) { let numStr = String(i).padStart(2, '0'); let bgColor = getHeatmapColor(combinedCounts[i], maxCount); headTr.innerHTML += `<th class="main-num-head" style="background-color: ${bgColor};">${numStr}</th>`; }
    table.appendChild(headTr);

    let limit = parseInt(document.getElementById('countLimitSelect').value); let limitRows = rows.slice(0, limit);
    let freqMain = Array(56).fill(0); let freqSpec = Array(56).fill(0);
    limitRows.forEach(r => { r.main.forEach(num => { let n = parseInt(num); if(n>=1 && n<=55) freqMain[n]++; }); if(r.spec) { let s = parseInt(r.spec); if(s>=1 && s<=55) freqSpec[s]++; } });
    let countTr = document.createElement('tr'); countTr.className = 'count-row'; countTr.innerHTML = `<td class="cell-idx">📊</td><td class="cell-date" style="text-align:left; padding-left:5px; font-weight:bold; white-space:nowrap; color:var(--accent-green); background:#13241a;">XUẤT HIỆN (${limit}K)</td>`;
    for(let i = 1; i <= 55; i++) { let totalCount = freqMain[i] + freqSpec[i]; countTr.innerHTML += `<td>${totalCount > 0 ? totalCount : ''}</td>`; }
    table.appendChild(countTr);

    let testTr = document.createElement('tr'); testTr.className = 'test-row'; testTr.innerHTML = `<td class="cell-idx">🧪</td><td class="cell-date" style="text-align:left; padding-left:5px; font-weight:bold; white-space:nowrap; background:#081524;">THỬ NGHIỆM</td>`;
    let tSet = testSets.power;
    for(let i = 1; i <= 55; i++) { 
        let numStr = String(i).padStart(2, '0'); 
        let isTestMain = tSet.main.includes(numStr);
        let isTestSpec = (tSet.spec === numStr);
        let activeClass = '';
        let cellText = '';
        if (isTestMain) { activeClass = 'cell-test-active'; cellText = numStr; }
        else if (isTestSpec) { activeClass = 'cell-test-spec-active'; cellText = numStr; }
        
        let verticalLightStyle = (isTestMain || isTestSpec) ? 'position:relative;' : '';
        let lightColorBg = isTestSpec ? 'rgba(204, 92, 0, 0.3)' : 'var(--custom-hover-color)';
        let pseudoAfterHtml = (isTestMain || isTestSpec) ? `<div style="position:absolute; top:21px; bottom:-15000px; left:0; width:100%; background-color:${lightColorBg}; pointer-events:none; z-index:50;"></div>` : '';
        
        testTr.innerHTML += `<td class="${activeClass}" style="${verticalLightStyle}">${cellText}${pseudoAfterHtml}</td>`; 
    }
    table.appendChild(testTr);

    rows.forEach((row, idx) => {
        let tr = document.createElement('tr'); let displayIdx = idx + 1; tr.innerHTML = `<td class="cell-idx">${String(displayIdx).padStart(2, '0')}</td><td class="cell-date">${row.date}</td>`;
        for(let i = 1; i <= 55; i++) { 
            let numStr = String(i).padStart(2, '0'); 
            let isAct = row.main.includes(numStr); 
            let isSpecAct = (row.spec === numStr); 
            let cls = 'cell-main-num'; 
            if (isAct) cls = 'cell-main-num active'; 
            else if (isSpecAct) cls = 'cell-main-num active-spec-in-main'; 
            tr.innerHTML += `<td class="${cls}">${(isAct || isSpecAct) ? numStr : ''}</td>`; 
        }
        table.appendChild(tr);
    });

    updateFloatingHeaderContent();
}

function setupPredictPanel() {
    restoreTabState(currentType);
}

function openComposeModal() {
    if (activePredictions.length === 0) { alert("Vui lòng khởi chạy Dự đoán dãy số trước khi soạn phôi SMS!"); return; }
    pushCurrentPredictionsToSessionLog("Bấm Soạn tin");
    
    let prefix = currentType === 'lotto' ? "535 K1" : (currentType === 'mega' ? "645 K1" : "655 K1");
    let container = document.getElementById('modalTextContent'); container.innerHTML = '';
    document.getElementById('modalTitleText').innerText = "Cấu trúc tin nhắn mua vé Vietlott SMS";

    let validPreds = activePredictions.filter(p => p !== null);
    let linesPerTicket = 6; let ticketCount = Math.ceil(validPreds.length / linesPerTicket);
    let hasValidSms = false;

    for (let t = 0; t < ticketCount; t++) {
        let currentSmsLines = [];
        for (let l = 0; l < linesPerTicket; l++) {
            let globalIdx = t * linesPerTicket + l;
            if (globalIdx < validPreds.length) {
                let pred = validPreds[globalIdx];
                if (pred && pred.main && pred.main.length > 0) {
                    let lineStr = `S `;
                    if (currentType === 'lotto') lineStr += `${pred.main.join(' ')}-${pred.spec}`;
                    else lineStr += `${pred.main.join(' ')}`;
                    currentSmsLines.push(lineStr);
                }
            }
        }
        if (currentSmsLines.length > 0) {
            hasValidSms = true; let fullSmsText = `${prefix} ${currentSmsLines.join(' ')}`; let blockIndex = t + 1;
            let blockDiv = document.createElement('div'); blockDiv.className = 'sms-block';
            blockDiv.innerHTML = `<div class="sms-header"><span>🎟️ PHÔI VÉ ĐIỆN TOÁN SỐ ${blockIndex}</span><button class="btn-copy-sms" onclick="copyIndividualSms('sms_text_block_${blockIndex}')">SAO CHÉP VÉ ${blockIndex}</button></div><div class="sms-text" id="sms_text_block_${blockIndex}">${fullSmsText}</div>`;
            container.appendChild(blockDiv);
        }
    }
    if (!hasValidSms) { alert("Không tìm thấy bộ dãy số hợp lệ!"); return; }
    document.getElementById('composeModal').style.display = 'flex';
}

function copyIndividualSms(elementId) { let text = document.getElementById(elementId).innerText; navigator.clipboard.writeText(text).then(() => { alert("Đã sao chép phôi tin nhắn!"); }); }
function closeComposeModal() { document.getElementById('composeModal').style.display = 'none'; }

function generatePredictions() {
    let container = document.getElementById('predictContainer'); container.innerHTML = '<div style="font-size:0.7rem; color:#8a8a9e; text-align:center; padding:5px;">Hệ thống đang cấu trúc lại ma trận...</div>';
    let rows = globalOnlineData[currentType] || []; if (rows.length === 0) { setTimeout(() => { container.innerHTML = '<div style="font-size:0.7rem; color:var(--accent-pink); text-align:center; padding:5px;">Lỗi: Trống dữ liệu trực tuyến!</div>'; }, 200); return; }
    let tickets = parseInt(document.getElementById('predictSizeSelect').value) || 1; let totalNeededRows = tickets * 6;
    setTimeout(() => { 
        container.innerHTML = ''; activePredictions = Array(totalNeededRows).fill(null); let labels = ['A', 'B', 'C', 'D', 'E', 'F'];
        for (let t = 0; t < tickets; t++) {
            let ticketGroupDiv = document.createElement('div'); ticketGroupDiv.className = 'predict-ticket-group';
            ticketGroupDiv.innerHTML = `<div class="predict-ticket-title">🎟️ Phân cấu trúc phôi vé thứ ${t + 1}</div>`;
            for (let l = 0; l < 6; l++) { let globalIndex = t * 6 + l; generateSingleRow(globalIndex, labels[l], rows, ticketGroupDiv); }
            container.appendChild(ticketGroupDiv);
        }
        pushCurrentPredictionsToSessionLog("Bấm Dự đoán");
        saveCurrentTabState(); 
    }, 150);
}

// Thuật toán khoảng cách gan chuẩn
function calculateGanDistances(rows, maxRange) {
    let distances = {};
    for (let i = 1; i <= maxRange; i++) {
        distances[String(i).padStart(2, '0')] = 999;
    }
    rows.forEach((row, idx) => {
        row.main.forEach(num => {
            let nStr = String(parseInt(num)).padStart(2, '0');
            if (distances[nStr] === 999) {
                distances[nStr] = idx; 
            }
        });
    });
    return distances;
}

function selectMainNumbersByGan(rows, maxRange, mainSize, lockedNums) {
    let ganMap = calculateGanDistances(rows, maxRange);
    let selected = [...lockedNums];

    let poolG0_2 = [];
    let poolG3_10 = [];
    let poolG11_15 = [];
    let poolG12_22 = [];
    let poolG15 = [];
    let poolG_Other = [];

    for (let i = 1; i <= maxRange; i++) {
        let sNum = String(i).padStart(2, '0');
        if (selected.includes(sNum)) continue;
        let g = ganMap[sNum] !== undefined ? ganMap[sNum] : 999;

        if (g >= 0 && g <= 2) poolG0_2.push(sNum);
        if (g >= 3 && g <= 10) poolG3_10.push(sNum);
        if (g >= 11 && g <= 15) poolG11_15.push(sNum);
        if (g >= 12 && g <= 22) poolG12_22.push(sNum);
        if (g === 15) poolG15.push(sNum);
        if (g > 22) poolG_Other.push(sNum);
    }

    poolG0_2.sort(() => Math.random() - 0.5);
    poolG3_10.sort(() => Math.random() - 0.5);
    poolG11_15.sort(() => Math.random() - 0.5);
    poolG12_22.sort(() => Math.random() - 0.5);
    poolG15.sort(() => Math.random() - 0.5);

    let helperPick = (pool, count) => {
        let picked = [];
        for (let i = 0; i < count && pool.length > 0; i++) {
            let candidate = pool.shift();
            if (!selected.includes(candidate) && !picked.includes(candidate)) {
                picked.push(candidate);
            }
        }
        return picked;
    };

    if (currentType === 'lotto') {
        selected.push(...helperPick(poolG0_2, 2));
        selected.push(...helperPick(poolG3_10, 2));
        selected.push(...helperPick(poolG15, 1));
    } else {
        selected.push(...helperPick(poolG0_2, 2));
        selected.push(...helperPick(poolG3_10, 2));
        selected.push(...helperPick(poolG11_15, 1));
        selected.push(...helperPick(poolG12_22, 1));
    }

    let allPool = [...poolG0_2, ...poolG3_10, ...poolG11_15, ...poolG12_22, ...poolG15, ...poolG_Other];
    allPool.sort(() => Math.random() - 0.5);
    while (selected.length < mainSize && allPool.length > 0) {
        let cand = allPool.shift();
        if (!selected.includes(cand)) selected.push(cand);
    }

    selected.sort((a, b) => parseInt(a) - parseInt(b));
    return selected;
}

function generateSingleRow(index, label, rows, ticketContainer) {
    let maxRange = currentType === 'lotto' ? 35 : (currentType === 'mega' ? 45 : 55); 
    let mainSize = currentType === 'lotto' ? 5 : 6; 
    let chosenAlgo = document.getElementById('algoSelect').value;
    
    let inputs = document.querySelectorAll('.lock-main-val'); 
    let locked = [];
    inputs.forEach(input => { 
        let v = input.value.trim(); 
        if(v !== "") { 
            let n = parseInt(v); 
            if(n >= 1 && n <= maxRange) locked.push(String(n).padStart(2, '0')); 
        } 
    });

    let resultSet = [];
    let attempts = 0;

    do {
        if (chosenAlgo === 'combined') {
            // Kết hợp toàn diện tất cả: Nóng lạnh, biên độ, bạc nhớ, ngẫu nhiên & khoảng cách gan
            let freq = Array(maxRange + 1).fill(0); 
            rows.forEach(r => { r.main.forEach(num => { let n = parseInt(num); if(n <= maxRange) freq[n]++; }); });
            
            let pairCounts = Array(maxRange + 1).fill(0); 
            if (locked.length > 0) {
                rows.forEach(r => { 
                    let hasLocked = locked.some(l => r.main.includes(l)); 
                    if (hasLocked) r.main.forEach(num => pairCounts[parseInt(num)]++); 
                });
            }

            let ganMap = calculateGanDistances(rows, maxRange);

            let poolCandidates = [];
            for (let j = 1; j <= maxRange; j++) {
                let s = String(j).padStart(2, '0');
                if (locked.includes(s)) continue;

                let score = 0;
                score += pairCounts[j] * 3.0; // Bạc nhớ cặp số
                score += freq[j] * 1.5;     // Nóng lạnh tần suất
                
                let gVal = ganMap[s] !== undefined ? ganMap[s] : 999;
                if (gVal >= 0 && gVal <= 2) score += 4.0; // Ưu tiên nhẹ nhóm bệt sát kỳ trước
                
                score += (Math.random() * 20.0 - 10.0) + (index * 1.5); // Ngẫu nhiên xáo trộn biên độ

                poolCandidates.push({ numStr: s, finalScore: score });
            }

            poolCandidates.sort((a, b) => b.finalScore - a.finalScore);
            resultSet = [...locked];

            for (let i = 0; i < poolCandidates.length; i++) {
                if (resultSet.length >= mainSize) break;
                let candidate = poolCandidates[i].numStr;
                if (!resultSet.includes(candidate)) {
                    resultSet.push(candidate);
                }
            }
        } else if (chosenAlgo === 'gan_standard') {
            // Chỉ chạy riêng khoảng cách gan chuẩn
            resultSet = selectMainNumbersByGan(rows, maxRange, mainSize, locked);
        } else {
            // Các tùy chọn đơn lẻ bên dưới
            resultSet = [...locked];
            let pool = []; for(let j = 1; j <= maxRange; j++) { let s = String(j).padStart(2, '0'); if(!locked.includes(s)) pool.push(s); }
            pool.sort(() => Math.random() - 0.5);
            let needed = mainSize - resultSet.length; if (needed > 0 && pool.length > 0) { for(let k = 0; k < needed; k++) { if(pool.length > 0) resultSet.push(pool.shift()); } }
        }
        resultSet.sort((a, b) => parseInt(a) - parseInt(b));
        attempts++;

        var isDuplicate = activePredictions.some((p, pIdx) => {
            if (pIdx < index && p && p.main) {
                return p.main.join(',') === resultSet.join(',');
            }
            return false;
        });

    } while (isDuplicate && attempts < 50);

    let sNum = ""; 
    if (currentType !== 'mega') { 
        let specInput = document.querySelector('.lock-spec-val'); 
        if (specInput && specInput.value.trim() !== "") { 
            let val = parseInt(specInput.value.trim()); 
            let maxSpec = currentType === 'lotto' ? 12 : 55; 
            if (val >= 1 && val <= maxSpec) sNum = String(val).padStart(2, '0'); 
        } 
        if (!sNum) { 
            let maxSpec = currentType === 'lotto' ? 12 : 55; 
            sNum = String(Math.floor(Math.random() * maxSpec) + 1).padStart(2, '0'); 
        } 
    }

    activePredictions[index] = (currentType === 'mega') ? { main: resultSet } : { main: resultSet, spec: sNum };

    let rowDiv = document.createElement('div'); rowDiv.className = 'predict-row'; rowDiv.id = `predictRow_${index}`; ticketContainer.appendChild(rowDiv);
    let rowInner = `<div class="predict-row-label">${label}</div><div id="ballsArea_${index}" style="display:flex; gap:4px; align-items:center;">`;
    resultSet.forEach(num => { rowInner += `<div class="ball-predict ball-main-custom">${num}</div>`; }); 
    if (currentType !== 'mega') rowInner += `<div style="color:#3a3a52; font-weight:bold;">|</div><div class="ball-predict ball-spec-custom">${sNum}</div>`;
    rowInner += `</div><div style="flex:1;"></div><div id="actionsArea_${index}" style="display:flex; gap:2px; align-items:center;">`;
    rowInner += `<button class="action-inline-btn btn-try" onclick="tryOnMatrix('${currentType}', '${resultSet.join(',')}', ${sNum ? "'"+sNum+"'" : 'null'})">Thử</button><button class="action-inline-btn btn-del" onclick="clearTestMatrix('${currentType}')">Bỏ</button><button class="action-inline-btn" style="border-color:#4e4e66; color:#a5a5bc;" onclick="clearSinglePrediction(${index}, '${label}')">🗑️</button></div>`;
    rowDiv.innerHTML = rowInner;
}

function clearSinglePrediction(index, label) { activePredictions[index] = null; document.getElementById(`ballsArea_${index}`).innerHTML = `<div style="font-size:0.65rem; color:#4a4a66; font-style:italic; padding-left:4px;">Bộ số trống...</div>`; document.getElementById(`actionsArea_${index}`).innerHTML = `<button class="action-inline-btn btn-try" style="border-color:var(--accent-green); color:var(--accent-green);" onclick="reGenerateSingleRow(${index}, '${label}')">🔄 Thử lại</button>`; saveCurrentTabState(); }

function reGenerateSingleRow(index, label) {
    let rows = globalOnlineData[currentType] || [];
    let maxRange = currentType === 'lotto' ? 35 : (currentType === 'mega' ? 45 : 55); 
    let mainSize = currentType === 'lotto' ? 5 : 6; 
    let chosenAlgo = document.getElementById('algoSelect').value;
    
    let inputs = document.querySelectorAll('.lock-main-val'); 
    let locked = [];
    inputs.forEach(input => { 
        let v = input.value.trim(); 
        if(v !== "") { 
            let n = parseInt(v); 
            if(n >= 1 && n <= maxRange) locked.push(String(n).padStart(2, '0')); 
        } 
    });

    let resultSet = [];
    let attempts = 0;

    do {
        if (chosenAlgo === 'combined') {
            let freq = Array(maxRange + 1).fill(0); 
            rows.forEach(r => { r.main.forEach(num => { let n = parseInt(num); if(n <= maxRange) freq[n]++; }); });
            
            let pairCounts = Array(maxRange + 1).fill(0); 
            if (locked.length > 0) {
                rows.forEach(r => { 
                    let hasLocked = locked.some(l => r.main.includes(l)); 
                    if (hasLocked) r.main.forEach(num => pairCounts[parseInt(num)]++); 
                });
            }

            let ganMap = calculateGanDistances(rows, maxRange);

            let poolCandidates = [];
            for (let j = 1; j <= maxRange; j++) {
                let s = String(j).padStart(2, '0');
                if (locked.includes(s)) continue;

                let score = 0;
                score += pairCounts[j] * 3.0; 
                score += freq[j] * 1.5;     
                
                let gVal = ganMap[s] !== undefined ? ganMap[s] : 999;
                if (gVal >= 0 && gVal <= 2) score += 4.0;
                
                score += (Math.random() * 20.0 - 10.0) + (index * 1.5);

                poolCandidates.push({ numStr: s, finalScore: score });
            }

            poolCandidates.sort((a, b) => b.finalScore - a.finalScore);
            resultSet = [...locked];

            for (let i = 0; i < poolCandidates.length; i++) {
                if (resultSet.length >= mainSize) break;
                let candidate = poolCandidates[i].numStr;
                if (!resultSet.includes(candidate)) {
                    resultSet.push(candidate);
                }
            }
        } else if (chosenAlgo === 'gan_standard') {
            resultSet = selectMainNumbersByGan(rows, maxRange, mainSize, locked);
        } else {
            resultSet = [...locked];
            let pool = []; for(let j = 1; j <= maxRange; j++) { let s = String(j).padStart(2, '0'); if(!locked.includes(s)) pool.push(s); }
            pool.sort(() => Math.random() - 0.5);
            let needed = mainSize - resultSet.length; if (needed > 0 && pool.length > 0) { for(let k = 0; k < needed; k++) { if(pool.length > 0) resultSet.push(pool.shift()); } }
        }
        resultSet.sort((a, b) => parseInt(a) - parseInt(b));
        attempts++;

        var isDuplicate = activePredictions.some((p, pIdx) => {
            if (pIdx !== index && p && p.main) {
                return p.main.join(',') === resultSet.join(',');
            }
            return false;
        });

    } while (isDuplicate && attempts < 50);

    let sNum = ""; 
    if (currentType !== 'mega') { 
        let specInput = document.querySelector('.lock-spec-val'); 
        if (specInput && specInput.value.trim() !== "") { 
            let val = parseInt(specInput.value.trim()); 
            let maxSpec = currentType === 'lotto' ? 12 : 55; 
            if (val >= 1 && val <= maxSpec) sNum = String(val).padStart(2, '0'); 
        } 
        if (!sNum) { 
            let maxSpec = currentType === 'lotto' ? 12 : 55; 
            sNum = String(Math.floor(Math.random() * maxSpec) + 1).padStart(2, '0'); 
        } 
    }

    activePredictions[index] = (currentType === 'mega') ? { main: resultSet } : { main: resultSet, spec: sNum };

    let ballsInner = ''; 
    resultSet.forEach(num => { ballsInner += `<div class="ball-predict ball-main-custom">${num}</div>`; }); 
    if (currentType !== 'mega') ballsInner += `<div style="color:#3a3a52; font-weight:bold;">|</div><div class="ball-predict ball-spec-custom">${sNum}</div>`;
    document.getElementById(`ballsArea_${index}`).innerHTML = ballsInner;
    
    let actionsInner = `<button class="action-inline-btn btn-try" onclick="tryOnMatrix('${currentType}', '${resultSet.join(',')}', ${sNum ? "'"+sNum+"'" : 'null'})">Thử</button><button class="action-inline-btn btn-del" onclick="clearTestMatrix('${currentType}')">Bỏ</button><button class="action-inline-btn" style="border-color:#4e4e66; color:#a5a5bc;" onclick="clearSinglePrediction(${index}, '${label}')">🗑️</button>`;
    document.getElementById(`actionsArea_${index}`).innerHTML = actionsInner;
    
    pushCurrentPredictionsToSessionLog("Thay đổi bộ số đơn lẻ"); 
    saveCurrentTabState();
}

function clearCurrentData() { if (currentUserName !== 'daica' && currentUserRole !== 'admin') return; if (confirm(`Bạn có chắc muốn xóa dữ liệu đám mây đài ${currentType.toUpperCase()}?`)) { db.ref('vietlott_matrix_data/' + currentType).remove(); alert("Đã giải phóng dữ liệu đám mây!"); } }

window.onload = function() { 
    updateThemeColors();
    initLoginVisualEffects();
    db.ref('system_accounts').once('value', (snapshot) => { 
        if (!snapshot.exists()) { db.ref('system_accounts').set({ "daica": { password: "123", role: "admin" }, "member1": { password: "456", role: "member" } }); } 
        let localUser = localStorage.getItem('cvn_remember_user'); let localRole = localStorage.getItem('cvn_remember_role');
        if (localUser && localRole) { executeLoginSuccess(localUser, localRole, false); } else { setupPredictPanel(); }
    }); 
};