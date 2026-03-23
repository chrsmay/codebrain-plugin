import { readFile, writeFile, mkdir, readdir, stat, unlink } from "node:fs/promises";
import { join, dirname, relative, extname } from "node:path";
import { existsSync } from "node:fs";

/**
 * File-based storage for .codebrain/ directory.
 * All paths are relative to the project's .codebrain/ root.
 */
export class FileStore {
  constructor(private root: string) {}

  private resolve(relPath: string): string {
    const full = join(this.root, relPath);
    // Prevent path traversal
    if (!full.startsWith(this.root)) {
      throw new Error(`Path traversal blocked: ${relPath}`);
    }
    return full;
  }

  async read(relPath: string): Promise<{ content: string; lastModified: string; size: number }> {
    const full = this.resolve(relPath);
    const content = await readFile(full, "utf-8");
    const s = await stat(full);
    return { content, lastModified: s.mtime.toISOString(), size: s.size };
  }

  async write(relPath: string, content: string): Promise<void> {
    const full = this.resolve(relPath);
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, content, "utf-8");
  }

  async exists(relPath: string): Promise<boolean> {
    return existsSync(this.resolve(relPath));
  }

  async list(dir: string, pattern?: string): Promise<Array<{ path: string; type: string; lastModified: string; size: number }>> {
    const full = this.resolve(dir);
    if (!existsSync(full)) return [];

    const entries: Array<{ path: string; type: string; lastModified: string; size: number }> = [];
    await this.walkDir(full, dir, pattern, entries);
    return entries;
  }

  private async walkDir(
    absDir: string,
    relDir: string,
    pattern: string | undefined,
    results: Array<{ path: string; type: string; lastModified: string; size: number }>
  ): Promise<void> {
    const items = await readdir(absDir, { withFileTypes: true });
    for (const item of items) {
      const relPath = join(relDir, item.name);
      if (item.isDirectory()) {
        await this.walkDir(join(absDir, item.name), relPath, pattern, results);
      } else if (item.isFile()) {
        if (pattern && !this.matchGlob(item.name, pattern)) continue;
        const s = await stat(join(absDir, item.name));
        results.push({
          path: relPath,
          type: this.inferType(relPath),
          lastModified: s.mtime.toISOString(),
          size: s.size,
        });
      }
    }
  }

  async delete(relPath: string): Promise<void> {
    const full = this.resolve(relPath);
    await unlink(full);
  }

  async readJson<T>(relPath: string): Promise<T> {
    const { content } = await this.read(relPath);
    return JSON.parse(content) as T;
  }

  async writeJson(relPath: string, data: unknown): Promise<void> {
    await this.write(relPath, JSON.stringify(data, null, 2) + "\n");
  }

  private inferType(relPath: string): string {
    if (relPath.includes("/specs/")) return "spec";
    if (relPath.includes("/tickets/")) return "ticket";
    if (relPath.includes("/executions/")) return "execution";
    if (relPath.includes("/reviews/")) return "review";
    if (relPath.includes("/memory/")) return "memory";
    if (relPath.includes("decisions")) return "decision";
    if (relPath.includes("epic.md")) return "epic";
    if (relPath.includes("plan.md")) return "plan";
    if (relPath.includes("verification.md")) return "verification";
    return "artifact";
  }

  private matchGlob(filename: string, pattern: string): boolean {
    const regex = pattern.replace(/\*/g, ".*").replace(/\?/g, ".");
    return new RegExp(`^${regex}$`).test(filename);
  }
}

/** Find the .codebrain root by walking up from cwd. */
export function findCodebrainRoot(): string {
  let dir = process.cwd();
  while (dir !== "/") {
    if (existsSync(join(dir, ".codebrain"))) {
      return join(dir, ".codebrain");
    }
    dir = dirname(dir);
  }
  // Default to cwd/.codebrain (will be created by scaffold)
  return join(process.cwd(), ".codebrain");
}
