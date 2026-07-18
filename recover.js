const fs = require('fs');
const path = require('path');

const logFile = "C:\\Users\\Joshua Adegbala\\.gemini\\antigravity-ide\\brain\\aa9442ea-3968-42e7-a81e-f0a4a4cdd6d2\\.system_generated\\logs\\transcript_full.jsonl";

const lines = fs.readFileSync(logFile, 'utf-8').split('\n');
const files = {};

for (const line of lines) {
  if (!line) continue;
  try {
    const obj = JSON.parse(line);
    // Look for tool responses that show the file content
    if (obj.type === 'TOOL_RESPONSE' && obj.content) {
      if (obj.content.includes("File Path: `file:///c:/Users/Joshua%20Adegbala/Documents/financeOS/src/components/TopHeader.tsx`")) {
        const match = obj.content.match(/The following code has been modified.*?\n([\s\S]*?)The above content/);
        if (match && match[1].length > 10) files['TopHeader.tsx'] = match[1];
      }
      if (obj.content.includes("File Path: `file:///c:/Users/Joshua%20Adegbala/Documents/financeOS/src/components/CsvImportTool.tsx`")) {
        const match = obj.content.match(/The following code has been modified.*?\n([\s\S]*?)The above content/);
        if (match && match[1].length > 10) files['CsvImportTool.tsx'] = match[1];
      }
      if (obj.content.includes("File Path: `file:///c:/Users/Joshua%20Adegbala/Documents/financeOS/src/components/DashboardView.tsx`")) {
        const match = obj.content.match(/The following code has been modified.*?\n([\s\S]*?)The above content/);
        if (match && match[1].length > 10) files['DashboardView.tsx'] = match[1];
      }
    }
  } catch(e) {}
}

for (const [name, content] of Object.entries(files)) {
  const cleaned = content.replace(/^\d+:\s/gm, '');
  fs.writeFileSync(`c:/Users/Joshua Adegbala/Documents/financeOS/src/components/${name}`, cleaned);
  console.log(`Recovered ${name}`);
}
