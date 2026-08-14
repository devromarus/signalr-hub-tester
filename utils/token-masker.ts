// Маскирование токена авторизации (FR-09, C-12)
// Отображаются только первые и последние 4 символа.

export function maskToken(token: string): string {
  if (!token) {
    return '';
  }
  if (token.length <= 8) {
    return '*'.repeat(token.length);
  }
  return `${token.slice(0, 4)}${'*'.repeat(token.length - 8)}${token.slice(-4)}`;
}