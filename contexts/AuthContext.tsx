import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import type {
  User, TrackedPlant, Farm, DiagnosisHistoryEntry,
  AdminStats, Post, Comment, Transaction, FarmCycle, CyclePlant, CreateFarmCommand,
} from '../types';
import { createAvatar } from '../services/avatarService';
import {
  clearAuthToken,
  fetchBackendProfile,
  getAuthToken,
  isBackendAuthEnabled,
  loginWithBackend,
  mapBackendUserToAppUser,
  registerWithBackend,
  saveAuthToken,
  updateBackendEmail,
  updateBackendPassword,
  updateBackendProfile,
} from '../services/backendAuthService';
import {
  farmApi,
  cycleApi,
  cyclePlantApi,
  plantApi,
  diagnosisApi,
  communityApi,
  transactionApi,
  adminApi,
} from '../services/apiService';

// ─── Context type ─────────────────────────────────────────────
interface AuthContextType {
  isLoggedIn: boolean;
  user: User | null;
  isLoading: boolean;
  login: (
    name: string,
    email: string,
    password: string,
    mode: 'login' | 'signup',
    location?: string,
    phone?: string
  ) => Promise<{ success: boolean; error?: string; user?: User }>;
  logout: () => void;
  updateUser: (updatedInfo: Partial<User>, avatar?: File) => Promise<void>;
  updateAccountEmail: (newEmail: string, password: string) => Promise<void>;
  updateAccountPassword: (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ) => Promise<void>;

  // Tracked Plants
  trackedPlants: TrackedPlant[];
  addTrackedPlant: (plant: Omit<TrackedPlant, 'id' | 'lastCheckDate' | 'recoveryProgressPercentage'>) => Promise<void>;
  updateTrackedPlant: (updatedPlant: TrackedPlant) => Promise<void>;
  deleteTrackedPlant: (plantId: string) => Promise<void>;

  // Farms
  farms: Farm[];
  addFarm: (farm: CreateFarmCommand) => Promise<void>;
  updateFarm: (farm: Farm) => Promise<Farm>;
  deleteFarm: (farmId: string) => Promise<void>;

  // Diagnosis History
  diagnosisHistory: DiagnosisHistoryEntry[];
  addDiagnosisToHistory: (entry: Omit<DiagnosisHistoryEntry, 'id' | 'date'>) => Promise<void>;

  // Community
  posts: Post[];
  addPost: (post: Omit<Post, 'id' | 'timestamp' | 'likes' | 'comments' | 'likedByMe' | 'authorId'>) => Promise<void>;
  likePost: (postId: string) => Promise<void>;
  addComment: (postId: string, content: string) => Promise<void>;

