import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { History, Trash2, Edit2, Check, X } from 'lucide-react';
import { WeightEntry } from '@/hooks/useWeightTracking';
import { format, parseISO } from 'date-fns';

interface WeightHistoryTableProps {
  entries: WeightEntry[];
  onUpdate: (id: string, updates: Partial<Pick<WeightEntry, 'weight_lbs' | 'body_fat_percent' | 'notes'>>) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  loading?: boolean;
}

export function WeightHistoryTable({ entries, onUpdate, onDelete, loading }: WeightHistoryTableProps) {
  const { t } = useTranslation();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editWeight, setEditWeight] = useState('');
  const [editBodyFat, setEditBodyFat] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const startEditing = (entry: WeightEntry) => {
    setEditingId(entry.id);
    setEditWeight(entry.weight_lbs.toString());
    setEditBodyFat(entry.body_fat_percent?.toString() || '');
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditWeight('');
    setEditBodyFat('');
  };

  const saveEdit = async (id: string) => {
    await onUpdate(id, {
      weight_lbs: parseFloat(editWeight),
      body_fat_percent: editBodyFat ? parseFloat(editBodyFat) : null,
    });
    cancelEditing();
  };

  const confirmDelete = async () => {
    if (deleteId) {
      await onDelete(deleteId);
      setDeleteId(null);
    }
  };

  // Calculate change from previous entry
  const getChange = (index: number): number | null => {
    if (index >= entries.length - 1) return null;
    return entries[index].weight_lbs - entries[index + 1].weight_lbs;
  };

  if (entries.length === 0) {
    return null;
  }

  return (
    <>
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4 text-primary" />
            {t('nutrition.weight.history', 'Weight History')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('nutrition.weight.date', 'Date')}</TableHead>
                  <TableHead className="text-right">{t('nutrition.weight.weight', 'Weight')}</TableHead>
                  <TableHead className="text-right">{t('nutrition.weight.change', 'Change')}</TableHead>
                  <TableHead className="text-right">{t('nutrition.weight.bodyFat', 'Body Fat')}</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.slice(0, 10).map((entry, index) => {
                  const change = getChange(index);
                  const isEditing = editingId === entry.id;

                  return (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">
                        {format(parseISO(entry.entry_date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        {isEditing ? (
                          <Input
                            type="number"
                            step="0.1"
                            value={editWeight}
                            onChange={(e) => setEditWeight(e.target.value)}
                            className="w-20 h-7 text-right"
                          />
                        ) : (
                          `${entry.weight_lbs} lbs`
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {change !== null && (
                          <span className={change >= 0 ? 'text-green-500' : 'text-red-500'}>
                            {change >= 0 ? '+' : ''}{change.toFixed(1)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isEditing ? (
                          <Input
                            type="number"
                            step="0.1"
                            value={editBodyFat}
                            onChange={(e) => setEditBodyFat(e.target.value)}
                            className="w-16 h-7 text-right"
                            placeholder="-"
                          />
                        ) : (
                          entry.body_fat_percent ? `${entry.body_fat_percent}%` : '-'
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          {isEditing ? (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => saveEdit(entry.id)}
                              >
                                <Check className="h-3.5 w-3.5 text-green-500" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={cancelEditing}
                              >
                                <X className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => startEditing(entry)}
                                disabled={loading}
                              >
                                <Edit2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:text-destructive"
                                onClick={() => setDeleteId(entry.id)}
                                disabled={loading}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          
          {entries.length > 10 && (
            <div className="text-center py-3 text-sm text-muted-foreground border-t">
              {t('nutrition.weight.showingRecent', 'Showing 10 most recent of {{total}} entries', { total: entries.length })}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('nutrition.weight.deleteEntry', 'Delete Entry?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('nutrition.weight.deleteConfirm', 'This action cannot be undone. This will permanently delete this weight entry.')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.delete', 'Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
