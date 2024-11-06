import { convertUrlToKey, queryMany, queryOne, markInactive, putItem, ownerKeyName } from "./dal/aws";
const { upperCase } = require("lodash");

const type = "USER";
const partitionKeyName = "PK";
const sortKeyName = "SK";
const METADATA = 'USER';

function addNestedPath(app: { get: (arg0: string, arg1: (req: any, res: any) => Promise<void>) => void; }, nestedPath: string, nestedType: string) {

  /********************************
   * HTTP Get method for listing further nested objects
   ********************************/
  app.get('/profile/' + nestedPath, async function (req: { apiGateway: { event: { requestContext: { identity: { cognitoIdentityId: any; }; }; }; }; url: any; body: any; query: any; }, res: { statusCode: number; json: (arg0: { error: string; url?: any; body?: any; }) => void; }) {  
    const owner = req.apiGateway && req.apiGateway.event.requestContext.identity.cognitoIdentityId;
    if (!owner) {
      res.statusCode = 401;
      res.json({ error: 'Unknown user', url: req.url, body: req.body });
      return;
    }

    const result = await getProfile(req, owner);
    var condition = 'PK = :pk AND begins_with (SK, :sk)' //TODO: also add reactions to this profile
    let values = {
      ":pk": convertUrlToKey(type, result.owner) ,
      ":sk": upperCase(nestedType)
    };

    try {
      res.json(await queryMany(condition, values, req.query, null, 'byOwner'));
    } catch (err) {
      res.statusCode = 500;
      res.json({ error: 'Could not load items: ' + err });
    }
  });

}

export function addProfilePaths(app: { get: (arg0: string, arg1: (req: any, res: any) => Promise<void>) => void; post: (arg0: string, arg1: (req: any, res: any) => void) => void; put: (arg0: string, arg1: (req: any, res: any) => void) => void; delete: (arg0: string, arg1: (req: any, res: any) => void) => void; }) {
  addNestedPath(app, 'universes', 'UNIV');
  addNestedPath(app, 'stories', 'STORY');
  addNestedPath(app, 'characters', 'CHARACTER');
  addNestedPath(app, 'comments', 'COMMENT');
  addNestedPath(app, 'reactions', 'REACTION'); //on this user. for by use /reactions/

  /********************************
   * HTTP Get method for user's profile *
   ********************************/
  app.get('/profile', async function (req: { apiGateway: { event: { requestContext: { identity: { cognitoIdentityId: any; }; }; }; }; url: any; body: any; }, res: { statusCode: number; json: (arg0: { error: string; url?: any; body?: any; }) => void; }) {  
    try {
      const owner = req.apiGateway && req.apiGateway.event.requestContext.identity.cognitoIdentityId;
      if (!owner) {
        res.statusCode = 401;
        res.json({ error: 'Unknown user', url: req.url, body: req.body });
        return;
      }
      const result = await getProfile(req as any, owner);
      res.json(result); //assume only one
    } catch (err) {
      res.statusCode = 500;
      res.json({ error: 'Could not load items: ' + err });
    }
  });

  /************************************
  * HTTP post method for insert object *
  *************************************/
  app.post('/profile', function (req: { apiGateway: { event: { requestContext: { identity: { cognitoIdentityId: any; }; }; }; }; url: any; body: { [x: string]: any; }; }, res: { statusCode: number; json: (arg0: { error: string; url: any; body: any; }) => void; }) {
    const owner = req.apiGateway && req.apiGateway.event.requestContext.identity.cognitoIdentityId;
    if (!owner) {
      res.statusCode = 401;
      res.json({ error: 'Unknown user', url: req.url, body: req.body });
      return;
    }
    
    req.body = {
      [partitionKeyName]: convertUrlToKey(type, owner),
      [sortKeyName]: convertUrlToKey(METADATA, req.body[ownerKeyName] || owner), //TODO: add suffix #1, #2, for additional profile type rows. For example illustrator who is already an author
      type,
      createdAt: new Date().getTime(),
      // [ownerKeyName]: owner,//already in body
      ...req.body
    };

    putItem(req, res);
  });

  /************************************
  * HTTP put method for update object. Assumes body contains the right PK and SK to overwrite *
  *************************************/
  app.put('/profile', function (req: { apiGateway: { event: { requestContext: { identity: { cognitoIdentityId: any; }; }; }; }; url: any; body: { updatedAt: number; }; }, res: { statusCode: number; json: (arg0: { error: string; url: any; body: any; }) => void; }) {  
    const owner = req.apiGateway && req.apiGateway.event.requestContext.identity.cognitoIdentityId;
    if (!owner) {
      res.statusCode = 401;
      res.json({ error: 'Unknown user', url: req.url, body: req.body });
      return;
    } 

    req.body.updatedAt = new Date().getTime();

    putItem(req, res);
  });

  /**************************************
  * HTTP remove method to mark independent object inactive *
  ***************************************/
  app.delete('/profile', function (req: { apiGateway: { event: { requestContext: { identity: { cognitoIdentityId: any; }; }; }; }; url: any; body: any; }, res: { statusCode: number; json: (arg0: { error: string; url: any; body: any; }) => void; }) {    
    const owner = req.apiGateway && req.apiGateway.event.requestContext.identity.cognitoIdentityId;
    var params = {};
    if (owner) {
      params[partitionKeyName] = convertUrlToKey(type);
      params[sortKeyName] = convertUrlToKey(METADATA, owner);
      markInactive(params, res, req);
    } else {
      res.statusCode = 401;
      res.json({ error: 'Unauthenticated', url: req.url, body: req.body });
      return;
    }
  });
}

async function getProfile(req: { query: any; }, owner: any) {
  var condition = 'PK = :pk AND begins_with (SK, :sk)'; //TODO: omit the suffix #1, #2 etc. then combine the results

  var id = convertUrlToKey(type, owner);
  let values = {
    ":pk": id,
    ":sk": convertUrlToKey(METADATA)
  };

  const result = await queryMany(condition, values, req.query, null, null, (array) => array[0]); //TODO: add the extra profile rows instead of just showing the first one
  return result ;
}

