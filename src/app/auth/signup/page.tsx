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
import { signupSurreal } from "@/lib/surreal";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { setSession } from "@/lib/session";

const signupSchema = z
  .object({
    username: z.string().min(1, "Username is required"),
    password: z.string().min(1, "Password is required"),
    confirmPassword: z.string().min(1, "Confirm Password is required"),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: "Passwords must match",
  });

function signup(router: ReturnType<typeof useRouter>) {
  return async (data: z.infer<typeof signupSchema>) => {
    const { token } = await signupSurreal(data.username, data.password);
    await setSession({ username: data.username, token });
    await router.push("/");
  };
}

function SignupCard(): JSX.Element {
  const form = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      username: "",
      password: "",
      confirmPassword: "",
    },
  });

  const router = useRouter();

  return (
    <Card className="w-xl max-w-sm">
      <CardHeader>
        <CardTitle>Sign up for The Simple SNS</CardTitle>
        <CardDescription>
          or{" "}
          <Link
            href="/auth/login"
            className="p-0 text-blue-600 hover:underline cursor-pointer">
            <strong>log in</strong>
          </Link>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form id="signup-form" onSubmit={form.handleSubmit(signup(router))}>
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
              <FormField
                name="confirmPassword"
                control={form.control}
                render={({ field }) => (
                  <div className="grid gap-2">
                    <div className="flex items-center">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                    </div>
                    <Input
                      id="confirmPassword"
                      type="password"
                      {...field}
                      required
                    />
                  </div>
                )}
              />
            </div>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex-col gap-2">
        <Button type="submit" form="signup-form" className="w-full">
          Sign Up
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function SignupPage(): JSX.Element {
  return (
    <div className="grid grid-rows-[60px_1fr] justify-items-center min-h-screen p-8 pb-20 gap-16]">
      <main>
        <SignupCard />
      </main>
    </div>
  );
}
