from pathlib import Path


def read_file(path: str) -> str:
    return Path(path).read_text()


def write_file(path: str, content: str) -> None:
    Path(path).write_text(content)


def apply_patch(path: str, old: str, new: str) -> bool:
    current = read_file(path)
    if old not in current:
        return False
    write_file(path, current.replace(old, new, 1))
    return True
