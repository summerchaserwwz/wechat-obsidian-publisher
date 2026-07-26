import type { SecretStorage } from "obsidian";

const SECRET_REFERENCE_PREFIX = "obsidian-secret:";
const SECRET_ID_PREFIX = "wechat-obsidian-publisher";

interface SafeStorageLike {
  isEncryptionAvailable(): boolean;
  decryptString(value: Buffer): string;
}

interface ElectronLike {
  safeStorage?: SafeStorageLike;
}

function normalizeSecretId(accountId: string): string {
  const suffix = accountId.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return `${SECRET_ID_PREFIX}-${suffix || "account"}`;
}

function readLegacyEncryptedSecret(encryptedSecret: string): string {
  try {
    const electron = require("electron") as ElectronLike;
    if (!electron.safeStorage?.isEncryptionAvailable()) throw new Error();
    return electron.safeStorage.decryptString(Buffer.from(encryptedSecret, "base64"));
  } catch {
    throw new Error("旧版 AppSecret 无法解密，请在设置中重新导入或更新。留存数据未被改写。");
  }
}

export class CredentialVault {
  constructor(private readonly getSecretStorage: () => SecretStorage) {}

  store(accountId: string, secret: string): string {
    const normalizedSecret = secret.trim();
    if (!normalizedSecret) throw new Error("AppSecret 不能为空。");
    const secretId = normalizeSecretId(accountId);
    const storage = this.getSecretStorage();
    storage.setSecret(secretId, normalizedSecret);
    if (storage.getSecret(secretId) !== normalizedSecret) {
      throw new Error("系统密钥存储未能确认 AppSecret 已保存，请检查 Obsidian 的系统密钥存储后重试。");
    }
    return `${SECRET_REFERENCE_PREFIX}${secretId}`;
  }

  read(secretReference: string): string {
    if (!secretReference) throw new Error("当前账号尚未保存 AppSecret。");
    if (!secretReference.startsWith(SECRET_REFERENCE_PREFIX)) {
      return readLegacyEncryptedSecret(secretReference);
    }
    const secretId = secretReference.slice(SECRET_REFERENCE_PREFIX.length);
    const secret = this.getSecretStorage().getSecret(secretId);
    if (!secret) throw new Error("系统密钥存储中找不到 AppSecret，请重新导入或更新。");
    return secret;
  }

  isAvailable(secretReference: string): boolean {
    try {
      return Boolean(this.read(secretReference));
    } catch {
      return false;
    }
  }

  clear(secretReference: string): void {
    if (!secretReference.startsWith(SECRET_REFERENCE_PREFIX)) return;
    const secretId = secretReference.slice(SECRET_REFERENCE_PREFIX.length);
    this.getSecretStorage().setSecret(secretId, "");
  }
}
