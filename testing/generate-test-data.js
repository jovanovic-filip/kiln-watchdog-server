require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

const DEMO_DEVICE_ID = '8ae3b638-7b16-4eed-a2c3-fc2056e71b34';
const NUM_RECORDS = 2500; 
const TEMP_MIN = 20;
const TEMP_MAX = 30;

function getRandomTemp() {
    return TEMP_MIN + Math.random() * (TEMP_MAX - TEMP_MIN);
}

function getRandomTimestamp() {
    const now = Math.floor(Date.now() / 1000);
    const oneDayAgo = now - 86400;
    return Math.floor(oneDayAgo + Math.random() * 86400);
}

function getRandomIsAlarm() {
    return Math.random() < 0.1;
}

async function generateTestData() {
    console.log(`Generating ${NUM_RECORDS} test records for device ${DEMO_DEVICE_ID}...`);
    
    const batchSize = 100;
    const batches = Math.ceil(NUM_RECORDS / batchSize);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < batches; i++) {
        const batch = [];
        const batchStart = i * batchSize;
        const batchEnd = Math.min(batchStart + batchSize, NUM_RECORDS);
        
        for (let j = batchStart; j < batchEnd; j++) {
            batch.push({
                device_id: DEMO_DEVICE_ID,
                temperature: getRandomTemp(),
                timestamp: getRandomTimestamp(),
                isAlarm: getRandomIsAlarm()
            });
        }
        
        try {
            const { data, error } = await supabase
                .from('temperature_readings')
                .insert(batch);
                
            if (error) {
                console.error(`Error inserting batch ${i+1}:`, error);
                errorCount += batch.length;
            } else {
                successCount += batch.length;
                console.log(`Group ${i+1}/${batches} successfully inserted (${successCount}/${NUM_RECORDS})`);
            }
        } catch (err) {
            console.error(`Error inserting batch ${i+1}:`, err);
            errorCount += batch.length;
        }
    }
    
    console.log('\nData generation completed:');
    console.log(`- Successfully inserted: ${successCount} records`);
    console.log(`- Errors: ${errorCount} records`);
}

generateTestData().catch(console.error); 