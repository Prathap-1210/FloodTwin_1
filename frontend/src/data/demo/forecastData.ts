export type ForecastMinute =
  | 0
  | 30
  | 60
  | 90
  | 180;

export const forecastData = {
  0: {
    depth: 8,
    probability: 0.32,
    risk: "CAUTION",
    peopleAtRisk: 80,

    drainStatus: "STRESSED",
    drainLoadPercent: 68,
    drainAnomalyProbability: 0.21,
    drainPriority: "P4",
    drainConfidence: 0.78,

    polygon: [
      [
        [80.221, 12.9815],
        [80.223, 12.981],
        [80.2242, 12.982],
        [80.2234, 12.9832],
        [80.2214, 12.983],
        [80.221, 12.9815],
      ],
    ],
  },

  30: {
    depth: 21,
    probability: 0.61,
    risk: "HIGH",
    peopleAtRisk: 220,

    drainStatus: "STRESSED",
    drainLoadPercent: 84,
    drainAnomalyProbability: 0.42,
    drainPriority: "P3",
    drainConfidence: 0.82,

    polygon: [
      [
        [80.2202, 12.9808],
        [80.223, 12.98],
        [80.225, 12.981],
        [80.2253, 12.9833],
        [80.2233, 12.9843],
        [80.2207, 12.9835],
        [80.2202, 12.9808],
      ],
    ],
  },

  60: {
    depth: 42,
    probability: 0.88,
    risk: "SEVERE",
    peopleAtRisk: 500,

    drainStatus: "PROBABLE_BLOCKAGE",
    drainLoadPercent: 106,
    drainAnomalyProbability: 0.87,
    drainPriority: "P1",
    drainConfidence: 0.91,

    polygon: [
      [
        [80.2188, 12.98],
        [80.2222, 12.979],
        [80.2255, 12.9803],
        [80.2264, 12.9835],
        [80.2238, 12.9855],
        [80.2201, 12.9847],
        [80.2188, 12.98],
      ],
    ],
  },

  90: {
    depth: 58,
    probability: 0.94,
    risk: "SEVERE",
    peopleAtRisk: 720,

    drainStatus: "PROBABLE_BLOCKAGE",
    drainLoadPercent: 121,
    drainAnomalyProbability: 0.93,
    drainPriority: "P1",
    drainConfidence: 0.93,

    polygon: [
      [
        [80.2178, 12.979],
        [80.2215, 12.9778],
        [80.226, 12.9792],
        [80.2275, 12.9837],
        [80.2245, 12.9863],
        [80.219, 12.9853],
        [80.2178, 12.979],
      ],
    ],
  },

  180: {
    depth: 34,
    probability: 0.73,
    risk: "HIGH",
    peopleAtRisk: 410,

    drainStatus: "OVERLOADED",
    drainLoadPercent: 94,
    drainAnomalyProbability: 0.69,
    drainPriority: "P2",
    drainConfidence: 0.87,

    polygon: [
      [
        [80.2194, 12.98],
        [80.2224, 12.9793],
        [80.2256, 12.9805],
        [80.226, 12.9836],
        [80.2234, 12.985],
        [80.22, 12.984],
        [80.2194, 12.98],
      ],
    ],
  },
} as const;