import re


def parse_validation_loss(output: str) -> float:
    """Extract `validation_loss=<float>` from train.py output."""
    matches = re.findall(r"validation_loss=([0-9]+(?:\.[0-9]+)?)", output)
    if not matches:
        raise ValueError("validation_loss was not found in experiment output")
    return float(matches[-1])


def is_improvement(metric: float, best_metric: float | None) -> bool:
    """Lower validation loss is better."""
    return best_metric is None or metric < best_metric
