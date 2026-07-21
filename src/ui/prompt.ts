import { createInterface } from "node:readline/promises";
import pc from "picocolors";

export function isInteractive(): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

/** Plain-text prompt with optional default value. */
export async function prompt(label: string, defaultValue?: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const suffix = defaultValue ? pc.dim(` (${defaultValue})`) : "";
  try {
    const answer = (await rl.question(`${pc.bold(label)}${suffix}: `)).trim();
    return answer || defaultValue || "";
  } finally {
    rl.close();
  }
}

/** Masked prompt — input echoes as dots, never appears in the terminal or shell history. */
export function promptSecret(label: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const { stdin, stdout } = process;
    stdout.write(`${pc.bold(label)}: `);
    const wasRaw = stdin.isRaw ?? false;
    stdin.setRawMode?.(true);
    stdin.resume();
    let value = "";

    const cleanup = () => {
      stdin.off("data", onData);
      stdin.setRawMode?.(wasRaw);
      stdin.pause();
    };

    const onData = (chunk: Buffer) => {
      for (const ch of chunk.toString("utf8")) {
        if (ch === "\r" || ch === "\n") {
          cleanup();
          stdout.write("\n");
          resolve(value);
          return;
        }
        if (ch === "") {
          // Ctrl+C
          cleanup();
          stdout.write("\n");
          reject(new Error("Cancelled."));
          return;
        }
        if (ch === "" || ch === "\b") {
          if (value.length > 0) {
            value = value.slice(0, -1);
            stdout.write("\b \b");
          }
          continue;
        }
        if (ch >= " ") {
          value += ch;
          stdout.write("•");
        }
      }
    };

    stdin.on("data", onData);
  });
}

/** Mask a credential for display: MK_TEST_SU•••••45 style. */
export function mask(value: string, visibleStart = 8, visibleEnd = 2): string {
  if (value.length <= visibleStart + visibleEnd) return value.slice(0, 4) + "•••";
  return `${value.slice(0, visibleStart)}${"•".repeat(6)}${value.slice(-visibleEnd)}`;
}
