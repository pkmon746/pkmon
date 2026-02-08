// Direct PSA API Test Script
// Run with: node test-psa-direct.js

const fetch = require('node-fetch');

const PSA_API_URL = 'https://api.psacard.com/publicapi';
const PSA_TOKEN = 'C2MNdaW2IO9Xlbm1MXC0Q_ARCaVfQbkldZRsMYd6oWP8ZACXog6jzv6X7QrgyWwYRgNmU3fn5tKp99zf8lRHiugZiEsjnOl4t_EpApf7JixN7HXvzwkGUZ8jxfpYNqszBBUZsOHS0mRatl3h-KxNvyd0qHV-QuDyryiiEFMq50tdWIiqrLEdil0xGi478LrtrLfnB9kP10jBpk6_dWV_UjI6jRF9_gRwQy3meG9Bitgvpghg-1DImavKxNW_i6ojZYrCIY5DK3w3uMkniqr8DNunZxZu-2c25o7dymeXq8DqU_Wh';

// Test with a CERT number
const certNumber = process.argv[2] || '12345678';

console.log(`\n🧪 Testing PSA API Direct Call`);
console.log(`================================================`);
console.log(`CERT Number: ${certNumber}`);
console.log(`API URL: ${PSA_API_URL}/cert/GetByCertNumber/${certNumber}`);
console.log(`Token (first 50 chars): ${PSA_TOKEN.substring(0, 50)}...`);
console.log(`Token length: ${PSA_TOKEN.length} characters`);
console.log(`================================================\n`);

async function testPSA() {
    try {
        console.log('📡 Sending request...\n');

        const response = await fetch(
            `${PSA_API_URL}/cert/GetByCertNumber/${certNumber}`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${PSA_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log(`📥 Response Status: ${response.status} ${response.statusText}`);
        console.log(`📥 Response Headers:`);
        for (const [key, value] of response.headers.entries()) {
            console.log(`   ${key}: ${value}`);
        }
        console.log('');

        const text = await response.text();
        console.log(`📄 Raw Response (first 1000 chars):`);
        console.log(text.substring(0, 1000));
        console.log('');

        if (response.ok) {
            try {
                const data = JSON.parse(text);
                console.log(`✅ SUCCESS! Parsed JSON:\n`);
                console.log(JSON.stringify(data, null, 2));
                console.log(`\n🔑 Available fields:`);
                console.log(Object.keys(data));
            } catch (e) {
                console.error(`❌ JSON Parse Error:`, e.message);
            }
        } else {
            console.error(`❌ API Error: ${response.status}`);
            try {
                const errorData = JSON.parse(text);
                console.log('Error details:', JSON.stringify(errorData, null, 2));
            } catch (e) {
                console.log('Error response (raw):', text);
            }
        }

    } catch (error) {
        console.error(`💥 Exception:`, error.message);
        console.error(`Stack:`, error.stack);
    }
}

testPSA();
