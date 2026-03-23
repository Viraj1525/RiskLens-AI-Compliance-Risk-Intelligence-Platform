#!/usr/bin/env python3
"""Minimal smoke test after deployment: GET /health on the backend."""
from __future__ import annotations

import argparse
import sys
import urllib.error
import urllib.request


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument(
        "--base-url",
        default="http://127.0.0.1:8000",
        help="Backend base URL (default: local Docker / dev)",
    )
    args = p.parse_args()
    url = args.base_url.rstrip("/") + "/health"
    try:
        with urllib.request.urlopen(url, timeout=10) as resp:
            body = resp.read().decode("utf-8", errors="replace")
            print(f"OK {resp.status} {url}\n{body}")
            return 0
    except urllib.error.HTTPError as e:
        print(f"HTTP {e.code} {url}", file=sys.stderr)
        return 1
    except Exception as e:
        print(f"FAIL {url}: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
