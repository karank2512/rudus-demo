// Published unit constants, grounded in public standards - not invented.
//
// Rebar nominal unit weights (lb/ft) are the standard ASTM A615/A706 nominal
// weights every estimator's reference table carries (bar number = diameter in
// eighths of an inch; weight = 3.4 lb/ft per inch of diameter squared / 4 is
// the common shortcut; the tabulated values below are the published ones).
export const BAR_UNIT_WEIGHT_LB_PER_FT: Record<string, number> = {
  "#3": 0.376,
  "#4": 0.668,
  "#5": 1.043,
  "#6": 1.502,
  "#7": 2.044,
  "#8": 2.67,
};

export const BAR_DIAMETER_IN: Record<string, number> = {
  "#3": 0.375,
  "#4": 0.5,
  "#5": 0.625,
  "#6": 0.75,
  "#7": 0.875,
  "#8": 1.0,
};

export const FT3_PER_CY = 27;
