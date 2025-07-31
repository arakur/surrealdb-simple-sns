"use client";
import { Post, PostSkeleton } from "./post";
import { JSX } from "react";
import { PostList } from "./postList";
import { Button } from "./ui/button";
import { FaPaperPlane } from "react-icons/fa";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
  DialogClose,
} from "./ui/dialog";
import z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormField } from "./ui/form";
import { useRouter } from "next/navigation";
import { Textarea } from "./ui/textarea";
import { surrealAuthConnection } from "@/lib/surreal";
import { Uuid } from "surrealdb";

const createPostSchema = z.object({
  content: z.string().min(1, "Content is required"),
});

async function createPost(
  data: z.infer<typeof createPostSchema>
): Promise<{ result: "ok" | "error" }> {
  const connection = await surrealAuthConnection();

  if (connection.result === "error") {
    console.log("Error connecting to SurrealDB:", connection.errorKind);
    return { result: "error" };
  }

  const { client, id } = connection;

  try {
    await client.create("post", {
      id: Uuid.v7(),
      createdBy: id,
      content: data.content,
    });

    return { result: "ok" };
  } catch (error) {
    console.error("Error creating post:", error);
    return { result: "error" };
  }
}

function handleFormSubmit(
  router: ReturnType<typeof useRouter>
): (data: z.infer<typeof createPostSchema>) => Promise<void> {
  return async (data: z.infer<typeof createPostSchema>) => {
    const result = await createPost(data);
    if (result.result === "ok") {
      router.refresh();
    } else {
      alert("An error occurred while creating the post. Please try again.");
    }
  };
}

export function Timeline(): JSX.Element {
  const postsPerPage = 20;

  const form = useForm<z.infer<typeof createPostSchema>>({
    resolver: zodResolver(createPostSchema),
    defaultValues: {
      content: "",
    },
  });

  const router = useRouter();

  return (
    <>
      <PostList
        queryKey={["timeline"]}
        filter={{}}
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
            key={`timeline-post-${post.id}`}
            post={post}
            currentUser={currentUser}
            currentTime={currentTime}
            addReaction={addReaction}
            removeReaction={removeReaction}
            seeDetail={seeDetail}
            className="border-b border-gray-200 pb-4"
          />
        )}
        className="w-xl"
      />
      <Dialog>
        <DialogTrigger asChild>
          <Button
            variant="default"
            size="icon"
            className="
              fixed
              bottom-4 left-[calc(50%+0.5*var(--container-xl)+20*var(--spacing))]
              size-16
              rounded-full
              cursor-pointer">
            <FaPaperPlane className="scale-150" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>Create Post</DialogTitle>
          <Form {...form}>
            <form
              id="create-post-form"
              onSubmit={form.handleSubmit(handleFormSubmit(router))}>
              <div className="flex flex-col gap-6">
                <FormField
                  name="content"
                  control={form.control}
                  render={({ field }) => (
                    <div className="grid gap-2">
                      <Textarea
                        id="content"
                        placeholder="What's on your mind?"
                        {...field}
                        required
                      />
                    </div>
                  )}
                />
              </div>
            </form>
          </Form>
          <DialogClose asChild>
            <Button
              type="submit"
              form="create-post-form"
              className="w-full cursor-pointer"
              disabled={form.formState.isSubmitting}>
              Post
            </Button>
          </DialogClose>
        </DialogContent>
      </Dialog>
    </>
  );
}
