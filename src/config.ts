import { mkdirSync, readFileSync, writeFileSync, chmodSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { z } from "zod";

const CONFIG_DIR = join(homedir(), ".monnify");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

export const ConfigSchema = z.object({
  apiKey: z.string().startsWith("MK_TEST_", {
    message: "Only sandbox keys (MK_TEST_...) are accepted. This tool never touches production.",
  }),
  secretKey: z.string().min(1),
  contractCode: z.string().min(1),
});

export type Config = z.infer<typeof ConfigSchema>;

export function saveConfig(config: Config): void {
  ConfigSchema.parse(config);
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf8");
  chmodSync(CONFIG_PATH, 0o600);
}

export function loadConfig(): Config {
  if (!existsSync(CONFIG_PATH)) {
    throw new Error(
      `No config found. Run \`monnify login\` first (keys: app.monnify.com → Developer → API Keys).`
    );
  }
  return ConfigSchema.parse(JSON.parse(readFileSync(CONFIG_PATH, "utf8")));
}

export const configPath = CONFIG_PATH;