  // Finance
  transactions: Transaction[];
  addTransaction: (tx: Omit<Transaction, 'id'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  // Admin
  getAdminStats: () => Promise<AdminStats>;
  getAllUsers: () => Promise<User[]>;
  deleteUser: (userId: string) => Promise<void>;
  updateUserByAdmin: (userId: string, data: { name?: string; email?: string; password?: string }) => Promise<User>;
  getUserDiagnoses: (userId: string) => Promise<Record<string, unknown>[]>;
  getAllPostsAdmin: () => Promise<Record<string, unknown>[]>;
  deleteAnyPost: (postId: string) => Promise<void>;

  // Auth helper
  checkUser: (email: string) => User | null;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ─── Mock data used only when backend is offline / disabled ──
const getInitialFarms = (): Farm[] => [
  { id: 'farm-1', name: 'North Field', crop: 'Corn',  area: 50,  areaUnit: 'acre',    soilType: 'Loam', plantingDate: '2024-04-15', season: 'Spring 2024', imageUrl: '/images/farm-default.svg', yield: 180, yieldUnit: 'bushels/acre', location: 'Cairo', coordinates: [] },
  { id: 'farm-2', name: 'South Field', crop: 'Wheat', area: 120, areaUnit: 'hectare', soilType: 'Clay', plantingDate: '2023-11-01', season: 'Winter 2023', imageUrl: '/images/farm-default.svg', yield: 80,  yieldUnit: 'bushels/acre', location: 'Giza', coordinates: [] },
];

const getPreferredCycle = (cycles: FarmCycle[]): FarmCycle | null => {
  const activeCycle = cycles.find((cycle) => cycle.status === 'active');
  if (activeCycle) return activeCycle;

  return [...cycles].sort((a, b) => {
    const aTime = Date.parse(a.plantingDate || a.createdAt) || 0;
    const bTime = Date.parse(b.plantingDate || b.createdAt) || 0;
    return bTime - aTime;
  })[0] || null;
};

const enrichFarmsWithCycleDetails = async (farms: Farm[]): Promise<Farm[]> => {
  const cycleResults = await Promise.allSettled(
    farms.map(async (farm) => {
      const cycles = await cycleApi.getAll(farm.id);
      const preferredCycle = getPreferredCycle(cycles);
      if (!preferredCycle) return farm;

      return {
        ...farm,
        crop: preferredCycle.crop,
        season: preferredCycle.season,
        plantingDate: preferredCycle.plantingDate,
      };
    }),
  );

  return farms.map((farm, index) => {
    const cycleResult = cycleResults[index];
    return cycleResult.status === 'fulfilled' ? cycleResult.value : farm;
  });
};

const mapCyclePlantToTrackedPlant = (plant: CyclePlant): TrackedPlant => ({
  id: `cycle:${plant.id}`,
  name: plant.userDefinedName || plant.speciesName || 'Tracked plant',
  image: plant.imageUrl || '/images/tracked-plant.svg',
  diagnosis: null,
  progressLog: [],
  lastCheckDate: plant.lastCheckDate || '',
  recoveryProgressPercentage: plant.recoveryProgressPercent || 0,
});

const getCycleTrackedPlantsForFarms = async (farms: Farm[]): Promise<TrackedPlant[]> => {
  const farmResults = await Promise.allSettled(
    farms.map(async (farm) => {
      const cycles = await cycleApi.getAll(farm.id);
      const plantResults = await Promise.allSettled(
        cycles.map((cycle) => cyclePlantApi.getAll(cycle.id)),
      );
      return plantResults.flatMap((result) =>
        result.status === 'fulfilled' ? result.value.map(mapCyclePlantToTrackedPlant) : [],
      );
    }),
  );

  return farmResults.flatMap((result) =>
    result.status === 'fulfilled' ? result.value : [],
  );
};

const getInitialTrackedPlants = (): TrackedPlant[] => [{
  id: 'mock-plant-1',
  name: 'Tomato Plant',
  image: '/images/tracked-plant.svg',
  diagnosis: {
    plantName: 'Tomato', isHealthy: false, healthPercentage: 60,
    diseaseName: 'Septoria Leaf Spot', cause: 'Fungus (Septoria lycopersici)',
    symptoms: ['Small, water-soaked spots on lower leaves.'],
    treatment: ['Apply a fungicide containing chlorothalonil or mancozeb.'],
    recommendedProducts: [{ productName: 'Fungicide with Chlorothalonil', description: 'Broad-spectrum fungicide.', type: 'Fungicide' }],
    prevention: ['Ensure proper spacing.'], confidenceScore: 0.95,
    visualCues: 'Small circular spots on lower leaves.',
    secondaryDiagnosis: null, growthStage: 'Vegetative', growthStageReasoning: 'No fruits visible.',
    humanConsumptionAdvisory: { isEdible: true, safetyStatus: 'caution', title: 'Caution Advised', summary: 'Wash thoroughly.', symptoms: ['Stomach upset'], severity: 'Low', whatToDo: 'Wash thoroughly.' },
  },
  progressLog: [{ date: '2024-07-15', notes: 'First spotted the issue.', recoveryProgressPercentage: 10 }],
  lastCheckDate: '2024-07-17',
  recoveryProgressPercentage: 25,
}];

const getInitialHistory = (): DiagnosisHistoryEntry[] => [{
  id: 'history-1', date: '2024-07-20', plantName: 'Bell Pepper', image: '/images/history-plant.svg',
  diagnosis: {
    plantName: 'Bell Pepper', isHealthy: false, healthPercentage: 75,
    diseaseName: 'Bacterial Spot', cause: 'Bacteria',
    symptoms: ['Dark water-soaked spots on leaves'], treatment: ['Apply copper-based bactericides.'],
    recommendedProducts: [{ productName: 'Copper Fungicide', description: 'Effective against bacterial spot.', type: 'Bactericide' }],
    prevention: ['Avoid overhead watering.'], confidenceScore: 0.92,
    visualCues: 'Small dark lesions on leaves.', secondaryDiagnosis: null,
    growthStage: 'Fruiting', growthStageReasoning: 'Visible peppers.',
    humanConsumptionAdvisory: { isEdible: true, safetyStatus: 'caution', title: 'Caution Advised', summary: 'Safe if not rotting.' },
  },
}];

const getInitialPosts = (): Post[] => [
  {
    id: 'post-1', authorId: 'mock-user-1', authorName: 'Sarah J.',
    authorAvatar: createAvatar('Sarah J.'), title: 'Best fertilizer for indoor Monsteras?',
    content: 'I have had my Monstera for about a year now and it is growing slow. Any organic fertilizer recommendations?',
    category: 'question', likes: 12, likedByMe: false,
    comments: [{ id: 'c1', authorName: 'Mike R.', authorAvatar: createAvatar('Mike R.'), content: 'Fish emulsion works wonders!', timestamp: '2 hours ago' }],
    timestamp: '1 day ago', imageUrl: '/images/post-default.svg',
  },
  {
    id: 'post-2', authorId: 'mock-user-2', authorName: 'Ahmed Omar',
    authorAvatar: createAvatar('Ahmed Omar'), title: 'My first hydroponic setup! 🌿',
    content: 'Just finished setting up a small DWC system for lettuce. Excited to see how it goes.',
    category: 'showcase', likes: 45, likedByMe: false, comments: [], timestamp: '3 days ago',
    imageUrl: '/images/post-default.svg',
  },
];

const getInitialTransactions = (): Transaction[] => [
  { id: 't1', date: '2024-05-01', amount: 500, type: 'expense', category: 'Seeds',       description: 'Bought hybrid corn seeds' },
  { id: 't2', date: '2024-05-15', amount: 300, type: 'expense', category: 'Fertilizers', description: 'NPK Fertilizer 20-20-20' },
  { id: 't4', date: '2024-09-20', amount: 4500, type: 'income', category: 'Sale',        description: 'Sold 5 tons of corn' },
];

// ─────────────────────────────────────────────────────────────
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoggedIn,      setIsLoggedIn]      = useState(false);
  const [user,            setUser]            = useState<User | null>(null);
  const [trackedPlants,   setTrackedPlants]   = useState<TrackedPlant[]>([]);
  const [farms,           setFarms]           = useState<Farm[]>([]);
  const [diagnosisHistory,setDiagnosisHistory]= useState<DiagnosisHistoryEntry[]>([]);
  const [posts,           setPosts]           = useState<Post[]>([]);
  const [transactions,    setTransactions]    = useState<Transaction[]>([]);
  const [isLoading,       setIsLoading]       = useState(true);

