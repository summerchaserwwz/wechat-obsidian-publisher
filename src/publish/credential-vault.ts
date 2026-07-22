interface SafeStorageLike {
  isEncryptionAvailable(): boolean;
  encryptString(value: string): Buffer;
  decryptString(value: Buffer): string;
}

interface ElectronLike {
  safeStorage?: SafeStorageLike;
}

function getSafeStorage(): SafeStorageLike {
  const electron = require("electron") as ElectronLike;
  if (!electron.safeStorage?.isEncryptionAvailable()) {
    throw new Error("系统加密服务暂不可用，AppSecret 未保存。");
  }
  return electron.safeStorage;
}

export class CredentialVault {
  encrypt(secret: string): string {
    if (!secret.trim()) throw new Error("AppSecret 不能为空。");
    return getSafeStorage().encryptString(secret.trim()).toString("base64");
  }

  decrypt(encryptedSecret: string): string {
    if (!encryptedSecret) throw new Error("当前账号尚未保存 AppSecret。");
    return getSafeStorage().decryptString(Buffer.from(encryptedSecret, "base64"));
  }
}
