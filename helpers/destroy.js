/*
    A module for deleting a record in a Cassandra keyspace
    @author: Sebastian Wilke
*/
module.exports = require('machine')({

    friendlyName: 'Destroy Records',
    description: 'Destroy records in a Cassandra table.',
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
                method: 'destroy',
                criteria: inputs.query.criteria
            });
        } catch (e) {
            return exits.error(e);
        }
        
        //Parse where clause
        var where = Helpers.parseCriteria(statement.where);

        
        //cassandra delete query execution
        function executeDelete(results) {
            //construct the query
            var query = 'DELETE FROM ' + model.tableName + (where.query ? ' WHERE ' + where.query : '');
            
            //send the query using the cassandra NodeJS driver by datastax
            inputs.datastore.client.execute(query, where.values ? where.values : [], { prepare : true }, function(err, result) {
                if(err) {
                    return exits.error(err);
                }

                return exits.success(results);
            });
        }
        
        //Check if adapter should return deleted values
        if(_.has(inputs.query.meta, 'fetch') && inputs.query.meta.fetch) {
            var selectQuery = 'SELECT * FROM ' + model.tableName + (where.query ? ' WHERE ' + where.query : '') + ' ALLOW FILTERING';
            var results = [];
            //send the query using the cassandra NodeJS driver by datastax with streams
            inputs.datastore.client.eachRow(selectQuery, where.values ? where.values : [], { prepare : true }, function(n, row) {
                var result = {};
                //iterate through every row
                _.forOwn(row, (value, key) => {
                    //get the original attribute name from the Waterline model
                    var attributeName = Object.keys(model.definition).filter(attribute => model.definition[attribute].columnName !== undefined && model.definition[attribute].columnName === key)[0];
                    result[attributeName] = value;       
                });
                results.push(result);
            }, function(err, count) {
                if(err) {
                    return exits.error(err);
                }
                //successful.
                executeDelete(results);
            });
        } else {
            executeDelete();
        }
    }
})