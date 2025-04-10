require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const DEFAULT_TIME_RANGE_HOURS = 3;
const MAX_TIME_RANGE_HOURS = 7 * 24;
const MAX_DATA_POINTS = 500;

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
        const { start, end, samplingEnabled = 'true', page = '1', pageSize = '1000' } = req.query;
        
        // First check if device exists
        const { data: deviceExists, error: deviceError } = await supabase
            .from('temperature_readings')
            .select('*')
            .eq('device_id', deviceId)
            .limit(1);

        if (deviceError) {
            throw deviceError;
        }

        if (!deviceExists || deviceExists.length === 0) {
            return res.status(404).json({ error: 'Device not found' });
        }
        
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
        
        // Parse samplingEnabled parameter
        const isSamplingEnabled = samplingEnabled.toLowerCase() === 'true';
        
        let samplingRate = 1;
        if (isSamplingEnabled) {
            samplingRate = totalCount <= MAX_DATA_POINTS ? 1 : Math.ceil(totalCount / MAX_DATA_POINTS);
        }
        
        // Parse pagination parameters
        const currentPage = parseInt(page);
        const itemsPerPage = parseInt(pageSize);
        
        if (isNaN(currentPage) || isNaN(itemsPerPage) || currentPage < 1 || itemsPerPage < 1) {
            return res.status(400).json({ error: 'Invalid pagination parameters' });
        }
        
        // Calculate if there are more pages
        const hasMorePages = totalCount > (currentPage * itemsPerPage);
        
        let responseMetadata = {
            total_count: totalCount,
            from_timestamp: fromTimestamp,
            to_timestamp: toTimestamp,
            sampling_rate: samplingRate,
            max_data_points: isSamplingEnabled ? MAX_DATA_POINTS : 'unlimited',
            sampling_enabled: isSamplingEnabled,
            pagination: {
                current_page: currentPage,
                items_per_page: itemsPerPage,
                has_more_pages: hasMorePages,
                total_pages: Math.ceil(totalCount / itemsPerPage)
            }
        };

        let data;
        let error;
        
        if (isSamplingEnabled) {
            // Use the existing sampling function
            const result = await supabase.rpc('sample_temperature_data', {
                p_device_id: deviceId,
                p_from_timestamp: fromTimestamp,
                p_to_timestamp: toTimestamp,
                p_sampling_rate: samplingRate
            });
            data = result.data;
            error = result.error;
        } else {
            // Use pagination for full data
            const result = await supabase
                .from('temperature_readings')
                .select('*')
                .eq('device_id', deviceId)
                .gte('timestamp', fromTimestamp)
                .lte('timestamp', toTimestamp)
                .order('timestamp', { ascending: true })
                .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);
            
            data = result.data;
            error = result.error;
        }
        
        if (error) throw error;
        
        const response = {
            meta: responseMetadata,
            data: data
        };
        
        res.json(response);
    } catch (error) {
        console.log('Error in temperature endpoint:', error);
        res.status(500).json({ error: 'Error fetching data' });
    }
});

// Only start the server if this file is run directly
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

module.exports = app; 