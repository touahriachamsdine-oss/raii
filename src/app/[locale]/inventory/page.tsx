
'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { 
  Table, 
  TableHeader, 
  TableBody, 
  TableRow, 
  TableHead, 
  TableCell 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter, 
  DialogClose 
} from '@/components/ui/dialog';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Edit, Loader2, AlertTriangle, Trash2 } from 'lucide-react';
import { useUser, useMemoFirebase, useDoc } from '@/lib/neon-client';
import { getFeedInventory, updateFeedInventory, deleteFeedInventory } from '@/lib/actions/farm-os';
import { FeedInventory } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { format, parseISO, isValid } from 'date-fns';
import { Badge } from '@/components/ui/badge';

export default function InventoryPage() {
  const t = useTranslations();
  const { toast } = useToast();
  const { user } = useUser();
  
  const [inventory, setInventory] = React.useState<FeedInventory[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<Partial<FeedInventory> | null>(null);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [showLowStockOnly, setShowLowStockOnly] = React.useState(false);

  const userProfileRef = useMemoFirebase(() => (user ? { collection: 'users', id: user.uid } : null), [user]);
  const { data: userProfile } = useDoc<{ farmIds: string[] }>(userProfileRef);
  const farmId = userProfile?.farmIds?.[0];

  const refreshInventory = React.useCallback(async () => {
    if (farmId) {
      setIsLoading(true);
      const data = await getFeedInventory(farmId);
      setInventory(data);
      setIsLoading(false);
    }
  }, [farmId]);

  const filteredInventory = React.useMemo(() => {
    return inventory.filter(item => {
      const matchesSearch = item.feedType.toLowerCase().includes(searchQuery.toLowerCase());
      const isLowStock = item.reorderLevel !== undefined && item.currentQuantity <= (item.reorderLevel ?? 0);
      const matchesLowStock = !showLowStockOnly || isLowStock;
      return matchesSearch && matchesLowStock;
    });
  }, [inventory, searchQuery, showLowStockOnly]);

  React.useEffect(() => {
    refreshInventory();
  }, [refreshInventory]);

  const handleOpenAdd = () => {
    setEditingItem({ farmId, feedType: '', currentQuantity: 0, unit: 'kg', reorderLevel: 0 });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (item: FeedInventory) => {
    setEditingItem(item);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    
    try {
      await deleteFeedInventory(id);
      toast({ title: "Deleted", description: "Item removed from inventory." });
      await refreshInventory();
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to delete item." });
    }
  };

  const handleSubmit = async () => {
    if (!editingItem || !farmId) return;
    
    setIsSubmitting(true);
    try {
      await updateFeedInventory(editingItem);
      toast({ title: "Success", description: "Inventory updated successfully." });
      await refreshInventory();
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Failed to update inventory:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to update inventory." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDisplayDate = (dateString?: string | Date) => {
    if (!dateString) return '-';
    try {
      const date = typeof dateString === 'string' ? parseISO(dateString) : dateString;
      return isValid(date) ? format(date, 'MMM d, yyyy') : '-';
    } catch {
      return '-';
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Feed Inventory</h1>
          <p className="text-muted-foreground">Manage your farm's feed and supplies.</p>
        </div>
        <Button onClick={handleOpenAdd}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add Feed Item
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cursor-pointer transition-colors hover:bg-muted/50" onClick={() => { setSearchQuery(''); setShowLowStockOnly(false); }}>
          <CardHeader className="pb-2">
            <CardDescription>Total Feed Types</CardDescription>
            <CardTitle className="text-2xl">{inventory.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card 
          className={`cursor-pointer transition-colors hover:bg-muted/50 ${showLowStockOnly ? 'ring-2 ring-red-500' : ''}`}
          onClick={() => setShowLowStockOnly(!showLowStockOnly)}
        >
          <CardHeader className="pb-2">
            <CardDescription>Low Stock Items</CardDescription>
            <CardTitle className="text-2xl text-red-500">
              {inventory.filter(i => i.reorderLevel && i.currentQuantity <= i.reorderLevel).length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>System Status</CardDescription>
            <CardTitle className="text-2xl text-green-500">Operational</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Input 
            placeholder="Search feed items..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>
        {showLowStockOnly && (
          <Button variant="outline" size="sm" onClick={() => setShowLowStockOnly(false)} className="text-red-500 border-red-500 hover:bg-red-50">
            Clear Filter
          </Button>
        )}
      </div>

      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Feed Type</TableHead>
              <TableHead>Current Quantity</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Reorder Level</TableHead>
              <TableHead>Last Restock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={7}><Skeleton className="h-6 w-full" /></TableCell>
                </TableRow>
              ))
            ) : filteredInventory.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  {searchQuery || showLowStockOnly ? 'No matching items found.' : 'No inventory items found.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredInventory.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.feedType}</TableCell>
                  <TableCell>{item.currentQuantity}</TableCell>
                  <TableCell>{item.unit}</TableCell>
                  <TableCell>{item.reorderLevel || '-'}</TableCell>
                  <TableCell>{formatDisplayDate(item.lastRestockDate)}</TableCell>
                  <TableCell>
                    {item.reorderLevel && item.currentQuantity <= item.reorderLevel ? (
                      <Badge variant="destructive" className="flex w-fit gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Low Stock
                      </Badge>
                    ) : (
                      <Badge variant="default" className="bg-green-500 hover:bg-green-600">In Stock</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(item)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Update
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{editingItem?.id ? 'Update Inventory' : 'Add Feed Item'}</DialogTitle>
            <DialogDescription>
              {editingItem?.id 
                ? 'Update the quantity and restock date for this item.' 
                : 'Add a new type of feed to your inventory records.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="feedType">Feed Type</Label>
              <Input 
                id="feedType" 
                value={editingItem?.feedType || ''} 
                onChange={(e) => setEditingItem(prev => ({ ...prev, feedType: e.target.value }))}
                disabled={!!editingItem?.id}
                placeholder="e.g. Alfalfa, Corn, Barley"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="quantity">Current Quantity</Label>
                <Input 
                  id="quantity" 
                  type="number" 
                  value={editingItem?.currentQuantity || 0} 
                  onChange={(e) => setEditingItem(prev => ({ ...prev, currentQuantity: Number(e.target.value) }))}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="unit">Unit</Label>
                <Input 
                  id="unit" 
                  value={editingItem?.unit || ''} 
                  onChange={(e) => setEditingItem(prev => ({ ...prev, unit: e.target.value }))}
                  disabled={!!editingItem?.id}
                  placeholder="kg, tons, etc."
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="reorderLevel">Reorder Level</Label>
              <Input 
                id="reorderLevel" 
                type="number" 
                value={editingItem?.reorderLevel || 0} 
                onChange={(e) => setEditingItem(prev => ({ ...prev, reorderLevel: Number(e.target.value) }))}
                placeholder="Alert level"
              />
            </div>
            {editingItem?.id && (
              <div className="grid gap-2">
                <Label htmlFor="restockDate">Restock Date</Label>
                <Input 
                  id="restockDate" 
                  type="date" 
                  value={editingItem?.lastRestockDate ? (typeof editingItem.lastRestockDate === 'string' ? (editingItem.lastRestockDate as string).split('T')[0] : (editingItem.lastRestockDate as any).toISOString ? (editingItem.lastRestockDate as any).toISOString().split('T')[0] : '') : ''} 
                  onChange={(e) => setEditingItem(prev => ({ ...prev, lastRestockDate: e.target.value as any }))}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingItem?.id ? 'Update Item' : 'Add Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
