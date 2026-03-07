/**
 * EkiData → Firestore Import Script
 *
 * Usage:
 *   1. Add FIREBASE_SERVICE_ACCOUNT_PATH to .env pointing to your serviceAccount.json
 *      (Download from Firebase Console → Project Settings → Service Accounts)
 *   2. npm install firebase-admin
 *   3. node scripts/import-ekidata.js
 *
 * Only imports active records (e_status === 0).
 * Firestore batch limit is 500 writes — script handles chunking automatically.
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCS = resolve(__dirname, "../docs");

// Load service account
const serviceAccount = JSON.parse(
  readFileSync(resolve(__dirname, "../serviceAccount.json"), "utf8")
);

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

// ── CSV Parser ────────────────────────────────────────────────
function parseCSV(filePath) {
  const text = readFileSync(filePath, "utf8");
  const [headerLine, ...rows] = text.trim().split("\n");
  const headers = headerLine.split(",");
  return rows.map((row) => {
    const values = row.split(",");
    return Object.fromEntries(headers.map((h, i) => [h.trim(), values[i]?.trim() ?? ""]));
  });
}

// ── Batch writer (500 limit) ──────────────────────────────────
async function batchWrite(collectionName, docs) {
  const chunks = [];
  for (let i = 0; i < docs.length; i += 500) chunks.push(docs.slice(i, i + 500));

  for (const [i, chunk] of chunks.entries()) {
    const batch = db.batch();
    chunk.forEach(({ id, data }) => {
      batch.set(db.collection(collectionName).doc(id), data);
    });
    await batch.commit();
    console.log(`  ${collectionName}: chunk ${i + 1}/${chunks.length} done`);
  }
}

// ── Import Companies ──────────────────────────────────────────
async function importCompanies() {
  console.log("Importing companies...");
  const rows = parseCSV(`${DOCS}/company20251015.csv`);
  const docs = rows
    .filter((r) => r.e_status === "0")
    .map((r) => ({
      id: r.company_cd,
      data: {
        company_cd: r.company_cd,
        company_name: r.company_name,
        company_name_en: r.company_name_r,
        company_url: r.company_url,
      },
    }));
  await batchWrite("companies", docs);
  console.log(`  → ${docs.length} companies imported`);
}

// ── Import Lines ──────────────────────────────────────────────
async function importLines() {
  console.log("Importing lines...");
  const rows = parseCSV(`${DOCS}/line20250604free.csv`);

  // Count stations per line
  const stationRows = parseCSV(`${DOCS}/station20260206free.csv`);
  const stationCountByLine = {};
  stationRows
    .filter((r) => r.e_status === "0")
    .forEach((r) => {
      stationCountByLine[r.line_cd] = (stationCountByLine[r.line_cd] || 0) + 1;
    });

  const docs = rows
    .filter((r) => r.e_status === "0")
    .map((r) => ({
      id: r.line_cd,
      data: {
        line_cd: r.line_cd,
        company_cd: r.company_cd,
        line_name: r.line_name,
        line_name_en: r.line_name_h || r.line_name,
        line_name_k: r.line_name_k || "",
        line_color_c: r.line_color_c || "",
        total_stations: stationCountByLine[r.line_cd] || 0,
      },
    }));
  await batchWrite("lines", docs);
  console.log(`  → ${docs.length} lines imported`);
}

// ── Import Stations ───────────────────────────────────────────
async function importStations() {
  console.log("Importing stations...");
  const rows = parseCSV(`${DOCS}/station20260206free.csv`);
  const docs = rows
    .filter((r) => r.e_status === "0")
    .map((r) => ({
      id: r.station_cd,
      data: {
        station_cd: r.station_cd,
        station_g_cd: r.station_g_cd,
        station_name: r.station_name,
        station_name_en: r.station_name_r || r.station_name,
        line_cd: r.line_cd,
        pref_cd: r.pref_cd,
        address: r.address,
        lat: parseFloat(r.lat),
        lon: parseFloat(r.lon),
        e_sort: parseInt(r.e_sort) || 0,
        has_stamp: false,
      },
    }));
  await batchWrite("stations", docs);
  console.log(`  → ${docs.length} stations imported`);
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
  console.log("=== EkiData Import ===");
  await importCompanies();
  await importLines();
  await importStations();
  console.log("=== Done ===");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
