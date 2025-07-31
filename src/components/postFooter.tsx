"use client";
import { JSX, ReactNode } from "react";
import { FaPlus, FaRegHeart } from "react-icons/fa";
import { HiDotsHorizontal } from "react-icons/hi";
import { Button } from "@/components/ui/button";
import "./post.css";
import { RecordId } from "surrealdb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Reaction,
  reactionIcon,
  ReactionKind,
  reactionKinds,
} from "./reaction";

export type User = Readonly<{
  username: string;
  displayName: string;
  avatarImageId: string;
}>;

export function PostAddReactionButton(
  props: Readonly<{
    myReactions: ReadonlyArray<Reaction>;
    addReaction: (kind: ReactionKind) => Promise<void>;
    removeReaction: (reactionId: RecordId<string>) => Promise<void>;
  }>
): JSX.Element {
  const reactionButtons = reactionKinds.map(kind => {
    const myReaction = props.myReactions.find(r => r.kind === kind);
    const hasMyReaction = myReaction !== undefined;

    return (
      <Button
        key={`add-reaction-${kind}`}
        variant={hasMyReaction ? "default" : "ghost"}
        size="sm"
        onClick={async () => {
          if (hasMyReaction) {
            await props.removeReaction(myReaction.id);
          } else {
            await props.addReaction(kind);
          }
        }}
        className="cursor-pointer">
        {reactionIcon(kind)}
      </Button>
    );
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 text-gray-500 cursor-pointer">
          <FaRegHeart />
          <FaPlus />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuGroup>
          <div className="flex flex-row gap-2 items-center">
            {reactionButtons}
          </div>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PostOtherActionMenuButton(
  props: Readonly<{
    postId: RecordId<string>;
    seeDetail: () => Promise<void>;
  }>
): JSX.Element {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex items-center gap-2 text-gray-500 cursor-pointer">
          <HiDotsHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuGroup>
          <Button
            variant="ghost"
            onClick={async () => {
              await props.seeDetail();
            }}>
            View Details
          </Button>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function PostFooter(props: { children: ReactNode }): JSX.Element {
  return (
    <div className="flex flex-row gap-4 items-center">{props.children}</div>
  );
}
