# Persistance des dossiers d'études avec géométries GeoJSON

Les diagnostics environnementaux doivent être conservés, révisables et exportables à tout moment. Nous persistons chaque dossier d'étude avec ses métadonnées, son emprise au format standard GeoJSON, les données brutes collectées lors de la requête et l'historique des exports. En développement et usage local, SQLite est utilisé pour sa simplicité et portabilité sans dépendance lourde, avec un schéma relationnel propre permettant une migration transparente vers PostgreSQL / PostGIS si des besoins multi-utilisateurs l'exigent.
