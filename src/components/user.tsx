import { RecordId } from "surrealdb";

export type User = Readonly<{
  id: RecordId<string>;
  username: string;
  displayName: string;
  avatarImageId: string;
}>;
