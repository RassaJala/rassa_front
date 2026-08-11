import { describeError, redactSensitive } from '@/common/logger';

// Logger móvil seguro (R1-A): describe los errores de axios sin los headers
// (el JWT viaja en `config.headers.Authorization`) y redacta las claves que
// parecen credenciales en el contexto extra. Nunca loguear el objeto de error
// crudo.
export function logError(
  context: string,
  error: unknown,
  extra?: Readonly<Record<string, unknown>>,
): void {
  console.error(
    `[${context}]`,
    describeError(error),
    redactSensitive(extra ?? {}),
  );
}
