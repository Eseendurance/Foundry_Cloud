import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function listLocalVoices(): Promise<{ voice_id: string; name: string }[]> {
  const { stdout } = await execFileAsync("espeak-ng", ["--voices"], {
    encoding: "utf8",
    timeout: 5_000,
  });

  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim().split(/\s+/))
    .filter((columns) => columns.length >= 5 && columns[0] !== "Pty")
    .map((columns) => ({ voice_id: columns[1], name: columns[3] }));
}

export async function synthesizeLocalSpeech(text: string, voice: string): Promise<Uint8Array> {
  if (!/^[A-Za-z0-9_-]{1,32}$/.test(voice)) {
    throw new Error("Invalid local voice identifier.");
  }

  const child = spawn("espeak-ng", ["--stdout", "-v", voice, text], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  const output: Buffer[] = [];
  const errorOutput: Buffer[] = [];
  let outputSize = 0;

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("Local speech synthesis exceeded its time limit."));
    }, 20_000);

    child.stdout.on("data", (chunk: Buffer) => {
      outputSize += chunk.length;
      if (outputSize > 12 * 1024 * 1024) {
        child.kill("SIGKILL");
        reject(new Error("Generated audio exceeded the 12 MB limit."));
        return;
      }
      output.push(chunk);
    });

    child.stderr.on("data", (chunk: Buffer) => errorOutput.push(chunk));
    child.once("error", (error) => {
      clearTimeout(timeout);
      reject(new Error(`Could not start local speech synthesis: ${error.message}`));
    });
    child.once("close", (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        const detail = Buffer.concat(errorOutput).toString("utf8").trim();
        reject(new Error(detail || `Local speech synthesis exited with code ${code}.`));
        return;
      }
      resolve(new Uint8Array(Buffer.concat(output)));
    });
  });
}
