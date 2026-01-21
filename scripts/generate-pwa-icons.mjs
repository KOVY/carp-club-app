/**
 * Generátor PWA ikon pro Carp Club ČR
 * Používá NVIDIA Stable Diffusion 3 API
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, '..', 'public');

const invokeUrl = "https://ai.api.nvidia.com/v1/genai/stabilityai/stable-diffusion-3-medium";

const headers = {
  "Authorization": `Bearer ${process.env.NVIDIA_API_KEY}`,
  "Accept": "application/json",
  "Content-Type": "application/json"
};

// PWA ikona - výrazný kapr v kruhovém designu
const iconPrompt = "Minimalist app icon design, golden carp fish silhouette jumping, dark blue circular background, modern flat design, simple geometric shapes, mobile app icon style, clean edges, professional logo design, centered composition, no text, gradient blue to teal background, glossy finish";

const negativePrompt = "text, letters, words, watermark, blurry, complex background, realistic photo, multiple fish, busy design, low contrast";

async function generateIcon() {
  console.log("═══════════════════════════════════════════════════");
  console.log("  Carp Club ČR - Generátor PWA ikon");
  console.log("═══════════════════════════════════════════════════");

  console.log("\nGeneruji PWA ikonu...");
  console.log(`Prompt: ${iconPrompt.substring(0, 70)}...`);

  const payload = {
    prompt: iconPrompt,
    cfg_scale: 8,
    aspect_ratio: "1:1",
    seed: 42,  // Fixed seed pro konzistenci
    steps: 50,
    negative_prompt: negativePrompt
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
      // Uložit jako 512px verzi (API vrací 1024x1024, bude se škálovat v browseru)
      const icon512Path = path.join(publicDir, 'icon-512.png');
      const icon192Path = path.join(publicDir, 'icon-192.png');

      const imageBuffer = Buffer.from(data.image, 'base64');

      // Uložíme stejný obrázek pro obě velikosti
      // Browser/PWA si je sám přeškáluje podle potřeby
      fs.writeFileSync(icon512Path, imageBuffer);
      fs.writeFileSync(icon192Path, imageBuffer);

      console.log("\n✓ Ikony uloženy:");
      console.log(`  - public/icon-512.png (${Math.round(imageBuffer.length / 1024)} KB)`);
      console.log(`  - public/icon-192.png (${Math.round(imageBuffer.length / 1024)} KB)`);

      return true;
    } else {
      console.log("✗ Odpověď neobsahuje obrázek");
      return false;
    }
  } catch (error) {
    console.error(`✗ Chyba: ${error.message}`);
    return false;
  }
}

generateIcon().then(success => {
  console.log("\n═══════════════════════════════════════════════════");
  if (success) {
    console.log("  PWA ikony připraveny!");
    console.log("  Nezapomeň aktualizovat manifest.json");
  } else {
    console.log("  Generování selhalo");
  }
  console.log("═══════════════════════════════════════════════════");
});
