"use client";
import { JSX } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Form, FormField } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { signinSurreal } from "@/lib/surreal";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { setSession } from "@/lib/session";

const signinSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

async function login(
  data: z.infer<typeof signinSchema>
): Promise<{ result: "ok" | "invalid_credentials" | "unknown error" }> {
  const signin = await signinSurreal(data.username, data.password);
  if (signin.result === "error") {
    console.log("failed to login: ", signin); // DEBUG
    if (signin.errorKind === "invalid_credentials") {
      return { result: "invalid_credentials" };
    } else {
      return { result: "unknown error" };
    }
  }
  const { token } = signin;

  await setSession({ username: data.username, token });
  return { result: "ok" };
}

function handleFormSubmit(
  router: ReturnType<typeof useRouter>
): (data: z.infer<typeof signinSchema>) => Promise<void> {
  return async (data: z.infer<typeof signinSchema>) => {
    const result = await login(data);
    if (result.result === "ok") {
      router.push("/");
    } else if (result.result === "invalid_credentials") {
      alert("Invalid username or password");
    } else {
      alert("An unknown error occurred. Please try again later.");
    }
  };
}

function LoginCard(): JSX.Element {
  const form = useForm<z.infer<typeof signinSchema>>({
    resolver: zodResolver(signinSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const router = useRouter();

  return (
    <Card className="w-xl max-w-sm">
      <CardHeader>
        <CardTitle>Log in to The Simple SNS</CardTitle>
        <CardDescription>
          or{" "}
          <Link
            href="/auth/signup"
            className="p-0 text-blue-600 hover:underline cursor-pointer">
            <strong>sign up</strong>
          </Link>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form
            id="login-form"
            onSubmit={form.handleSubmit(handleFormSubmit(router))}>
            <div className="flex flex-col gap-6">
              <FormField
                name="username"
                control={form.control}
                render={({ field }) => (
                  <div className="grid gap-2">
                    <Label htmlFor="username">User Name</Label>
                    <Input id="username" type="text" {...field} required />
                  </div>
                )}
              />
              <FormField
                name="password"
                control={form.control}
                render={({ field }) => (
                  <div className="grid gap-2">
                    <div className="flex items-center">
                      <Label htmlFor="password">Password</Label>
                    </div>
                    <Input id="password" type="password" {...field} required />
                  </div>
                )}
              />
            </div>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex-col gap-2">
        <Button
          type="submit"
          form="login-form"
          className="w-full cursor-pointer"
          disabled={form.formState.isSubmitting}>
          Login
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function LoginPage(): JSX.Element {
  return (
    <div className="grid grid-rows-[60px_1fr] justify-items-center min-h-screen p-8 pb-20 gap-16]">
      <main>
        <LoginCard />
      </main>
    </div>
  );
}
