from __future__ import annotations

import subprocess
from pathlib import Path


def _run(repo_root: Path, *args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(["git", *args], cwd=repo_root, capture_output=True, text=True)


def commit_improvement(repo_root: Path, experiment_id: str, metric: float, summary: str) -> None:
    _run(repo_root, "add", "train.py", "logs/experiments")
    message = f"autoresearch: {experiment_id} validation_loss={metric:.6f}\n\n{summary}"
    commit = _run(repo_root, "commit", "-m", message)
    if commit.returncode != 0:
        raise RuntimeError(f"git commit failed: {commit.stderr.strip()}")


def revert_bad_change(repo_root: Path) -> None:
    reset = _run(repo_root, "checkout", "--", "train.py")
    if reset.returncode != 0:
        raise RuntimeError(f"failed to revert train.py: {reset.stderr.strip()}")
