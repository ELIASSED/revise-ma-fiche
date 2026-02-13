import fs from "node:fs/promises";
import path from "node:path";
import { appConfig } from "./config";
import { encryptFile, decryptFile } from "./encryption";

export async function ensureStorageDir() {
  const root = path.join(process.cwd(), appConfig.storageRoot);
  await fs.mkdir(root, { recursive: true });
  return root;
}

export async function saveUploadFile(
  jobId: string,
  buffer: Buffer,
  extension: string
) {
  const root = await ensureStorageDir();
  const filePath = path.join(root, `${jobId}${extension}.enc`);
  
  // Encrypter le buffer avant de sauvegarder
  const encryptedBuffer = await encryptFile(buffer);
  await fs.writeFile(filePath, encryptedBuffer);
  
  return filePath;
}

export async function deleteFile(filePath: string) {
  try {
    await fs.unlink(filePath);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      throw err;
    }
  }
}

export async function loadAndDecryptFile(filePath: string): Promise<Buffer> {
  const encryptedBuffer = await fs.readFile(filePath);
  return await decryptFile(encryptedBuffer);
}
