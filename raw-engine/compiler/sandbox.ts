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
   * Compiles virtual TypeScript/React components into executable browser bundles locally.
   */
  static compileToBundle(files: Record<string, string>): string {
    const entryFile = files['/App.tsx'] || files['/index.tsx'] || Object.values(files)[0] || '';
    
    // Self-contained, client-side HTML preview template
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
          <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
          <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
          <script src="https://cdn.tailwindcss.com"></script>
        </head>
        <body class="bg-slate-950 text-white p-4">
          <div id="root"></div>
          <script type="text/babel">
            ${entryFile}
            
            if (typeof App !== 'undefined') {
              ReactDOM.createRoot(document.getElementById('root')).render(<App />);
            }
          </script>
        </body>
      </html>
    `;
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