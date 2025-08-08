import type { AnalysisResult } from "@/utils/analyze";

export type Scan = {
  scan_id: string;
  timestamp: string; // ISO
  source: 'image' | 'text';
  image_path: string | null;
  raw_text: string;
  cleaned_ingredients: string[];
  analysis: AnalysisResult;
  saved: boolean;
  user_notes: string | null;
};

const KEY = 'foodde_scans_v1';

function read(): Scan[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}
function write(scans: Scan[]) { localStorage.setItem(KEY, JSON.stringify(scans)); }

export function cleanupOldScans() {
  const scans = read();
  const now = Date.now();
  const filtered = scans.filter(s => (s.saved ? true : (now - new Date(s.timestamp).getTime()) < 24*60*60*1000));
  if (filtered.length !== scans.length) write(filtered);
}

export function saveScan(scan: Scan) {
  const scans = read();
  scans.unshift(scan);
  write(scans);
}

export function getRecentScans(): Scan[] {
  cleanupOldScans();
  return read();
}

export function saveScanPermanently(analysis: AnalysisResult) {
  const scans = read();
  if (!scans.length) return;
  // Mark latest as saved
  scans[0].saved = true;
  write(scans);
}
