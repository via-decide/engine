import json
from pathlib import Path
from typing import Any


def save_experiment(path: str, payload: dict[str, Any]) -> None:
    out = Path(path)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(payload, indent=2))


def save_metrics(path: str, metric_name: str, metric_value: float) -> None:
    save_experiment(path, {metric_name: metric_value})
