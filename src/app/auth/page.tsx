"use client";
import { useRouter } from "next/navigation";
import { JSX, useEffect } from "react";

export default function AuthRedirect(): JSX.Element {
  const router = useRouter();

  useEffect(() => {
    router.push("/auth/login");
  }, [router]);

  return (
    <div>
      <h1>Redirecting...</h1>
    </div>
  );
}
