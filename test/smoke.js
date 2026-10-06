const assert = require('node:assert/strict');
const orm = require('../');

assert.deepEqual(Object.keys(orm).sort(), [
  'JsonFileDbORM',
  'ProgressORM',
  'SqlServerORM'
]);

for (const ORM of Object.values(orm)) {
  assert.equal(typeof ORM, 'function');
}
