from __future__ import annotations

import subprocess
import time
from dataclasses import dataclass
from pathlib import Path


@dataclass
class ExperimentRun:
    stdout: str
    stderr: str
    returncode: int
    duration_s: float


def run_train(repo_root: Path, timeout_s: int = 300) -> ExperimentRun:
    start = time.time()
    proc = subprocess.run(
        ["python", "train.py"],
        cwd=repo_root,
        capture_output=True,
        text=True,
        timeout=timeout_s,
    )
    duration = time.time() - start

    return ExperimentRun(
        stdout=proc.stdout,
        stderr=proc.stderr,
        returncode=proc.returncode,
        duration_s=duration,
    )
