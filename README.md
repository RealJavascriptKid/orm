# ORM for OpenEdge Progress, SQL Server, and JSON

This Node.js library provides a schema-aware data access layer for OpenEdge
Progress, Microsoft SQL Server, and JSON file storage. It can help modernize
Progress applications by keeping common data-access calls and filter objects
consistent while moving data between supported backends.

## Why use this ORM?

Many long-running Progress applications contain valuable business rules and
workflows that are expensive to replace all at once. This ORM can help teams
move that work into a modern application layer incrementally:

- Describe filters and common reads/updates as JavaScript objects.
- Let the selected ORM build backend-specific SQL for supported operations.
- Keep the same table-oriented API when working with Progress and SQL Server.
- Use schema metadata and optional overrides to map and normalize fields.
- Use a JSON-backed implementation for lightweight storage or development.

The goal is to keep the **application-facing data-access style** familiar and
consistent—not to execute Progress ABL or automatically translate arbitrary
ABL statements, stored procedures, or hand-written SQL. Database schemas,
connection adapters, and backend-specific behavior still need to be configured
and tested as part of a migration.

## Supported backends

| Backend | ORM class | Notes |
| --- | --- | --- |
| OpenEdge Progress | `ProgressORM` | Reads schema metadata through the supplied database adapter. |
| Microsoft SQL Server | `SqlServerORM` | Reads SQL Server schema metadata through the supplied database adapter. |
| JSON files | `JsonFileDbORM` | Stores data locally and does not require a SQL adapter. |

## Installation

Clone this repository, then install its dependencies:

```bash
git clone https://github.com/RealJavascriptKid/orm.git
cd orm
npm install
```

The package entry point exports all three ORM classes:

```js
const { ProgressORM, SqlServerORM, JsonFileDbORM } = require('./index');
```

## SQL database setup

The SQL-backed ORMs expect a `dbo` adapter with a `sql(query)` method. Supply
your existing database connection/query layer; this package does not create or
manage the connection for you. The adapter's `sql` method must return query
results in the format expected by your database driver.

```js
const { ProgressORM } = require('./index');

// Replace this with your application's OpenEdge database adapter.
const dbo = {
  database: 'sales',
  sql: async (query) => {
    // Execute query with your driver and return its rows.
    return databaseClient.query(query);
  }
};

async function main() {
  const db = await new ProgressORM({
    dbName: 'sales',
    dbo,
    schemaOwner: 'PUB'
  });

  console.log(db.getAllSchema());
}

main().catch(console.error);
```

`ProgressORM` and `SqlServerORM` initialize asynchronously because they load
schema metadata. Await construction before using the ORM. For SQL-backed calls,
pass the adapter as the first argument to methods such as `read`, `insert`,
`update`, and `remove`.

For SQL Server, use the same adapter pattern with `SqlServerORM`:

```js
const { SqlServerORM } = require('./index');

async function main() {
  const db = await new SqlServerORM({
    dbName: 'Sales',
    dbo,                 // Your SQL Server adapter
    schemaOwner: 'dbo'
  });
}

main().catch(console.error);
```

## Reading data and generating queries

For supported filters, the ORM converts a table name, filter object, and
optional read settings into a backend-specific SQL query, then executes it
through `dbo.sql`. For example:

```js
const customers = await db.read(dbo, 'Customer', {
  state: 'NC'
}, {
  limit: 20,
  sort: { field: 'name', dir: 'asc' }
});
```

The filter is expressed using JavaScript data rather than embedding a SQL
`WHERE` clause. Common operators include equality (the default), comparisons,
`in`, and pattern matching:

```js
// Equivalent to state = 'NC'
const inNorthCarolina = await db.read(dbo, 'Customer', { state: 'NC' });

// state is NC or SC
const inSelectedStates = await db.read(dbo, 'Customer', {
  state: { in: ['NC', 'SC'] }
});

// Customer name contains "Farm"
const matchingNames = await db.read(dbo, 'Customer', {
  name: { '%like%': 'Farm' }
});

// Return one matching record, or null if none is found
const customer = await db.readOne(dbo, 'Customer', { id: 1001 });
```

Pagination and sorting can be passed as read options:

```js
const pageOfOrders = await db.read(dbo, 'Orders', {
  customerId: 1001
}, {
  limit: 25,
  offset: 50,
  sort: [
    { field: 'OrderDate', dir: 'desc' },
    { field: 'id', dir: 'asc' }
  ]
});
```

`take` and `skip` are aliases for `limit` and `offset`. Sorting can also be a
field name or an array of field names.

> The SQL ORMs generate and execute queries through the adapter; they do not
> expose a separate public method for returning an unexecuted SQL string.

## Inserting, updating, and removing records

The SQL-backed ORM methods use the supplied schema to build statements and
normalize supported values:

```js
await db.insert(dbo, 'Customer', {
  id: 1001,
  name: 'Example Farms',
  state: 'NC'
});

await db.update(
  dbo,
  'Customer',
  { state: 'SC' },       // Values to change
  { id: 1001 }      // Filter for records to update
);

await db.remove(dbo, 'Customer', { id: 1001 });
```

Always provide a filter when calling `update` or `remove`; these operations
reject missing or invalid filter criteria to help prevent accidental
whole-table changes. The `returnResult: true` option on `insert` and `update`
can also request matching records back.

## Keeping data-access syntax consistent during migration

The same filter and table-oriented method style can be used with either SQL
backend. For example, after configuring the corresponding adapter and schema,
the application-level query can remain the same:

```js
const filter = {
  state: { in: ['NC', 'SC'] },
  id: { '>=': 1000 }
};

// Progress-backed application
const progressCustomers = await progressDb.read(progressDbo, 'Customer', filter);

// SQL Server-backed application
const sqlServerCustomers = await sqlServerDb.read(sqlServerDbo, 'Customer', filter);
```

This can reduce database-specific query code in an application, but it does
not make two database schemas identical. Plan for schema mapping, data
conversion, unsupported database features, and validation of the generated
queries during a port.

## JSON file storage

`JsonFileDbORM` uses a different constructor and does not take a SQL adapter:

```js
const { JsonFileDbORM } = require('./index');

async function main() {
  const db = await new JsonFileDbORM({
    dbName: 'demo',
    dataPath: './data/demo'
  });

  await db.insert('Customer', {
    id: 1001,
    name: 'Example Farms',
    state: 'NC'
  });

  const customers = await db.read('Customer', { state: 'NC' });
  console.log(customers);
}

main().catch(console.error);
```

Unlike the SQL-backed ORMs, JSON methods do not take `dbo` as an argument.
JSON storage is useful for lightweight use cases, but it is not a replacement
for a relational database when relational database behavior is required.

## Schema and field handling

The SQL ORMs discover schema metadata during initialization. Schema information
is available with `getSchema(tableName)` and `getAllSchema()`. The ORM includes
handling for common field types such as dates, times, booleans, integers,
decimals, and strings, as well as schema overrides for application-specific
mapping and defaults.

Use the schema that corresponds to the target database, and verify field names,
types, sequence behavior, and defaults when moving an application between
backends.

## Important considerations

- Configure and manage the database connection and `dbo.sql` adapter in your
  application.
- Filter values in the examples must match real schema field names.
- Use the supported object filter operators rather than assuming arbitrary
  SQL or Progress ABL expressions will be translated.
- Test generated operations against a development database before using them
  in production.

## License

ISC
