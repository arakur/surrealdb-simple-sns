"use client";
import { JSX } from "react";
import { FaPlus, FaRegComments } from "react-icons/fa";
import { MdExpandLess, MdExpandMore } from "react-icons/md";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";
import "./post.css";
import { Avatar } from "./ui/avatar";
import { RecordId } from "surrealdb";
import { Skeleton } from "./ui/skeleton";
import { useQuery } from "@tanstack/react-query";
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
import { PostReply, ReplySkeleton } from "./reply";
import { PostHeader } from "./postHeader";
import { User } from "./user";
import { PostReplyList } from "./postReplyList";

export type Post = Readonly<{
  id: RecordId;
  createdBy: User;
  createdAt: Date;
  content: string;
  reactions: ReadonlyArray<Reaction>;
  numReplies: number;
}>;

function PostReplies(props: {
  postId: RecordId<string>;
  numReplies: number;
  currentUser: string;
  currentTime: number;
  addReaction: (postId: RecordId<string>, kind: ReactionKind) => Promise<void>;
  removeReaction: (
    postId: RecordId<string>,
    reactionId: RecordId<string>
  ) => Promise<void>;
  seeDetail: () => Promise<void>;
  className?: string;
}): JSX.Element {
  const [open, setOpen] = useState(false);

  if (props.numReplies === 0) {
    return <></>;
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="text-gray-500 text-sm cursor-pointer">
        {open ? (
          <div className="flex items-center gap-1">
            <MdExpandLess /> Hide replies
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <MdExpandMore /> Show {props.numReplies}{" "}
            {props.numReplies === 1 ? "reply" : "replies"}
          </div>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="PostRepliesCollapsible">
        <PostReplyList
          replyTo={props.postId}
          queryKey={["replies", props.postId.id.toString()]}
          repliesPerPage={20}
          replySkeleton={<ReplySkeleton />}
          replyElement={(props, index) => <PostReply {...props} key={index} />}
          className="mt-4"
        />
      </CollapsibleContent>
    </Collapsible>
  );
}

export function PostSkeleton(props: { className?: string }) {
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

export type PostProps = {
  post: Post;
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

export function Post(props: PostProps): JSX.Element {
  const { data } = useQuery({
    queryKey: ["subscribe_reactions", props.post.id],
    queryFn: subscribeReactions,
  });

  if (data === undefined) {
    return <PostSkeleton className={props.className} />;
  }

  const secondsSincePosted = Math.floor(
    (props.currentTime - props.post.createdAt.getTime()) / 1000
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

  const key = props.post.id.toString();

  return (
    <div
      key={key}
      className={`flex flex-row gap-4 items-start ${props.className}`}>
      <div className="min-w-12">
        <a href={`/users/${props.post.createdBy.username}`}>
          <Avatar
            username={props.post.createdBy.username}
            avatarImageId={props.post.createdBy.avatarImageId}
            alt={`an avatar of ${props.post.createdBy.displayName}`}
            className="w-12 h-12"
          />
        </a>
      </div>
      <div className="w-full flex flex-col gap-2">
        <PostHeader
          username={props.post.createdBy.username}
          displayName={props.post.createdBy.displayName}
          timeSincePosted={timeSincePosted}
        />
        <div className="whitespace-pre-wrap break-words wrap-break-word">
          {props.post.content}
        </div>
        <PostReactions
          currentUser={props.currentUser}
          postId={props.post.id}
          parentKey={key}
          reactions={props.post.reactions}
          addReaction={props.addReaction}
          removeReaction={props.removeReaction}
        />
        <PostFooter>
          <Button
            variant="ghost"
            className="flex items-center gap-2 text-gray-500 cursor-pointer">
            <FaRegComments />
            <FaPlus />
          </Button>
          <PostAddReactionButton
            myReactions={props.post.reactions.filter(
              reaction => reaction.reactedBy.username === props.currentUser
            )}
            addReaction={async (kind: ReactionKind) =>
              props.addReaction(props.post.id, kind)
            }
            removeReaction={async (reactionId: RecordId<string>) =>
              props.removeReaction(props.post.id, reactionId)
            }
          />
          <PostOtherActionMenuButton
            postId={props.post.id}
            seeDetail={props.seeDetail}
          />
        </PostFooter>
        <PostReplies
          postId={props.post.id}
          numReplies={props.post.numReplies}
          currentUser={props.currentUser}
          currentTime={props.currentTime}
          addReaction={props.addReaction}
          removeReaction={props.removeReaction}
          seeDetail={props.seeDetail}
          className="pt-2"
        />
      </div>
    </div>
  );
}
