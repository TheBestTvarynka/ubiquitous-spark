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
      } else if (value.includes('*') || value.includes('?')) {
        value = value.replace(/\*/g, '%').replace(/\?/g, '_');
        condition = `${key} LIKE $${i}`;
      } else {
        // ch
        // condition = `${key} = ${value}`;
        condition = `${key} = $${i}`;
      }
    }
    i++;
    args.push(value);
    clause = clause ? `${clause} AND ${condition}` : condition;
  }
  return { clause, args };
};

class DBInserter {
  constructor(database, table) {
    this.database = database;
    this.table = table;
    this.fieldsOrder = [];
    this.values = [];
  }
  value(value) {
    const newValue = '(' + value.map(elem => (`'${elem}'`)).join(', ') + ')';
    this.values.push(newValue);
    return this;
  }
  values(values) {
    this.values = this.values.concat(values);
    return this;
  }
  getvalues() {
    return values;
  }
  clearValues() {
    this.values = [];
    return this;
  }
  fields(list) {
    this.fieldsOrder = list;
    return this;
  }
  then(callback) {
    const { table, fields, values } = this;
    const { pool } = this;
    // create a request to db
    let sql = `INSERT INTO ${table}`;
    if (this.fieldsOrder !== []) {
      const fieldsOrder = ' (' + this.fieldsOrder.join(', ') + ')';
      sql += fieldsOrder;
    }
    const value = values.join(',');
    sql += ' VALUES ' + value;
    this.database.query(sql, (err, res) => {
      if (err) {
        console.log(err);
        callback('');
      } else {
        callback(res);
      }
    });

    return this;
  }
};

class DBUpdater {
  constructor(database, table) {
    this.database = database;
    this.table = table;
    this.whereClause = undefined;
    this.args = [];
    // object of setters
    this.fields = {};
  }
  // add WHERE conditions
  where(conditions) {
    const { clause, args} = where(conditions);
    this.whereClause = clause;
    this.args = args;
    return this;
  }
  set(setters) {
    this.fields = setters;
    return this;
  }
  then(callback) {
    console.log(callback);
    const { table, fields, whereClause, args } = this;
    let sql = `UPDATE ${table}`;
    const setters = [];
    for (const setter in fields) {
      setters.push(`${setter} = '${fields[setter]}'`);
    }
    sql += ' SET ' + setters.join(', ');
    if (whereClause) sql += ` WHERE ${whereClause}`;
    console.log(sql);
    this.database.query(sql, args, (err, res) => {
      if (err) {
        console.log(err);
        callback('');
      } else {
        callback(res);
      }
    });
  }
};

class DBWriter {
  constructor(config, logger) {
    this.pool = new Pool(config);
    this.config = config;
    this.logger = logger;
  }
  // get object for inserting in db
  insert(table) {
    return new DBInserter(this, table);
  }
  update(table) {
    return new DBUpdater(this, table);
  }
  query(sql, args, callback) {
    if (typeof args === 'function') {
      callback = args;
      args = [];
    }
    this.pool.query(sql, args, (err, res) => {
      if (callback) {
        callback(err, res);
      }
    });
  }
  close() {
    this.pool.end();
  }
};

module.exports = {
  open: (config, logger) => new DBWriter(config, logger),
};
