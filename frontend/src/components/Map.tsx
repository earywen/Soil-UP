"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  CadastralParcelFeature,
  CasiasItem,
  IcpeItem,
  BssBoreholeItem,
  PiezometreItem,
  GeoJsonObject,
} from "@/types";

interface MapProps {
  center: [number, number];
  zoom: number;
  parcels: CadastralParcelFeature[];
  selectedParcelIds: Set<string>;
  onToggleParcel: (parcel: CadastralParcelFeature) => void;
  empriseGeoJson: GeoJsonObject | null;
  bufferMeters: number;
  casiasSites: CasiasItem[];
  icpeSites: IcpeItem[];
  bssBoreholes?: BssBoreholeItem[];
  piezometres?: PiezometreItem[];
  onMapClick?: (lat: number, lon: number) => void;
  isDrawingMode?: boolean;
  onToggleDrawingMode?: (active: boolean) => void;
  onCustomPolygonDrawn?: (geometry: GeoJsonObject) => void;
}

const DynamicMapInner = dynamic(() => import("./MapInner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-500">
      <div className="flex flex-col items-center gap-2">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1b4332] border-t-transparent" />
        <span className="text-xs font-medium text-slate-600">Chargement de la carte interactive...</span>
      </div>
    </div>
  ),
});

export default function Map(props: MapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-500">
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#1b4332] border-t-transparent" />
          <span className="text-xs font-medium text-slate-600">Chargement de la carte interactive...</span>
        </div>
      </div>
    );
  }

  return <DynamicMapInner {...props} />;
}
