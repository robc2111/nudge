import sharp from 'sharp';
import { mkdir, rm } from 'fs/promises';

const INPUT = 'public/images-src';   // originals live here
const OUT   = 'public/images';       // generated files go here

// Helper: generate WEBP+AVIF for a source at multiple widths
async function buildSet({ inPath, outBase, widths, webpQ = 82, avifQ = 60 }) {
  for (const w of widths) {
    await sharp(inPath).resize({ width: w })
      .webp({ quality: webpQ })
      .toFile(`${outBase}-${w}.webp`);
    await sharp(inPath).resize({ width: w })
      .avif({ quality: avifQ })
      .toFile(`${outBase}-${w}.avif`);
  }
}

async function run() {
  // clean ONLY the output directory, never the input
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  // Big marketing shot
  await buildSet({
    inPath: `${INPUT}/dashboard.png`,
    outBase: `${OUT}/dashboard`,
    widths: [400, 800, 1600],
  });

  // Logo
  await buildSet({
    inPath: `${INPUT}/logo.png`,
    outBase: `${OUT}/logo`,
    widths: [256, 512],
  });

  // Cake icon (small)
  await buildSet({
    inPath: `${INPUT}/cake.png`,
    outBase: `${OUT}/cake`,
    widths: [120, 240],
  });

  // NEW: slice/crumbs/ant (small icons)
  await buildSet({
    inPath: `${INPUT}/slice.png`,
    outBase: `${OUT}/slice`,
    widths: [120, 240],
  });
  await buildSet({
    inPath: `${INPUT}/crumbs.png`,
    outBase: `${OUT}/crumbs`,
    widths: [120, 240],
  });
  await buildSet({
    inPath: `${INPUT}/ant.png`,
    outBase: `${OUT}/ant`,
    widths: [120, 240],
  });

  console.log('✅ Images generated');
}

run().catch(e => { console.error(e); process.exit(1); });