-- Function to sample temperature data with even distribution
-- This function implements SQL-based sampling with MOD function
-- Always includes first and last points in the time range
-- Parameters:
--   p_device_id: The device ID to filter data
--   p_from_timestamp: The start timestamp (unix time)
--   p_to_timestamp: The end timestamp (unix time)
--   p_sampling_rate: Number of points to skip (e.g., 2 means every 2nd point)

CREATE OR REPLACE FUNCTION sample_temperature_data(
    p_device_id TEXT,
    p_from_timestamp BIGINT,
    p_to_timestamp BIGINT,
    p_sampling_rate INTEGER
)
RETURNS SETOF temperature_readings AS $$
BEGIN
    RETURN QUERY
    WITH data AS (
        SELECT 
            *,
            ROW_NUMBER() OVER (ORDER BY timestamp) as row_num,
            MIN(timestamp) OVER () as min_ts,
            MAX(timestamp) OVER () as max_ts
        FROM temperature_readings
        WHERE device_id = p_device_id::uuid
        AND timestamp >= p_from_timestamp
        AND timestamp <= p_to_timestamp
    )
    SELECT id, temperature, timestamp, "isAlarm", device_id
    FROM data
    WHERE 
        MOD(row_num, p_sampling_rate) = 0
        OR timestamp = min_ts
        OR timestamp = max_ts
    ORDER BY timestamp ASC
    LIMIT 500;
END;
$$ LANGUAGE plpgsql;

-- Usage example:
-- SELECT * FROM sample_temperature_data('d1f24e8b-ce43-45b0-ad4e-9f5b2bcafb56', 1711411200, 1711497600, 5); 