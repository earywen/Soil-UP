import { chromium } from "playwright";

async function run() {
  console.log("Démarrage du test browser E2E Cadastre & Tracé Libre sur http://192.168.1.75:3001...");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "/usr/bin/google-chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  page.on("console", (msg) => {
    console.log(`[Console ${msg.type()}]`, msg.text());
  });

  page.on("pageerror", (err) => {
    console.error("[Uncaught Page Error]", err);
  });

  try {
    await page.goto("http://192.168.1.75:3001", { waitUntil: "networkidle", timeout: 15000 });
    console.log("Page chargée avec succès.");

    // Attendre la carte Leaflet
    const mapContainer = await page.waitForSelector(".leaflet-container", { timeout: 10000 });
    console.log("Carte Leaflet trouvée !");

    // Vérifier la checkbox de surcouche Cadastre IGN
    const cadastreCheckbox = page.locator('label:has-text("Surcouche Cadastre (IGN)") input[type="checkbox"]');
    await cadastreCheckbox.waitFor({ state: "visible", timeout: 5000 });
    console.log("Checkbox Surcouche Cadastre (IGN) détectée.");

    // Cliquer pour désactiver puis réactiver le Cadastre
    await cadastreCheckbox.uncheck();
    console.log("Surcouche Cadastre décochée.");
    await page.waitForTimeout(500);
    await cadastreCheckbox.check();
    console.log("Surcouche Cadastre recochée.");

    // TEST 1 : Cliquer sur la carte directement pour récupérer la parcelle cadastrale
    console.log("\n--- TEST 1 : Clic direct sur la carte pour charger la parcelle cadastrale ---");
    const mapBox = await mapContainer.boundingBox();
    if (mapBox) {
      // Clic au centre de la carte (coordonnées par défaut de Paris / Rouen)
      await page.mouse.click(mapBox.x + mapBox.width / 2, mapBox.y + mapBox.height / 2);
      console.log("Clic effectué sur la carte à (%d, %d)", mapBox.x + mapBox.width / 2, mapBox.y + mapBox.height / 2);
    }

    // Attendre l'apparition de la section cadastrale
    await page.waitForSelector("text=Section", { timeout: 15000 });
    console.log("Parcelle cadastrale chargée via clic carte !");

    // TEST 2 : Tracé libre d'un polygone personnalisé
    console.log("\n--- TEST 2 : Mode tracé libre d'un polygone ---");
    // Cliquer sur le bouton "Tracer un polygone" sur la carte ou dans le workflow
    const drawBtn = page.locator('button:has-text("Tracer un polygone")').first();
    await drawBtn.waitFor({ state: "visible", timeout: 5000 });
    await drawBtn.click();
    console.log("Bouton 'Tracer un polygone' cliqué !");

    // Vérifier l'apparition de la bannière d'information
    await page.waitForSelector("text=Mode Tracé libre", { timeout: 5000 });
    console.log("Bannière de tracé libre affichée.");

    // Poser 4 sommets sur la carte
    if (mapBox) {
      const centerX = mapBox.x + mapBox.width / 2;
      const centerY = mapBox.y + mapBox.height / 2;

      console.log("Tracé de 4 points polygonaux...");
      await page.mouse.click(centerX - 120, centerY - 80);
      await page.waitForTimeout(300);
      await page.mouse.click(centerX + 80, centerY - 80);
      await page.waitForTimeout(300);
      await page.mouse.click(centerX + 100, centerY + 80);
      await page.waitForTimeout(300);
      await page.mouse.click(centerX - 100, centerY + 100);
      await page.waitForTimeout(300);
    }

    // Cliquer sur le bouton "Fermer le polygone" dans la bannière flottante
    const finishBtn = page.locator('button:has-text("Fermer le polygone")');
    await finishBtn.waitFor({ state: "visible", timeout: 5000 });
    await finishBtn.click();
    console.log("Bouton 'Fermer le polygone' cliqué.");

    // Attendre la validation de l'emprise personnalisée par le backend
    await page.waitForSelector("text=Emprise libre validée", { timeout: 10000 });
    console.log("Emprise libre validée avec succès par le backend FastAPI !");

    // Vérifier l'affichage de la surface en m²
    const surfaceText = await page.locator("text=/m²/").first().innerText();
    console.log("Surface calculée affichée :", surfaceText);

    // Déclencher la collecte documentaire sur l'emprise libre
    console.log("\n--- TEST 3 : Lancement de l'étude sur l'emprise libre ---");
    const collectButton = page.locator('button:has-text("Interroger les 5 sources")');
    await collectButton.click();
    console.log("Collecte multi-sources lancée sur l'emprise libre...");

    await page.waitForSelector("text=Synthèse Documentaire Complète", { timeout: 30000 });
    console.log("Synthèse multi-sources affichée pour l'emprise libre !");

    // Prendre un screenshot
    await page.screenshot({ path: "screenshot-drawing-cadastre.png" });
    console.log("Capture d'écran enregistrée dans screenshot-drawing-cadastre.png");

    console.log("\n=== TEST E2E CADASTRE & POLYGONE LIBRE RÉUSSI AVEC SUCCÈS ! ===");
  } catch (err) {
    console.error("Échec du test :", err);
    await page.screenshot({ path: "screenshot-drawing-error.png" });
    process.exit(1);
  } finally {
    await browser.close();
  }
}

run();
