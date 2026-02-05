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

## Weather Meister export

```python
from weather_meister import assess_risk, fetch_weather, format_weather, write_weather_to_excel

metrics = fetch_weather("Boston, MA")
print(format_weather(metrics))

risk = assess_risk(
    metrics,
    temperature_amber=30,
    temperature_red=35,
    wind_amber=40,
    wind_red=60,
    humidity_amber=70,
    humidity_red=85,
)
write_weather_to_excel("weather_log.xlsx", metrics, risk)
```

Environment variables:
- `WEATHER_MEISTER_API_KEY` and `WEATHER_MEISTER_BASE_URL` (required to call Weather Meister).
- Optional thresholds: `WEATHER_RISK_TEMPERATURE_AMBER`, `WEATHER_RISK_TEMPERATURE_RED`,
  `WEATHER_RISK_WIND_AMBER`, `WEATHER_RISK_WIND_RED`, `WEATHER_RISK_HUMIDITY_AMBER`,
  `WEATHER_RISK_HUMIDITY_RED`.
