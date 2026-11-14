import {
  api,
} from "./api";

export type GeoJsonFeatureCollection = {
  type: "FeatureCollection";
  features: any[];
};

export type MapContextResponse = {
  healthcare:
    GeoJsonFeatureCollection;

  candidate_shelters:
    GeoJsonFeatureCollection;

  drainage:
    GeoJsonFeatureCollection;

  critical_road:
    GeoJsonFeatureCollection;

  counts: {
    healthcare: number;
    candidate_shelters: number;
    drainage: number;
  };

  data_source: string;
};

export async function getMapContext() {
  const response =
    await api.get<MapContextResponse>(
      "/map/context",
    );

  return response.data;
}