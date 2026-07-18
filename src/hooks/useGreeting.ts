"use client";

import { useState, useEffect } from "react";

export type TimeOfDay = "morning" | "afternoon" | "evening" | "night";

export interface GreetingState {
  greeting: string;
  timeOfDay: TimeOfDay;
  icon: string;
}

/**
 * SSR-safe, client-side dynamic greeting hook.
 * Calculates time-of-day greeting strictly using local browser clock (`new Date().getHours()`)
 * to prevent server/client timezone mismatch and hydration warnings.
 *
 * Rules:
 * - 05:00 - 11:59 -> "Good morning, [First Name]"
 * - 12:00 - 16:59 -> "Good afternoon, [First Name]"
 * - 17:00 - 21:59 -> "Good evening, [First Name]"
 * - 22:00 - 04:59 -> "Welcome back, [First Name]"
 */
export function useGreeting(firstName?: string | null): GreetingState {
  const [state, setState] = useState<GreetingState>({
    greeting: firstName ? `Welcome back, ${firstName}` : "Welcome back",
    timeOfDay: "night",
    icon: "✨",
  });

  useEffect(() => {
    const updateGreeting = () => {
      const hours = new Date().getHours();
      const namePart = firstName ? `, ${firstName.trim()}` : "";

      if (hours >= 5 && hours < 12) {
        setState({
          greeting: `Good morning${namePart}`,
          timeOfDay: "morning",
          icon: "☀️",
        });
      } else if (hours >= 12 && hours < 17) {
        setState({
          greeting: `Good afternoon${namePart}`,
          timeOfDay: "afternoon",
          icon: "🌤️",
        });
      } else if (hours >= 17 && hours < 22) {
        setState({
          greeting: `Good evening${namePart}`,
          timeOfDay: "evening",
          icon: "🌙",
        });
      } else {
        setState({
          greeting: `Welcome back${namePart}`,
          timeOfDay: "night",
          icon: "🌌",
        });
      }
    };

    updateGreeting();
    const interval = setInterval(updateGreeting, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [firstName]);

  return state;
}
