// scripts/copy-lunar.js - Copy and convert client-side lunar helpers to CommonJS server-side helpers
const fs = require('fs');
const path = require('path');

const srcLunar = path.resolve(__dirname, '../client/src/shared/utils/lunar.js');
const destLunar = path.resolve(__dirname, '../server/utils/lunar.js');

if (fs.existsSync(srcLunar)) {
    let content = fs.readFileSync(srcLunar, 'utf8');
    // Replace ESM exports with CommonJS module.exports at the end of the file
    content = content.replace(/export\s+var\s+Solar\s+=\s+_lunar\.Solar;[\r\n]*export\s+var\s+Lunar\s+=\s+_lunar\.Lunar;/, '');
    content += '\nmodule.exports = { Solar: _lunar.Solar, Lunar: _lunar.Lunar };\n';
    fs.writeFileSync(destLunar, content, 'utf8');
    console.log('✅ Converted lunar.js to CommonJS at server/utils/lunar.js');
} else {
    console.error('❌ Source lunar.js not found');
}

const srcVietLunar = path.resolve(__dirname, '../client/src/shared/utils/vietLunar.js');
const destVietLunar = path.resolve(__dirname, '../server/utils/vietLunar.js');

if (fs.existsSync(srcVietLunar)) {
    let content = fs.readFileSync(srcVietLunar, 'utf8');
    // Replace export function with standard function and export at the end
    content = content.replace(/export\s+function/g, 'function');
    content += '\nmodule.exports = {\n    ganZhiToViet,\n    lunarDayName,\n    lunarMonthName,\n    lunarDayLabel\n};\n';
    fs.writeFileSync(destVietLunar, content, 'utf8');
    console.log('✅ Converted vietLunar.js to CommonJS at server/utils/vietLunar.js');
} else {
    console.error('❌ Source vietLunar.js not found');
}
