# Enterprise ORM for OpenEdge Progress, SQL Server, and JSON Data Stores

`orm` is a mission-critical, schema-aware data access library designed for organizations that depend on reliable persistence across OpenEdge Progress environments and modern enterprise application layers.

When your business logic depends on accurate data mapping, stable schema behavior, and platform flexibility, this project provides the foundation for disciplined, production-minded data access. It is built to help teams bridge legacy database systems with modern application architecture without sacrificing control, consistency, or operational confidence.

## Why this project matters

OpenEdge Progress remains a cornerstone in many enterprise systems, especially where long-lived operational workflows, regulatory requirements, and mission-critical transactions are involved. In those environments, poor data mapping or fragile schema handling can have real business consequences.

This project helps address that challenge by offering:

- Strong schema awareness across database metadata and application-level overrides
- Consistent field typing for dates, booleans, integers, decimals, and strings
- Safe handling of sequence-driven identity patterns
- Support for multiple persistence backends in one cohesive design
- A practical structure for teams managing enterprise data responsibly

In other words, this is not just a convenience layer. It is an important building block for dependable, high-integrity data access in critical systems.

## Core capabilities

- OpenEdge Progress ORM support with schema discovery and override management
- SQL Server ORM support for structured relational workflows
- JSON file-backed ORM support for lightweight and portable implementations
- Automatic normalization of common field types and values
- Schema override support for custom business logic and dataset shaping
- Sequence and default-value handling to reduce operational drift

## Supported backends

- OpenEdge Progress
- Microsoft SQL Server
- JSON file database storage

## Project purpose

This repository is meant to support enterprise applications that need a practical and maintainable way to interact with structured data sources. Whether the environment is a classic Progress system, a SQL Server data tier, or a lightweight JSON persistence layer, the project is designed to provide a stable, structured data abstraction that keeps application code cleaner and more resilient.

## Installation

```bash
npm install
```

## Quick start

```js
const { ProgressORM } = require('./index');

const orm = new ProgressORM({
  dbName: 'inven',
  dbo: {
    sql: async (query) => {
      // Connect this to your OpenEdge Progress or SQL execution layer
      return [];
    }
  },
  schemaOwner: 'PUB'
});

orm.then(instance => {
  console.log('OpenEdge Progress schema initialized successfully');
  console.log(instance.getAllSchema());
}).catch(err => {
  console.error('ORM initialization failed:', err);
});
```

This pattern is especially valuable in OpenEdge Progress environments where schema metadata and data typing are central to system correctness.

## Typical use cases

- Legacy enterprise applications built on OpenEdge Progress
- Business systems requiring controlled schema mapping
- Integration layers that need to abstract database-specific details
- Data-heavy applications that require consistency, structure, and portability

## Operational confidence

The value of this project is greatest when data reliability matters most: inventory systems, financial processing, operational workflows, and business-critical application layers where data integrity cannot be left to chance.

With OpenEdge Progress support at the center, this library is positioned as a serious tool for teams that need dependable persistence infrastructure and a clean path toward modernized application design.

## License

ISC
