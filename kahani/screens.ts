import { xor } from "lodash";
import { REACTION_TAG } from "./reactions";
import { getId, incrementField } from "./dal/aws";
import { CardData, CardType, CompositeScrollerData, Reaction, SectionData } from "./ViewModels";

const { convertUrlToKey, queryMany } = require("./utils");
const idKeyName = "id";

const titles = {
  home: ['Latest Universes'],
  universe: ['Selected Universe'],
  universes: ['Universes'],
  character: ['Selected Character'],
  characters: ['Characters'],
  author: ['Selected Author'],
  authors: ['Authors'],
  story: ['Selected Story'],
  page: ['Selected Page']
}

const sourcesPlural = {
  'UNIV' : 'universes',
  'CHARACTER' : 'characters',
  'STORY' : 'stories',
  'PAGE' : 'pages',
  'AUTHOR' : 'authors'
}

const typesSK = {
  'MERCHANDISE' : 'STORY',
  'AUTHOR' : 'USER'
}

// const sourcesSingular = {
//   'UNIV' : 'universe',
//   'CHARACTER' : 'character',
//   'STORY' : 'story',
//   'PAGE' : 'page',
//   'AUTHOR' : 'author'
// }

const cardTypes = {
  home: {'AUTHOR' : CardType.SQUARE},
  'UNIV' : CardType.HERO,
  'CHARACTER' : CardType.ROUND,
  'STORY' : CardType.STORY,
  'PAGE' : CardType.PAGE,
  'AUTHOR' : CardType.SLIM
}

const actions = {
  'UNIV' : {
    press: {
        screen: 'Universe', 
    },    
    longPress: {
        screen: 'Universes', 
    }                        
  }
}

async function addSection(plural: string, element: string, count: number, index: number, query: any): Promise<SectionData> {
  let result:SectionData = {
    source: sourcesPlural[element],
    data: [],
    index: index,
    title: titles[plural][index],
    horizontal: count > 0 && ((index == 0 && {
      snap: {}
    }) || {}),
    cardType: count > 0 && index == 0 ? CardType.HERO : (cardTypes[plural] ? cardTypes[plural][element] : cardTypes[element]),
    // noAuthoredHint: false,
    actions: actions[element], //depend on the defaults if not specified here
    // style: any,
  }
  var condition = '#typ = :type AND begins_with(SK, :sorter)'
  let values = {
    ":type": element,
    ":sorter": convertUrlToKey(typesSK[element] || element)
  };
  let names = {
      "#typ": "type"
  }
  result.data = await queryMany(condition, values, count > -1 ? {limit:count, ...query} : query, names, 'byType', (d: { synopsis: any; concept: any; title: any; name: any; }) => {
    // d.key = getId(d.PK); //handled in client instead
    // d.id = getId(d.SK);
    d.synopsis = d.synopsis || d.concept;
    d.title = d.title || d.name;
    // delete d.PK; //as needed for marker
    // delete d.SK;
    delete d.concept;
    delete d.name;  
    return d;  
  });
  return result;
}

async function convertToSections(singular: string, condition: string, values: { ":pk": any; ":sk"?: any; }, names: { "#owner": string; }, index: string, query: any, ...args:(string | number)[]): Promise<[SectionData?]> {
  let sections:[SectionData?] = []
  const transform = (items: any[]) => items.reduce && items.reduce((out: { [x: string]: any[]; }, item: { SK: string; }) => {
    const key = item.SK.substring(0, item.SK.indexOf('#'));
    const v = out[key]; 
    if(v) v.push(item);
    else out[key] = [item];
    return out;
  }, {}) || items;
  let data = await queryMany(condition, values, query, names, index, index ? (d: any) => d : transform);
  if(index) data = transform(data)
  let counter = Math.floor(args.length/2);
  for (const key in data) {
    const elements = data[key];
    let sectionIndex = args.findIndex((currentValue) => currentValue == key );
    const limit = sectionIndex > 0 && sectionIndex + 1 < args.length ? args[sectionIndex + 1] : -1;
    sectionIndex = sectionIndex > -1 ? Math.floor(sectionIndex/2) : ++counter;
    let result:SectionData = {
      source: sourcesPlural[key],
      data: limit > -1 ? elements.slice(0, limit) : (sectionIndex == 0 ? [elements.reduce((accumulator: any, currentValue: any) => { return {...accumulator, ...currentValue}}, {})] : elements), //TODO handle if limit is higher than current number returned from db due to space
      index: sectionIndex,
      title: titles[singular][sectionIndex],
      horizontal: limit > 0 && ((sectionIndex == 0 && {
        snap: {}
      }) || {}),
      cardType: sectionIndex == 0 ? CardType.HERO : cardTypes[key],
      // noAuthoredHint: false,
      actions: actions[key], //depend on the defaults if not specified here
      // style: any,
    }
    sections[sectionIndex] = result;
  }
  return sections;
}

