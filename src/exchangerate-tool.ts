import { Type } from "@sinclair/typebox";
import { readNumberParam, readStringParam, textResult } from "openclaw/plugin-sdk/agent-runtime";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk/plugin-entry";
import { runExchangeRateQuery } from "./exchangerate-client.js";

const ExchangeRateToolSchema = Type.Object(
  {
    base_currency: Type.String({
      description: "Base currency code in ISO 4217 format, for example USD or EUR.",
    }),
    target_currency: Type.String({
      description: "Target currency code in ISO 4217 format, for example CNY or JPY.",
    }),
    amount: Type.Optional(
      Type.Number({
        description:
          "Optional amount in the base currency. If omitted, return only the latest exchange rate.",
        exclusiveMinimum: 0,
      }),
    ),
  },
  { additionalProperties: false },
);

function formatDecimal(value: number): string {
  if (!Number.isFinite(value)) {
    return String(value);
  }
  if (Number.isInteger(value)) {
    return String(value);
  }
  return value.toFixed(6).replace(/\.?0+$/, "");
}

function buildResultText(params: {
  baseCurrency: string;
  targetCurrency: string;
  exchangeRate: number;
  amount?: number;
  convertedAmount?: number;
  timeLastUpdateUtc?: string;
  timeNextUpdateUtc?: string;
}): string {
  const rateLine = `1 ${params.baseCurrency} = ${formatDecimal(params.exchangeRate)} ${params.targetCurrency}`;
  if (
    typeof params.amount === "number" &&
    typeof params.convertedAmount === "number" &&
    Number.isFinite(params.amount)
  ) {
    const convertedLine = `${formatDecimal(params.amount)} ${params.baseCurrency} = ${formatDecimal(params.convertedAmount)} ${params.targetCurrency}`;
    const lastUpdated = params.timeLastUpdateUtc ? ` Last updated: ${params.timeLastUpdateUtc}.` : "";
    const nextUpdate = params.timeNextUpdateUtc ? ` Next update: ${params.timeNextUpdateUtc}.` : "";
    return `${convertedLine} at ${rateLine}.${lastUpdated}${nextUpdate}`.trim();
  }

  const lastUpdated = params.timeLastUpdateUtc ? ` Last updated: ${params.timeLastUpdateUtc}.` : "";
  const nextUpdate = params.timeNextUpdateUtc ? ` Next update: ${params.timeNextUpdateUtc}.` : "";
  return `${rateLine}.${lastUpdated}${nextUpdate}`.trim();
}

export function createExchangeRateTool(api: OpenClawPluginApi) {
  return {
    name: "exchangerate_convert",
    label: "ExchangeRate Convert",
    description:
      "Look up the latest exchange rate between two currencies, and optionally convert an amount.",
    parameters: ExchangeRateToolSchema,
    execute: async (_toolCallId: string, rawParams: Record<string, unknown>) => {
      const baseCurrency = readStringParam(rawParams, "base_currency", { required: true });
      const targetCurrency = readStringParam(rawParams, "target_currency", { required: true });
      const amount = readNumberParam(rawParams, "amount");
      const details = await runExchangeRateQuery({
        cfg: api.config,
        baseCurrency,
        targetCurrency,
        amount,
      });
      return textResult(
        buildResultText({
          baseCurrency: details.baseCurrency,
          targetCurrency: details.targetCurrency,
          exchangeRate: details.exchangeRate,
          amount: details.amount,
          convertedAmount: details.convertedAmount,
          timeLastUpdateUtc: details.timeLastUpdateUtc,
          timeNextUpdateUtc: details.timeNextUpdateUtc,
        }),
        details,
      );
    },
  };
}
