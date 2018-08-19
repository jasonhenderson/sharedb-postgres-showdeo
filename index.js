const DB = require('sharedb').DB;
const pg = require('pg');

// Postgres-backed ShareDB database

function PostgresDB(options) {

  if (!(this instanceof PostgresDB)) return new PostgresDB(options);

  this.shard = options.shard || 1;

  DB.call(this, options);

  this.closed = false;

  this.pool = new pg.Pool(options);
}

module.exports = PostgresDB;

PostgresDB.prototype = Object.create(DB.prototype);

PostgresDB.prototype.close = function(callback) {
  this.closed = true;
  this.pool.end();

  if (callback) callback();
};

// Persists an op and snapshot if it is for the next version. Calls back with
// callback(err, succeeded)
PostgresDB.prototype.commit = function(collection, id, op, snapshot, options, callback) {
  /*
   * op: CreateOp {
   *   src: '24545654654646',
   *   seq: 1,
   *   v: 0,
   *   create: { type: 'http://sharejs.org/types/JSONv0', data: { ... } },
   *   m: { ts: 12333456456 } }
   * }
   * snapshot: PostgresSnapshot
   */

  const self = this;

  this.pool.connect((err, client, done) => {
    if (err) {
      done(client);
      callback(err);
      return;
    }

    /*
    * This query uses common table expression to upsert the snapshot table
    * (iff the new version is exactly 1 more than the latest table or if
    * the document id does not exists)
    *
    * It will then insert into the ops table if it is exactly 1 more than the
    * latest table or it the first operation and iff the previous insert into
    * the snapshot table is successful.
    *
    * This result of this query the version of the newly inserted operation
    * If either the ops or the snapshot insert fails then 0 rows are returned
    *
    * If 0 zeros are return then the callback must return false
    *
    */
    // ZW: We also should have the first op version be 0 (the actual value
    // of op.v) instead of 1, in order to match the reference MemoryDB
    // implementation.  Catching up outdated clients who reconnect may be
    // buggy otherwise.
    const query = {
      name: 'sdb-commit-op-and-snap',
      text: `WITH snapshot_id AS (
        INSERT INTO show${self.shard}.shared_snapshot (collection_id, data_id, data_type, version, account_id, data)
        SELECT $1 collection_id, $2 data_id,
               $3 snap_type, $4::int4 snap_v, $8 account, $5::jsonb snap_data
        WHERE $4 = (
          SELECT version+1 snap_v
          FROM show${self.shard}.shared_snapshot
          WHERE collection_id = $1 AND data_id = $2
          FOR UPDATE
        ) OR NOT EXISTS (
          SELECT 1
          FROM show${self.shard}.shared_snapshot
          WHERE collection_id = $1 AND data_id = $2
          FOR UPDATE
        )
        ON CONFLICT (data_id) DO 
          UPDATE SET data_type = $3, version = $4::int4, data = $5::jsonb 
        RETURNING version
      )
      INSERT INTO show${self.shard}.shared_op (collection_id, data_id, version, account_id, operation)
      SELECT $1 collection_id, $2 data_id,
             $6::int4 op_v, $8 account, $7::jsonb op
      WHERE (
        $6 = (
          SELECT max(version)+1
          FROM show${self.shard}.shared_op
          WHERE collection_id = $1 AND data_id = $2
        ) OR NOT EXISTS (
          SELECT 1
          FROM show${self.shard}.shared_op
          WHERE collection_id = $1 AND data_id = $2
        )
      ) AND EXISTS (SELECT 1 FROM snapshot_id)
      RETURNING version`,
      values: [
        collection,
        id,
        snapshot.type,
        snapshot.v,
        JSON.stringify(snapshot.data),
        op.v,
        JSON.stringify(op),
        options.user.accountId,
      ],
    };
    client.query(query, (err, res) => {
      if (err) {
        callback(err);
      } else if (res.rows.length === 0) {
        done(client);
        callback(null, false);
      }
      else {
        done(client);
        callback(null, true);
      }
    });

  });
};

// Get the named document from the database. The callback is called with (err,
// snapshot). A snapshot with a version of zero is returned if the docuemnt
// has never been created in the database.
PostgresDB.prototype.getSnapshot = function(collection, id, fields, options, callback) {

  const self = this;

  this.pool.connect(function(err, client, done) {
    if (err) {
      done(client);
      callback(err);
      return;
    }
    client.query(
        `SELECT version, data, data_type FROM show${self.shard}.shared_snapshot WHERE collection_id = $1 AND data_id = $2 LIMIT 1`,
        [collection, id],
        function(err, res) {
          done();
          if (err) {
            callback(err);
            return;
          }
          if (res.rows.length) {
            const row = res.rows[0];
            const snapshot = new PostgresSnapshot(
                id,
                row.version,
                row.data_type,
                row.data,
                undefined, // TODO: metadata
            );
            callback(null, snapshot);
          } else {
            const snapshot = new PostgresSnapshot(
                id,
                0,
                null,
                undefined,
                undefined,
            );
            callback(null, snapshot);
          }
        },
    );
  });
};

// Get operations between [from, to) noninclusively. (Ie, the range should
// contain start but not end).
//
// If end is null, this function should return all operations from start onwards.
//
// The operations that getOps returns don't need to have a version: field.
// The version will be inferred from the parameters if it is missing.
//
// Callback should be called as callback(error, [list of ops]);
PostgresDB.prototype.getOps = function(collection, id, from, to, options, callback) {

  const self = this;

  this.pool.connect(function(err, client, done) {
    if (err) {
      done(client);
      callback(err);
      return;
    }

    // ZW: Add explicit row ordering here
    client.query(`
      SELECT version, operation 
      FROM show${self.shard}.shared_op 
      WHERE collection_id = $1 
        AND data_id = $2 
        AND version >= $3 
        AND version < $4 
      ORDER BY version ASC`,
        [collection, id, from, to],
        function(err, res) {
          done();
          if (err) {
            callback(err);
            return;
          }
          callback(null, res.rows.map(function(row) {
            return row.operation;
          }));
        },
    );
  });
};

function PostgresSnapshot(id, version, type, data, meta) {
  this.id = id;
  this.v = version;
  this.type = type;
  this.data = data;
  this.m = meta;
}
