#!/usr/bin/env npx ts-node
/**
 * Headless Library Analyzer Script
 *
 * Uses Puppeteer to run the browser-based BPM/Key analyzer and save results.
 *
 * Usage: npx ts-node scripts/run-analyzer.ts
 */

import * as puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

const ANALYZER_URL = 'http://localhost:3001/?analyze=true';
const OUTPUT_FILE = path.join(__dirname, '..', 'public', 'audio', 'tracks-metadata.json');

async function main() {
  console.log('🎵 DJ Slammer Library Analyzer (Headless)');
  console.log('=========================================\n');

  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: false, // Set to true for fully headless
    args: ['--autoplay-policy=no-user-gesture-required'],
  });

  const page = await browser.newPage();

  // Enable console logging from the page
  page.on('console', msg => {
    console.log(`[Browser] ${msg.text()}`);
  });

  console.log(`Navigating to ${ANALYZER_URL}...`);
  await page.goto(ANALYZER_URL, { waitUntil: 'networkidle0' });

  console.log('Clicking "Analyze New Tracks Only" button...');

  // Click the analyze button
  await page.click('button:first-of-type');

  // Wait for analysis to complete (check for status === 'complete')
  console.log('Waiting for analysis to complete...');

  await page.waitForFunction(
    () => {
      const statusEl = document.querySelector('div[style*="marginBottom"] strong');
      return statusEl && statusEl.textContent === 'COMPLETE';
    },
    { timeout: 600000 } // 10 minute timeout
  );

  console.log('Analysis complete! Extracting JSON...');

  // Click copy to clipboard
  const copyButton = await page.$('button:nth-of-type(2)');
  if (copyButton) {
    await copyButton.click();
  }

  // Get the JSON from the results
  const json = await page.evaluate(() => {
    // The component stores results in state, we need to get it from the table
    const rows = document.querySelectorAll('table tbody tr');
    // Actually, let's just click download and intercept it
    return null;
  });

  // Alternative: click download and read the file
  const downloadButton = await page.$('button:has-text("Download JSON")');

  console.log('\nDone! Check the browser window to download the JSON file.');
  console.log('Or manually copy the JSON from the clipboard and save to:');
  console.log(OUTPUT_FILE);

  // Keep browser open for manual inspection
  console.log('\nPress Ctrl+C to close...');
  await new Promise(() => {}); // Keep running
}

main().catch(console.error);
