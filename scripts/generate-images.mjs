/**
 * Generátor obrázků pro Carp Club ČR
 * Používá NVIDIA Stable Diffusion 3 API
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public', 'images');

// Zajistit existenci složky
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const invokeUrl = "https://ai.api.nvidia.com/v1/genai/stabilityai/stable-diffusion-3-medium";

const headers = {
  "Authorization": `Bearer ${process.env.NVIDIA_API_KEY}`,
  "Accept": "application/json",
  "Content-Type": "application/json"
};

// Použití: NVIDIA_API_KEY=nvapi-xxx node scripts/generate-images.mjs

// 4 obrázky pro Carp Club aplikaci
const imageConfigs = [
  {
    name: "hero-banner",
    prompt: "Majestic carp fish jumping out of calm lake water at golden sunset, dramatic lighting, water splashing, Czech countryside landscape in background, professional wildlife photography, 8k, ultra detailed, cinematic",
    aspect_ratio: "16:9",
    description: "Landing page hero banner",
    usage: "src/app/page.tsx - hlavní banner na landing page"
  },
  {
    name: "login-background",
    prompt: "Serene misty lake at dawn, fishing rods silhouette, peaceful atmosphere, soft morning light through fog, minimalist composition, Czech pond landscape, dreamy ethereal mood, high quality photography",
    aspect_ratio: "1:1",
    description: "Pozadí pro login/register",
    usage: "src/app/(auth)/layout.tsx - pozadí přihlašovací stránky"
  },
  {
    name: "empty-gallery",
    prompt: "Artistic flat lay of carp fishing equipment on wooden dock, fishing reel, hooks, bait, boilies, tackle box, soft natural lighting, top-down view, clean composition, professional product photography",
    aspect_ratio: "1:1",
    description: "Placeholder pro prázdnou galerii",
    usage: "src/app/zavod/[zavodId]/galerie/page.tsx - když nejsou žádné úlovky"
  },
  {
    name: "competition-atmosphere",
    prompt: "Carp fishing competition scene, multiple bivvy tents along lake shore, fishing rods on rod pods, early morning atmosphere, Czech fishing tournament, professional sports photography, wide angle, dramatic sky",
    aspect_ratio: "16:9",
    description: "Závodní atmosféra",
    usage: "src/components/landing/AboutSection.tsx - sekce O závodech"
  }
];

async function generateImage(config, index) {
  console.log(`\n[${index + 1}/4] Generuji: ${config.name}`);
  console.log(`   Prompt: ${config.prompt.substring(0, 60)}...`);

  const payload = {
    prompt: config.prompt,
    cfg_scale: 7,
    aspect_ratio: config.aspect_ratio,
    seed: 0,
    steps: 40,
    negative_prompt: "blurry, low quality, distorted, watermark, text, logo, cartoon, anime, illustration, drawing"
  };

  try {
    const response = await fetch(invokeUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`API error ${response.status}: ${errBody}`);
    }

    const data = await response.json();

    if (data.image) {
      // Uložit base64 obrázek
      const imagePath = path.join(publicDir, `${config.name}.png`);
      const imageBuffer = Buffer.from(data.image, 'base64');
      fs.writeFileSync(imagePath, imageBuffer);

      console.log(`   ✓ Uloženo: public/images/${config.name}.png`);
      console.log(`   Použití: ${config.usage}`);
      return true;
    } else {
      console.log(`   ✗ Odpověď neobsahuje obrázek:`, JSON.stringify(data).substring(0, 200));
      return false;
    }
  } catch (error) {
    console.error(`   ✗ Chyba: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log("═══════════════════════════════════════════════════");
  console.log("  Carp Club ČR - Generátor obrázků");
  console.log("  NVIDIA Stable Diffusion 3 Medium");
  console.log("═══════════════════════════════════════════════════");

  let successful = 0;

  for (let i = 0; i < imageConfigs.length; i++) {
    const success = await generateImage(imageConfigs[i], i);
    if (success) successful++;

    // Pauza mezi requesty (rate limiting)
    if (i < imageConfigs.length - 1) {
      console.log("   Čekám 2s před dalším požadavkem...");
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log("\n═══════════════════════════════════════════════════");
  console.log(`  Hotovo! Vygenerováno ${successful}/${imageConfigs.length} obrázků`);
  console.log("═══════════════════════════════════════════════════");

  console.log("\n📍 Navrhovaná umístění obrázků:");
  imageConfigs.forEach((config, i) => {
    console.log(`\n${i + 1}. ${config.description}`);
    console.log(`   Soubor: /public/images/${config.name}.png`);
    console.log(`   Použít v: ${config.usage}`);
  });
}

main().catch(console.error);
