import { Command } from "commander";
import pc from "picocolors";
import { ERROR_REFERENCE, CATEGORIES, type ErrorEntry } from "../data/errors.js";

/** Simple word-overlap scoring — no dependencies, good enough for ~100 entries. */
function score(query: string, entry: ErrorEntry): number {
  const q = query.toLowerCase().trim();
  const errorText = entry.error.toLowerCase();
  const meaningText = entry.meaning.toLowerCase();

  // Exact code match (e.g. "D05", "R2", "99") wins outright
  if (errorText === q) return 1000;
  // Substring matching only for real messages — short codes cause false hits
  const isCode = /^[a-z]?\d+$/i.test(entry.error);
  if (!isCode && (errorText.includes(q) || (q.length > 6 && q.includes(errorText)))) {
    return 500 + errorText.length;
  }

  const words = q.split(/\s+/).filter((w) => w.length > 2);
  if (words.length === 0) return 0;
  let s = 0;
  for (const w of words) {
    if (errorText.includes(w)) s += 10;
    if (meaningText.includes(w)) s += 3;
  }
  return s;
}

function printEntry(entry: ErrorEntry): void {
  console.log(`${pc.bold(entry.error)} ${pc.dim(`(${entry.category})`)}`);
  console.log(`  ${entry.meaning}`);
  console.log(`  ${pc.green("→")} ${entry.action}\n`);
}

export const explainCommand = new Command("explain")
  .description("Look up a Monnify error message or code and what to do about it")
  .argument("[query...]", "Error message or code, e.g. D05, R2, \"duplicate reference\"")
  .option("--category <name>", "Filter by category (partial match)")
  .option("--list", "List all categories")
  .action((queryParts: string[], opts: { category?: string; list?: boolean }) => {
    if (opts.list) {
      console.log(pc.bold("Error categories:\n"));
      for (const c of CATEGORIES) {
        const count = ERROR_REFERENCE.filter((e) => e.category === c).length;
        console.log(`  ${c} ${pc.dim(`(${count})`)}`);
      }
      return;
    }

    let pool = ERROR_REFERENCE;
    if (opts.category) {
      const cat = opts.category.toLowerCase();
      pool = pool.filter((e) => e.category.toLowerCase().includes(cat));
      if (pool.length === 0) {
        throw new Error(`No category matching "${opts.category}". Run \`monnify explain --list\`.`);
      }
    }

    const query = (queryParts ?? []).join(" ").trim();
    if (!query) {
      if (opts.category) {
        for (const e of pool) printEntry(e);
        return;
      }
      console.log('Usage: monnify explain <error message or code>\n');
      console.log('Examples:');
      console.log('  monnify explain D05');
      console.log('  monnify explain "duplicate payment reference"');
      console.log('  monnify explain --category refund');
      console.log('  monnify explain --list');
      return;
    }

    const ranked = pool
      .map((entry) => ({ entry, s: score(query, entry) }))
      .filter((r) => r.s > 0)
      .sort((a, b) => b.s - a.s)
      .slice(0, 5);

    if (ranked.length === 0) {
      console.log(`No match for "${query}".`);
      console.log(pc.dim("Try fewer words, or browse with `monnify explain --category <name>` / `--list`."));
      console.log(pc.dim("Full reference: developers.monnify.com/docs/error-codes"));
      process.exitCode = 1;
      return;
    }

    console.log();
    for (const { entry } of ranked) printEntry(entry);
    console.log(pc.dim(`Source: developers.monnify.com/docs/error-codes`));
  });
