import { union } from "lodash";
import { ReactionType } from "./models/enums";

let tableName = "kahaniverseTable"; 
if(process.env.ENV && process.env.ENV !== "NONE") {
  tableName = tableName + '-' + process.env.ENV;
}

const inactiveKeyName = 'inactive';

export const ownerKeyName = "owner";

// convert url string param to expected Type
export const convertType = (param: string, type: any) => {
  switch (type) {
    case "N":
      return Number.parseInt(param);
    default:
      return param;
  }
};

export function queryOne(params: any, res: { statusCode: number; json: (arg0: { error: string; }) => void; }, convert = (data) => data) {
  let getItemParams:any = {
    TableName: tableName,
    Key: params
  };

  dynamodb.get(getItemParams, (err: { message: string; }, data: { Item: any; }) => {
    if (err) {
      res.statusCode = 500;
      res.json({ error: 'Could not load items: ' + err.message });
    } else {
      if (data.Item) {
        res.json(convert(data.Item));
      } else {
        res.json(convert(data));
      }
    }
  });
}

function getProjection(query: { limit?: 20; marker?: any; includeDeleted?: false; oldestFirst?: false; projection?: any; }) {
  return query.projection;
}

function getFilters(query: any[]) {
  return query.filter;
}

export async function queryMany(condition: string, values: { ":pk"?: any; ":sk"?: any; ":type"?: string; ":sorter"?: string; }, query: any, names = null, index = null, convert = (data) => data) {
  const {limit = 20, marker = null, includeDeleted = false, oldestFirst = false} = query;

  const projection = getProjection(query);
  const filter = getFilters(query);

  let queryParams:any = {
    TableName: tableName,
    ScanIndexForward: oldestFirst
  };

  if(marker) {
    queryParams.ExclusiveStartKey = marker; 
  } 
  
  if(index) queryParams.IndexName = index;

  if(!values) {
    queryParams.KeyConditions = condition;
  } else {
    queryParams.KeyConditionExpression = condition;
    queryParams.ExpressionAttributeValues = values;
    if(names) queryParams.ExpressionAttributeNames = names;
  }

  if(filter) { //assumes filter is in AWS DDB format
    queryParams.FilterExpression = filter + (!includeDeleted ? ' AND ' : '');
  } 
  
  // if(!includeDeleted) {
  //   queryParams.FilterExpression = (queryParams.FilterExpression || '') + '(attribute_not_exists(' + inactiveKeyName + ') OR ' + inactiveKeyName + ' = :' + inactiveKeyName + ')';
  //   queryParams.ExpressionAttributeValues[':'+inactiveKeyName] = { "N": 0 }
  // }

  if(projection) queryParams.ProjectionExpression = projection;

  let counter = 0;
  let actionedItems = []; //this may cause memory overflow
  let result;
  do {
    if(limit) queryParams.Limit = limit - counter;
    // console.log(queryParams);
    result = (await dynamodb.query(queryParams).promise());
    queryParams.ExclusiveStartKey = result.LastEvaluatedKey;
    if (result.Items.length > 0) {
      actionedItems = union(actionedItems, !index ? result.Items : result.Items.map(convert));
    };
    counter+= result.Items.length;
  } while(result.LastEvaluatedKey && counter<limit);

  if(!index) {
    return convert(actionedItems);
  } else {
    return actionedItems;
  }
}

export function markInactive(params: {}, res: { statusCode: any; json: any; }, req: { apiGateway?: { event: { requestContext: { identity: { cognitoIdentityId: any; }; }; }; }; url: any; body: any; }) {
  let getItemParams = {
    TableName: tableName,
    Key: params
  };

  dynamodb.get(getItemParams, (err: { message: string; }, data: { Item: { [x: string]: number; }; }) => {
    if (err) {
      res.statusCode = 500;
      res.json({ error: 'Could not load items: ' + err.message });
    } else {
      if (data.Item) {
        data.Item[inactiveKeyName] = new Date().getTime();
        let putItemParams = {
          TableName: tableName,
          Item: data.Item
        };
        dynamodb.put(putItemParams, (err: any, data: any) => {
          if (err) {
            res.statusCode = 500;
            res.json({ error: err, url: req.url, body: req.body });
          } else {
            res.json({ success: 'delete call succeed!', url: req.url, data: data });
          }
        });
      } else {
        res.json({ error: 'More than a single data. Cannot delete' });
      }
    }
  });
}

