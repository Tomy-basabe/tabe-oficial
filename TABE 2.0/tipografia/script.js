const rows = [
  {
    label: "MAYÚSCULAS",
    chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZÑ".split("")
  },
  {
    label: "minúsculas",
    chars: "abcdefghijklmnopqrstuvwxyzñ".split("")
  },
  {
    label: "NÚMEROS",
    chars: "0123456789".split("")
  },
  {
    label: "SÍMBOLOS",
    chars: [
      "!", "@", "#", "$", "%", "^", "&", "*", "(", ")", "-", "_",
      "+", "=", "[", "]", "{", "}", "\\", "|", ";", ":", "'", "\"",
      ",", ".", "<", ">", "/", "?", "`", "~"
    ]
  },
  {
    label: "CARACTERES<br>ESPECIALES",
    chars: [
      "¿", "¡", "¢", "€", "£", "¥", "₽", "₹", "₩",
      "©", "®", "™", "°", "ª", "º", "×", "÷", "±",
      "¬", "µ", "¶", "§", "•", "…", "«", "»", "‰", "†", "‡"
    ]
  },
  {
    label: "LATINOS<br>ADICIONALES",
    chars: [
      "À", "Á", "Â", "Ã", "Ä", "Å", "Æ", "Ç", "È", "É", "Ê", "Ë",
      "Ì", "Í", "Î", "Ï", "Ð", "Ñ", "Ò", "Ó", "Ô", "Õ", "Ö", "Ø",
      "Ù", "Ú", "Û", "Ü", "Ý", "Þ", "ß", "à", "á", "â", "ã", "ä",
      "å", "æ", "ç", "è", "é", "ê", "ë", "ì", "í", "î", "ï", "ð",
      "ò", "ó", "ô", "õ", "ö", "ø", "ù", "ú", "û", "ü", "ý", "þ", "ÿ"
    ]
  },
  {
    label: "MATEMÁTICA",
    chars: [
      "∑", "∏", "√", "∞", "≈", "≠", "≤", "≥", "∫", "∂",
      "∆", "∇", "∝", "∴", "∵", "∠", "⊥", "∈", "∉", "∩", "∪"
    ]
  }
];

const container = document.querySelector("#characterSet");
const toast = document.querySelector("#toast");

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

rows.forEach(row => {
  const section = document.createElement("div");
  section.className = "character-row";

  const label = document.createElement("div");
  label.className = "label";
  label.innerHTML = row.label;

  const chars = document.createElement("div");
  chars.className = "characters";

  row.chars.forEach(char => {
    const button = document.createElement("button");
    button.className = "char";
    button.type = "button";
    button.textContent = char;
    button.title = `Copiar "${char}"`;
    button.setAttribute("aria-label", `Copiar ${char}`);

    button.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(char);
        showToast(`Copiado: ${char}`);
      } catch {
        showToast("No se pudo copiar automáticamente");
      }
    });

    chars.appendChild(button);
  });

  section.append(label, chars);
  container.appendChild(section);
});

let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 1200);
}
