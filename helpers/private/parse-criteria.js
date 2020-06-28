/*
    A helper for parsing the Waterline query criteria into a WHERE clause.
    @author: Sebastian Wilke
*/
module.exports = function parseCriteria(key, value) {
    var _ = require('@sailshq/lodash');

    var parameters = [];
    var query = '';

    if(!value && 'undefined' == typeof value) {
		console.log('value: ' + value);
        //if criteria has structure like: { first_name: 'Max', last_name: 'Mustermann' }
        if(_.isObject(key)) {
            var tmp = [];
            _.forOwn(key, (childKey, childValue) => {
                var entry = this.parseCriteria(childValue, childKey);
                parameters = parameters.concat(entry.values);
                tmp.push(entry.query);
            });
            query = tmp.join(' AND ');
        }
    } else if(_.isArray(value)) {
        if(key === 'and') {
            var tmp = [];
            value.forEach(values => {
                var entry = this.parseCriteria(values);
				if(entry.query !== '' && entry.query) {
					parameters = parameters.concat(entry.values);
					tmp.push(entry.query);
				}
            });
            query = tmp.join(' AND ');
        }
    } else if(_.isPlainObject(value)) {
        //if criteria has a modifier in it like: { age: { '<=': 30 } }
        var modifierArray = [];
        _.forOwn(value, (childValue, childKey) => {
            switch(childKey) {
                case '>':
                case '>=':
                case '<':
                case '<=':
                case '!=':
                    modifierArray.push('"' + key + '" ' + childKey + ' ?');
                    parameters.push(childValue); 
                    break;
                case 'in':
                    if(_.isArray(childValue)) {
                        childValue.forEach(values => {
                            if(!(_.isString(values) || _.isNumber(values) || _.isDate(values))) {
                                throw new Error('Invalid IN query.');
                            } 
                        });
                        parameters = parameters.concat(childValue);
                        var placeholder = '', i = 0;
                        for(i = 0; i < childValue.length; i++) {
                            placeholder += '?,';
                        }
                        modifierArray.push('"' + key + '" IN (' + placeholder.substring(0, placeholder.length - 1) + ')');
                    }   
                    break;
                default:
                    throw new Error('Unsupported modifier: ' + childKey);
                    break;
            }
        });
        query = modifierArray.join(' AND ');
    } else if((_.isString(value) || _.isNumber(value) || _.isDate(value) && _.isString(key))) {
        query = '"' + key + '" = ?';
        parameters.push(value);
    }
    return { query: query, values: parameters };
};