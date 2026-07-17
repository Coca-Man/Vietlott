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
        // Giả lập Headers giống hệt trình duyệt thật để không bị chặn mạng
        const response = await axios.get(config.url, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            },
            timeout: 15000 // Chờ tối đa 15 giây
        });
        
        const $ = cheerio.load(response.data);
        let outputLines = [];

        $('table.table-hover tbody tr').each((index, element) => {
            let dateText = $(element).find('td').eq(0).text().trim();
            if (!dateText || dateText.includes("Ngày")) return;

            let mainNumbers = [];
            let specNumber = "";

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
                    let mainStr = mainNumbers.slice(0, 5).join(' ');
                    finalLine = `${dateText} | ${mainStr} | ${specNumber}`;
                } else if (config.type === 'power') {
                    let mainStr = mainNumbers.slice(0, 6).join(' ');
                    finalLine = `${dateText} | ${mainStr} | ${specNumber}`;
                } else if (config.type === 'mega') {
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
        } else {
            console.log(`[CẢNH BÁO] Không tìm thấy dữ liệu phù hợp cấu trúc cho: ${config.file}`);
        }
    } catch (error) {
        console.error(`[BỎ QUA LỖI] Không thể kết nối đến ${config.url}:`, error.message);
        // Tránh làm sập tiến trình GitHub bằng cách không ném lỗi ra ngoài
    }
}

async function start() {
    for (let config of configs) {
        await crawlType(config);
    }
    console.log("Hoàn thành tiến trình xử lý dữ liệu.");
}

start();
