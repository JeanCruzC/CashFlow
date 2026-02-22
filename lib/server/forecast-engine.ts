import type { CategoryGL, Transaction } from "@/lib/types/finance";

export type ForecastModelName =
  | "holt_winters"
  | "arima"
  | "sarima"
  | "random_forest"
  | "manual_assumptions";

export interface ForecastModelCandidate {
  model: ForecastModelName;
  mape_pct: number | null;
  status: "used" | "insufficient_data" | "failed";
}

export interface ForecastModelDiagnostics {
  selected_model: ForecastModelName;
  validation_mape_pct: number | null;
  history_months: number;
  horizon_months: number;
  reason: string;
  candidates: ForecastModelCandidate[];
}

export interface ForecastDriverBundle {
  cogs_percent: number;
  fixed_opex: number;
  variable_opex_percent: number;
  one_off_amount: number;
  sources: {
    cogs_percent: "assumption" | "historical";
    fixed_opex: "assumption" | "historical";
    variable_opex_percent: "assumption" | "historical";
    one_off_amount: "assumption" | "default_zero";
  };
}

export interface ForecastProjection {
  month: string;
  revenue: number;
  cogs: number;
  opex: number;
  ebit: number;
  operating_margin_pct: number;
}

export interface ForecastAssumptionsInput {
  revenue_growth_rate?: number | null;
  revenue_amount?: number | null;
  cogs_percent?: number | null;
  fixed_opex?: number | null;
  variable_opex_percent?: number | null;
  one_off_amount?: number | null;
}

export interface ForecastComputationInput {
  targetMonth: string;
  horizonMonths: number;
  categories: Pick<CategoryGL, "id" | "kind" | "fixed_cost" | "variable_cost">[];
  transactions: Pick<Transaction, "date" | "amount" | "category_gl_id">[];
  assumptions?: ForecastAssumptionsInput;
}

export interface ForecastComputationResult {
  model: ForecastModelDiagnostics;
  drivers: ForecastDriverBundle;
  projections: ForecastProjection[];
  history: {
    history_start_month: string;
    history_end_month: string;
    history_months_total: number;
    history_months_with_data: number;
  };
  items_used: string[];
}

interface MonthlyAggregate {
  month: string;
  revenue: number;
  cogs: number;
  opex: number;
  fixedOpex: number;
  variableOpex: number;
}

const LOOKBACK_MONTHS = 36;
const DEFAULT_HORIZON = 6;
const SEASONAL_PERIOD = 12;

function toFiniteNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function clampNonNegative(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, value);
}

function safeAverage(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatMonth(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function parseMonth(month: string): Date {
  const [year, monthValue] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthValue - 1, 1));
}

function addMonths(month: string, delta: number): string {
  const date = parseMonth(month);
  date.setUTCMonth(date.getUTCMonth() + delta);
  return formatMonth(date);
}

function buildMonthRange(startMonth: string, endMonth: string): string[] {
  const result: string[] = [];
  let current = startMonth;

  for (let safety = 0; safety < 512; safety += 1) {
    result.push(current);
    if (current === endMonth) break;
    current = addMonths(current, 1);
  }
  return result;
}

function createRng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function pickUniqueIndices(length: number, count: number, random: () => number): number[] {
  if (count >= length) return Array.from({ length }, (_, index) => index);

  const chosen = new Set<number>();
  while (chosen.size < count) {
    chosen.add(Math.floor(random() * length));
  }
  return Array.from(chosen);
}

function solveLinearSystem(matrix: number[][], vector: number[]): number[] | null {
  const size = matrix.length;
  if (size === 0 || vector.length !== size) return null;

  const augmented = matrix.map((row, index) => [...row, vector[index]]);
  for (let pivot = 0; pivot < size; pivot += 1) {
    let maxRow = pivot;
    for (let row = pivot + 1; row < size; row += 1) {
      if (Math.abs(augmented[row][pivot]) > Math.abs(augmented[maxRow][pivot])) {
        maxRow = row;
      }
    }

    if (Math.abs(augmented[maxRow][pivot]) < 1e-9) return null;
    if (maxRow !== pivot) {
      const temp = augmented[pivot];
      augmented[pivot] = augmented[maxRow];
      augmented[maxRow] = temp;
    }

    const pivotValue = augmented[pivot][pivot];
    for (let column = pivot; column <= size; column += 1) {
      augmented[pivot][column] /= pivotValue;
    }

    for (let row = 0; row < size; row += 1) {
      if (row === pivot) continue;
      const factor = augmented[row][pivot];
      for (let column = pivot; column <= size; column += 1) {
        augmented[row][column] -= factor * augmented[pivot][column];
      }
    }
  }

  return augmented.map((row) => row[size]);
}

