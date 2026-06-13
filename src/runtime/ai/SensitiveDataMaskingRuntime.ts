const patterns = [
  /\b\d{10}\b/g, // phone
  /\b[A-Z]{5}\d{4}[A-Z]\b/g, // PAN
  /\b\d{12}\b/g, // Aadhaar-like
];

export class SensitiveDataMaskingRuntime {
  mask(input: string): string {
    return patterns.reduce((text, pattern) => text.replace(pattern, '[REDACTED]'), input);
  }
}

