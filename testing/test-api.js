const axios = require('axios');

const API_URL = 'http://localhost:3000/api/temperature';
const DEVICE_ID = '8ae3b638-7b16-4eed-a2c3-fc2056e71b34';

async function testEndpoint(params = {}) {
  try {
    const queryString = new URLSearchParams(params).toString();
    const url = `${API_URL}/${DEVICE_ID}?${queryString}`;
    console.log(`\nTesting: ${url}`);
    
    const response = await axios.get(url);
    const { meta, data } = response.data;
    
    console.log('Metadata:');
    console.log(`- Total data points: ${meta.total_count}`);
    console.log(`- Sampling enabled: ${meta.sampling_enabled}`);
    console.log(`- Sampling rate: ${meta.sampling_rate}`);
    console.log(`- Maximum data points: ${meta.max_data_points}`);
    
    if (meta.pagination) {
      console.log('Pagination:');
      console.log(`- Current page: ${meta.pagination.current_page}`);
      console.log(`- Items per page: ${meta.pagination.items_per_page}`);
      console.log(`- Has more pages: ${meta.pagination.has_more_pages}`);
      console.log(`- Total pages: ${meta.pagination.total_pages}`);
    }
    
    console.log(`Number of returned data: ${data.length}`);
    
    return response.data;
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
    return null;
  }
}

// Main function for testing
async function runTests() {
  console.log('=== TESTING API ENDPOINT ===');
  
  // Test 1: Default behavior (sampling enabled)
  console.log('\n=== TEST 1: Default behavior ===');
  await testEndpoint();
  
  // Test 2: Sampling explicitly enabled
  console.log('\n=== TEST 2: Sampling explicitly enabled ===');
  await testEndpoint({ samplingEnabled: 'true' });
  
  // Test 3: Sampling disabled
  console.log('\n=== TEST 3: Sampling disabled ===');
  await testEndpoint({ samplingEnabled: 'false' });
  
  // Test 4: Pagination - first page
  console.log('\n=== TEST 4: Pagination - first page ===');
  await testEndpoint({ samplingEnabled: 'false', page: '1', pageSize: '100' });
  
  // Test 5: Pagination - second page
  console.log('\n=== TEST 5: Pagination - second page ===');
  await testEndpoint({ samplingEnabled: 'false', page: '2', pageSize: '100' });
  
  // Test 6: Time range
  console.log('\n=== TEST 6: Time range ===');
  const timeNow = Math.floor(Date.now() / 1000);
  const oneHourAgo = timeNow - 3600;
  await testEndpoint({ 
    samplingEnabled: 'false', 
    start: oneHourAgo.toString(), 
    end: timeNow.toString() 
  });
  
  // Test 7: Large number of data (1600)
  console.log('\n=== TEST 7: Large number of data (1600) ===');
  await testEndpoint({ 
    samplingEnabled: 'false', 
    pageSize: '1600'
  });

  // Test 8: All data from last 24 hours
  console.log('\n=== TEST 8: All data from last 24 hours ===');
  const currentTime = Math.floor(Date.now() / 1000);
  const oneDayAgo = currentTime - (24 * 3600);
  await testEndpoint({ 
    samplingEnabled: 'false',
    start: oneDayAgo.toString(),
    end: currentTime.toString(),
    pageSize: '3000'
  });
  
  console.log('\n=== TESTING COMPLETED ===');
}

// Run tests
runTests().catch(console.error); 