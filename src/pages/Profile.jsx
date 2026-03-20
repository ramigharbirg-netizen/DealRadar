import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, LogOut, MapPin, Plus, ChevronRight, Award, Calendar,
  Bell, BellOff, Trophy, Medal, Star, Settings, TrendingUp
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Switch } from '../components/ui/switch';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Checkbox } from '../components/ui/checkbox';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../components/ui/sheet';
import { useAuth } from '../contexts/AuthContext';
import { userAPI, opportunitiesAPI } from '../lib/api';
import api from '../lib/api';
import { OpportunityCard } from '../components/OpportunityCard';
import { OpportunityDetail } from '../components/OpportunityDetail';
import { toast } from 'sonner';

const categories = [
  { id: 'store_liquidation', name: 'Store Liquidation' },
  { id: 'product_stock', name: 'Product Stock' },
  { id: 'equipment', name: 'Equipment' },
  { id: 'business_sale', name: 'Business Sale' },
  { id: 'auctions', name: 'Auctions' },
  { id: 'user_reported', name: 'User Reported' },
];

const badgeIcons = {
  gold: Trophy,
  silver: Medal,
  bronze: Award,
  none: User,
};

const badgeColors = {
  gold: 'bg-yellow-500 text-white',
  silver: 'bg-gray-400 text-white',
  bronze: 'bg-amber-600 text-white',
  none: 'bg-gray-200 text-gray-600',
};

const badgeNames = {
  gold: 'Gold Hunter',
  silver: 'Silver Hunter',
  bronze: 'Bronze Hunter',
  none: 'New Hunter',
};

export const Profile = () => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [myOpportunities, setMyOpportunities] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // Notification preferences
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notificationCategories, setNotificationCategories] = useState([]);
  const [notificationRadius, setNotificationRadius] = useState(20);

  useEffect(() => {
  if (user) {
    loadUserData();
    loadLeaderboard();
  } else {
    setLoading(false);
  }
}, [user]);

