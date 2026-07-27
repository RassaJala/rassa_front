import { useEffect } from "react";
import { BrowserRouter, useNavigate } from "react-router-dom";
import { AppRouter } from "./routes";
import { setNavigate } from "./services/navigate";

function NavigateProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  useEffect(() => {
    setNavigate((path, opts) => navigate(path, opts));
  }, [navigate]);
  // eslint-disable-next-line react/jsx-no-useless-fragment
  return <>{children}</>;
}

export function App() {
  return (
    <BrowserRouter>
      <NavigateProvider>
        <AppRouter />
      </NavigateProvider>
    </BrowserRouter>
  );
}
