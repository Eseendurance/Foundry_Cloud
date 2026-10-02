export type APIKey = {
  id: string;
  key: string;
  label: string;
  createdAt: string;
  status: "ACTIVE" | "REVOKED";
};

const STORAGE_KEY = "foundry_platform_api_keys_v1";

export class APIKeyClient {
  private static isBrowser(): boolean {
    return typeof window !== "undefined" && typeof localStorage !== "undefined";
  }

  static getKeys(): APIKey[] {
    if (!this.isBrowser()) return [];
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static createKey(label: string): APIKey {
    const keys = this.getKeys();
    const newKey: APIKey = {
      id: String(Date.now()),
      key: `fg_live_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`,
      label: label || "Default Key",
      createdAt: new Date().toISOString(),
      status: "ACTIVE",
    };
    if (this.isBrowser()) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...keys, newKey]));
    }
    return newKey;
  }

  static revokeKey(id: string): APIKey[] {
    const keys = this.getKeys().map((k) => (k.id === id ? { ...k, status: "REVOKED" as const } : k));
    if (this.isBrowser()) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
    }
    return keys;
  }
}