# Agent Autoresearch Lab

A minimal autonomous research loop inspired by `autoresearch`.

## What this is

This project demonstrates an AI-friendly `edit -> run -> evaluate -> keep/revert` cycle.
The loop modifies only `train.py`, runs an experiment, evaluates `validation_loss`,
and keeps improvements using git commits.

## Repository layout

- `program.md`: experiment goal and rules.
- `prepare.py`: setup/data helpers (stable, not edited by loop).
- `train.py`: only mutable research target.
- `engine/agent_loop.py`: core autonomous loop.
- `engine/experiment_runner.py`: runs timed experiment.
- `engine/evaluation.py`: parses and compares metrics.
- `engine/git_memory.py`: commit improvements and revert bad runs.
- `tools/code_editor.py`: read/write/patch utility.
- `tools/experiment_logger.py`: saves experiment artifacts.
- `logs/experiments/`: per-experiment JSON logs.

## How the loop works

1. Propose a small change to `train.py` (`LEARNING_RATE`).
2. Run `python train.py` (timeout: 5 minutes).
3. Parse `validation_loss=...` from output.
4. If metric improved, commit; otherwise revert.
5. Persist experiment record in `logs/experiments/experiment_XXX.json`.

## Run

```bash
cd agent-autoresearch-lab
python engine/agent_loop.py --max-experiments 5
```

## Future extensions

The architecture is intentionally small so you can later add:
- multi-agent coordination
- distributed experiments
- LLM planning
- richer tool orchestration
