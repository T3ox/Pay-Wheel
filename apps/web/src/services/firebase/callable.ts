import { httpsCallable } from 'firebase/functions';
import { functions } from './client';
import { createUuid } from '../ids/uuid';

export class AppError extends Error {
  constructor(public readonly code: string, message: string, public readonly details?: unknown) { super(message); }
}

export function newRequestId() { return createUuid(); }

export async function callFunction<TRequest extends object, TResponse>(name: string, payload: TRequest): Promise<TResponse> {
  if (!functions) throw new AppError('FIREBASE_NOT_CONFIGURED', 'Firebase non è configurato. Usa la modalità demo oppure completa .env.local.');
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const result = await httpsCallable<TRequest, TResponse>(functions, name)(payload);
      return result.data;
    } catch (error: any) {
      const code = String(error?.details?.code ?? error?.code ?? 'UNKNOWN').replace('functions/', '').toUpperCase().replaceAll('-', '_');
      const retryable = ['UNAVAILABLE', 'DEADLINE_EXCEEDED', 'INTERNAL'].includes(code);
      if (attempt === 0 && retryable && navigator.onLine) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        continue;
      }
      throw new AppError(code, error?.message ?? 'Operazione non riuscita.', error?.details);
    }
  }
  throw new AppError('UNKNOWN', 'Operazione non riuscita.');
}
