import { RouteLoading } from "@/components/foundation/route-state";

export default function ForumThreadLoading() {
  return <RouteLoading title="Loading thread" description="Fetching thread body, replies, and moderation state." />;
}

