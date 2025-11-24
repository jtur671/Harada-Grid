import { useEffect, useState } from "react";
import { todayISO } from "../utils/date";

/**
 * Hook to keep selectedDate in sync with the current date.
 * Updates at midnight and checks periodically to handle clock drift.
 */
export const useDateSync = () => {
  const [selectedDate, setSelectedDate] = useState<string>(todayISO());

  useEffect(() => {
    const updateDateIfNeeded = () => {
      const today = todayISO();
      if (selectedDate !== today) {
        setSelectedDate(today);
      }
    };

    // Update immediately on mount
    updateDateIfNeeded();

    // Calculate time until next midnight
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const msUntilMidnight = midnight.getTime() - now.getTime();

    // Set timeout for midnight
    const midnightTimeout = setTimeout(() => {
      updateDateIfNeeded();
      // Then set up interval to check every minute (in case user's clock is slightly off)
      const interval = setInterval(updateDateIfNeeded, 60000);
      return () => clearInterval(interval);
    }, msUntilMidnight);

    // Also check periodically (every 5 minutes) in case the timeout was missed
    const periodicCheck = setInterval(updateDateIfNeeded, 5 * 60 * 1000);

    return () => {
      clearTimeout(midnightTimeout);
      clearInterval(periodicCheck);
    };
  }, [selectedDate]);

  return selectedDate;
};


