import type { ExtractedData } from '../types';
/** Provider credentials must never be bundled into the browser. */
export const extractDataFromDocument = async (_base64Data: string, _mimeType: string): Promise<ExtractedData | null> => {
  throw new Error('Secure document extraction is not configured yet.');
};
