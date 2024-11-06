import { convertUrlToKey } from "../server/src/common/utils/convertor";
import { queryMany } from "../server/src/common/dal";
import { upperCase } from "lodash";

const type = "AUTHOR";
const partitionKeyName = "PK";
const sortKeyName = "id";
const METADATA = 'USER';

function addNestedPath(app: { get: (arg0: string, arg1: (req: any, res: any) => Promise<void>) => void; }, nestedPath: string, nestedType: string) {

  /********************************
   * HTTP Get method for listing further nested objects
   ********************************/
  app.get('/authors/:PK/' + nestedPath, async function (req: { params: { [x: string]: any; }; query: any; }, res: { json: (arg0: { error: string; }) => void; statusCode: number; }) {    //uses full PK. //TODO can be with id as well

    var condition = 'PK = :pk AND begins_with (SK, :sk)' 
    let values = {
      ":pk": req.params[partitionKeyName] ,
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

export function addAuthorPaths(app: { get: (arg0: string, arg1: (req: any, res: any) => Promise<void>) => void; }) {

  addNestedPath(app, 'universes', 'UNIV');
  addNestedPath(app, 'stories', 'STORY');
  addNestedPath(app, 'characters', 'CHARACTER');
  addNestedPath(app, 'comments', 'COMMENT');

  /********************************
   * HTTP Get method for list independent objects *
   ********************************/
  
  app.get('/authors', async function (req: { query: any; }, res: { json: (arg0: { error: string; }) => void; statusCode: number; }) {   
    try {
      var condition = '#typ = :type AND begins_with(SK, :sorter)'
      let values = {
        ":type": type,
        ":sorter": convertUrlToKey(METADATA)
      };
      let names = {
          "#typ": "type"
      }
      const result = await queryMany(condition, values, req.query, names, 'byType'); 
      res.json(result);
    } catch (err) {
      res.statusCode = 500;
      res.json({ error: 'Could not load items: ' + err });
    }
  });

  app.get('/authors/:id', async function (req: { params: { [x: string]: any; }; query: any; }, res: { json: (arg0: { error: string; }) => void; statusCode: number; }) {   
    try {
      var condition = '#typ = :type AND SK = :sorter'
      let values = {
        ":type": type,
        ":sorter": convertUrlToKey(METADATA, req.params[sortKeyName])
      };
      let names = {
          "#typ": "type"
      }
      const result = await queryMany(condition, values, req.query, names, 'byType'); //assume only one
      res.json(result[0]);
    } catch (err) {
      res.statusCode = 500;
      res.json({ error: 'Could not load items: ' + err });
    }
  });
}

