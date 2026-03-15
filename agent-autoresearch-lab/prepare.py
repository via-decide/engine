"""Environment and data utilities.
This file is intentionally stable and should not be modified by the agent loop.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class Dataset:
    train_size: int = 1024
    val_size: int = 256


def load_dataset() -> Dataset:
    """Return a lightweight dataset descriptor for toy experiments."""
    return Dataset()


def format_metric(name: str, value: float) -> str:
    return f"{name}={value:.6f}"
