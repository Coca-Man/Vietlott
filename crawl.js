const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const CONFIGS = [
    {
        url: 'https://www.minhngoc.com.vn/ket-qua-xo-so/vietlott/max-3d-pro.html', // Thay cho Lotto 5/35
        file: '535.txt',
        type: 'lotto'
    },
    {
        url: 'https://www.minhngoc.com.vn/ket-qua-xo-so/vietlott/mega-6-45.html',
        file: '645.txt',
        type: 'mega'
    },
    {
        url: 'https://www.minhngoc.com.vn/ket-qua-xo-so/vietlott/power-6-55.html',
        file: '655.txt',
        type: 'power'
    }
];

async function crawlMinhNgoc(config) {
    try {
        const response = await axios.get(config.url, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept-Language': 'vi-VN,vi;q=0.9'
            },
            timeout: 10000
        });

        const $ = cheerio.load(response.data);
        let outputLines = [];

        // Duyệt qua từng bảng kết quả theo các kỳ mở thưởng cũ
        $('table.box_kqvietlott').each((index, table) => {
            // Lấy thông tin ngày tháng (Ví dụ: "Thứ Ba, 14/07/2026")
            let rawDateText = $(table).find('.title-bkqv phía_tren, .title-bkqv').text().trim();
            if (!rawDateText) return;

            // Tách và chuyển đổi định dạng ngày thành: "T3, 14/07/2026"
            let dateMatch = rawDateText.match(/(Thứ\s+\d+|Chủ\s+Nhật).*?(\d{2}\/\d{2}\/\d{4})/i);
            if (!dateMatch) return;

            let thuStr = dateMatch[1].toLowerCase();
            let dateText = dateMatch[2];
            
            if (thuStr.includes('hai')) thuStr = 'T2';
            else if (thuStr.includes('ba')) thuStr = 'T3';
            else if (thuStr.includes('tư')) thuStr = 'T4';
            else if (thuStr.includes('năm')) thuStr = 'T5';
            else if (thuStr.includes('sáu')) thuStr = 'T6';
            else if (thuStr.includes('bảy')) thuStr = 'T7';
            else if (thuStr.includes('nhật')) thuStr = 'CN';

            let fullDate = `${thuStr}, ${dateText}`;
            let mainNumbers = [];
            let specNumber = "";

            // Bốc các quả bóng số chính màu đỏ
            $(table).find('.xo_so_bong_do, .ball_do').each((i, el) => {
                let num = $(el).text().trim();
                if (num) mainNumbers.push(num.padStart(2, '0'));
            });

            // Bốc quả bóng số đặc biệt màu vàng/cam (nếu có)
            let specEl = $(table).find('.xo_so_bong_vang, .ball_vang, .ball_cam').text().trim();
            if (specEl) {
                specNumber = specEl.padStart(2, '0');
            }

            if (mainNumbers.length > 0) {
                let finalLine = "";
                if (config.type === 'lotto') {
                    let mainStr = mainNumbers.slice(0, 5).join(' ');
                    // Nếu không thấy bóng vàng đặc biệt, tự lấy số cuối của dãy làm số đặc biệt
                    let finalSpec = specNumber || mainNumbers[5] || "01";
                    finalLine = `${fullDate} | ${mainStr} | ${finalSpec}`;
                } else if (config.type === 'power') {
                    let mainStr = mainNumbers.slice(0, 6).join(' ');
                    finalLine = `${fullDate} | ${mainStr} | ${specNumber || "01"}`;
                } else if (config.type === 'mega') {
                    let mainStr = mainNumbers.slice(0, 6).join(' ');
                    finalLine = `${fullDate} | ${mainStr}`;
                }
                outputLines.push(finalLine);
            }
        });

        if (outputLines.length > 0) {
            // Giới hạn lấy chuẩn 60 dòng dữ liệu mới nhất
            let limitedLines = outputLines.slice(0, 60);
            fs.writeFileSync(config.file, limitedLines.join('\n'), 'utf8');
            console.log(`[OK] Đã cào siêu tốc từ Minh Ngọc vào file: ${config.file}`);
        }
    } catch (error) {
        console.error(`[LỖI] Không thể cào dữ liệu từ Minh Ngọc cho file ${config.file}:`, error.message);
    }
}

async function start() {
    for (let config of CONFIGS) {
        await crawlMinhNgoc(config);
    }
    console.log("Hoàn thành cập nhật dữ liệu siêu tốc.");
}

start();
