import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { GraduationCap, Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center space-y-6 px-6">
        {/* TABE Logo */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center">
            <GraduationCap className="w-9 h-9 text-white" />
          </div>
        </div>

        {/* Error */}
        <div>
          <h1 className="text-8xl font-display font-black bg-gradient-to-r from-neon-cyan to-neon-purple text-transparent bg-clip-text">
            404
          </h1>
          <p className="mt-3 text-xl font-medium text-muted-foreground">
            Esta página no existe en T.A.B.E.
          </p>
          <p className="mt-1 text-sm text-muted-foreground/60">
            Ruta: <code className="font-mono text-xs bg-secondary px-2 py-1 rounded">{location.pathname}</code>
          </p>
        </div>

        {/* CTA */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-neon-cyan to-neon-purple text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-neon-cyan/25 transition-all hover:scale-105 active:scale-95"
        >
          <Home className="w-4 h-4" />
          Volver al inicio
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
