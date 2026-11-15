import { describe, expect, it } from "vitest";
import {
  citationExists,
  countWords,
  diffWords,
  excerpt,
  readingTimeMinutes,
  stripMarkdown,
} from "../src/text";

describe("countWords", () => {
  it("compte les mots français avec apostrophes et tirets", () => {
    expect(countWords("L'ombre d'une rose ancienne, là-bas.")).toBe(5);
  });

  it("ignore les marqueurs Markdown", () => {
    expect(countWords("**Bleu** nuit et *or* ancien")).toBe(5);
  });

  it("retourne 0 sur un texte vide", () => {
    expect(countWords("")).toBe(0);
  });
});

describe("readingTimeMinutes", () => {
  it("compte au moins une minute pour un texte non vide", () => {
    expect(readingTimeMinutes(12)).toBe(1);
  });

  it("arrondit selon 220 mots/minute", () => {
    expect(readingTimeMinutes(660)).toBe(3);
  });
});

describe("stripMarkdown", () => {
  it("retire titres, emphases et citations", () => {
    expect(stripMarkdown("# Titre\n> **citation** ici")).toBe("Titre\ncitation ici");
  });
});

describe("excerpt", () => {
  it("tronque proprement sur un mot", () => {
    const result = excerpt("a".repeat(10) + " " + "b".repeat(200), 40);
    expect(result.endsWith("…")).toBe(true);
    expect(result.length).toBeLessThanOrEqual(41);
  });
});

describe("diffWords", () => {
  it("identifie ajouts et suppressions", () => {
    const parts = diffWords("Le ciel est bleu.", "Le ciel est très bleu.");
    expect(parts.some((p) => p.type === "add" && p.value.includes("très"))).toBe(true);
    expect(parts.filter((p) => p.type === "equal").length).toBeGreaterThan(0);
  });
});

describe("citationExists", () => {
  const manuscript = "La bibliothèque sentait la cire et le vieux papier.";
  it("accepte une citation exacte aux espaces près", () => {
    expect(citationExists("la bibliothèque sentait la cire", manuscript)).toBe(true);
  });
  it("refuse une citation inventée", () => {
    expect(citationExists("La bibliothèque sentait la rose", manuscript)).toBe(false);
  });
});
