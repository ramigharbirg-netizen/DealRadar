import React, { useEffect, useRef } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { Toaster, toast } from "sonner";
import { App as CapacitorApp } from "@capacitor/app";
import { AuthProvider } from "./contexts/AuthContext";
import { LocationProvider } from "./contexts/LocationContext";
import { Layout } from "./components/Layout";

// Pages
import MapView from "./pages/MapView";
import FeedView from "./pages/FeedView";
import SubmitOpportunity from "./pages/SubmitOpportunity";
import Profile from "./pages/Profile";
import Favorites from "./pages/Favorites";
import Login from "./pages/Login";
import Register from "./pages/Register";
import BountiesView from "./pages/BountiesView";
import CreateBounty from "./pages/CreateBounty";
import ChatsView from "./pages/ChatsView";
import ChatDetail from "./pages/ChatDetail";

function AppRoutesWithBackHandler() {
  const navigate = useNavigate();
  const location = useLocation();
  const lastBackPressRef = useRef(0);

  useEffect(() => {
    let listenerHandle;

    const setupBackButton = async () => {
      listenerHandle = await CapacitorApp.addListener("backButton", () => {
        const currentPath = location.pathname;
        const now = Date.now();

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
          <Route path="/profile" element={<Profile />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/chats" element={<ChatsView />} />
          <Route path="/chats/:id" element={<ChatDetail />} />
        </Routes>
      </Layout>

      <Toaster position="top-center" richColors />
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <LocationProvider>
        <BrowserRouter>
          <AppRoutesWithBackHandler />
        </BrowserRouter>
      </LocationProvider>
    </AuthProvider>
  );
}

export default App;