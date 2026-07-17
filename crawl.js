const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const configs = [
    {
        url: 'https://www.ketquadientoan.com/tat-ca-ky-xo-so-lotto-535.html',
        file: '535.txt',
        type: 'lotto'
    },
    {
        url: 'https://www.ketquadientoan.com/tat-ca-ky-xo-so-mega-6-45.html',
        file: '645.txt',
        type: 'mega'
    },
    {
        url: 'https://www.ketquadientoan.com/tat-ca-ky-xo-so-power-655.html',
        file: '655.txt',
        type: 'power'
    }
];

async function crawlType(config) {
    try {
        const response = await axios.get(config.url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        const $ = cheerio.load(response.data);
        let outputLines = [];

        $('table.table-hover tbody tr').each((index, element) => {
            // Giữ nguyên văn ngày tháng có cả Thứ (Ví dụ: "T7, 04/07/2026")
            let dateText = $(element).find('td').eq(0).text().trim();
            if (!dateText || dateText.includes("Ngày")) return;

            let mainNumbers = [];
            let specNumber = "";

            // Phân tách chính xác bóng đỏ (chính) và bóng cam (đặc biệt)
            $(element).find('span.ball').each((i, ball) => {
                let num = $(ball).text().trim();
                if (num) mainNumbers.push(String(parseInt(num)).padStart(2, '0'));
            });

            let specBall = $(element).find('span.ball-orange').text().trim();
            if (specBall) {
                specNumber = String(parseInt(specBall)).padStart(2, '0');
            }

            if (mainNumbers.length > 0) {
                let finalLine = "";
                
                if (config.type === 'lotto') {
                    // Lotto 5/35: Thứ, Ngày/Tháng/Năm | 5 số chính | 1 số đặc biệt
                    let mainStr = mainNumbers.slice(0, 5).join(' ');
                    finalLine = `${dateText} | ${mainStr} | ${specNumber}`;
                } else if (config.type === 'power') {
                    // Power 6/55: Thứ, Ngày/Tháng/Năm | 6 số chính | 1 số đặc biệt
                    let mainStr = mainNumbers.slice(0, 6).join(' ');
                    finalLine = `${dateText} | ${mainStr} | ${specNumber}`;
                } else if (config.type === 'mega') {
                    // Mega 6/45: Thứ, Ngày/Tháng/Năm | 6 số chính
                    let mainStr = mainNumbers.slice(0, 6).join(' ');
                    finalLine = `${dateText} | ${mainStr}`;
                }
                
                outputLines.push(finalLine);
            }
        });

        if (outputLines.length > 0) {
            let limitedLines = outputLines.slice(0, 60);
            fs.writeFileSync(config.file, limitedLines.join('\n'), 'utf8');
            console.log(`[OK] Đã cấu trúc chuẩn xác file: ${config.file}`);
        }
    } catch (error) {
        console.error(`[LỖI] Không thể cào dữ liệu từ ${config.url}:`, error.message);
    }
}

async function start() {
    for (let config of configs) {
        await crawlType(config);
    }
}

start();
