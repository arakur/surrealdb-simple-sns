"use client";
import { JSX } from "react";
import { Button } from "@/components/ui/button";
import "./post.css";
import { RecordId } from "surrealdb";
import { surrealAuthConnection } from "@/lib/surreal";
import { v7 as uuidV7 } from "uuid";
import {
  FaRegHeart,
  FaRegLaugh,
  FaRegSadCry,
  FaRegSurprise,
  FaRegThumbsUp,
} from "react-icons/fa";

export const reactionKinds = ["good", "heart", "laugh", "wow", "sad"] as const;

export type ReactionKind = (typeof reactionKinds)[number];

export function reactionIcon(reaction: ReactionKind): JSX.Element {
  switch (reaction) {
    case "good":
      return <FaRegThumbsUp color="currentColor" />;
    case "heart":
      return <FaRegHeart color="currentColor" />;
    case "laugh":
      return <FaRegLaugh color="currentColor" />;
    case "wow":
      return <FaRegSurprise color="currentColor" />;
    case "sad":
      return <FaRegSadCry color="currentColor" />;
  }
}

export type Reaction = Readonly<{
  id: RecordId;
  kind: ReactionKind;
  reactedBy: { username: string };
}>;

export function ReactionButton(
  props: Readonly<{
    icon: JSX.Element;
    count: number;
    hasMyReaction: boolean;
    onClick?: () => void;
  }>
): JSX.Element {
  return (
    <Button
      variant={props.hasMyReaction ? "default" : "outline"}
      size="sm"
      onClick={props.onClick}
      className="cursor-pointer">
      {props.icon}
      <span className="ml-1">{props.count}</span>
    </Button>
  );
}

export async function addReaction(
  postId: RecordId<string>,
  kind: ReactionKind
): Promise<void> {
  const connection = await surrealAuthConnection();

  if (connection.result === "error") {
    console.log(`${connection.errorMessage}`);
    // TODO: alert
    return;
  }

  const { client, id } = connection;

  const reacted = new RecordId("reacted", uuidV7().toString());

  client.relate(id, reacted, postId, { kind });
}

export async function removeReaction(reactionId: RecordId<string>) {
  const connection = await surrealAuthConnection();

  if (connection.result === "error") {
    console.error(
      `Failed to connect to SurrealDB for removing reaction ${reactionId}:`,
      connection.errorMessage
    );
    return;
  }

  const { client } = connection;

  client.delete(reactionId);
}

export async function subscribeReactions() {
  const connection = await surrealAuthConnection();

  if (connection.result === "error") {
    console.error(
      "Failed to connect to SurrealDB for reactions subscription:",
      connection.errorMessage
    );
    return;
  }
  const { client } = connection;

  const subscriptionId = await client.live("reacted", (action, result) => {
    console.log(`action: ${action}, result: ${JSON.stringify(result)}`); // DEBUG
  });

  return { subscriptionId };
}

export function PostReactions(
  props: Readonly<{
    currentUser: string;
    postId: RecordId<string>;
    reactions: ReadonlyArray<Reaction>;
    parentKey: string;
    addReaction: (
      postId: RecordId<string>,
      kind: ReactionKind
    ) => Promise<void>;
    removeReaction: (
      postId: RecordId<string>,
      reactionId: RecordId<string>
    ) => Promise<void>;
  }>
): JSX.Element {
  const reaction_counts = props.reactions.reduce((acc, reaction) => {
    acc.set(reaction.kind, (acc.get(reaction.kind) || 0) + 1);
    return acc;
  }, new Map<ReactionKind, number>());

  console.log(props.reactions); // DEBUG

  const reactionButtons = Array.from(reaction_counts.entries()).map(
    ([kind, count]) => {
      const myReaction = props.reactions.find(
        reaction =>
          reaction.kind === kind &&
          reaction.reactedBy.username === props.currentUser
      );
      return (
        <ReactionButton
          key={`${props.parentKey}-${kind}`}
          icon={reactionIcon(kind)}
          count={count}
          hasMyReaction={myReaction !== undefined}
          onClick={async () => {
            if (myReaction === undefined) {
              await props.addReaction(props.postId, kind);
              await addReaction(props.postId, kind);
            } else {
              await props.removeReaction(props.postId, myReaction.id);
              await removeReaction(myReaction.id);
            }
          }}
        />
      );
    }
  );

  return (
    <div className="flex flex-row gap-4 items-center">{reactionButtons}</div>
  );
}
