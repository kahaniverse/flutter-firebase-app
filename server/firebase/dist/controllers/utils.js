"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getId = exports.deleteItemDecrement = exports.putItemIncrement = exports.incrementField = exports.createItem = exports.putItem = exports.markInactive = exports.queryMany = exports.queryOne = exports.convertUrlToKey = exports.convertType = exports.uuid = exports.ownerKeyName = void 0;
const lodash_1 = require("lodash");
const slugify = require("slugify");
const AWS = require('aws-sdk');
AWS.config.update({ region: process.env.TABLE_REGION });
const dynamodb = new AWS.DynamoDB.DocumentClient();
let tableName = "kahaniverseTable";
if (process.env.ENV && process.env.ENV !== "NONE") {
    tableName = tableName + '-' + process.env.ENV;
}
const inactiveKeyName = 'inactive';
exports.ownerKeyName = "owner";
// create uuid
const uuid = (name, time, yyyymmdd = false, id) => {
    if (time) {
        //Strategy: Combining the time in milli-secs  and converting into 36 radix and adding 6 random alphanumeric to take care of concurrency if any
        const dateString = new Date(time - ((new Date()).getTimezoneOffset() * 60000)).toISOString().split("T")[0]; //in yyyy-mm-dd
        const timeString = time.toString(36);
        const dateTime = (yyyymmdd ? (dateString + 'A' + timeString.substring(2)) : timeString); //A is used as a reserved character that is used for ranking. This allows us to have bottom 10 and top 25 added on daily basis
        if (!name) {
            //padding is not required as only 8 digits from now to 100 years later required
            return dateTime + (id ? id.substring(id.length - 6) : Math.random().toString(36).substring(2, 8));
        }
        return dateTime + slugify(name); //this will sort all keys by time first and then their names
    }
    return slugify(name);
};
exports.uuid = uuid;
// convert url string param to expected Type
const convertType = (param, type) => {
    switch (type) {
        case "N":
            return Number.parseInt(param);
        default:
            return param;
    }
};
exports.convertType = convertType;
const convertUrlToKey = (...params) => {
    var ret = '';
    for (let index = 0; index < params.length; index++) {
        const suffix = params[index];
        ret = (suffix === null || suffix === void 0 ? void 0 : suffix.startsWith(ret)) ? suffix : ret + suffix;
        ret = (ret.endsWith('#')) ? ret : ret + '#';
    }
    return ret;
};
exports.convertUrlToKey = convertUrlToKey;
function queryOne(params, res, convert = (data) => data) {
    let getItemParams = {
        TableName: tableName,
        Key: params
    };
    dynamodb.get(getItemParams, (err, data) => {
        if (err) {
            res.statusCode = 500;
            res.json({ error: 'Could not load items: ' + err.message });
        }
        else {
            if (data.Item) {
                res.json(convert(data.Item));
            }
            else {
                res.json(convert(data));
            }
        }
    });
}
exports.queryOne = queryOne;
function getProjection(query) {
    return query.projection;
}
function getFilters(query) {
    return query.filter;
}
async function queryMany(condition, values, query, names = null, index = null, convert = (data) => data) {
    const { limit = 20, marker = null, includeDeleted = false, oldestFirst = false } = query;
    const projection = getProjection(query);
    const filter = getFilters(query);
    let queryParams = {
        TableName: tableName,
        ScanIndexForward: oldestFirst
    };
    if (marker) {
        queryParams.ExclusiveStartKey = marker;
    }
    if (index)
        queryParams.IndexName = index;
    if (!values) {
        queryParams.KeyConditions = condition;
    }
    else {
        queryParams.KeyConditionExpression = condition;
        queryParams.ExpressionAttributeValues = values;
        if (names)
            queryParams.ExpressionAttributeNames = names;
    }
    if (filter) { //assumes filter is in AWS DDB format
        queryParams.FilterExpression = filter + (!includeDeleted ? ' AND ' : '');
    }
    // if(!includeDeleted) {
    //   queryParams.FilterExpression = (queryParams.FilterExpression || '') + '(attribute_not_exists(' + inactiveKeyName + ') OR ' + inactiveKeyName + ' = :' + inactiveKeyName + ')';
    //   queryParams.ExpressionAttributeValues[':'+inactiveKeyName] = { "N": 0 }
    // }
    if (projection)
        queryParams.ProjectionExpression = projection;
    let counter = 0;
    let actionedItems = []; //this may cause memory overflow
    let result;
    do {
        if (limit)
            queryParams.Limit = limit - counter;
        // console.log(queryParams);
        result = (await dynamodb.query(queryParams).promise());
        queryParams.ExclusiveStartKey = result.LastEvaluatedKey;
        if (result.Items.length > 0) {
            actionedItems = (0, lodash_1.union)(actionedItems, !index ? result.Items : result.Items.map(convert));
        }
        ;
        counter += result.Items.length;
    } while (result.LastEvaluatedKey && counter < limit);
    if (!index) {
        return convert(actionedItems);
    }
    else {
        return actionedItems;
    }
}
exports.queryMany = queryMany;
function markInactive(params, res, req) {
    let getItemParams = {
        TableName: tableName,
        Key: params
    };
    dynamodb.get(getItemParams, (err, data) => {
        if (err) {
            res.statusCode = 500;
            res.json({ error: 'Could not load items: ' + err.message });
        }
        else {
            if (data.Item) {
                data.Item[inactiveKeyName] = new Date().getTime();
                let putItemParams = {
                    TableName: tableName,
                    Item: data.Item
                };
                dynamodb.put(putItemParams, (err, data) => {
                    if (err) {
                        res.statusCode = 500;
                        res.json({ error: err, url: req.url, body: req.body });
                    }
                    else {
                        res.json({ success: 'delete call succeed!', url: req.url, data: data });
                    }
                });
            }
            else {
                res.json({ error: 'More than a single data. Cannot delete' });
            }
        }
    });
}
exports.markInactive = markInactive;
function putItem(req, res) {
    // delete req.body.id; //since we have PK, SK and id is from GraphQL code
    let putItemParams = {
        TableName: tableName,
        Item: req.body //,
        // ReturnValues: 'ALL_OLD'
    };
    dynamodb.put(putItemParams, (err, data) => {
        if (err) {
            res.statusCode = 500;
            res.json({ error: err, url: req.url, body: req.body });
        }
        else {
            res.json({ success: 'put call succeed!', url: req.url, data: req.body });
        }
    });
}
exports.putItem = putItem;
function createItem(req, res) {
    delete req.body.id; //since we have PK, SK and id is from GraphQL code
    const notAuthor = req.body.notAuthor;
    delete req.body.notAuthor;
    let putItemParams = {
        TableName: tableName,
        Item: Object.assign(Object.assign({}, req.body), { loveCount: 0, followCount: 0, viewCount: 0 })
    };
    if (notAuthor) {
        const params = {
            TransactItems: [
                {
                    Put: putItemParams,
                },
                {
                    Update: {
                        TableName: tableName,
                        Key: {
                            PK: (0, exports.convertUrlToKey)("USER", req.apiGateway.event.requestContext.identity.cognitoIdentityId),
                            SK: (0, exports.convertUrlToKey)("USER", req.body.owner)
                        },
                        UpdateExpression: "SET #typ = :val",
                        ExpressionAttributeNames: {
                            "#typ": "type",
                        },
                        ExpressionAttributeValues: {
                            ":val": "AUTHOR",
                        },
                    },
                },
            ],
        };
        dynamodb.transactWrite(params, (err, data) => {
            if (err) {
                res.statusCode = 500;
                res.json({ error: err, url: req.url, body: req.body });
            }
            else {
                res.json({ success: 'put call succeed!', url: req.url, data: req.body });
            }
        });
    }
    else {
        dynamodb.put(putItemParams, (err, data) => {
            if (err) {
                res.statusCode = 500;
                res.json({ error: err, url: req.url, body: req.body });
            }
            else {
                res.json({ success: 'put call succeed!', url: req.url, data: req.body });
            }
        });
    }
}
exports.createItem = createItem;
async function incrementField(on, field, type) {
    if (type) {
        //to add viewCount in the main record instead of another META, first get the record by query on the Type index using the SK and then increment
        let queryItemParams = {
            TableName: tableName,
            KeyConditionExpression: "#typ = :type AND SK = :sk",
            ExpressionAttributeValues: {
                ":type": type,
                ":sk": on.PK
            },
            ExpressionAttributeNames: {
                "#typ": "type"
            },
            IndexName: "byType"
        };
        try {
            on = (await dynamodb.query(queryItemParams).promise()).Items[0];
        }
        catch (err) {
            if (err) {
                console.log('==========error in increment of field 1================' + field);
                console.log({ type, SK: on.PK });
                console.log(err);
                console.log('====================================');
            }
            return;
        }
    }
    let updateItemParams = {
        TableName: tableName,
        Key: { PK: on.PK, SK: on.SK },
        UpdateExpression: "add #count :incr",
        ExpressionAttributeNames: {
            "#count": field,
        },
        ExpressionAttributeValues: {
            ":incr": 1,
        },
        // ReturnValues: 'ALL_OLD' or ALL_NEW
    };
    dynamodb.update(updateItemParams, (err, data) => {
        if (err) {
            console.log('==========error in increment of field 2================' + field);
            console.log(err);
            console.log('====================================');
        }
    });
}
exports.incrementField = incrementField;
function putItemIncrement(req, res, on, action, by, what) {
    const params = {
        TransactItems: [
            {
                Put: {
                    TableName: tableName,
                    Item: req.body,
                    ConditionExpression: "attribute_not_exists(PK)",
                },
            },
            {
                Update: {
                    TableName: tableName,
                    Key: on,
                    UpdateExpression: "add #count :incr",
                    ExpressionAttributeNames: {
                        "#count": action.toLowerCase() + "Count",
                    },
                    ExpressionAttributeValues: {
                        ":incr": 1,
                    },
                },
            },
            {
                Update: {
                    TableName: tableName,
                    Key: by,
                    UpdateExpression: "add #count :incr",
                    ExpressionAttributeNames: {
                        "#count": what,
                    },
                    ExpressionAttributeValues: {
                        ":incr": 1,
                    },
                },
            },
        ],
    };
    dynamodb.transactWrite(params, (err, data) => {
        if (err) {
            res.statusCode = 500;
            res.json({ error: err, url: req.url, body: req.body });
        }
        else {
            res.json({ success: 'reaction add success!', url: req.url, data: req.body });
        }
    });
}
exports.putItemIncrement = putItemIncrement;
function deleteItemDecrement(req, res, on, action, by, what) {
    console.log('================deleteItemDecrement==============');
    console.log(req.body);
    console.log(on);
    console.log(by);
    console.log('====================================');
    const params = {
        TransactItems: [
            {
                Delete: {
                    TableName: tableName,
                    Key: req.body
                },
            },
            {
                Update: {
                    TableName: tableName,
                    Key: on,
                    UpdateExpression: "SET #count = #count + :incr",
                    ExpressionAttributeNames: {
                        "#count": action.toLowerCase() + "Count",
                    },
                    ExpressionAttributeValues: {
                        ":incr": -1,
                    },
                },
            },
            {
                Update: {
                    TableName: tableName,
                    Key: by,
                    UpdateExpression: "SET #count = #count + :incr",
                    ExpressionAttributeNames: {
                        "#count": what,
                    },
                    ExpressionAttributeValues: {
                        ":incr": -1,
                    },
                },
            },
        ],
    };
    dynamodb.transactWrite(params, (err, data) => {
        if (err) {
            res.statusCode = 500;
            res.json({ error: err, url: req.url, body: req.body });
        }
        else {
            res.json({ success: 'reaction remove success!', url: req.url, data: req.body });
        }
    });
}
exports.deleteItemDecrement = deleteItemDecrement;
function getId(pk) {
    return pk.substring(pk.indexOf('#') + 1, pk.length - 1);
}
exports.getId = getId;
//# sourceMappingURL=utils.js.map