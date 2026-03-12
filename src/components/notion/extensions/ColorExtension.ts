import { Extension } from "@tiptap/core";
import "@tiptap/extension-text-style";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";

// Notion-style color palette
export const NOTION_TEXT_COLORS = [
  { name: "Default", color: null, class: "default" },
  { name: "Gris", color: "#9B9B9B", class: "gray" },
  { name: "Marrón", color: "#A17759", class: "brown" },
  { name: "Naranja", color: "#D9730D", class: "orange" },
  { name: "Amarillo", color: "#CB912F", class: "yellow" },
  { name: "Verde", color: "#448361", class: "green" },
  { name: "Azul", color: "#337EA9", class: "blue" },
  { name: "Morado", color: "#9065B0", class: "purple" },
  { name: "Rosa", color: "#C14C8A", class: "pink" },
  { name: "Rojo", color: "#D44C47", class: "red" },
  { name: "Cian", color: "#0B6E99", class: "cyan" },
  { name: "Lima", color: "#4D7C0F", class: "lime" },
  { name: "Añil", color: "#4338CA", class: "indigo" },
  { name: "Esmeralda", color: "#047857", class: "emerald" },
  { name: "Lavanda", color: "#7E22CE", class: "lavender" },
  { name: "Ámbar", color: "#B45309", class: "amber" },
  { name: "Cielo", color: "#0EA5E9", class: "sky" },
  { name: "Fucsia", color: "#D946EF", class: "fuchsia" },
  { name: "Oro", color: "#EAB308", class: "gold" },
  { name: "Pizarra", color: "#475569", class: "slate" },
  { name: "Menta", color: "#10B981", class: "mint" },
  { name: "Violeta", color: "#8B5CF6", class: "violet" },
  { name: "Bronce", color: "#92400E", class: "bronze" },
  { name: "Turquesa", color: "#06B6D4", class: "turquoise" },
  { name: "Coral", color: "#F43F5E", class: "coral" },
  { name: "Burdeos", color: "#991B1B", class: "burgundy" },
];

export const NOTION_BACKGROUND_COLORS = [
  { name: "Default", color: null, class: "default" },
  { name: "Gris", color: "#E3E2E0", class: "gray-bg" },
  { name: "Marrón", color: "#EEE0DA", class: "brown-bg" },
  { name: "Naranja", color: "#FADEC9", class: "orange-bg" },
  { name: "Amarillo", color: "#FAF3DD", class: "yellow-bg" },
  { name: "Verde", color: "#DBEDDB", class: "green-bg" },
  { name: "Azul", color: "#D3E5EF", class: "blue-bg" },
  { name: "Morado", color: "#E8DEEE", class: "purple-bg" },
  { name: "Rosa", color: "#F4DFEB", class: "pink-bg" },
  { name: "Rojo", color: "#FFE2DD", class: "red-bg" },
  { name: "Cian", color: "#CFFAFE", class: "cyan-bg" },
  { name: "Lima", color: "#ECFCCB", class: "lime-bg" },
  { name: "Añil", color: "#E0E7FF", class: "indigo-bg" },
  { name: "Esmeralda", color: "#D1FAE5", class: "emerald-bg" },
  { name: "Lavanda", color: "#F3E8FF", class: "lavender-bg" },
  { name: "Ámbar", color: "#FEF3C7", class: "amber-bg" },
  { name: "Cielo", color: "#E0F2FE", class: "sky-bg" },
  { name: "Fucsia", color: "#FDF4FF", class: "fuchsia-bg" },
  { name: "Oro", color: "#FEFCE8", class: "gold-bg" },
  { name: "Pizarra", color: "#F1F5F9", class: "slate-bg" },
  { name: "Menta", color: "#ECFDF5", class: "mint-bg" },
  { name: "Violeta", color: "#F5F3FF", class: "violet-bg" },
  { name: "Bronce", color: "#FFF7ED", class: "bronze-bg" },
  { name: "Turquesa", color: "#ECFEFF", class: "turquoise-bg" },
  { name: "Coral", color: "#FFF1F2", class: "coral-bg" },
  { name: "Burdeos", color: "#FEF2F2", class: "burgundy-bg" },
];

