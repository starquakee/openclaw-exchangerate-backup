import type { OpenClawConfig } from "openclaw/plugin-sdk/config-runtime";
import {
  DEFAULT_EXCHANGERATE_BASE_URL,
  resolveExchangeRateApiKey,
  resolveExchangeRateBaseUrl,
} from "./config.js";

export type ExchangeRateQueryParams = {
  cfg?: OpenClawConfig;
  baseCurrency: string;
  targetCurrency: string;
  amount?: number;
};

export type ExchangeRateQueryResult = {
  provider: "exchangerate-api";
  baseCurrency: string;
  targetCurrency: string;
  amount?: number;
  exchangeRate: number;
  convertedAmount?: number;
  timeLastUpdateUnix?: number;
  timeLastUpdateUtc?: string;
  timeNextUpdateUnix?: number;
  timeNextUpdateUtc?: string;
};

type ExchangeRateSuccessPayload = {
  result: "success";
  time_last_update_unix?: number;
  time_last_update_utc?: string;
  time_next_update_unix?: number;
  time_next_update_utc?: string;
  base_code?: string;
  target_code?: string;
  conversion_rate?: number;
  conversion_result?: number;
};

type ExchangeRateErrorPayload = {
  result: "error";
  "error-type"?: string;
};

function normalizeCurrencyCode(value: string): string {
  return value.trim().toUpperCase();
}

function formatAmountPathSegment(amount: number): string {
  if (!Number.isFinite(amount)) {
    throw new Error("Amount must be a finite number.");
  }
  return String(amount);
}

export function resolveEndpoint(baseUrl: string, relativePath: string): string {
  const fallback = new URL(relativePath.replace(/^\//, ""), `${DEFAULT_EXCHANGERATE_BASE_URL}/`);
  const trimmed = baseUrl.trim();
  if (!trimmed) {
    return fallback.toString();
  }
  try {
    const resolvedBase = new URL(trimmed.endsWith("/") ? trimmed : `${trimmed}/`);
    return new URL(relativePath.replace(/^\//, ""), resolvedBase).toString();
  } catch {
    return fallback.toString();
  }
}

export function parseExchangeRatePayload(params: {
  payload: Record<string, unknown>;
  baseCurrency: string;
  targetCurrency: string;
  amount?: number;
}): ExchangeRateQueryResult {
  const payload = params.payload as ExchangeRateSuccessPayload | ExchangeRateErrorPayload;
  if (payload.result !== "success") {
    const errorType =
      typeof (payload as ExchangeRateErrorPayload)["error-type"] === "string"
        ? (payload as ExchangeRateErrorPayload)["error-type"]
        : "unknown-error";
    throw new Error(`ExchangeRate-API error: ${errorType}`);
  }

  if (
    typeof payload.base_code !== "string" ||
    typeof payload.target_code !== "string" ||
    typeof payload.conversion_rate !== "number"
  ) {
    throw new Error("ExchangeRate-API returned an unexpected payload.");
  }

  if (
    payload.base_code !== params.baseCurrency ||
    payload.target_code !== params.targetCurrency
  ) {
    throw new Error("ExchangeRate-API returned mismatched currency codes.");
  }

  return {
    provider: "exchangerate-api",
    baseCurrency: payload.base_code,
    targetCurrency: payload.target_code,
    amount: params.amount,
    exchangeRate: payload.conversion_rate,
    convertedAmount:
      typeof payload.conversion_result === "number" ? payload.conversion_result : undefined,
    timeLastUpdateUnix:
      typeof payload.time_last_update_unix === "number" ? payload.time_last_update_unix : undefined,
    timeLastUpdateUtc:
      typeof payload.time_last_update_utc === "string" ? payload.time_last_update_utc : undefined,
    timeNextUpdateUnix:
      typeof payload.time_next_update_unix === "number" ? payload.time_next_update_unix : undefined,
    timeNextUpdateUtc:
      typeof payload.time_next_update_utc === "string" ? payload.time_next_update_utc : undefined,
  };
}

export async function runExchangeRateQuery(
  params: ExchangeRateQueryParams,
): Promise<ExchangeRateQueryResult> {
  const apiKey = resolveExchangeRateApiKey(params.cfg);
  if (!apiKey) {
    throw new Error(
      "exchangerate_convert needs an ExchangeRate-API key. Set EXCHANGERATE_API_KEY in the gateway environment, or configure plugins.entries.openclaw-exchangerate.config.apiKey.",
    );
  }

  const baseCurrency = normalizeCurrencyCode(params.baseCurrency);
  const targetCurrency = normalizeCurrencyCode(params.targetCurrency);
  const endpointPath =
    params.amount === undefined
      ? `${apiKey}/pair/${baseCurrency}/${targetCurrency}`
      : `${apiKey}/pair/${baseCurrency}/${targetCurrency}/${formatAmountPathSegment(params.amount)}`;
  const response = await fetch(resolveEndpoint(resolveExchangeRateBaseUrl(params.cfg), endpointPath), {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`ExchangeRate-API request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as Record<string, unknown>;
  return parseExchangeRatePayload({
    payload,
    baseCurrency,
    targetCurrency,
    amount: params.amount,
  });
}

export const __testing = {
  parseExchangeRatePayload,
  resolveEndpoint,
};