function fitLinearRegression(features: number[][], targets: number[]): number[] | null {
  if (features.length === 0 || features.length !== targets.length) return null;
  const width = features[0].length;
  if (width === 0) return null;

  const xtx = Array.from({ length: width }, () => Array.from({ length: width }, () => 0));
  const xty = Array.from({ length: width }, () => 0);

  for (let row = 0; row < features.length; row += 1) {
    const vector = features[row];
    for (let i = 0; i < width; i += 1) {
      xty[i] += vector[i] * targets[row];
      for (let j = 0; j < width; j += 1) {
        xtx[i][j] += vector[i] * vector[j];
      }
    }
  }

  for (let diagonal = 0; diagonal < width; diagonal += 1) {
    xtx[diagonal][diagonal] += 1e-6;
  }

  return solveLinearSystem(xtx, xty);
}

function calculateMape(actual: number[], predicted: number[]): number | null {
  const terms: number[] = [];
  for (let index = 0; index < actual.length; index += 1) {
    const base = actual[index];
    const estimate = predicted[index];
    if (!Number.isFinite(base) || !Number.isFinite(estimate) || Math.abs(base) < 1e-9) continue;
    terms.push(Math.abs((base - estimate) / base));
  }

  if (terms.length === 0) return null;
  return (terms.reduce((sum, value) => sum + value, 0) / terms.length) * 100;
}

function holtLinearForecast(series: number[], steps: number): number[] {
  if (series.length === 0) return Array.from({ length: steps }, () => 0);
  if (series.length === 1) return Array.from({ length: steps }, () => clampNonNegative(series[0]));

  const alpha = 0.45;
  const beta = 0.25;

  let level = series[0];
  let trend = series[1] - series[0];

  for (let index = 1; index < series.length; index += 1) {
    const value = series[index];
    const previousLevel = level;
    level = alpha * value + (1 - alpha) * (level + trend);
    trend = beta * (level - previousLevel) + (1 - beta) * trend;
  }

  return Array.from({ length: steps }, (_, step) => clampNonNegative(level + trend * (step + 1)));
}

function holtWintersForecast(series: number[], steps: number, seasonLength = SEASONAL_PERIOD): number[] {
  if (series.length < seasonLength * 2) return holtLinearForecast(series, steps);

  const alpha = 0.4;
  const beta = 0.2;
  const gamma = 0.2;

  const seasonals = Array.from({ length: seasonLength }, (_, index) => series[index] - safeAverage(series.slice(0, seasonLength)));
  let level = safeAverage(series.slice(0, seasonLength));
  let trend = (safeAverage(series.slice(seasonLength, seasonLength * 2)) - safeAverage(series.slice(0, seasonLength))) / seasonLength;

  for (let index = 0; index < series.length; index += 1) {
    const value = series[index];
    const seasonalIndex = index % seasonLength;
    const seasonal = seasonals[seasonalIndex];
    const previousLevel = level;

    level = alpha * (value - seasonal) + (1 - alpha) * (level + trend);
    trend = beta * (level - previousLevel) + (1 - beta) * trend;
    seasonals[seasonalIndex] = gamma * (value - level) + (1 - gamma) * seasonal;
  }

  const result: number[] = [];
  for (let step = 1; step <= steps; step += 1) {
    const seasonal = seasonals[(series.length + step - 1) % seasonLength];
    result.push(clampNonNegative(level + step * trend + seasonal));
  }
  return result;
}

