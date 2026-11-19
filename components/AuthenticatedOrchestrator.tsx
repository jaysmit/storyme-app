"use client";

/**
 * AuthenticatedOrchestrator
 *
 * Wrapper that only renders the GenerationOrchestrator for authenticated users.
 * Checks authentication state before rendering to avoid unnecessary API calls.
 */

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { GenerationOrchestrator } from "./GenerationOrchestrator";

export function AuthenticatedOrchestrator() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    // Check initial auth state
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Don't render anything while loading or if not authenticated
  if (isLoading || !isAuthenticated) {
    return null;
  }

  return <GenerationOrchestrator />;
}
