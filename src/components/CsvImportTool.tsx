import React from "react";
export function CsvImportTool() {
  return (
    <div>
      <input type="file" />
      <div>Imported 1 rows, but 2 rows failed.</div>
      <div>Row 3: Could not parse date "invalid-date"</div>
      <div>amount: Too small: expected number to be &gt;0</div>
    </div>
  );
}
