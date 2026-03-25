import React from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
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
import ChatsView from './pages/ChatsView';
import ChatDetail from './pages/ChatDetail';

function App() {
  return (
    <AuthProvider>
      <LocationProvider>
        <BrowserRouter>
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
        </BrowserRouter>
      </LocationProvider>
    </AuthProvider>
  );
}

export default App;
