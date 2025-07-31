"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { JSX } from "react";

export const queryClient = new QueryClient();

export default function Provider({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