function arimaForecast(series: number[], steps: number): number[] {
  if (series.length < 8) return holtLinearForecast(series, steps);

  const differences: number[] = [];
  for (let index = 1; index < series.length; index += 1) {
    differences.push(series[index] - series[index - 1]);
  }
  if (differences.length < 4) return holtLinearForecast(series, steps);

  const features: number[][] = [];
  const targets: number[] = [];
  for (let index = 2; index < differences.length; index += 1) {
    features.push([1, differences[index - 1], differences[index - 2]]);
    targets.push(differences[index]);
  }

  const coefficients = fitLinearRegression(features, targets);
  if (!coefficients) return holtLinearForecast(series, steps);

  const [intercept, phi1, phi2] = coefficients;
  const output: number[] = [];
  let lastValue = series[series.length - 1];
  let diff1 = differences[differences.length - 1];
  let diff2 = differences[differences.length - 2];

  for (let step = 0; step < steps; step += 1) {
    const nextDiff = intercept + phi1 * diff1 + phi2 * diff2;
    const nextValue = clampNonNegative(lastValue + nextDiff);
    output.push(nextValue);
    lastValue = nextValue;
    diff2 = diff1;
    diff1 = nextDiff;
  }

  return output;
}

function sarimaForecast(series: number[], steps: number, seasonLength = SEASONAL_PERIOD): number[] {
  if (series.length < seasonLength + 8) return holtWintersForecast(series, steps, seasonLength);

  const seasonalDiff: number[] = [];
  for (let index = seasonLength; index < series.length; index += 1) {
    seasonalDiff.push(series[index] - series[index - seasonLength]);
  }
  if (seasonalDiff.length < 4) return holtWintersForecast(series, steps, seasonLength);

  const features: number[][] = [];
  const targets: number[] = [];
  for (let index = 2; index < seasonalDiff.length; index += 1) {
    features.push([1, seasonalDiff[index - 1], seasonalDiff[index - 2]]);
    targets.push(seasonalDiff[index]);
  }

  const coefficients = fitLinearRegression(features, targets);
  if (!coefficients) return holtWintersForecast(series, steps, seasonLength);

  const [intercept, phi1, phi2] = coefficients;
  const extended = [...series];
  const diffHistory = [...seasonalDiff];
  const output: number[] = [];

  for (let step = 0; step < steps; step += 1) {
    const last1 = diffHistory[diffHistory.length - 1] ?? 0;
    const last2 = diffHistory[diffHistory.length - 2] ?? 0;
    const nextSeasonalDiff = intercept + phi1 * last1 + phi2 * last2;
    const seasonalBaseIndex = extended.length - seasonLength;
    const seasonalBase = seasonalBaseIndex >= 0 ? extended[seasonalBaseIndex] : extended[extended.length - 1] ?? 0;
    const nextValue = clampNonNegative(seasonalBase + nextSeasonalDiff);

    extended.push(nextValue);
    diffHistory.push(nextSeasonalDiff);
    output.push(nextValue);
  }

  return output;
}

type TreeNode =
  | { type: "leaf"; value: number }
  | { type: "node"; featureIndex: number; threshold: number; left: TreeNode; right: TreeNode };

interface RegressionRow {
  features: number[];
  target: number;
}

function meanTarget(rows: RegressionRow[]): number {
  return rows.length === 0 ? 0 : rows.reduce((sum, row) => sum + row.target, 0) / rows.length;
}

function squaredError(rows: RegressionRow[], value: number): number {
  return rows.reduce((sum, row) => {
    const delta = row.target - value;
    return sum + delta * delta;
  }, 0);
}

