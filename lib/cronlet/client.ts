import { CloudClient } from "@cronlet/sdk";

let _client: CloudClient | null = null;

export function getCronletClient() {
  if (!_client) {
    _client = new CloudClient({
      apiKey: process.env.CRONLET_API_KEY!,
      baseUrl: process.env.CRONLET_BASE_URL,
    });
  }
  return _client;
}
