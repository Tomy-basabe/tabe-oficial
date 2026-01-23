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
});

export { TextStyle, Color };
