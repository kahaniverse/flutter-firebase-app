export enum CardType {
  ROUND = "ROUND", //rounded 3.2 units
  CIRCLE = "CIRCLE", //rounded 2.2 units
  OVAL = "OVAL", //double height rounded 2.2 units
  SLIM = "SLIM", // about six. can be used for connection requests
  RECT = "RECT", //3.2 units
  SQUARE = "SQUARE", //2.2 units
  TILE = "TILE", //2 units but height > width, used in vertical side by side. 
  HIGH = "HIGH", //double height 2.2 units
  HERO = "HERO", //almost full screen with image. 1 unit
  STORY = "STORY", //rect full width, 30% height
  PAGE = "PAGE", //0.8 width and height, mostly text but can have an image
  FORM = "FORM", //full page form
}

export type CompositeScrollerData = {
  sections: SectionData[];
  startScrollPosition?: number
}

export type Navigate = {
  screen:string;
  params?: Navigate;
  push?:boolean
}

export type Action = Navigate | {
  name:string
}

export type Actions = {
  press?: Action;
  longPress?: Action;
  doubleTap?: Action;
  submit?: Action;
  more?:Action;
  like?:Action;
  share?:Action;
  comment?:Action;
  button?:Action
}

export type CardData = {
  PK?:string;
  SK?:string;
  type?:string;
  id?:string;
  key?:string;
  text?:string;
  coverImage?:string;
  synopsis?:string;
  title?:string; 
  owner?:string;
  titleColor?:string;
  authored?:boolean;
  era?:string;
  world?:string;
  genres?: [string];
  cardType?: CardType; //overrides sections type but only if not horizontal
  style?: any; //overrides section styles. can be used to highlight a card amongst others
  actions?:Actions; //these are card level overrides of the section actions. section ones will not occur
  loved?:boolean;
  followed?:boolean;
}

export type SectionData = {
  source?: string; //key for redux and REST API controller
  data: CardData[];
  fieldMappings?: {[to:string]: string} //maps to the fields needed by the Card from the data if not same. //TODO add more complex transforms
  index?: number;
  title?: string;
  horizontal?: {
    snap?: any; //SnapCarousal non function props    
  }
  cardType?: CardType;
  noAuthoredHint?: boolean;
  actions?: Actions;
  style?: any;
}
