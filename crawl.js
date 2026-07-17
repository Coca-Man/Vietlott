const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const configs = [
    {
        url: 'https://www.ketquadientoan.com/tat-ca-ky-xo-so-lotto-535.html',
        file: '535.txt',
        isSpec: true
    },
    {
        url: 'https://www.ketquadientoan.com/tat-ca-ky-xo-so-mega-6-45.html',
        file: '645.txt',
        isSpec: false
    },
    {
        url: 'https://www.ketquadientoan.com/tat-ca-ky-xo-so-power-655.html',
        file: '655.txt',
        isSpec: true
    }
];

async function crawlType(config) {
    try {
        const response = await axios.get(config.url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        const $ = cheerio.load(response.data);
        let outputLines = [];

        // Tìm bảng danh sách kết quả
        $('table.table-hover tbody tr').each((index, element) => {
            // Lấy cột Ngày quay số
            let dateText = $(element).find('td').eq(0).text().trim();
            if (!dateText || dateText.includes("Ngày")) return; // Bỏ qua dòng tiêu đề nếu có
            
            // Định dạng lại ngày bỏ thứ (Ví dụ: "T5, 16/07/2026" -> "16/07/2026")
            if (dateText.includes(',')) {
                dateText = dateText.split(',')[1].trim();
            }

            // Lấy danh sách các quả bóng số
            let mainNumbers = [];
            $(element).find('span.ball, span.ball-orange').each((i, ball) => {
                let num = $(ball).text().trim();
                if (num) mainNumbers.push(String(parseInt(num)).padStart(2, '0'));
            });

            if (mainNumbers.length > 0) {
                let finalLine = "";
                if (config.isSpec) {
                    // Loại có số đặc biệt đứng cuối (Lotto 5/35 hoặc Power 6/55)
                    let specNumber = mainNumbers.pop(); // Lấy quả bóng cuối cùng làm ĐB
                    let mainStr = mainNumbers.join(' ');
                    finalLine = `${dateText} | ${mainStr} | ${specNumber}`;
                } else {
                    // Loại chỉ có số chính (Mega 6/45)
                    let mainStr = mainNumbers.join(' ');
                    finalLine = `${dateText} | ${mainStr}`;
                }
                outputLines.push(finalLine);
            }
        });

        if (outputLines.length > 0) {
            // Lấy tối đa 60 kỳ gần nhất để tối ưu ma trận của Đại ca
            let limitedLines = outputLines.slice(0, 60);
            fs.writeFileSync(config.file, limitedLines.join('\n'), 'utf8');
            console.log(`[OK] Đã cào và lưu thành công file: ${config.file}`);
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
