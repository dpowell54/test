# test

Utilities for keeping track of Eastern time.

## Usage

```python
from eastern_time import EasternClock, now_eastern, to_eastern

current = now_eastern()
clock = EasternClock()
print(clock.formatted_now())
print(to_eastern(current))
```
