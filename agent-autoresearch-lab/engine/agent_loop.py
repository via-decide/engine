from __future__ import annotations

import argparse
import datetime as dt
import json
import random
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from engine.evaluation import is_improvement, parse_validation_loss
from engine.experiment_runner import run_train
from engine.git_memory import commit_improvement, revert_bad_change
from tools.code_editor import read_file, write_file
from tools.experiment_logger import save_experiment


def next_experiment_id(log_dir: Path) -> str:
    existing = sorted(log_dir.glob("experiment_*.json"))
    return f"experiment_{len(existing) + 1:03d}"


def mutate_learning_rate(train_path: Path) -> tuple[float, float, str]:
    content = read_file(str(train_path))
    match = re.search(r"LEARNING_RATE\s*=\s*([0-9]+(?:\.[0-9]+)?)", content)
    if not match:
        raise ValueError("LEARNING_RATE constant not found in train.py")

    current = float(match.group(1))
    candidates = [
        max(0.0001, current * 0.5),
        max(0.0001, current * 0.8),
        current,
        min(1.0, current * 1.2),
        min(1.0, current * 1.5),
        0.0125,
    ]
    proposed = random.choice(candidates)

    updated = content.replace(
        f"LEARNING_RATE = {current:.4f}",
        f"LEARNING_RATE = {proposed:.4f}",
        1,
    )
    write_file(str(train_path), updated)
    summary = f"learning rate {current:.4f} -> {proposed:.4f}"
    return current, proposed, summary


def load_best_metric(log_dir: Path) -> float | None:
    metrics: list[float] = []
    for path in log_dir.glob("experiment_*.json"):
        try:
            payload = json.loads(path.read_text())
        except json.JSONDecodeError:
            continue
        metric = payload.get("metric")
        if isinstance(metric, (int, float)):
            metrics.append(float(metric))
    return min(metrics) if metrics else None


def run_loop(repo_root: Path, max_experiments: int) -> None:
    train_path = repo_root / "train.py"
    log_dir = repo_root / "logs" / "experiments"
    log_dir.mkdir(parents=True, exist_ok=True)

    best_metric: float | None = load_best_metric(log_dir)

    for _ in range(max_experiments):
        experiment_id = next_experiment_id(log_dir)
        old_lr, new_lr, summary = mutate_learning_rate(train_path)
        run = run_train(repo_root, timeout_s=300)

        if run.returncode != 0:
            revert_bad_change(repo_root)
            metric = float("inf")
            improved = False
        else:
            metric = parse_validation_loss(run.stdout)
            improved = is_improvement(metric, best_metric)
            if improved:
                best_metric = metric
                commit_improvement(repo_root, experiment_id, metric, summary)
            else:
                revert_bad_change(repo_root)

        payload = {
            "experiment_id": experiment_id,
            "timestamp": dt.datetime.now(dt.UTC).isoformat(),
            "metric": metric,
            "improved": improved,
            "changes": summary,
            "from_lr": old_lr,
            "to_lr": new_lr,
            "stdout": run.stdout,
            "stderr": run.stderr,
            "duration_s": round(run.duration_s, 3),
        }
        save_experiment(str(log_dir / f"{experiment_id}.json"), payload)
        print(f"{experiment_id}: metric={metric:.6f} improved={improved}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Minimal autonomous research loop")
    parser.add_argument("--max-experiments", type=int, default=5)
    args = parser.parse_args()

    run_loop(Path(__file__).resolve().parents[1], max_experiments=args.max_experiments)


if __name__ == "__main__":
    main()
