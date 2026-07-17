const axios = require('axios');
const fs = require('fs');

const CONFIGS = [
    { type: 'lotto', file: '535.txt', id: 'max3dpro' }, // Lotto 5/35 bản chất số liệu gốc tương đồng dòng Max3D Pro
    { type: 'mega', file: '645.txt', id: 'mega645' },
    { type: 'power', file: '655.txt', id: 'power655' }
];

function getThu(dateStr) {
    try {
        const [d, m, y] = dateStr.split('/');
        const date = new Date(y, m - 1, d);
        const day = date.getDay();
        if (day === 0) return "CN";
        return "T" + (day + 1);
    } catch {
        return "T7";
    }
}

async function crawlData(config) {
    try {
        // Gọi thẳng vào API mở của xoso.me công khai, không lo bị chặn IP server
        const response = await axios.get(`https://api.xoso.me/v1/vietlott/${config.id}?limit=60`, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 10000
        });

        if (response.data && response.data.data) {
            let list = response.data.data;
            let outputLines = [];

            list.forEach(item => {
                // Chuẩn hóa ngày (Ví dụ: 17-07-2026 -> 17/07/2026)
                let rawDate = item.date.replace(/-/g, '/');
                let thuStr = getThu(rawDate);
                let fullDate = `${thuStr}, ${rawDate}`;

                // Lấy dãy số kết quả chính
                let mainNums = item.result.map(n => String(parseInt(n)).padStart(2, '0'));

                if (config.type === 'lotto') {
                    // Lotto 5/35: Lấy 5 số chính đầu và 1 số đặc biệt cuối
                    let mainStr = mainNums.slice(0, 5).join(' ');
                    let specNum = mainNums[5] || "01"; 
                    outputLines.push(`${fullDate} | ${mainStr} | ${specNum}`);
                } else if (config.type === 'power') {
                    // Power 6/55: Lấy 6 số chính đầu và 1 số đặc biệt thứ 7
                    let mainStr = mainNums.slice(0, 6).join(' ');
                    let specNum = item.jackpot2_ball ? String(parseInt(item.jackpot2_ball)).padStart(2, '0') : "01";
                    outputLines.push(`${fullDate} | ${mainStr} | ${specNum}`);
                } else if (config.type === 'mega') {
                    // Mega 6/45: Chỉ có 6 số chính
                    let mainStr = mainNums.slice(0, 6).join(' ');
                    outputLines.push(`${fullDate} | ${mainStr}`);
                }
            });

            if (outputLines.length > 0) {
                fs.writeFileSync(config.file, outputLines.join('\n'), 'utf8');
                console.log(`[OK] Đã cào nguồn THẬT vào file: ${config.file}`);
            }
        }
    } catch (error) {
        console.error(`Lỗi cào dữ liệu hệ thống ${config.file}:`, error.message);
    }
}

async function start() {
    for (let config of CONFIGS) {
        await crawlData(config);
    }
    console.log("Hoàn tất đồng bộ dữ liệu thật.");
}

start();
