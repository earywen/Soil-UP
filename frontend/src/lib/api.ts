import {
  AddressSearchResponse,
  CadastralParcelCollection,
  CadastralParcelFeature,
  SiteEmpriseResult,
  StudyCreatePayload,
  StudyRecord,
  BdlisaResult,
} from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

export async function searchAddress(query: string, limit: number = 5): Promise<AddressSearchResponse> {
  const params = new URLSearchParams({ q: query, limit: limit.toString() });
  const response = await fetch(`${API_BASE_URL}/api/address/search?${params}`);
  if (!response.ok) {
    throw new Error(`Erreur lors de la recherche d'adresse : ${response.statusText}`);
  }
  return response.json();
}

export async function fetchCadastreParcels(lat: number, lon: number): Promise<CadastralParcelCollection> {
  const params = new URLSearchParams({ lat: lat.toString(), lon: lon.toString() });
  const response = await fetch(`${API_BASE_URL}/api/cadastre/parcels?${params}`);
  if (!response.ok) {
    throw new Error(`Erreur lors de la récupération du cadastre : ${response.statusText}`);
  }
  return response.json();
}

export async function unionParcels(parcels: CadastralParcelFeature[]): Promise<SiteEmpriseResult> {
  const response = await fetch(`${API_BASE_URL}/api/cadastre/parcels/union`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ features: parcels }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Erreur lors de l'union des parcelles : ${response.statusText}`);
  }
  return response.json();
}

export async function validateCustomEmprise(geometry: Record<string, unknown>): Promise<SiteEmpriseResult> {
  const response = await fetch(`${API_BASE_URL}/api/cadastre/custom-emprise`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ geometry }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Erreur lors de la validation du polygone libre : ${response.statusText}`);
  }
  return response.json();
}

export async function createStudy(payload: StudyCreatePayload): Promise<StudyRecord> {
  const response = await fetch(`${API_BASE_URL}/api/studies`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Erreur lors de la création de l'étude : ${response.statusText}`);
  }
  return response.json();
}

export async function getStudy(studyId: number): Promise<StudyRecord> {
  const response = await fetch(`${API_BASE_URL}/api/studies/${studyId}`);
  if (!response.ok) {
    throw new Error(`Erreur lors de la récupération de l'étude : ${response.statusText}`);
  }
  return response.json();
}

export async function triggerCollect(studyId: number): Promise<StudyRecord> {
  const response = await fetch(`${API_BASE_URL}/api/studies/${studyId}/collect`, {
    method: "POST",
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Échec de la collecte Géorisques : ${response.statusText}`);
  }
  return response.json();
}

export function getDocxExportUrl(studyId: number): string {
  return `${API_BASE_URL}/api/studies/${studyId}/export/docx`;
}

export async function fetchBdlisaEntity(lat: number, lon: number): Promise<BdlisaResult> {
  const params = new URLSearchParams({ lat: lat.toString(), lon: lon.toString() });
  const response = await fetch(`${API_BASE_URL}/api/cadastre/bdlisa?${params}`);
  if (!response.ok) {
    throw new Error(`Erreur lors de la récupération BDLISA : ${response.statusText}`);
  }
  return response.json();
}
