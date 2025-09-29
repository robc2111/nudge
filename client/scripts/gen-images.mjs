import sharp from 'sharp';
import { mkdir, rm } from 'fs/promises';

const INPUT = 'public/images-src';   // originals live here
const OUT   = 'public/images';       // generated files go here

const IMAGES = [
  {
    in: `${INPUT}/dashboard.png`,
    base: `${OUT}/dashboard`,
    widths: [400, 800, 1600],
  },
  {
    in: `${INPUT}/logo.png`,
    base: `${OUT}/logo`,
    widths: [256, 512],
  },
  {
    in: `${INPUT}/cake.png`,
    base: `${OUT}/cake`,
    widths: [120, 240],
  },
];

async function run() {
  // clean ONLY the output directory, never the input
  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  for (const img of IMAGES) {
    for (const w of img.widths) {
      await sharp(img.in).resize({ width: w }).webp({ quality: 82 }).toFile(`${img.base}-${w}.webp`);
      await sharp(img.in).resize({ width: w }).avif({ quality: 60 }).toFile(`${img.base}-${w}.avif`);
    }
  }
  console.log('✅ Images generated');
}

run().catch(e => { console.error(e); process.exit(1); });