  const backendEnabled = isBackendAuthEnabled();

  // ─── Load all user data from backend ─────────────────────
  const loadUserDataFromBackend = useCallback(async () => {
    try {
      const [farmsData, plantsData, historyData, postsData, txData] = await Promise.allSettled([
        farmApi.getAll(),
        plantApi.getAll(),
        diagnosisApi.getAll(),
        communityApi.getPosts(),
        transactionApi.getAll(),
      ]);

      if (farmsData.status   === 'fulfilled') {
        const enrichedFarms = await enrichFarmsWithCycleDetails(farmsData.value);
        setFarms(enrichedFarms);
        const cyclePlants = await getCycleTrackedPlantsForFarms(farmsData.value);
        const standalonePlants = plantsData.status === 'fulfilled' ? plantsData.value : [];
        setTrackedPlants([...cyclePlants, ...standalonePlants]);
      } else if (plantsData.status  === 'fulfilled') {
        setTrackedPlants(plantsData.value);
      }
      if (historyData.status === 'fulfilled') setDiagnosisHistory(historyData.value);
      if (postsData.status   === 'fulfilled') setPosts(postsData.value);
      if (txData.status      === 'fulfilled') setTransactions(txData.value);
    } catch (err) {
      console.error('Failed to load user data:', err);
    }
  }, []);

