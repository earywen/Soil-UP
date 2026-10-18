# Architecture modulaire des connecteurs de données ouvertes

Les services et formats des APIs de l'État (Géorisques, Géoplateforme IGN, BRGM, INPN) évoluent indépendamment et peuvent connaître des interruptions temporaires. Nous standardisons l'accès aux données via une classe abstraite `BaseConnector` dont chaque source hérite, encapsulant sa propre logique d'appel, de re-projection, de filtrage spatial et de gestion des erreurs. Cette isolation garantit la maintenabilité et permet d'ajouter de nouvelles sources documentaires sans modifier le moteur d'orchestration.
