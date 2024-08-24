const request = require('supertest');
const express = require('express');
const app = require('./server');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client for tests
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

describe('Temperature API', () => {
  let validDeviceId;

  beforeAll(async () => {
    // Get first valid device_id from the database
    const { data, error } = await supabase
      .from('temperature_readings')
      .select('device_id')
      .limit(1)
      .single();
    
    if (error || !data) {
      throw new Error('Could not find a valid device_id for tests. Please check if you have data in the database.');
    }
    
    validDeviceId = data.device_id;
  });

  test('GET /api/temperature/:deviceId - basic test', async () => {
    const response = await request(app)
      .get(`/api/temperature/${validDeviceId}`)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('meta');
    expect(response.body).toHaveProperty('data');
    expect(response.body.meta).toHaveProperty('total_count');
  });

  test('GET /api/temperature/:deviceId - with time range', async () => {
    const now = Math.floor(Date.now() / 1000);
    const threeHoursAgo = now - (3 * 60 * 60);
    
    const response = await request(app)
      .get(`/api/temperature/${validDeviceId}?start=${threeHoursAgo}&end=${now}`)
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body.meta.from_timestamp).toBe(threeHoursAgo);
    expect(response.body.meta.to_timestamp).toBe(now);
  });

  test('GET /api/temperature/:deviceId - invalid time range', async () => {
    const response = await request(app)
      .get(`/api/temperature/${validDeviceId}?start=invalid&end=invalid`)
      .expect('Content-Type', /json/)
      .expect(400);

    expect(response.body).toHaveProperty('error');
  });

  test('GET /api/temperature/:deviceId - non-existent device', async () => {
    const response = await request(app)
      .get('/api/temperature/00000000-0000-0000-0000-000000000000')
      .expect('Content-Type', /json/)
      .expect(404);

    expect(response.body).toHaveProperty('error', 'Device not found');
  });
}); 