function addPluralPath(app: any, plural: string, ...args: (string | number)[]) {

  app.get('/screens/' + plural, async function (req: { params: { [x: string]: any; }; query: any; }, res: { json: (arg0: any) => void; statusCode: number; }) {    //uses full PK. //TODO can be with id as well
    try {
      let result:CompositeScrollerData = {
        sections:[]
      };
      if(req?.query?.marker) {
        //get for infinite scroll only
        let counter = 0;
        for (let index = 0; index < args.length; index+=2) {
          counter++;
        }
        const element = args[args.length - 1] as string;
        result.sections.push(await addSection(plural, element, -1, counter, req.query));
      } else {
        //full fresh object
        let counter = 0;
        for (let index = 0; index < args.length; index++) {
          const element = args[index] as string;
          const count = index + 1 < args.length ? args[++index] as number : -1;
          result.sections.push(await addSection(plural, element, count, counter++, req?.query));
        }
      }
      await checkReactions(req, result);
      res.json(result);
    } catch (err) {
      res.statusCode = 500;
      res.json({ error: 'Could not load items: ' + err });
    }
  });
}

function addSingularPath(app:any, plural: string, singular: string, pk:string, ...args: (string | number)[]) {

  app.get('/screens/' + plural + '/:id', async function (req: { params: { [x: string]: any; }; query: any; }, res: { json: (arg0: any) => void; statusCode: number; }) {    
    try {
      let result:CompositeScrollerData = {
        sections:[]
      };
      
      if(args && args.length > 0 && req?.query?.marker) {

        if(typesSK[singular.toUpperCase()] == "USER") { //search byOwner. TODO: if for the current user then also get the reactions
          const element = args[args.length - 1] as string;
          var condition = '#owner = :pk AND begins_with (SK, :sk)' 
          let values = {
            ":pk": req.params[idKeyName],
            ":sk": convertUrlToKey(element)
          };

          let names = {
              "#owner": "owner"
          }
          result.sections = await convertToSections(singular, condition, values, names, 'byOwner', req.query);

        } else {
          const element = args[args.length - 1] as string;
          var condition = 'PK = :pk AND begins_with (SK, :sk)' 
          let values = {
            ":pk": convertUrlToKey(pk, req.params[idKeyName]),
            ":sk": convertUrlToKey(element)
          };

          result.sections = await convertToSections(singular, condition, values, null, null, req.query);

        }

      } else {
        if(typesSK[singular.toUpperCase()] == "USER") { //search byOwner 
          var condition = '#owner = :pk' 
          let values = {
            ":pk": req.params[idKeyName]
          };

          let names = {
              "#owner": "owner"
          }
          result.sections = await convertToSections(singular, condition, values, names, 'byOwner', req.query, pk, 1, ...args);

        } else {
          const PK = convertUrlToKey(pk, req.params[idKeyName]);
          //first is hero of PK
          var condition = 'PK = :pk AND SK BETWEEN :from AND :to' 
          let values = {
            ":pk": PK, //TODO check if we can supply limit per SK type
            ":from": "A",
            ":to": "ZZ#"
          };

          result.sections = await convertToSections(singular, condition, values, null, null, req.query, args.includes(pk) ? "IGNORE" : pk, 1, ...args);
          const first = result.sections[0];
          const firstData = first?.data[0];
          //flag for already viewed in query, which will not increment the view count
          if(!req?.query?.viewed) incrementField(firstData?.SK ? {PK: firstData.PK, SK: firstData.SK} : {PK, SK: convertUrlToKey(pk)}, "viewCount", firstData?.SK ? null : pk); //no need to wait 
        }
      }
      await checkReactions(req, result);
      res.json(result);
    } catch (err) {
      res.statusCode = 500;
      res.json({ error: 'Could not load items: ' + err });
    }
  });

}

async function checkReactions(req: { params?: { [x: string]: any; } | { [x: string]: any; }; query?: any; apiGateway?: any; }, result: { sections: any; startScrollPosition?: number; }) {
  const owner = req.apiGateway.event.requestContext.identity.cognitoIdentityId;
  if(!owner) return;
  let reactions = {loves:{}, follows:{}};
  let invertedKeys = [];
  // console.log('====================================');
  // console.log(result?.sections);
  // console.log('====================================');
  result?.sections?.map((section: { data: any[]; }) => {
    section?.data?.map((card:CardData) => {
      invertedKeys.push(card.SK);
    })
  });

  //sort
  invertedKeys = invertedKeys.sort();

  //find
  var condition = 'SK = :sk AND inverted BETWEEN :from AND :to';
  await queryReactions(owner, invertedKeys, condition, reactions, Reaction.LOVE);
  await queryReactions(owner, invertedKeys, condition, reactions, Reaction.FOLLOW);

  result?.sections?.map((section: { data: any[]; }) => {
    section?.data?.map((card:CardData) => {
      card.loved = reactions.loves[card.SK];
      card.followed = reactions.follows[card.SK];
    })
  })
}

