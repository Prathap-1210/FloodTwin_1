import {
  api,
} from "./api";


/* ====================================================== */
/* COMMON TYPES                                           */
/* ====================================================== */

export type MLForecastMinute =
  | 30
  | 60
  | 90
  | 180;

export type WaterLevelTrend =
  | "FALLING"
  | "STABLE"
  | "RISING";


/* ====================================================== */
/* FULL 6-MODEL REQUEST                                   */
/* ====================================================== */

export type FloodTwinMLRequest = {
  /* ---------------------------------------------------- */
  /* LOCATION                                             */
  /* ---------------------------------------------------- */

  zone_id: string;

  location_name?:
    string | null;

  latitude?:
    number | null;

  longitude?:
    number | null;

  /* ---------------------------------------------------- */
  /* FORECAST                                             */
  /* ---------------------------------------------------- */

  forecast_minutes:
    MLForecastMinute;

  /* ---------------------------------------------------- */
  /* RAINFALL                                             */
  /* ---------------------------------------------------- */

  rainfall_mm_hr:
    number;

  recent_rainfall_mm:
    number;

  antecedent_rainfall_mm:
    number;

  /* ---------------------------------------------------- */
  /* MODEL 1 - FLOOD / GIS                                */
  /* ---------------------------------------------------- */

  elevation_m:
    number;

  slope_deg:
    number;

  built_up_percent:
    number;

  distance_to_nearest_drain_m:
    number;

  drain_density_m_per_km2:
    number;

  previous_depth_cm:
    number;

  /* ---------------------------------------------------- */
  /* MODEL 2 - DRAINAGE                                   */
  /* ---------------------------------------------------- */

  drain_id:
    string;

  c2_diameter_m:
    number;

  capacity_percent:
    number;

  upstream_load_percent:
    number;

  downstream_load_percent:
    number;

  normal_capacity_percent:
    number;

  /* ---------------------------------------------------- */
  /* MODEL 3 - HOTSPOT                                    */
  /* ---------------------------------------------------- */

  people_at_risk:
    number;

  hospital_nearby?:
    boolean;

  major_road_affected?:
    boolean;

  water_level_trend?:
    WaterLevelTrend;

  vulnerable_count?:
    number;

  /* ---------------------------------------------------- */
  /* MODEL 4 - ROAD RISK                                  */
  /* ---------------------------------------------------- */

  distance_to_hotspot_m:
    number;

  road_elevation_m:
    number;

  road_type:
    string;

  /* ---------------------------------------------------- */
  /* MODEL 5 - EVACUATION                                 */
  /* ---------------------------------------------------- */

  population:
    number;

  water_rise_rate_cm_hr:
    number;

  distance_to_shelter_km:
    number;

  vulnerability_index:
    number;

  /* ---------------------------------------------------- */
  /* MODEL 6 - RESPONSE                                   */
  /* ---------------------------------------------------- */

  clear_drain?:
    number;

  deploy_pump?:
    number;

  close_road?:
    number;

  evacuate?:
    number;

  pump_capacity_index?:
    number;

  response_delay_min?:
    number;
};


/* ====================================================== */
/* MODEL 1 RESPONSE                                       */
/* ====================================================== */

export type FloodPredictionML = {
  forecast_minutes:
    number;

  predicted_depth_cm:
    number;

  risk:
    string;

  flood_probability:
    number;

  probability_method:
    string;

  uncertainty_p90_cm?:
    number | null;

  warnings:
    string[];
};

export type FloodMLResult = {
  model:
    string;

  model_version:
    string;

  model_source:
    string;

  zone_id:
    string;

  predictions:
    FloodPredictionML[];

  claim_note?:
    string | null;
};


/* ====================================================== */
/* MODEL 2 RESPONSE                                       */
/* ====================================================== */

export type DrainageMLResult = {
  model:
    string;

  model_type:
    string;

  drain_id:
    string;

  status:
    string;

  confidence?:
    number | null;

  confidence_percent?:
    number | null;

  severity:
    string;

  class_probabilities:
    Record<
      string,
      number
    >;

  explanation:
    string;

  recommended_action:
    string;

  diagnostic_note?:
    string;

  hydraulic_context: {
    capacity_percent:
      number;

    load_difference_percent:
      number;

    nearby_water_depth_cm:
      number;
  };
};


/* ====================================================== */
/* MODEL 3 RESPONSE                                       */
/* ====================================================== */

export type HotspotMLResult = {
  model:
    string;

  risk:
    string;

  priority_score:
    number;

  response_priority:
    string;

  confidence:
    number;

  confidence_percent:
    number;

  raw_ml_risk:
    string;

  policy_risk:
    string;

  operational_guardrail_applied:
    boolean;

  reasons:
    string[];

  class_probabilities:
    Record<
      string,
      number
    >;
};


/* ====================================================== */
/* MODEL 4 RESPONSE                                       */
/* ====================================================== */

export type RoadMLResult = {
  model:
    string;

  road_risk_probability:
    number;

  risk_class:
    string;

  unsafe:
    boolean;

  routing_recommendation:
    string;

  reasons:
    string[];

  forecast_minutes:
    number;

  road_type:
    string;
};


/* ====================================================== */
/* MODEL 5 RESPONSE                                       */
/* ====================================================== */

export type EvacuationMLResult = {
  model:
    string;

  population:
    number;

  predicted_evacuation_count:
    number;

  evacuation_ratio:
    number;

  evacuation_ratio_percent:
    number;

  priority:
    string;
};


/* ====================================================== */
/* MODEL 6 RESPONSE                                       */
/* ====================================================== */

