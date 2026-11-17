/* eslint-disable */
// Usage: node scripts/find-english.js <files-or-dirs...>
// Prints file:line: text for visible strings that look like English (>= 2 ASCII words).
const fs = require('fs');
const path = require('path');

const ALLOW = /^(SerpBear|Google|Search Console|Google Ads|CSV|URL|API|Client ID|Client Secret)$/i;
const looksEnglish = (t) => {
   const s = t.trim();
   if (!/^[\x20-\x7E]+$/.test(s)) return false;
   if (ALLOW.test(s)) return false;
   if (/[{}=;<>()\/\_@#]|^https?:|^[.#\w-]+:|\.(png|svg|css|tsx?|json)$/.test(s)) return false;
   const words = s.split(/\s+/).filter((w) => /^[A-Za-z][A-Za-z'.,!?-]*$/.test(w));
   return words.length >= 2 && /[a-z]{3}/.test(s);
};

const walk = (p, out) => {
   if (!fs.existsSync(p)) return out;
   const st = fs.statSync(p);
   if (st.isDirectory()) { fs.readdirSync(p).forEach((f) => { if (f !== 'api' && f !== 'node_modules') walk(path.join(p, f), out); }); } else if (/\.tsx?$/.test(p)) out.push(p);
   return out;
};

const files = process.argv.slice(2).reduce((a, p) => walk(p, a), []);
let count = 0;
files.forEach((f) => {
   fs.readFileSync(f, 'utf8').split(/\r?\n/).forEach((line, i) => {
      const found = [];
      // JSX text nodes
      const jsx = />([^<>{}]+)</g; let m;
      while ((m = jsx.exec(line))) found.push(m[1]);
      // attributes and call-site strings
      const attr = /(?:title|placeholder|label|aria-label|defaultLabel|toast(?:\.\w+)?\(|msg:|error:|message:)\s*[=:(]?\s*[`'"]([^`'"]+)[`'"]/g;
      while ((m = attr.exec(line))) found.push(m[1]);
      // multiline JSX text (line is only text)
      if (/^\s+[A-Z][^<>{}=;]*$/.test(line) && !/^\s*(import|export|\/\/|\*)/.test(line)) found.push(line.trim());
      found.filter(looksEnglish).forEach((t) => { count += 1; console.log(`${f}:${i + 1}: ${t.trim()}`); });
   });
});
process.exitCode = 0;
if (count === 0) console.log('OK: no English strings found');
