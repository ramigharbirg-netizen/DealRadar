import React, { useEffect, useRef } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { Toaster, toast } from "sonner";
import { App as CapacitorApp } from "@capacitor/app";
import { AuthProvider } from "./contexts/AuthContext";
import { LocationProvider } from "./contexts/LocationContext";
import { Layout } from "./components/Layout";
import { Browser } from "@capacitor/browser";
import { supabase } from "./lib/supabase";
import ConsentBanner from "./components/ConsentBanner";

// Pages
import MapView from "./pages/MapView";
import FeedView from "./pages/FeedView";
import SubmitOpportunity from "./pages/SubmitOpportunity";
import EditOpportunity from "./pages/EditOpportunity";
import Profile from "./pages/Profile";
import Favorites from "./pages/Favorites";
import Login from "./pages/Login";
import Register from "./pages/Register";
import BountiesView from "./pages/BountiesView";
import CreateBounty from "./pages/CreateBounty";
import ChatsView from "./pages/ChatsView";
import ChatDetail from "./pages/ChatDetail";
import PrivacySettings from './pages/PrivacySettings';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import CookiePolicy from './pages/CookiePolicy';
import ContentGuidelines from './pages/ContentGuidelines';
import AdminModeration from './pages/AdminModeration';
import PublicProfile from './pages/PublicProfile';
import Support from './pages/Support';
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import DeleteAccount from "./pages/DeleteAccount";
import AppSplash from "./components/AppSplash";

function AppRoutesWithBackHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const lastBackPressRef = useRef(0);

  useEffect(() => {
  let listenerHandle;

  const setupDeepLink = async () => {
    listenerHandle = await CapacitorApp.addListener("appUrlOpen", async (event) => {
      const url = event?.url;

      if (!url || !url.startsWith("com.dealradar.app://login-callback")) {
        return;
      }

      try {
        await Browser.close();

        const parsedUrl = new URL(url);
        const code = parsedUrl.searchParams.get("code");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) throw error;

          toast.success("Accesso Google effettuato");
          navigate("/", { replace: true });
        }
      } catch (err) {
        console.error("Google deep link error:", err);
        toast.error("Accesso Google non completato");
      }
    });
  };

  setupDeepLink();

  return () => {
    if (listenerHandle) {
      listenerHandle.remove();
    }
  };
}, [navigate]);

  useEffect(() => {
    let listenerHandle;

    const setupBackButton = async () => {
      listenerHandle = await CapacitorApp.addListener("backButton", () => {
        const currentPath = location.pathname;
        const now = Date.now();

        const backEvent = new CustomEvent("dealradar:hardware-back", {
  detail: { handled: false },
});

window.dispatchEvent(backEvent);

if (backEvent.detail.handled) {
  return;
}

// Se NON sei nella home, torna indietro
if (currentPath !== "/") {
  navigate(-1);
  return;
}

        // Se sei nella home: doppio click per uscire
        if (now - lastBackPressRef.current < 2000) {
          CapacitorApp.exitApp();
        } else {
          lastBackPressRef.current = now;
          toast("Premi di nuovo per uscire");
        }
      });
    };

    setupBackButton();

    return () => {
      if (listenerHandle) {
        listenerHandle.remove();
      }
    };
  }, [location.pathname, navigate]);

  return (
    <>
      <Layout>
        <Routes>
          <Route path="/" element={<MapView />} />
          <Route path="/feed" element={<FeedView />} />
          <Route path="/bounties" element={<BountiesView />} />
          <Route path="/bounties/create" element={<CreateBounty />} />
          <Route path="/submit" element={<SubmitOpportunity />} />
          <Route path="/opportunities/:id/edit" element={<EditOpportunity />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/privacy-settings" element={<PrivacySettings />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/content-guidelines" element={<ContentGuidelines />} />
          <Route path="/cookie-policy" element={<CookiePolicy />} />
          <Route path="/chats" element={<ChatsView />} />
          <Route path="/chats/:id" element={<ChatDetail />} />
          <Route path="/admin/moderation" element={<AdminModeration />} />
          <Route path="/users/:userId" element={<PublicProfile />} />
          <Route path="/support" element={<Support />} />
          <Route path="/delete-account" element={<DeleteAccount />} />
        </Routes>
      </Layout>

      <Toaster position="top-center" richColors />
    </>
  );
}

function App() {
  const [showSplash, setShowSplash] = React.useState(true);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <AuthProvider>
      <LocationProvider>
        <BrowserRouter>
          {showSplash && <AppSplash />}
          <AppRoutesWithBackHandler />
          <ConsentBanner />
        </BrowserRouter>
      </LocationProvider>
    </AuthProvider>
  );
}

export default App;