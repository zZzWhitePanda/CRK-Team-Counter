#!/usr/bin/env python3
"""Run .sql files against the live Neon database over HTTPS.

WHY THIS EXISTS
My home network black-holes the Postgres connection on port 5432 -
`psql` just hangs forever on the TLS handshake. Neon also accepts
SQL over ordinary HTTPS on port 443, which works fine, so this
script sends each statement that way instead.

USAGE
    export NEON_URL='postgresql://...neon.tech/neondb?sslmode=require'
    python3 neon_load.py migration_roles_themes.sql

The connection string is read from an environment variable so the
password never ends up in the command line or my shell history.
"""
import json, os, ssl, sys, urllib.error, urllib.parse, urllib.request

# This Python has no CA bundle of its own, so point it at the
# system one. (Never turn verification off - that would make the
# whole HTTPS connection pointless.)
SSL_CTX = ssl.create_default_context(cafile="/etc/ssl/cert.pem")


def split_statements(sql: str):
    """Split a file on semicolons - but NOT ones inside quotes or
    comments, which would chop a statement in half."""
    statements, current = [], []
    in_single = in_double = in_line_comment = False
    i = 0
    while i < len(sql):
        ch = sql[i]
        nxt = sql[i + 1] if i + 1 < len(sql) else ''

        if in_line_comment:
            current.append(ch)
            if ch == '\n':
                in_line_comment = False
        elif in_single:
            current.append(ch)
            if ch == "'":
                if nxt == "'":          # '' is an escaped quote
                    current.append(nxt)
                    i += 1
                else:
                    in_single = False
        elif in_double:
            current.append(ch)
            if ch == '"':
                in_double = False
        elif ch == '-' and nxt == '-':
            in_line_comment = True
            current.append(ch)
        elif ch == "'":
            in_single = True
            current.append(ch)
        elif ch == '"':
            in_double = True
            current.append(ch)
        elif ch == ';':
            statements.append(''.join(current).strip())
            current = []
        else:
            current.append(ch)
        i += 1

    tail = ''.join(current).strip()
    if tail:
        statements.append(tail)

    def is_empty(s):
        return all(not line.strip() or line.strip().startswith('--')
                   for line in s.splitlines())
    return [s for s in statements if not is_empty(s)]


def run(sql_url: str, statement: str):
    host = urllib.parse.urlparse(sql_url).hostname
    body = json.dumps({"query": statement, "params": []}).encode()
    req = urllib.request.Request(
        f"https://{host}/sql",
        data=body,
        headers={
            "Content-Type": "application/json",
            "Neon-Connection-String": sql_url,
            "Neon-Raw-Text-Output": "true",
            "Neon-Array-Mode": "false",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120, context=SSL_CTX) as r:
        return json.load(r)


def main():
    url = os.environ.get("NEON_URL", "")
    if not url:
        sys.exit("NEON_URL is not set. See the comment at the top of this file.")
    # node-postgres and this endpoint don't support channel binding
    url = url.replace("&channel_binding=require", "").replace("channel_binding=require&", "")

    for path in sys.argv[1:]:
        sql = open(path).read()
        statements = split_statements(sql)
        print(f"\n=== {os.path.basename(path)}: {len(statements)} statements ===")
        for n, statement in enumerate(statements, 1):
            label = ' '.join(statement.split())[:70]
            try:
                result = run(url, statement)
                rows = result.get("rows", [])
                note = f"{len(rows)} rows" if rows else f"rowCount={result.get('rowCount')}"
                print(f"  [{n}/{len(statements)}] OK  {note:16} {label}")
                for row in rows[:12]:
                    print(f"        {row}")
            except urllib.error.HTTPError as e:
                print(f"  [{n}/{len(statements)}] FAILED {label}\n        {e.read().decode()[:400]}")
                sys.exit(1)


if __name__ == "__main__":
    main()
