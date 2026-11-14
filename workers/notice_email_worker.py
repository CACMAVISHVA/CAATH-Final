"""Run once every 5–15 minutes on an always-on worker; standard library only."""
import datetime
import email
from email import policy
from email.utils import parseaddr
import hashlib
import imaplib
import json
import os
import re
import sqlite3
from contextlib import closing
import ssl
import sys
from html.parser import HTMLParser
from urllib.request import Request, urlopen

class PlainHTML(HTMLParser):
    def __init__(self):
        super().__init__(); self.parts = []
    def handle_data(self, data):
        self.parts.append(data)

def email_text(message):
    parts = []
    for part in message.walk():
        if part.get_content_disposition() == 'attachment':
            continue
        if part.get_content_type() not in ('text/plain', 'text/html'):
            continue
        try:
            content = part.get_content()
        except (LookupError, UnicodeError):
            continue
        if part.get_content_type() == 'text/html':
            parser = PlainHTML(); parser.feed(content); content = ' '.join(parser.parts)
        parts.append(content)
    return '\n'.join(parts)[:32000]

def required(name):
    value = os.environ.get(name, '').strip()
    if not value:
        raise ValueError(f'{name} is required')
    return value

def main():
    endpoint = required('NOTICE_INTAKE_URL')
    if not endpoint.startswith('https://'):
        raise ValueError('NOTICE_INTAKE_URL must use HTTPS')
    token = required('NOTICE_SOURCE_TOKEN')
    def post(payload):
        request = Request(endpoint, json.dumps(payload).encode(), {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}, method='POST')
        with urlopen(request, timeout=30) as result:
            body = json.load(result)
        if body.get('ok') is not True:
            raise RuntimeError('Intake rejected event')
        return body
    try:
        senders = {item.strip().lower() for item in required('NOTICE_SENDERS').split(',') if item.strip()}
        host, username, password = required('NOTICE_IMAP_HOST'), required('NOTICE_IMAP_USER'), required('NOTICE_IMAP_PASSWORD')
        folder = os.environ.get('NOTICE_IMAP_FOLDER', 'INBOX')
        state_path = os.environ.get('NOTICE_STATE_DB', './notice-worker.sqlite3')
        with closing(sqlite3.connect(state_path)) as db:
            db.execute('CREATE TABLE IF NOT EXISTS cursors (scope TEXT PRIMARY KEY, last_uid INTEGER NOT NULL)')
            with imaplib.IMAP4_SSL(host, int(os.environ.get('NOTICE_IMAP_PORT', '993')), ssl_context=ssl.create_default_context(), timeout=30) as mailbox:
                mailbox.login(username, password)
                status, _ = mailbox.select(folder, readonly=True)
                if status != 'OK':
                    raise RuntimeError('Mailbox selection failed')
                uidvalidity = mailbox.response('UIDVALIDITY')[1][0].decode()
                scope = hashlib.sha256(f'{host}:{username}:{folder}:{uidvalidity}:{token}'.encode()).hexdigest()
                cursor = db.execute('SELECT last_uid FROM cursors WHERE scope=?', (scope,)).fetchone()
                last_uid = cursor[0] if cursor else 0
                since = (datetime.date.today() - datetime.timedelta(days=int(os.environ.get('NOTICE_INITIAL_LOOKBACK_DAYS', '7')))).strftime('%d-%b-%Y')
                criteria = f'UID {last_uid + 1}:*' if last_uid else f'SINCE {since}'
                status, results = mailbox.uid('SEARCH', None, criteria)
                if status != 'OK':
                    raise RuntimeError('Mailbox search failed')
                ids = sorted(int(item) for item in results[0].split() if int(item) > last_uid)
                for uid in ids[:500]:
                    status, fetched = mailbox.uid('FETCH', str(uid), '(BODY.PEEK[])')
                    if status != 'OK':
                        raise RuntimeError('Message fetch failed')
                    raw = next((item[1] for item in fetched if isinstance(item, tuple)), None)
                    if raw is None:
                        raise RuntimeError('Message body unavailable')
                    if len(raw) > 10 * 1024 * 1024:
                        raise RuntimeError('Message exceeds worker size limit; review mailbox')
                    message = email.message_from_bytes(raw, policy=policy.default)
                    sender = parseaddr(str(message.get('From', '')))[1].lower()
                    subject, body = str(message.get('Subject', '')), email_text(message)
                    if sender in senders and re.search(r'notice|intimation|e[- ]?proceeding|show[- ]?cause|assessment|demand|hearing', subject + '\n' + body, re.I):
                        post({'externalId': scope + ':' + str(uid), 'subject': subject or 'Tax notice email', 'body': body})
                    db.execute('INSERT INTO cursors VALUES (?,?) ON CONFLICT(scope) DO UPDATE SET last_uid=excluded.last_uid', (scope, uid))
                    db.commit()
                if len(ids) > 500:
                    raise RuntimeError('Mailbox backlog remains; next run will continue')
        post({'operation': 'check_complete'})
        print('Notice mailbox check completed')
    except Exception:
        try:
            post({'operation': 'check_failed'})
        except Exception:
            pass
        # No email contents, account credentials or token are logged.
        print('Notice check failed. Check mailbox, worker settings and intake availability.', file=sys.stderr)
        raise SystemExit(1)

if __name__ == '__main__':
    main()
