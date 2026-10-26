export interface AddressResultItem {
  label: string;
  name?: string;
  postcode: string;
  citycode: string;
  city: string;
  context?: string;
  latitude: number;
  longitude: number;
  score: number;
}

export interface AddressSearchResponse {
  results: AddressResultItem[];
}

export interface GeoJsonObject {
  type: string;
  coordinates: unknown;
  [key: string]: unknown;
}

export interface CadastralParcelProperties {
  idu?: string;
  section?: string;
  numero?: string;
  contenance?: number; // surface déclarée en m²
  nom_com?: string;
  code_insee?: string;
  [key: string]: unknown;
}

export interface CadastralParcelFeature {
  type: "Feature";
  id?: string;
  geometry: GeoJsonObject;
  properties: CadastralParcelProperties;
}

export interface CadastralParcelCollection {
  type: "FeatureCollection";
  features: CadastralParcelFeature[];
}

export interface SiteEmpriseProperties {
  parcel_ids?: string[];
  parcels_count?: number;
  contenance_cadastrale_totale?: number;
  calculated_area_m2?: number;
  [key: string]: unknown;
}

export interface SiteEmpriseResult {
  type: "Feature";
  geometry: GeoJsonObject;
  properties: SiteEmpriseProperties;
}

export interface CasiasItem {
  identifiant?: string;
  nom_usuel?: string;
  activite_principale?: string;
  statut?: string;
  distance_emprise_m?: number;
  geometry?: {
    type: string;
    coordinates: [number, number]; // [lon, lat]
  };
  [key: string]: unknown;
}

export interface IcpeItem {
  numero_s3ic?: string;
  nom_etablissement?: string;
  statut_activite?: string;
  regime?: string;
  distance_emprise_m?: number;
  geometry?: {
    type: string;
    coordinates: [number, number]; // [lon, lat]
  };
  [key: string]: unknown;
}

export interface AltimetrieResult {
  z_mean?: number;
  z_min?: number;
  z_max?: number;
  denivele?: number;
  unit?: string;
  error?: string;
}

export interface BssBoreholeItem {
  reference: string;
  bss_id?: string;
  nom_commune?: string;
  nature?: string;
  prof_atteinte?: number;
  zsol?: number;
  prof_eau_sol?: number;
  date_eau_sol?: string;
  cote_eau_calculee?: number;
  coupe_disponible: boolean;
  nb_scans_coupe?: number;
  url_infoterre: string;
  latitude: number;
  longitude: number;
  distance_meters: number;
}

export interface GroundwaterSupportPoint {
  source: string;
  identifiant: string;
  nom?: string;
  distance_meters: number;
  prof_eau_sol?: number;
  cote_eau_ngf?: number;
  date_mesure?: string;
  altitude_sol_ouvrage?: number;
}

export interface GroundwaterLevelEstimation {
  profondeur_estimee_m?: number;
  profondeur_min_m?: number;
  profondeur_max_m?: number;
  cote_nappe_estimee_ngf?: number;
  altitude_site_ngf?: number;
  indice_confiance: "Élevé" | "Moyen" | "Faible" | "Non déterminé";
  methode_calcul: string;
  nb_points_appui: number;
  points_appui: GroundwaterSupportPoint[];
}

export interface PiezometreItem {
  code_bss: string;
  bss_id?: string;
  nom_commune?: string;
  altitude_station?: number;
  profondeur_investigation?: number;
  latitude: number;
  longitude: number;
  distance_meters: number;
  date_mesure?: string;
  profondeur_nappe?: number;
  cote_ngf?: number;
  qualification?: string;
}

export interface ZonageNaturelItem {
  id_mnhn: string;
  nom_site: string;
  type_zonage: string;
  distance_meters: number;
  statut_recoupement: string;
  url_fiche: string;
}

export interface BdlisaEntity {
  code_eh: string;
  libelle_eh: string;
  ordre_abs?: number;
  niveau_eh?: number;
  nature_code?: string;
  nature_libelle: string;
  milieu_code?: string;
  milieu_libelle: string;
  etat_code?: string;
  etat_libelle: string;
  est_aquifere: boolean;
  est_affleurant: boolean;
}

export interface BdlisaKarst {
  code_zk: string;
  libelle_zk: string;
  situation: string;
}

export interface BdlisaResult {
  aquifere_superficiel?: BdlisaEntity | null;
  formation_affleurante?: BdlisaEntity | null;
  formations: BdlisaEntity[];
  karst?: BdlisaKarst | null;
  nb_formations: number;
  source: string;
  error?: string | null;
}

export interface CollectedData {
  casias?: CasiasItem[];
  icpe?: IcpeItem[];
  altimetrie?: AltimetrieResult;
  bss?: BssBoreholeItem[];
  piezometrie?: PiezometreItem[];
  groundwater_level?: GroundwaterLevelEstimation;
  zonages_naturels?: ZonageNaturelItem[];
  bdlisa?: BdlisaResult | null;
  errors?: Record<string, string>;
  error?: string;
}

export interface StudyRecord {
  id: number;
  name: string;
  address: string;
  emprise: GeoJsonObject;
  buffer_meters: number;
  status: "draft" | "in_progress" | "completed" | "partial_error" | "failed";
  parcels: CadastralParcelFeature[];
  collected_data: CollectedData;
  created_at: string;
  updated_at: string;
}

export interface StudyCreatePayload {
  name: string;
  address: string;
  emprise: GeoJsonObject;
  buffer_meters: number;
  parcels?: CadastralParcelFeature[];
}
