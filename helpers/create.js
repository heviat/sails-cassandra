/*
    A module for creating a record in a Cassandra keyspace
    @author: Sebastian Wilke
*/
module.exports = require('machine').build({

    friendlyName: 'Create Record',
    description: 'Creates a record in a Cassandra keyspace.',
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
            description: 'The record was created successfully.'
        },
        error: {
            description: 'An error occured.'
        }
    },

    fn: async function create(inputs, exits) {
        var _ = require('@sailshq/lodash');
        var utils = require('waterline-utils');
        var TimeUuid = require('cassandra-driver').types.TimeUuid;

        var model = inputs.models[inputs.query.using];
        if(!model)
            return exits.error(new Error('Invalid datastore.'));

        utils.eachRecordDeep([ inputs.query.newRecord ], function iterator(record, WLModel, depth) {
            if (depth !== 1) {
              return exits.error(new Error('Consistency violation: Incoming new records in a s3q should never necessitate deep iteration!  If you are seeing this error, it is probably because of a bug in this adapter, or in Waterline core.'));
            }
        
            _.each(WLModel.definition, function checkAttributes(attrDef) {
              var columnName = attrDef.columnName;
        
              // JSON stringify the values provided for any `type: 'json'` attributes
              // because Cassandra can't store JSON.
              if (attrDef.type === 'json' && _.has(record, columnName)) {
        
                // Special case: If this is the `null` literal, leave it alone.
                // But otherwise, stringify it into a JSON string.
                // (even if it's already a string!)
                if (!_.isNull(record[columnName])) {
                  record[columnName] = JSON.stringify(record[columnName]);
                }
        
              }
        
            });
        }, true, inputs.query.using, { collections: inputs.models });

        //Convert Waterline query into Waterline statement - makes it easy to generate a CQL query statement
        var statement;
        try {
            statement = utils.query.converter({
                model: inputs.query.using,
                method: 'create',
                values: inputs.query.newRecord
            });
        } catch (e) {
            return exits.error(e);
        }

        //Check if adapter should return inserted values
        var fetchRecords = false;
        if (_.has(inputs.query.meta, 'fetch') && inputs.query.meta.fetch) {
            fetchRecords = true;
        }
      
        //add autoIncrement field if necessary
        _.forOwn(model.definition, (attributeDef, name) => {
            if(attributeDef.autoMigrations.autoIncrement && (statement.insert[attributeDef.columnName] === '' || statement.insert[attributeDef.columnName] == null || statement.insert[attributeDef.columnName] == 'null')) {
                statement.insert[attributeDef.columnName] = new TimeUuid().toString();
            }
        });
        /*if(model.definition[primaryKeyField].autoMigrations.hasOwnProperty('autoIncrement')) {
            if (statement.insert.hasOwnProperty(primaryKeyColumnName)) {
                return exits.error(new Error('Primary key field is autoIncrement but not null.'));
            } else {
                statement.insert[primaryKeyColumnName] = new TimeUuid().toString();
            }
        }*/

        if(!_.isObject(statement.insert)) {
            return exits.error(new Error('Invalid values.'));
        }

        var queryString = 'INSERT INTO ' + model.tableName + ' (';
        var queryValues = [];
        var queryParameterNames = '';
        var queryParameterValues = ' VALUES (';

        _.forOwn(statement.insert, function(value, key) {
           queryValues.push(value);
           queryParameterNames += key + ',';
           queryParameterValues += '?,';
        });

        queryString += (queryParameterNames.replace(/,$/, ')') + queryParameterValues.replace(/,$/, ');'));
        
        inputs.datastore.client.execute(queryString, queryValues, { prepare: true })
            .then(result => {
                if(fetchRecords)
                    return exits.success(statement.insert);
                else
                    return exits.success();
            })
            .catch(err => {
                return exits.error(new Error(err));
            });
    }
});