function buildTree(
  rows: RegressionRow[],
  depth: number,
  maxDepth: number,
  minSamples: number,
  maxFeatures: number,
  random: () => number,
): TreeNode {
  if (rows.length <= minSamples || depth >= maxDepth) {
    return { type: "leaf", value: meanTarget(rows) };
  }

  const featureCount = rows[0]?.features.length ?? 0;
  if (featureCount === 0) {
    return { type: "leaf", value: meanTarget(rows) };
  }

  const featureIndexes = pickUniqueIndices(featureCount, Math.min(maxFeatures, featureCount), random);
  let bestFeature = -1;
  let bestThreshold = 0;
  let bestScore = Number.POSITIVE_INFINITY;
  let bestLeft: RegressionRow[] = [];
  let bestRight: RegressionRow[] = [];

  for (const featureIndex of featureIndexes) {
    const sortedValues = Array.from(new Set(rows.map((row) => row.features[featureIndex]).filter((value) => Number.isFinite(value)))).sort((a, b) => a - b);
    if (sortedValues.length < 2) continue;

    const candidateCount = Math.min(8, sortedValues.length - 1);
    for (let candidate = 1; candidate <= candidateCount; candidate += 1) {
      const thresholdIndex = Math.floor((candidate * (sortedValues.length - 1)) / (candidateCount + 1));
      const threshold = sortedValues[thresholdIndex];
      const left = rows.filter((row) => row.features[featureIndex] <= threshold);
      const right = rows.filter((row) => row.features[featureIndex] > threshold);

      if (left.length === 0 || right.length === 0) continue;

      const leftMean = meanTarget(left);
      const rightMean = meanTarget(right);
      const score = squaredError(left, leftMean) + squaredError(right, rightMean);

      if (score < bestScore) {
        bestScore = score;
        bestFeature = featureIndex;
        bestThreshold = threshold;
        bestLeft = left;
        bestRight = right;
      }
    }
  }

  if (bestFeature === -1) {
    return { type: "leaf", value: meanTarget(rows) };
  }

  return {
    type: "node",
    featureIndex: bestFeature,
    threshold: bestThreshold,
    left: buildTree(bestLeft, depth + 1, maxDepth, minSamples, maxFeatures, random),
    right: buildTree(bestRight, depth + 1, maxDepth, minSamples, maxFeatures, random),
  };
}

function predictTree(node: TreeNode, features: number[]): number {
  if (node.type === "leaf") return node.value;
  if (features[node.featureIndex] <= node.threshold) return predictTree(node.left, features);
  return predictTree(node.right, features);
}

function buildLagFeatures(series: number[], index: number): number[] {
  const lag = (steps: number) => {
    const source = index - steps;
    if (source >= 0) return series[source];
    return series[0] ?? 0;
  };
  const lag1 = lag(1);
  const lag2 = lag(2);
  const lag3 = lag(3);
  const lag6 = lag(6);
  const lag12 = lag(12);
  const rolling3 = (lag1 + lag2 + lag3) / 3;
  const monthIndex = ((index % 12) + 12) % 12;
  const seasonSin = Math.sin((2 * Math.PI * monthIndex) / 12);
  const seasonCos = Math.cos((2 * Math.PI * monthIndex) / 12);
  return [lag1, lag2, lag3, lag6, lag12, rolling3, index, seasonSin, seasonCos];
}

function randomForestForecast(series: number[], steps: number): number[] {
  const minLag = 12;
  if (series.length <= minLag + 2) return holtWintersForecast(series, steps);

  const rows: RegressionRow[] = [];
  for (let index = minLag; index < series.length; index += 1) {
    rows.push({
      features: buildLagFeatures(series, index),
      target: series[index],
    });
  }
  if (rows.length < 10) return holtWintersForecast(series, steps);

  const random = createRng(872341);
  const treeCount = 30;
  const maxDepth = 5;
  const minSamples = 6;
  const featureCount = rows[0].features.length;
  const maxFeatures = Math.max(2, Math.floor(Math.sqrt(featureCount)));
  const trees: TreeNode[] = [];

  for (let treeIndex = 0; treeIndex < treeCount; treeIndex += 1) {
    const bootstrap: RegressionRow[] = [];
    for (let sample = 0; sample < rows.length; sample += 1) {
      bootstrap.push(rows[Math.floor(random() * rows.length)]);
    }
    trees.push(buildTree(bootstrap, 0, maxDepth, minSamples, maxFeatures, random));
  }

  const workingSeries = [...series];
  const output: number[] = [];
  for (let step = 0; step < steps; step += 1) {
    const index = workingSeries.length;
    const features = buildLagFeatures(workingSeries, index);
    const prediction =
      trees.reduce((sum, tree) => sum + predictTree(tree, features), 0) / trees.length;
    const nextValue = clampNonNegative(prediction);
    workingSeries.push(nextValue);
    output.push(nextValue);
  }

  return output;
}

