import JSZip from 'jszip';

export class RawExportEngine {
  /**
   * Bundles virtual files into a clean ZIP archive and triggers a browser download.
   */
  static async downloadProjectZip(projectName: string, files: Record<string, string>) {
    const zip = new JSZip();

    // Standard package.json for generated apps
    const defaultPackageJson = JSON.stringify(
      {
        name: projectName.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        version: '1.0.0',
        private: true,
        scripts: {
          dev: 'next dev',
          build: 'next build',
          start: 'next start',
        },
        dependencies: {
          next: '^14.2.3',
          react: '^18.2.0',
          'react-dom': '^18.2.0',
        },
      },
      null,
      2
    );

    // Add generated package.json if not present
    if (!files['package.json']) {
      zip.file('package.json', defaultPackageJson);
    }

    // Populate zip with all virtual files
    Object.entries(files).forEach(([filePath, content]) => {
      const cleanPath = filePath.startsWith('/') ? filePath.slice(1) : filePath;
      zip.file(cleanPath, content);
    });

    // Generate blob and trigger browser download
    const blob = await zip.generateAsync({ type: 'blob' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${projectName.toLowerCase().replace(/[^a-z0-9]/g, '-')}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}