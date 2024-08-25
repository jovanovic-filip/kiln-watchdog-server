# Kiln Watchdog Server

Supplement server that exposes temperature data collected through Kiln Watchdog system.

## Running

```bash
npm install
npm start
```

## API Endpoints

### GET /api/temperature/:deviceId
Returns temperature readings for a specific device.

#### Query Parameters
- `start` (optional): Unix timestamp for start of time range
- `end` (optional): Unix timestamp for end of time range

If time range is not specified, returns last 3 hours of data.

#### Response Format
```json
{
  "meta": {
    "total_count": number,
    "from_timestamp": number,
    "to_timestamp": number,
    "sampling_rate": number,
    "max_data_points": number
  },
  "data": [
    {
      "id": string,
      "temperature": number,
      "timestamp": number,
      "isAlarm": boolean,
      "device_id": string
    }
  ]
}
```

#### Limitations
- Maximum time range: 7 days
- Maximum data points returned: 250 (data is automatically sampled if more points exist) 