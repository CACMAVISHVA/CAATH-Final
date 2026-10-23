import email
from email import policy
from email.message import EmailMessage
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch
import io
import json
import sqlite3
from contextlib import closing
import tempfile
module_path = Path(__file__).parents[1] / 'workers' / 'notice_email_worker.py'
spec = importlib.util.spec_from_file_location('notice_worker', module_path)
worker = importlib.util.module_from_spec(spec)
spec.loader.exec_module(worker)

class EmailParsingTests(unittest.TestCase):
    def test_plain_text_and_attachment_separation(self):
        message = EmailMessage()
        message.set_content('GST notice for 33ABCDE1234F1Z5')
        message.add_attachment(b'private binary', maintype='application', subtype='pdf', filename='notice.pdf')
        self.assertEqual(worker.email_text(message).strip(), 'GST notice for 33ABCDE1234F1Z5')
    def test_html_forwarded_pan_is_readable(self):
        message = EmailMessage()
        message.set_content('<p>Income Tax notice</p><b>ABCDE1234F</b>', subtype='html')
        result = worker.email_text(message)
        self.assertIn('Income Tax notice', result)
        self.assertIn('ABCDE1234F', result)
    def test_excerpt_is_bounded(self):
        message = EmailMessage(); message.set_content('x' * 50000)
        self.assertEqual(len(worker.email_text(message)), 32000)

class WorkerCheckpointTests(unittest.TestCase):
    def test_failed_delivery_retries_same_uid_and_only_complete_scan_sends_heartbeat(self):
        message = EmailMessage()
        message['From'] = 'notices@example.test'
        message['Subject'] = 'GST notice'
        message.set_content('GST notice 33ABCDE1234F1Z5')
        class Mailbox:
            def __init__(self, *args, **kwargs): pass
            def __enter__(self): return self
            def __exit__(self, *args): pass
            def login(self, *args): pass
            def select(self, *args, **kwargs): return ('OK', [b'1'])
            def response(self, *args): return ('UIDVALIDITY', [b'1'])
            def uid(self, command, *args):
                if command == 'SEARCH': return ('OK', [b'10'])
                return ('OK', [(b'10', message.as_bytes()), b')'])
        calls = []
        fail = [True]
        def deliver(request, **kwargs):
            payload = json.loads(request.data)
            calls.append(payload)
            if payload.get('externalId') and fail[0]:
                fail[0] = False
                raise OSError('simulated transport failure')
            return io.BytesIO(b'{"ok":true}')
        with tempfile.TemporaryDirectory() as temp:
            state = temp + '/state.sqlite3'
            env = {'NOTICE_INTAKE_URL':'https://example.test/intake','NOTICE_SOURCE_TOKEN':'a'*64,'NOTICE_SENDERS':'notices@example.test','NOTICE_IMAP_HOST':'imap.example.test','NOTICE_IMAP_USER':'test','NOTICE_IMAP_PASSWORD':'test','NOTICE_STATE_DB':state}
            with patch.dict(worker.os.environ, env), patch.object(worker.imaplib,'IMAP4_SSL',Mailbox), patch.object(worker,'urlopen',deliver):
                with self.assertRaises(SystemExit): worker.main()
                with closing(sqlite3.connect(state)) as db: self.assertEqual(db.execute('SELECT * FROM cursors').fetchall(),[])
                self.assertEqual(calls[-1]['operation'],'check_failed')
                worker.main()
                with closing(sqlite3.connect(state)) as db: self.assertEqual(db.execute('SELECT last_uid FROM cursors').fetchone()[0],10)
                events = [item for item in calls if item.get('externalId')]
                self.assertEqual(events[0]['externalId'],events[1]['externalId'])
                self.assertEqual(calls[-1]['operation'],'check_complete')
                worker.main()
                self.assertEqual(len([item for item in calls if item.get('externalId')]),2)

if __name__ == '__main__':
    unittest.main()
