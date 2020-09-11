# sails-cassandra

Provides easy access to `cassandra` from Sails.js & Waterline.

This module is a Sails/Waterline community adapter.  Its goal is to provide a set of declarative interfaces, conventions, and best-practices for integrating with the cassandra database/service.

Strict adherence to an adapter specification enables the (re)use of built-in generic test suites, standardized documentation, reasonable expectations around the API for your users, and overall, a more pleasant development experience for everyone.


## Installation

Currently, this adapter is in the development process. That's why it's not hosted on npm. The only way to install sails-cassandra is to clone this repository and move it into your project's `node_modules` folder. 

After that, you can  configure the adapter just like the following in the `config/datastores.js` of Sails:

```
cassandra: {
	adapter: 'sails-cassandra',
    user: 'user',
    password: 'password',
  
    contactPoints: [ 'localhost' ],
    keyspace: 'testDatabase',
    localDataCenter: 'datacenter1',
    schema: true
}
```
## Usage

Visit [Models & ORM](https://sailsjs.com/docs/concepts/models-and-orm) in the docs for more information about using models, datastores, and adapters in your app/microservice.

## Questions?

See [Extending Sails > Adapters > Custom Adapters](https://sailsjs.com/documentation/concepts/extending-sails/adapters/custom-adapters) in the [Sails documentation](https://sailsjs.com/documentation), or check out [recommended support options](https://sailsjs.com/support).

<a href="https://sailsjs.com" target="_blank" title="Node.js framework for building realtime APIs."><img src="https://github-camo.global.ssl.fastly.net/9e49073459ed4e0e2687b80eaf515d87b0da4a6b/687474703a2f2f62616c64657264617368792e6769746875622e696f2f7361696c732f696d616765732f6c6f676f2e706e67" width=60 alt="Sails.js logo (small)"/></a>


## Compatibility

This adapter implements the following methods:

| Method               | Status              | Category      |
|:---------------------|:--------------------|:--------------|
| registerDatastore    | Implemented         | LIFECYCLE     |
| teardown             | _**in progress**_   | LIFECYCLE     |
| create               | Implemented         | DML           |
| createEach           | Planned             | DML           |
| update               | Implemented         | DML           |
| destroy              | Implemented   	     | DML           |
| find                 | Implemented         | DQL           |
| join                 | _**not supported**_ | DQL           |
| count                | Implemented         | DQL           |
| sum                  | Planned             | DQL           |
| avg                  | Planned             | DQL           |
| define               | Planned             | DDL           |
| drop                 | Planned             | DDL           |
| setSequence          | _**???**_           | DDL           |


## License

This cassandra adapter is available under the **MIT license**.

As for [Waterline](http://waterlinejs.org) and the [Sails framework](https://sailsjs.com)?  They're free and open-source under the [MIT License](https://sailsjs.com/license).

