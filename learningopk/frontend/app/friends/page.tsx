"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { UserCheck, Clock } from "@phosphor-icons/react";
import { Tabs } from "@/components/foundation/tabs";
import { LoadingSkeleton } from "@/components/ui/states";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FriendCard } from "@/components/friends/friend-card";
import { FriendRequestCard } from "@/components/friends/friend-request-card";
import {
  getFriends,
  getFriendRequests,
  removeFriend,
  acceptFriendRequest,
  declineFriendRequest,
  type Friend,
  type FriendRequest,
} from "@/lib/friends-api";

export default function FriendsPage() {
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("tab") as "friends" | "requests") || "friends";

  const [friends, setFriends] = useState<Friend[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, setIsPending] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [friendToRemove, setFriendToRemove] = useState<Friend | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [friendsData, requestsData] = await Promise.all([
        getFriends(),
        getFriendRequests(),
      ]);

      setFriends(friendsData.friends);
      setIncomingRequests(requestsData.incoming);
      setOutgoingRequests(requestsData.outgoing);
    } catch {
      setError("Failed to load friends data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleMessage = useCallback((friendId: string) => {
    window.location.href = `/messages?conversation=${friendId}`;
  }, []);

  const handleRemoveClick = useCallback((friend: Friend) => {
    setFriendToRemove(friend);
    setShowRemoveDialog(true);
  }, []);

  const handleRemoveConfirm = useCallback(async () => {
    if (!friendToRemove) return;

    setIsPending(true);
    setLoadingId(friendToRemove.id);
    setShowRemoveDialog(false);

    try {
      await removeFriend(friendToRemove.id);
      setFriends((prev) => prev.filter((f) => f.id !== friendToRemove.id));
    } catch {
      console.error("Failed to remove friend");
    } finally {
      setIsPending(false);
      setLoadingId(null);
      setFriendToRemove(null);
    }
  }, [friendToRemove]);

  const handleAcceptRequest = useCallback(async (requestId: string) => {
    setIsPending(true);
    setLoadingId(requestId);
    try {
      await acceptFriendRequest(requestId);
      setIncomingRequests((prev) => prev.filter((r) => r.id !== requestId));
      fetchData();
    } catch {
      console.error("Failed to accept request");
    } finally {
      setIsPending(false);
      setLoadingId(null);
    }
  }, [fetchData]);

  const handleDeclineRequest = useCallback(async (requestId: string) => {
    setIsPending(true);
    setLoadingId(requestId);
    try {
      await declineFriendRequest(requestId);
      setIncomingRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch {
      console.error("Failed to decline request");
    } finally {
      setIsPending(false);
      setLoadingId(null);
    }
  }, []);

  const handleCancelRequest = useCallback(async (requestId: string) => {
    setIsPending(true);
    setLoadingId(requestId);
    try {
      await declineFriendRequest(requestId);
      setOutgoingRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch {
      console.error("Failed to cancel request");
    } finally {
      setIsPending(false);
      setLoadingId(null);
    }
  }, []);

  const tabItems = [
    {
      key: "friends",
      label: "All Friends",
      href: "?tab=friends",
      badge: friends.length || undefined,
    },
    {
      key: "requests",
      label: "Requests",
      href: "?tab=requests",
      badge: incomingRequests.length || undefined,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Friends</h1>
        <p className="text-muted-foreground mt-1">
          Manage your friends and connection requests
        </p>
      </div>

      <Tabs items={tabItems} activeKey={activeTab} />

      {isLoading ? (
        <LoadingSkeleton rows={5} variant="card" />
      ) : error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      ) : activeTab === "friends" ? (
        friends.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center">
            <UserCheck className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
            <h3 className="text-lg font-semibold text-foreground">No friends yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Search for students to start connecting
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {friends.map((friend) => (
              <FriendCard
                key={friend.id}
                friend={friend}
                onMessage={() => handleMessage(friend.userId)}
                onRemove={() => handleRemoveClick(friend)}
                isLoading={isPending}
                loadingFriendId={loadingId}
              />
            ))}
          </div>
        )
      ) : (
        <div className="space-y-8">
          {incomingRequests.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <span>Incoming Requests</span>
                <span className="text-sm font-normal text-muted-foreground">
                  ({incomingRequests.length})
                </span>
              </h2>
              <div className="grid gap-3">
                {incomingRequests.map((request) => (
                  <FriendRequestCard
                    key={request.id}
                    request={request}
                    type="incoming"
                    onAccept={handleAcceptRequest}
                    onDecline={handleDeclineRequest}
                    isLoading={isPending}
                    loadingRequestId={loadingId}
                  />
                ))}
              </div>
            </div>
          )}

          {outgoingRequests.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <span>Sent Requests</span>
                <span className="text-sm font-normal text-muted-foreground">
                  ({outgoingRequests.length})
                </span>
              </h2>
              <div className="grid gap-3">
                {outgoingRequests.map((request) => (
                  <FriendRequestCard
                    key={request.id}
                    request={request}
                    type="outgoing"
                    onCancel={handleCancelRequest}
                    isLoading={isPending}
                    loadingRequestId={loadingId}
                  />
                ))}
              </div>
            </div>
          )}

          {incomingRequests.length === 0 && outgoingRequests.length === 0 && (
            <div className="rounded-xl border border-dashed border-border p-12 text-center">
              <Clock className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
              <h3 className="text-lg font-semibold text-foreground">No pending requests</h3>
              <p className="text-sm text-muted-foreground mt-1">
                All caught up! Check back later for new requests.
              </p>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={showRemoveDialog}
        title="Remove friend?"
        description={`Are you sure you want to remove ${friendToRemove?.name} from your friends? This action cannot be undone.`}
        confirmLabel="Remove"
        danger
        onConfirm={handleRemoveConfirm}
        onCancel={() => {
          setShowRemoveDialog(false);
          setFriendToRemove(null);
        }}
        isPending={isPending}
      />
    </div>
  );
}
