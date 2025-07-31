import { useRouter } from "next/navigation";
import { Post, PostProps } from "./post";
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

export type PostList = ReadonlyArray<Post>;

export type PostListFilter = Readonly<{
  createdBy?: string;
}>;

async function fetchPosts(
  router: ReturnType<typeof useRouter>,
  lastId: RecordId<string> | null,
  limit: number,
  filter: PostListFilter
): Promise<PostList> {
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
    count(<- replied) as numReplies,
    (SELECT id, kind, in.{username} as reactedBy FROM <- reacted) as reactions
    FROM post
    WHERE ($isInitial OR id > $lastId)
  `;
  if (filter.createdBy !== undefined) {
    query += `
    AND createdBy.username = $createdBy `;
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

  const [posts] = await client.query<[Post[]]>(query, params);

  return posts;
}

export function PostList(
  props: Readonly<{
    filter: PostListFilter;
    queryKey: string[];
    postsPerPage: number;
    postSkeleton: JSX.Element;
    postElement: (props: PostProps) => JSX.Element;
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
      return fetchPosts(router, lastId, props.postsPerPage + 1, props.filter);
    },
    initialPageParam: null,
    getNextPageParam: lastPage => {
      const posts = lastPage as PostList;
      if (posts.length > props.postsPerPage) {
        return posts[props.postsPerPage - 1].id;
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
    return props.postSkeleton;
  }

  if (status === "error") {
    return <div className={props.className}>Error loading posts</div>;
  }

  const postList = data.pages.flat();

  return (
    <div
      className={`flex flex-col gap-[16px] row-start-2 h-full overflow-y-auto ${props.className}`}>
      {postList.length === 0 && !hasNextPage ? (
        <div className="text-gray-500 text-center">No posts found</div>
      ) : (
        postList.map(post => {
          return props.postElement({
            post,
            addReaction: async (postId, kind) => {
              const data = queryClient.getQueryData<InfiniteData<PostList>>(
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
                  if (p.id !== postId) {
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
                InfiniteData<PostList>
              >(props.queryKey, newData);
            },
            removeReaction: async (postId, reactionId) => {
              const data = queryClient.getQueryData<InfiniteData<PostList>>(
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
                InfiniteData<PostList>
              >(props.queryKey, newData);
            },
            seeDetail: async () => {
              await router.push(`/posts/${post.id.id}`);
            },
            currentUser,
            currentTime,
          });
        })
      )}
      {hasNextPage ? (
        <div ref={reloadSkeletonRef}>{props.postSkeleton}</div>
      ) : (
        <></>
      )}
    </div>
  );
}
