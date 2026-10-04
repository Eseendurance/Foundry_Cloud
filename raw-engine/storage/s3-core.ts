import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export class NativeStorageEngine {
  private storageDir: string;

  constructor() {
    this.storageDir = path.resolve(
      process.env.FOUNDRY_STORAGE_DIR || path.join(process.cwd(), "raw-engine", "storage", "data")
    );
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
  }

  // Handles raw chunk file streaming directly to disk without external S3 SDKs
  public async writeObject(filename: string, fileStream: fs.ReadStream): Promise<{ key: string; hash: string }> {
    const key = `${Date.now()}_${filename}`;
    const destination = path.join(this.storageDir, key);
    const writeStream = fs.createWriteStream(destination);
    const hash = crypto.createHash("sha256");

    return new Promise((resolve, reject) => {
      fileStream.on("data", (chunk) => {
        hash.update(chunk);
        writeStream.write(chunk);
      });

      fileStream.on("end", () => {
        writeStream.end();
        resolve({ key, hash: hash.digest("hex") });
      });

      fileStream.on("error", (err) => reject(err));
    });
  }
}