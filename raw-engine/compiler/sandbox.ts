export interface VirtualFile {
  path: string;
  content: string;
}

export interface SandboxProject {
  id: string;
  name: string;
  files: Record<string, string>;
}

export class RawSandboxEngine {
  /**
   * Produces an offline HTML/CSS/JavaScript preview. React and TypeScript
   * projects need a local build worker and are rejected rather than loaded
   * from a third-party CDN.
   */
  static compileToBundle(files: Record<string, string>): string {
    if (Object.keys(files).some((file) => /\.(tsx?|jsx)$/.test(file))) {
      throw new Error("React and TypeScript previews require a configured local build worker.");
    }

    const html = files["index.html"];
    if (!html) throw new Error("The preview needs an index.html entry file.");

    const style = files["styles.css"]?.replace(/<\/style/gi, "<\\/style");
    const script = files["script.js"]?.replace(/<\/script/gi, "<\\/script");
    let document = html;
    if (!/<html[\s>]/i.test(document)) {
      document = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>${document}</body></html>`;
    }

    if (style) {
      document = document.replace(
        /<\/head>/i,
        `<style>${style}</style></head>`
      );
    }
    if (script) {
      document = document.replace(
        /<\/body>/i,
        `<script>${script}</script></body>`
      );
    }
    return document;
  }

  /**
   * Generates a zip bundle array for direct local project export.
   */
  static generateProjectExport(project: SandboxProject): Record<string, string> {
    return {
      'package.json': JSON.stringify({
        name: project.name.toLowerCase().replace(/\s+/g, '-'),
        version: '1.0.0',
        dependencies: {
          react: '^18.2.0',
          'react-dom': '^18.2.0',
          next: 'latest',
        },
      }, null, 2),
      ...project.files,
    };
  }
}