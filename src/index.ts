import { existsSync, writeFileSync } from "node:fs";
import { getTVListings } from "./tvlistings.js";
import { buildXmltv } from "./xmltv.js";
import { getConfig } from "./config.js";

import { createRequire } from "module";
import { resolve } from "node:path";
const require = createRequire(import.meta.url);
const express = require("express");

const config = getConfig();

function isHelp() {
  if (process.argv.includes("--help")) {
    console.log(`
Usage: node dist/index.js [options]

Options:
--help           Show this help message
--lineupId=ID    Lineup ID (default: USA-lineupId-DEFAULT)
--timespan=NUM   Timespan in hours (up to 360 = 15 days, default: 6)
--pref=LIST      User preferences, comma separated. Can be m, p, and h (default: empty)'
--country=CON    Country code (default: USA)
--postalCode=ZIP Postal code (default: 30309)
--userAgent=UA   Custom user agent string (default: Uses random if not specified)
--timezone=TZ    Timezone (default: America/New_York)
--webServer=true Serve the output file on HTTP/80 at /
`);
    process.exit(0);
  }
}

async function buildGuide() {
  console.log("Building XMLTV file");
  console.log(`Config: Country=${config.country}, PostalCode=${config.postalCode}, OutputFile=${config.outputFile}`);

  console.log("Fetching TV listings...");
  const data = await getTVListings();
  console.log(`Successfully fetched ${data.channels.length} channels`);

  console.log("Building XMLTV content...");
  const xml = buildXmltv(data);

  console.log(`Writing XMLTV to ${config.outputFile}...`);
  writeFileSync(config.outputFile, xml, { encoding: "utf-8" });
  console.log("XMLTV file created successfully!");
}

async function main() {
  try {
    isHelp();
    await buildGuide();
  } catch (err) {
    console.error("Error fetching or building XMLTV:", err);
    process.exit(1);
  }
}

console.log(config)

if(!config.webServer) {
  await main();
  process.exit(0);
}


// divide the fetched timespan by 3 to determine how often to refresh the guide
// e.g., for 72 hours, refresh every 24 hours
// if timespan is 3 hours or less, refresh every hour
const timespanNumber = Number.parseInt(config.timespan);
const ONE_HOUR_IN_MS = 60 * 60 * 1000;
const GUIDE_TIMED_DELAY = timespanNumber > 3 ? (Number.parseInt(config.timespan) / 3) * ONE_HOUR_IN_MS : ONE_HOUR_IN_MS;

const app = express()
const port = 80

app.get('/', (_req: any, res: any) => {
  console.log('Received request for guide data')
  const path = resolve(config.outputFile)
  if(existsSync(path)) {
    res.set('Content-Type', 'application/xml')
    res.sendFile(path)
    return
  }
  res.status(404).json({ error: 'Resource not found' });
})

let buildTimer: ReturnType<typeof setInterval> | null = null

app.listen(port, async () => {
  buildTimer = setInterval(async () => {
    console.log("Timed task to generate guide running.");
    await buildGuide()
  }, GUIDE_TIMED_DELAY)
  console.log(`App listening on port ${port}`)
  await buildGuide()
})

if(buildTimer) {
  clearInterval(buildTimer)
}



