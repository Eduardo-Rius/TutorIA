import { describe, it, expect, vi } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("H1R9-F.8.3.4.2 — Deployment Artifact Self-Containment Regression", () => {
  const libDir = path.resolve(__dirname, "../lib");
  const indexPath = path.join(libDir, "index.js");

  it("1. lib/index.js exists and is a non-empty build artifact", () => {
    expect(fs.existsSync(indexPath)).toBe(true);
    const stat = fs.statSync(indexPath);
    expect(stat.size).toBeGreaterThan(1000); // Bundled code should be > 1 KB
  });

  it("2. Static inspection: Zero runtime imports resolve outside functions/", () => {
    const code = fs.readFileSync(indexPath, "utf8");

    // Matches any ES import statements
    const importRegex = /import\s+(?:{[^}]+}|[^{;\n]+)\s+from\s+['"]([^'"]+)['"]/g;
    const imports: string[] = [];
    let match;
    while ((match = importRegex.exec(code)) !== null) {
      imports.push(match[1]);
    }

    // Every import must either be an external npm package (firebase-functions/...) or local within lib
    for (const specifier of imports) {
      expect(specifier).not.toMatch(/^\.\.\/\.\.\/src/);
      expect(specifier).not.toMatch(/^\.\.\/src/);
      expect(specifier).not.toMatch(/tutoria-app\/src/);
      expect(specifier).not.toMatch(/\/src\//);

      // Must be an external module or relative within lib
      const isExternalPackage = !specifier.startsWith(".");
      const isRelativeWithinLib = specifier.startsWith("./");
      expect(isExternalPackage || isRelativeWithinLib).toBe(true);
    }
  });

  it("3. Static inspection: Canonical catalog is bundled as build output (single source of truth)", () => {
    const code = fs.readFileSync(indexPath, "utf8");

    // Bundled revision string
    expect(code).toContain("TUTORIA-DIRECT-PDA-CATALOG-R1");

    // Bundled canonical items
    expect(code).toContain("TUTORIA-PDA-0001");
    expect(code).toContain("TUTORIA-PDA-0040");
  });

  it("4. Native Node dynamic load: index.js loads successfully without ERR_MODULE_NOT_FOUND", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    // Load bundled module dynamically
    const bundledModule = await import(indexPath);

    // Verify expected exports
    expect(bundledModule).toBeDefined();
    expect(bundledModule.recommendCurricularPDA).toBeDefined();
    expect(typeof bundledModule.handleRecommendCurricularPDA).toBe("function");
    expect(typeof bundledModule.validateGatewayPayload).toBe("function");
    expect(typeof bundledModule.defaultProductionAuthorizer).toBe("function");
    expect(typeof bundledModule.defaultProductionExecutor).toBe("function");
    expect(bundledModule.MAX_PAYLOAD_BYTES).toBe(10240);
    expect(bundledModule.MAX_TEXT_FIELD_LENGTH).toBe(500);

    // Zero remote network calls upon loading
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("5. H1R10.7: Deployment artifact exports openAIApiKey and binds OPENAI_API_KEY to callable", async () => {
    const bundledModule = await import(indexPath);

    // Verify openAIApiKey export
    expect(bundledModule.openAIApiKey).toBeDefined();
    expect(bundledModule.openAIApiKey.name).toBe("OPENAI_API_KEY");

    // Verify callable secret binding in endpoint metadata
    const fn = bundledModule.recommendCurricularPDA;
    expect(fn).toBeDefined();
    expect(fn.__endpoint?.secretEnvironmentVariables).toContainEqual({ key: "OPENAI_API_KEY" });
    expect(fn.__trigger?.secrets?.some((s: any) => s?.name === "OPENAI_API_KEY" || s === "OPENAI_API_KEY")).toBe(true);
  });

  it("6. H1R10.7: Deployment artifact contains zero embedded real secrets or credentials", () => {
    const code = fs.readFileSync(indexPath, "utf8");

    // Must not contain any real API key patterns or private keys
    expect(code).not.toMatch(/sk-[a-zA-Z0-9_-]{20,}/);
    expect(code).not.toContain("-----BEGIN PRIVATE KEY-----");
    expect(code).not.toContain("-----BEGIN RSA PRIVATE KEY-----");
    expect(code).not.toContain("client_secret");

    // Secret parameter name is present as metadata, but no secret value
    expect(code).toContain('"OPENAI_API_KEY"');
  });
});
