export const NAME_EXAMPLE = "N'DJANOU";
export const FIRSTNAME_EXAMPLE = 'Hiwe';
export const PHONE_EXAMPLE = '99099509';

const NAME_ALLOWED_CHARS = /[^A-Za-zÀ-ÖØ-öø-ÿ'’ -]/g;

export function cleanNameInput(value: string): string {
  return value
    .replace(NAME_ALLOWED_CHARS, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[ ]+/, '');
}

export function cleanPhoneInput(value: string, maxLen = 15): string {
  return value.replace(/\D/g, '').slice(0, maxLen);
}
