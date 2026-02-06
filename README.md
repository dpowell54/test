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

## Sony 4K archive compression

The `compress_sony_4k.py` script uses ffmpeg (H.265/HEVC 10-bit) for smaller archival files.

Install dependencies:

```bash
brew install ffmpeg
```

Compress a single file:

```bash
python3 compress_sony_4k.py /path/to/footage.mov --output-dir ./compressed
```

Compress a folder (non-recursive):

```bash
python3 compress_sony_4k.py /path/to/folder --output-dir ./compressed
```

Common quality tweaks:

```bash
# Higher quality (larger files)
python3 compress_sony_4k.py /path/to/footage.mov --crf 24

# Faster encode
python3 compress_sony_4k.py /path/to/footage.mov --preset medium

# Downscale to 1080p for smaller archives
python3 compress_sony_4k.py /path/to/footage.mov --downscale 1920
```

### Packaging as a personal macOS app

You can bundle the script into a standalone app for personal use with PyInstaller. ffmpeg
must still be installed separately (the app will call the system `ffmpeg` binary).

```bash
python3 -m pip install --user pyinstaller
pyinstaller --onefile --name sony-4k-compress compress_sony_4k.py
```

The executable will be placed in `dist/sony-4k-compress`. You can then move it anywhere
on your Mac, or wrap it into an Automator application if you prefer a double-clickable app.
