require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

const DEMO_DEVICE_ID = '8ae3b638-7b16-4eed-a2c3-fc2056e71b34';

async function checkData() {
    try {
        console.log(`\nChecking data for device ${DEMO_DEVICE_ID}...`);
        
        const { count: totalCount, error: countError } = await supabase
            .from('temperature_readings')
            .select('*', { count: 'exact', head: true })
            .eq('device_id', DEMO_DEVICE_ID);
            
        if (countError) {
            throw countError;
        }
        
        console.log(`Total records: ${totalCount}`);
        
        const { data: timeRange, error: timeError } = await supabase
            .from('temperature_readings')
            .select('timestamp')
            .eq('device_id', DEMO_DEVICE_ID)
            .order('timestamp', { ascending: true });
            
        if (timeError) {
            throw timeError;
        }
        
        if (timeRange && timeRange.length > 0) {
            const firstTimestamp = new Date(timeRange[0].timestamp * 1000);
            const lastTimestamp = new Date(timeRange[timeRange.length - 1].timestamp * 1000);
            
            console.log('\nTime range:');
            console.log(`- First record: ${firstTimestamp.toISOString()}`);
            console.log(`- Last record: ${lastTimestamp.toISOString()}`);
            console.log(`- Duration: ${Math.round((lastTimestamp - firstTimestamp) / 1000 / 60)} minutes`);
        }
        
    } catch (error) {
        console.error('Error:', error);
    }
}

checkData(); 