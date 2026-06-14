export type ModelApiSettings = {
  baseUrl: string;
  model: string;
  apiKey: string;
  temperature: number;
  topP: number;
  maxTokens: number;
};

export const DEFAULT_MODEL_API_SETTINGS: ModelApiSettings = {
  baseUrl: "",
  model: "",
  apiKey: "",
  temperature: 0.8,
  topP: 0.95,
  maxTokens: 1200,
};

export function normalizeModelApiSettings(
  settings: Partial<ModelApiSettings>
): ModelApiSettings {
  return {
    baseUrl: typeof settings.baseUrl === "string" ? settings.baseUrl.trim() : "",
    model: typeof settings.model === "string" ? settings.model.trim() : "",
    apiKey: typeof settings.apiKey === "string" ? settings.apiKey.trim() : "",
    temperature: clampNumber(settings.temperature, 0, 2, 0.8),
    topP: clampNumber(settings.topP, 0, 1, 0.95),
    maxTokens: Math.round(clampNumber(settings.maxTokens, 1, 8192, 1200)),
  };
}

function clampNumber(
  value: unknown,
  min: number,
  max: number,
  fallback: number
) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}
