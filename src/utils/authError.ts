export function getLoginErrorMessage(error: unknown): string {
  const DEFAULT_MESSAGE =
    "No fue posible iniciar sesión. Verifica tus datos e inténtalo nuevamente.";

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object") {
    return JSON.stringify(error);
  }

  return DEFAULT_MESSAGE;
}
