"""Toy training script.
The agent loop is allowed to modify only this file.
"""

import math
from prepare import format_metric

# Agent-searchable hyperparameter.
LEARNING_RATE = 0.0063


def run_training() -> float:
    """Simulate validation loss as a function of learning rate."""
    optimum = 0.0125
    smooth_loss = 0.85 + abs(math.log10(LEARNING_RATE) - math.log10(optimum)) * 0.35
    return smooth_loss


if __name__ == "__main__":
    val_loss = run_training()
    print(format_metric("validation_loss", val_loss))
