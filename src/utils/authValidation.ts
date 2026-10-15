/**
 * Username and Authentication helpers for BullStock Zero-PII model.
 */

export const FICTITIOUS_EMAIL_DOMAIN = 'usuarios.estoque.local';

/**
 * Normalizes username to lowercase and trims whitespace.
 */
export function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

/**
 * Validates username:
 * - 3 to 20 characters
 * - Only letters, numbers, dot, hyphen, underscore
 */
export function validateUsername(username: string): { valid: boolean; error?: string } {
  const normalized = normalizeUsername(username);

  if (normalized.length < 3) {
    return { valid: false, error: 'O nome de usuário deve ter pelo menos 3 caracteres.' };
  }
  if (normalized.length > 20) {
    return { valid: false, error: 'O nome de usuário deve ter no máximo 20 caracteres.' };
  }
  if (!/^[a-z0-9._-]+$/.test(normalized)) {
    return {
      valid: false,
      error: 'O nome de usuário pode conter apenas letras minúsculas, números, ponto, hífen e underscore.',
    };
  }

  return { valid: true };
}

/**
 * Validates password:
 * - Minimum 8 characters
 */
export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password || password.length < 8) {
    return { valid: false, error: 'A senha deve ter no mínimo 8 caracteres.' };
  }
  return { valid: true };
}

/**
 * Converts username to internal fictitious email for Firebase Auth.
 * Never shown to the user.
 */
export function usernameToEmail(username: string): string {
  const clean = normalizeUsername(username);
  return `${clean}@${FICTITIOUS_EMAIL_DOMAIN}`;
}

/**
 * Extracts username from internal fictitious email if needed.
 */
export function emailToUsername(email: string | null | undefined): string {
  if (!email) return 'usuário';
  if (email.endsWith(`@${FICTITIOUS_EMAIL_DOMAIN}`)) {
    return email.replace(`@${FICTITIOUS_EMAIL_DOMAIN}`, '');
  }
  return email.split('@')[0];
}
