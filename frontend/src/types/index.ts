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

export interface CollectedData {
  casias?: CasiasItem[];
  icpe?: IcpeItem[];
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