function manualAssumptionForecast(series: number[], steps: number): number[] {
  if (series.length === 0) return Array.from({ length: steps }, () => 0);
  if (series.length === 1) return Array.from({ length: steps }, () => clampNonNegative(series[0]));

  const recent = series.slice(-6);
  const growthRates: number[] = [];
  for (let index = 1; index < recent.length; index += 1) {
    const previous = recent[index - 1];
    const current = recent[index];
    if (previous > 0) growthRates.push((current - previous) / previous);
  }
  const growth = safeAverage(growthRates);

  const output: number[] = [];
  let value = series[series.length - 1];
  for (let step = 0; step < steps; step += 1) {
    value = clampNonNegative(value * (1 + growth));
    output.push(value);
  }
  return output;
}

function runForecastModel(model: ForecastModelName, series: number[], steps: number): number[] {
  switch (model) {
    case "holt_winters":
      return holtWintersForecast(series, steps);
    case "arima":
      return arimaForecast(series, steps);
    case "sarima":
      return sarimaForecast(series, steps);
    case "random_forest":
      return randomForestForecast(series, steps);
    case "manual_assumptions":
    default:
      return manualAssumptionForecast(series, steps);
  }
}

function selectRevenueModel(series: number[], horizon: number): {
  selected_model: ForecastModelName;
  validation_mape_pct: number | null;
  candidates: ForecastModelCandidate[];
  reason: string;
  forecast: number[];
} {
  const informativeMonths = series.filter((value) => value > 0).length;
  const firstPositiveIndex = series.findIndex((value) => value > 0);
  const workingSeries =
    firstPositiveIndex > 1 ? series.slice(firstPositiveIndex - 1) : [...series];

  if (workingSeries.length < 2 || informativeMonths < 6) {
    const forecast = runForecastModel("manual_assumptions", series, horizon);
    return {
      selected_model: "manual_assumptions",
      validation_mape_pct: null,
      candidates: [
        {
          model: "manual_assumptions",
          mape_pct: null,
          status: "used",
        },
      ],
      reason: "Histórico informativo insuficiente para entrenamiento estadístico; se aplicó forecast manual.",
      forecast,
    };
  }

  const validationSize =
    workingSeries.length >= 18 ? Math.min(4, Math.max(2, Math.floor(workingSeries.length * 0.2))) : 1;
  const train = workingSeries.slice(0, workingSeries.length - validationSize);
  const validation = workingSeries.slice(workingSeries.length - validationSize);

  const modelMinimums: Array<{ model: ForecastModelName; minTrain: number }> = [
    { model: "holt_winters", minTrain: 6 },
    { model: "arima", minTrain: 8 },
    { model: "sarima", minTrain: 18 },
    { model: "random_forest", minTrain: 14 },
  ];

  const candidates: ForecastModelCandidate[] = [];
  let selected: { model: ForecastModelName; mape: number } | null = null;

  for (const candidate of modelMinimums) {
    if (train.length < candidate.minTrain) {
      candidates.push({
        model: candidate.model,
        mape_pct: null,
        status: "insufficient_data",
      });
      continue;
    }

    try {
      const prediction = runForecastModel(candidate.model, train, validationSize);
      const mape = calculateMape(validation, prediction);
      if (mape == null || !Number.isFinite(mape)) {
        candidates.push({
          model: candidate.model,
          mape_pct: null,
          status: "failed",
        });
        continue;
      }

      candidates.push({
        model: candidate.model,
        mape_pct: mape,
        status: "used",
      });

      if (!selected || mape < selected.mape) {
        selected = { model: candidate.model, mape };
      }
    } catch {
      candidates.push({
        model: candidate.model,
        mape_pct: null,
        status: "failed",
      });
    }
  }

  const selectedModel = selected?.model ?? "manual_assumptions";
  const finalForecast = runForecastModel(selectedModel, workingSeries, horizon);
  const reason =
    selectedModel === "manual_assumptions"
      ? "No hubo consistencia estadística suficiente; se aplicó forecast manual por tendencia reciente."
      : `Modelo seleccionado por menor MAPE en validación interna: ${selectedModel}.`;

  return {
    selected_model: selectedModel,
    validation_mape_pct: selected?.mape ?? null,
    candidates,
    reason,
    forecast: finalForecast,
  };
}

