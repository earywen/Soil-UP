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

export interface CadastralParcelFeature {
  type: "Feature";
  geometry: GeoJsonObject;
  properties: {
    id: string;
    commune?: string;
    section?: string;
    numero?: string;
    contenance?: number; // surface déclarée en m²
    [key: string]: unknown;
  };
}

export interface CadastralParcelCollection {
  type: "FeatureCollection";
  features: CadastralParcelFeature[];
}

export interface SiteEmpriseResult {
  geometry: GeoJsonObject;
  area_m2: number;
  parcel_count: number;
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
