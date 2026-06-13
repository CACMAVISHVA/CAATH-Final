export const frontendEncryptionDisabled = (): never => {
  throw new Error('Credential encryption/decryption is restricted to server-side edge functions.');
};
