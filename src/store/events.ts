import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const STORE_DIR = join(homedir(), ".monnify");
const STORE_PATH = join(STORE_DIR, "events.jsonl");

export interface StoredEvent {
  id: string;
  deliveredAt: string;
  source: "trigger" | "replay" | "listen";
  eventType: string;
  target: string;
  payload: Record<string, unknown>;
  responseStatus?: number;
}

export function appendEvent(event: Omit<StoredEvent, "id" | "deliveredAt">): StoredEvent {
  mkdirSync(STORE_DIR, { recursive: true });
  const full: StoredEvent = {
    id: randomUUID().slice(0, 8),
    deliveredAt: new Date().toISOString(),
    ...event,
  };
  appendFileSync(STORE_PATH, JSON.stringify(full) + "\n", "utf8");
  return full;
}

export function readEvents(): StoredEvent[] {
  if (!existsSync(STORE_PATH)) return [];
  return readFileSync(STORE_PATH, "utf8")
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as StoredEvent);
}
