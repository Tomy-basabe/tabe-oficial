import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { baseNavItems, NavItem } from "../layout/MainLayout";
import { Button } from "@/components/ui/button";
import { 
  ChevronUp, 
  ChevronDown, 
  Plus, 
  Trash2, 
  Settings, 
  FolderPlus, 
  GripVertical,
  ChevronRight,
  ChevronLeft,
  Edit2,
  Check,
  X
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface CustomSidebarItem {
  id: string; // path or unique category id
  label: string;
  type: "item" | "category";
  items?: CustomSidebarItem[];
}

export function SidebarCustomizer() {
  const { profile, updateSidebarConfig } = useAuth();
  const [config, setConfig] = useState<CustomSidebarItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    if (profile?.sidebar_config) {
      setConfig(profile.sidebar_config);
    } else {
      // Default config based on baseNavItems
      const defaultConfig: CustomSidebarItem[] = baseNavItems.map(item => ({
        id: item.path,
        label: item.label,
        type: "item"
      }));
      setConfig(defaultConfig);
    }
  }, [profile]);

  const saveConfig = async () => {
    try {
      await updateSidebarConfig(config);
      toast.success("Configuración del panel lateral guardada");
    } catch (error) {
      toast.error("Error al guardar la configuración");
    }
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newConfig = [...config];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newConfig.length) return;
    
    [newConfig[index], newConfig[targetIndex]] = [newConfig[targetIndex], newConfig[index]];
    setConfig(newConfig);
  };

  const addCategory = () => {
    const name = prompt("Nombre de la categoría:");
    if (!name) return;
    
    const newCategory: CustomSidebarItem = {
      id: `cat-${Date.now()}`,
      label: name,
      type: "category",
      items: []
    };
    setConfig([...config, newCategory]);
  };

  const deleteItem = (index: number) => {
    const item = config[index];
    if (item.type === "category" && item.items && item.items.length > 0) {
      if (!confirm("Se eliminará la categoría y todos sus elementos internos. ¿Continuar?")) return;
    }
    const newConfig = config.filter((_, i) => i !== index);
    setConfig(newConfig);
  };

  const moveIntoCategory = (itemIndex: number, catIndex: number) => {
    const newConfig = [...config];
    const item = newConfig[itemIndex];
    const category = newConfig[catIndex];
    
    if (category.type !== "category") return;
    
    category.items = [...(category.items || []), item];
    newConfig.splice(itemIndex, 1);
    setConfig(newConfig);
  };

  const moveOutOfCategory = (catIndex: number, itemIndex: number) => {
    const newConfig = [...config];
    const category = newConfig[catIndex];
    if (!category.items) return;
    
    const item = category.items[itemIndex];
    category.items.splice(itemIndex, 1);
    newConfig.splice(catIndex + 1, 0, item);
    setConfig(newConfig);
  };

  const startEditing = (item: CustomSidebarItem) => {
    setEditingId(item.id);
    setEditValue(item.label);
  };

  const saveEdit = (item: CustomSidebarItem) => {
    const updateLabel = (items: CustomSidebarItem[]): CustomSidebarItem[] => {
      return items.map(i => {
        if (i.id === item.id) return { ...i, label: editValue };
        if (i.items) return { ...i, items: updateLabel(i.items) };
        return i;
      });
    };
    
    setConfig(updateLabel(config));
    setEditingId(null);
  };

  const resetToDefault = () => {
    if (!confirm("¿Restablecer el panel lateral a su estado original?")) return;
    const defaultConfig: CustomSidebarItem[] = baseNavItems.map(item => ({
      id: item.path,
      label: item.label,
      type: "item"
    }));
    setConfig(defaultConfig);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Personalizar Orden y Categorías</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={resetToDefault}>
            Restablecer
          </Button>
          <Button size="sm" onClick={addCategory}>
            <FolderPlus className="w-4 h-4 mr-2" /> Nueva Categoría
          </Button>
        </div>
      </div>

      <div className="space-y-3 bg-secondary/20 p-4 rounded-xl border border-border">
        {config.map((item, index) => (
          <div key={item.id} className="space-y-2">
            <div className={cn(
              "flex items-center gap-3 p-3 rounded-lg border bg-card transition-all",
              item.type === "category" ? "border-primary/50 bg-primary/5" : "border-border"
            )}>
              <div className="flex flex-col gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6" 
                  onClick={() => moveItem(index, 'up')}
                  disabled={index === 0}
                >
                  <ChevronUp className="w-4 h-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6" 
                  onClick={() => moveItem(index, 'down')}
                  disabled={index === config.length - 1}
                >
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </div>

              <div className="flex-1 flex items-center gap-2">
                {editingId === item.id ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input 
                      value={editValue} 
                      onChange={(e) => setEditValue(e.target.value)} 
                      className="h-8"
                      autoFocus
                    />
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500" onClick={() => saveEdit(item)}>
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => setEditingId(null)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <span className={cn("font-medium", item.type === "category" && "text-primary")}>
                      {item.label}
                    </span>
                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-50 hover:opacity-100" onClick={() => startEditing(item)}>
                      <Edit2 className="w-3 h-3" />
                    </Button>
                  </>
                )}
              </div>

              <div className="flex items-center gap-1">
                {item.type === "item" && index > 0 && config[index-1].type === "category" && (
                  <Button variant="ghost" size="sm" onClick={() => moveIntoCategory(index, index - 1)} title="Meters en categoría arriba">
                    <ChevronLeft className="w-4 h-4 mr-1" /> Agrupar
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => deleteItem(index)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Nested items for categories */}
            {item.type === "category" && item.items && (
              <div className="ml-12 space-y-2 border-l-2 border-primary/20 pl-4 py-1">
                {item.items.length === 0 && (
                  <p className="text-xs text-muted-foreground italic py-2">Categoría vacía</p>
                )}
                {item.items.map((subItem, subIndex) => (
                  <div key={subItem.id} className="flex items-center gap-3 p-2 rounded-lg border border-border bg-card/50">
                    <div className="flex-1 flex items-center gap-2">
                      {editingId === subItem.id ? (
                        <div className="flex items-center gap-2 flex-1">
                          <Input 
                            value={editValue} 
                            onChange={(e) => setEditValue(e.target.value)} 
                            className="h-8"
                            autoFocus
                          />
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500" onClick={() => saveEdit(subItem)}>
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-red-500" onClick={() => setEditingId(null)}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <span className="text-sm">{subItem.label}</span>
                          <Button variant="ghost" size="icon" className="h-5 h-5 opacity-50 hover:opacity-100" onClick={() => startEditing(subItem)}>
                            <Edit2 className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                    </div>
                    <Button variant="ghost" size="sm" className="h-8" onClick={() => moveOutOfCategory(index, subIndex)}>
                      <ChevronRight className="w-4 h-4 mr-1" /> Sacar
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={saveConfig} className="bg-primary text-primary-foreground shadow-lg shadow-primary/20">
          Guardar Cambios
        </Button>
      </div>
    </div>
  );
}
