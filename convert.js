const fs = require('node:fs');
const path = require('node:path');

const root = __dirname;
const csvFiles = fs.readdirSync(root)
  .filter((name) => name.toLowerCase().endsWith('.csv'))
  .sort((a, b) => a.localeCompare(b, 'ko'));

if (csvFiles.length === 0) {
  throw new Error('같은 폴더에 CSV 파일이 없습니다.');
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field.trim());
      field = '';
    } else if (char === '\n') {
      row.push(field.trim());
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field.trim());
    rows.push(row);
  }
  return rows;
}

const data = {};
const groups = {};

for (const file of csvFiles) {
  const rows = parseCsv(fs.readFileSync(path.join(root, file), 'utf8').replace(/^\uFEFF/, ''));
  if (rows.length < 3) throw new Error(`${file}: CSV 행이 충분하지 않습니다.`);

  const years = rows[0].slice(1);
  const sizeGroups = rows[1].slice(1);
  if (years.length !== sizeGroups.length) {
    throw new Error(`${file}: 연도 행과 규모 행의 열 수가 다릅니다.`);
  }

  for (const row of rows.slice(2)) {
    const item = row[0];
    if (!item) continue;
    for (let column = 0; column < years.length; column += 1) {
      const year = Number(years[column]);
      const group = sizeGroups[column];
      if (!Number.isInteger(year) || !group) continue;
      const value = row[column + 1];
      const number = value === '' || value === '-' ? null : Number(value.replaceAll(',', ''));
      if (number !== null && !Number.isFinite(number)) {
        throw new Error(`${file}: ${year}년 ${group} ${item} 값이 숫자가 아닙니다.`);
      }

      data[year] ??= {};
      groups[year] ??= [];
      data[year][group] ??= {};
      data[year][group][item] = number;
      if (!groups[year].includes(group)) groups[year].push(group);
    }
  }
}

for (const year of Object.keys(data)) {
  if (!data[year]['평균']) {
    throw new Error(`${year}년 평균 데이터가 없습니다.`);
  }
}

const output = `const DB = ${JSON.stringify({ data, groups }, null, 2)};\n`;
fs.writeFileSync(path.join(root, 'data.js'), output, 'utf8');
console.log(`${csvFiles.length}개 CSV에서 ${Object.keys(data).length}개 연도의 데이터를 data.js로 저장했습니다.`);
