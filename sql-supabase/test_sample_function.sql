SELECT * FROM sample_temperature_data(
  'xxxxxxx', -- device_id
  1744040000,  -- from_timestamp 
  1744050000,  -- to_timestamp
  3            -- sampling_rate
);

SELECT COUNT(*) FROM sample_temperature_data(
  'xxxxxxx',
  1744040000, 
  1744050000,
  3
);
