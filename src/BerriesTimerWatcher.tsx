import { useEffect } from "react";
import {
  BERRY_TIMER_EVENT,
  checkpointAt,
  checkpointsFor,
  readBerryTimers,
  sendBerryCheckpointNotification,
  writeBerryTimers,
} from "./berryTimers";

const SLOT_BERRIES: Record<string, string> = {
  "mepo-1": "Mépo",
  "mepo-2": "Mépo",
  "ceriz-1": "Ceriz",
  "ceriz-2": "Ceriz",
  "pecha-1": "Pécha",
  "fraive-1": "Fraive",
};

export function BerriesTimerWatcher() {
  useEffect(() => {
    let running = false;

    const checkTimers = async () => {
      if (running) return;
      running = true;
      try {
        const now = Date.now();
        const timers = readBerryTimers();
        let changed = false;

        for (const [slotId, timer] of Object.entries(timers)) {
          const due = checkpointsFor(timer.durationHours, timer.wateringMode).filter(
            (checkpoint) => checkpointAt(timer, checkpoint) <= now && !timer.notified.includes(checkpoint.key),
          );
          if (due.length === 0) continue;

          for (const checkpoint of due) {
            await sendBerryCheckpointNotification(
              SLOT_BERRIES[slotId] ?? "Baies",
              checkpoint,
            );
            timer.notified.push(checkpoint.key);
            changed = true;
          }
        }

        if (changed) writeBerryTimers(timers);
      } finally {
        running = false;
      }
    };

    void checkTimers();
    const interval = window.setInterval(() => void checkTimers(), 1000);
    const onChange = () => void checkTimers();
    const onVisibility = () => {
      if (document.visibilityState === "visible") void checkTimers();
    };
    window.addEventListener(BERRY_TIMER_EVENT, onChange);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener(BERRY_TIMER_EVENT, onChange);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return null;
}
