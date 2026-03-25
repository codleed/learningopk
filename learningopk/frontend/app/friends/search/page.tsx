"use client";

import { useCallback, useEffect, useState } from "react";
import { MagnifyingGlass, Users } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { LoadingSkeleton } from "@/components/ui/states";
import { UserSearchCard } from "@/components/friends/user-search-card";
import {
  searchUsers,
  getInstitutes,
  addFriend,
  cancelFriendRequest,
  type UserSearchResult,
} from "@/lib/friends-api";

type Institute = { id: number; name: string };

export default function SearchFriendsPage() {
  const [query, setQuery] = useState("");
  const [selectedInstitute, setSelectedInstitute] = useState<number | undefined>();
  const [institutes, setInstitutes] = useState<Institute[]>([]);
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingInstitutes, setIsLoadingInstitutes] = useState(true);
  const [loadingUserId, setLoadingUserId] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInstitutes = async () => {
      try {
        const data = await getInstitutes();
        setInstitutes(data.institutes);
      } catch {
        console.error("Failed to load institutes");
      } finally {
        setIsLoadingInstitutes(false);
      }
    };
    fetchInstitutes();
  }, []);

  const debounce = <T extends (...args: Parameters<T>) => void>(fn: T, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), delay);
    };
  };

  const performSearch = useCallback(async (searchQuery: string, instituteId?: number) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const data = await searchUsers({
        query: searchQuery.trim(),
        instituteId,
        limit: 20,
        offset: 0,
      });
      setResults(data.users);
    } catch {
      setError("Failed to search users. Please try again.");
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const debouncedSearch = useCallback(
    debounce((searchQuery: string, instituteId?: number) => {
      performSearch(searchQuery, instituteId);
    }, 300),
    [performSearch]
  );

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    debouncedSearch(value, selectedInstitute);
  }, [debouncedSearch, selectedInstitute]);

  const handleInstituteChange = useCallback((value: string) => {
    const instituteId = value ? parseInt(value, 10) : undefined;
    setSelectedInstitute(instituteId);
    debouncedSearch(query, instituteId);
  }, [debouncedSearch, query]);

  const handleAddFriend = useCallback(async (userId: string) => {
    setLoadingUserId(userId);
    try {
      await addFriend(userId);
      setResults((prev) =>
        prev.map((user) =>
          user.id === userId ? { ...user, friendStatus: "pending_sent" as const } : user
        )
      );
    } catch {
      console.error("Failed to send friend request");
    } finally {
      setLoadingUserId(null);
    }
  }, []);

  const handleCancelRequest = useCallback(async (userId: string) => {
    setLoadingUserId(userId);
    try {
      await cancelFriendRequest(userId);
      setResults((prev) =>
        prev.map((user) =>
          user.id === userId ? { ...user, friendStatus: "none" as const } : user
        )
      );
    } catch {
      console.error("Failed to cancel friend request");
    } finally {
      setLoadingUserId(null);
    }
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Find Friends</h1>
        <p className="text-muted-foreground mt-1">
          Search for students to connect with
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name or email..."
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select
          value={selectedInstitute?.toString() || ""}
          onChange={(e) => handleInstituteChange(e.target.value)}
          disabled={isLoadingInstitutes}
          className="sm:w-[200px]"
        >
          <option value="">All Institutes</option>
          {institutes.map((institute) => (
            <option key={institute.id} value={institute.id.toString()}>
              {institute.name}
            </option>
          ))}
        </Select>
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={5} variant="card" />
      ) : error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      ) : hasSearched && results.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <Users className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
          <h3 className="text-lg font-semibold text-foreground">No users found</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Try a different search term or filter
          </p>
        </div>
      ) : results.length > 0 ? (
        <div className="grid gap-3">
          {results.map((user) => (
            <UserSearchCard
              key={user.id}
              user={user}
              onAddFriend={handleAddFriend}
              onCancelRequest={handleCancelRequest}
              isLoading={isLoading}
              loadingUserId={loadingUserId}
            />
          ))}
        </div>
      ) : !hasSearched ? (
        <div className="rounded-xl border border-dashed border-border p-12 text-center">
          <MagnifyingGlass className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
          <h3 className="text-lg font-semibold text-foreground">Search for students</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Enter a name or email to find students
          </p>
        </div>
      ) : null}
    </div>
  );
}