  // ─── Check for active session on mount ───────────────────
  useEffect(() => {
    const hydrateAuthState = async () => {
      setIsLoading(true);

      if (backendEnabled) {
        // Support both hash and legacy query token during rollout, but prefer hash.
        const hashParams = new URLSearchParams(window.location.hash.slice(1));
        const searchParams = new URLSearchParams(window.location.search);
        const oauthToken = hashParams.get('token') || searchParams.get('token');
        if (oauthToken) {
          saveAuthToken(oauthToken);
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        const token = getAuthToken();
        if (token) {
          try {
            const backendUser = await fetchBackendProfile(token);
            const appUser = mapBackendUserToAppUser(backendUser);
            setUser(appUser);
            setIsLoggedIn(true);
            await loadUserDataFromBackend();
          } catch {
            // Token expired or invalid
            clearAuthToken();
          }
        } else {
          // No token — community route requires auth, so skip the prefetch.
          // Posts will load when the user logs in and loadUserDataFromBackend runs.
        }
      }

      setIsLoading(false);
    };

    void hydrateAuthState();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Login / Signup ───────────────────────────────────────
  const login = async (
    name: string,
    email: string,
    password: string,
    mode: 'login' | 'signup',
    location = '',
    phone = ''
  ): Promise<{ success: boolean; error?: string; user?: User }> => {
    const lowerEmail     = email.trim().toLowerCase();
    const trimmedPassword = password.trim();
    const trimmedLocation = location.trim();
    const trimmedPhone = phone.trim();

    if (!lowerEmail || !trimmedPassword) {
      return { success: false, error: 'Email and password are required.' };
    }

    if (backendEnabled) {
      try {
        const response =
          mode === 'signup'
            ? await registerWithBackend({
                name: name?.trim() || 'New User',
                email: lowerEmail,
                password: trimmedPassword,
                location: trimmedLocation,
                phone: trimmedPhone,
              })
            : await loginWithBackend({ email: lowerEmail, password: trimmedPassword });

        saveAuthToken(response.token);
        const appUser = mapBackendUserToAppUser(response.user);
        setUser(appUser);
        setIsLoggedIn(true);
        await loadUserDataFromBackend();
        return { success: true, user: appUser };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to authenticate with backend.';
        return { success: false, error: message };
      }
    }

    // ── Offline fallback: use in-memory mock data ─────────
    const isAdminBackdoor = (lowerEmail === 'admin' && trimmedPassword === 'admin');
    const mockUser: User = {
      name:           isAdminBackdoor ? 'Admin' : (name || 'Demo User'),
      email:          isAdminBackdoor ? 'admin@system.local' : lowerEmail,
      profilePicture: createAvatar(isAdminBackdoor ? 'Admin' : (name || lowerEmail)),
      role:           (isAdminBackdoor || lowerEmail === 'admin@agri.com') ? 'admin' : 'user',
      location:       trimmedLocation,
      phone:          trimmedPhone,
    };
    setUser(mockUser);
    setTrackedPlants(getInitialTrackedPlants());
    setFarms(getInitialFarms());
    setDiagnosisHistory(getInitialHistory());
    setTransactions(getInitialTransactions());
    setPosts(getInitialPosts());
    setIsLoggedIn(true);
    return { success: true, user: mockUser };
  };

  // ─── Logout ───────────────────────────────────────────────
  const logout = () => {
    if (backendEnabled) clearAuthToken();
    setUser(null);
    setIsLoggedIn(false);
    setTrackedPlants([]);
    setFarms([]);
    setDiagnosisHistory([]);
    setTransactions([]);
    setPosts([]);
  };

  // ─── Update user profile ──────────────────────────────────
  const updateUser = async (updatedInfo: Partial<User>, avatar?: File) => {
    if (!user) return;
    if (!backendEnabled) {
      setUser((previous) => previous ? { ...previous, ...updatedInfo } : previous);
      return;
    }

    const token = getAuthToken();
    if (!token) throw new Error('You must be signed in to update your profile.');
    const backendUser = await updateBackendProfile(token, {
      name: updatedInfo.name,
      location: updatedInfo.location,
      phone: updatedInfo.phone,
      avatar,
    });
    setUser(mapBackendUserToAppUser({ ...backendUser, role: backendUser.role || user.role }));
  };

  const updateAccountEmail = async (newEmail: string, password: string) => {
    const normalizedEmail = newEmail.trim().toLowerCase();

    if (!backendEnabled) {
      setUser((prev) => (prev ? { ...prev, email: normalizedEmail } : prev));
      return;
    }

    const token = getAuthToken();
    if (!token) throw new Error('You must be signed in to update your email.');

    const result = await updateBackendEmail(token, {
      new_email: normalizedEmail,
      password,
    });
    saveAuthToken(result.token);
    setUser((prev) => (prev ? { ...prev, email: normalizedEmail } : prev));
  };

  const updateAccountPassword = async (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ) => {
    if (!backendEnabled) return;

    const token = getAuthToken();
    if (!token) throw new Error('You must be signed in to update your password.');

    await updateBackendPassword(token, {
      current_password: currentPassword,
      new_password: newPassword,
      confirm_password: confirmPassword,
    });
  };

  // ─── TRACKED PLANTS ───────────────────────────────────────
  const addTrackedPlant = async (plant: Omit<TrackedPlant, 'id' | 'lastCheckDate' | 'recoveryProgressPercentage'>) => {
    if (backendEnabled && isLoggedIn) {
      const created = await plantApi.create(plant);
      setTrackedPlants((prev) => [created, ...prev]);
    } else {
      const newPlant: TrackedPlant = {
        ...plant,
        id:                       `plant-${Date.now()}`,
        lastCheckDate:            new Date().toISOString().split('T')[0],
        recoveryProgressPercentage: 0,
        progressLog:              [{
          date: new Date().toISOString().split('T')[0],
          notes: 'Initial diagnosis and tracking started.',
          recoveryProgressPercentage: 0,
        }],
      };
      setTrackedPlants((prev) => [newPlant, ...prev]);
    }
  };

  const updateTrackedPlant = async (updatedPlant: TrackedPlant) => {
    if (updatedPlant.id.startsWith('cycle:')) {
      setTrackedPlants((prev) => prev.map((p) => (p.id === updatedPlant.id ? updatedPlant : p)));
      return;
    }

    if (backendEnabled && isLoggedIn) {
      const updated = await plantApi.update(updatedPlant);
      setTrackedPlants((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } else {
      setTrackedPlants((prev) => prev.map((p) => (p.id === updatedPlant.id ? updatedPlant : p)));
    }
  };

  const deleteTrackedPlant = async (plantId: string) => {
    if (plantId.startsWith('cycle:')) {
      const cyclePlantId = plantId.slice('cycle:'.length);
      if (backendEnabled && isLoggedIn) {
        await cyclePlantApi.delete(cyclePlantId);
      }
      setTrackedPlants((prev) => prev.filter((p) => p.id !== plantId));
      return;
    }

    if (backendEnabled && isLoggedIn) {
      await plantApi.delete(plantId);
    }
    setTrackedPlants((prev) => prev.filter((p) => p.id !== plantId));
  };

  // ─── FARMS ────────────────────────────────────────────────
  const addFarm = async (farm: CreateFarmCommand) => {
    if (backendEnabled && isLoggedIn) {
      const created = await farmApi.create(farm);
      let farmWithCycleDetails: Farm = {
        ...created,
        crop: farm.crop,
        season: farm.season,
        plantingDate: farm.plantingDate,
      };

      if (farm.crop?.trim() && farm.season?.trim() && farm.plantingDate?.trim()) {
        try {
          const createdCycle = await cycleApi.create(created.id, {
            crop: farm.crop.trim(),
            season: farm.season.trim(),
            planting_date: farm.plantingDate,
          });

          farmWithCycleDetails = {
            ...created,
            crop: createdCycle.crop,
            season: createdCycle.season,
            plantingDate: createdCycle.plantingDate,
          };
        } catch (err) {
          console.error('Initial cycle creation failed for new farm:', err);
        }
      }

      setFarms((prev) => [farmWithCycleDetails, ...prev]);
    } else {
      const newFarm: Farm = {
        ...farm,
        id: `farm-${Date.now()}`,
        coordinates: farm.coordinates || [],
        soilType: farm.soilType || '',
      };
      setFarms((prev) => [newFarm, ...prev]);
    }
  };

  const updateFarm = useCallback(async (updatedFarm: Farm): Promise<Farm> => {
    if (backendEnabled && isLoggedIn) {
      const updated = await farmApi.update(updatedFarm.id, updatedFarm);
      const farmWithDerivedFields = {
        ...updated,
        crop: updatedFarm.crop,
        season: updatedFarm.season,
        plantingDate: updatedFarm.plantingDate,
      };
      setFarms((prev) => prev.map((f) => (
        f.id === updated.id
          ? farmWithDerivedFields
          : f
      )));
      return farmWithDerivedFields;
    } else {
      setFarms((prev) => prev.map((f) => (f.id === updatedFarm.id ? updatedFarm : f)));
      return updatedFarm;
    }
  }, [backendEnabled, isLoggedIn]);

  const deleteFarm = async (farmId: string) => {
    if (backendEnabled && isLoggedIn) {
      await farmApi.delete(farmId);
    }
    setFarms((prev) => prev.filter((f) => f.id !== farmId));
  };

  // ─── DIAGNOSIS HISTORY ────────────────────────────────────
  const addDiagnosisToHistory = async (entry: Omit<DiagnosisHistoryEntry, 'id' | 'date'>) => {
    if (backendEnabled && isLoggedIn) {
      const created = await diagnosisApi.create(entry);
      setDiagnosisHistory((prev) => [created, ...prev]);
    } else {
      const newEntry: DiagnosisHistoryEntry = {
        ...entry,
        id:   `diag-${Date.now()}`,
        date: new Date().toISOString().split('T')[0],
      };
      setDiagnosisHistory((prev) => [newEntry, ...prev]);
    }
  };

  // ─── COMMUNITY ────────────────────────────────────────────
  const addPost = async (post: Omit<Post, 'id' | 'timestamp' | 'likes' | 'comments' | 'likedByMe' | 'authorId'>) => {
    if (backendEnabled && isLoggedIn) {
      const created = await communityApi.createPost(post);
      setPosts((prev) => [created, ...prev]);
    } else {
      const newPost: Post = {
        ...post,
        id:        `post-${Date.now()}`,
        authorId:  user?.id || 'offline-user',
        timestamp: 'Just now',
        likes:     0,
        likedByMe: false,
        comments:  [],
      };
      setPosts((prev) => [newPost, ...prev]);
    }
  };

  const likePost = async (postId: string) => {
    if (!user) return;
    const post = posts.find((p) => p.id === postId);
    if (!post) return;
    const hasLiked = post.likedByMe;

    if (backendEnabled && isLoggedIn) {
      const likeState = hasLiked
        ? await communityApi.unlikePost(postId)
        : await communityApi.likePost(postId);
      setPosts((previous) => previous.map((candidate) => candidate.id === postId
        ? { ...candidate, likes: likeState.likesCount, likedByMe: likeState.likedByMe }
        : candidate));
      return;
    }

    setPosts((previous) => previous.map((candidate) => candidate.id === postId
      ? {
          ...candidate,
          likes: Math.max(0, candidate.likes + (hasLiked ? -1 : 1)),
          likedByMe: !hasLiked,
        }
      : candidate));
  };

  const addComment = async (postId: string, content: string) => {
    if (!user) return;

    if (backendEnabled && isLoggedIn) {
      const newComment = await communityApi.addComment(postId, content);
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, comments: [...p.comments, newComment] } : p))
      );
    } else {
      const newComment: Comment = {
        id:          `c-${Date.now()}`,
        authorName:  user.name,
        authorAvatar: user.profilePicture,
        content,
        timestamp:   'Just now',
      };
      setPosts((prev) =>
        prev.map((p) => (p.id === postId ? { ...p, comments: [...p.comments, newComment] } : p))
      );
    }
  };

  // ─── FINANCE ──────────────────────────────────────────────
  const addTransaction = async (tx: Omit<Transaction, 'id'>) => {
    if (backendEnabled && isLoggedIn) {
      const created = await transactionApi.create(tx);
      setTransactions((prev) => [created, ...prev]);
    } else {
      const newTx: Transaction = { ...tx, id: `tx-${Date.now()}` };
      setTransactions((prev) => [newTx, ...prev]);
    }
  };

  const deleteTransaction = async (id: string) => {
    if (backendEnabled && isLoggedIn) {
      await transactionApi.delete(id);
    }
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  // ─── ADMIN ────────────────────────────────────────────────
  const getAdminStats = async (): Promise<AdminStats> => {
    if (backendEnabled && isLoggedIn) {
      return adminApi.getStats();
    }
    return { totalUsers: 0, totalFarms: farms.length, totalPlants: trackedPlants.length };
  };

  const getAllUsers = async (): Promise<User[]> => {
    if (backendEnabled && isLoggedIn) {
      return adminApi.getUsers();
    }
    return user ? [user] : [];
  };

  const deleteUser = async (userId: string) => {
    if (backendEnabled && isLoggedIn) {
      await adminApi.deleteUser(userId);
    }
  };

  const updateUserByAdmin = async (userId: string, data: { name?: string; email?: string; password?: string }): Promise<User> => {
    if (backendEnabled && isLoggedIn) {
      return adminApi.updateUser(userId, data);
    }
    return user as User;
  };

  const getUserDiagnoses = async (userId: string): Promise<Record<string, unknown>[]> => {
    if (backendEnabled && isLoggedIn) {
      return adminApi.getUserDiagnoses(userId);
    }
    return [];
  };

  const getAllPostsAdmin = async (): Promise<Record<string, unknown>[]> => {
    if (backendEnabled && isLoggedIn) {
      return adminApi.getAllPosts();
    }
    return posts as unknown as Record<string, unknown>[];
  };

  const deleteAnyPost = async (postId: string): Promise<void> => {
    if (backendEnabled && isLoggedIn) {
      await adminApi.deleteAnyPost(postId);
    }
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  // ─── Legacy helper (checkUser) ────────────────────────────
  const checkUser = (_email: string): User | null => user;

  return (
    <AuthContext.Provider
      value={{
        isLoggedIn, user, isLoading, login, logout, updateUser, updateAccountEmail, updateAccountPassword,
        trackedPlants, addTrackedPlant, updateTrackedPlant, deleteTrackedPlant,
        farms, addFarm, updateFarm, deleteFarm,
        diagnosisHistory, addDiagnosisToHistory,
        posts, addPost, likePost, addComment,
        transactions, addTransaction, deleteTransaction,
        getAdminStats, getAllUsers, deleteUser, updateUserByAdmin, getUserDiagnoses, getAllPostsAdmin, deleteAnyPost, checkUser,
        refreshUserData: loadUserDataFromBackend,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
