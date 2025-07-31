"use client";
import { Post, PostSkeleton } from "@/components/post";
import { PostList } from "@/components/postList";
import { Reply } from "@/components/reply";
import { ReplyList } from "@/components/replyList";
import { Avatar } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsContent, TabsTrigger } from "@/components/ui/tabs";
import { surrealAuthConnection } from "@/lib/surreal";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { JSX } from "react";
import { RecordId } from "surrealdb";

export type UserDetail = Readonly<{
  id: RecordId<string>;
  username: string;
  displayName: string;
  createdAt: Date;
  avatarImageId: string;
  biography: string;
}>;

async function fetchUserDetail(
  router: ReturnType<typeof useRouter>,
  username: string
): Promise<
  { result: "ok"; userDetail: UserDetail } | { result: "error"; error: string }
> {
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

  const query = `SELECT
      username, displayName, createdAt, avatarImageId, biography
      FROM user
      WHERE username = $username
  `;

  const ret = await client.query<[[] | [UserDetail]]>(query, {
    username: username,
  });

  if (ret[0].length === 0) {
    throw new Error(`User ${username} not found`);
  }

  return { result: "ok", userDetail: ret[0][0] };
}

export default function UserDetail(): JSX.Element {
  const postsPerPage = 20;

  const router = useRouter();
  const params = useParams();
  const username = params.username as string;

  const { data } = useQuery({
    queryKey: ["user_detail", username],
    queryFn: () => fetchUserDetail(router, username),
  });

  if (!data) {
    return <div>Loading...</div>;
  }
  if (data.result === "error") {
    return <div>Error: {data.error}</div>;
  }
  const { userDetail } = data;
  return (
    <div className="grid grid-rows-[auto_1fr] gap-4">
      <div className="grid grid-cols-[128px_1fr] items-center gap-4 border-b border-gray-200 pb-4">
        <Avatar
          username={userDetail.username}
          avatarImageId={userDetail.avatarImageId}
          alt={`an avatar of ${userDetail.displayName}`}
        />
        <div className="w-xl">
          <h1 className="text-2xl font-bold">{userDetail.displayName}</h1>
          <p className="text-gray-500">@{userDetail.username}</p>
          <p className="text-gray-700 mt-2 whitespace-pre-wrap break-words wrap-break-word">
            {userDetail.biography}
          </p>
        </div>
      </div>
      <Tabs defaultValue="posts">
        <TabsList>
          <TabsTrigger value="posts">Posts</TabsTrigger>
          <TabsTrigger value="replies">Replies</TabsTrigger>
        </TabsList>
        <TabsContent value="posts">
          <PostList
            queryKey={["user_posts", userDetail.username]}
            filter={{ createdBy: userDetail.username }}
            postsPerPage={postsPerPage}
            postSkeleton={<PostSkeleton />}
            postElement={({
              post,
              currentUser,
              currentTime,
              addReaction,
              removeReaction,
              seeDetail,
            }) => (
              <Post
                key={`user-post-${post.id}`}
                post={post}
                currentUser={currentUser}
                currentTime={currentTime}
                addReaction={addReaction}
                removeReaction={removeReaction}
                seeDetail={seeDetail}
                className="border-b border-gray-200 pb-4"
              />
            )}
          />
        </TabsContent>
        <TabsContent value="replies">
          <ReplyList
            queryKey={["user_replies", userDetail.username]}
            filter={{ createdBy: userDetail.username }}
            repliesPerPage={postsPerPage}
            replySkeleton={<PostSkeleton />}
            replyElement={({
              reply,
              currentUser,
              currentTime,
              addReaction,
              removeReaction,
              seeDetail,
            }) => (
              <Reply
                key={`user-reply-${reply.id}`}
                reply={reply}
                currentUser={currentUser}
                currentTime={currentTime}
                addReaction={addReaction}
                removeReaction={removeReaction}
                seeDetail={seeDetail}
                className="border-b border-gray-200 pb-4"
              />
            )}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
