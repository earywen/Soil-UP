# Pipeline d'agrégation asynchrone et résilient multi-sources

L'interrogation simultanée d'une dizaine d'APIs publiques de l'État (Géorisques, Géoportail/IGN, BRGM, INPN, BAN) entraîne une latence cumulée significative et des risques de pannes temporaires externes. Nous choisissons une architecture d'orchestration asynchrone exécutant les collecteurs de données en parallèle, avec notification d'avancement en temps réel (SSE / WebSocket) et tolérance aux pannes partielles afin de ne jamais bloquer la génération du rapport si une source externe est indisponible.
