/*
    A module for counting records in a Cassandra keyspace
    @author: Sebastian Wilke
*/
module.exports = require('machine')({

    friendlyName: 'Count Records',
    description: 'Counts records in a Cassandra table.',
    sync: false,

    inputs: {
        models: {
            description: 'An object containing all of the Waterline models for this datastore.',
            required: true,
            type: 'ref'
        },
        datastore: {
            description: 'The registered datastore.',
            required: true,
            type: 'ref'
        },
        query: {
            description: 'A valid Waterline query.',
            required: true,
            type: 'ref'
        }
    },
    exits: {
        success: {
            description: 'Executed the query successfully.'
        },
        error: {
            description: 'An error occured.'
        }
    },

    fn: async function find(inputs, exits) {
        var _ = require('@sailshq/lodash');
        var utils = require('waterline-utils');
        var Helpers = require('./private');

        var model = inputs.models[inputs.query.using];
        if(!model)
            return exits.error('Invalid datastore.');

        //Convert Waterline query into Waterline statement - makes it easy to generate a CQL query statement

        var statement;
        try {
            statement = utils.query.converter({
                model: inputs.query.using,
                method: 'count',
                criteria: inputs.query.criteria
            });
        } catch (e) {
            return exits.error(e);
        }
        
        //Parse where clause
        var where = Helpers.parseCriteria(statement.where);

        //construct the query
        var query = 'SELECT COUNT(*) FROM ' + model.tableName + (where ? ' WHERE ' + where.query : '') + ' ALLOW FILTERING;';

        //send the query using the cassandra NodeJS driver by datastax with streams
        inputs.datastore.client.execute(query, where.values, { prepare : true }, function(err, result) {
            if(err) {
                return exits.error(err);
            }

            return exits.success(result.rows[0].count);
        });
    }
})