export function putItem(req: {
    apiGateway?: {
      event: { //   queryParams.FilterExpression = (queryParams.FilterExpression || '') + '(attribute_not_exists(' + inactiveKeyName + ') OR ' + inactiveKeyName + ' = :' + inactiveKeyName + ')';
        //   queryParams.ExpressionAttributeValues[':'+inactiveKeyName] = { "N": 0 }
        // }
        requestContext: { identity: { cognitoIdentityId: any; }; };
      };
    } | { event: { requestContext: { identity: { cognitoIdentityId: any; }; }; }; }; url: any; body: any;
  }, res: { statusCode: any; json: any; }) {
  // delete req.body.id; //since we have PK, SK and id is from GraphQL code
    
  let putItemParams = {
    TableName: tableName,
    Item: req.body//,
    // ReturnValues: 'ALL_OLD'
  };
  dynamodb.put(putItemParams, (err: any, data: any) => {
    if (err) {
      res.statusCode = 500;
      res.json({ error: err, url: req.url, body: req.body });
    } else {
      res.json({ success: 'put call succeed!', url: req.url, data: req.body });
    }
  });
}

export function createItem(req: {
    apiGateway?: {
      event: { //   queryParams.FilterExpression = (queryParams.FilterExpression || '') + '(attribute_not_exists(' + inactiveKeyName + ') OR ' + inactiveKeyName + ' = :' + inactiveKeyName + ')';
        //   queryParams.ExpressionAttributeValues[':'+inactiveKeyName] = { "N": 0 }
        // }
        requestContext: { identity: { cognitoIdentityId: any; }; };
      };
    } | { event: { requestContext: { identity: { cognitoIdentityId: any; }; }; }; }; url: any; body: any;
  }, res: { statusCode: any; json: any; }) {
  delete req.body.id; //since we have PK, SK and id is from GraphQL code
  const notAuthor = req.body.notAuthor;
  delete req.body.notAuthor;
    
  let putItemParams = {
    TableName: tableName,
    Item: {
      ...req.body,
      loveCount:0,
      followCount:0,
      viewCount:0
    }
  };

  if(notAuthor) {
    const params:any = {
      TransactItems: [
        {
          Put: putItemParams,
        },
        {
          Update: {
            TableName: tableName,
            Key: {
              PK: convertUrlToKey("USER", req.apiGateway.event.requestContext.identity.cognitoIdentityId),
              SK: convertUrlToKey("USER", req.body.owner)
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

    dynamodb.transactWrite(params, (err: any, data: any) => {
      if (err) {
        res.statusCode = 500;
        res.json({ error: err, url: req.url, body: req.body });
      } else {
        res.json({ success: 'put call succeed!', url: req.url, data: req.body });
      }
    });
  } else {
    dynamodb.put(putItemParams, (err: any, data: any) => {
      if (err) {
        res.statusCode = 500;
        res.json({ error: err, url: req.url, body: req.body });
      } else {
        res.json({ success: 'put call succeed!', url: req.url, data: req.body });
      }
    });
  }
}

export async function incrementField(on: {PK:string, SK:string}, field:string, type?:string) {  

  if(type) {
    //to add viewCount in the main record instead of another META, first get the record by query on the Type index using the SK and then increment
    let queryItemParams:any = {
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
    } catch (err) {
      if (err) {
        console.log('==========error in increment of field 1================' + field);
        console.log({type, SK:on.PK});
        console.log(err);
        console.log('====================================');
      }
      return;
    }
  }

  let updateItemParams = {
    TableName: tableName,
    Key: {PK:on.PK, SK:on.SK},
    UpdateExpression: "add #count :incr",
    ExpressionAttributeNames: {
      "#count": field,
    },
    ExpressionAttributeValues: {
      ":incr": 1,
    },
    // ReturnValues: 'ALL_OLD' or ALL_NEW
  };
  dynamodb.update(updateItemParams, (err: any, data: any) => {
    if (err) {
      console.log('==========error in increment of field 2================' + field);
      console.log(err);
      console.log('====================================');
    }
  });
}

export function putItemIncrement(req: any, res: any, on: { PK: any; SK: any; }, action:ReactionType, by, what) {
  const params:any = {
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

  dynamodb.transactWrite(params, (err: any, data: any) => {
    if (err) {
      res.statusCode = 500;
      res.json({ error: err, url: req.url, body: req.body });
    } else {
      res.json({ success: 'reaction add success!', url: req.url, data: req.body });
    }
  });
}

export function deleteItemDecrement(req: any, res: any, on: { PK: any; SK: any; }, action:ReactionType, by, what) {
  console.log('================deleteItemDecrement==============');
  console.log(req.body);
  console.log(on);
  console.log(by);
  console.log('====================================');
  const params:any = {
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

  dynamodb.transactWrite(params, (err: any, data: any) => {
    if (err) {
      res.statusCode = 500;
      res.json({ error: err, url: req.url, body: req.body });
    } else {
      res.json({ success: 'reaction remove success!', url: req.url, data: req.body });
    }
  });
}
