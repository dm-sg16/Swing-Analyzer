import { providerSchema } from '@shared/schema';
import type { Provider } from './ai';

export function resolveProvider(body: { provider?: unknown }): Provider {
  if (body.provider !== undefined) {
    return providerSchema.parse(body.provider);
  }
  const fromEnv = process.env.AI_PROVIDER;
  if (fromEnv !== undefined) {
    return providerSchema.parse(fromEnv);
  }
  return 'claude';
}
