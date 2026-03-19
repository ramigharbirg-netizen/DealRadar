import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, Plus, RefreshCw, Search } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useLocation } from '../contexts/LocationContext';
import { useAuth } from '../contexts/AuthContext';
import { bountiesAPI } from '../lib/api';
import { BountyCard } from '../components/BountyCard';
import { BountyDetail } from '../components/BountyDetail';
import { CategoryFilter } from '../components/CategoryFilter';
import { toast } from 'sonner';

export const BountiesView = () => {
  const { location, radius } = useLocation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bounties, setBounties] = useState([]);
  const [myBounties, setMyBounties] = useState([]);
  const [mySubmissions, setMySubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBounty, setSelectedBounty] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [category, setCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('explore');

 const loadBountiesMemo = useCallback(() => {
  loadBounties();
}, [loadBounties, location, radius, category]);

const loadUserDataMemo = useCallback(() => {
  if (user && activeTab === 'my-bounties') {
    loadMyBounties();
  } else if (user && activeTab === 'my-submissions') {
    loadMySubmissions();
  }
}, [user, activeTab, loadMyBounties, loadMySubmissions]);

useEffect(() => {
  loadUserDataMemo();
}, [loadUserDataMemo]);

  const loadBounties = async () => {
    setLoading(true);
    try {
      const params = {
        lat: location.lat,
        lon: location.lng,
        category: category !== 'all' ? category : undefined,
        status: 'active',
      };
      const res = await bountiesAPI.getAll(params);
      setBounties(res.data);
    } catch (err) {
      toast.error('Failed to load bounties');
    } finally {
      setLoading(false);
    }
  };

  const loadMyBounties = async () => {
    try {
      const res = await bountiesAPI.getMyBounties();
      setMyBounties(res.data);
    } catch (err) {
      console.error('Error loading my bounties:', err);
    }
  };

  const loadMySubmissions = async () => {
    try {
      const res = await bountiesAPI.getMySubmissions();
      setMySubmissions(res.data);
    } catch (err) {
      console.error('Error loading my submissions:', err);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadBounties();
    setRefreshing(false);
    toast.success('Bounties refreshed');
  };

  const filteredBounties = bounties.filter(bounty =>
    bounty.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bounty.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background pb-20" data-testid="bounties-view">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-gradient-to-r from-amber-500 to-orange-500">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="w-6 h-6 text-white" />
              <h1 className="text-xl font-bold text-white">Bounties</h1>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full text-white hover:bg-white/20"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                onClick={() => navigate('/bounties/create')}
                className="bg-white text-amber-600 hover:bg-white/90 rounded-full h-10 px-4"
                data-testid="create-bounty-nav-btn"
              >
                <Plus className="w-4 h-4 mr-1" />
                Post Bounty
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-300" />
            <Input
              placeholder="Search bounties..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 bg-white/20 border-0 text-white placeholder:text-white/60 rounded-xl"
              data-testid="bounty-search-input"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4 py-4">
        <TabsList className="w-full grid grid-cols-3 h-11 bg-amber-100 rounded-xl p-1">
          <TabsTrigger
            value="explore"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-amber-600"
          >
            Explore
          </TabsTrigger>
          <TabsTrigger
            value="my-bounties"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-amber-600"
            disabled={!user}
          >
            My Bounties
          </TabsTrigger>
          <TabsTrigger
            value="my-submissions"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-amber-600"
            disabled={!user}
          >
            My Submissions
          </TabsTrigger>
        </TabsList>

        {/* Explore Tab */}
        <TabsContent value="explore" className="mt-4">
          {/* Category Filter */}
          <div className="-mx-4 mb-4">
            <CategoryFilter selected={category} onSelect={setCategory} />
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton h-48 rounded-xl"></div>
              ))}
            </div>
          ) : filteredBounties.length === 0 ? (
            <div className="empty-state py-20">
              <Target className="empty-state-icon text-amber-300" />
              <h3 className="empty-state-title">No bounties found</h3>
              <p className="empty-state-text">
                Be the first to post a bounty and let hunters find what you need!
              </p>
              <Button
                onClick={() => navigate('/bounties/create')}
                className="mt-4 bg-amber-500 hover:bg-amber-600 rounded-xl"
              >
                Post a Bounty
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBounties.map((bounty) => (
                <BountyCard
                  key={bounty.id}
                  bounty={bounty}
                  onClick={() => {
                    setSelectedBounty(bounty);
                    setDetailOpen(true);
                  }}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* My Bounties Tab */}
        <TabsContent value="my-bounties" className="mt-4">
          {!user ? (
            <div className="text-center py-10 text-gray-500">
              Please login to see your bounties
            </div>
          ) : myBounties.length === 0 ? (
            <div className="empty-state py-20">
              <Target className="empty-state-icon text-amber-300" />
              <h3 className="empty-state-title">No bounties yet</h3>
              <p className="empty-state-text">
                Create a bounty to let hunters find what you need
              </p>
              <Button
                onClick={() => navigate('/bounties/create')}
                className="mt-4 bg-amber-500 hover:bg-amber-600 rounded-xl"
              >
                Post Your First Bounty
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {myBounties.map((bounty) => (
                <BountyCard
                  key={bounty.id}
                  bounty={bounty}
                  onClick={() => {
                    setSelectedBounty(bounty);
                    setDetailOpen(true);
                  }}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* My Submissions Tab */}
        <TabsContent value="my-submissions" className="mt-4">
          {!user ? (
            <div className="text-center py-10 text-gray-500">
              Please login to see your submissions
            </div>
          ) : mySubmissions.length === 0 ? (
            <div className="empty-state py-20">
              <Target className="empty-state-icon text-amber-300" />
              <h3 className="empty-state-title">No submissions yet</h3>
              <p className="empty-state-text">
                Find opportunities matching bounties and earn rewards!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {mySubmissions.map((sub) => (
                <div
                  key={sub.id}
                  className="p-4 bg-white rounded-xl border border-gray-200"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">
                      {sub.bounty?.title || 'Unknown Bounty'}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      sub.status === 'approved' ? 'bg-green-100 text-green-700' :
                      sub.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {sub.status}
                    </span>
                  </div>
                  {sub.bounty && (
                    <p className="text-sm text-gray-500">
                      Reward: €{sub.bounty.reward_amount}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Bounty Detail Sheet */}
      <BountyDetail
        bounty={selectedBounty}
        open={detailOpen}
        onClose={setDetailOpen}
      />
    </div>
  );
};

export default BountiesView;
