import Papa from 'papaparse';

export interface CSVRow {
  [key: string]: string;
}

export function parseCSV(csvText: string): CSVRow[] {
  // First, parse raw rows without headers to find where the actual header starts.
  const rawParsed = Papa.parse<string[]>(csvText, {
    header: false,
    skipEmptyLines: 'greedy',
  });
  
  const rawRows = rawParsed.data;
  if (rawRows.length === 0) return [];
  
  // Let's identify the header row.
  // We'll search for the first row that contains key identifying column names.
  const serviceHeaders = ['name of service', 'segment'];
  const pricingHeaders = ['line item unique code', 'well classification'];
  
  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
    const row = rawRows[i].map(cell => cell.toLowerCase().trim());
    
    // Check if this row looks like a header row
    const isServiceHeader = serviceHeaders.every(h => row.some(cell => cell.includes(h)));
    const isPricingHeader = pricingHeaders.every(h => row.some(cell => cell.includes(h)));
    
    if (isServiceHeader || isPricingHeader) {
      headerRowIndex = i;
      break;
    }
  }
  
  // Re-join the CSV starting from the detected header row index
  const validLines = rawRows.slice(headerRowIndex);
  if (validLines.length === 0) return [];
  
  const headers = validLines[0].map(h => h.trim());
  const rows: CSVRow[] = [];
  
  for (let i = 1; i < validLines.length; i++) {
    const row = validLines[i];
    // Skip row if it doesn't have any non-empty cells
    if (row.every(cell => !cell.trim())) continue;
    
    const rowObject: CSVRow = {};
    headers.forEach((header, index) => {
      if (header) {
        rowObject[header] = (row[index] || '').trim();
      }
    });
    rows.push(rowObject);
  }
  
  return rows;
}

export function validateServiceCSV(rows: CSVRow[]): boolean {
  if (rows.length === 0) return false;
  
  const requiredColumns = ['Name of Service', 'Segment'];
  const firstRow = rows[0];
  
  return requiredColumns.every(col => 
    Object.keys(firstRow).some(key => 
      key.toLowerCase().trim() === col.toLowerCase().trim()
    )
  );
}
