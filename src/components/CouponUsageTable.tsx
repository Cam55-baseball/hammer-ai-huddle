import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, ChevronRight } from "lucide-react";
import { EditableCell } from "@/components/EditableCell";
import { useToast } from "@/hooks/use-toast";

interface CouponUser {
  userId: string;
  userName: string;
  discountPercent: number;
  status: string;
}

interface CouponUsageExtended {
  couponCode: string;
  stripeCustomName: string;
  customName: string | null;
  description: string | null;
  isAmbassador: boolean;
  notes: string | null;
  usageCount: number;
  users: CouponUser[];
}

export function CouponUsageTable() {
  const [coupons, setCoupons] = useState<CouponUsageExtended[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchCouponData = async () => {
    try {
      // Get all active subscriptions with coupons
      const { data: subscriptions, error: subError } = await supabase
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

      if (subError) throw subError;

      // Get all coupon metadata
      const { data: metadata, error: metaError } = await supabase
        .from("coupon_metadata")
        .select("*");

      if (metaError) throw metaError;

      // Group by coupon code and merge with metadata
      const couponMap = new Map<string, CouponUsageExtended>();
      
      subscriptions?.forEach((sub: any) => {
        const code = sub.coupon_code;
        if (!couponMap.has(code)) {
          const meta = metadata?.find((m: any) => m.coupon_code === code);
          couponMap.set(code, {
            couponCode: code,
            stripeCustomName: sub.coupon_name || code,
            customName: meta?.custom_name || null,
            description: meta?.description || null,
            isAmbassador: meta?.is_ambassador || false,
            notes: meta?.notes || null,
            usageCount: 0,
            users: []
          });
        }
        
        const coupon = couponMap.get(code)!;
        coupon.usageCount++;
        coupon.users.push({
          userId: sub.user_id,
          userName: sub.profiles?.full_name || "Unknown User",
          discountPercent: sub.discount_percent || 0,
          status: sub.status
        });
      });

      setCoupons(Array.from(couponMap.values()));
    } catch (error) {
      console.error("Error fetching coupon data:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateMetadata = async (couponCode: string, field: string, value: any) => {
    const { error } = await supabase
      .from("coupon_metadata")
      .upsert({
        coupon_code: couponCode,
        [field]: value,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'coupon_code'
      });

    if (error) {
      toast({ 
        title: "Error", 
        description: error.message, 
        variant: "destructive" 
      });
    } else {
      toast({ 
        title: "Success", 
        description: "Coupon metadata updated" 
      });
      fetchCouponData();
    }
  };

  const toggleExpanded = (couponCode: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(couponCode)) {
        newSet.delete(couponCode);
      } else {
        newSet.add(couponCode);
      }
      return newSet;
    });
  };

  useEffect(() => {
    fetchCouponData();

    const subChannel = supabase
      .channel("coupon-data-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "subscriptions" }, fetchCouponData)
      .on("postgres_changes", { event: "*", schema: "public", table: "coupon_metadata" }, fetchCouponData)
      .subscribe();

    return () => { 
      supabase.removeChannel(subChannel); 
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
          <TableHead className="w-[50px]"></TableHead>
          <TableHead>Coupon Code</TableHead>
          <TableHead>Custom Name</TableHead>
          <TableHead>Description</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Usage</TableHead>
          <TableHead>Discount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {coupons.map((coupon) => (
          <React.Fragment key={coupon.couponCode}>
            <TableRow className="hover:bg-muted/50">
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleExpanded(coupon.couponCode)}
                >
                  {expandedRows.has(coupon.couponCode) ? 
                    <ChevronDown className="h-4 w-4" /> : 
                    <ChevronRight className="h-4 w-4" />
                  }
                </Button>
              </TableCell>
              <TableCell>
                <code className="px-2 py-1 bg-muted rounded text-sm font-mono">
                  {coupon.couponCode}
                </code>
              </TableCell>
              <TableCell>
                <EditableCell
                  value={coupon.customName || coupon.stripeCustomName}
                  onSave={(value) => updateMetadata(coupon.couponCode, 'custom_name', value)}
                  placeholder="Add custom name..."
                />
              </TableCell>
              <TableCell>
                <EditableCell
                  value={coupon.description}
                  onSave={(value) => updateMetadata(coupon.couponCode, 'description', value)}
                  placeholder="Add description..."
                />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={coupon.isAmbassador}
                    onCheckedChange={(checked) => 
                      updateMetadata(coupon.couponCode, 'is_ambassador', checked)
                    }
                  />
                  {coupon.isAmbassador && (
                    <Badge variant="secondary">Ambassador</Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{coupon.usageCount} users</Badge>
              </TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {coupon.users[0]?.discountPercent}% off
                </Badge>
              </TableCell>
            </TableRow>
            {expandedRows.has(coupon.couponCode) && (
              <TableRow>
                <TableCell colSpan={7} className="bg-muted/30">
                  <div className="py-4 px-8">
                    <h4 className="font-semibold mb-3">Users with this coupon:</h4>
                    <div className="space-y-2">
                      {coupon.users.map((user) => (
                        <div key={user.userId} className="flex items-center justify-between py-2 px-4 bg-background rounded border">
                          <span className="font-medium">{user.userName}</span>
                          <div className="flex gap-2">
                            <Badge variant="secondary">{user.discountPercent}% off</Badge>
                            <Badge variant={user.status === "active" ? "default" : "secondary"}>
                              {user.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </React.Fragment>
        ))}
      </TableBody>
    </Table>
  );
}
