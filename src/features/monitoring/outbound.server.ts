import { asRecord } from './data';

export async function detectOutboundIP(): Promise<string | null> {
  try {
    const response = await fetch('https://api.ipify.org?format=json', {
      signal: AbortSignal.timeout(5000),
      redirect: 'manual',
    });
    if (!response.ok) return null;
    const ip = asRecord(await response.json())['ip'];
    return typeof ip === 'string' && ip.trim() ? ip.trim() : null;
  } catch {
    return null;
  }
}