useEffect(() => {
  if (user) {
    loadUserData();
    loadLeaderboard();
  } else {
    setLoading(false);
  }
}, [user]);

  const loadUserData = async () => {
    try {
      const [statsRes, oppsRes, meRes] = await Promise.all([
        userAPI.getStats(user.id),
        opportunitiesAPI.getAll({ limit: 100 }),
        api.get('/auth/me'),
      ]);
      setStats(statsRes.data);
      setMyOpportunities(oppsRes.data.filter(opp => opp.user_id === user.id));
      
      // Load notification preferences
      const userData = meRes.data;
      setNotificationsEnabled(userData.notification_enabled ?? true);
      setNotificationCategories(userData.notification_categories ?? []);
      setNotificationRadius(userData.notification_radius ?? 20);
    } catch (err) {
      console.error('Error loading user data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadLeaderboard = async () => {
    try {
      const res = await api.get('/leaderboard?limit=5');
      setLeaderboard(res.data);
    } catch (err) {
      console.error('Error loading leaderboard:', err);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  const saveNotificationPreferences = async () => {
    try {
      await api.put('/users/preferences', {
        notification_enabled: notificationsEnabled,
        notification_categories: notificationCategories,
        notification_radius: notificationRadius,
      });
      toast.success('Notification preferences saved');
      setSettingsOpen(false);
    } catch (err) {
      toast.error('Failed to save preferences');
    }
  };

  const toggleCategory = (categoryId) => {
    setNotificationCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(c => c !== categoryId)
        : [...prev, categoryId]
    );
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    });
  };

  const getBadgeIcon = (badge) => {
    const Icon = badgeIcons[badge] || badgeIcons.none;
    return Icon;
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <User className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Welcome to DealRadar</h2>
          <p className="text-gray-500 mb-6">
            Login or create an account to discover deals, earn points, and climb the leaderboard
          </p>
          <div className="space-y-3">
            <Button 
              onClick={() => navigate('/login')} 
              className="w-full bg-primary rounded-xl h-12"
              data-testid="login-btn"
            >
              Login
            </Button>
            <Button 
              onClick={() => navigate('/register')} 
              variant="outline"
              className="w-full rounded-xl h-12"
              data-testid="register-btn"
            >
              Create Account
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const userBadge = stats?.badge || 'none';
  const BadgeIcon = getBadgeIcon(userBadge);

  return (
    <div className="min-h-screen bg-background pb-20" data-testid="profile-page">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-emerald-400 pt-8 pb-16 px-4">
        <div className="flex items-start justify-between mb-6">
          <h1 className="text-xl font-bold text-white">Profile</h1>
          <div className="flex gap-2">
            <Sheet open={settingsOpen} onOpenChange={setSettingsOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 rounded-full text-white hover:bg-white/20"
                  data-testid="settings-btn"
                >
                  <Settings className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <SheetHeader>
                  <SheetTitle>Notification Settings</SheetTitle>
                </SheetHeader>
                <div className="space-y-6 mt-6">
                  {/* Enable/Disable Notifications */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {notificationsEnabled ? (
                        <Bell className="w-5 h-5 text-primary" />
                      ) : (
                        <BellOff className="w-5 h-5 text-gray-400" />
                      )}
                      <span className="font-medium">Notifications</span>
                    </div>
                    <Switch
                      checked={notificationsEnabled}
                      onCheckedChange={setNotificationsEnabled}
                      data-testid="notifications-toggle"
                    />
                  </div>

                  {notificationsEnabled && (
                    <>
                      {/* Notification Radius */}
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-2 block">
                          Notification Radius
                        </label>
                        <Select 
                          value={String(notificationRadius)} 
                          onValueChange={(v) => setNotificationRadius(Number(v))}
                        >
                          <SelectTrigger data-testid="notification-radius-select">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5">5 km</SelectItem>
                            <SelectItem value="10">10 km</SelectItem>
                            <SelectItem value="20">20 km</SelectItem>
                            <SelectItem value="50">50 km</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-gray-500 mt-1">
                          Get notified about deals within this distance
                        </p>
                      </div>

                      {/* Category Preferences */}
                      <div>
                        <label className="text-sm font-medium text-gray-700 mb-3 block">
                          Categories to Follow
                        </label>
                        <p className="text-xs text-gray-500 mb-3">
                          Leave all unchecked to receive all categories
                        </p>
                        <div className="space-y-3">
                          {categories.map((cat) => (
                            <div key={cat.id} className="flex items-center gap-3">
                              <Checkbox
                                id={cat.id}
                                checked={notificationCategories.includes(cat.id)}
                                onCheckedChange={() => toggleCategory(cat.id)}
                              />
                              <label htmlFor={cat.id} className="text-sm">
                                {cat.name}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  <Button
                    onClick={saveNotificationPreferences}
                    className="w-full bg-primary rounded-xl h-11"
                    data-testid="save-preferences-btn"
                  >
                    Save Preferences
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full text-white hover:bg-white/20"
              onClick={handleLogout}
              data-testid="logout-btn"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* User Info with Badge */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">
                {user.name?.charAt(0).toUpperCase()}
              </span>
            </div>
            {/* Badge indicator */}
            {userBadge !== 'none' && (
              <div className={`absolute -bottom-1 -right-1 w-7 h-7 rounded-full ${badgeColors[userBadge]} flex items-center justify-center border-2 border-white`}>
                <BadgeIcon className="w-4 h-4" />
              </div>
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{user.name}</h2>
            <p className="text-white/80 text-sm">{user.email}</p>
            <Badge className={`mt-1 ${badgeColors[userBadge]}`}>
              {badgeNames[userBadge]}
            </Badge>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-4 -mt-10">
        <Card className="shadow-lg border-0">
          <CardContent className="p-4">
            <div className="grid grid-cols-4 divide-x divide-gray-100">
              <div className="text-center px-2">
                <div className="flex items-center justify-center mb-1">
                  <Star className="w-4 h-4 text-primary" />
                </div>
                <p className="text-xl font-bold text-gray-900">
                  {stats?.points || 0}
                </p>
                <p className="text-xs text-gray-500">Points</p>
              </div>
              <div className="text-center px-2">
                <div className="flex items-center justify-center mb-1">
                  <Award className="w-4 h-4 text-amber-500" />
                </div>
                <p className="text-xl font-bold text-gray-900">
                  {stats?.reputation || 0}
                </p>
                <p className="text-xs text-gray-500">Reputation</p>
              </div>
              <div className="text-center px-2">
                <div className="flex items-center justify-center mb-1">
                  <MapPin className="w-4 h-4 text-blue-500" />
                </div>
                <p className="text-xl font-bold text-gray-900">
                  {stats?.opportunities_posted || myOpportunities.length}
                </p>
                <p className="text-xs text-gray-500">Posted</p>
              </div>
              <div className="text-center px-2">
                <div className="flex items-center justify-center mb-1">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                </div>
                <p className="text-xl font-bold text-gray-900">
                  {stats?.opportunities_confirmed || 0}
                </p>
                <p className="text-xs text-gray-500">Verified</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Points System Info */}
      <div className="px-4 mt-6">
        <Card className="bg-gradient-to-r from-primary/5 to-emerald-50 border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="w-5 h-5 text-primary" />
              Earn Points
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Submit opportunity</span>
                <span className="font-semibold text-primary">+5 pts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Opportunity confirmed</span>
                <span className="font-semibold text-primary">+10 pts</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">High value verified</span>
                <span className="font-semibold text-primary">+20 pts</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-primary/10">
              <p className="text-xs text-gray-500">
                🥉 Bronze: 50 pts • 🥈 Silver: 200 pts • 🥇 Gold: 500 pts
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Leaderboard */}
      <div className="px-4 mt-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              Top Opportunity Hunters
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {leaderboard.map((hunter, index) => {
                const HunterBadgeIcon = getBadgeIcon(hunter.badge);
                const isCurrentUser = hunter.id === user.id;
                
                return (
                  <div 
                    key={hunter.id}
                    className={`flex items-center gap-3 p-2 rounded-lg ${
                      isCurrentUser ? 'bg-primary/10' : ''
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      index === 0 ? 'bg-yellow-100 text-yellow-700' :
                      index === 1 ? 'bg-gray-100 text-gray-700' :
                      index === 2 ? 'bg-amber-100 text-amber-700' :
                      'bg-gray-50 text-gray-500'
                    }`}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {hunter.name} {isCurrentUser && '(You)'}
                      </p>
                      <p className="text-xs text-gray-500">{hunter.points} points</p>
                    </div>
                    <div className={`w-6 h-6 rounded-full ${badgeColors[hunter.badge]} flex items-center justify-center`}>
                      <HunterBadgeIcon className="w-3 h-3" />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="px-4 mt-6 space-y-3">
        <Button
          onClick={() => navigate('/submit')}
          className="w-full h-12 bg-primary rounded-xl justify-between"
          data-testid="submit-opportunity-btn"
        >
          <span className="flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Submit New Deal (+5 pts)
          </span>
          <ChevronRight className="w-5 h-5" />
        </Button>

        <Button
          onClick={() => navigate('/favorites')}
          variant="outline"
          className="w-full h-12 rounded-xl justify-between"
          data-testid="view-favorites-btn"
        >
          <span className="flex items-center gap-2">
            <Star className="w-5 h-5" />
            View Saved Deals
          </span>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>

      {/* My Opportunities */}
      <div className="px-4 mt-8">
        <h3 className="text-lg font-bold text-gray-900 mb-4">My Deals</h3>
        
        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="skeleton h-32 rounded-xl"></div>
            ))}
          </div>
        ) : myOpportunities.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center">
              <MapPin className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-4">You haven't posted any deals yet</p>
              <Button
                onClick={() => navigate('/submit')}
                variant="outline"
                className="rounded-xl"
              >
                Submit Your First Deal
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {myOpportunities.map((opp) => (
              <OpportunityCard
                key={opp.id}
                opportunity={opp}
                onClick={() => {
                  setSelectedOpportunity(opp);
                  setDetailOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Opportunity Detail Sheet */}
      <OpportunityDetail
        opportunity={selectedOpportunity}
        open={detailOpen}
        onClose={setDetailOpen}
      />
    </div>
  );
};

export default Profile;
