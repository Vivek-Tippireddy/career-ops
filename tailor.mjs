#!/usr/bin/env node
/**
 * tailor.mjs — 1-Step Automated CV Tailoring for career-ops
 *
 * Usage:
 *   1. Paste your target Job Description into jd.txt
 *   2. Run: npm run tailor  (or node tailor.mjs)
 *
 * It automatically evaluates the JD against your cv.md, applies anti-fabrication
 * rules, generates a tailored HTML CV, and compiles a recruiter-friendly PDF!
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const ROOT = dirname(fileURLToPath(import.meta.url));
const jdPath = join(ROOT, 'jd.txt');

console.log(`\n╔══════════════════════════════════════════════════════════════════╗`);
console.log(`║             career-ops — 1-Step Automated CV Tailor              ║`);
console.log(`╚══════════════════════════════════════════════════════════════════╝\n`);

if (!existsSync(jdPath) || !readFileSync(jdPath, 'utf-8').trim()) {
  console.error(`❌  jd.txt is empty or missing!`);
  console.error(`👉  Please paste your target Job Description into jd.txt and run this script again.`);
  process.exit(1);
}

const jdText = readFileSync(jdPath, 'utf-8').trim();
console.log(`📄  Target JD loaded (${jdText.length} characters)`);

// ---------------------------------------------------------------------------
// Step 1: Run Gemini Evaluation
// ---------------------------------------------------------------------------
console.log(`\n[1/3] 🤖 Evaluating Job Description against your cv.md...`);
try {
  execSync(`node gemini-eval.mjs --file "${jdPath}"`, { stdio: 'inherit', cwd: ROOT });
} catch (err) {
  console.error(`❌  Evaluation failed:`, err.message);
  process.exit(1);
}

// Find newest report in reports/
const reportsDir = join(ROOT, 'reports');
const reportFiles = readdirSync(reportsDir)
  .filter(f => f.endsWith('.md') && f !== 'README.md')
  .map(f => ({ name: f, time: statSync(join(reportsDir, f)).mtimeMs }))
  .sort((a, b) => b.time - a.time);

if (reportFiles.length === 0) {
  console.error(`❌  No evaluation report found in reports/ directory.`);
  process.exit(1);
}

const latestReportPath = join(reportsDir, reportFiles[0].name);
console.log(`\n✅  Evaluation Report ready: ${reportFiles[0].name}`);

// ---------------------------------------------------------------------------
// Step 2: Tailor HTML CV
// ---------------------------------------------------------------------------
console.log(`\n[2/3] ✏️  Tailoring recruiter-friendly HTML CV...`);
try {
  execSync(`node gemini-tailor.mjs --jd "${jdPath}" --report "${latestReportPath}"`, { stdio: 'inherit', cwd: ROOT });
} catch (err) {
  console.error(`❌  CV tailoring failed:`, err.message);
  process.exit(1);
}

// Find newest html file in output/
const outputDir = join(ROOT, 'output');
const htmlFiles = readdirSync(outputDir)
  .filter(f => f.endsWith('.html'))
  .map(f => ({ name: f, time: statSync(join(outputDir, f)).mtimeMs }))
  .sort((a, b) => b.time - a.time);

if (htmlFiles.length === 0) {
  console.error(`❌  No tailored HTML file found in output/ directory.`);
  process.exit(1);
}

const latestHtmlPath = join(outputDir, htmlFiles[0].name);
const pdfName = htmlFiles[0].name.replace(/\.html$/, '.pdf');
const pdfPath = join(outputDir, pdfName);

// ---------------------------------------------------------------------------
// Step 3: Generate Recruiter-Friendly PDF
// ---------------------------------------------------------------------------
console.log(`\n[3/3] 🖨️  Compiling ATS & Recruiter-friendly PDF CV...`);
try {
  execSync(`node generate-pdf.mjs "output/${htmlFiles[0].name}" "output/${pdfName}" --format=letter`, { stdio: 'inherit', cwd: ROOT });
} catch (err) {
  console.warn(`⚠️   PDF compilation warning (HTML is ready):`, err.message);
}

console.log(`\n🎉  =======================================================`);
console.log(`🎉  SUCCESS! Tailored CV Generated Successfully:`);
console.log(`📄  HTML Version: ${latestHtmlPath}`);
if (existsSync(pdfPath)) {
  console.log(`📕  PDF Version : ${pdfPath}`);
}
console.log(`🎉  =======================================================\n`);
