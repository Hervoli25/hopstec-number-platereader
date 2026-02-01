import { useEffect, useCallback } from "react";
import { queryClient } from "@/lib/queryClient";

type SSEEventHandler = (data: any) => void;

export function useSSE(onEvent?: SSEEventHandler) {
  useEffect(() => {
    const eventSource = new EventSource("/api/stream", { withCredentials: true });

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        // Automatically invalidate relevant queries based on event type
        switch (data.type) {
          case "wash_created":
          case "wash_status_update":
            queryClient.invalidateQueries({ queryKey: ["/api/wash-jobs"] });
            queryClient.invalidateQueries({ queryKey: ["/api/queue/stats"] });
            break;
          case "parking_entry":
          case "parking_exit":
            queryClient.invalidateQueries({ queryKey: ["/api/parking"] });
            queryClient.invalidateQueries({ queryKey: ["/api/queue/stats"] });
            break;
        }

        // Call custom handler if provided
        if (onEvent) {
          onEvent(data);
        }
      } catch (err) {
        console.error("SSE parse error:", err);
      }
    };

    eventSource.onerror = (error) => {
      console.error("SSE error:", error);
    };

    return () => {
      eventSource.close();
    };
  }, [onEvent]);
}
