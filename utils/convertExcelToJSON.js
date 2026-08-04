const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const excelFilePath = path.resolve(__dirname, '../data', 'search-map.xlsx');
const jsonOutputPath = path.resolve(__dirname, '../data', 'search-map.json');

function convertExcelToJSON() {
  const workbook = xlsx.readFile(excelFilePath);
  const sheetName = workbook.SheetNames[0]; // Get the first sheet
  const sheet = workbook.Sheets[sheetName];

  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });

  const jsonArray = data.slice(1) // Skip header row
    .map(row => {
      const [selector, searchValue, replaceValue] = row;

      // Only include row if not all three columns are empty
      if (selector || searchValue || replaceValue) {
        return {
          selector: selector || "",
          searchValue: searchValue || "",
          replaceValue: replaceValue || ""
        };
      }
      return null;
    })
    .filter(item => item !== null);

  fs.writeFileSync(jsonOutputPath, JSON.stringify(jsonArray, null, 2), 'utf8');
  console.log(`JSON saved to ${jsonOutputPath}`);
}

convertExcelToJSON();