// Dark mode variants
export const NOTION_BACKGROUND_COLORS_DARK = [
  { name: "Default", color: null, class: "default" },
  { name: "Gris", color: "#3A3A3A", class: "gray-bg" },
  { name: "Marrón", color: "#4A3A30", class: "brown-bg" },
  { name: "Naranja", color: "#4A3520", class: "orange-bg" },
  { name: "Amarillo", color: "#4A4520", class: "yellow-bg" },
  { name: "Verde", color: "#2A4A35", class: "green-bg" },
  { name: "Azul", color: "#2A3A4A", class: "blue-bg" },
  { name: "Morado", color: "#3A2A4A", class: "purple-bg" },
  { name: "Rosa", color: "#4A2A3A", class: "pink-bg" },
  { name: "Rojo", color: "#4A2A2A", class: "red-bg" },
  { name: "Cian", color: "#164E63", class: "cyan-bg" },
  { name: "Lima", color: "#365314", class: "lime-bg" },
  { name: "Añil", color: "#312E81", class: "indigo-bg" },
  { name: "Esmeralda", color: "#064E3B", class: "emerald-bg" },
  { name: "Lavanda", color: "#581C87", class: "lavender-bg" },
  { name: "Ámbar", color: "#78350F", class: "amber-bg" },
  { name: "Cielo", color: "#0C4A6E", class: "sky-bg" },
  { name: "Fucsia", color: "#701A75", class: "fuchsia-bg" },
  { name: "Oro", color: "#713F12", class: "gold-bg" },
  { name: "Pizarra", color: "#1E293B", class: "slate-bg" },
  { name: "Menta", color: "#065F46", class: "mint-bg" },
  { name: "Violeta", color: "#4C1D95", class: "violet-bg" },
  { name: "Bronce", color: "#7C2D12", class: "bronze-bg" },
  { name: "Turquesa", color: "#164E63", class: "turquoise-bg" },
  { name: "Coral", color: "#881337", class: "coral-bg" },
  { name: "Burdeos", color: "#7F1D1D", class: "burgundy-bg" },
];

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    backgroundColor: {
      setBackgroundColor: (color: string) => ReturnType;
      unsetBackgroundColor: () => ReturnType;
    };
  }
}

export const BackgroundColor = Extension.create({
  name: "backgroundColor",

  addOptions() {
    return {
      types: ["textStyle"],
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          backgroundColor: {
            default: null,
            parseHTML: (element) =>
              element.style.backgroundColor?.replace(/['"]+/g, "") || null,
            renderHTML: (attributes) => {
              if (!attributes.backgroundColor) {
                return {};
              }
              return {
                style: `background-color: ${attributes.backgroundColor}; padding: 0 0.25rem; border-radius: 0.25rem;`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setBackgroundColor:
        (color: string) =>
        ({ chain }) => {
          return chain().setMark("textStyle", { backgroundColor: color }).run();
        },
      unsetBackgroundColor:
        () =>
        ({ chain }) => {
          return chain()
            .setMark("textStyle", { backgroundColor: null })
            .removeEmptyTextStyle()
            .run();
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-q": () => {
        const lastColor = localStorage.getItem("tabe_last_highlight_color") || "#FAF3DD"; // Default to yellow-bg
        const currentBgColor = this.editor.getAttributes("textStyle")?.backgroundColor;
        
        if (currentBgColor) {
           this.editor.chain().focus().unsetBackgroundColor().run();
        } else {
           this.editor.chain().focus().setBackgroundColor(lastColor).run();
        }
        
        return true;
      },
      // Soporte explícito para Ctrl+Q / Cmd+Q
      "Ctrl-q": () => this.editor.commands.keyboardShortcut("Mod-q"),
      "Cmd-q": () => this.editor.commands.keyboardShortcut("Mod-q"),
    };
  },
});

export { TextStyle, Color };
