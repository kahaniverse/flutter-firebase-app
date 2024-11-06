import { ReactionType } from "../server/src/common/models/enums";
const { convertUrlToKey, queryMany, putItemIncrement, deleteItemDecrement } = require("./utils");

const partitionKeyName = "PK";
const sortKeyName = "SK";
export const REACTION_TAG = 'ZZ#REACTION';
const idKeyName = 'reactionType';

function addNestedPath(app: { get: (arg0: string, arg1: (req: any, res: any) => Promise<void>) => void; }, nestedPath: string, nestedType: string) {
  /*****************************************
   * HTTP Get method for getting by id. We use PK to specify object type
   *****************************************/
  app.get('/reactions/'+nestedPath+"/:"+idKeyName, async function (req: any, res: { json: (arg0: { error: string; }) => void; statusCode: number; }) {

    const owner = req.apiGateway.event.requestContext.identity.cognitoIdentityId;  
    const reactionType:ReactionType = req.params[idKeyName];
    try {
      var condition = 'SK = :owner AND begins_with(inverted, :sorter)'
      let values = {
        ":owner": convertUrlToKey(REACTION_TAG, reactionType, owner),
        ":sorter": convertUrlToKey(nestedType)
      }
      const result = await queryMany(condition, values, req.query, null, 'bySK'); 
      res.json(result);
    } catch (err) {
      res.statusCode = 500;
      res.json({ error: 'Could not load items: ' + err });
    }
  });
}

export function addReactionPaths(app: any) {

  addNestedPath(app, 'universes', 'UNIV');
  addNestedPath(app, 'stories', 'STORY');
  addNestedPath(app, 'characters', 'CHARACTER');
  addNestedPath(app, 'comments', 'COMMENT');
  addNestedPath(app, 'profiles', 'USER');

  /********************************
   * HTTP Get method for list independent objects *
   ********************************/
  
  app.get('/reactions/:'+idKeyName, async function (req: any, res: { json: (arg0: { error: string; }) => void; statusCode: number; }) { 
    const owner = req.apiGateway.event.requestContext.identity.cognitoIdentityId;   
    const reactionType:ReactionType = req.params[idKeyName];
    try {
      var condition = 'SK = :owner'
      let values = {
        ":owner": convertUrlToKey(REACTION_TAG, reactionType, owner)
      }
      const result = await queryMany(condition, values, req.query, null, 'bySK'); 
      res.json(result);
    } catch (err) {
      res.statusCode = 500;
      res.json({ error: 'Could not load items: ' + err });
    }
  });

  /************************************
  * HTTP post method for insert object *
  *************************************/
  app.post('/reactions/:'+idKeyName, async function (req: any, res: { statusCode: number; json: (arg0: { error: string; url: any; body: any; }) => void; }) {
    
    const owner = req.apiGateway.event.requestContext.identity.cognitoIdentityId
    if (!owner) {
      res.statusCode = 401;
      res.json({ error: 'Unknown user', url: req.url, body: req.body });
      return;
    }  
    const reactionType:ReactionType = req.params[idKeyName];
    const created = (new Date()).getTime();
    const on = req.body.on; //{PK, SK}
    const by = req.body.by;
    const pk = on.SK?.startsWith("USER") || on.SK?.startsWith("UNIV") ? on.PK : on.SK;
    req.body = {
      [partitionKeyName]: pk,
      inverted: on.SK, //this can be used for further filtering when called by PK.
      [sortKeyName]: convertUrlToKey(REACTION_TAG, reactionType, owner),
      by,
      createdAt: created
    };

    const react = reactionType.toLowerCase();
    let act = (react.endsWith('e') ? react + 'd' : react + 'ed') + on.PK.substring(0, on.PK.indexOf('#'));
    putItemIncrement(req, res, on, reactionType, {PK: convertUrlToKey("USER", owner), SK: convertUrlToKey("USER", by)}, act);
  });

  /************************************
  * HTTP delete method for deleting a reaction object.  *
  *************************************/
  app.delete('/reactions/:'+idKeyName, function (req: any, res: { statusCode: number; json: (arg0: { error: string; url: any; body: any; }) => void; }) {
    const owner = req.apiGateway.event.requestContext.identity.cognitoIdentityId
    if (!owner) {
      res.statusCode = 401;
      res.json({ error: 'Unknown user', url: req.url, body: req.body });
      return;
    }  
    const reactionType:ReactionType = req.params[idKeyName];
    const on = req.body.on; //{PK, SK}
    const by = req.body.by;
    const pk = on.SK?.startsWith("USER") || on.SK?.startsWith("UNIV")  || on.SK?.startsWith("ZZ") ? on.PK : on.SK;
    req.body = {
      [partitionKeyName]: pk,
      [sortKeyName]: convertUrlToKey(REACTION_TAG, reactionType, owner)
    };

    const react = reactionType.toLowerCase();
    let act = (react.endsWith('e') ? react + 'd' : react + 'ed') + on.PK.substring(0, on.PK.indexOf('#'));
    deleteItemDecrement(req, res, on, reactionType, {PK: convertUrlToKey("USER", owner), SK: convertUrlToKey("USER", by)}, act); //TODO: this may need to decrement
  });
}

