"use client";

import { Post } from "@/components/post";
import { Reaction } from "@/components/reaction";
import { getSession } from "@/lib/session";
import { surrealAuthConnection } from "@/lib/surreal";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { JSX } from "react";
import { RecordId } from "surrealdb";
import { v7 as uuidV7 } from "uuid";

async function fetchPostDetail(
  router: ReturnType<typeof useRouter>,
  postId: RecordId<string>
): Promise<{ result: "ok"; post: Post } | { result: "error"; error: string }> {
  const connection = await surrealAuthConnection();

  if (connection.result === "error") {
    if (
      connection.errorKind === "token expired" ||
      connection.errorKind === "unauthenticated"
    ) {
      router.push("/auth/login");
    } else {
      console.log("Error connecting to SurrealDB:", connection.errorKind);
    }

    return {
      result: "error",
      error: connection.errorMessage,
    };
  }

  const { client } = connection;

  const ret = await client.query<[[Post] | []]>(
    `
    SELECT
      id, content, createdAt, createdBy.*,
      (SELECT id, kind, reactedAt, in.{username} AS reactedBy FROM <-reacted ORDER BY reactedAt DESC) AS reactions,
      (
        SELECT
        id, content, createdAt, createdBy.*,
        (SELECT id, kind, reactedAt, in.{username} AS reactedBy FROM <-reacted ORDER BY reactedAt DESC) AS reactions
        FROM <-replied<-post
        ORDER BY createdAt ASC
      ) AS replies
    FROM $postId
    `,
    {
      postId: postId,
    }
  );

  if (ret[0].length === 0) {
    throw new Error(`Post ${postId} not found`);
  }

  return { result: "ok", post: ret[0][0] };
}

export default function PostDetail(): JSX.Element {
  const router = useRouter();
  const params = useParams();
  const postId = params.postId as string;

  const { data } = useQuery({
    queryKey: ["post_detail", postId],
    queryFn: () => fetchPostDetail(router, new RecordId("post", postId)),
  });

  const currentUser =
    useQuery({
      queryKey: ["current_user"],
      queryFn: async () => {
        const session = await getSession();
        if (session === null) {
          return "";
        }
        return session.username;
      },
    }).data ?? "";

  const currentTime = Date.now();

  const queryClient = useQueryClient();

  if (data === undefined) {
    return <div>Loading...</div>;
  }

  if (data.result === "error") {
    return <div>Error: {data.error}</div>;
  }

  const { post } = data;

  return (
    <div className={`h-full overflow-y-auto w-xl`}>
      <Post
        post={post}
        currentUser={currentUser}
        currentTime={currentTime}
        addReaction={async (postId, kind) => {
          const data = queryClient.getQueryData<
            | {
                result: "ok";
                post: Post;
              }
            | {
                result: "error";
                error: string;
              }
          >(["post_detail", postId.id.toString()]);
          if (data === undefined) {
            console.error("No data found");
            return;
          }
          if (data.result === "error") {
            console.error("Error fetching current user:", data.error);
            return;
          }
          const newReaction: Reaction = {
            id: new RecordId("reacted", uuidV7().toString()),
            kind,
            reactedBy: {
              username: currentUser,
            },
          };
          const newPost: Post = {
            ...data.post,
            reactions: [...data.post.reactions, newReaction],
          };
          queryClient.setQueryData<
            unknown,
            string[],
            { result: "ok"; post: Post }
          >(["post_detail", postId.id.toString()], {
            result: "ok",
            post: newPost,
          });
        }}
        removeReaction={async (postId, reactionId) => {
          const data = queryClient.getQueryData<
            | {
                result: "ok";
                post: Post;
              }
            | {
                result: "error";
                error: string;
              }
          >(["post_detail", postId.id.toString()]);
          if (data === undefined) {
            console.error("No data found");
            return;
          }
          if (data.result === "error") {
            console.error("Error fetching current user:", data.error);
            return;
          }
          const newPost: Post = {
            ...data.post,
            reactions: data.post.reactions.filter(
              reaction => reaction.id !== reactionId
            ),
          };
          queryClient.setQueryData<
            unknown,
            string[],
            { result: "ok"; post: Post }
          >(["post_detail", postId.id.toString()], {
            result: "ok",
            post: newPost,
          });
        }}
        seeDetail={async () => {
          await router.push(`/posts/${post.id.id}`);
        }}
      />
    </div>
  );
}
