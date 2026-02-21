const userCode = require('./index.js');
const fs = require('fs');

async function main() {
  const input = fs.readFileSync(0, 'utf-8'); // Read STDIN
  const event = input ? JSON.parse(input) : {};
  
  try {
    // developer returns promise or sync value
    const result = await userCode(event);
    
    // We send back exactly one valid JSON line at the end
    console.log(JSON.stringify({ success: true, response: result }));
  } catch (err) {
    console.error("Function Error:", err);
    console.log(JSON.stringify({ success: false, error: err.message }));
  }
}

main();
