import test from 'node:test';
import assert from 'node:assert/strict';
import { deadlineBand, indiaDate, validateNoticeInput } from '../src/domains/notices/noticeIntelligence.ts';
test('India midnight changes the date even before UTC midnight', () => {
  assert.equal(indiaDate(new Date('2026-10-22T19:00:00Z')), '2026-10-23');
});
test('triage includes today and excludes completed cases', () => {
  assert.equal(deadlineBand('2026-10-23', 'Received', '2026-10-23'), 'Due today');
  assert.equal(deadlineBand('2026-10-22', 'Drafting', '2026-10-23'), 'Overdue');
  assert.equal(deadlineBand('2026-10-30', 'Assigned', '2026-10-23'), 'Due soon');
  assert.equal(deadlineBand('2026-10-31', 'Assigned', '2026-10-23'), 'Later');
  for (const status of ['Filed', 'Closed', 'Archived']) assert.equal(deadlineBand('2020-01-01', status, '2026-10-23'), 'Resolved');
  assert.equal(deadlineBand(null, 'Received'), 'No deadline');
});
test('reject missing, impossible and reversed dates before persistence', () => {
  assert.throws(() => validateNoticeInput({ noticeNumber: '', receivedDate: '2026-10-23', deadline: '2026-11-01' }));
  assert.throws(() => validateNoticeInput({ noticeNumber: 'N-1', receivedDate: '2026-02-30', deadline: '2026-03-01' }));
  assert.throws(() => validateNoticeInput({ noticeNumber: 'N-1', receivedDate: '2026-10-23', deadline: '2026-10-22' }));
  assert.doesNotThrow(() => validateNoticeInput({ noticeNumber: 'N-1', receivedDate: '2026-10-23', deadline: '2026-10-23' }));
});
