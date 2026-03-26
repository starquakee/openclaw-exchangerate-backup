import type { OpenClawConfig } from "openclaw/plugin-sdk/config-runtime";
import { normalizeSecretInput } from "openclaw/plugin-sdk/provider-auth";
import { normalizeResolvedSecretInputString } from "openclaw/plugin-sdk/secret-input";

export const DEFAULT_EXCHANGERATE_BASE_URL = "https://v6.exchangerate-api.com/v6";

type ExchangeRatePluginConfig =
  | {
      apiKey?: unknown;
      baseUrl?: string;
    }
  | undefined;

export function resolveExchangeRateConfig(cfg?: OpenClawConfig): ExchangeRatePluginConfig {
  const pluginConfig = cfg?.plugins?.entries?.["openclaw-exchangerate"]?.config;
  if (pluginConfig && typeof pluginConfig === "object" && !Array.isArray(pluginConfig)) {
    return pluginConfig as ExchangeRatePluginConfig;
  }
  return undefined;
}

function normalizeConfiguredSecret(value: unknown, path: string): string | undefined {
  return normalizeSecretInput(
    normalizeResolvedSecretInputString({
      value,
      path,
    }),
  );
}

export function resolveExchangeRateApiKey(cfg?: OpenClawConfig): string | undefined {
  const pluginConfig = resolveExchangeRateConfig(cfg);
  return (
    normalizeConfiguredSecret(
      pluginConfig?.apiKey,
      "plugins.entries.openclaw-exchangerate.config.apiKey",
    ) ||
    normalizeSecretInput(process.env.EXCHANGERATE_API_KEY) ||
    undefined
  );
}

export function resolveExchangeRateBaseUrl(cfg?: OpenClawConfig): string {
  const pluginConfig = resolveExchangeRateConfig(cfg);
  const configured =
    (typeof pluginConfig?.baseUrl === "string" ? pluginConfig.baseUrl.trim() : "") ||
    normalizeSecretInput(process.env.EXCHANGERATE_API_BASE_URL) ||
    "";
  return configured || DEFAULT_EXCHANGERATE_BASE_URL;
}
