import { Injectable } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { chmod, mkdir, readFile, writeFile } from 'fs/promises';
import { homedir } from 'os';
import { dirname, join } from 'path';

const SECRET_VERSION = 'v1';

@Injectable()
export class LocalSecretService {
  private keyPromise?: Promise<Buffer>;

  async encrypt(value: string): Promise<string> {
    const key = await this.getKey();
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return [
      SECRET_VERSION,
      iv.toString('base64'),
      tag.toString('base64'),
      ciphertext.toString('base64'),
    ].join(':');
  }

  async decrypt(value: string): Promise<string> {
    const [version, ivValue, tagValue, ciphertextValue] = value.split(':');
    if (version !== SECRET_VERSION || !ivValue || !tagValue || !ciphertextValue) {
      throw new Error('Unsupported local secret format');
    }

    const key = await this.getKey();
    const decipher = createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(ivValue, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(tagValue, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(ciphertextValue, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  }

  private getKey(): Promise<Buffer> {
    if (!this.keyPromise) {
      this.keyPromise = this.loadOrCreateKey();
    }
    return this.keyPromise;
  }

  private async loadOrCreateKey(): Promise<Buffer> {
    const keyPath =
      process.env.XINGYAO_SECRET_KEY_PATH?.trim() ||
      join(homedir(), '.xingyao-agent-platform', 'local-secrets.key');

    try {
      return validateKey(await readFile(keyPath));
    } catch (error: any) {
      if (error?.code !== 'ENOENT') throw error;
    }

    await mkdir(dirname(keyPath), { recursive: true });
    const key = randomBytes(32);
    try {
      await writeFile(keyPath, key, { flag: 'wx', mode: 0o600 });
      await chmod(keyPath, 0o600).catch(() => undefined);
      return key;
    } catch (error: any) {
      if (error?.code !== 'EEXIST') throw error;
      return validateKey(await readFile(keyPath));
    }
  }
}

function validateKey(value: Buffer): Buffer {
  if (value.length !== 32) {
    throw new Error('Invalid local secret key');
  }
  return value;
}
