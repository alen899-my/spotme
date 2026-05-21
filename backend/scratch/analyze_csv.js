const fs = require('fs');
const readline = require('readline');
const path = require('path');

const csvPath = path.join(__dirname, '../data/newdatas/GYM.csv');

async function analyze() {
  const fileStream = fs.createReadStream(csvPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const mappings = {};

  let isHeader = true;
  for await (const line of rl) {
    if (isHeader) {
      isHeader = false;
      continue;
    }
    
    // Parse CSV line: Gender,Goal,BMI Category,Exercise Schedule,Meal Plan
    // Let's do comma split, but handle commas in quotes by splitting using a regex or simple state machine
    let parts = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        parts.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    parts.push(current);

    if (parts.length >= 5) {
      const gender = parts[0].trim();
      const goal = parts[1].trim();
      const bmi = parts[2].trim();
      const schedule = parts[3].trim();
      const meal = parts[4].trim();

      const key = `${gender} | ${goal} | ${bmi}`;
      if (!mappings[key]) {
        mappings[key] = { schedule, meal, count: 0 };
      }
      mappings[key].count++;
    }
  }

  console.log(JSON.stringify(mappings, null, 2));
}

analyze().catch(console.error);
