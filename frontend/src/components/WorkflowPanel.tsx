"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  MapPin,
  Layers,
  ShieldAlert,
  FileDown,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  RefreshCw,
} from "lucide-react";
import {
  AddressResultItem,
  CadastralParcelFeature,
  SiteEmpriseResult,
  StudyRecord,
} from "@/types";
import {
  searchAddress,
  fetchCadastreParcels,
  unionParcels,
  createStudy,
  triggerCollect,
  getDocxExportUrl,
} from "@/lib/api";

interface WorkflowPanelProps {
  onAddressSelect: (item: AddressResultItem) => void;
  onParcelsLoaded: (parcels: CadastralParcelFeature[]) => void;
  selectedParcelIds: Set<string>;
  onToggleParcel: (parcel: CadastralParcelFeature) => void;
  parcels: CadastralParcelFeature[];
  empriseResult: SiteEmpriseResult | null;
  onEmpriseComputed: (result: SiteEmpriseResult | null) => void;
  study: StudyRecord | null;
  onStudyUpdated: (study: StudyRecord | null) => void;
  bufferMeters: number;
  onBufferChange: (buffer: number) => void;
}

export default function WorkflowPanel({
  onAddressSelect,
  onParcelsLoaded,
  selectedParcelIds,
  onToggleParcel,
  parcels,
  empriseResult,
  onEmpriseComputed,
  study,
  onStudyUpdated,
  bufferMeters,
  onBufferChange,
}: WorkflowPanelProps) {
  // Search state
  const [addressQuery, setAddressQuery] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<AddressResultItem[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<AddressResultItem | null>(null);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);

  // Cadastre state
  const [isLoadingCadastre, setIsLoadingCadastre] = useState(false);
  const [isUnitingParcels, setIsUnitingParcels] = useState(false);

  // Study & Collect state
  const [studyTitle, setStudyTitle] = useState("");
  const [isCreatingStudy, setIsCreatingStudy] = useState(false);
  const [isCollecting, setIsCollecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAddressChange = (val: string) => {
    setAddressQuery(val);
    if (val.trim().length < 3) {
      setAddressSuggestions([]);
    }
  };

  // Debounced address search
  useEffect(() => {
    if (addressQuery.trim().length < 3) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingAddress(true);
      setErrorMsg(null);
      try {
        const res = await searchAddress(addressQuery, 5);
        setAddressSuggestions(res.results || []);
      } catch {
        setErrorMsg("Impossible de joindre la Base Adresse Nationale.");
      } finally {
        setIsSearchingAddress(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [addressQuery]);

  // Handle address selection
  const handleSelectAddress = async (item: AddressResultItem) => {
    setSelectedAddress(item);
    setAddressSuggestions([]);
    setAddressQuery(item.label);
    if (!studyTitle) {
      setStudyTitle(`Diagnostic - ${item.city || item.label}`);
    }
    onAddressSelect(item);

    // Fetch cadastre parcels around coordinates
    setIsLoadingCadastre(true);
    setErrorMsg(null);
    try {
      const cadastreData = await fetchCadastreParcels(item.latitude, item.longitude);
      onParcelsLoaded(cadastreData.features || []);
    } catch {
      setErrorMsg("Erreur lors de la récupération du cadastre IGN.");
    } finally {
      setIsLoadingCadastre(false);
    }
  };

  // Compute union of selected parcels
  const handleComputeUnion = async () => {
    const selectedList = parcels.filter((p) => selectedParcelIds.has(p.properties.id));
    if (selectedList.length === 0) return;

    setIsUnitingParcels(true);
    setErrorMsg(null);
    try {
      const result = await unionParcels(selectedList);
      onEmpriseComputed(result);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors du calcul de l'emprise.";
      setErrorMsg(message);
    } finally {
      setIsUnitingParcels(false);
    }
  };

  // Create study and launch Georisques collection
  const handleCreateAndCollect = async () => {
    if (!empriseResult || !selectedAddress) return;

    setIsCreatingStudy(true);
    setErrorMsg(null);
    try {
      const selectedList = parcels.filter((p) => selectedParcelIds.has(p.properties.id));
      const created = await createStudy({
        name: studyTitle || `Étude SSP - ${selectedAddress.label}`,
        address: selectedAddress.label,
        emprise: empriseResult.geometry,
        buffer_meters: bufferMeters,
        parcels: selectedList,
      });

      onStudyUpdated(created);
      setIsCreatingStudy(false);

      // Immediately launch async Georisques collection
      setIsCollecting(true);
      const collected = await triggerCollect(created.id);
      onStudyUpdated(collected);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Échec de la collecte Géorisques.";
      setErrorMsg(message);
    } finally {
      setIsCreatingStudy(false);
      setIsCollecting(false);
    }
  };

  // Re-run collection on existing study
  const handleReCollect = async () => {
    if (!study) return;
    setIsCollecting(true);
    setErrorMsg(null);
    try {
      const updated = await triggerCollect(study.id);
      onStudyUpdated(updated);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur lors du rafraîchissement de la collecte.";
      setErrorMsg(message);
    } finally {
      setIsCollecting(false);
    }
  };

  // Reset workflow
  const handleReset = () => {
    setSelectedAddress(null);
    setAddressQuery("");
    setAddressSuggestions([]);
    onParcelsLoaded([]);
    onEmpriseComputed(null);
    onStudyUpdated(null);
    setErrorMsg(null);
  };

  const casiasCount = study?.collected_data?.casias?.length ?? 0;
  const icpeCount = study?.collected_data?.icpe?.length ?? 0;

  return (
    <aside className="w-full h-full flex flex-col bg-slate-50 border-r border-slate-200 shadow-sm z-10 overflow-hidden">
      {/* App Header */}
      <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded bg-[#1b4332] border border-[#2d6a4f] flex items-center justify-center font-bold text-white text-xs">
            S&apos;UP
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-white leading-none">
              Soil&apos;UP
            </h1>
            <span className="text-[11px] text-slate-400 font-medium">
              Diagnostic SSP — Norme NF X 31-620
            </span>
          </div>
        </div>

        {selectedAddress && (
          <button
            onClick={handleReset}
            title="Réinitialiser le dossier"
            className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Error alert */}
      {errorMsg && (
        <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded text-xs text-red-800 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Workflow content area */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
        {/* Step 1: Address search */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              1. Localisation du site
            </span>
            {selectedAddress && (
              <span className="text-xs text-[#1b4332] font-semibold flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Géocodé
              </span>
            )}
          </div>

          <div className="relative">
            <div className="relative flex items-center">
              <Search className="absolute left-3 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Ex: 14 rue de l'Industrie, Rouen..."
                value={addressQuery}
                onChange={(e) => handleAddressChange(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1b4332] focus:border-transparent transition-shadow text-slate-900"
              />
              {isSearchingAddress && (
                <Loader2 className="absolute right-3 h-4 w-4 animate-spin text-slate-400" />
              )}
            </div>

            {/* Address Autocomplete Dropdown */}
            {addressSuggestions.length > 0 && (
              <ul className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg z-20 max-h-56 overflow-y-auto divide-y divide-slate-100">
                {addressSuggestions.map((item, idx) => (
                  <li
                    key={`${item.label}-${idx}`}
                    onClick={() => handleSelectAddress(item)}
                    className="p-2.5 hover:bg-slate-50 cursor-pointer text-xs text-slate-800 flex items-start gap-2 transition-colors"
                  >
                    <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold">{item.label}</div>
                      <div className="text-slate-500 text-[11px]">
                        {item.context || item.city}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Step 2: Cadastral Parcels Selection */}
        {selectedAddress && (
          <section className="space-y-3 pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                2. Emprise foncière cadastrale
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {parcels.length} parcelle(s)
              </span>
            </div>

            {isLoadingCadastre ? (
              <div className="flex items-center gap-2 text-xs text-slate-500 p-3 bg-white border border-slate-200 rounded-md">
                <Loader2 className="h-4 w-4 animate-spin text-[#1b4332]" />
                Interrogation du Cadastre IGN en cours...
              </div>
            ) : parcels.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-slate-600">
                  Sélectionnez les parcelles constitutives du site d&apos;étude sur la carte ou ci-dessous :
                </p>

                <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                  {parcels.map((parcel) => {
                    const isSelected = selectedParcelIds.has(parcel.properties.id);
                    return (
                      <div
                        key={parcel.properties.id}
                        onClick={() => onToggleParcel(parcel)}
                        className={`p-2 rounded border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                          isSelected
                            ? "bg-[#d8f3dc] border-[#2d6a4f] text-[#143323]"
                            : "bg-white border-slate-200 hover:border-slate-300 text-slate-800"
                        }`}
                      >
                        <div className="font-mono">
                          Section <b>{parcel.properties.section || "—"}</b> n°
                          <b>{parcel.properties.numero || "—"}</b>
                        </div>
                        <div className="text-slate-600 tabular-nums font-mono text-[11px]">
                          {parcel.properties.contenance
                            ? `${parcel.properties.contenance} m²`
                            : "n.d."}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <button
                  disabled={selectedParcelIds.size === 0 || isUnitingParcels}
                  onClick={handleComputeUnion}
                  className="w-full py-2 px-3 text-xs font-semibold rounded bg-[#1b4332] text-white hover:bg-[#2d6a4f] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  {isUnitingParcels ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Layers className="h-3.5 w-3.5" />
                  )}
                  Valider l&apos;emprise ({selectedParcelIds.size} sélectionnée(s))
                </button>
              </div>
            ) : (
              <div className="p-3 bg-slate-100 rounded text-xs text-slate-600">
                Aucune parcelle cadastrale trouvée pour ces coordonnées.
              </div>
            )}

            {/* Validated Emprise Info */}
            {empriseResult && (
              <div className="p-3 bg-white border border-[#2d6a4f] rounded-md shadow-xs space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#143323]">Emprise unifiée calculée</span>
                  <span className="text-[11px] font-mono text-slate-500">Lambert 93</span>
                </div>
                <div className="text-sm font-bold text-slate-900 tabular-nums">
                  {Math.round(empriseResult.area_m2).toLocaleString("fr-FR")} m²
                </div>
                <div className="text-[11px] text-slate-600">
                  Union géométrique exacte de {empriseResult.parcel_count} parcelle(s).
                </div>
              </div>
            )}
          </section>
        )}

        {/* Step 3: Investigation Buffers & Data Collection */}
        {empriseResult && (
          <section className="space-y-3 pt-3 border-t border-slate-200">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              3. Collecte documentaire Géorisques
            </span>

            <div className="space-y-2">
              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  Intitulé du dossier d&apos;étude
                </label>
                <input
                  type="text"
                  value={studyTitle}
                  onChange={(e) => setStudyTitle(e.target.value)}
                  className="w-full p-2 text-xs bg-white border border-slate-300 rounded focus:ring-1 focus:ring-[#1b4332] text-slate-900"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-700 block mb-1">
                  Périmètre d&apos;investigation métrique : <b>{bufferMeters} m</b>
                </label>
                <div className="flex gap-2">
                  {[50, 100, 200, 500].map((dist) => (
                    <button
                      key={dist}
                      type="button"
                      onClick={() => onBufferChange(dist)}
                      className={`flex-1 py-1.5 text-xs font-mono rounded border transition-colors cursor-pointer ${
                        bufferMeters === dist
                          ? "bg-blue-50 border-blue-600 text-blue-900 font-bold"
                          : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                      }`}
                    >
                      {dist} m
                    </button>
                  ))}
                </div>
              </div>

              {!study ? (
                <button
                  disabled={isCreatingStudy || isCollecting}
                  onClick={handleCreateAndCollect}
                  className="w-full py-2.5 px-4 text-xs font-semibold rounded bg-[#1b4332] text-white hover:bg-[#2d6a4f] disabled:opacity-50 flex items-center justify-center gap-2 transition-colors mt-2 cursor-pointer"
                >
                  {isCreatingStudy || isCollecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldAlert className="h-4 w-4" />
                  )}
                  Créer le dossier &amp; Interroger Géorisques
                </button>
              ) : (
                <button
                  disabled={isCollecting}
                  onClick={handleReCollect}
                  className="w-full py-2 px-3 text-xs font-medium rounded bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  {isCollecting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  Actualiser la collecte Géorisques
                </button>
              )}
            </div>
          </section>
        )}

        {/* Step 4: Environmental Synthesis & Word Export */}
        {study && study.status !== "draft" && (
          <section className="space-y-3 pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                4. Synthèse &amp; Rapport d&apos;étude
              </span>
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                  study.status === "completed"
                    ? "bg-green-100 text-green-800"
                    : study.status === "partial_error"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                {study.status === "completed"
                  ? "Collecte complète"
                  : study.status === "partial_error"
                  ? "Collecte partielle"
                  : study.status}
              </span>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-white border border-amber-200 rounded-md">
                <div className="text-[11px] text-amber-800 font-medium">CASIAS / BASIAS</div>
                <div className="text-lg font-bold text-slate-900 tabular-nums">
                  {casiasCount} site(s)
                </div>
                <div className="text-[10px] text-slate-500">Activités historiques</div>
              </div>

              <div className="p-3 bg-white border border-red-200 rounded-md">
                <div className="text-[11px] text-red-800 font-medium">Installations ICPE</div>
                <div className="text-lg font-bold text-slate-900 tabular-nums">
                  {icpeCount} site(s)
                </div>
                <div className="text-[10px] text-slate-500">Régimes enregistrés</div>
              </div>
            </div>

            {/* Export DOCX Button */}
            <a
              href={getDocxExportUrl(study.id)}
              download
              className="w-full py-2.5 px-4 text-xs font-semibold rounded bg-[#1b4332] text-white hover:bg-[#2d6a4f] flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <FileDown className="h-4 w-4" />
              Télécharger le rapport Word (.docx)
            </a>
          </section>
        )}
      </div>
    </aside>
  );
}
