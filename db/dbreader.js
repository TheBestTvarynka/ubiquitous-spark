'use strict';

const { Pool } = require('pg');

const where = conditions => {
  let clause = '';
  const args = [];
  let i = 1;
  for (const key in conditions) {
    let value = conditions[key];
    let condition;
    if (typeof value === 'number') {
      condition = `${key} = $${i}`;
    } else if (typeof value === 'string') {
      if (value.startsWith('>=')) {
        condition = `${key} >= $${i}`;
        value = value.substring(2);
      } else if (value.startsWith('<=')) {
        condition = `${key} <= $${i}`;
        value = value.substring(2);
      } else if (value.startsWith('<>')) {
        condition = `${key} <> $${i}`;
        value = value.substring(2);
      } else if (value.startsWith('>')) {
        condition = `${key} > $${i}`;
        value = value.substring(1);
      } else if (value.startsWith('<')) {
        condition = `${key} < $${i}`;
        value = value.substring(1);
      } else if (value.startsWith('@>')) {
        condition = `${key} @> $${i}`;
        value = value.substring(2);
      }else if (value.includes('*') || value.includes('?')) {
        value = value.replace(/\*/g, '%').replace(/\?/g, '_');
        condition = `${key} LIKE $${i}`;
      } else {
        condition = `${key} = $${i}`;
      }
    }
    i++;
    args.push(value);
    clause = clause ? `${clause} AND ${condition}` : condition;
  }
  return { clause, args };
};

class Cursor {
  constructor(database, table) {
    this.database = database;
    this.table = table;
    // results of selecting
    this.cols = null;
    this.rows = null;
    this.rowCount = 0;
    // this.ready = false;
    // this.mode = MODE_ROWS;
    // WHERE condition
    this.whereClause = undefined;
    // columns (fields) for selecting
    this.columns = ['*'];
    this.args = [];
    // ORDER BY condition
    this.orderBy = undefined;
    this.orderDirection = undefined;
    this.lim = undefined;
  }
  // add WHERE contitions
  where(conditions) {
    const { clause, args } = where(conditions);
    this.whereClause = clause;
    this.args = args;
    return this;
  }
  // set fields that we want to select ( '*' by default )
  fields(list) {
    this.columns = list;
    return this;
  }
  limit(lim) {
    this.lim = lim;
    return this;
  }
  // set column for ordering
  order(name, direction) {
    this.orderBy = name;
    if (direction) this.orderDirection = 'ASC';
    else this.orderDirection = 'DESC';
    return this;
  }
  // cut data from result of selecting and collect them in variables
  resolve(result) {
    // console.log(result);
    const { rows, fields, rowCount } = result;
    this.rows = rows;
    this.cols = fields;
    this.rowCount = rowCount;
  }
  // function for selecting
  then(callback) {
    // collect data for selecting
    const { mode, table, columns, args } = this;
    const { whereClause, orderBy, orderDirection, columnName, lim } = this;
    const fields = columns.join(', ');
    // create request to db
    let sql = `SELECT ${fields} FROM ${table}`;
    if (whereClause) sql += ` WHERE ${whereClause}`;
    if (orderBy && orderDirection) sql += ` ORDER BY ${orderBy} ${orderDirection}`;
    if (lim) sql += ` LIMIT ${lim}`;
    console.log(sql);
    this.database.query(sql, args,  (err, res) => {
      if (err) {
        console.log(err);
        callback('');
      } else {
        this.resolve(res);
        callback(this.rows);
      }
    });
    return this;
  }
};

class DBReader {
  constructor(config, logger) {
    this.pool = new Pool(config);
    this.config = config;
    this.logger = logger;
  }
  //
  query(sql, values, callback) {
    if (typeof values === 'function') {
      callback = values;
      values = [];
    }
    this.pool.query(sql, values, (err, res) => {
      if (callback) {
        callback(err, res);
      }
    });
  }
  // choose table for selecting
  select(table) {
    return new Cursor(this, table);
  }

  close() {
    this.pool.end();
  }
};

module.exports = {
  open: (config, logger) => new DBReader(config, logger),
};
