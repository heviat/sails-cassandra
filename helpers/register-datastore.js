/*
    A module for registering a waterline datastore.
    @author: Sebastian Wilke
*/
module.exports = require('machine').build({

    friendlyName: 'Register datastore',
    description: 'Waterline datastore registration for Cassandra',
    sync: true,

    inputs: {
        identity: {
            description: 'A unique identifier for this connection.',
            required: true,
            type: 'string'
        },
        config: {
            description: 'The Cassandra configuration parameters for the datastore.',
            required: true,
            type: 'ref'
        },
        models: {
            description: 'The Waterline models which are using this datastore.',
            required: true,
            type: 'ref'
        },
        datastores: {
            description: 'An array containing all of the datastores that have been registered.',
            required: true,
            type: 'ref'
        },
        modelDefinitions: {
            description: 'An object containing all of the model definitions that have been registered.',
            required: true,
            type: 'ref'
        }
    },
    exits: {
        success: {
            description: 'The Cassandra datastore was initialized successfully.'
        },
        configError: {
            description: 'Your configuration is invalid.',
            outputType: 'ref'
        },
        error: {
            description: 'An error occured.'
        }
    },

    fn: function registerDatastore(inputs, exits) {
        var _ = require('@sailshq/lodash');
        var cassandra = require('cassandra-driver');

        if(inputs.datastores[inputs.identity]) {
            return exits.error(new Error('Datastore ' + inputs.identity + ' is already registered.'));
        }

        if(!inputs.config.keyspace) {
            return exits.configError(new Error('Datastore ' + inputs.identity + ': no keyspace defined.'))
        }

        //check if authentication for Cassandra is configured
        if(inputs.config.user) {
            if(!inputs.config.password) {
                inputs.config.password = null;
            }

            inputs.config.authProvider = new cassandra.auth.PlainTextAuthProvider(inputs.config.user, inputs.config.password);
        }

        if(!inputs.config.contactPoints || inputs.config.contactPoints.length === 0) {
            return exits.configError(new Error('Datastore ' + inputs.identity + ': no contact points defined.'));
        }
        
        //check if primary keys are defined as required or autoIncrement
        _.each(inputs.models, (modelDef, modelIdentity) => {
            if(modelDef.primaryKey) {
                var primaryKeyAttr = modelDef.definition[modelDef.primaryKey];
                // Ensure that the model's primary key has either `autoIncrement` or `required`
                if (primaryKeyAttr.required !== true && (!primaryKeyAttr.autoMigrations || primaryKeyAttr.autoMigrations.autoIncrement !== true)) {
                    return exits.configError(new Error('In model `' + modelIdentity + '`, primary key `' + modelDef.primaryKey + '` must have either `required` or `autoIncrement` set.'));
                }
            }
        });
        
        var client = new cassandra.Client(inputs.config);

        // Build up a database schema that can be used for this connection 
        // throughout the adapter
        var dbSchema = {};

        _.each(inputs.models, function buildSchema(val) {
            var identity = val.identity;
            var tableName = val.tableName;
            var definition = val.definition;

            dbSchema[tableName] = {
                identity: identity,
                tableName: tableName,
                definition: definition,
                attributes: definition,
                primaryKey: val.primaryKey
            };
        });

        // Store the connection
        inputs.datastores[inputs.identity] = {
            client: client,
            config: inputs.config,
            driver: cassandra
        };

        // Store the db schema for the connection
        inputs.modelDefinitions[inputs.identity] = dbSchema;

        return exits.success();
    }
})