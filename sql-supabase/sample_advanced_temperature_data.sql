-- Function to sample temperature data while preserving important extremes (mins and maxes)
-- This function implements window-based sampling that preserves:
--   1. First point in each window
--   2. Point with minimum temperature in each window
--   3. Point with maximum temperature in each window
--   4. Last point in each window
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
RETURNS SETOF temperature_readings 
AS $$
DECLARE
    v_window_count INTEGER;
    v_estimated_total_points INTEGER;
BEGIN
    -- Estimate total number of data points in the time range
    SELECT COUNT(*) INTO v_estimated_total_points
    FROM temperature_readings
    WHERE device_id = p_device_id::uuid
    AND timestamp >= p_from_timestamp
    AND timestamp <= p_to_timestamp;
    
    -- Convert sampling rate to window count
    -- We aim to have approximately total_points/sampling_rate windows
    -- With at least 10 windows but no more than 100 for reasonable performance
    v_window_count := GREATEST(10, LEAST(100, CEIL(v_estimated_total_points::float / p_sampling_rate)));
    
    RETURN QUERY
    WITH 
    -- Full dataset for the specified time range and device
    full_data AS (
        SELECT *
        FROM temperature_readings
        WHERE device_id = p_device_id::uuid
        AND timestamp >= p_from_timestamp
        AND timestamp <= p_to_timestamp
    ),
    -- Calculate window boundaries
    window_params AS (
        SELECT 
            p_from_timestamp AS window_start,
            (p_to_timestamp - p_from_timestamp) / v_window_count AS window_size
    ),
    -- Assign each data point to a window
    windowed_data AS (
        SELECT 
            d.*,
            FLOOR((d.timestamp - p.window_start) / p.window_size) AS window_id
        FROM full_data d, window_params p
    ),
    -- For each window, get first, min, max, and last points
    window_extremes AS (
        SELECT 
            window_id,
            FIRST_VALUE(id) OVER (PARTITION BY window_id ORDER BY timestamp) AS first_id,
            FIRST_VALUE(id) OVER (PARTITION BY window_id ORDER BY temperature ASC) AS min_id,
            FIRST_VALUE(id) OVER (PARTITION BY window_id ORDER BY temperature DESC) AS max_id,
            FIRST_VALUE(id) OVER (PARTITION BY window_id ORDER BY timestamp DESC) AS last_id
        FROM windowed_data
        GROUP BY window_id, id, timestamp, temperature
    ),
    -- De-duplicate the extreme points (as one point might be both min and max in a window)
    unique_extremes AS (
        SELECT DISTINCT first_id AS id FROM window_extremes
        UNION
        SELECT DISTINCT min_id FROM window_extremes
        UNION
        SELECT DISTINCT max_id FROM window_extremes
        UNION
        SELECT DISTINCT last_id FROM window_extremes
    )
    -- Join back to get all fields for the selected points
    SELECT d.id, d.temperature, d.timestamp, d."isAlarm", d.device_id
    FROM full_data d
    JOIN unique_extremes u ON d.id = u.id
    ORDER BY d.timestamp ASC
    LIMIT 500;
END;
$$ LANGUAGE plpgsql;

-- Usage example:
-- SELECT * FROM sample_advanced_temperature_data('d1f24e8b-ce43-45b0-ad4e-9f5b2bcafb56', 1711411200, 1711497600, 5);
-- This internally converts sampling rate to appropriate window count 