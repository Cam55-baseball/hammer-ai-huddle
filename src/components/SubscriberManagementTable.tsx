import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, UserX } from "lucide-react";
import { CancelSubscriptionDialog } from "./CancelSubscriptionDialog";
import { DeleteUserDialog } from "./DeleteUserDialog";
import { useTranslation } from "react-i18next";

interface ModuleMapping {
  [key: string]: {
    subscription_id: string;
    status: string;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
    price_id: string;
    canceled_at: string | null;
  };
}

interface Subscriber {
  id: string;
  full_name: string;
  email: string;
  stripe_customer_id: string | null;
  status: string;
  subscribed_modules: string[];
  module_subscription_mapping: ModuleMapping;
  current_period_end: string | null;
}

interface SubscriberManagementTableProps {
  subscribers: Subscriber[];
  onRefresh: () => void;
  sportFilter: "all" | "baseball" | "softball";
}

export function SubscriberManagementTable({ 
  subscribers, 
  onRefresh,
  sportFilter 
}: SubscriberManagementTableProps) {
  const { t } = useTranslation();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Subscriber | null>(null);

  const getModuleDisplay = (modules: string[], mapping: ModuleMapping) => {
    if (!modules || modules.length === 0) return null;

    return modules.map((module) => {
      const [sport, moduleName] = module.includes("_") 
        ? module.split("_") 
        : ["baseball", module];
      
      const moduleInfo = mapping[module];
      const renewalDate = moduleInfo?.current_period_end 
        ? new Date(moduleInfo.current_period_end).toLocaleDateString()
        : null;

      const isSoftball = sport.toLowerCase() === "softball";
      
      return (
        <div key={module} className="flex flex-col gap-1 mb-2">
          <div className="flex items-center gap-2">
            <Badge 
              variant={isSoftball ? "secondary" : "default"}
              className={isSoftball ? "bg-pink-500 text-white" : "bg-blue-500 text-white"}
            >
              {sport.charAt(0).toUpperCase() + sport.slice(1)}
            </Badge>
            <span className="text-sm font-medium capitalize">
              {moduleName}
            </span>
          </div>
          {renewalDate && (
            <span className="text-xs text-muted-foreground">
              {t('subscriberTable.renews', { date: renewalDate })}
            </span>
          )}
        </div>
      );
    });
  };

  const getEarliestRenewal = (mapping: ModuleMapping) => {
    const dates = Object.values(mapping)
      .map(m => m.current_period_end)
      .filter((date): date is string => date !== null)
      .map(date => new Date(date).getTime());
    
    if (dates.length === 0) return t('subscriberTable.noRenewal');
    
    const earliest = Math.min(...dates);
    return new Date(earliest).toLocaleDateString();
  };

  const getStatusBadge = (status: string, mapping: ModuleMapping) => {
    const hasPendingCancellation = Object.values(mapping).some(
      m => m.cancel_at_period_end
    );

    if (hasPendingCancellation) {
      return <Badge variant="destructive">{t('subscriberTable.canceling')}</Badge>;
    }

    switch (status) {
      case "active":
        return <Badge variant="default" className="bg-green-500">{t('subscriberTable.active')}</Badge>;
      case "canceled":
        return <Badge variant="secondary">{t('subscriberTable.canceled')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Filter subscribers by sport
  const filteredSubscribers = subscribers.filter(sub => {
    if (sportFilter === "all") return true;
    return sub.subscribed_modules.some(module => 
      module.toLowerCase().startsWith(sportFilter)
    );
  });

  const handleCancelClick = (user: Subscriber) => {
    setSelectedUser(user);
    setCancelDialogOpen(true);
  };

  const handleDeleteClick = (user: Subscriber) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  if (filteredSubscribers.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t('subscriberTable.noSubscribers')}
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('subscriberTable.name')}</TableHead>
              <TableHead>{t('subscriberTable.email')}</TableHead>
              <TableHead>{t('subscriberTable.activeModules')}</TableHead>
              <TableHead>{t('subscriberTable.nextRenewal')}</TableHead>
              <TableHead>{t('subscriberTable.status')}</TableHead>
              <TableHead className="text-right">{t('subscriberTable.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSubscribers.map((subscriber) => (
              <TableRow key={subscriber.id}>
                <TableCell className="font-medium">{subscriber.full_name}</TableCell>
                <TableCell>{subscriber.email}</TableCell>
                <TableCell>
                  {subscriber.subscribed_modules.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {getModuleDisplay(subscriber.subscribed_modules, subscriber.module_subscription_mapping)}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">{t('subscriberTable.noModules')}</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-sm">
                    {getEarliestRenewal(subscriber.module_subscription_mapping)}
                  </span>
                </TableCell>
                <TableCell>
                  {getStatusBadge(subscriber.status, subscriber.module_subscription_mapping)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCancelClick(subscriber)}
                      disabled={subscriber.status !== "active"}
                    >
                      <UserX className="h-4 w-4 mr-1" />
                      {t('subscriberTable.cancel')}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteClick(subscriber)}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      {t('subscriberTable.delete')}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {selectedUser && (
        <>
          <CancelSubscriptionDialog
            open={cancelDialogOpen}
            onOpenChange={setCancelDialogOpen}
            user={selectedUser}
            onSuccess={onRefresh}
          />
          <DeleteUserDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            user={selectedUser}
            onSuccess={onRefresh}
          />
        </>
      )}
    </>
  );
}
