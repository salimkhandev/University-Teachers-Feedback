import { parse } from 'csv-parse/sync';

export interface CsvRow {
  name:      string;
  username:  string;
  password:  string;
  email?:    string;
  cnic?:     string;
  phone?:    string;
  sectionId: string;
  semesterId:string;
}

export function parseCsvBuffer(buffer: Buffer): CsvRow[] {
  return parse(buffer, {
    columns:          true,   // use first row as header keys
    skip_empty_lines: true,
    trim:             true,
  }) as CsvRow[];
}
