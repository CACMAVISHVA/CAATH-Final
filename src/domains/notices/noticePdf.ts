export async function validateNoticePdf(file: File) {
  if (!/\.pdf$/i.test(file.name) || (file.type && file.type !== 'application/pdf')) throw new Error('Choose a PDF document.');
  if (!file.size || file.size > 10 * 1024 * 1024) throw new Error('PDF must be between 1 byte and 10 MB.');
  const header = new TextDecoder().decode(await file.slice(0, 5).arrayBuffer());
  if (header !== '%PDF-') throw new Error('The selected file is not a valid PDF.');
}
