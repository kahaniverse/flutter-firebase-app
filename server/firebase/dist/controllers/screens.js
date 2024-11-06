"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addScreenPaths = void 0;
const reactions_1 = require("./reactions");
const utils_1 = require("./utils");
const ViewModels_1 = require("./ViewModels");
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
};
const sourcesPlural = {
    'UNIV': 'universes',
    'CHARACTER': 'characters',
    'STORY': 'stories',
    'PAGE': 'pages',
    'AUTHOR': 'authors'
};
const typesSK = {
    'MERCHANDISE': 'STORY',
    'AUTHOR': 'USER'
};
// const sourcesSingular = {
//   'UNIV' : 'universe',
//   'CHARACTER' : 'character',
//   'STORY' : 'story',
//   'PAGE' : 'page',
//   'AUTHOR' : 'author'
// }
const cardTypes = {
    home: { 'AUTHOR': ViewModels_1.CardType.SQUARE },
    'UNIV': ViewModels_1.CardType.HERO,
    'CHARACTER': ViewModels_1.CardType.ROUND,
    'STORY': ViewModels_1.CardType.STORY,
    'PAGE': ViewModels_1.CardType.PAGE,
    'AUTHOR': ViewModels_1.CardType.SLIM
};
const actions = {
    'UNIV': {
        press: {
            screen: 'Universe',
        },
        longPress: {
            screen: 'Universes',
        }
    }
};
async function addSection(plural, element, count, index, query) {
    let result = {
        source: sourcesPlural[element],
        data: [],
        index: index,
        title: titles[plural][index],
        horizontal: count > 0 && ((index == 0 && {
            snap: {}
        }) || {}),
        cardType: count > 0 && index == 0 ? ViewModels_1.CardType.HERO : (cardTypes[plural] ? cardTypes[plural][element] : cardTypes[element]),
        // noAuthoredHint: false,
        actions: actions[element], //depend on the defaults if not specified here
        // style: any,
    };
    var condition = '#typ = :type AND begins_with(SK, :sorter)';
    let values = {
        ":type": element,
        ":sorter": convertUrlToKey(typesSK[element] || element)
    };
    let names = {
        "#typ": "type"
    };
    result.data = await queryMany(condition, values, count > -1 ? Object.assign({ limit: count }, query) : query, names, 'byType', (d) => {
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
async function convertToSections(singular, condition, values, names, index, query, ...args) {
    let sections = [];
    const transform = (items) => items.reduce && items.reduce((out, item) => {
        const key = item.SK.substring(0, item.SK.indexOf('#'));
        const v = out[key];
        if (v)
            v.push(item);
        else
            out[key] = [item];
        return out;
    }, {}) || items;
    let data = await queryMany(condition, values, query, names, index, index ? (d) => d : transform);
    if (index)
        data = transform(data);
    let counter = Math.floor(args.length / 2);
    for (const key in data) {
        const elements = data[key];
        let sectionIndex = args.findIndex((currentValue) => currentValue == key);
        const limit = sectionIndex > 0 && sectionIndex + 1 < args.length ? args[sectionIndex + 1] : -1;
        sectionIndex = sectionIndex > -1 ? Math.floor(sectionIndex / 2) : ++counter;
        let result = {
            source: sourcesPlural[key],
            data: limit > -1 ? elements.slice(0, limit) : (sectionIndex == 0 ? [elements.reduce((accumulator, currentValue) => { return Object.assign(Object.assign({}, accumulator), currentValue); }, {})] : elements),
            index: sectionIndex,
            title: titles[singular][sectionIndex],
            horizontal: limit > 0 && ((sectionIndex == 0 && {
                snap: {}
            }) || {}),
            cardType: sectionIndex == 0 ? ViewModels_1.CardType.HERO : cardTypes[key],
            // noAuthoredHint: false,
            actions: actions[key], //depend on the defaults if not specified here
            // style: any,
        };
        sections[sectionIndex] = result;
    }
    return sections;
}
function addPluralPath(app, plural, ...args) {
    app.get('/screens/' + plural, async function (req, res) {
        var _a;
        try {
            let result = {
                sections: []
            };
            if ((_a = req === null || req === void 0 ? void 0 : req.query) === null || _a === void 0 ? void 0 : _a.marker) {
                //get for infinite scroll only
                let counter = 0;
                for (let index = 0; index < args.length; index += 2) {
                    counter++;
                }
                const element = args[args.length - 1];
                result.sections.push(await addSection(plural, element, -1, counter, req.query));
            }
            else {
                //full fresh object
                let counter = 0;
                for (let index = 0; index < args.length; index++) {
                    const element = args[index];
                    const count = index + 1 < args.length ? args[++index] : -1;
                    result.sections.push(await addSection(plural, element, count, counter++, req === null || req === void 0 ? void 0 : req.query));
                }
            }
            await checkReactions(req, result);
            res.json(result);
        }
        catch (err) {
            res.statusCode = 500;
            res.json({ error: 'Could not load items: ' + err });
        }
    });
}
function addSingularPath(app, plural, singular, pk, ...args) {
    app.get('/screens/' + plural + '/:id', async function (req, res) {
        var _a, _b;
        try {
            let result = {
                sections: []
            };
            if (args && args.length > 0 && ((_a = req === null || req === void 0 ? void 0 : req.query) === null || _a === void 0 ? void 0 : _a.marker)) {
                if (typesSK[singular.toUpperCase()] == "USER") { //search byOwner. TODO: if for the current user then also get the reactions
                    const element = args[args.length - 1];
                    var condition = '#owner = :pk AND begins_with (SK, :sk)';
                    let values = {
                        ":pk": req.params[idKeyName],
                        ":sk": convertUrlToKey(element)
                    };
                    let names = {
                        "#owner": "owner"
                    };
                    result.sections = await convertToSections(singular, condition, values, names, 'byOwner', req.query);
                }
                else {
                    const element = args[args.length - 1];
                    var condition = 'PK = :pk AND begins_with (SK, :sk)';
                    let values = {
                        ":pk": convertUrlToKey(pk, req.params[idKeyName]),
                        ":sk": convertUrlToKey(element)
                    };
                    result.sections = await convertToSections(singular, condition, values, null, null, req.query);
                }
            }
            else {
                if (typesSK[singular.toUpperCase()] == "USER") { //search byOwner 
                    var condition = '#owner = :pk';
                    let values = {
                        ":pk": req.params[idKeyName]
                    };
                    let names = {
                        "#owner": "owner"
                    };
                    result.sections = await convertToSections(singular, condition, values, names, 'byOwner', req.query, pk, 1, ...args);
                }
                else {
                    const PK = convertUrlToKey(pk, req.params[idKeyName]);
                    //first is hero of PK
                    var condition = 'PK = :pk AND SK BETWEEN :from AND :to';
                    let values = {
                        ":pk": PK,
                        ":from": "A",
                        ":to": "ZZ#"
                    };
                    result.sections = await convertToSections(singular, condition, values, null, null, req.query, args.includes(pk) ? "IGNORE" : pk, 1, ...args);
                    const first = result.sections[0];
                    const firstData = first === null || first === void 0 ? void 0 : first.data[0];
                    //flag for already viewed in query, which will not increment the view count
                    if (!((_b = req === null || req === void 0 ? void 0 : req.query) === null || _b === void 0 ? void 0 : _b.viewed))
                        (0, utils_1.incrementField)((firstData === null || firstData === void 0 ? void 0 : firstData.SK) ? { PK: firstData.PK, SK: firstData.SK } : { PK, SK: convertUrlToKey(pk) }, "viewCount", (firstData === null || firstData === void 0 ? void 0 : firstData.SK) ? null : pk); //no need to wait 
                }
            }
            await checkReactions(req, result);
            res.json(result);
        }
        catch (err) {
            res.statusCode = 500;
            res.json({ error: 'Could not load items: ' + err });
        }
    });
}
async function checkReactions(req, result) {
    var _a, _b;
    const owner = req.apiGateway.event.requestContext.identity.cognitoIdentityId;
    if (!owner)
        return;
    let reactions = { loves: {}, follows: {} };
    let invertedKeys = [];
    // console.log('====================================');
    // console.log(result?.sections);
    // console.log('====================================');
    (_a = result === null || result === void 0 ? void 0 : result.sections) === null || _a === void 0 ? void 0 : _a.map((section) => {
        var _a;
        (_a = section === null || section === void 0 ? void 0 : section.data) === null || _a === void 0 ? void 0 : _a.map((card) => {
            invertedKeys.push(card.SK);
        });
    });
    //sort
    invertedKeys = invertedKeys.sort();
    //find
    var condition = 'SK = :sk AND inverted BETWEEN :from AND :to';
    await queryReactions(owner, invertedKeys, condition, reactions, ViewModels_1.Reaction.LOVE);
    await queryReactions(owner, invertedKeys, condition, reactions, ViewModels_1.Reaction.FOLLOW);
    (_b = result === null || result === void 0 ? void 0 : result.sections) === null || _b === void 0 ? void 0 : _b.map((section) => {
        var _a;
        (_a = section === null || section === void 0 ? void 0 : section.data) === null || _a === void 0 ? void 0 : _a.map((card) => {
            card.loved = reactions.loves[card.SK];
            card.followed = reactions.follows[card.SK];
        });
    });
}
async function queryReactions(owner, invertedKeys, condition, reactions, type) {
    let values = {
        ":sk": convertUrlToKey(reactions_1.REACTION_TAG, type, owner),
        ":from": (invertedKeys && invertedKeys[0]) || "A",
        ":to": (invertedKeys && invertedKeys[invertedKeys.length - 1]) || "ZZ"
    };
    await queryMany(condition, values, {}, null, "bySK", (d) => {
        if (invertedKeys.includes(d.inverted))
            reactions[type.toLowerCase() + "s"][d.inverted] = true;
    });
}
function addReactionsPath(app, plural, pk) {
    if (plural == 'reactors') { //search the people who reacted
        app.get('/screens/' + plural + '/' + pk + '/:type/:id', async function (req, res) {
            try {
                let result = {
                    sections: [{
                            index: 0,
                            cardType: ViewModels_1.CardType.SLIM,
                            data: []
                        }]
                };
                const type = req.params['type'];
                var condition = 'PK = :pk AND begins_with (SK, :sk)';
                let values = {
                    ":pk": convertUrlToKey(pk == "AUTHOR" ? "USER" : pk, req.params[idKeyName]),
                    ":sk": convertUrlToKey(reactions_1.REACTION_TAG, type)
                };
                result.sections[0].data = await queryMany(condition, values, req.query, null, null, (d) => d.map((x) => { return { key: x.PK, id: x.SK, inverted: x.inverted, createdAt: x.createdAt, owner: x.by, actions: { button: { name: "follow" } } }; }));
                res.json(result);
            }
            catch (err) {
                res.statusCode = 500;
                res.json({ error: 'Could not load items: ' + err });
            }
        });
    }
    else {
        app.get('/screens/' + plural + '/' + pk + '/:type', async function (req, res) {
            try {
                let result = {
                    sections: [{
                            index: 0,
                            cardType: ViewModels_1.CardType.SLIM,
                            data: []
                        }]
                };
                const type = req.params['type'];
                const owner = req.apiGateway.event.requestContext.identity.cognitoIdentityId;
                if (!owner)
                    return;
                var condition = 'SK = :sk AND begins_with (inverted, :typ)';
                let values = {
                    ":sk": convertUrlToKey(reactions_1.REACTION_TAG, type, owner),
                    ":typ": pk.trim() == "AUTHOR" ? "USER" : pk
                };
                result.sections[0].data = await queryMany(condition, values, {}, null, "bySK", (x) => {
                    return { key: x.PK, id: x.SK, inverted: x.inverted, createdAt: x.createdAt, owner: pk == "AUTHOR" ? (0, utils_1.getId)(x.inverted) : x.by, actions: { button: { name: "un" + type.toLowerCase() } } };
                });
                res.json(result);
            }
            catch (err) {
                res.statusCode = 500;
                res.json({ error: 'Could not load items: ' + err });
            }
        });
    }
}
function addScreenPaths(app) {
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
exports.addScreenPaths = addScreenPaths;
//# sourceMappingURL=screens.js.map