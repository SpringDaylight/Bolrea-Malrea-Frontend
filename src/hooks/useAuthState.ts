import { useEffect, useState } from "react";
import { getAccessToken } from "../api/http";

const readAuthState = () => Boolean(getAccessToken());

export function useAuthState(): boolean {
  const [isLoggedIn, setIsLoggedIn] = useState(readAuthState);

  useEffect(() => {
    const syncAuthState = () => {
      setIsLoggedIn(readAuthState());
    };

    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key === "mw_access_token") {
        syncAuthState();
      }
    };

    window.addEventListener("mw_auth_change", syncAuthState);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("mw_auth_change", syncAuthState);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return isLoggedIn;
}
