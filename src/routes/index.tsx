import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { RenalLogo } from "@/components/RenalLogo";

export const Route = createFileRoute("/")({
  component: Index,
  ssr: false,
});

function Index() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/auth" });
    else if (role === "nurse") navigate({ to: "/nurse" });
    else if (role === "patient") navigate({ to: "/patient" });
    else navigate({ to: "/auth" });
  }, [user, role, loading, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <RenalLogo />
    </div>
  );
}
