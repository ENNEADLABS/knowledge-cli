import { describe, expect, it } from "vitest";
import { matchGlob } from "./glob.mjs";

describe("matchGlob", () => {
  it("matche un wildcard simple sans traverser un segment de chemin", () => {
    expect(matchGlob("foo.ts", "*.ts")).toBe(true);
    expect(matchGlob("src/foo.ts", "*.ts")).toBe(false);
  });

  it("matche **/ au milieu d'un pattern, avec ou sans sous-dossier", () => {
    const pattern = "src/lib/services/**/*.ts";
    expect(matchGlob("src/lib/services/tagService.ts", pattern)).toBe(true);
    expect(matchGlob("src/lib/services/email-sync/gmail-driver.ts", pattern)).toBe(true);
    expect(matchGlob("src/components/tagService.ts", pattern)).toBe(false);
  });

  it("matche **/*.ts a la racine (** optionnel)", () => {
    expect(matchGlob("index.ts", "**/*.ts")).toBe(true);
    expect(matchGlob("a/b/index.ts", "**/*.ts")).toBe(true);
  });

  it("matche ** en fin de pattern (tout ce qui suit, y compris imbrique)", () => {
    expect(matchGlob("supabase/migrations/0001_init.sql", "supabase/migrations/**")).toBe(true);
    expect(matchGlob("supabase/migrations/sub/x.sql", "supabase/migrations/**")).toBe(true);
    expect(matchGlob("supabase/seed.sql", "supabase/migrations/**")).toBe(false);
  });

  it("matche une alternance {a,b,c}", () => {
    const pattern = "src/lib/services/{quote,invoice}*.ts";
    expect(matchGlob("src/lib/services/quoteService.ts", pattern)).toBe(true);
    expect(matchGlob("src/lib/services/invoiceLifecycleService.ts", pattern)).toBe(true);
    expect(matchGlob("src/lib/services/productService.ts", pattern)).toBe(false);
  });

  it("matche un wildcard imbrique a l'interieur d'une alternance {a,b/**}", () => {
    const pattern = "src/db/{schema.ts,migrations/**}";
    expect(matchGlob("src/db/schema.ts", pattern)).toBe(true);
    expect(matchGlob("src/db/migrations/0000_init.sql", pattern)).toBe(true);
    expect(matchGlob("src/db/seed.ts", pattern)).toBe(false);
  });
});
