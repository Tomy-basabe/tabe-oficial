import { useState } from "react";
import { PromptInputBox } from "@/components/ui/ai-prompt-box";
import { MessageSquare, Zap } from "lucide-react";

const DemoOne = () => {
  const [lastSubmission, setLastSubmission] = useState<{
    message: string;
    fileCount: number;
    timestamp: string;
  } | null>(null);

  const handleSendMessage = (message: string, files?: File[]) => {
    console.log("Message:", message);
    console.log("Files:", files);
    setLastSubmission({
      message,
      fileCount: files?.length || 0,
      timestamp: new Date().toLocaleTimeString(),
    });
  };

  return (
    <div className="flex flex-col w-full min-h-screen justify-center items-center p-4 bg-[radial-gradient(125%_125%_at_50%_101%,rgba(245,87,2,1)_10.5%,rgba(245,120,2,1)_16%,rgba(245,140,2,1)_17.5%,rgba(245,170,100,1)_25%,rgba(238,174,202,1)_40%,rgba(202,179,214,1)_65%,rgba(148,201,233,1)_100%)]">
      <div className="w-full max-w-[700px] flex flex-col items-center gap-6">
        {/* Header Preview */}
        <div className="text-center space-y-2 text-white drop-shadow-md">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/30 backdrop-blur-md text-xs font-semibold tracking-wide uppercase">
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            TABE AI Prompt Box Demo
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white drop-shadow">
            AI Prompt Box Component
          </h1>
          <p className="text-sm text-white/90 max-w-md mx-auto">
            Integra buscador, modo pensamiento profundo, canvas, entrada por voz y carga de imágenes.
          </p>
        </div>

        {/* Component */}
        <div className="w-full">
          <PromptInputBox
            placeholder="Pregúntale a TABE AI o adjunta tus apuntes..."
            onSend={handleSendMessage}
          />
        </div>

        {/* Live Feedback Feedback card */}
        {lastSubmission && (
          <div className="w-full bg-black/40 backdrop-blur-md border border-white/20 rounded-2xl p-4 text-white text-xs animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-2 font-bold text-amber-300 mb-1">
              <MessageSquare className="w-4 h-4" />
              <span>Mensaje emitido a las {lastSubmission.timestamp}:</span>
            </div>
            <p className="font-mono bg-black/30 p-2 rounded-lg break-words text-white/90">
              {lastSubmission.message}
            </p>
            {lastSubmission.fileCount > 0 && (
              <span className="inline-block mt-2 text-[11px] text-sky-300">
                📎 {lastSubmission.fileCount} archivo(s) adjunto(s)
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export { DemoOne };
export default DemoOne;
