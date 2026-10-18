import { chromium } from "playwright";

async function run() {
  console.log("Démarrage du test browser E2E sur http://192.168.1.75:3001...");
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

  page.on("requestfailed", (req) => {
    console.warn(`[Network Failed] ${req.url()} (${req.failure()?.errorText})`);
  });

  try {
    await page.goto("http://192.168.1.75:3001", { waitUntil: "networkidle", timeout: 15000 });
    console.log("Page 192.168.1.75:3001 chargée avec succès.");

    // Attendre que la carte Leaflet soit présente
    await page.waitForSelector(".leaflet-container", { timeout: 10000 });
    console.log("Carte Leaflet trouvée dans le DOM !");

    // Étape 1 : Taper l'adresse utilisateur dans le champ de recherche BAN
    const searchInput = page.locator('input[placeholder*="Ex: 14 rue de l\'Industrie"]');
    await searchInput.fill("6 Rue Stanislas Girardin 76000 Rouen");
    console.log("Saisie de l'adresse effectuée...");

    // Attendre l'apparition des suggestions d'adresses
    await page.waitForSelector("ul li", { timeout: 5000 });
    console.log("Suggestions BAN affichées !");

    // Cliquer sur la première suggestion
    await page.locator("ul li").first().click();
    console.log("Adresse sélectionnée.");

    // Attendre le chargement des parcelles cadastrales IGN
    console.log("Attente de la récupération des parcelles cadastrales IGN...");
    await page.waitForSelector("text=Section", { timeout: 10000 });
    console.log("Parcelles cadastrales chargées avec succès !");

    // Étape 2 : Cliquer sur "Valider l'emprise"
    const unionButton = page.locator('button:has-text("Valider l\'emprise")');
    await unionButton.click();
    console.log("Calcul de l'emprise cliqué...");

    // Attendre l'affichage de l'emprise calculée
    await page.waitForSelector("text=Emprise unifiée calculée", { timeout: 10000 });
    console.log("Emprise unifiée calculée affichée !");

    // Sélectionner le buffer 500 m comme l'utilisateur
    const buffer500Btn = page.locator('button:has-text("500 m")');
    await buffer500Btn.click();
    console.log("Buffer 500m sélectionné.");

    // Étape 3 : Cliquer sur "Créer le dossier & Interroger Géorisques"
    const collectButton = page.locator('button:has-text("Interroger Géorisques")');
    await collectButton.click();
    console.log("Collecte Géorisques lancée...");

    // Attendre la fin de la collecte (synthèse affichée)
    await page.waitForSelector("text=CASIAS / BASIAS", { timeout: 15000 });
    console.log("Collecte Géorisques terminée avec succès !");

    // Attendre que le bouton de téléchargement Word soit visible
    await page.waitForSelector('text=Télécharger le rapport Word', { timeout: 5000 });
    console.log("Bouton de téléchargement du rapport Word présent !");

    await page.screenshot({ path: "screenshot-complete.png" });
    console.log("Capture d'écran finale enregistrée : screenshot-complete.png");

    console.log("\n=== TEST E2E BROWSER TOTALEMENT RÉUSSI ! ===");
  } catch (err) {
    console.error("Échec du test :", err);
    await page.screenshot({ path: "screenshot-error.png" });
  } finally {
    await browser.close();
  }
}

run();
