# @adbertram/keyv-mssql

An updated Microsoft SQL Server adapter for [Keyv](https://github.com/jaredwray/keyv) with modern dependency support and TTL functionality.

## Why This Fork?

The original `keyv-mssql` package (last updated in 2020) has incompatible dependencies that cause errors with modern Node.js applications:
- Uses knex 0.19.x which depends on tarn.js 2.x
- Causes `Tarn: unsupported option opt.evictionRunIntervalMillis` errors
- Lacks proper TTL support
- Missing expires column in database schema

This fork fixes these issues by:
- ✅ Updated to knex 2.5.x (compatible with tarn.js 3.x)
- ✅ Updated to mssql 10.x
- ✅ Added full TTL support with expires column
- ✅ Improved JSON serialization/deserialization
- ✅ Better error handling

## Installation

```bash
npm install --save keyv @adbertram/keyv-mssql
```

## Usage

```js
const Keyv = require("keyv");
const KeyvMssql = require("@adbertram/keyv-mssql");

const store = new KeyvMssql({
  connection: {
    user: "SA",
    password: "Password1",
    host: "localhost",
    database: "TestDB"
  },
  table: "keyv",          // optional, defaults to 'keyv'
  keySize: 255,           // optional, defaults to 255
  useNullAsDefault: true  // optional, defaults to true
});

const keyv = new Keyv({ store: store });

// Set a value with TTL (in milliseconds)
await keyv.set('foo', 'bar', 60000); // expires in 1 minute

// Get a value
const value = await keyv.get('foo');
```

## Database Schema

The adapter automatically creates a table with the following schema:

```sql
CREATE TABLE keyv (
  [key] NVARCHAR(255) PRIMARY KEY,
  [value] NVARCHAR(MAX),
  [expires] BIGINT
)
```

If the table already exists without the `expires` column, it will be added automatically.

## Changes from Original (v2.0.0)

- Updated knex from 0.19.3 to 2.5.1
- Updated mssql from 5.1.0 to 10.0.0  
- Updated tedious from 6.3.0 to 16.0.0
- Added TTL support (`ttlSupport: true`)
- Added expires column to database schema
- Fixed JSON serialization in get/set methods
- Improved error handling
- Added automatic migration for existing tables

## License

MIT

## Credits

Original package by [Paul Morgan III](https://github.com/pmorgan3/keyv-mssql)  
Updated and maintained by [Adam Bertram](https://github.com/adbertram)



