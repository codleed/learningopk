"use client";

import { useState } from "react";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { joinSchool } from "@/lib/school-api";

export function JoinSchoolCard({ onJoin }: { onJoin?: () => void }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleJoin = async () => {
    setLoading(true);
    setError("");
    try {
      await joinSchool(code.trim());
      if (onJoin) {
        onJoin();
      } else if (typeof window !== "undefined") {
        window.location.reload();
      }
    } catch {
      setError("Invalid invite code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-accent-primary/30 bg-accent-primary-light/30">
      <CardBody className="space-y-4">
        <CardTitle>Join Your School</CardTitle>
        <p className="text-sm text-text-secondary">
          Enter your school&apos;s invite code to see your school leaderboard and compete with
          classmates.
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="e.g., LPK-A1B2C3"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="flex-1"
          />
          <Button onClick={handleJoin} loading={loading}>
            Join
          </Button>
        </div>
        {error && <p className="text-sm text-accent-danger">{error}</p>}
      </CardBody>
    </Card>
  );
}
