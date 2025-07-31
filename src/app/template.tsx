import Provider from "@/components/providers/provider";

export default function Template({ children }: { children: React.ReactNode }) {
  return <Provider>{children}</Provider>;
}
