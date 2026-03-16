import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { baseNavItems } from "../layout/MainLayout";
import { Button } from "@/components/ui/button";
import { 
  ChevronUp, 
  ChevronDown, 
  Plus, 
  Trash2, 
  Settings, 
  FolderPlus, 
  ChevronRight,
  ChevronLeft,
  Edit2,
  Check,
  X,
  Search,
  Shield, // Added Shield icon
  // Icon Catalog
  GraduationCap, LayoutDashboard, Clock, FileText, Layers, ClipboardList, Store, Library, Calendar,
  Trophy, Brain, Target, Lightbulb, Rocket, Book, PenTool, Microscope, FlaskConical, Calculator,
  Music, Video, Camera, MessageSquare, Users, Bell, Heart, Star, Flame, Zap,
  Sword, Gamepad2, Monitor, Laptop, Coffee, Send, Hash, Folder, CheckCircle2,
  LucideIcon
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { NotionIcon } from "@/components/icons/NotionIcon";
import { ScrollArea as UIScrollArea } from "@/components/ui/scroll-area";

// Navigation Mapping
const ALL_AVAILABLE_ITEMS = [
  ...baseNavItems,
  { icon: Shield, label: "Admin", path: "/admin" }
];

export interface CustomSidebarItem {
  id: string; // Unique instance ID
  label: string;
  type: "item" | "category";
  path?: string; // Navigation path for items
  iconName?: string; // Lucide icon name string
  items?: CustomSidebarItem[];
}

export const ICON_MAP: Record<string, any> = {
  GraduationCap, LayoutDashboard, Clock, FileText, Layers, ClipboardList, Store, Library, Calendar,
  Trophy, Brain, Target, Lightbulb, Rocket, Book, PenTool, Microscope, FlaskConical, Calculator,
  Music, Video, Camera, MessageSquare, Users, Bell, Search, Settings, Heart, Star, Flame, Zap,
  Sword, Gamepad2, Monitor, Laptop, Coffee, Send, Hash, Folder, CheckCircle2,
  NotionIcon, Shield // Added Shield to ICON_MAP
};

const ICON_NAMES = Object.keys(ICON_MAP);

const DEFAULT_ICON_MAPPING: Record<string, string> = {
  "/dashboard": "LayoutDashboard",
  "/carrera": "GraduationCap",
  "/consultas": "Clock",
  "/notion": "NotionIcon",
  "/flashcards": "Layers",
  "/cuestionarios": "ClipboardList",
  "/marketplace": "Store",
  "/biblioteca": "Library",
  "/calendario": "Calendar",
  "/admin": "Settings",
  "/configuracion": "Settings" // Added new mapping
};

export function SidebarCustomizer() {
  const { profile, updateSidebarConfig } = useAuth();
  const [config, setConfig] = useState<CustomSidebarItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [showIconPicker, setShowIconPicker] = useState<string | null>(null);
  const [showAddItemToId, setShowAddItemToId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const sanitizeItems = (items: any[]): CustomSidebarItem[] => {
      return items.map(item => {
        let newItem = { ...item };
        
        // Ensure every item has a unique id and path
        if (!newItem.id) newItem.id = `item-${Date.now()}-${Math.random()}`;
        
        if (newItem.type === "item") {
          // If path is missing, use id (legacy support where id was the path)
          if (!newItem.path) newItem.path = newItem.id;
          
          // Fix missing or generic icons for default paths
          if (!newItem.iconName || newItem.iconName === "FileText") {
            newItem.iconName = DEFAULT_ICON_MAPPING[newItem.path] || "FileText";
          }
        }
        
        if (newItem.items) {
          newItem.items = sanitizeItems(newItem.items);
        }
        
        return newItem as CustomSidebarItem;
      });
    };

    if (profile?.sidebar_config) {
      setConfig(sanitizeItems(profile.sidebar_config));
    } else {
      const defaultConfig = ALL_AVAILABLE_ITEMS.map(item => ({
        id: `item-${item.path}`,
        path: item.path,
        label: item.label,
        type: "item" as "item",
        iconName: DEFAULT_ICON_MAPPING[item.path] || "FileText"
      }));
      setConfig(defaultConfig);
    }
  }, [profile]);

  const saveConfig = async () => {
    try {
      await updateSidebarConfig(config);
      toast.success("Configuración del panel lateral guardada");
    } catch (error) {
      console.error("Save error:", error);
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
      iconName: "Folder",
      items: []
    };
    setConfig([...config, newCategory]);
  };

  const addItemToRoot = (baseItem: any) => {
    const newItem: CustomSidebarItem = {
      id: `item-${Date.now()}-${Math.random()}`,
      path: baseItem.path,
      label: baseItem.label,
      type: "item",
      iconName: DEFAULT_ICON_MAPPING[baseItem.path] || "FileText"
    };

    setConfig([...config, newItem]);
    setShowAddItemToId(null);
    toast.success(`${baseItem.label} añadido al panel`);
  };

  const toggleAddItemSelector = (id: string | null) => {
    setShowAddItemToId(id);
    setSearchTerm("");
  };

  const addItemToFolder = (folderId: string, baseItem: any) => {
    const newItem: CustomSidebarItem = {
      id: `item-${Date.now()}-${Math.random()}`,
      path: baseItem.path,
      label: baseItem.label,
      type: "item",
      iconName: DEFAULT_ICON_MAPPING[baseItem.path] || "FileText"
    };

    const updateFolderAndRemoveFromRoot = (items: CustomSidebarItem[]): CustomSidebarItem[] => {
      // 1. Remove from top-level if it's there
      let newItems = items.filter(item => !(item.type === "item" && item.path === baseItem.path));
      
      // 2. Add to folder (recursively find it)
      return newItems.map(item => {
        if (item.id === folderId) {
          return { ...item, items: [...(item.items || []), newItem] };
        }
        if (item.items) {
          return { ...item, items: updateFolderAndRemoveFromRoot(item.items) };
        }
        return item;
      });
    };

    setConfig(updateFolderAndRemoveFromRoot(config));
    setShowAddItemToId(null);
    toast.success(`${baseItem.label} movido a la categoría`);
  };

  const deleteItem = (index: number) => {
    const item = config[index];
    if (item.type === "category" && item.items && item.items.length > 0) {
      if (!confirm("Se eliminará la categoría y todos sus elementos internos. ¿Continuar?")) return;
    }
    const newConfig = config.filter((_, i) => i !== index);
    setConfig(newConfig);
  };

  const deleteSubItem = (catIndex: number, subIndex: number) => {
    const newConfig = [...config];
    const category = newConfig[catIndex];
    if (category.items) {
      category.items = category.items.filter((_, i) => i !== subIndex);
      setConfig(newConfig);
    }
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

  const selectIcon = (itemId: string, iconName: string) => {
    const updateIcon = (items: CustomSidebarItem[]): CustomSidebarItem[] => {
      return items.map(i => {
        if (i.id === itemId) return { ...i, iconName: iconName };
        if (i.items) return { ...i, items: updateIcon(i.items) };
        return i;
      });
    };
    setConfig(updateIcon(config));
    setShowIconPicker(null);
  };

  const resetToDefault = () => {
    if (!confirm("¿Restablecer el panel lateral a su estado original?")) return;
    
    const defaultConfig = ALL_AVAILABLE_ITEMS.map(item => ({
      id: `item-${item.path}`,
      path: item.path,
      label: item.label,
      type: "item" as "item",
      iconName: DEFAULT_ICON_MAPPING[item.path] || "FileText"
    }));
    
    setConfig(defaultConfig);
  };

  const IconDisplay = ({ name, className }: { name?: string, className?: string }) => {
    const Icon = name && ICON_MAP[name] ? ICON_MAP[name] : FileText;
    return <Icon className={className || "w-4 h-4"} />;
  };

  const filteredBaseNavItems = ALL_AVAILABLE_ITEMS.filter(item => 
    item.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Personalizar Orden y Categorías</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={resetToDefault}>
            Restablecer
          </Button>
          <Button variant="outline" size="sm" onClick={() => toggleAddItemSelector('root')}>
            <Plus className="w-4 h-4 mr-2" /> Añadir Apartado
          </Button>
          <Button size="sm" onClick={addCategory}>
            <FolderPlus className="w-4 h-4 mr-2" /> Nueva Categoría
          </Button>
        </div>
      </div>

      <div className="relative">
        {showAddItemToId === 'root' && (
          <div className="absolute right-0 top-2 z-[110] bg-card border border-border p-3 rounded-xl shadow-2xl w-72 animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2 mb-3 bg-secondary/50 rounded-lg px-3 py-1.5">
              <Search className="w-3.5 h-3.5 text-muted-foreground" />
              <input 
                className="bg-transparent border-none outline-none text-xs w-full"
                placeholder="Buscar apartado..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
            <UIScrollArea className="h-48">
              <div className="grid grid-cols-1 gap-1 pr-2">
                {filteredBaseNavItems
                  .filter(baseItem => !config.some(item => item.type === "item" && item.path === baseItem.path))
                  .map(baseItem => (
                  <button
                    key={baseItem.path}
                    onClick={() => addItemToRoot(baseItem)}
                    className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-primary/10 hover:text-primary transition-all text-sm text-left group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center group-hover:bg-primary/20">
                      <baseItem.icon className="w-4 h-4" />
                    </div>
                    <span className="font-medium">{baseItem.label}</span>
                  </button>
                ))}
              </div>
            </UIScrollArea>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-3 bg-secondary/10 p-4 rounded-xl border border-border">
          <div className="flex items-center gap-2 mb-2 px-1">
            <Settings className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">Editor de Estructura</span>
          </div>
          {config.map((item, index) => (
            <div key={item.id} className="space-y-2">
              <div className={cn(
                "flex items-center gap-3 p-3 rounded-lg border bg-card transition-all relative",
                item.type === "category" ? "border-primary/50 bg-primary/5 shadow-sm" : "border-border"
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

                <div className="flex-1 flex items-center gap-2 min-w-0">
                  <button 
                    className="w-10 h-10 flex items-center justify-center bg-secondary/50 rounded-lg hover:bg-secondary transition-colors text-primary flex-shrink-0"
                    onClick={() => setShowIconPicker(showIconPicker === item.id ? null : item.id)}
                  >
                    <IconDisplay name={item.iconName} className="w-5 h-5" />
                  </button>

                  <div className="flex-1 min-w-0">
                  {editingId === item.id ? (
                    <div className="flex items-center gap-2">
                      <Input 
                        value={editValue} 
                        onChange={(e) => setEditValue(e.target.value)} 
                        className="h-8"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && saveEdit(item)}
                      />
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-green-500" onClick={() => saveEdit(item)}>
                        <Check className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 overflow-hidden">
                      <span className={cn("font-medium truncate", item.type === "category" && "text-primary")}>
                        {item.label}
                      </span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 opacity-40 hover:opacity-100 flex-shrink-0" onClick={() => startEditing(item)}>
                        <Edit2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                  </div>
                </div>

                {showIconPicker === item.id && (
                  <div className="absolute left-12 top-12 z-[120] bg-card border border-border p-2 rounded-xl shadow-xl w-64 animate-in fade-in zoom-in-95">
                    <div className="grid grid-cols-6 gap-2 max-h-48 overflow-y-auto p-2">
                      {ICON_NAMES.map(name => (
                        <button 
                          key={name}
                          onClick={() => selectIcon(item.id, name)}
                          className="w-8 h-8 flex items-center justify-center hover:bg-primary/20 hover:text-primary rounded-lg transition-all"
                          title={name}
                        >
                          <IconDisplay name={name} className="w-4 h-4" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-1">
                  {item.type === "category" && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="text-primary h-8 w-8" 
                      onClick={() => toggleAddItemSelector(showAddItemToId === item.id ? null : item.id)}
                      title="Añadir apartado a esta carpeta"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  )}
                  {item.type === "item" && index > 0 && config[index-1].type === "category" && (
                    <Button variant="ghost" size="sm" onClick={() => moveIntoCategory(index, index - 1)} title="Meter en categoría arriba" className="h-8">
                      <ChevronLeft className="w-4 h-4 mr-1" /> Agrupar
                    </Button>
                  )}
                  {item.type === "category" ? (
                    <Button variant="ghost" size="icon" className="text-destructive h-8 w-8" onClick={() => deleteItem(index)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  ) : (
                    <div className="w-8 h-8" title="Los elementos de la raíz no se pueden borrar directamente. Muévelos a una carpeta si quieres borrarlos." />
                  )}
                </div>

                {/* Add Item to Folder Popover */}
                {showAddItemToId === item.id && (
                  <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-[110] bg-card border border-border p-3 rounded-xl shadow-2xl w-72 animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 mb-3 bg-secondary/50 rounded-lg px-3 py-1.5">
                      <Search className="w-3.5 h-3.5 text-muted-foreground" />
                      <input 
                        className="bg-transparent border-none outline-none text-xs w-full"
                        placeholder="Buscar apartado..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <UIScrollArea className="h-48">
                      <div className="grid grid-cols-1 gap-1 pr-2">
                        {filteredBaseNavItems
                          .filter(baseItem => !item.items?.some(sub => sub.path === baseItem.path))
                          .map(baseItem => (
                          <button
                            key={baseItem.path}
                            onClick={() => addItemToFolder(item.id, baseItem)}
                            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-primary/10 hover:text-primary transition-all text-sm text-left group"
                          >
                            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center group-hover:bg-primary/20">
                              <baseItem.icon className="w-4 h-4" />
                            </div>
                            <span className="font-medium">{baseItem.label}</span>
                          </button>
                        ))}
                      </div>
                    </UIScrollArea>
                  </div>
                )}
              </div>

              {/* Nested items for categories */}
              {item.type === "category" && item.items && (
                <div className="ml-12 space-y-2 border-l-2 border-primary/20 pl-4 py-1">
                  {item.items.length === 0 && (
                    <p className="text-xs text-muted-foreground italic py-2 px-1">Carpeta vacía (toca el + para añadir)</p>
                  )}
                  {item.items.map((subItem, subIndex) => (
                    <div key={subItem.id} className="flex items-center gap-3 p-2 rounded-lg border border-border bg-card/50 relative">
                      <button 
                        className="w-8 h-8 flex items-center justify-center bg-secondary/30 rounded-lg hover:bg-secondary/50 transition-colors text-primary flex-shrink-0"
                        onClick={() => setShowIconPicker(showIconPicker === subItem.id ? null : subItem.id)}
                      >
                        <IconDisplay name={subItem.iconName} className="w-4 h-4" />
                      </button>

                      {showIconPicker === subItem.id && (
                        <div className="absolute left-8 top-8 z-[100] bg-card border border-border p-2 rounded-xl shadow-xl w-64">
                          <div className="grid grid-cols-6 gap-2 max-h-40 overflow-y-auto p-2">
                            {ICON_NAMES.map(name => (
                              <button 
                                key={name}
                                onClick={() => selectIcon(subItem.id, name)}
                                className="w-7 h-7 flex items-center justify-center hover:bg-primary/20 hover:text-primary rounded"
                                title={name}
                              >
                                <IconDisplay name={name} className="w-4 h-4" />
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex-1 flex items-center gap-2 min-w-0">
                        {editingId === subItem.id ? (
                          <div className="flex items-center gap-2 flex-1">
                            <Input 
                              value={editValue} 
                              onChange={(e) => setEditValue(e.target.value)} 
                              className="h-7 text-sm"
                              autoFocus
                              onKeyDown={(e) => e.key === 'Enter' && saveEdit(subItem)}
                            />
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-green-500" onClick={() => saveEdit(subItem)}>
                              <Check className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 overflow-hidden">
                            <span className="text-sm truncate">{subItem.label}</span>
                            <Button variant="ghost" size="icon" className="h-5 w-5 opacity-40 hover:opacity-100 flex-shrink-0" onClick={() => startEditing(subItem)}>
                              <Edit2 className="w-3 h-2" />
                            </Button>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => moveOutOfCategory(index, subIndex)}>
                          <ChevronRight className="w-3 h-3 mr-1" /> Sacar
                        </Button>
                        <Button variant="ghost" size="icon" className="text-destructive h-7 w-7" onClick={() => deleteSubItem(index, subIndex)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="hidden lg:block space-y-4">
          <div className="flex items-center gap-2 px-1">
            <span className="text-sm font-medium text-muted-foreground">Vista Previa en Tiempo Real</span>
          </div>
          <div className="bg-sidebar border border-sidebar-border rounded-2xl p-4 shadow-xl h-[500px] flex flex-col relative overflow-hidden">
            <div className="flex items-center gap-3 mb-6 px-2">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary font-bold">T</div>
              <div className="font-display font-bold text-sm text-sidebar-foreground">T.A.B.E.</div>
            </div>
            
            <UIScrollArea className="flex-1 pr-3">
              <div className="space-y-2 pb-4">
                {config.map((item) => (
                  <div key={item.id} className="space-y-1">
                    <div className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg transition-all",
                      item.type === "category" 
                        ? "text-primary/70 font-semibold text-[10px] uppercase tracking-wider mt-4" 
                        : "text-sidebar-foreground hover:bg-sidebar-accent cursor-default border border-transparent"
                    )}>
                      <IconDisplay 
                        name={item.iconName} 
                        className={cn("flex-shrink-0 transition-all", item.type === "category" ? "w-3 h-3 opacity-70" : "w-5 h-5")} 
                      />
                      <span className="text-sm truncate font-medium">{item.label}</span>
                    </div>
                    {item.type === "category" && item.items && (
                      <div className="ml-4 space-y-1 border-l border-sidebar-border/30 pl-3">
                        {item.items.map(subItem => (
                          <div key={subItem.id} className="flex items-center gap-3 px-3 py-1.5 rounded-lg text-sidebar-foreground/80 hover:bg-sidebar-accent cursor-default">
                            <IconDisplay name={subItem.iconName} className="w-4 h-4 flex-shrink-0" />
                            <span className="text-sm truncate font-medium">{subItem.label}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </UIScrollArea>
          </div>
          <p className="text-xs text-muted-foreground text-center italic">
            Esta es una simulación de cómo se verá tu panel lateral. ¡Interactúa con el scroll!
          </p>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <Button onClick={saveConfig} className="bg-primary text-primary-foreground shadow-lg shadow-primary/20">
          Guardar Cambios
        </Button>
      </div>
    </div>
  );
}
