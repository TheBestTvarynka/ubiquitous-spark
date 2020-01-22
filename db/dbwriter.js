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
        condition = `${key} = $${i}`;
      }
    }
    i++;
    args.push(value);
    clause = clause ? `${clause} AND ${condition}` : condition;
  }
  return { clause, args };
};

const formatValue = (value, type) => {
  if (type === 'value') return `'${value}'`;
  else if (type === 'function') return value;
  else if (type === 'array') {
    return 'ARRAY[' + value.map(elem => `'${elem}'`).join(', ') + ']';
  } else null;
};

class DBInserter {
  constructor(database, table) {
    this.database = database;
    this.table = table;
    this.fieldsOrder = [];
    this.values = [];
    this.result = null;
  }
  value(values, types) {
    const resultValue = [];
    for (const value in values) {
      this.fieldsOrder.push(value);
      const formatedValue = formatValue(values[value], types[value]);
      resultValue.push(formatedValue);
    }
    const newValue = '(' + resultValue.join(', ') + ')';
    console.log(this.fieldsOrder);
    console.log(newValue);
    this.values.push(newValue);
    return this;
  }
  getvalues() {
    return this.values;
  }
  clearValues() {
    this.values = [];
    return this;
  }
  resolve(result) {
    this.result = result;
  }
  then(callback) {
    const { table, values } = this;
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
        res = err;
      }
      this.resolve(res);
      callback(res);
    });
    return this;
  }
}

class DBUpdater {
  constructor(database, table) {
    this.database = database;
    this.table = table;
    this.whereClause = undefined;
    this.args = [];
    // object of setters
    this.fields = {};
    this.result = null;
  }
  // add WHERE conditions
  where(conditions) {
    const { clause, args } = where(conditions);
    this.whereClause = clause;
    this.args = args;
    return this;
  }
  set(setters, types) {
    for (const field in setters) {
      setters[field] = formatValue(setters[field], types[field]);
    }
    this.fields = setters;
    return this;
  }
  resolve(result) {
    this.result = result;
  }
  then(callback) {
    console.log(callback);
    const { table, fields, whereClause, args } = this;
    let sql = `UPDATE ${table}`;
    const setters = [];
    for (const setter in fields) {
      setters.push(`${setter} = ${fields[setter]}`);
    }
    sql += ' SET ' + setters.join(', ');
    if (whereClause) sql += ` WHERE ${whereClause}`;
    console.log(sql);
    this.database.query(sql, args, (err, res) => {
      if (err) {
        res = err;
      }
      this.resolve(res);
      callback(res);
    });
  }
}

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
}

module.exports = {
  open: (config, logger) => new DBWriter(config, logger),
};
