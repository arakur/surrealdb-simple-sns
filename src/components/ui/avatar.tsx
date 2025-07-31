"use client";
import Image from "next/image";
import { JSX } from "react";

export function Avatar(
  props: Readonly<{
    username: string;
    avatarImageId: string;
    className?: string;
    alt: string;
  }>
): JSX.Element {
  const avatarImageSize = 256;
  return (
    <Image
      src={`https://picsum.photos/seed/${props.avatarImageId}/${avatarImageSize}/${avatarImageSize}`}
      alt={props.alt}
      width={avatarImageSize}
      height={avatarImageSize}
      className={`rounded-full ${props.className}`}
    />
  );
}
