const fs = require('fs');

const transcriptFile = "C:\\Users\\Joshua Adegbala\\.gemini\\antigravity-ide\\brain\\aa9442ea-3968-42e7-a81e-f0a4a4cdd6d2\\.system_generated\\logs\\transcript_full.jsonl";
const lines = fs.readFileSync(transcriptFile, 'utf8').split('\n');

let topHeaderContent = "";

for (const line of lines) {
  if (!line) continue;
  try {
    const obj = JSON.parse(line);
    if (obj.type === 'VIEW_FILE' && obj.source === 'MODEL' && obj.content) {
      if (obj.content.includes("src/components/TopHeader.tsx`") && obj.content.includes("Total Bytes: 14934")) {
         const fileContentStr = obj.content;
         const start = fileContentStr.indexOf("1: ");
         const end = fileContentStr.indexOf("The above content does NOT show the entire file");
         if (start !== -1 && end !== -1) {
             const linesWithNum = fileContentStr.substring(start, end).trim().split('\n');
             topHeaderContent = linesWithNum.map(l => l.replace(/^\d+:\s?/, '')).join('\n');
         }
      }
    }
  } catch(e) {}
}

if (topHeaderContent) {
   fs.writeFileSync("c:/Users/Joshua Adegbala/Documents/financeOS/src/components/TopHeader.tsx", topHeaderContent);
   console.log("Recovered TopHeader.tsx, length:", topHeaderContent.length);
} else {
   console.log("Could not find TopHeader.tsx in transcript.");
}
