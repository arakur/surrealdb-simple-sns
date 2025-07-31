"use client";
import { JSX } from "react";
import {} from "react-icons/fa";
import {} from "react-icons/md";
import "./post.css";
import { Avatar } from "./ui/avatar";
import { RecordId } from "surrealdb";
import { Skeleton } from "./ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { User } from "./user";
import {
  PostAddReactionButton,
  PostFooter,
  PostOtherActionMenuButton,
} from "./postFooter";
import {
  PostReactions,
  Reaction,
  ReactionKind,
  subscribeReactions,
} from "./reaction";
import { PostHeader } from "./postHeader";

export type PostReply = Readonly<{
  id: RecordId<string>;
  createdBy: User;
  createdAt: Date;
  replyTo: [] | [RecordId<string>];
  content: string;
  reactions: ReadonlyArray<Reaction>;
}>;

export function ReplySkeleton(props: { className?: string }) {
  return (
    <div className={`flex flex-row gap-4 items-start ${props.className}`}>
      <div className="min-w-12">
        <Skeleton className="w-12 h-12 rounded-full" />
      </div>
      <div className="w-xl flex flex-col gap-2">
        <Skeleton className="w-full h-8" />
        <Skeleton className="w-full h-24" />
      </div>
    </div>
  );
}

export type ReplyProps = {
  reply: PostReply;
  currentUser: string;
  currentTime: number;
  addReaction: (postId: RecordId<string>, kind: ReactionKind) => Promise<void>;
  removeReaction: (
    postId: RecordId<string>,
    reactionId: RecordId<string>
  ) => Promise<void>;
  seeDetail: () => Promise<void>;
  className?: string;
};

export function PostReply(props: ReplyProps): JSX.Element {
  const { data } = useQuery({
    queryKey: ["subscribe_reactions", props.reply.id],
    queryFn: subscribeReactions,
  });

  if (data === undefined) {
    return <ReplySkeleton className={props.className} />;
  }

  const secondsSincePosted = Math.floor(
    (props.currentTime - props.reply.createdAt.getTime()) / 1000
  );

  let timeSincePosted: string;

  if (secondsSincePosted < 60) {
    timeSincePosted = `${secondsSincePosted} seconds`;
  } else if (secondsSincePosted < 60 * 60) {
    timeSincePosted = `${Math.floor(secondsSincePosted / 60)} minutes`;
  } else if (secondsSincePosted < 60 * 60 * 24) {
    timeSincePosted = `${Math.floor(secondsSincePosted / (60 * 60))} hours`;
  } else {
    timeSincePosted = `${Math.floor(secondsSincePosted / (60 * 60 * 24))} days`;
  }

  const key = props.reply.id.toString();

  return (
    <div
      key={key}
      className={`flex flex-row gap-4 items-start ${props.className}`}>
      <div className="min-w-12">
        <a href={`/users/${props.reply.createdBy.username}`}>
          <Avatar
            username={props.reply.createdBy.username}
            avatarImageId={props.reply.createdBy.avatarImageId}
            alt={`an avatar of ${props.reply.createdBy.displayName}`}
            className="w-12 h-12"
          />
        </a>
      </div>
      <div className="w-full flex flex-col gap-2">
        <PostHeader
          username={props.reply.createdBy.username}
          displayName={props.reply.createdBy.displayName}
          timeSincePosted={timeSincePosted}
        />
        <div className="whitespace-pre-wrap break-words wrap-break-word">
          {props.reply.content}
        </div>
        <PostReactions
          currentUser={props.currentUser}
          postId={props.reply.id}
          parentKey={key}
          reactions={props.reply.reactions}
          addReaction={props.addReaction}
          removeReaction={props.removeReaction}
        />
        <PostFooter>
          <PostAddReactionButton
            myReactions={props.reply.reactions.filter(
              reaction => reaction.reactedBy.username === props.currentUser
            )}
            addReaction={async (kind: ReactionKind) =>
              props.addReaction(props.reply.id, kind)
            }
            removeReaction={async (reactionId: RecordId<string>) =>
              props.removeReaction(props.reply.id, reactionId)
            }
          />
          <PostOtherActionMenuButton
            postId={props.reply.id}
            seeDetail={props.seeDetail}
          />
        </PostFooter>
      </div>
    </div>
  );
}

export function Reply(props: ReplyProps): JSX.Element {
  const { data } = useQuery({
    queryKey: ["subscribe_reactions", props.reply.id],
    queryFn: subscribeReactions,
  });

  if (data === undefined) {
    return <ReplySkeleton className={props.className} />;
  }

  const secondsSincePosted = Math.floor(
    (props.currentTime - props.reply.createdAt.getTime()) / 1000
  );

  let timeSincePosted: string;

  if (secondsSincePosted < 60) {
    timeSincePosted = `${secondsSincePosted} seconds`;
  } else if (secondsSincePosted < 60 * 60) {
    timeSincePosted = `${Math.floor(secondsSincePosted / 60)} minutes`;
  } else if (secondsSincePosted < 60 * 60 * 24) {
    timeSincePosted = `${Math.floor(secondsSincePosted / (60 * 60))} hours`;
  } else {
    timeSincePosted = `${Math.floor(secondsSincePosted / (60 * 60 * 24))} days`;
  }

  const key = props.reply.id.toString();

  return (
    <div
      key={key}
      className={`flex flex-row gap-4 items-start ${props.className}`}>
      <div className="min-w-12">
        <a href={`/users/${props.reply.createdBy.username}`}>
          <Avatar
            username={props.reply.createdBy.username}
            avatarImageId={props.reply.createdBy.avatarImageId}
            alt={`an avatar of ${props.reply.createdBy.displayName}`}
            className="w-12 h-12"
          />
        </a>
      </div>
      <div className="w-full flex flex-col gap-2">
        <PostHeader
          username={props.reply.createdBy.username}
          displayName={props.reply.createdBy.displayName}
          timeSincePosted={timeSincePosted}
        />
        <div className="whitespace-pre-wrap break-words wrap-break-word">
          {props.reply.content}
        </div>
        <PostReactions
          currentUser={props.currentUser}
          postId={props.reply.id}
          parentKey={key}
          reactions={props.reply.reactions}
          addReaction={props.addReaction}
          removeReaction={props.removeReaction}
        />
        <PostFooter>
          <PostAddReactionButton
            myReactions={props.reply.reactions.filter(
              reaction => reaction.reactedBy.username === props.currentUser
            )}
            addReaction={async (kind: ReactionKind) =>
              props.addReaction(props.reply.id, kind)
            }
            removeReaction={async (reactionId: RecordId<string>) =>
              props.removeReaction(props.reply.id, reactionId)
            }
          />
          <PostOtherActionMenuButton
            postId={props.reply.id}
            seeDetail={props.seeDetail}
          />
        </PostFooter>
      </div>
    </div>
  );
}
