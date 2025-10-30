import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface CouponUsage {
  userId: string;
  userName: string;
  couponCode: string;
  couponName: string;
  discountPercent: number;
  status: string;
}

export function CouponUsageTable() {
  const [coupons, setCoupons] = useState<CouponUsage[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCouponUsage = async () => {
    try {
      const { data, error } = await supabase
        .from("subscriptions")
        .select(`
          user_id,
          coupon_code,
          coupon_name,
          discount_percent,
          status,
          profiles:user_id (full_name)
        `)
        .not("coupon_code", "is", null)
        .eq("status", "active");

      if (error) throw error;

      const usageData = data?.map((item: any) => ({
        userId: item.user_id,
        userName: item.profiles?.full_name || "Unknown User",
        couponCode: item.coupon_code,
        couponName: item.coupon_name || item.coupon_code,
        discountPercent: item.discount_percent || 0,
        status: item.status,
      })) || [];

      setCoupons(usageData);
    } catch (error) {
      console.error("Error fetching coupon usage:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCouponUsage();

    const channel = supabase
      .channel("coupon-usage-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "subscriptions",
        },
        () => {
          fetchCouponUsage();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  if (coupons.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No active coupon usage found.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>User</TableHead>
          <TableHead>Coupon Code</TableHead>
          <TableHead>Coupon Name</TableHead>
          <TableHead>Discount</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {coupons.map((coupon) => (
          <TableRow key={coupon.userId}>
            <TableCell className="font-medium">{coupon.userName}</TableCell>
            <TableCell>
              <code className="px-2 py-1 bg-muted rounded text-sm">
                {coupon.couponCode}
              </code>
            </TableCell>
            <TableCell>{coupon.couponName}</TableCell>
            <TableCell>
              <Badge variant="secondary">{coupon.discountPercent}% off</Badge>
            </TableCell>
            <TableCell>
              <Badge variant={coupon.status === "active" ? "default" : "secondary"}>
                {coupon.status}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
