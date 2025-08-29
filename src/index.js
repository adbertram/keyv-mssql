const tedious = require("tedious");
const EventEmitter = require("events");
const Sql = require("knex");

class KeyvMssql extends EventEmitter {
  constructor(opts) {
    super(opts);
    // set default values
    opts.table = opts.table || 'keyv'
    opts.keySize = opts.keySize || 255
    opts.client = opts.client || 'mssql'
    opts.useNullAsDefault = opts.useNullAsDefault || true
    this.ttlSupport = true;  // Enable TTL support
    this.opts = Object.assign({
        table: opts.table,
        keySize: opts.keySize
      },
      opts
    );

    this.sql = Sql(opts);
    this.sql.schema
      .hasTable(this.opts.table)
      .then(async (exists) => {
        if (!exists) {
          await this.sql.schema.createTable(this.opts.table, table => {
            table
              .string("key", this.opts.keySize || 255)
              .primary();
            table
              .text("value")
              .nullable()
              .defaultTo(null);
            table
              .bigInteger("expires")
              .nullable()
              .defaultTo(null);
          }).catch(err => this.emit(err));
        } else {
          // Check if expires column exists, add it if not
          const hasExpires = await this.sql.schema.hasColumn(this.opts.table, 'expires');
          if (!hasExpires) {
            await this.sql.schema.table(this.opts.table, table => {
              table.bigInteger("expires").nullable().defaultTo(null);
            }).catch(err => this.emit(err));
          }
        }
        this.keyvtable = this.sql(this.opts.table)
      });
  }

  async get(key) {
    const client = this.sql(this.opts.table);
    const row = await client
      .select("value", "expires")
      .where({
        key: key
      })
      .first()
      .catch(() => undefined);

    if (!row) {
      return undefined;
    }

    // Check if the item has expired
    if (row.expires && row.expires < Date.now()) {
      // Clean up expired item
      await this.delete(key);
      return undefined;
    }

    // Try to parse JSON if it looks like JSON
    try {
      return JSON.parse(row.value);
    } catch (e) {
      // If not JSON, return as-is
      return row.value;
    }
  }

  async set(key, value, ttl) {
    // Handle TTL - if provided, calculate expiration time
    const expires = ttl ? Date.now() + ttl : null;
    
    // Serialize value properly - don't do string replacements on JSON
    const serializedValue = typeof value === 'string' ? value : JSON.stringify(value);

    const client = this.sql(this.opts.table);

    // Use MERGE/UPSERT pattern for better compatibility
    const existing = await client
      .where({ key: key })
      .first();
    
    if (existing) {
      await client
        .where({ key: key })
        .update({
          value: serializedValue,
          expires: expires
        });
    } else {
      await client
        .insert({
          key: key,
          value: serializedValue,
          expires: expires
        });
    }

    return true;
  }

  async delete(key) {
    let doesKeyExist = await this.get(key);
    if (doesKeyExist === undefined) return false;
    const client = this.sql(this.opts.table);
    const exists = await client
      .where({
        key: key
      })
      .select("*");
    if (exists) {
      return await client
        .where({
          key: key
        })
        .del()
        .then(() => true, () => false);
    }
    return false;
  }
  async clear() {
    const client = this.sql(this.opts.table);
    // If we have a namespace, only clear those keys
    if (this.namespace) {
      return await client
        .where('key', 'like', `${this.namespace}:%`)
        .del()
        .then(() => undefined);
    } else {
      // Clear all keys if no namespace
      return await client
        .del()
        .then(() => undefined);
    }
  }
}
module.exports = KeyvMssql;