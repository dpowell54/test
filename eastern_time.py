from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

EASTERN_TIMEZONE = ZoneInfo("America/New_York")


def now_eastern() -> datetime:
    """Return the current time in the US/Eastern timezone."""
    return datetime.now(tz=EASTERN_TIMEZONE)


def to_eastern(value: datetime) -> datetime:
    """Convert a datetime to US/Eastern.

    Naive datetimes are assumed to be in UTC to avoid accidental local-time bugs.
    """
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(EASTERN_TIMEZONE)


@dataclass(frozen=True)
class EasternClock:
    """Helper that formats Eastern time consistently."""

    display_format: str = "%Y-%m-%d %H:%M:%S %Z"

    def now(self) -> datetime:
        return now_eastern()

    def formatted_now(self) -> str:
        return self.now().strftime(self.display_format)
