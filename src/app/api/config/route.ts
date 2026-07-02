import { NextResponse } from 'next/server';


interface ServerConfig {
  token: string | null;
  apiUrl: string | null;
}

function fromVcapServices(): Partial<ServerConfig> {
  const raw = process.env.VCAP_SERVICES;
  if (!raw) return {};
  try {
    const vcap = JSON.parse(raw) as Record<string, { credentials: Record<string, string> }[]>;
    const entry = Object.values(vcap).flat().find(s => s?.credentials?.token);
    if (!entry) return {};
    return {
      token: entry.credentials.token ?? null,
      apiUrl: entry.credentials.api_url ?? null,
    };
  } catch {
    return {};
  }
}

function fromEnv(): Partial<ServerConfig> {
  return {
    token: process.env.GITHUB_TOKEN ?? null,
    apiUrl: process.env.GITHUB_API_URL ?? null,
  };
}

export async function GET() {
  // Priority: VCAP_SERVICES (Cloud Foundry) → plain env vars (Docker/K8s/any platform)
  const vcap = fromVcapServices();
  const env = fromEnv();

  const config: ServerConfig = {
    token: vcap.token ?? env.token ?? null,
    apiUrl: vcap.apiUrl ?? env.apiUrl ?? null,
  };

  return NextResponse.json(config);
}
