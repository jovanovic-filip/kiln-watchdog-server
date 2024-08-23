require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const DEFAULT_TIME_RANGE_HOURS = 3;
const MAX_TIME_RANGE_HOURS = 7 * 24;
const MAX_DATA_POINTS = 250;

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

app.get('/api/temperature/:deviceId', async (req, res) => {
    try {
        const { deviceId } = req.params;
        const { start, end } = req.query;
        
        const now = new Date();
        const defaultFrom = new Date(now);
        defaultFrom.setHours(now.getHours() - DEFAULT_TIME_RANGE_HOURS);
        
        const fromTimestamp = start ? parseInt(start) : Math.floor(defaultFrom.getTime() / 1000);
        const toTimestamp = end ? parseInt(end) : Math.floor(now.getTime() / 1000);
        
        if (isNaN(fromTimestamp) || isNaN(toTimestamp)) {
            return res.status(400).json({ error: 'Invalid time range parameters' });
        }
        
        const maxRangeSeconds = MAX_TIME_RANGE_HOURS * 3600;
        if (toTimestamp - fromTimestamp > maxRangeSeconds) {
            return res.status(400).json({ error: `Time range too large. Maximum range is ${MAX_TIME_RANGE_HOURS} hours.` });
        }
        
        const countQuery = await supabase
            .from('temperature_readings')
            .select('id', { count: 'exact', head: true })
            .eq('device_id', deviceId)
            .gte('timestamp', fromTimestamp)
            .lte('timestamp', toTimestamp);

        if (countQuery.error) {
            throw countQuery.error;
        }
        
        const totalCount = countQuery.count;
        
        let samplingRate = totalCount <= MAX_DATA_POINTS ? 1 : Math.ceil(totalCount / MAX_DATA_POINTS);
        
        let responseMetadata = {
            total_count: totalCount,
            from_timestamp: fromTimestamp,
            to_timestamp: toTimestamp,
            sampling_rate: samplingRate,
            max_data_points: MAX_DATA_POINTS
        };

        const { data, error } = await supabase.rpc('sample_temperature_data', {
            p_device_id: deviceId,
            p_from_timestamp: fromTimestamp,
            p_to_timestamp: toTimestamp,
            p_sampling_rate: samplingRate
        });
        
        if (error) throw error;
        
        const response = {
            meta: responseMetadata,
            data: data
        };
        
        res.json(response);
    } catch (error) {
        res.status(500).json({ error: 'Error fetching data' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
}); 