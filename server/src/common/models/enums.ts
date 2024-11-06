export enum EntryAction {
    CREATE = "created",
    UPDATE = "updated",
    DELETE = "deleted"
}

export enum UserAction { //each could be used as a type in Edge
    VIEW = "view",
    FOLLOW = "follow",
    REACT = "react",
    SHARE = "share",
    INVITE = "invite"
}

export enum State {
    NEW = "new",
    ACTIVE = "active",
    EDITED = "edited",
    INACTIVE = "inactive",
    REACTIVED = "reactived",
    DELETED = "deleted",
    //used for links
    ADDED = "added",
    REMOVED = "removed",
    BLOCKED = "blocked"
}

export enum ReactionType {
    LOVE = "LOVE",//+1
    HATE = "HATE" //-1
}
