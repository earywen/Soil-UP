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
  PenTool,
  Droplets,
  ChevronDown,
  ChevronUp,
  FileText,
  ExternalLink,
  Mountain,
  Trees,
  Factory,
  ChevronsUpDown,
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
  isDrawingMode?: boolean;
  onToggleDrawingMode?: (active: boolean) => void;
  externalSelectedAddress?: AddressResultItem | null;
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
  isDrawingMode = false,
  onToggleDrawingMode,
  externalSelectedAddress,
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
  const [showGwDetails, setShowGwDetails] = useState(false);
  const [showBdlisaPile, setShowBdlisaPile] = useState(false);
  const [showLithoCoupes, setShowLithoCoupes] = useState(false);

  // Accordion toggles for collect sections
  type SectionKey = "nappe" | "litho" | "bdlisa" | "topo" | "inpn" | "industriel";
  const [expandedSections, setExpandedSections] = useState<Record<SectionKey, boolean>>({
    nappe: true,
    litho: true,
    bdlisa: false,
    topo: false,
    inpn: false,
    industriel: false,
  });

  const toggleSection = (key: SectionKey) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const allExpanded = Object.values(expandedSections).every(Boolean);

  const toggleAllSections = (expand: boolean) => {
    setExpandedSections({
      nappe: expand,
      litho: expand,
      bdlisa: expand,
      topo: expand,
      inpn: expand,
      industriel: expand,
    });
  };

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

  // Sync with external selected address (from map click)
  useEffect(() => {
    if (externalSelectedAddress) {
      setSelectedAddress(externalSelectedAddress);
      setAddressQuery(externalSelectedAddress.label);
      if (!studyTitle) {
        setStudyTitle(`Diagnostic - ${externalSelectedAddress.city || externalSelectedAddress.label}`);
      }
    }
  }, [externalSelectedAddress]);

  const getParcelKey = (p: CadastralParcelFeature) =>
    p.properties.idu || p.id || `${p.properties.section}-${p.properties.numero}`;

  // Compute union of selected parcels
  const handleComputeUnion = async () => {
    const selectedList = parcels.filter((p) => selectedParcelIds.has(getParcelKey(p)));
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

  // Create study and launch multi-source collection
  const handleCreateAndCollect = async () => {
    if (!empriseResult || !selectedAddress) return;

    setIsCreatingStudy(true);
    setErrorMsg(null);
    try {
      const isCustom = Boolean(empriseResult.properties?.custom_drawing);
      const selectedList = isCustom
        ? []
        : parcels.filter((p) => selectedParcelIds.has(getParcelKey(p)));

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
  const bssCount = study?.collected_data?.bss?.length ?? 0;
  const bssCoupesCount = study?.collected_data?.bss?.filter((b) => b.coupe_disponible)?.length ?? 0;
  const bssWithWaterCount = study?.collected_data?.bss?.filter((b) => b.prof_eau_sol !== undefined && b.prof_eau_sol !== null)?.length ?? 0;
  const piezoCount = study?.collected_data?.piezometrie?.length ?? 0;
  const natureCount = study?.collected_data?.zonages_naturels?.length ?? 0;
  const alti = study?.collected_data?.altimetrie;
  const gw = study?.collected_data?.groundwater_level;
  const bdlisa = study?.collected_data?.bdlisa;
  const litho = study?.collected_data?.lithologie;

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
            <span className="text-xs text-slate-300 font-medium">
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
                className="w-full pl-9 pr-8 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1b4332] focus:border-transparent transition-shadow text-slate-900 placeholder:text-slate-500"
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

        {/* Step 2: Cadastral Parcels or Freehand Drawing Selection */}
        {(selectedAddress || empriseResult) && (
          <section className="space-y-3 pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                2. Définition de l&apos;emprise du site
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {empriseResult?.properties?.custom_drawing ? "Tracé libre" : `${parcels.length} parcelle(s)`}
              </span>
            </div>

            {/* Drawing mode toggle button */}
            <button
              type="button"
              onClick={() => onToggleDrawingMode && onToggleDrawingMode(!isDrawingMode)}
              className={`w-full py-2 px-3 rounded text-xs font-semibold border flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                isDrawingMode
                  ? "bg-amber-100 border-amber-400 text-amber-900 shadow-xs"
                  : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50 hover:border-slate-400"
              }`}
            >
              <PenTool className="h-3.5 w-3.5 text-[#1b4332]" />
              {isDrawingMode ? "Mode dessin actif — Cliquez sur la carte" : "Tracer un polygone libre sur la carte"}
            </button>

            {/* Custom Freehand Drawing Result */}
            {empriseResult?.properties?.custom_drawing ? (
              <div className="p-3 bg-white border border-[#2d6a4f] rounded-md shadow-xs space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#143323] flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Emprise libre validée
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">Lambert 93</span>
                </div>
                <div className="text-base font-bold text-slate-900 tabular-nums">
                  {Math.round(empriseResult.properties?.calculated_area_m2 || 0).toLocaleString("fr-FR")} m²
                </div>
                <div className="text-[11px] text-slate-600">
                  Polygone sur-mesure délimité par l&apos;ingénieur environnemental.
                </div>
                <button
                  type="button"
                  onClick={() => onToggleDrawingMode && onToggleDrawingMode(true)}
                  className="text-[11px] text-[#1b4332] hover:text-[#2d6a4f] font-semibold underline pt-1 cursor-pointer"
                >
                  Redessiner un polygone
                </button>
              </div>
            ) : (
              <>
                {isLoadingCadastre ? (
                  <div className="flex items-center gap-2 text-xs text-slate-500 p-3 bg-white border border-slate-200 rounded-md">
                    <Loader2 className="h-4 w-4 animate-spin text-[#1b4332]" />
                    Interrogation du Cadastre IGN en cours...
                  </div>
                ) : parcels.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-xs text-slate-600">
                      Sélectionnez les parcelles sur la carte ou dans la liste :
                    </p>

                    <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                      {parcels.map((parcel) => {
                        const parcelKey = parcel.properties.idu || parcel.id || `${parcel.properties.section}-${parcel.properties.numero}`;
                        const isSelected = selectedParcelIds.has(parcelKey);
                        return (
                          <div
                            key={parcelKey}
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
                    Cliquez directement sur une parcelle sur la carte pour l&apos;ajouter au dossier.
                  </div>
                )}

                {/* Validated Emprise Info */}
                {empriseResult && !empriseResult.properties?.custom_drawing && (
                  <div className="p-3 bg-white border border-[#2d6a4f] rounded-md shadow-xs space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#143323]">Emprise unifiée calculée</span>
                      <span className="text-[11px] font-mono text-slate-500">Lambert 93</span>
                    </div>
                    <div className="text-sm font-bold text-slate-900 tabular-nums">
                      {Math.round(empriseResult.properties?.calculated_area_m2 || 0).toLocaleString("fr-FR")} m²
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Union géométrique exacte de {empriseResult.properties?.parcels_count || empriseResult.properties?.parcel_ids?.length || 1} parcelle(s).
                    </div>
                  </div>
                )}
              </>
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
                  className="w-full py-2.5 px-4 text-xs font-semibold rounded bg-[#1b4332] text-white hover:bg-[#2d6a4f] disabled:opacity-50 flex items-center justify-center gap-2 transition-colors mt-2 cursor-pointer shadow-xs"
                >
                  {isCreatingStudy || isCollecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldAlert className="h-4 w-4" />
                  )}
                  Créer le dossier &amp; Interroger les 5 sources d&apos;État
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
                  Actualiser la collecte multi-sources
                </button>
              )}
            </div>
          </section>
        )}

        {/* Step 4: Environmental Synthesis & Word Export */}
        {study && study.status !== "draft" && (
          <section className="space-y-4 pt-3 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                4. Synthèse Documentaire Complète
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
                  ? "5/5 sources connectées"
                  : study.status === "partial_error"
                  ? "Collecte partielle"
                  : study.status}
              </span>
            </div>

            {/* Metrics cards (4 tiles) */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 bg-white border border-amber-200 rounded-md">
                <div className="text-[11px] text-amber-800 font-medium">CASIAS / BASIAS</div>
                <div className="text-base font-bold text-slate-900 tabular-nums">
                  {casiasCount} site(s)
                </div>
                <div className="text-[11px] text-slate-500">Activités industrielles</div>
              </div>

              <div className="p-2.5 bg-white border border-red-200 rounded-md">
                <div className="text-[11px] text-red-800 font-medium">Installations ICPE</div>
                <div className="text-base font-bold text-slate-900 tabular-nums">
                  {icpeCount} site(s)
                </div>
                <div className="text-[11px] text-slate-500">Régimes préfectoraux</div>
              </div>

              <div className="p-2.5 bg-white border border-emerald-200 rounded-md">
                <div className="text-[11px] text-emerald-800 font-medium">Forages BSS (BRGM)</div>
                <div className="text-base font-bold text-slate-900 tabular-nums">
                  {bssCount} ouvrage(s)
                </div>
                <div className="text-[11px] text-emerald-700 font-semibold">
                  {bssWithWaterCount > 0
                    ? `${bssCoupesCount} coupes • ${bssWithWaterCount} avec eau`
                    : `${bssCoupesCount} coupe(s) numérisée(s)`}
                </div>
              </div>

              <div className="p-2.5 bg-white border border-cyan-200 rounded-md">
                <div className="text-[11px] text-cyan-800 font-medium">Piézomètres ADES (Hub&apos;Eau)</div>
                <div className="text-base font-bold text-slate-900 tabular-nums">
                  {piezoCount > 0 ? `${piezoCount} station(s)` : "0 station"}
                </div>
                <div className="text-[11px] text-slate-500">
                  {piezoCount > 0 ? "Chronique piézométrique" : "Aucun piézo ADES à 500m"}
                </div>
              </div>
            </div>

            {/* Thematic Analyses Section Header with Global Toggle */}
            <div className="flex items-center justify-between pt-1 pb-0.5 border-t border-slate-200">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wide">
                <Layers className="h-3.5 w-3.5 text-[#1b4332]" />
                <span>Analyses thématiques détaillées</span>
              </div>
              <button
                type="button"
                onClick={() => toggleAllSections(!allExpanded)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-300 px-2 py-0.5 rounded shadow-2xs transition-colors cursor-pointer"
              >
                <ChevronsUpDown className="h-3 w-3 text-slate-600" />
                <span>{allExpanded ? "Tout replier" : "Tout déplier"}</span>
              </button>
            </div>

            {/* 1. Primary Hydrogeological Highlight: Groundwater Level at Study Site */}
            {gw && gw.profondeur_estimee_m !== undefined && gw.profondeur_estimee_m !== null && (
              <div className="bg-gradient-to-br from-cyan-50/70 via-white to-emerald-50/40 border-2 border-cyan-500/30 rounded-lg shadow-xs overflow-hidden transition-all">
                <button
                  type="button"
                  onClick={() => toggleSection("nappe")}
                  className="w-full p-3 flex items-center justify-between gap-2 text-left cursor-pointer hover:bg-cyan-50/40 transition-colors"
                  aria-expanded={expandedSections.nappe}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-7 w-7 rounded-md bg-cyan-100 flex items-center justify-center shrink-0 border border-cyan-200">
                      <Droplets className="h-4 w-4 text-cyan-700" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-cyan-950 uppercase tracking-wide">
                          Nappe au droit du site
                        </span>
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            gw.indice_confiance === "Élevé"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              : gw.indice_confiance === "Moyen"
                              ? "bg-amber-100 text-amber-800 border border-amber-300"
                              : "bg-slate-100 text-slate-700 border border-slate-300"
                          }`}
                        >
                          Confiance {gw.indice_confiance}
                        </span>
                      </div>
                      {!expandedSections.nappe && (
                        <div className="text-[11px] font-mono text-cyan-950 font-bold truncate mt-0.5">
                          ~ {gw.profondeur_estimee_m} m / sol
                          {gw.cote_nappe_estimee_ngf !== undefined && gw.cote_nappe_estimee_ngf !== null && (
                            <span className="text-slate-600 font-semibold ml-1.5 font-sans">
                              (cote {gw.cote_nappe_estimee_ngf} m NGF)
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-cyan-900">
                    {expandedSections.nappe ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </button>

                {expandedSections.nappe && (
                  <div className="px-3.5 pb-3.5 pt-0 space-y-2.5 border-t border-cyan-100">
                    <div className="flex items-baseline justify-between pt-2">
                      <div>
                        <span className="text-[11px] text-slate-500 font-medium block">Profondeur estimée sous le sol</span>
                        <div className="text-2xl font-extrabold text-slate-900 tracking-tight tabular-nums flex items-baseline gap-1">
                          <span>~ {gw.profondeur_estimee_m}</span>
                          <span className="text-sm font-semibold text-slate-600">m / sol</span>
                        </div>
                      </div>
                      {gw.cote_nappe_estimee_ngf !== undefined && gw.cote_nappe_estimee_ngf !== null && (
                        <div className="text-right">
                          <span className="text-[11px] text-slate-500 font-medium block">Cote piézométrique</span>
                          <span className="text-sm font-bold font-mono text-cyan-900 tabular-nums">
                            {gw.cote_nappe_estimee_ngf} m NGF
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="text-[11px] text-slate-600 flex items-center justify-between pt-1 border-t border-cyan-100">
                      <span>
                        Fourchette locale : <b>{gw.profondeur_min_m} m</b> à <b>{gw.profondeur_max_m} m</b>
                      </span>
                      {gw.altitude_site_ngf && (
                        <span className="font-mono text-slate-500 text-[11px]">
                          LiDAR site : {gw.altitude_site_ngf} m
                        </span>
                      )}
                    </div>

                    {gw.points_appui && gw.points_appui.length > 0 && (
                      <div className="pt-0.5 space-y-2">
                        {gw.methode_calcul && (
                          <div className="text-[11px] text-cyan-950/80 bg-cyan-50/70 p-2 rounded border border-cyan-200/50 leading-relaxed">
                            {gw.methode_calcul}
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => setShowGwDetails(!showGwDetails)}
                          className="text-[11px] text-cyan-800 hover:text-cyan-950 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <span>
                            {showGwDetails
                              ? "Masquer les points d'appui"
                              : `Voir les ${gw.nb_points_appui} ouvrages de référence (${
                                  gw.points_appui.filter((p) => p.source === "BSS").length
                                } forages BSS avec eau${
                                  gw.points_appui.filter((p) => p.source === "HUB_EAU").length > 0
                                    ? ` + ${gw.points_appui.filter((p) => p.source === "HUB_EAU").length} piézo(s) ADES`
                                    : ""
                                })`}
                          </span>
                          {showGwDetails ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                        </button>

                        {showGwDetails && (
                          <div className="mt-2 space-y-1.5 max-h-36 overflow-y-auto pr-1">
                            {gw.points_appui.map((pt, idx) => (
                              <div
                                key={`${pt.source}-${pt.identifiant}-${idx}`}
                                className="p-1.5 bg-white rounded border border-cyan-200/60 text-[11px] flex items-center justify-between"
                              >
                                <div>
                                  <span className="font-mono font-bold text-slate-800">{pt.identifiant}</span>
                                  <span className="text-slate-500 text-[11px] ml-1.5">
                                    ({pt.source === "HUB_EAU" ? "Piézo ADES" : "Forage BSS"})
                                  </span>
                                  <div className="text-[11px] text-slate-600">
                                    {pt.prof_eau_sol !== undefined && pt.prof_eau_sol !== null
                                      ? `Eau à ${pt.prof_eau_sol} m/sol`
                                      : ""}{" "}
                                    {pt.cote_eau_ngf !== undefined && pt.cote_eau_ngf !== null
                                      ? `(Cote ${pt.cote_eau_ngf} m NGF)`
                                      : ""}
                                  </div>
                                </div>
                                <span className="font-mono text-slate-600 font-semibold text-[11px]">
                                  {Math.round(pt.distance_meters)} m
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 2. Reconstructed Lithology & Geological Cross-Section (NF X 31-620) */}
            {litho && litho.layers && litho.layers.length > 0 && (
              <div className="bg-gradient-to-br from-amber-50/20 via-white to-slate-50 border border-slate-300 rounded-lg shadow-xs overflow-hidden transition-all">
                <button
                  type="button"
                  onClick={() => toggleSection("litho")}
                  className="w-full p-3 flex items-center justify-between gap-2 text-left cursor-pointer hover:bg-slate-100/60 transition-colors"
                  aria-expanded={expandedSections.litho}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-7 w-7 rounded-md bg-emerald-100 flex items-center justify-center shrink-0 border border-emerald-200">
                      <Layers className="h-4 w-4 text-[#1b4332]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                          Lithologie au droit du site
                        </span>
                        <span className="text-[11px] font-semibold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-full border border-emerald-300">
                          {litho.layers.length} horizons
                        </span>
                      </div>
                      {!expandedSections.litho && (
                        <div className="text-[11px] text-slate-600 truncate mt-0.5">
                          {litho.formation_surface} • {litho.nb_forages_coupes} coupes BSS numérisées
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-slate-700">
                    {expandedSections.litho ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </button>

                {expandedSections.litho && (
                  <div className="px-3.5 pb-3.5 pt-0 space-y-3 border-t border-slate-200">
                    {/* Synthesis Quote */}
                    {litho.description_synthese && (
                      <div className="text-[11px] text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-200 leading-relaxed italic mt-2.5">
                        « {litho.description_synthese} »
                      </div>
                    )}

                    {/* Vertical Stratigraphic Column */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-600 font-semibold uppercase tracking-wider pb-0.5 border-b border-slate-200">
                        <span>Profondeur &amp; Cote NGF</span>
                        <span>Horizon &amp; Lithologie</span>
                      </div>

                      {litho.layers.map((layer, idx) => {
                        let depthBoxClass = "bg-amber-50/80 border-amber-200 text-amber-950";
                        let badgeClass = "bg-amber-100 text-amber-900 border-amber-300";
                        let bulletColor = "bg-amber-500";

                        if (layer.type_couche === "alluvions") {
                          depthBoxClass = "bg-yellow-50/80 border-yellow-200 text-yellow-950";
                          badgeClass = "bg-yellow-100 text-yellow-900 border-yellow-300";
                          bulletColor = "bg-yellow-500";
                        } else if (layer.type_couche === "aquifere" || layer.est_zone_saturee) {
                          depthBoxClass = "bg-cyan-50/80 border-cyan-200 text-cyan-950";
                          badgeClass = "bg-cyan-100 text-cyan-900 border-cyan-300";
                          bulletColor = "bg-cyan-600";
                        } else if (layer.type_couche === "substratum") {
                          depthBoxClass = "bg-slate-100 border-slate-200 text-slate-900";
                          badgeClass = "bg-slate-200 text-slate-800 border-slate-300";
                          bulletColor = "bg-[#1b4332]";
                        }

                        const depthLabel =
                          layer.profondeur_base_m !== undefined && layer.profondeur_base_m !== null
                            ? `${layer.profondeur_toit_m} à ${layer.profondeur_base_m} m`
                            : `> ${layer.profondeur_toit_m} m`;

                        const coteLabel =
                          layer.cote_ngf_toit !== undefined && layer.cote_ngf_toit !== null
                            ? layer.cote_ngf_base !== undefined && layer.cote_ngf_base !== null
                              ? `${layer.cote_ngf_toit} → ${layer.cote_ngf_base} m NGF`
                              : `< ${layer.cote_ngf_toit} m NGF`
                            : null;

                        return (
                          <div
                            key={`layer-${idx}`}
                            className="p-2.5 rounded-md border border-slate-200 bg-white text-[11px] shadow-2xs transition-all hover:border-slate-300"
                          >
                            <div className="flex items-start justify-between gap-2.5">
                              <div className={`shrink-0 w-28 p-1.5 rounded border text-center ${depthBoxClass}`}>
                                <div className="flex items-center justify-center gap-1 mb-0.5">
                                  <span className={`h-1.5 w-1.5 rounded-full ${bulletColor}`} />
                                  <span className="font-mono font-bold text-xs tabular-nums">
                                    {depthLabel}
                                  </span>
                                </div>
                                {coteLabel && (
                                  <span className="font-mono text-[11px] block tabular-nums opacity-90">
                                    {coteLabel}
                                  </span>
                                )}
                              </div>

                              <div className="grow min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-bold text-slate-900 leading-snug">
                                    {layer.designation}
                                  </span>
                                  {layer.est_zone_saturee && (
                                    <span className="inline-flex items-center gap-0.5 text-[11px] font-bold px-1.5 py-0.5 rounded bg-cyan-100 text-cyan-900 border border-cyan-300">
                                      <Droplets className="h-3 w-3 text-cyan-700" /> Nappe
                                    </span>
                                  )}
                                  <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded border ${badgeClass}`}>
                                    {layer.permeabilite}
                                  </span>
                                </div>
                                <p className="text-slate-700 mt-1 text-[11px] leading-relaxed">
                                  {layer.lithologie}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Digitized BSS Geological Logs Accordion */}
                    {litho.nb_forages_coupes > 0 && (
                      <div className="pt-1 border-t border-slate-200">
                        <button
                          type="button"
                          onClick={() => setShowLithoCoupes(!showLithoCoupes)}
                          className="w-full flex items-center justify-between text-[11px] font-bold text-[#1b4332] hover:text-[#2d6a4f] py-1 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-1.5">
                            <FileText className="h-3.5 w-3.5 text-[#1b4332]" />
                            <span>
                              {showLithoCoupes
                                ? "Masquer les coupes BSS numérisées"
                                : `Consulter les coupes BSS numérisées (${litho.nb_forages_coupes} disponibles)`}
                            </span>
                          </div>
                          {showLithoCoupes ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>

                        {showLithoCoupes && study.collected_data?.bss && (
                          <div className="mt-2 space-y-2 max-h-56 overflow-y-auto pr-1">
                            {study.collected_data.bss
                              .filter((b) => b.coupe_disponible)
                              .map((b) => (
                                <div
                                  key={b.reference}
                                  className="p-2.5 bg-white rounded border border-slate-200 shadow-2xs space-y-1.5 text-[11px]"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-mono font-bold text-slate-900">{b.reference}</span>
                                    <span className="font-mono text-slate-600 font-semibold text-[11px]">
                                      {Math.round(b.distance_meters)} m
                                    </span>
                                  </div>

                                  <div className="text-slate-700 text-[11px] space-y-0.5">
                                    <div>
                                      <b>Profondeur atteinte :</b>{" "}
                                      {b.prof_atteinte !== undefined && b.prof_atteinte !== null ? `${b.prof_atteinte} m` : "n.d."}
                                      {b.prof_eau_sol !== undefined && b.prof_eau_sol !== null && (
                                        <span className="text-cyan-800 font-medium ml-2">
                                          (Eau : {b.prof_eau_sol} m/sol)
                                        </span>
                                      )}
                                    </div>
                                    {b.lieu_dit && (
                                      <div>
                                        <b>Lieu-dit :</b> {b.lieu_dit}
                                      </div>
                                    )}
                                    {b.auteur_coupe && (
                                      <div>
                                        <b>Auteur / Date :</b> {b.auteur_coupe}{" "}
                                        {b.date_coupe ? `(${b.date_coupe})` : ""}
                                      </div>
                                    )}
                                  </div>

                                  <a
                                    href={b.url_infoterre}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1b4332] hover:text-[#2d6a4f] hover:underline pt-0.5"
                                  >
                                    <span>Ouvrir la coupe numérisée sur InfoTerre</span>
                                    <ExternalLink className="h-3 w-3" />
                                  </a>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 3. Hydrogeological Entity BDLISA (Sandre / BRGM) */}
            {bdlisa && (bdlisa.aquifere_superficiel || bdlisa.formation_affleurante) && (
              <div className="bg-gradient-to-br from-slate-50 via-white to-cyan-50/30 border border-cyan-200 rounded-lg shadow-xs overflow-hidden transition-all">
                <button
                  type="button"
                  onClick={() => toggleSection("bdlisa")}
                  className="w-full p-3 flex items-center justify-between gap-2 text-left cursor-pointer hover:bg-cyan-50/40 transition-colors"
                  aria-expanded={expandedSections.bdlisa}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-7 w-7 rounded-md bg-cyan-100 flex items-center justify-center shrink-0 border border-cyan-200">
                      <Droplets className="h-4 w-4 text-cyan-700" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-cyan-950 uppercase tracking-wide">
                          Aquifère BDLISA (Sandre)
                        </span>
                        <span className="font-mono text-[11px] bg-cyan-100 text-cyan-900 px-2 py-0.5 rounded-full font-bold">
                          {(bdlisa.aquifere_superficiel || bdlisa.formation_affleurante)?.code_eh}
                        </span>
                      </div>
                      {!expandedSections.bdlisa && (
                        <div className="text-[11px] text-slate-600 truncate mt-0.5">
                          {(bdlisa.aquifere_superficiel || bdlisa.formation_affleurante)?.libelle_eh}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-cyan-900">
                    {expandedSections.bdlisa ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </button>

                {expandedSections.bdlisa && (
                  <div className="px-3.5 pb-3.5 pt-0 space-y-2.5 border-t border-cyan-100">
                    <div className="pt-2">
                      <span className="text-[11px] text-slate-500 font-medium block uppercase tracking-wider">
                        {bdlisa.aquifere_superficiel ? "Aquifère superficiel sous le site" : "Formation géologique affleurante"}
                      </span>
                      <div className="text-xs font-bold text-slate-900 leading-snug mt-0.5">
                        {(bdlisa.aquifere_superficiel || bdlisa.formation_affleurante)?.libelle_eh}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                      <div className="p-2 bg-slate-50 rounded border border-slate-200">
                        <span className="text-slate-500 block text-[11px] uppercase tracking-wide">Nature</span>
                        <span className="font-semibold text-slate-900">
                          {(bdlisa.aquifere_superficiel || bdlisa.formation_affleurante)?.nature_libelle}
                        </span>
                      </div>
                      <div className="p-2 bg-slate-50 rounded border border-slate-200">
                        <span className="text-slate-500 block text-[11px] uppercase tracking-wide">Milieu</span>
                        <span className="font-semibold text-slate-900">
                          {(bdlisa.aquifere_superficiel || bdlisa.formation_affleurante)?.milieu_libelle}
                        </span>
                      </div>
                    </div>

                    <div className="p-2 bg-cyan-50/70 rounded border border-cyan-200 text-[11px] text-cyan-950">
                      <span className="text-cyan-800 font-semibold block text-[11px] uppercase tracking-wide">Régime de nappe</span>
                      <span className="font-medium">
                        {(bdlisa.aquifere_superficiel || bdlisa.formation_affleurante)?.etat_libelle}
                      </span>
                    </div>

                    {bdlisa.karst && (
                      <div className="p-2 bg-amber-50 rounded border border-amber-300 text-[11px] text-amber-950">
                        <b className="text-amber-800 font-bold">⚠️ Alerte Karst :</b> {bdlisa.karst.libelle_zk} ({bdlisa.karst.situation})
                      </div>
                    )}

                    {bdlisa.formations && bdlisa.formations.length > 0 && (
                      <div className="pt-0.5">
                        <button
                          type="button"
                          onClick={() => setShowBdlisaPile(!showBdlisaPile)}
                          className="text-[11px] text-cyan-800 hover:text-cyan-950 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <span>
                            {showBdlisaPile
                              ? "Masquer la pile géologique"
                              : `Voir la succession stratigraphique (${bdlisa.formations.length} formations)`}
                          </span>
                          {showBdlisaPile ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </button>

                        {showBdlisaPile && (
                          <div className="mt-2 space-y-1.5 max-h-44 overflow-y-auto pr-1">
                            {bdlisa.formations.map((f, idx) => (
                              <div
                                key={`${f.code_eh}-${idx}`}
                                className="p-2 bg-white rounded border border-slate-200 text-[11px] space-y-0.5 shadow-2xs"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="font-mono font-bold text-slate-800 text-[11px]">{f.code_eh}</span>
                                  <span
                                    className={`text-[11px] px-1.5 py-0.5 rounded font-semibold ${
                                      f.est_aquifere
                                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                        : "bg-slate-100 text-slate-700"
                                    }`}
                                  >
                                    {f.est_aquifere ? "Aquifère" : "Imperméable / Semi"}
                                  </span>
                                </div>
                                <div className="text-slate-800 font-medium text-[11px] leading-tight">
                                  {f.libelle_eh}
                                </div>
                                <div className="text-slate-500 text-[11px]">
                                  {f.milieu_libelle} • {f.etat_libelle}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 4. Topography & Subsoil details */}
            <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden transition-all">
              <button
                type="button"
                onClick={() => toggleSection("topo")}
                className="w-full p-3 flex items-center justify-between gap-2 text-left cursor-pointer hover:bg-slate-50 transition-colors"
                aria-expanded={expandedSections.topo}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-7 w-7 rounded-md bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200">
                    <Mountain className="h-4 w-4 text-slate-700" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                        Topographie &amp; Sous-sol
                      </span>
                      {alti?.z_mean && (
                        <span className="text-[11px] font-mono text-emerald-800 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          {alti.z_mean} m NGF
                        </span>
                      )}
                    </div>
                    {!expandedSections.topo && (
                      <div className="text-[11px] text-slate-600 truncate mt-0.5">
                        Dénivelé {alti?.denivele ?? 0} m • {bssCount} forages BSS
                      </div>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-slate-700">
                  {expandedSections.topo ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </button>

              {expandedSections.topo && (
                <div className="px-3.5 pb-3.5 pt-0 space-y-2.5 border-t border-slate-100 text-xs">
                  <div className="pt-2">
                    {piezoCount > 0 && study.collected_data?.piezometrie?.[0] ? (
                      <div className="text-[11px] text-slate-600">
                        <b>Piézomètre ADES le plus proche :</b> {study.collected_data.piezometrie[0].profondeur_nappe ? `${study.collected_data.piezometrie[0].profondeur_nappe} m sous sol` : "profondeur n.d."}{" "}
                        {study.collected_data.piezometrie[0].cote_ngf ? `(cote ${study.collected_data.piezometrie[0].cote_ngf} m NGF)` : ""}{" "}
                        à {Math.round(study.collected_data.piezometrie[0].distance_meters)} m.
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-500">
                        <b>Piézomètres ADES (Hub&apos;Eau) :</b> Aucun ouvrage de suivi temps réel dans le rayon de {bufferMeters} m. La profondeur de nappe est déduite des forages BSS géoréférencés.
                      </div>
                    )}
                  </div>

                  {bssCount > 0 && (
                    <div className="space-y-1">
                      <div className="text-[11px] font-semibold text-slate-700">Forages BSS de référence :</div>
                      <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                        {study.collected_data.bss?.slice(0, 8).map((b) => (
                          <div key={b.reference} className="p-1.5 bg-slate-50 rounded border border-slate-200 text-[11px] flex items-center justify-between">
                            <div>
                              <span className="font-mono font-bold text-slate-800">{b.reference}</span>
                              <span className="text-slate-500 ml-1.5">({b.nature || "FORAGE"})</span>
                              {b.prof_atteinte !== undefined && b.prof_atteinte !== null && (
                                <span className="text-slate-600 ml-1 font-mono">[{b.prof_atteinte}m]</span>
                              )}
                            </div>
                            <a
                              href={b.url_infoterre}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`text-[11px] font-semibold px-1.5 py-0.5 rounded ${
                                b.coupe_disponible ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
                              } hover:underline`}
                            >
                              {b.coupe_disponible ? "Coupe géol." : "Fiche BSS"} &rarr;
                            </a>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 5. Industrial Sites CASIAS & ICPE */}
            {(casiasCount > 0 || icpeCount > 0) && (
              <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden transition-all">
                <button
                  type="button"
                  onClick={() => toggleSection("industriel")}
                  className="w-full p-3 flex items-center justify-between gap-2 text-left cursor-pointer hover:bg-slate-50 transition-colors"
                  aria-expanded={expandedSections.industriel}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-7 w-7 rounded-md bg-amber-100 flex items-center justify-center shrink-0 border border-amber-200">
                      <Factory className="h-4 w-4 text-amber-800" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                          Passif Industriel &amp; ICPE
                        </span>
                        <span className="text-[11px] font-mono text-amber-900 font-semibold bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                          {casiasCount + icpeCount} site(s)
                        </span>
                      </div>
                      {!expandedSections.industriel && (
                        <div className="text-[11px] text-slate-600 truncate mt-0.5">
                          {casiasCount} CASIAS/BASIAS • {icpeCount} installation(s) classée(s)
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-slate-700">
                    {expandedSections.industriel ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </button>

                {expandedSections.industriel && (
                  <div className="px-3.5 pb-3.5 pt-0 space-y-2.5 border-t border-slate-100 text-xs">
                    {casiasCount > 0 && (
                      <div className="space-y-1.5 pt-2">
                        <div className="text-[11px] font-bold text-amber-900 flex items-center justify-between">
                          <span>Sites CASIAS / BASIAS :</span>
                          <span className="font-mono text-slate-500">{casiasCount} site(s)</span>
                        </div>
                        <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                          {study.collected_data?.casias?.slice(0, 6).map((c, idx) => (
                            <div
                              key={`${c.identifiant || idx}`}
                              className="p-2 bg-amber-50/40 rounded border border-amber-200/70 text-[11px] space-y-0.5"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-slate-900 truncate mr-2">
                                  {c.nom_usuel || "Site industriel"}
                                </span>
                                {c.distance_emprise_m !== undefined && (
                                  <span className="font-mono text-slate-600 font-bold shrink-0">
                                    {Math.round(c.distance_emprise_m)} m
                                  </span>
                                )}
                              </div>
                              <div className="text-slate-600 text-[11px]">
                                {c.activite_principale || c.statut || "Activité répertoriée"}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {icpeCount > 0 && (
                      <div className="space-y-1.5 pt-1 border-t border-slate-100">
                        <div className="text-[11px] font-bold text-red-900 flex items-center justify-between">
                          <span>Installations classées ICPE :</span>
                          <span className="font-mono text-slate-500">{icpeCount} site(s)</span>
                        </div>
                        <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                          {study.collected_data?.icpe?.slice(0, 6).map((ic, idx) => (
                            <div
                              key={`${ic.numero_s3ic || idx}`}
                              className="p-2 bg-red-50/40 rounded border border-red-200/70 text-[11px] space-y-0.5"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-slate-900 truncate mr-2">
                                  {ic.nom_etablissement || "Établissement ICPE"}
                                </span>
                                {ic.statut_activite && (
                                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-red-100 text-red-900 font-semibold shrink-0">
                                    {ic.statut_activite}
                                  </span>
                                )}
                              </div>
                              {ic.numero_s3ic && (
                                <div className="font-mono text-slate-500 text-[11px]">
                                  S3IC : {ic.numero_s3ic}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 6. Biodiversity details */}
            {natureCount > 0 && (
              <div className="bg-white border border-slate-200 rounded-lg shadow-xs overflow-hidden transition-all">
                <button
                  type="button"
                  onClick={() => toggleSection("inpn")}
                  className="w-full p-3 flex items-center justify-between gap-2 text-left cursor-pointer hover:bg-slate-50 transition-colors"
                  aria-expanded={expandedSections.inpn}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="h-7 w-7 rounded-md bg-blue-100 flex items-center justify-center shrink-0 border border-blue-200">
                      <Trees className="h-4 w-4 text-blue-700" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                          Sensibilité Écologique (INPN)
                        </span>
                        <span className="text-[11px] font-mono text-blue-800 font-semibold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                          {natureCount} zonage(s)
                        </span>
                      </div>
                      {!expandedSections.inpn && (
                        <div className="text-[11px] text-slate-600 truncate mt-0.5">
                          {study.collected_data?.zonages_naturels?.map((z) => z.nom_site).join(", ")}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-slate-700">
                    {expandedSections.inpn ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                </button>

                {expandedSections.inpn && (
                  <div className="px-3.5 pb-3.5 pt-0 space-y-2 border-t border-slate-100 text-xs">
                    <div className="max-h-36 overflow-y-auto space-y-1 pr-1 pt-2">
                      {study.collected_data.zonages_naturels?.slice(0, 6).map((zn) => (
                        <div key={zn.id_mnhn} className="p-1.5 bg-slate-50 rounded border border-slate-200 text-[11px] flex items-center justify-between">
                          <div className="truncate mr-2">
                            <div className="font-semibold text-slate-800 truncate">{zn.nom_site}</div>
                            <div className="text-[11px] text-slate-500">{zn.type_zonage} — {zn.statut_recoupement}</div>
                          </div>
                          <a
                            href={zn.url_fiche}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 shrink-0 underline"
                          >
                            INPN &rarr;
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Export DOCX Button */}
            <a
              href={getDocxExportUrl(study.id)}
              download
              className="w-full py-2.5 px-4 text-xs font-semibold rounded bg-[#1b4332] text-white hover:bg-[#2d6a4f] flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <FileDown className="h-4 w-4" />
              Télécharger le rapport Word enrichi (.docx)
            </a>
          </section>
        )}
      </div>
    </aside>
  );
}
