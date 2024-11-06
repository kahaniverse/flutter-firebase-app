import { ref, SetId } from "../../server/src/common/models/base";
import { SocialNode } from "../../server/src/common/models/social";

// /genres => [Genre]
export type Genre = SetId;

export interface Universe extends SocialNode {
  concept: string;
  
  owner?:string; //useful if ownership transfer from creator
  genres?: [Genre];

  //sub collections:
  // /universes/:id/characters
  // /universes/:id/stories?genre=comedy&name='ABC*' //like
}

export interface Character extends SocialNode {
  about: string;
  //can be used for synopsis etc
  universe?: ref;
  //sub collections:
  // /universes/:id/characters/:id/stories
}

export interface Story extends SocialNode {
  synopsis: string;
  //can be used for synopsis etc

  universe?: ref;
  genre?: Genre;

  //sub collections:
  // /universes/:id/stories/:id/pages
}

export interface Page extends SocialNode {
  content: string;
  //can be used for synopsis etc
  universe?: ref;
  story?: ref;
  pgNum?: number; //for sequencing pages
}

export type Author = ref //of User 
  //sub collections:
  // /authors/:id/stories/
