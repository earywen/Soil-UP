"use client";

import React, { useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { CadastralParcelFeature, CasiasItem, IcpeItem, GeoJsonObject } from "@/types";

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
}

const DynamicMapInner = dynamic(() => import("./MapInner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-500">
      <div className="flex flex-col items-center gap-2">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
        <span className="text-xs font-medium">Initialisation du SIG interactif...</span>
      </div>
    </div>
  ),
});

const emptySubscribe = () => () => {};

export default function Map(props: MapProps) {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  if (!isClient) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-100 text-slate-500">
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
          <span className="text-xs font-medium">Chargement du SIG interactif...</span>
        </div>
      </div>
    );
  }

  return <DynamicMapInner {...props} />;
}
