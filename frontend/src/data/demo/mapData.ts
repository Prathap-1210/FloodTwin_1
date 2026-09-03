export const studyArea = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        id: "C01",
        name: "Velachery Study Area",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [80.20873, 12.96867],
            [80.23638, 12.96867],
            [80.23638, 12.99562],
            [80.20873, 12.99562],
            [80.20873, 12.96867],
          ],
        ],
      },
    },
  ],
};

export const floodZones = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        zone_id: "Z003",
        risk: "SEVERE",
        predicted_depth_cm: 42,
        flood_probability: 0.88,
        people_at_risk: 500,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [80.2188, 12.9800],
            [80.2222, 12.9790],
            [80.2255, 12.9803],
            [80.2264, 12.9835],
            [80.2238, 12.9855],
            [80.2201, 12.9847],
            [80.2188, 12.9800],
          ],
        ],
      },
    },
  ],
};

export const drainageNetwork = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        drain_id: "D17",
        status: "PROBABLE_BLOCKAGE",
        capacity_percent: 106,
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [80.2165, 12.9870],
          [80.2190, 12.9850],
          [80.2215, 12.9825],
          [80.2240, 12.9795],
          [80.2270, 12.9765],
        ],
      },
    },
  ],
};

export const criticalRoad = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        road_id: "R12",
        risk: "HIGH",
      },
      geometry: {
        type: "LineString",
        coordinates: [
          [80.2115, 12.9815],
          [80.2160, 12.9820],
          [80.2200, 12.9825],
          [80.2245, 12.9830],
          [80.2300, 12.9840],
        ],
      },
    },
  ],
};

export const infrastructure = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        id: "H1",
        type: "hospital",
        name: "Hospital H1",
      },
      geometry: {
        type: "Point",
        coordinates: [80.2280, 12.9850],
      },
    },
    {
      type: "Feature",
      properties: {
        id: "CAMP_A",
        type: "camp",
        name: "Camp A",
        capacity: 300,
      },
      geometry: {
        type: "Point",
        coordinates: [80.2140, 12.9900],
      },
    },
    {
      type: "Feature",
      properties: {
        id: "CAMP_B",
        type: "camp",
        name: "Camp B",
        capacity: 200,
      },
      geometry: {
        type: "Point",
        coordinates: [80.2320, 12.9735],
      },
    },
  ],
};