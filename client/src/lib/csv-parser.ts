export interface CSVRow {
  [key: string]: string;
}

export function parseCSV(csvText: string): CSVRow[] {
  const lines = csvText.split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  
  const rows: CSVRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
    const row: CSVRow = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    rows.push(row);
  }
  
  return rows;
}

export function validateServiceCSV(rows: CSVRow[]): boolean {
  if (rows.length === 0) return false;
  
  const requiredColumns = ['Name of Service', 'Segment'];
  const firstRow = rows[0];
  
  return requiredColumns.every(col => 
    col in firstRow || 
    col.toLowerCase() in firstRow || 
    col.replace(/\s+/g, '').toLowerCase() in firstRow
  );
}
