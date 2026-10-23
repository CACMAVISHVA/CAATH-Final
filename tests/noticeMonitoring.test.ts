import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fingerprintText, identifyNotice, validateDate } from '../supabase/functions/_shared/noticeIntake.ts';
test('GST emails match full GSTIN rather than embedded PAN', () => { assert.deepEqual(identifyNotice('GST notice for 33ABCDE1234F1Z5'),{department:'GST',identifiers:['33ABCDE1234F1Z5']}); });
test('income tax emails match PAN and normalize case', () => { assert.deepEqual(identifyNotice('Income Tax notice PAN abcde1234f'),{department:'Income Tax',identifiers:['ABCDE1234F']}); });
test('ambiguous department is preserved for review', () => { assert.equal(identifyNotice('GST and income tax notice').department,null); });
test('multiple identifiers remain ambiguous rather than picking first', () => { assert.equal(identifyNotice('GST 33ABCDE1234F1Z5 and 27ABCDE1234F1Z5').identifiers.length,2); });
test('dates are calendar checked and absent dates stay absent', () => { assert.equal(validateDate(null),null); assert.equal(validateDate('2028-02-29'),'2028-02-29'); assert.throws(()=>validateDate('2026-02-29')); assert.throws(()=>validateDate('07/10/2026')); });
test('same notice from separate channels deduplicates when reference is supplied', () => { const item={department:'GST',identifiers:['33ABCDE1234F1Z5'],noticeNumber:' Ref1 ',subject:'a',body:'a'}; assert.equal(fingerprintText(item),fingerprintText({...item,subject:'b',body:'b',noticeNumber:'ref1'})); });
