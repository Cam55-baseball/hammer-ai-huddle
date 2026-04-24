import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface FunctionHealthRow {
  function_name: string;
  total_runs: number;
  success_count: number;
  fail_count: number;
  timeout_count: number;
  success_rate: number; // 0..100
  avg_duration_ms: number | null;
  last_error_at: string | null;
  last_error_message: string | null;
}

interface State {
  rows: FunctionHealthRow[];
  loading: boolean;
}

export function useFunctionHealth(): State {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const since = new Date(Date.now() - 86400000).toISOString();

    const load = async () => {
      const { data, error } = await supabase
        .from("engine_function_logs")
        .select("function_name,status,duration_ms,error_message,created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(5000);
      if (!mounted) return;
      if (error) {
        // graceful fail — empty state
        setLogs([]);
      } else {
        setLogs(data ?? []);
      }
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel("engine_function_logs_health")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "engine_function_logs" },
        (payload: any) => {
          setLogs(prev => [payload.new, ...prev].slice(0, 5000));
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const rows = useMemo<FunctionHealthRow[]>(() => {
    const byFn = new Map<string, FunctionHealthRow>();
    for (const r of logs) {
      const cur = byFn.get(r.function_name) ?? {
        function_name: r.function_name,
        total_runs: 0, success_count: 0, fail_count: 0, timeout_count: 0,
        success_rate: 0, avg_duration_ms: null,
        last_error_at: null, last_error_message: null,
      };
      cur.total_runs += 1;
      if (r.status === "success") cur.success_count += 1;
      else if (r.status === "fail") cur.fail_count += 1;
      else if (r.status === "timeout") cur.timeout_count += 1;
      // duration accumulator stored on the row temporarily
      const accKey = "_durSum" as any;
      const cntKey = "_durCount" as any;
      (cur as any)[accKey] = ((cur as any)[accKey] ?? 0) + (r.duration_ms ?? 0);
      (cur as any)[cntKey] = ((cur as any)[cntKey] ?? 0) + (r.duration_ms != null ? 1 : 0);
      if ((r.status === "fail" || r.status === "timeout") && r.error_message) {
        if (!cur.last_error_at || new Date(r.created_at) > new Date(cur.last_error_at)) {
          cur.last_error_at = r.created_at;
          cur.last_error_message = r.error_message;
        }
      }
      byFn.set(r.function_name, cur);
    }
    const out = Array.from(byFn.values()).map(r => {
      const durCount = (r as any)._durCount ?? 0;
      const durSum = (r as any)._durSum ?? 0;
      r.avg_duration_ms = durCount > 0 ? Math.round(durSum / durCount) : null;
      r.success_rate = r.total_runs > 0 ? +(r.success_count * 100 / r.total_runs).toFixed(1) : 0;
      delete (r as any)._durCount;
      delete (r as any)._durSum;
      return r;
    });
    // sort worst first
    out.sort((a, b) => a.success_rate - b.success_rate);
    return out;
  }, [logs]);

  return { rows, loading };
}