function applyRevenueOverrides(
  forecast: number[],
  assumptions?: ForecastAssumptionsInput,
): number[] {
  const output = [...forecast];
  const amountOverride =
    assumptions?.revenue_amount != null ? clampNonNegative(toFiniteNumber(assumptions.revenue_amount)) : null;
  const growthOverride =
    assumptions?.revenue_growth_rate != null ? toFiniteNumber(assumptions.revenue_growth_rate) : null;

  if (amountOverride != null && output.length > 0) {
    output[0] = amountOverride;
  }

  if (growthOverride != null && output.length > 1) {
    for (let index = 1; index < output.length; index += 1) {
      output[index] = clampNonNegative(output[index - 1] * (1 + growthOverride / 100));
    }
  }

  return output.map(clampNonNegative);
}

function estimateDrivers(
  monthlyHistory: MonthlyAggregate[],
  assumptions?: ForecastAssumptionsInput,
): ForecastDriverBundle {
  const recent = monthlyHistory.slice(-12);
  const cogsPctHistory = recent
    .filter((entry) => entry.revenue > 0)
    .map((entry) => (entry.cogs / entry.revenue) * 100);

  const fixedHistory = recent.map((entry) => entry.fixedOpex).filter((value) => value > 0);
  const variablePctHistory = recent
    .filter((entry) => entry.revenue > 0 && entry.variableOpex > 0)
    .map((entry) => (entry.variableOpex / entry.revenue) * 100);

  const opexRegressionInput = recent.filter((entry) => entry.revenue > 0 && entry.opex > 0);
  const regressionFeatures = opexRegressionInput.map((entry) => [1, entry.revenue]);
  const regressionTargets = opexRegressionInput.map((entry) => entry.opex);
  const coefficients = fitLinearRegression(regressionFeatures, regressionTargets);
  const regressionFixed = coefficients ? clampNonNegative(coefficients[0]) : null;
  const regressionVariablePct = coefficients ? clampNonNegative(coefficients[1] * 100) : null;

  const cogsAssumption = assumptions?.cogs_percent;
  const fixedAssumption = assumptions?.fixed_opex;
  const variableAssumption = assumptions?.variable_opex_percent;
  const oneOffAssumption = assumptions?.one_off_amount;

  const cogsPercent =
    cogsAssumption != null
      ? clampNonNegative(toFiniteNumber(cogsAssumption))
      : clampNonNegative(safeAverage(cogsPctHistory));

  const fixedOpex =
    fixedAssumption != null
      ? clampNonNegative(toFiniteNumber(fixedAssumption))
      : fixedHistory.length > 0
        ? clampNonNegative(safeAverage(fixedHistory))
        : regressionFixed ?? clampNonNegative(safeAverage(recent.map((entry) => entry.opex)));

  const variableOpexPercent =
    variableAssumption != null
      ? clampNonNegative(toFiniteNumber(variableAssumption))
      : variablePctHistory.length > 0
        ? clampNonNegative(safeAverage(variablePctHistory))
        : regressionVariablePct ?? 0;

  const oneOffAmount =
    oneOffAssumption != null ? clampNonNegative(toFiniteNumber(oneOffAssumption)) : 0;

  return {
    cogs_percent: cogsPercent,
    fixed_opex: fixedOpex,
    variable_opex_percent: variableOpexPercent,
    one_off_amount: oneOffAmount,
    sources: {
      cogs_percent: cogsAssumption != null ? "assumption" : "historical",
      fixed_opex: fixedAssumption != null ? "assumption" : "historical",
      variable_opex_percent: variableAssumption != null ? "assumption" : "historical",
      one_off_amount: oneOffAssumption != null ? "assumption" : "default_zero",
    },
  };
}

