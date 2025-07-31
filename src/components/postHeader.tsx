import { JSX } from "react";

export function PostHeader(
  props: Readonly<{
    username: string;
    displayName: string;
    timeSincePosted: string;
  }>
): JSX.Element {
  return (
    <div className="min-w-full h-8">
      <a href={`/users/${props.username}`} className="hover:text-gray-700">
        <span className="font-bold">{props.displayName}</span>
        <span> </span>
        <span className="text-gray-500 text-sm">@{props.username}</span>
      </a>
      <span className="float-right text-gray-500 text-sm">
        {props.timeSincePosted} ago
      </span>
    </div>
  );
}
