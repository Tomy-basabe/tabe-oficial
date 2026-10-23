import React, { createContext, useContext, useCallback, useEffect } from "react";

interface ComicContextType {
  comicMode: boolean;
  toggleComicMode: () => void;
  setComicMode: (enabled: boolean) => void;
  soundEnabled: boolean;
  toggleSound: (e?: React.MouseEvent) => void;
  setSoundEnabled: (enabled: boolean) => void;
  triggerBurst: (x: number, y: number, customWord?: string) => void;
}

const ComicContext = createContext<ComicContextType>({
  comicMode: false,
  toggleComicMode: () => {},
  setComicMode: () => {},
  soundEnabled: false,
  toggleSound: () => {},
  setSoundEnabled: () => {},
  triggerBurst: () => {},
});

export const useComic = () => useContext(ComicContext);

export function ComicEffectsProvider({ children }: { children: React.ReactNode }) {
  // Ensure comic mode class is removed and settings stay disabled
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.remove("comic-mode-active");
    }
    try {
      localStorage.setItem("tabe-comic-mode", "false");
      localStorage.setItem("tabe-comic-sound", "false");
    } catch {}
  }, []);

  const noop = useCallback(() => {}, []);

  const contextValue = React.useMemo(
    () => ({
      comicMode: false,
      toggleComicMode: noop,
      setComicMode: noop,
      soundEnabled: false,
      toggleSound: noop,
      setSoundEnabled: noop,
      triggerBurst: noop,
    }),
    [noop]
  );

  return (
    <ComicContext.Provider value={contextValue}>
      {children}
    </ComicContext.Provider>
  );
}