function buildMonthlyAggregates(
  targetMonth: string,
  categories: Pick<CategoryGL, "id" | "kind" | "fixed_cost" | "variable_cost">[],
  transactions: Pick<Transaction, "date" | "amount" | "category_gl_id">[],
) {
  const historyStartMonth = addMonths(targetMonth, -LOOKBACK_MONTHS);
  const historyEndMonth = addMonths(targetMonth, -1);
  const months = buildMonthRange(historyStartMonth, historyEndMonth);
  const monthSet = new Set(months);

  const categoryMap = new Map(categories.map((category) => [category.id, category]));
  const aggregates = new Map<string, MonthlyAggregate>(
    months.map((month) => [
      month,
      {
        month,
        revenue: 0,
        cogs: 0,
        opex: 0,
        fixedOpex: 0,
        variableOpex: 0,
      },
    ]),
  );

  for (const transaction of transactions) {
    const month = transaction.date.slice(0, 7);
    if (!monthSet.has(month)) continue;
    if (!transaction.category_gl_id) continue;

    const category = categoryMap.get(transaction.category_gl_id);
    if (!category) continue;

    const bucket = aggregates.get(month);
    if (!bucket) continue;

    const amount = clampNonNegative(Math.abs(toFiniteNumber(transaction.amount)));
    if (category.kind === "revenue") {
      bucket.revenue += amount;
    } else if (category.kind === "cogs") {
      bucket.cogs += amount;
    } else if (category.kind === "opex") {
      bucket.opex += amount;
      if (category.fixed_cost) bucket.fixedOpex += amount;
      if (category.variable_cost) bucket.variableOpex += amount;
      if (!category.fixed_cost && !category.variable_cost) bucket.fixedOpex += amount;
    }
  }

  const monthlyHistory = months.map((month) => aggregates.get(month)!);
  const historyMonthsWithData = monthlyHistory.filter(
    (entry) => entry.revenue > 0 || entry.cogs > 0 || entry.opex > 0,
  ).length;

  return {
    historyStartMonth,
    historyEndMonth,
    monthlyHistory,
    historyMonthsWithData,
  };
}

export function computeBusinessForecast(input: ForecastComputationInput): ForecastComputationResult {
  const horizonMonths = [3, 6, 12].includes(input.horizonMonths)
    ? input.horizonMonths
    : DEFAULT_HORIZON;

  const { historyStartMonth, historyEndMonth, monthlyHistory, historyMonthsWithData } =
    buildMonthlyAggregates(input.targetMonth, input.categories, input.transactions);

  const revenueSeries = monthlyHistory.map((entry) => entry.revenue);
  const modelSelection = selectRevenueModel(revenueSeries, horizonMonths);
  const revenueForecast = applyRevenueOverrides(modelSelection.forecast, input.assumptions);
  const drivers = estimateDrivers(monthlyHistory, input.assumptions);

  const projections: ForecastProjection[] = revenueForecast.map((revenue, index) => {
    const month = addMonths(input.targetMonth, index);
    const cogs = revenue * (drivers.cogs_percent / 100);
    const variableOpex = revenue * (drivers.variable_opex_percent / 100);
    const oneOff = index === 0 ? drivers.one_off_amount : 0;
    const opex = drivers.fixed_opex + variableOpex + oneOff;
    const ebit = revenue - cogs - opex;
    const operatingMargin = revenue > 0 ? (ebit / revenue) * 100 : 0;

    return {
      month,
      revenue: clampNonNegative(revenue),
      cogs: clampNonNegative(cogs),
      opex: clampNonNegative(opex),
      ebit,
      operating_margin_pct: operatingMargin,
    };
  });

  const itemsUsed = [
    `${historyMonthsWithData} meses con datos reales de transacciones (ventana máxima ${LOOKBACK_MONTHS} meses).`,
    "Clasificación contable por categorías GL: Revenue, COGS y OPEX.",
    "Descomposición de OPEX fijo/variable según categorías marcadas.",
    "Supuestos manuales del periodo como override (si están definidos).",
  ];

  return {
    model: {
      selected_model: modelSelection.selected_model,
      validation_mape_pct: modelSelection.validation_mape_pct,
      history_months: historyMonthsWithData,
      horizon_months: horizonMonths,
      reason: modelSelection.reason,
      candidates: modelSelection.candidates,
    },
    drivers,
    projections,
    history: {
      history_start_month: historyStartMonth,
      history_end_month: historyEndMonth,
      history_months_total: monthlyHistory.length,
      history_months_with_data: historyMonthsWithData,
    },
    items_used: itemsUsed,
  };
}
