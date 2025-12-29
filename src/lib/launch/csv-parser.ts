/**
 * CSV Parser for Launch Day Import
 * Handles the Onboarding CSV with German number formats
 */

import { OnboardingCsvRow, OnboardingIndex } from './types';

/**
 * Parse Euro amount from various formats
 * Handles: €10000.00, €20.000,00, 10000, "10.000,00 €"
 */
export function parseEuroAmount(value: string | undefined | null): number | null {
  if (!value || value.trim() === '') return null;

  // Remove currency symbol, spaces, and quotes
  let cleaned = value
    .replace(/[€\s"']/g, '')
    .trim();

  // Handle German format (1.000,00 -> 1000.00)
  // Check if it has comma as decimal separator
  if (cleaned.includes(',')) {
    // Remove thousand separators (dots before comma)
    cleaned = cleaned.replace(/\./g, '');
    // Replace comma with dot for decimal
    cleaned = cleaned.replace(',', '.');
  }

  const num = parseFloat(cleaned);
  return isNaN(num) ? null : Math.round(num);
}

/**
 * Normalize name for matching
 * "Abdullah Sardar" + "Mousa" -> "abdullahsardar|mousa"
 */
export function normalizeName(vorname: string, nachname: string): string {
  const v = (vorname || '').toLowerCase().trim().replace(/\s+/g, '');
  const n = (nachname || '').toLowerCase().trim().replace(/\s+/g, '');
  return `${v}|${n}`;
}

/**
 * Parse CSV text into rows
 * Handles tab-separated values (TSV) format
 */
export function parseCSV(csvText: string): Record<string, string>[] {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim());
  if (lines.length < 2) return [];

  // Detect delimiter (tab or semicolon or comma)
  const firstLine = lines[0];
  let delimiter = '\t';
  if (!firstLine.includes('\t')) {
    delimiter = firstLine.includes(';') ? ';' : ',';
  }

  // Parse header
  const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, ''));

  // Parse rows
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(delimiter).map(v => v.trim().replace(/^["']|["']$/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });
    rows.push(row);
  }

  return rows;
}

/**
 * Map CSV columns to our schema
 * CSV has: Vorname, Nachname, Genervt, Problem, Ziel, Aktuell Monatsumsatz, Ziel Monatsumsatz Zahl, Wie bist du...
 */
function mapCsvRowToOnboarding(row: Record<string, string>): OnboardingCsvRow | null {
  const vorname = row['Vorname']?.trim();
  const nachname = row['Nachname']?.trim();

  // Skip rows without name
  if (!vorname || !nachname) return null;

  return {
    vorname,
    nachname,
    aktuellerMonatsumsatz: parseEuroAmount(row['Aktuell Monatsumsatz']),
    zielMonatsumsatz: parseEuroAmount(row['Ziel Monatsumsatz Zahl']),
    wasNervtAmMeisten: row['Genervt']?.trim() || null,
    groessetesProblem: row['Problem']?.trim() || null,
    groessteZielWarum: row['Ziel']?.trim() || null,
    wieAufmerksam: row['Wie bist du auf das Mentoring aufmerksam geworden']?.trim() || null,
  };
}

/**
 * Parse onboarding CSV and create lookup index
 * Returns Map indexed by normalized name for O(1) lookup
 */
export function parseOnboardingCSV(csvText: string): {
  index: OnboardingIndex;
  totalRows: number;
  validRows: number;
  errors: string[];
} {
  const errors: string[] = [];
  const index: OnboardingIndex = new Map();

  const rows = parseCSV(csvText);
  let validRows = 0;

  for (let i = 0; i < rows.length; i++) {
    try {
      const mapped = mapCsvRowToOnboarding(rows[i]);
      if (mapped) {
        const key = normalizeName(mapped.vorname, mapped.nachname);
        index.set(key, mapped);
        validRows++;
      }
    } catch (e) {
      errors.push(`Row ${i + 2}: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  }

  return {
    index,
    totalRows: rows.length,
    validRows,
    errors,
  };
}

/**
 * Find onboarding data for a member by name
 */
export function findOnboardingByName(
  index: OnboardingIndex,
  vorname: string,
  nachname: string
): OnboardingCsvRow | null {
  const key = normalizeName(vorname, nachname);
  return index.get(key) || null;
}
