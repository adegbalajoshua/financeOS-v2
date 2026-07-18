import { useState, useEffect, useRef } from "react";
import { validateUsername, normalizeUsername } from "@/domain/users/usernameValidation";

export type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid";

export interface UseDebouncedUsernameCheckResult {
  username: string;
  setUsername: (val: string) => void;
  status: UsernameStatus;
  message: string;
  isCurrent: boolean;
  normalized: string;
}

/**
 * Custom React hook managing debounced $cashtag / @handle availability checking against backend.
 * Provides instant local regex & banned-words validation before hitting the server.
 */
export function useDebouncedUsernameCheck(
  initialUsername: string = ""
): UseDebouncedUsernameCheckResult {
  const [username, setUsernameInput] = useState(initialUsername);
  const [status, setStatus] = useState<UsernameStatus>("idle");
  const [message, setMessage] = useState("");
  const [isCurrent, setIsCurrent] = useState(false);
  const [normalized, setNormalized] = useState(normalizeUsername(initialUsername));

  const initialRef = useRef(normalizeUsername(initialUsername));
  useEffect(() => {
    if (initialUsername && !initialRef.current) {
      initialRef.current = normalizeUsername(initialUsername);
      setUsernameInput(normalizeUsername(initialUsername));
      setNormalized(normalizeUsername(initialUsername));
    }
  }, [initialUsername]);

  const setUsername = (val: string) => {
    setUsernameInput(val);
  };

  useEffect(() => {
    const clean = normalizeUsername(username);
    setNormalized(clean);

    // If completely empty
    if (!clean) {
      setStatus("idle");
      setMessage("");
      setIsCurrent(false);
      return;
    }

    // If matches initial username exactly
    if (initialRef.current && clean === initialRef.current) {
      setStatus("idle");
      setMessage("This is your current $username handle.");
      setIsCurrent(true);
      return;
    }

    // Run instant client-side Zod validation first
    const v = validateUsername(username);
    if (!v.isValid) {
      setStatus("invalid");
      setMessage(v.error || "Invalid username format.");
      setIsCurrent(false);
      return;
    }

    // Set checking state and debounce API call
    setStatus("checking");
    setMessage("Checking availability...");
    setIsCurrent(false);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/users/check-username?q=${encodeURIComponent(clean)}`
        );
        const data = await res.json();

        if (res.ok && data.available) {
          setStatus("available");
          setMessage(data.reason || "Username is available!");
          setIsCurrent(Boolean(data.isCurrent));
        } else {
          setStatus("taken");
          setMessage(data.reason || "Sorry, this username is already taken.");
          setIsCurrent(false);
        }
      } catch (err) {
        setStatus("invalid");
        setMessage("Could not check username availability right now.");
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [username]);

  return {
    username,
    setUsername,
    status,
    message,
    isCurrent,
    normalized,
  };
}