export type ResponseEffectivenessMLResult = {
  model:
    string;

  post_flood_depth_cm:
    number;

  post_people_at_risk:
    number;

  post_drain_load_percent:
    number;

  depth_reduction_cm:
    number;

  people_risk_reduction:
    number;

  drain_load_reduction_points:
    number;

  impact_reduction_percent:
    number;

  effectiveness_score:
    number;

  confidence:
    number;

  confidence_percent:
    number;

  uncertainty:
    number;

  forecast_minutes:
    number;
};


/* ====================================================== */
/* COMPLETE 6-MODEL RESPONSE                              */
/* ====================================================== */

export type FloodTwinMLResponse = {
  system:
    string;

  pipeline:
    string;

  location: {
    zone_id:
      string;

    location_name?:
      string | null;

    latitude?:
      number | null;

    longitude?:
      number | null;
  };

  forecast_minutes:
    number;

  flood:
    FloodMLResult;

  drainage:
    DrainageMLResult;

  hotspot:
    HotspotMLResult;

  road:
    RoadMLResult;

  evacuation:
    EvacuationMLResult;

  response_effectiveness:
    ResponseEffectivenessMLResult;

  summary: {
    predicted_depth_cm:
      number;

    flood_probability:
      number;

    flood_risk:
      string;

    drain_status:
      string;

    hotspot_risk:
      string;

    response_priority:
      string;

    road_risk:
      string;

    evacuation_count:
      number;

    evacuation_priority:
      string;

    impact_reduction_percent:
      number;
  };
};


/* ====================================================== */
/* DYNAMIC FLOOD SCAN                                     */
/* ====================================================== */

export type FloodScanLocation = {
  location_id:
    string;

  zone:
    string | null;

  ward:
    string | null;

  latitude:
    number;

  longitude:
    number;

  elevation_m:
    number;

  slope_deg:
    number;

  built_up_percent:
    number;

  distance_to_nearest_drain_m:
    number;

  drain_density_m_per_km2:
    number;

  previous_depth_cm:
    number;

  predicted_depth_cm:
    number;

  flood_probability:
    number;

  risk:
    string;

  forecast_minutes:
    number;

  context: {
    latitude?:
      number;

    longitude?:
      number;

    nearest_drain: {
      drain_id:
        string;

      name:
        string | null;

      distance_m:
        number | null;
    };

    nearest_hospital: {
      name:
        string | null;

      distance_m:
        number | null;

      nearby:
        boolean;

      nearby_radius_m:
        number;
    };

    nearest_shelter: {
      name:
        string | null;

      distance_m:
        number | null;

      distance_km:
        number | null;
    };

    data_sources?:
      string[];
  };
};


/* ====================================================== */
/* SCAN RESPONSE                                          */
/* ====================================================== */

export type FloodScanResponse = {
  forecast_minutes:
    number;

  rainfall?: {
    rainfall_mm_hr:
      number;

    recent_rainfall_mm:
      number;

    antecedent_rainfall_mm:
      number;
  };

  total_scanned_locations:
    number;

  total_affected_count:
    number;

  returned_count:
    number;

  /*
   * Retained because the backend currently also
   * returns affected_count for compatibility.
   */
  affected_count:
    number;

  affected_locations:
    FloodScanLocation[];

  bounds: {
    south:
      number;

    north:
      number;

    west:
      number;

    east:
      number;
  } | null;

  data_source?:
    string;

  data_sources?:
    string[];
};


/* ====================================================== */
/* SCAN REQUEST                                           */
/* ====================================================== */

export type FloodScanRequest = {
  forecast_minutes:
    MLForecastMinute;

  rainfall_mm_hr:
    number;

  recent_rainfall_mm:
    number;

  antecedent_rainfall_mm:
    number;

  minimum_probability?:
    number;

  minimum_depth_cm?:
    number;

  limit?:
    number;

  previous_depth_mode?:
    "reference" | "zero";
};


/* ====================================================== */
/* DYNAMIC CHENNAI SCAN                                   */
/* ====================================================== */

export async function scanFloodLocations(
  forecastMinutes:
    MLForecastMinute,

  rainfallMmHr:
    number,

  recentRainfallMm:
    number,

  antecedentRainfallMm:
    number,
): Promise<FloodScanResponse> {

  const payload:
    FloodScanRequest = {

    forecast_minutes:
      forecastMinutes,

    rainfall_mm_hr:
      rainfallMmHr,

    recent_rainfall_mm:
      recentRainfallMm,

    antecedent_rainfall_mm:
      antecedentRainfallMm,

    minimum_probability:
      0.40,

    minimum_depth_cm:
      5,

    limit:
      50,

    previous_depth_mode:
      "reference",
  };

  const response =
    await api.post<
      FloodScanResponse
    >(
      "/ml/scan",
      payload,
    );

  return response.data;
}


/* ====================================================== */
/* CUSTOM SCAN                                            */
/* ====================================================== */

export async function scanFloodLocationsWithOptions(
  payload:
    FloodScanRequest,
): Promise<FloodScanResponse> {

  const response =
    await api.post<
      FloodScanResponse
    >(
      "/ml/scan",
      payload,
    );

  return response.data;
}


/* ====================================================== */
/* RUN ALL SIX ML MODELS                                  */
/* ====================================================== */

export async function runFloodTwinML(
  payload:
    FloodTwinMLRequest,
): Promise<FloodTwinMLResponse> {

  const response =
    await api.post<
      FloodTwinMLResponse
    >(
      "/ml/run",
      payload,
    );

  return response.data;
}


/* ====================================================== */
/* ML HEALTH / INFO                                       */
/* ====================================================== */

export async function getFloodTwinMLInfo() {

  const response =
    await api.get<{
      system:
        string;

      status:
        string;

      endpoints:
        Record<
          string,
          string
        >;

      pipeline:
        string[];
    }>(
      "/ml/info",
    );

  return response.data;
}