async function queryReactions(owner: any, invertedKeys: any[], condition: string, reactions: { loves: {}; follows: {}; }, type:Reaction) {
  let values = {
    ":sk": convertUrlToKey(REACTION_TAG, type, owner),
    ":from": (invertedKeys && invertedKeys[0]) || "A",
    ":to": (invertedKeys && invertedKeys[invertedKeys.length - 1]) || "ZZ"
  };

  await queryMany(condition, values, {}, null, "bySK", (d: any) => {
    if (invertedKeys.includes(d.inverted))
      reactions[type.toLowerCase()+"s"][d.inverted] = true;
  });
}

function addReactionsPath(app:any, plural: string, pk:string) {

  if(plural == 'reactors') { //search the people who reacted
    app.get('/screens/' + plural + '/' + pk + '/:type/:id', async function (req: any, res: { json: (arg0: any) => void; statusCode: number; }) {    
      try {
        let result:CompositeScrollerData = {
          sections:[{ 
            index: 0,
            cardType: CardType.SLIM,
            data: []
          }]
        };      

        const type = req.params['type'];
        var condition = 'PK = :pk AND begins_with (SK, :sk)'; 
        let values = {
          ":pk": convertUrlToKey(pk == "AUTHOR" ? "USER" : pk, req.params[idKeyName]),
          ":sk": convertUrlToKey(REACTION_TAG, type)
        };
        result.sections[0].data = await queryMany(condition, values, req.query, null, null, (d: any) => d.map((x:any) => { return {key:x.PK, id: x.SK, inverted: x.inverted, createdAt: x.createdAt, owner: x.by, actions:{button:{name:"follow"}}}}));
        res.json(result);
      } catch (err) {
        res.statusCode = 500;
        res.json({ error: 'Could not load items: ' + err });
      }
    });
  } else {
    app.get('/screens/' + plural + '/' + pk + '/:type', async function (req: any, res: { json: (arg0: any) => void; statusCode: number; }) {    
      try {
        let result:CompositeScrollerData = {
          sections:[{ 
            index: 0,
            cardType: CardType.SLIM,
            data: []
          }]
        };      

        const type = req.params['type'];
        const owner = req.apiGateway.event.requestContext.identity.cognitoIdentityId;
        if(!owner) return;
        var condition = 'SK = :sk AND begins_with (inverted, :typ)';
        let values = {
          ":sk": convertUrlToKey(REACTION_TAG, type, owner),
          ":typ": pk.trim() == "AUTHOR" ? "USER" : pk
        };
        result.sections[0].data = await queryMany(condition, values, {}, null, "bySK", (x: any) => { 
          return {key:x.PK, id: x.SK, inverted: x.inverted, createdAt: x.createdAt, owner: pk == "AUTHOR" ? getId(x.inverted) : x.by, actions:{button:{name:"un"+type.toLowerCase()}}}
        });

        res.json(result);
      } catch (err) {
        res.statusCode = 500;
        res.json({ error: 'Could not load items: ' + err });
      }
    });
  }
}

export function addScreenPaths(app: any) {

  addPluralPath(app, 'home', 'UNIV', 5, 'AUTHOR', 10, 'STORY'); //plural screens need the args to be defined. last is infinite scroll
  addPluralPath(app, 'universes', 'UNIV');
  addSingularPath(app, 'universes', 'universe', 'UNIV', 'CHARACTER', 10, 'STORY'); //singular screens show everything (max 20) with PK. those listed in args can control the number shown with last as infinite
  addSingularPath(app, 'stories', 'story', 'STORY', 'PAGE');
  addSingularPath(app, 'pages', 'page', 'PAGE', 'PAGE'); //scroll next page options
  addPluralPath(app, 'characters', 'CHARACTER');
  addSingularPath(app, 'characters', 'character', 'CHARACTER', 'STORY');
  addPluralPath(app, 'authors', 'AUTHOR');
  addSingularPath(app, 'authors', 'author', 'USER', 'UNIV', 10, 'CHARACTER', 10, 'STORY');
  addReactionsPath(app, 'reactors', 'AUTHOR');
  addReactionsPath(app, 'reactors', 'UNIV');
  addReactionsPath(app, 'reactors', 'STORY');
  addReactionsPath(app, 'reactors', 'PAGE');
  addReactionsPath(app, 'reactors', 'CHARACTER');
  addReactionsPath(app, 'reactions', 'AUTHOR');
  addReactionsPath(app, 'reactions', 'UNIV');
  addReactionsPath(app, 'reactions', 'STORY');
  addReactionsPath(app, 'reactions', 'PAGE');
  addReactionsPath(app, 'reactions', 'CHARACTER');
}
