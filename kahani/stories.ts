import { convertUrlToKey } from "../../common/utils/convertor";
import { queryMany, markInactive, putItem, createItem } from "./dal/aws";
import { upperCase } from "lodash";

const type = "STORY";
const parent = "UNIV";
const idKeyName = "id";
const partitionKeyName = "PK";
const sortKeyName = "SK";
const METADATA = 'STORY';

function addNestedPath(app: { get: (arg0: string, arg1: (req: any, res: any) => Promise<void>) => void; }, nestedPath: string, nestedType: string) {

  /********************************
   * HTTP Get method for listing further nested objects
   ********************************/
  app.get('/stories/:id/' + nestedPath, async function (req: { params: { [x: string]: any; }; query: any; }, res: { json: (arg0: { error: string; }) => void; statusCode: number; }) {    

    var condition = 'PK = :pk AND begins_with (SK, :sk)' 
    let values = {
      ":pk": convertUrlToKey(type, req.params[idKeyName]) ,
      ":sk": upperCase(nestedType)
    };

    try {
      res.json(await queryMany(condition, values, req.query));
    } catch (err) {
      res.statusCode = 500;
      res.json({ error: 'Could not load items: ' + err });
    }
  });

}

export function addStoryPaths(app: { get: (arg0: string, arg1: { (req: any, res: any): Promise<void>; (req: any, res: any): Promise<void>; }) => void; post: (arg0: string, arg1: (req: any, res: any) => Promise<void>) => void; put: (arg0: string, arg1: (req: any, res: any) => void) => void; delete: (arg0: string, arg1: (req: any, res: any) => void) => void; }) {

  addNestedPath(app, 'pages', 'PAGE'); //first pages
  addNestedPath(app, 'characters', 'CHARACTER');
  addNestedPath(app, 'comments', 'COMMENT');
  addNestedPath(app, 'reactions', 'REACTION');

  /********************************
   * HTTP Get method for list independent objects *
   ********************************/
  
  app.get('/stories', async function (req: { query: any; }, res: { json: (arg0: { error: string; }) => void; statusCode: number; }) {   
    try {
      var condition = '#typ = :type AND begins_with(SK, :sorter)'
      let values = {
        ":type": type,
        ":sorter": convertUrlToKey(METADATA)
      };
      let names = {
          "#typ": "type"
      }
      const result = await queryMany(condition, values, req.query, names, 'byType'); //assume only one
      res.json(result);
    } catch (err) {
      res.statusCode = 500;
      res.json({ error: 'Could not load items: ' + err });
    }
  });

  /*****************************************
   * HTTP Get method for getting by id. We use PK to get few nested objects also
   *****************************************/
  app.get('/stories/:'+idKeyName, async function (req: { query: { getNested: boolean; }; params: { [x: string]: any; }; }, res: { json: (arg0: { error: string; }) => void; statusCode: number; }) {

    try {
      if(req.query && req.query.getNested == true) { //TODO needs row with metadata to be with id also
        var condition = 'PK = :pk'
        let values = {
          ":pk": convertUrlToKey(type, req.params[idKeyName])
        };
        const result = await queryMany(condition, values, req.query);
        res.json(result);
      } else {
        var condition = '#typ = :type AND SK = :sorter'
        let values = {
          ":type": type,
          ":sorter": convertUrlToKey(METADATA, req.params[idKeyName]) 
        };
        let names = {
            "#typ": "type"
        }
        const result = await queryMany(condition, values, req.query, names, 'byType'); //assume only one
        res.json(result);
      }
    } catch (err) {
      res.statusCode = 500;
      res.json({ error: 'Could not load items: ' + err });
    }
  });

  /************************************
  * HTTP post method for insert object *
  *************************************/
  app.post('/stories', async function (req: { apiGateway: { event: { requestContext: { identity: { cognitoIdentityId: any; }; }; }; }; url: any; body:any; }, res: { statusCode: number; json: (arg0: { error: string; url: any; body: any; }) => void; }) {
    if (!req.apiGateway.event.requestContext.identity.cognitoIdentityId) {
      res.statusCode = 401;
      res.json({ error: 'Unknown user', url: req.url, body: req.body });
      return;
    }

    const slug = req.body.universe;
    delete req.body.universe;
    const created = (new Date()).getTime();
    const id = uuid(null, created);

    req.body = {
      [partitionKeyName]: convertUrlToKey(parent, slug),
      [sortKeyName]: convertUrlToKey(METADATA, uuid(null, created, true, id)),
      id,
      type,
      createdAt: created,
      ...req.body
    };
    //TODO add another row for meta data with id as PK if required
    createItem(req, res);//TODO: change user state to author if not set
  });

  /************************************
  * HTTP put method for update object. Assumes body contains the right PK and SK to overwrite *
  *************************************/
  app.put('/stories', function (req: { apiGateway: { event: { requestContext: { identity: { cognitoIdentityId: any; }; }; }; }; url: any; body: { updatedAt: number; }; }, res: { statusCode: number; json: (arg0: { error: string; url: any; body: any; }) => void; }) {
    if (!req.apiGateway.event.requestContext.identity.cognitoIdentityId) {
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
  app.delete('/stories/:'+sortKeyName, function (req: { apiGateway: { event: { requestContext: { identity: { cognitoIdentityId: any; }; }; }; }; url: any; body: { universe: any; }; params: { [x: string]: any; }; }, res: { statusCode: number; json: (arg0: { error: string; url: any; body: any; }) => void; }) {   //we can have multiple SK for the same id for ranking purpose. Backend can delete copies but API can only inactivate

    if (!req.apiGateway.event.requestContext.identity.cognitoIdentityId) {
      res.statusCode = 401;
      res.json({ error: 'Unknown user', url: req.url, body: req.body });
      return;
    }    

    var params = {};
    params[partitionKeyName] = convertUrlToKey(parent, req.body.universe);
    params[sortKeyName] = convertUrlToKey(METADATA, req.params[sortKeyName]);
    markInactive(params, res, req);

  });
}

