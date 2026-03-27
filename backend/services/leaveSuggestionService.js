const Holidays = require('date-holidays');
const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic();

// ── helpers ──────────────────────────────────────────────────────────────────

function addDays(date, n) {
  return new Date(date.getTime() + n * 86400000);
}

function isWeekend(date) {
  const d = date.getDay();
  return d === 0 || d === 6;
}

function fmtDate(date) {
  return date.toISOString().slice(0, 10);
}

// ── bridge-opportunity finder ─────────────────────────────────────────────────

function findBridgeOpportunities(countryCode, year) {
  const hd = new Holidays(countryCode || 'GB');
  const yearHolidays = hd.getHolidays(year).filter(h => h.type === 'public');

  const holidayMap = new Map();
  for (const h of yearHolidays) {
    holidayMap.set(h.date.split(' ')[0], h.name);
  }

  function isFree(d) {
    return isWeekend(d) || holidayMap.has(fmtDate(d));
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const raw = [];

  for (const h of yearHolidays) {
    const hDate = new Date(h.date.split(' ')[0]);
    if (isWeekend(hDate) || hDate < today) continue;

    // Find natural free block around this holiday
    let blockStart = new Date(hDate);
    let p = addDays(hDate, -1);
    while (isFree(p)) { blockStart = p; p = addDays(p, -1); }

    let blockEnd = new Date(hDate);
    let q = addDays(hDate, 1);
    while (isFree(q)) { blockEnd = q; q = addDays(q, 1); }

    // Try extending with 1–4 leave days on either side
    for (let extraLeft = 0; extraLeft <= 3; extraLeft++) {
      for (let extraRight = 0; extraRight <= 3; extraRight++) {
        const leaveDays = extraLeft + extraRight;
        if (leaveDays === 0 || leaveDays > 4) continue;

        // Extend left by extraLeft workdays (skipping additional free days)
        let extStart = new Date(blockStart);
        let leftAdded = 0;
        let ptr = addDays(blockStart, -1);
        while (leftAdded < extraLeft) {
          if (isFree(ptr)) {
            extStart = new Date(ptr);
          } else {
            extStart = new Date(ptr);
            leftAdded++;
          }
          ptr = addDays(ptr, -1);
        }

        // Extend right by extraRight workdays
        let extEnd = new Date(blockEnd);
        let rightAdded = 0;
        ptr = addDays(blockEnd, 1);
        while (rightAdded < extraRight) {
          if (isFree(ptr)) {
            extEnd = new Date(ptr);
          } else {
            extEnd = new Date(ptr);
            rightAdded++;
          }
          ptr = addDays(ptr, 1);
        }

        const totalDays = Math.round((extEnd - extStart) / 86400000) + 1;
        const ratio = totalDays / leaveDays;

        if (totalDays >= 4 && ratio >= 1.5) {
          raw.push({
            holidayName: h.name,
            holidayDate: fmtDate(hDate),
            startDate: fmtDate(extStart),
            endDate: fmtDate(extEnd),
            leaveDaysNeeded: leaveDays,
            totalDaysOff: totalDays,
            ratio: parseFloat(ratio.toFixed(2)),
          });
        }
      }
    }
  }

  // Best ratio first, then most days off
  raw.sort((a, b) => b.ratio - a.ratio || b.totalDaysOff - a.totalDaysOff);

  // Deduplicate overlapping windows — keep best for each cluster
  const deduped = [];
  for (const op of raw) {
    const overlaps = deduped.some(
      e => op.startDate <= e.endDate && op.endDate >= e.startDate
    );
    if (!overlaps) deduped.push(op);
  }

  return deduped.slice(0, 8);
}

// ── main export ───────────────────────────────────────────────────────────────

async function generateSuggestions(countryCode) {
  const cc = (countryCode || 'GB').toUpperCase();
  const thisYear = new Date().getFullYear();

  const opps = [
    ...findBridgeOpportunities(cc, thisYear),
    ...findBridgeOpportunities(cc, thisYear + 1),
  ].filter(o => o.startDate >= new Date().toISOString().slice(0, 10))
   .sort((a, b) => b.ratio - a.ratio || b.totalDaysOff - a.totalDaysOff)
   .slice(0, 8);

  // Fall back gracefully when no bridge opportunities found
  if (!opps.length) {
    return [
      {
        title: 'Summer Break',
        dates: 'July or August',
        leaveDays: 5,
        totalDaysOff: 9,
        description: 'Book a full week in summer when business is typically quieter and enjoy 9 consecutive days off including two weekends.',
        tip: 'Submit your request early — summer is a popular period and slots fill quickly.',
      },
    ];
  }

  const prompt = `You are a helpful HR assistant giving personalised annual-leave advice.

Today: ${new Date().toISOString().slice(0, 10)}
Country: ${cc}

Below are public-holiday bridge opportunities I have algorithmically identified. Each entry shows how many leave days are needed and how many consecutive days off that produces.

${JSON.stringify(opps, null, 2)}

Pick the 3 best suggestions (best bang-for-buck, spread across different times of year where possible). Return a JSON array — no markdown, no extra text — with exactly 3 objects, each having:

{
  "title": "Short catchy title, e.g. Easter Long Weekend",
  "dates": "Human-readable range, e.g. 18–26 Apr 2025",
  "leaveDays": <integer — leave days needed>,
  "totalDaysOff": <integer — consecutive days off>,
  "description": "1–2 sentences explaining why this is great value",
  "tip": "One practical tip for booking or enjoying this break"
}`;

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    thinking: { type: 'adaptive' },
    messages: [{ role: 'user', content: prompt }],
  });

  const textBlock = response.content.find(b => b.type === 'text');
  if (!textBlock) throw new Error('No text in Claude response');

  const jsonMatch = textBlock.text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('Could not parse JSON from Claude response');

  return JSON.parse(jsonMatch[0]);
}

module.exports = { generateSuggestions };
