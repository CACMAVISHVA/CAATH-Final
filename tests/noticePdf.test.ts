import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateNoticePdf } from '../src/domains/notices/noticePdf.ts';
test('PDF intake accepts a PDF header and rejects disguised files', async () => {
 await validateNoticePdf(new File(['%PDF-1.7\n'], 'notice.pdf', {type:'application/pdf'}));
 await assert.rejects(validateNoticePdf(new File(['<html>'], 'notice.pdf', {type:'application/pdf'})));
 await assert.rejects(validateNoticePdf(new File(['%PDF-1.7'], 'notice.html', {type:'text/html'})));
});
test('PDF intake rejects empty and oversized documents', async () => {
 await assert.rejects(validateNoticePdf(new File([], 'empty.pdf')));
 await assert.rejects(validateNoticePdf(new File([new Uint8Array(10485761)], 'large.pdf')));
});
