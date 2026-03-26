import type { OpenClawPluginApi, AnyAgentTool } from "openclaw/plugin-sdk/plugin-entry";
import { createExchangeRateTool } from "./src/exchangerate-tool.js";

export default {
  id: "openclaw-exchangerate",
  name: "OpenClaw ExchangeRate",
  description: "Exchange-rate lookup and currency conversion tool.",
  register(api: OpenClawPluginApi) {
    api.registerTool(createExchangeRateTool(api) as AnyAgentTool);
  },
};
