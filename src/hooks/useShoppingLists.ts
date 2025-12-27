import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  checked: boolean;
  source?: string;
}

export interface ShoppingList {
  id: string;
  name: string;
  items: ShoppingItem[];
  is_active: boolean;
  date_range_start?: string;
  date_range_end?: string;
  created_at: string;
}

const CATEGORIES = ['Produce', 'Dairy', 'Protein', 'Grains', 'Pantry', 'Frozen', 'Beverages', 'Other'];

function categorizeItem(name: string): string {
  const lowerName = name.toLowerCase();
  
  const categoryMap: Record<string, string[]> = {
    'Produce': ['apple', 'banana', 'lettuce', 'tomato', 'onion', 'garlic', 'pepper', 'carrot', 'celery', 'broccoli', 'spinach', 'kale', 'avocado', 'lemon', 'lime', 'orange', 'berry', 'fruit', 'vegetable'],
    'Dairy': ['milk', 'cheese', 'yogurt', 'butter', 'cream', 'egg'],
    'Protein': ['chicken', 'beef', 'pork', 'fish', 'salmon', 'tuna', 'shrimp', 'turkey', 'bacon', 'sausage', 'tofu'],
    'Grains': ['bread', 'rice', 'pasta', 'oat', 'cereal', 'flour', 'tortilla', 'quinoa'],
    'Pantry': ['oil', 'vinegar', 'sauce', 'spice', 'salt', 'pepper', 'sugar', 'honey', 'syrup', 'can', 'bean'],
    'Frozen': ['frozen', 'ice cream'],
    'Beverages': ['water', 'juice', 'coffee', 'tea', 'soda', 'drink'],
  };

  for (const [category, keywords] of Object.entries(categoryMap)) {
    if (keywords.some(keyword => lowerName.includes(keyword))) {
      return category;
    }
  }
  
  return 'Other';
}

