"""Shared settings for the Python helpers: harness.json (or $HARNESS_CONFIG), plus derived values."""
import json
import os
from pathlib import Path

DIR = Path(__file__).resolve().parent.parent


def load():
    h = json.loads(Path(os.environ.get("HARNESS_CONFIG") or DIR / "harness.json").read_text())
    h.setdefault("project", h["repo"].split("/", 1)[1])
    h.setdefault("task_prefix", h["project"] + "-")
    h.setdefault("default_branch", "main")
    h.setdefault("app_process", "claude-desktop")
    h["repo_owner"], h["repo_name"] = h["repo"].split("/", 1)
    h["bot_login"] = f"{h['bot_app']}[bot]"
    h["review_login"] = f"{h['review_app']}[bot]"
    return h
