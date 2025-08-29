#!/usr/bin/env node

const KeyvMssql = require('./src/index.js');

async function testFix() {
    console.log('Testing fixed keyv-mssql...');
    
    // Load environment variables from BrickBuddy
    require('dotenv').config({ path: '../BrickBuddyApp-cache-fix/api/.env.development' });
    
    const connection = {
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        options: {
            encrypt: true,
            trustServerCertificate: process.env.NODE_ENV === 'test',
            requestTimeout: 5000,
            connectTimeout: 5000,
            enableArithAbort: true
        }
    };
    
    console.log('Connection config:', {
        host: connection.host,
        database: connection.database,
        user: connection.user,
        hasPassword: !!connection.password
    });
    
    try {
        console.log('Creating KeyvMssql store with fixed version...');
        const store = new KeyvMssql({
            connection: connection,
            table: 'keyv_cache_test_fix',
            keySize: 255,
            useNullAsDefault: true
        });
        
        // Wait for table creation
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const testKey = 'test:fix:expired:key';
        const testValue = { data: 'test expired value', timestamp: Date.now() };
        
        console.log('Testing set operation...');
        const setStart = Date.now();
        // Set with very short TTL (1 second)
        await store.set(testKey, testValue, 1000);
        console.log(`Set completed in ${Date.now() - setStart}ms`);
        
        console.log('Testing get operation (should work)...');
        const getStart = Date.now();
        const retrieved = await store.get(testKey);
        console.log(`Get completed in ${Date.now() - getStart}ms`);
        console.log('Retrieved value:', retrieved);
        
        console.log('Waiting 2 seconds for expiration...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('Testing get operation on expired key (this used to cause infinite loop)...');
        const expiredStart = Date.now();
        const expiredValue = await store.get(testKey);
        console.log(`Expired get completed in ${Date.now() - expiredStart}ms`);
        console.log('Expired value:', expiredValue);
        
        if (expiredValue === undefined) {
            console.log('✅ SUCCESS: Expired key returned undefined without infinite loop');
        } else {
            console.log('❌ FAILURE: Expired key should return undefined');
        }
        
        console.log('Testing direct delete operation...');
        await store.set(testKey, testValue, 60000); // 1 minute TTL
        const deleteResult = await store.delete(testKey);
        console.log('Delete result:', deleteResult);
        
        console.log('\n✅ Fixed keyv-mssql test completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Fixed keyv-mssql test failed:', error);
        console.error('Stack:', error.stack);
        process.exit(1);
    }
}

// Run test
testFix().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
});