export function useShoppingLists() {
  const { user } = useAuth();
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [activeList, setActiveList] = useState<ShoppingList | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLists = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('shopping_lists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const parsedLists = (data || []).map(list => ({
        ...list,
        items: Array.isArray(list.items) ? list.items : []
      }));

      setLists(parsedLists);
      
      // Set active list
      const active = parsedLists.find(l => l.is_active);
      setActiveList(active || parsedLists[0] || null);
    } catch (error) {
      console.error('Error fetching shopping lists:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchLists();
  }, [fetchLists]);

  const createList = async (name: string, dateRangeStart?: string, dateRangeEnd?: string) => {
    if (!user) return null;

    try {
      // Set all other lists to inactive
      await supabase
        .from('shopping_lists')
        .update({ is_active: false })
        .eq('user_id', user.id);

      const { data, error } = await supabase
        .from('shopping_lists')
        .insert({
          user_id: user.id,
          name,
          is_active: true,
          date_range_start: dateRangeStart,
          date_range_end: dateRangeEnd,
          items: [],
        })
        .select()
        .single();

      if (error) throw error;

      await fetchLists();
      toast.success('Shopping list created');
      return data;
    } catch (error) {
      console.error('Error creating list:', error);
      toast.error('Failed to create list');
      return null;
    }
  };

  const generateFromMealPlan = async (startDate: string, endDate: string) => {
    if (!user) return null;

    try {
      // Fetch meal plans for the date range
      const { data: meals, error: mealsError } = await supabase
        .from('vault_meal_plans')
        .select('*')
        .eq('user_id', user.id)
        .gte('planned_date', startDate)
        .lte('planned_date', endDate);

      if (mealsError) throw mealsError;

      // Aggregate ingredients
      const ingredientMap = new Map<string, ShoppingItem>();

      (meals || []).forEach(meal => {
        const foodItems = Array.isArray(meal.food_items) ? meal.food_items : [];
        foodItems.forEach((item: any) => {
          const key = `${item.name?.toLowerCase()}_${item.unit || 'unit'}`;
          const existing = ingredientMap.get(key);
          
          if (existing) {
            existing.quantity += item.quantity || 1;
          } else {
            ingredientMap.set(key, {
              id: crypto.randomUUID(),
              name: item.name || 'Unknown',
              quantity: item.quantity || 1,
              unit: item.unit || 'unit',
              category: categorizeItem(item.name || ''),
              checked: false,
              source: 'meal_plan',
            });
          }
        });
      });

      const items = Array.from(ingredientMap.values())
        .sort((a, b) => a.category.localeCompare(b.category));

      // Create the list
      const list = await createList(
        `Groceries ${startDate} - ${endDate}`,
        startDate,
        endDate
      );

      if (list) {
        await updateListItems(list.id, items);
      }

      return list;
    } catch (error) {
      console.error('Error generating list:', error);
      toast.error('Failed to generate shopping list');
      return null;
    }
  };

  const updateListItems = async (listId: string, items: ShoppingItem[]) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('shopping_lists')
        .update({ items })
        .eq('id', listId)
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchLists();
      return true;
    } catch (error) {
      console.error('Error updating list items:', error);
      return false;
    }
  };

  const addItem = async (listId: string, item: Omit<ShoppingItem, 'id' | 'checked'>) => {
    const list = lists.find(l => l.id === listId);
    if (!list) return false;

    const newItem: ShoppingItem = {
      ...item,
      id: crypto.randomUUID(),
      checked: false,
      category: item.category || categorizeItem(item.name),
    };

    return updateListItems(listId, [...list.items, newItem]);
  };

  const toggleItemChecked = async (listId: string, itemId: string) => {
    const list = lists.find(l => l.id === listId);
    if (!list) return false;

    const updatedItems = list.items.map(item =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );

    return updateListItems(listId, updatedItems);
  };

  const removeItem = async (listId: string, itemId: string) => {
    const list = lists.find(l => l.id === listId);
    if (!list) return false;

    const updatedItems = list.items.filter(item => item.id !== itemId);
    return updateListItems(listId, updatedItems);
  };

  const updateItemQuantity = async (listId: string, itemId: string, quantity: number) => {
    const list = lists.find(l => l.id === listId);
    if (!list) return false;

    const updatedItems = list.items.map(item =>
      item.id === itemId ? { ...item, quantity } : item
    );

    return updateListItems(listId, updatedItems);
  };

  const deleteList = async (listId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('shopping_lists')
        .delete()
        .eq('id', listId)
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchLists();
      toast.success('Shopping list deleted');
      return true;
    } catch (error) {
      console.error('Error deleting list:', error);
      toast.error('Failed to delete list');
      return false;
    }
  };

  const setListActive = async (listId: string) => {
    if (!user) return false;

    try {
      // Set all to inactive
      await supabase
        .from('shopping_lists')
        .update({ is_active: false })
        .eq('user_id', user.id);

      // Set selected to active
      const { error } = await supabase
        .from('shopping_lists')
        .update({ is_active: true })
        .eq('id', listId)
        .eq('user_id', user.id);

      if (error) throw error;

      await fetchLists();
      return true;
    } catch (error) {
      console.error('Error setting active list:', error);
      return false;
    }
  };

  const getItemsByCategory = (list: ShoppingList) => {
    const byCategory: Record<string, ShoppingItem[]> = {};
    
    CATEGORIES.forEach(cat => {
      byCategory[cat] = [];
    });

    list.items.forEach(item => {
      const category = item.category || 'Other';
      if (!byCategory[category]) {
        byCategory[category] = [];
      }
      byCategory[category].push(item);
    });

    return Object.entries(byCategory)
      .filter(([_, items]) => items.length > 0)
      .sort(([a], [b]) => CATEGORIES.indexOf(a) - CATEGORIES.indexOf(b));
  };

  return {
    lists,
    activeList,
    loading,
    createList,
    generateFromMealPlan,
    addItem,
    toggleItemChecked,
    removeItem,
    updateItemQuantity,
    deleteList,
    setListActive,
    getItemsByCategory,
    refresh: fetchLists,
  };
}
