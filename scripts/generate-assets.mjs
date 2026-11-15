import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const out = resolve("apps/mobile/assets");
mkdirSync(out, { recursive: true });

const navy = "#0B111C";
const gold = "#C5A46A";
const goldBright = "#E0C58A";

function emblem({ withBackground = true, monochrome = false } = {}) {
  const stroke = monochrome ? "#FFFFFF" : gold;
  const accent = monochrome ? "#FFFFFF" : goldBright;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  ${withBackground ? `<rect width="1024" height="1024" fill="${navy}"/>` : ""}
  <defs>
    <radialGradient id="glow" cx="50%" cy="38%" r="60%">
      <stop offset="0%" stop-color="${monochrome ? "#FFFFFF" : "#24344B"}" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="${navy}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  ${withBackground ? `<rect width="1024" height="1024" fill="url(#glow)"/>` : ""}
  <circle cx="512" cy="512" r="330" fill="none" stroke="${stroke}" stroke-width="6" opacity="0.55"/>
  <circle cx="512" cy="512" r="306" fill="none" stroke="${stroke}" stroke-width="2" opacity="0.35"/>
  <path d="M352 704 V430 C352 342 424 282 512 282 C600 282 672 342 672 430 V704"
        fill="none" stroke="${stroke}" stroke-width="12" stroke-linecap="round"/>
  <path d="M512 282 V704 M352 704 H672 M402 430 C402 360 450 318 512 318 C574 318 622 360 622 430"
        fill="none" stroke="${stroke}" stroke-width="6" opacity="0.8"/>
  <path d="M512 640 C470 590 430 550 430 500 C430 466 456 444 486 444 C500 444 510 450 512 462 C514 450 524 444 538 444 C568 444 594 466 594 500 C594 550 554 590 512 640 Z"
        fill="none" stroke="${accent}" stroke-width="8" opacity="0.95"/>
  <path d="M512 610 C488 578 462 548 462 514 C462 494 476 482 492 482 C502 482 508 488 512 496 C516 488 522 482 532 482 C548 482 562 494 562 514 C562 548 536 578 512 610 Z"
        fill="${accent}" opacity="0.22"/>
  <circle cx="512" cy="742" r="6" fill="${accent}"/>
  <path d="M300 760 H724" stroke="${stroke}" stroke-width="3" opacity="0.4"/>
  <path d="M330 780 H694" stroke="${stroke}" stroke-width="2" opacity="0.25"/>
</svg>`;
}

const splash = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="${navy}"/>
  <circle cx="512" cy="470" r="250" fill="none" stroke="${gold}" stroke-width="5" opacity="0.6"/>
  <path d="M392 620 V470 C392 402 446 356 512 356 C578 356 632 402 632 470 V620"
        fill="none" stroke="${gold}" stroke-width="9" stroke-linecap="round"/>
  <path d="M512 356 V620 M392 620 H632" stroke="${gold}" stroke-width="5" opacity="0.85"/>
  <path d="M512 585 C482 550 452 520 452 490 C452 468 470 452 490 452 C500 452 508 458 512 466 C516 458 524 452 534 452 C554 452 572 468 572 490 C572 520 542 550 512 585 Z"
        fill="none" stroke="${goldBright}" stroke-width="6"/>
  <text x="512" y="740" text-anchor="middle" font-family="Georgia, serif" font-size="88" letter-spacing="14" fill="${goldBright}">PLUME</text>
  <text x="512" y="790" text-anchor="middle" font-family="Georgia, serif" font-size="24" letter-spacing="8" fill="${gold}" opacity="0.8">BIBLIOTHÈQUE ENCHANTÉE</text>
</svg>`;

await sharp(Buffer.from(emblem())).resize(1024, 1024).png().toFile(`${out}/icon.png`);
await sharp(Buffer.from(emblem({ withBackground: false }))).resize(1024, 1024).png().toFile(`${out}/android-icon-foreground.png`);
await sharp(Buffer.from(emblem({ monochrome: true, withBackground: false }))).resize(1024, 1024).png().toFile(`${out}/android-icon-monochrome.png`);
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: navy } }).png().toFile(`${out}/android-icon-background.png`);
await sharp(Buffer.from(splash)).resize(1024, 1024).png().toFile(`${out}/splash-icon.png`);
await sharp(Buffer.from(emblem())).resize(64, 64).png().toFile(`${out}/favicon.png`);

console.log("Assets Plume générés dans apps/mobile/assets");
