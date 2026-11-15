import { useEffect, useState } from "react";
import NetInfo from "@react-native-community/netinfo";

export function useNetworkStatus(): { online: boolean; known: boolean } {
  const [state, setState] = useState<{ online: boolean; known: boolean }>({
    online: true,
    known: false,
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((snapshot) => {
      setState({
        online: snapshot.isConnected !== false && snapshot.isInternetReachable !== false,
        known: true,
      });
    });
    void NetInfo.fetch().then((snapshot) => {
      setState({
        online: snapshot.isConnected !== false && snapshot.isInternetReachable !== false,
        known: true,
      });
    });
    return unsubscribe;
  }, []);

  return state;
}
