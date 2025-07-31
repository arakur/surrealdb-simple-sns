import { useRouter } from "next/navigation";
import { RecordId } from "surrealdb";
import { surrealAuthConnection } from "@/lib/surreal";
import { JSX, useMemo } from "react";
import {
  InfiniteData,
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { getSession } from "@/lib/session";
import { v7 as uuidV7 } from "uuid";
import { PostReply, ReplyProps } from "./reply";

export type ReplyList = ReadonlyArray<PostReply>;

export type ReplyListFilter = Readonly<{
  createdBy?: string;
}>;

async function fetchReplies(
  router: ReturnType<typeof useRouter>,
  lastId: RecordId<string> | null,
  limit: number,
  filter: ReplyListFilter
): Promise<ReplyList> {
  const connection = await surrealAuthConnection();

  if (connection.result === "error") {
    if (connection.errorKind === "unknown error") {
      console.log(`An unknown error occurred: ${connection.errorMessage}`);
    }
    await router.push("/auth/login");
    return [];
  }

  const { client } = connection;

  let query = `SELECT
    id, content, createdAt, createdBy.{id, username, avatarImageId},
    -> replied -> post as replyTo,
    (SELECT id, kind, in.{username} as reactedBy FROM <- reacted) as reactions
    FROM reply
    WHERE ($isInitial OR id > $lastId)`;

  if (filter.createdBy !== undefined) {
    query += `
    AND createdBy.username = $createdBy`;
  }

  query += `
    ORDER BY id DESC
    LIMIT $limit`;

  const params: Record<string, unknown> = {
    createdBy: filter.createdBy,
    isInitial: lastId === null,
    lastId: lastId ?? "",
    limit: limit + 1,
  };

  console.log("query: ", query); // DEBUG
  console.log("params: ", params); // DEBUG

  const [posts] = await client.query<[PostReply[]]>(query, params);

  return posts;
}

export function ReplyList(
  props: Readonly<{
    queryKey: string[];
    repliesPerPage: number;
    replySkeleton: JSX.Element;
    replyElement: (props: ReplyProps, index: number) => JSX.Element;
    filter: ReplyListFilter;
    className?: string;
  }>
): JSX.Element {
  const router = useRouter();

  const { data, fetchNextPage, hasNextPage, status } = useInfiniteQuery({
    queryKey: props.queryKey,
    queryFn: async ({
      pageParam: lastId,
    }: {
      pageParam: RecordId<string> | null;
    }) => {
      return fetchReplies(
        router,
        lastId,
        props.repliesPerPage + 1,
        props.filter
      );
    },
    initialPageParam: null,
    getNextPageParam: lastPage => {
      const posts = lastPage as ReplyList;
      if (posts.length > props.repliesPerPage) {
        return posts[props.repliesPerPage - 1].id;
      }
      return undefined;
    },
  });

  const reloadSkeletonRef = useMemo(() => {
    return (element: HTMLDivElement | null) => {
      if (element !== null) {
        const observer = new IntersectionObserver(
          async entries => {
            if (entries[0].isIntersecting && hasNextPage) {
              await fetchNextPage();
            }
          },
          { threshold: 1.0 }
        );

        observer.observe(element);
        return () => {
          observer.unobserve(element);
        };
      }
    };
  }, [fetchNextPage, hasNextPage]);

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

  if (status === "pending") {
    return props.replySkeleton;
  }

  if (status === "error") {
    return <div className={props.className}>Error loading posts</div>;
  }

  const replyList = data.pages.flat();

  return (
    <div
      className={`flex flex-col gap-[16px] row-start-2 h-full overflow-y-auto ${props.className}`}>
      {replyList.length === 0 && !hasNextPage ? (
        <div className="text-gray-500 text-center">No posts found</div>
      ) : (
        replyList.map((reply, index) => {
          return props.replyElement(
            {
              reply,
              addReaction: async (replyId, kind) => {
                const data = queryClient.getQueryData<InfiniteData<ReplyList>>(
                  props.queryKey
                );
                if (data === undefined) {
                  console.error("No data found");
                  return;
                }
                const newReaction = {
                  id: new RecordId("reacted", uuidV7().toString()),
                  kind,
                  reactedAt: Date.now(),
                  reactedBy: { username: currentUser },
                };
                const newPages = data.pages.map(page =>
                  page.map(p => {
                    if (p.id !== replyId) {
                      return p;
                    }
                    return {
                      ...p,
                      reactions: [...p.reactions, newReaction],
                    };
                  })
                );
                const newData = {
                  ...data,
                  pages: newPages,
                };
                queryClient.setQueryData<
                  unknown,
                  string[],
                  InfiniteData<ReplyList>
                >(props.queryKey, newData);
              },
              removeReaction: async (postId, reactionId) => {
                const data = queryClient.getQueryData<InfiniteData<ReplyList>>(
                  props.queryKey
                );
                if (data === undefined) {
                  console.error("No data found");
                  return;
                }
                const newData = {
                  ...data,
                  pages: data.pages.map(page =>
                    page.map(p => {
                      return {
                        ...p,
                        reactions: p.reactions.filter(r => r.id !== reactionId),
                      };
                    })
                  ),
                };
                queryClient.setQueryData<
                  unknown,
                  string[],
                  InfiniteData<ReplyList>
                >(props.queryKey, newData);
              },
              seeDetail: async () => {
                await router.push(`/posts/${reply.id.id}`);
              },
              currentUser,
              currentTime,
            },
            index
          );
        })
      )}
      {hasNextPage ? (
        <div ref={reloadSkeletonRef}>{props.replySkeleton}</div>
      ) : (
        <></>
      )}
    </div>
  );
}
