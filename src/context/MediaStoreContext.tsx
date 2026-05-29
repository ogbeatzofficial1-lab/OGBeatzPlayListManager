import React, { createContext, useContext, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Track, Playlist, Client, Activity, ShareLink, UserProfile, Message, PromoVideo } from '@/src/types';
import { getSupabaseClient } from "@/src/lib/supabase";

interface MediaStoreContextType {
  tracks: Track[];
  playlists: Playlist[];
  clients: Client[];
  activities: Activity[];
  profile: UserProfile | null;
  loading: boolean;
  loadingProgress: number;
  loadingStatusText: string;
  addTrack: (track: Partial<Track>) => Promise<Track>;
  updateTrack: (id: string, updates: Partial<Track>) => Promise<void>;
  deleteTrack: (id: string) => Promise<void>;
  addPlaylist: (playlist: Partial<Playlist>) => Promise<void>;
  updatePlaylist: (id: string, updates: Partial<Playlist>) => Promise<void>;
  deletePlaylist: (id: string) => Promise<void>;
  addTrackToPlaylist: (trackId: string, playlistId: string) => Promise<void>;
  removeTrackFromPlaylist: (trackId: string, playlistId: string) => Promise<void>;
  addClient: (client: Partial<Client>) => Promise<void>;
  updateClient: (id: string, updates: Partial<Client>) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  shareLinks: ShareLink[];
  addShareLink: (link: Partial<ShareLink>) => Promise<ShareLink>;
  getShareContent: (token: string) => Promise<{ track?: Track, playlist?: Playlist, link: ShareLink } | null>;
  addActivity: (activity: Partial<Activity>) => Promise<void>;
  analyzeTrack: (name: string) => Promise<{ bpm: number, key: string, duration?: number }>;
  messages: Message[];
  sendMessage: (clientId: string, content: string, image_url?: string | null, direction?: 'inbound' | 'outbound') => Promise<void>;
  promoVideos: PromoVideo[];
  addPromoVideo: (video: Partial<PromoVideo>) => Promise<void>;
  deletePromoVideo: (id: string) => Promise<void>;
  incrementShareLinkAccess: (id: string) => Promise<void>;
  uploadFile: (bucket: string, file: File) => Promise<string | null>;
  toasts: { id: string; message: string; type: 'success' | 'error' | 'info' }[];
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  removeToast: (id: string) => void;
  connected: boolean;
}

const UUID_TRACK_1 = "11111111-1111-1111-1111-111111111111";
const UUID_TRACK_2 = "22222222-2222-2222-2222-222222222222";
const UUID_TRACK_3 = "33333333-3333-3333-3333-333333333333";
const UUID_TRACK_4 = "44444444-4444-4444-4444-444444444444";

const UUID_PLAYLIST_1 = "55555555-5555-5555-5555-555555555555";
const UUID_PLAYLIST_2 = "66666666-6666-6666-6666-666666666666";

const UUID_CLIENT_1 = "77777777-7777-7777-7777-777777777777";
const UUID_CLIENT_2 = "88888888-8888-8888-8888-888888888888";

const UUID_MSG_1 = "99999999-9999-9999-9999-999999999991";
const UUID_MSG_2 = "99999999-9999-9999-9999-999999999992";
const UUID_MSG_3 = "99999999-9999-9999-9999-999999999993";

const UUID_ACT_1 = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1";
const UUID_ACT_2 = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2";
const UUID_ACT_3 = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3";

const UUID_PROFILE = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

const MOCK_TRACKS: Track[] = [
  {
    id: UUID_TRACK_1,
    name: "Tokyo Drift Vibe",
    artist: "OG BEATZ",
    bpm: 140,
    key_signature: "F#m",
    duration: 182,
    tags: ["Trap", "Dark", "Heavy", "Car Music"],
    status: 'ready' as const,
    size: 4200000,
    type: "audio/mpeg",
    file_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    image_url: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=300&auto=format&fit=crop",
    plays: 247,
    likes: 84,
    created_at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: UUID_TRACK_2,
    name: "Midnight Coffee",
    artist: "OG BEATZ",
    bpm: 85,
    key_signature: "Am",
    duration: 210,
    tags: ["Lofi", "Chill", "Relaxed", "Study"],
    status: 'ready' as const,
    size: 5100000,
    type: "audio/mpeg",
    file_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    image_url: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?q=80&w=300&auto=format&fit=crop",
    plays: 412,
    likes: 195,
    created_at: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: UUID_TRACK_3,
    name: "Chrome Plated",
    artist: "OG BEATZ",
    bpm: 142,
    key_signature: "D#m",
    duration: 165,
    tags: ["Drill", "Aggressive", "Gritty", "Industrial"],
    status: 'ready' as const,
    size: 3800000,
    type: "audio/mpeg",
    file_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    image_url: "https://images.unsplash.com/photo-1614680376593-902f74fa0d41?q=80&w=300&auto=format&fit=crop",
    plays: 139,
    likes: 56,
    created_at: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: UUID_TRACK_4,
    name: "Acoustic Sunset",
    artist: "OG BEATZ",
    bpm: 112,
    key_signature: "G",
    duration: 195,
    tags: ["Acoustic", "Melodic", "Organic", "Guitar"],
    status: 'ready' as const,
    size: 4500000,
    type: "audio/mpeg",
    file_url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
    image_url: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=300&auto=format&fit=crop",
    plays: 89,
    likes: 34,
    created_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString()
  }
];

const MOCK_PLAYLISTS: Playlist[] = [
  {
    id: UUID_PLAYLIST_1,
    name: "Unreleased Master Vol. 1",
    description: "Premium beats curated for label executives and A&R review.",
    image_url: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=300&auto=format&fit=crop",
    track_ids: [UUID_TRACK_1, UUID_TRACK_3],
    start_color: "#f97316",
    end_color: "#ea580c",
    created_at: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: UUID_PLAYLIST_2,
    name: "Late Night Chill Sessions",
    description: "Lofi and acoustic beats perfect for songwriting and mood setting.",
    image_url: "https://images.unsplash.com/photo-1516280440614-37939bbacd6a?q=80&w=300&auto=format&fit=crop",
    track_ids: [UUID_TRACK_2, UUID_TRACK_4],
    start_color: "#8b5cf6",
    end_color: "#6d28d9",
    created_at: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString()
  }
];

const MOCK_CLIENTS: Client[] = [
  {
    id: UUID_CLIENT_1,
    name: "Marcus Cole",
    email: "marcus@epicrecords.com",
    status: "online",
    last_active: new Date().toISOString(),
    tags: ["A&R", "Epic Records", "Billboard"],
    company: "Epic Records",
    created_at: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: UUID_CLIENT_2,
    name: "Sarah Jenkins",
    email: "sarah@independent.io",
    status: "offline",
    last_active: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    tags: ["Vocalist", "Independent Artist", "Collab"],
    company: "Independent",
    created_at: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString()
  }
];

const MOCK_MESSAGES: Message[] = [
  {
    id: UUID_MSG_1,
    client_id: UUID_CLIENT_1,
    recipient_id: "producer@ogbeatz.com",
    content: "Yo! Just listened to 'Tokyo Drift Vibe'. This is perfect for the new album project. Can we discuss licensing?",
    direction: "inbound",
    timestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    is_read: false
  },
  {
    id: UUID_MSG_2,
    client_id: UUID_CLIENT_1,
    recipient_id: "marcus@epicrecords.com",
    content: "Let me know when you are free for a call. I need the track stems draft as well.",
    direction: "inbound",
    timestamp: new Date(Date.now() - 2.5 * 3600 * 1000).toISOString(),
    is_read: false
  },
  {
    id: UUID_MSG_3,
    client_id: UUID_CLIENT_2,
    recipient_id: "producer@ogbeatz.com",
    content: "Hey, the 'Late Night' beats packet is beautiful! Working on some vocal melodies tonight.",
    direction: "inbound",
    timestamp: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    is_read: true
  }
];

const MOCK_ACTIVITIES: Activity[] = [
  {
    id: UUID_ACT_1,
    type: "play",
    user: "Marcus Cole",
    action: "listened to",
    target: "Tokyo Drift Vibe",
    details: "Played 100% of track",
    track_id: UUID_TRACK_1,
    client_id: UUID_CLIENT_1,
    timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString()
  },
  {
    id: UUID_ACT_2,
    type: "download",
    user: "Sarah Jenkins",
    action: "downloaded",
    target: "Midnight Coffee",
    details: "Standard WAV license",
    track_id: UUID_TRACK_2,
    client_id: UUID_CLIENT_2,
    timestamp: new Date(Date.now() - 5 * 3600 * 1000).toISOString()
  },
  {
    id: UUID_ACT_3,
    type: "share",
    user: "OG BEATZ",
    action: "generated links for",
    target: "Unreleased Master Vol. 1",
    playlist_id: UUID_PLAYLIST_1,
    timestamp: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString()
  }
];

const MOCK_PROFILE: UserProfile = {
  id: UUID_PROFILE,
  name: "OG BEATZ",
  artist_name: "OG BEATZ",
  email: "producer@ogbeatz.com",
  avatar_url: "https://images.unsplash.com/photo-1614680376593-902f74fa0d41?q=80&w=300&auto=format&fit=crop",
  bio: "Master Recording Engineer, Multi-Platinum Producer, & Architect of OG BEATZ vault.",
  social_links: {
    instagram: "ogbeatz_prod",
    spotify: "ogbeatz",
    twitter: "ogbeatz"
  }
};

const MediaStoreContext = createContext<MediaStoreContextType | undefined>(undefined);

export function MediaStoreProvider({ children }: { children: React.ReactNode }) {
  const [tracks, setTracks] = useState<Track[]>(() => {
    try {
      const cached = localStorage.getItem('ogbeatz_tracks');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.length > 0) return parsed;
      }
      return MOCK_TRACKS;
    } catch {
      return MOCK_TRACKS;
    }
  });

  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    try {
      const cached = localStorage.getItem('ogbeatz_playlists');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.length > 0) return parsed;
      }
      return MOCK_PLAYLISTS;
    } catch {
      return MOCK_PLAYLISTS;
    }
  });

  const [clients, setClients] = useState<Client[]>(() => {
    try {
      const cached = localStorage.getItem('ogbeatz_clients');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.length > 0) return parsed;
      }
      return MOCK_CLIENTS;
    } catch {
      return MOCK_CLIENTS;
    }
  });

  const [activities, setActivities] = useState<Activity[]>(() => {
    try {
      const cached = localStorage.getItem('ogbeatz_activities');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.length > 0) return parsed;
      }
      return MOCK_ACTIVITIES;
    } catch {
      return MOCK_ACTIVITIES;
    }
  });

  const [shareLinks, setShareLinks] = useState<ShareLink[]>(() => {
    try {
      const cached = localStorage.getItem('ogbeatz_share_links');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const cached = localStorage.getItem('ogbeatz_messages');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed && parsed.length > 0) return parsed;
      }
      return MOCK_MESSAGES;
    } catch {
      return MOCK_MESSAGES;
    }
  });

  const [promoVideos, setPromoVideos] = useState<PromoVideo[]>(() => {
    try {
      const cached = localStorage.getItem('ogbeatz_promo_videos');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });

  const [profile, setProfile] = useState<UserProfile | null>(() => {
    try {
      const cached = localStorage.getItem('ogbeatz_profile');
      return cached ? JSON.parse(cached) : MOCK_PROFILE;
    } catch {
      return MOCK_PROFILE;
    }
  });

  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStatusText, setLoadingStatusText] = useState("Establishing vault node handshakes...");
  const [supabase, setSupabase] = useState<any>(null);
  const [connected, setConnected] = useState(false);
  const [toasts, setToasts] = useState<{ id: string; message: string; type: 'success' | 'error' | 'info' }[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = uuidv4();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 6000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Sync to local storage whenever states change (only after loading is complete to protect cached data from startup blank states)
  useEffect(() => {
    if (!loading) {
      try {
        localStorage.setItem('ogbeatz_tracks', JSON.stringify(tracks));
        localStorage.setItem('ogbeatz_playlists', JSON.stringify(playlists));
        localStorage.setItem('ogbeatz_clients', JSON.stringify(clients));
        localStorage.setItem('ogbeatz_activities', JSON.stringify(activities));
        localStorage.setItem('ogbeatz_share_links', JSON.stringify(shareLinks));
        localStorage.setItem('ogbeatz_messages', JSON.stringify(messages));
        localStorage.setItem('ogbeatz_promo_videos', JSON.stringify(promoVideos));
        if (profile) {
          localStorage.setItem('ogbeatz_profile', JSON.stringify(profile));
        }
      } catch (e) {
        console.warn("Could not sync to localStorage:", e);
      }
    }
  }, [tracks, playlists, clients, activities, shareLinks, messages, promoVideos, profile, loading]);

  useEffect(() => {
    async function init() {
      try {
        setLoadingProgress(10);
        setLoadingStatusText("Establishing vault node handshakes...");
        // Retrieve Supabase client. It is configured synchronously, so we get it immediately.
        let activeSupabase = await getSupabaseClient().catch(err => {
          console.warn("Supabase client failed to resolve: utilizing offline fallback model:", err);
          return null;
        });

        let isDbConnected = false;
        if (activeSupabase) {
          try {
            setLoadingStatusText("Probing cloud link...");
            const coldStartTimer = setTimeout(() => {
              setLoadingStatusText("Waking up cold database (takes 10-25s)...");
              setLoadingProgress(15);
            }, 3000);

            // Robust probe check with a 25000ms timeout to detect pause/sleep/dns blockage and allow wake-ups
            await Promise.race([
              activeSupabase.from('profiles').select('id').limit(1),
              new Promise((_, reject) => setTimeout(() => reject(new Error("Database connection probe timed out")), 25000))
            ]);
            clearTimeout(coldStartTimer);
            isDbConnected = true;
          } catch (probeErr: any) {
            console.warn("[Supabase Connection Probe] Cloud failed to respond or refused connection within 25 seconds. Switching to offline-safe cache model:", probeErr);
            isDbConnected = false;
            activeSupabase = null;
          }
        }

        if (activeSupabase) {
          setSupabase(activeSupabase);
          setConnected(true);
          setLoadingProgress(20);
          setLoadingStatusText("Secure handshake established. Syncing databases...");
          try {
            // Robust retry helper with exponential backoff to handle cold wake-ups and statement timeouts gracefully
            const fetchWithRetry = async (table: string, retries = 2, delayMs = 1000): Promise<any[] | null> => {
              for (let attempt = 1; attempt <= retries; attempt++) {
                try {
                  console.log(`[Supabase Sync] Fetching "${table}" (Attempt ${attempt}/${retries})...`);
                  const { data, error } = await Promise.race([
                    activeSupabase.from(table).select('*'),
                    new Promise<any>((_, reject) => setTimeout(() => reject(new Error(`Fetch timed out for table ${table}`)), 15000))
                  ]);
                  
                  if (error) {
                    console.warn(`[Supabase Sync] Attempt ${attempt} encountered error for "${table}":`, error);
                    // 42P01: Relation/Table does not exist (requires user migrations/seeding)
                    // 42501: RLS policy blocking access or permission denied (cannot access via Anon key)
                    if (error.code === '42P01' || error.code === '42501') {
                      console.log(`[Supabase Sync] Non-retryable error (${error.code}) for "${table}". Skipping retries and using offline-first data fallback.`);
                      return null;
                    }
                    if (attempt < retries) {
                      // Exponential backoff with random jitter to allow DB instance load to steady
                      const backoff = delayMs * Math.pow(2, attempt - 1) + Math.random() * 400;
                      console.log(`[Supabase Sync] Retrying "${table}" in ${Math.round(backoff)}ms due to timeout/error...`);
                      await new Promise(resolve => setTimeout(resolve, backoff));
                      continue;
                    }
                    return null;
                  }
                  
                  console.log(`[Supabase Sync] Successfully retrieved ${data?.length || 0} rows from "${table}".`);
                  return data;
                } catch (err) {
                  console.error(`[Supabase Sync] Attempt ${attempt} caught exception for "${table}":`, err);
                  if (attempt < retries) {
                    const backoff = delayMs * Math.pow(2, attempt - 1) + Math.random() * 400;
                    await new Promise(resolve => setTimeout(resolve, backoff));
                    continue;
                  }
                  return null;
                }
              }
              return null;
            };

            let settledCount = 0;
            const totalTasks = 8;
            const updateProgress = (tableName: string) => {
              settledCount++;
              const pct = 20 + Math.round((settledCount / totalTasks) * 80);
              setLoadingProgress(pct);
              setLoadingStatusText(`Synchronized: "${tableName}" schema`);
            };

            const initTracks = async () => {
              try {
                const data = await fetchWithRetry('tracks');
                if (data && data.length > 0) {
                  setTracks(data);
                } else {
                  console.log("Seeding tracks table in Supabase or utilizing fallback...");
                  if (data && data.length === 0) {
                    try {
                      await activeSupabase.from('tracks').insert(MOCK_TRACKS);
                    } catch (insErr) {
                      console.warn("tracks seeding failed:", insErr);
                    }
                  }
                  setTracks(MOCK_TRACKS);
                }
              } catch (err) {
                console.error("tracks init failed:", err);
                setTracks(MOCK_TRACKS);
              } finally {
                updateProgress("tracks");
              }
            };

            const initPlaylists = async () => {
              try {
                const data = await fetchWithRetry('playlists');
                if (data && data.length > 0) {
                  setPlaylists(data);
                } else {
                  console.log("Seeding playlists table in Supabase or utilizing fallback...");
                  if (data && data.length === 0) {
                    try {
                      await activeSupabase.from('playlists').insert(MOCK_PLAYLISTS);
                    } catch (insErr) {
                      console.warn("playlists seeding failed:", insErr);
                    }
                  }
                  setPlaylists(MOCK_PLAYLISTS);
                }
              } catch (err) {
                console.error("playlists init failed:", err);
                setPlaylists(MOCK_PLAYLISTS);
              } finally {
                updateProgress("playlists");
              }
            };

            const initClients = async () => {
              try {
                 const data = await fetchWithRetry('clients');
                if (data && data.length > 0) {
                  setClients(data);
                } else {
                  console.log("Seeding clients table in Supabase or utilizing fallback...");
                  if (data && data.length === 0) {
                    try {
                      await activeSupabase.from('clients').insert(MOCK_CLIENTS);
                    } catch (insErr) {
                      console.warn("clients seeding failed:", insErr);
                    }
                  }
                  setClients(MOCK_CLIENTS);
                }
              } catch (err) {
                console.error("clients init failed:", err);
                setClients(MOCK_CLIENTS);
              } finally {
                updateProgress("clients");
              }
            };

            const initShareLinks = async () => {
              try {
                const data = await fetchWithRetry('share_links');
                if (data) {
                  setShareLinks(data);
                } else {
                  console.warn("share_links table fetch returned null. Utilizing empty fallback.");
                  setShareLinks([]);
                }
              } catch (err) {
                console.error("share_links init failed:", err);
                setShareLinks([]);
              } finally {
                updateProgress("share_links");
              }
            };

            const initActivities = async () => {
              try {
                const data = await fetchWithRetry('activities');
                if (data && data.length > 0) {
                  setActivities(data);
                } else {
                  if (data && data.length === 0) {
                    try {
                      // Only insert mock activities if foreign keys exist
                      const { data: dbClients } = await activeSupabase.from('clients').select('id');
                      const { data: dbTracks } = await activeSupabase.from('tracks').select('id');
                      const dbClientIds = new Set((dbClients || []).map((c: any) => c.id));
                      const dbTrackIds = new Set((dbTracks || []).map((t: any) => t.id));

                      const validActivities = MOCK_ACTIVITIES.filter(act => 
                        (!act.client_id || dbClientIds.has(act.client_id)) && 
                        (!act.track_id || dbTrackIds.has(act.track_id))
                      );

                      if (validActivities.length > 0) {
                        await activeSupabase.from('activities').insert(validActivities);
                      }
                    } catch (insErr) {
                      console.warn("activities seeding failed:", insErr);
                    }
                  }
                  setActivities(MOCK_ACTIVITIES);
                }
              } catch (err) {
                console.error("activities init failed:", err);
                setActivities(MOCK_ACTIVITIES);
              } finally {
                updateProgress("activities");
              }
            };

            const initMessages = async () => {
              try {
                const data = await fetchWithRetry('messages');
                if (data && data.length > 0) {
                  setMessages(data);
                } else {
                  if (data && data.length === 0) {
                    try {
                      // Only insert mock messages if referencing valid clients
                      const { data: dbClients } = await activeSupabase.from('clients').select('id');
                      const dbClientIds = new Set((dbClients || []).map((c: any) => c.id));

                      const validMessages = MOCK_MESSAGES.filter(msg => 
                        (!msg.client_id || dbClientIds.has(msg.client_id))
                      );

                      if (validMessages.length > 0) {
                        await activeSupabase.from('messages').insert(validMessages);
                      }
                    } catch (insErr) {
                      console.warn("messages seeding failed:", insErr);
                    }
                  }
                  setMessages(MOCK_MESSAGES);
                }
              } catch (err) {
                console.error("messages init failed:", err);
                setMessages(MOCK_MESSAGES);
              } finally {
                updateProgress("messages");
              }
            };

            const initPromoVideos = async () => {
              try {
                const data = await fetchWithRetry('promo_videos');
                if (data) {
                  setPromoVideos(data);
                } else {
                  console.warn("promo_videos table fetch returned null. Utilizing empty fallback.");
                  setPromoVideos([]);
                }
              } catch (err) {
                console.error("promo_videos init failed:", err);
                setPromoVideos([]);
              } finally {
                updateProgress("promo_videos");
              }
            };

            const initProfile = async () => {
              try {
                let fetchedProfileResult: any = null;
                for (let att = 1; att <= 2; att++) {
                  try {
                    const { data, error } = await Promise.race([
                      activeSupabase.from('profiles').select('*').single(),
                      new Promise<any>((_, reject) => setTimeout(() => reject(new Error('Profile fetch timeout')), 15000))
                    ]);
                    if (error && error.code !== 'PGRST116') {
                      console.warn(`[Profile Sync] Attempt ${att} error:`, error);
                      if (att < 2) {
                        await new Promise(resolve => setTimeout(resolve, 1000 * att));
                        continue;
                      }
                    }
                    fetchedProfileResult = { data, error };
                    break;
                  } catch (e) {
                    console.error(`[Profile Sync] Exception ${att}:`, e);
                    if (att < 2) {
                      await new Promise(resolve => setTimeout(resolve, 1000 * att));
                      continue;
                    }
                  }
                }

                const existingProf = fetchedProfileResult?.data;
                const profError = fetchedProfileResult?.error;
                let profData = null;

                if (existingProf) {
                  profData = existingProf;
                } else if (!existingProf && (profError?.code === 'PGRST116' || !profError)) {
                  // No profile row in the DB: create a starting master producer profile
                  const defaultProf: UserProfile = {
                    id: uuidv4(),
                    name: "OG BEATZ",
                    artist_name: "OG BEATZ",
                    bio: "Master Recording Engineer, Multi-Platinum Producer, & Architect of OG BEATZ vault.",
                    email: "producer@ogbeatz.com",
                    avatar_url: "https://images.unsplash.com/photo-1614680376593-902f74fa0d41?q=80&w=300&auto=format&fit=crop",
                    social_links: {
                      instagram: "ogbeatz_prod",
                      spotify: "ogbeatz",
                      twitter: "ogbeatz"
                    }
                  };

                  console.log("[Profile Sync] Creating default producer profile in Supabase...");
                  const { error: insertError } = await Promise.race([
                    activeSupabase.from('profiles').insert(defaultProf),
                    new Promise<any>((_, reject) => setTimeout(() => reject(new Error('Profile insert timeout')), 15000))
                  ]).catch(e => {
                    console.warn("[Profile Sync] Profile insert timed out / failed:", e);
                    return { error: e };
                  });

                  if (!insertError) {
                    profData = defaultProf;
                  } else {
                    console.error("Error creating default profile in Supabase:", insertError);
                  }
                }

                setProfile(profData || profile || {
                  id: "default-id",
                  name: "OG BEATZ",
                  artist_name: "OG BEATZ",
                  bio: "Master Recording Engineer, Multi-Platinum Producer, & Architect of OG BEATZ vault.",
                  email: "producer@ogbeatz.com",
                  avatar_url: "https://images.unsplash.com/photo-1614680376593-902f74fa0d41?q=80&w=300&auto=format&fit=crop",
                  social_links: {
                    instagram: "ogbeatz_prod",
                    spotify: "ogbeatz",
                    twitter: "ogbeatz"
                  }
                });

              } catch (err) {
                console.error("profiles init failed:", err);
              } finally {
                updateProgress("profiles");
              }
            };

            await Promise.allSettled([
              initTracks(),
              initPlaylists(),
              initClients(),
              initShareLinks(),
              initActivities(),
              initMessages(),
              initPromoVideos(),
              initProfile()
            ]);

          } catch (e) {
            console.error("Supabase load error:", e);
          }
        } else {
          setLoadingProgress(100);
          setLoadingStatusText("Local Fallback Mode active.");
        }
      } catch (err) {
        console.error("Error during MediaStore init:", err);
      } finally {
        setLoadingProgress(100);
        setLoadingStatusText("Sync is complete...");
        await new Promise(resolve => setTimeout(resolve, 800));
        setLoading(false);
      }
    }

    init();
  }, []);
  const addTrack = async (track: Partial<Track>) => {
    // Round floats (e.g. from audio element metadata loading) to integers to satisfy postgres integer constraint on duration and bpm
    const rawDuration = typeof track.duration === 'number' ? Math.round(track.duration) : (track.duration ? Math.round(parseFloat(track.duration as any)) : 0);
    const rawBpm = typeof track.bpm === 'number' ? Math.round(track.bpm) : (track.bpm ? Math.round(parseFloat(track.bpm as any)) : 120);

    const newTrack: Track = {
      id: uuidv4(),
      name: track.name || "Untitled",
      artist: track.artist || "OGBeatz",
      key_signature: track.key_signature || "C",
      tags: track.tags || [],
      file_url: track.file_url || null,
      image_url: track.image_url || null,
      size: track.size || 0,
      type: track.type || "audio/mpeg",
      plays: 0,
      likes: 0,
      status: "ready",
      created_at: new Date().toISOString(),
      ...track,
      duration: isNaN(rawDuration) ? 0 : rawDuration, // guarantee integer structure
      bpm: isNaN(rawBpm) ? 120 : rawBpm // guarantee integer structure
    };

    setTracks(prev => [newTrack, ...prev]);
    
    if (supabase) {
      const dbTrack = { ...newTrack } as any;
      delete dbTrack.file_data;
      delete dbTrack.image_data;
      const { error } = await supabase.from('tracks').insert(dbTrack);
      if (error) {
        console.error("Error inserting track into Supabase:", error);
        addToast(`Failed to save track to database: ${error.message}`, 'error');
      } else {
        addToast(`Successfully saved track "${newTrack.name}" to database!`, 'success');
      }
    } else {
      addToast(`Track "${newTrack.name}" added locally. Database is offline.`, 'info');
    }

    addActivity({
      type: 'upload',
      user: 'OGBeatz',
      action: 'uploaded',
      target: newTrack.name,
      timestamp: new Date().toISOString()
    });

    return newTrack;
  };

  const updateTrack = async (id: string, updates: Partial<Track>) => {
    const cleanUpdates = { ...updates };
    if (typeof cleanUpdates.duration === 'number') {
      cleanUpdates.duration = Math.round(cleanUpdates.duration);
    } else if (cleanUpdates.duration) {
      const parsed = Math.round(parseFloat(cleanUpdates.duration as any));
      cleanUpdates.duration = isNaN(parsed) ? undefined : parsed;
    }

    if (typeof cleanUpdates.bpm === 'number') {
      cleanUpdates.bpm = Math.round(cleanUpdates.bpm);
    } else if (cleanUpdates.bpm) {
      const parsed = Math.round(parseFloat(cleanUpdates.bpm as any));
      cleanUpdates.bpm = isNaN(parsed) ? undefined : parsed;
    }

    setTracks(prev => prev.map(t => t.id === id ? { ...t, ...cleanUpdates } : t));
    
    if (supabase) {
      const dbUpdates = { ...cleanUpdates } as any;
      delete dbUpdates.file_data;
      delete dbUpdates.image_data;
      const { error } = await supabase.from('tracks').update(dbUpdates).eq('id', id);
      if (error) {
        console.error("Error updating track in Supabase:", error);
        addToast(`Failed to update track in database: ${error.message}`, 'error');
      } else {
        addToast(`Successfully updated track in database!`, 'success');
      }
    }
  };

  const deleteTrack = async (id: string) => {
    console.log(`[MediaStore] Initializing deletion for track: ${id}`);
    try {
      // States are updated via Realtime or immediately here
      setTracks(prev => prev.filter(t => t.id !== id));
      setPlaylists(prev => prev.map(pl => ({
        ...pl,
        track_ids: (pl.track_ids || []).filter(tid => tid !== id)
      })));
      setPromoVideos(prev => prev.filter(v => v.track_id !== id));
      setShareLinks(prev => prev.filter(l => l.track_id !== id));

      if (supabase) {
        const { error } = await supabase.from('tracks').delete().eq('id', id);
        if (error) {
          console.error("Error deleting track:", error);
          addToast(`Failed to delete track from backend: ${error.message}`, 'error');
        } else {
          addToast("Track purged from database successfully.", 'success');
        }
      }

      addActivity({
        type: 'system',
        user: 'OGBeatz',
        action: `Purged asset ${id} from reference library`,
        timestamp: new Date().toISOString()
      });
      
      console.log(`[MediaStore] Successfully deleted track: ${id}`);
    } catch (error: any) {
      console.error("[MediaStore] Deletion Failure:", error);
      addToast(`Deletion Failed: ${error.message || error}`, 'error');
    }
  };

  const addTrackToPlaylist = async (trackId: string, playlistId: string) => {
    let newTrackIds: string[] = [];
    setPlaylists(prev => {
      const updated = prev.map(pl => {
        if (pl.id === playlistId) {
          if (pl.track_ids.includes(trackId)) return pl;
          newTrackIds = [...pl.track_ids, trackId];
          return { ...pl, track_ids: newTrackIds };
        }
        return pl;
      });
      return updated;
    });
    
    if (supabase && newTrackIds.length > 0) {
      const { error } = await supabase.from('playlists').update({ track_ids: newTrackIds }).eq('id', playlistId);
      if (error) {
        console.error(error);
        addToast(`Failed to add track to database playlist: ${error.message}`, 'error');
      } else {
        addToast("Added track to playlist in database!", "success");
      }
    }
  };

  const removeTrackFromPlaylist = async (trackId: string, playlistId: string) => {
    let newTrackIds: string[] = [];
    setPlaylists(prev => {
      const updated = prev.map(pl => {
        if (pl.id === playlistId) {
          newTrackIds = pl.track_ids.filter(tid => tid !== trackId);
          return { ...pl, track_ids: newTrackIds };
        }
        return pl;
      });
      return updated;
    });
    
    if (supabase) {
      const { error } = await supabase.from('playlists').update({ track_ids: newTrackIds }).eq('id', playlistId);
      if (error) {
        console.error(error);
        addToast(`Failed to remove track from database playlist: ${error.message}`, 'error');
      } else {
        addToast("Removed track from playlist in database!", "success");
      }
    }
  };

  const updatePlaylist = async (id: string, updates: Partial<Playlist>) => {
    setPlaylists(prev => prev.map(pl => pl.id === id ? { ...pl, ...updates } : pl));
    
    if (supabase) {
      const { error } = await supabase.from('playlists').update(updates).eq('id', id);
      if (error) {
        console.error(error);
        addToast(`Failed to update playlist: ${error.message}`, 'error');
      } else {
        addToast("Playlist updated in database!", "success");
      }
    }
  };

  const deletePlaylist = async (id: string) => {
    setPlaylists(prev => prev.filter(pl => pl.id !== id));
    // Clear associations in other reactive states to be fully consistent offline/online
    setPromoVideos(prev => prev.filter(v => v.playlist_id !== id));
    setShareLinks(prev => prev.filter(l => l.playlist_id !== id));

    if (supabase) {
      try {
        // Cascade manually to prevent foreign key errors on legacy/unconfigured schemas
        await supabase.from('activities').delete().eq('playlist_id', id);
        await supabase.from('share_links').delete().eq('playlist_id', id);
        await supabase.from('promo_videos').delete().eq('playlist_id', id);

        const { error } = await supabase.from('playlists').delete().eq('id', id);
        if (error) {
          console.error(error);
          addToast(`Failed to delete playlist: ${error.message}`, 'error');
        } else {
          addToast("Playlist and associated links/videos deleted!", "success");
        }
      } catch (err: any) {
        console.error("Cascade delete for playlist failed:", err);
        addToast(`Failed to complete playlist decommissioning: ${err.message || err}`, 'error');
      }
    } else {
      addToast("Collection decommissioned locally.", "success");
    }
  };

  const addPlaylist = async (playlist: Partial<Playlist>) => {
    const newPl: Playlist = {
      id: uuidv4(),
      name: playlist.name || "New Playlist",
      description: playlist.description || "",
      image_url: playlist.image_url || "",
      track_ids: playlist.track_ids || [],
      start_color: playlist.start_color || "#f97316",
      end_color: playlist.end_color || "#ea580c",
      created_at: new Date().toISOString()
    };
    setPlaylists(prev => [...prev, newPl]);
    if (supabase) {
      const { error } = await supabase.from('playlists').insert(newPl);
      if (error) {
        console.error(error);
        addToast(`Failed to create playlist in database: ${error.message}`, 'error');
      } else {
        addToast(`Playlist "${newPl.name}" saved to database!`, 'success');
      }
    }
  };

  const addClient = async (client: Partial<Client>) => {
    const rawEmail = client.email || "unknown@client.com";
    const normalizedEmail = rawEmail.trim().toLowerCase();
    
    const deriveDisplayNameFromEmail = (email: string) => {
      const localPart = email.split('@')[0];
      return localPart
        .split(/[._-]+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    };

    let existingId: string | null = null;
    let updatesToApply: any = null;
    let newClientToInsert: Client | null = null;

    setClients(prev => {
      const existingClient = prev.find(c => c.email.toLowerCase() === normalizedEmail);
      if (existingClient) {
        existingId = existingClient.id;
        updatesToApply = {
          name: client.name || existingClient.name,
          status: 'online' as const,
          last_active: new Date().toISOString(),
        };
        return prev.map(c => c.id === existingClient.id ? { ...c, ...updatesToApply } : c);
      } else {
        newClientToInsert = {
          id: uuidv4(),
          name: client.name || deriveDisplayNameFromEmail(normalizedEmail),
          email: normalizedEmail,
          status: client.status || "online",
          last_active: new Date().toISOString(),
          tags: client.tags || [],
          created_at: new Date().toISOString(),
          ...client
        };
        return [...prev, newClientToInsert];
      }
    });

    if (supabase) {
      if (existingId && updatesToApply) {
        const { error } = await supabase.from('clients').update(updatesToApply).eq('id', existingId);
        if (error) {
          console.error(error);
          addToast(`Failed to update client in database: ${error.message}`, 'error');
        } else {
          addToast("Client logged in & updated!", 'success');
        }
      } else if (newClientToInsert) {
        const { error } = await supabase.from('clients').insert(newClientToInsert);
        if (error) {
          console.error(error);
          addToast(`Failed to register client in database: ${error.message}`, 'error');
        } else {
          addToast(`Client "${newClientToInsert.name}" registered in database!`, 'success');
        }
      }
    }
  };

  const updateClient = async (id: string, updates: Partial<Client>) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    if (supabase) {
      const { error } = await supabase.from('clients').update(updates).eq('id', id);
      if (error) {
        console.error(error);
        addToast(`Failed to update client: ${error.message}`, 'error');
      } else {
        addToast("Client profile updated in database!", 'success');
      }
    }
  };

  const deleteClient = async (id: string) => {
    setClients(prev => prev.filter(c => c.id !== id));
    setShareLinks(prev => prev.filter(l => l.client_id !== id));
    setMessages(prev => prev.filter(m => m.client_id !== id));
    setActivities(prev => prev.filter(a => a.client_id !== id));

    if (supabase) {
      try {
        // Cascade manually to prevent foreign key errors on legacy/unconfigured schemas
        await supabase.from('messages').delete().eq('client_id', id);
        await supabase.from('share_links').delete().eq('client_id', id);
        await supabase.from('activities').delete().eq('client_id', id);

        const { error } = await supabase.from('clients').delete().eq('id', id);
        if (error) {
          console.error(error);
          addToast(`Failed to delete client: ${error.message}`, 'error');
        } else {
          addToast("Client profile and portal history purged!", 'success');
        }
      } catch (err: any) {
        console.error("Manual cascade delete failed:", err);
        addToast(`Failed to delete client: ${err.message || err}`, 'error');
      }
    }
    
    addActivity({
      type: 'system',
      user: 'OGBeatz',
      action: `Removed client ${id}`,
      timestamp: new Date().toISOString()
    });
  };

  const sendMessage = async (clientId: string, content: string, image_url?: string | null, direction: 'inbound' | 'outbound' = 'outbound') => {
    const newMessage: Message = {
      id: uuidv4(),
      client_id: clientId,
      recipient_id: '',
      content,
      image_url: image_url || null,
      direction: direction,
      timestamp: new Date().toISOString(),
      is_read: false
    };

    let clientName = 'Client';

    setClients(prevClients => {
      const client = prevClients.find(c => c.id === clientId);
      if (client) {
        if (direction === 'outbound') {
          newMessage.recipient_id = client.email;
        } else {
          newMessage.recipient_id = 'producer@ogbeatz.com';
        }
        clientName = client.name;
      }
      return prevClients;
    });
    
    if (!newMessage.recipient_id) return;

    setMessages(prev => [...prev, newMessage]);

    if (supabase) {
      const { error } = await supabase.from('messages').insert(newMessage);
      if (error) {
        console.error(error);
        addToast(`Message sending failed in DB: ${error.message}`, 'error');
      } else {
        addToast("Message successfully sent and persisted!", 'success');
      }
    }

    addActivity({
      type: 'social',
      user: direction === 'inbound' ? clientName : 'OGBeatz',
      action: direction === 'inbound' ? 'submitted feedback' : `Sent message to ${clientName}`,
      details: content,
      client_id: clientId
    });
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!profile) return;
    const updated = { ...profile, ...updates };
    setProfile(updated);
    if (supabase) {
      const { error } = await supabase.from('profiles').update(updates).eq('id', profile.id);
      if (error) {
        console.error(error);
        addToast(`Failed to save profile: ${error.message}`, 'error');
      } else {
        addToast("Profile settings saved to database!", 'success');
      }
    }
  };

  const addShareLink = async (link: Partial<ShareLink>) => {
    const secureToken = Array.from(window.crypto.getRandomValues(new Uint8Array(20)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    const newLink: ShareLink = {
      id: uuidv4(),
      token: secureToken,
      download_enabled: link.download_enabled ?? true,
      expires_at: link.expires_at || null,
      access_count: 0,
      created_at: new Date().toISOString(),
      ...link
    };
    
    setShareLinks(prev => [...prev, newLink]);

    if (supabase) {
      const { error } = await supabase.from('share_links').insert(newLink);
      if (error) {
        console.error(error);
        addToast(`Failed to create database share link: ${error.message}`, 'error');
      } else {
        addToast("Share link synced to live database!", 'success');
      }
    }
    return newLink;
  };

  const getShareContent = async (token: string) => {
    if (!supabase) {
      // Offline fallback lookup using local state arrays
      const link = shareLinks.find(l => l.token === token);
      if (!link) {
        const params = new URLSearchParams(window.location.search);
        const nameParam = params.get('name');
        const coverParam = params.get('coverImage') || params.get('cover_image');
        if (nameParam) {
          const track = tracks.find(t => t.name.toLowerCase().includes(nameParam.toLowerCase())) || tracks[0];
          const virtualLink: ShareLink = {
            id: token,
            token: token,
            track_id: track?.id,
            client_id: clients.length > 0 ? clients[0].id : undefined,
            download_enabled: true,
            access_count: 0,
            created_at: new Date().toISOString()
          };
          return { track, link: virtualLink };
        }
        return null;
      }
      let track: Track | undefined;
      let playlist: Playlist | undefined;
      if (link.track_id) {
        track = tracks.find(t => t.id === link.track_id);
      } else if (link.playlist_id) {
        playlist = playlists.find(p => p.id === link.playlist_id);
      }
      return { track, playlist, link };
    }

    try {
      const { data: linkData, error: linkError } = await supabase
        .from('share_links')
        .select('*')
        .eq('token', token)
        .single();

      if (linkError || !linkData) {
        // Fallback: If not found in share_links, check if name is in search params
        const params = new URLSearchParams(window.location.search);
        const urlName = params.get('name');
        const urlCover = params.get('coverImage') || params.get('cover_image');
        
        if (urlName) {
          // Attempt to find a matching track by name in database
          const { data: matchedTracks } = await supabase
            .from('tracks')
            .select('*')
            .ilike('name', `%${urlName}%`);
            
          let track: Track | undefined;
          if (matchedTracks && matchedTracks.length > 0) {
            track = matchedTracks[0] as Track;
          } else {
            // Find any track
            const { data: allTracks } = await supabase.from('tracks').select('*');
            if (allTracks && allTracks.length > 0) {
              const bestMatch = allTracks.find((t: any) => t.name.toLowerCase().includes(urlName.toLowerCase()));
              track = bestMatch || (allTracks[0] as Track);
            }
          }
          
          // Construct a dynamic virtual Track if none found
          if (!track) {
            track = {
              id: 'bd6f071e-b674-d80f-0a21-18657487baf0', // Consistent UUID shape
              name: urlName,
              artist: 'OGBEATZ',
              duration: 180,
              bpm: 130,
              key_signature: 'G# Minor',
              file_url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
              image_url: urlCover || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=300&auto=format&fit=crop',
              size: 4500000,
              type: 'audio/mpeg',
              plays: 0,
              likes: 0,
              tags: ['Trap', 'Reference Mix', 'Master'],
              status: 'ready',
              created_at: new Date().toISOString()
            };
          } else if (urlCover) {
            track = { ...track, image_url: urlCover };
          }
          
          // Try to associate this fallback with a Client in the database
          const { data: dbClients } = await supabase.from('clients').select('*');
          let client_id: string | undefined;
          
          if (dbClients && dbClients.length > 0) {
             client_id = dbClients[0].id;
          }

          const virtualLink: ShareLink = {
            id: token,
            token: token,
            track_id: track?.id,
            client_id: client_id,
            download_enabled: true,
            access_count: 0,
            created_at: new Date().toISOString()
          };
          
          return { track, link: virtualLink };
        }
        return null;
      }

      const link = linkData as ShareLink;

      let track: Track | undefined;
      let playlist: Playlist | undefined;

      if (link.track_id) {
        const { data: tr } = await supabase
          .from('tracks')
          .select('*')
          .eq('id', link.track_id)
          .single();
        if (tr) track = tr as Track;
      } else if (link.playlist_id) {
        const { data: pl } = await supabase
          .from('playlists')
          .select('*')
          .eq('id', link.playlist_id)
          .single();
        
        if (pl) {
           playlist = pl as Playlist;
           const { data: playlistTracks } = await supabase
             .from('tracks')
             .select('*')
             .in('id', playlist.track_ids);
           
           if (playlistTracks) {
              setTracks(prev => {
                const uniqueNew = playlistTracks.filter(nt => !prev.some(et => et.id === nt.id));
                return [...prev, ...uniqueNew];
              });
           }
        }
      }

      return { track, playlist, link };
    } catch (e) {
      console.error("getShareContent Failure:", e);
      return null;
    }
  };

  const addActivity = async (activity: Partial<Activity>) => {
    const newActivity: Activity = {
      id: uuidv4(),
      type: activity.type || 'system',
      user: activity.user || 'Unknown',
      action: activity.action || 'Performed action',
      timestamp: new Date().toISOString(),
      ...activity
    };
    setActivities(prev => [newActivity, ...prev].slice(0, 50));
    if (supabase) {
      const { error } = await supabase.from('activities').insert(newActivity);
      if (error) console.error(error);
    }
  };

  const incrementShareLinkAccess = async (id: string) => {
    let newCount = 0;
    setShareLinks(prev => {
      const link = prev.find(l => l.id === id);
      if (!link) return prev;
      newCount = (link.access_count || 0) + 1;
      return prev.map(l => l.id === id ? { ...l, access_count: newCount } : l);
    });
    
    if (supabase && newCount > 0) {
      const { error } = await supabase
        .from('share_links')
        .update({ access_count: newCount })
        .eq('id', id);
      if (error) console.error(error);
    }
  };

  const addPromoVideo = async (video: Partial<PromoVideo>) => {
    const newVideo: PromoVideo = {
      id: uuidv4(),
      video_url: video.video_url || '',
      thumbnail_url: video.thumbnail_url || '',
      style: video.style || 'minimalist',
      status: video.status || 'processing',
      created_at: new Date().toISOString(),
      ...video
    };
    setPromoVideos(prev => [...prev, newVideo]);
    if (supabase) {
      const dbVideo = { ...newVideo } as any;
      // Strip out non-serializable binary data before inserting into database table
      delete dbVideo.video_data;
      delete dbVideo.thumbnail_data;
      const { error } = await supabase.from('promo_videos').insert(dbVideo);
      if (error) {
        console.error("Error inserting promo video:", error);
        addToast(`Failed to register promo asset in database: ${error.message}`, 'error');
      } else {
        addToast("Promo video asset added to database!", 'success');
      }
    }
  };

  const deletePromoVideo = async (id: string) => {
    setPromoVideos(prev => prev.filter(v => v.id !== id));
    if (supabase) {
      const { error } = await supabase.from('promo_videos').delete().eq('id', id);
      if (error) {
        console.error(error);
        addToast(`Failed to purge promo video from database: ${error.message}`, 'error');
      } else {
        addToast("Promo video purged from database!", 'success');
      }
    }
  };

  const analyzeTrack = async (name: string): Promise<{ bpm: number, key: string, duration?: number, tags?: string[] }> => {
    const cleanName = name.replace(/\.[^/.]+$/, ""); // Remove extension
    const duration = 120 + (cleanName.length * 3) % 111;

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: name })
      });
      if (response.ok) {
        const data = await response.json();
        if (data && typeof data.bpm === 'number' && typeof data.key === 'string' && Array.isArray(data.tags)) {
          addToast("AI Analysis completed successfully via Gemini on the server!", 'success');
          
          // Build combined tags with vocal/instrumental indicator and SEO keywords
          const typeTag = data.instrumental ? "Instrumental" : "Vocal Track";
          const rawKeywords: string[] = Array.isArray(data.seo_keywords) ? data.seo_keywords : [];
          // clean keywords to be shorter tags
          const seoTags = rawKeywords.map(k => k.length > 20 ? k.substring(0, 18) + '...' : k);
          const combinedTags = [
            typeTag,
            ...data.tags,
            ...seoTags
          ].filter((v, i, a) => a.indexOf(v) === i); // deduplicate
          
          return {
            bpm: data.bpm,
            key: data.key,
            duration,
            tags: combinedTags
          };
        }
      }
    } catch (e: any) {
      console.warn("Could not reach server-side Gemini analyzer, performing offline heuristic fallback:", e.message);
    }

    const cleanLower = cleanName.toLowerCase();

    // 1. BPM Heuristic
    let bpm = 120;
    const bpmMatch = cleanLower.match(/(\d{2,3})\s*(?:bpm|BPM)/);
    if (bpmMatch) {
      bpm = parseInt(bpmMatch[1], 10);
    } else {
      const numbers = cleanLower.match(/\b\d{2,3}\b/g);
      if (numbers) {
        for (const numStr of numbers) {
          const num = parseInt(numStr, 10);
          if (num >= 60 && num <= 200) {
            bpm = num;
            break;
          }
        }
      }
    }

    // 2. Key Signature Heuristic
    let key = "C Major";
    const standardKeys = [
      "Am", "Bm", "Cm", "Dm", "Em", "Fm", "Gm",
      "A#m", "C#m", "D#m", "F#m", "G#m",
      "Abm", "Bbm", "Ebm",
      "A", "B", "C", "D", "E", "F", "G",
      "A#", "C#", "D#", "F#", "G#"
    ];
    const sortedKeys = [...standardKeys].sort((a, b) => b.length - a.length);
    const words = cleanName.split(/[\s_\-\[\]\(\)]+/);
    for (const word of words) {
      if (sortedKeys.includes(word)) {
        key = word;
        break;
      }
      const matchedKey = sortedKeys.find(k => k.toLowerCase() === word.toLowerCase());
      if (matchedKey) {
        key = matchedKey;
        break;
      }
    }

    // 4. Tags Heuristic
    const tags: string[] = [];
    const genreKeywords = [
      { keys: ["trap", "808"], tags: ["Trap", "Dark", "Heavy"] },
      { keys: ["drill", "grime", "uk"], tags: ["Drill", "Aggressive", "Gritty"] },
      { keys: ["lofi", "lo-fi", "chillhop", "study"], tags: ["Lofi", "Chill", "Relaxed"] },
      { keys: ["boombap", "boom bap", "90s", "eastcoast"], tags: ["BoomBap", "Classic", "Groovy"] },
      { keys: ["chill", "ambient", "cloud", "smooth"], tags: ["Chill", "Ambient", "Smooth"] },
      { keys: ["guitar", "acoustic", "guitarra"], tags: ["Acoustic", "Melodic", "Organic"] },
      { keys: ["piano", "keys", "emotional", "sad"], tags: ["Piano", "Emotional", "Soulful"] },
      { keys: ["synth", "retro", "wave", "cyber"], tags: ["Synth", "Futuristic", "Electronic"] },
      { keys: ["soul", "r&b", "rb", "motown"], tags: ["R&B", "Soulful", "Smooth"] },
      { keys: ["pop", "upbeat", "dance", "synthpop"], tags: ["Pop", "Upbeat", "Dance"] }
    ];

    for (const item of genreKeywords) {
      if (item.keys.some(k => cleanLower.includes(k))) {
        tags.push(...item.tags);
      }
    }

    const uniqueTags = Array.from(new Set(tags)).slice(0, 4);
    if (uniqueTags.length === 0) {
      uniqueTags.push("Instrumental", "OGBeatz", "Producer Mode");
    }

    return { bpm, key, duration, tags: uniqueTags };
  };

  const uploadFile = async (bucket: string, file: File): Promise<string | null> => {
    if (!supabase) {
      console.warn("Supabase not initialized for uploading.");
      return null;
    }
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload file
      let { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file);

      // If bucket doesn't exist, create it and retry once
      if (uploadError && (uploadError.message === 'Bucket not found' || (uploadError as any).status === 404)) {
        console.log(`Bucket '${bucket}' not found. Attempting auto-creation...`);
        const { error: bucketError } = await supabase.storage.createBucket(bucket, { public: true });
        if (!bucketError) {
          const { error: retryError } = await supabase.storage.from(bucket).upload(filePath, file);
          if (retryError) throw retryError;
        } else {
          console.error("Failed to auto-create bucket:", bucketError);
          throw uploadError;
        }
      } else if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
      return data?.publicUrl || null;
    } catch (e) {
      console.error(`Supabase file upload error in bucket '${bucket}':`, e);
      return null;
    }
  };

  return (
    <MediaStoreContext.Provider value={{
      tracks, playlists, clients, activities, profile, loading, loadingProgress, loadingStatusText, shareLinks, messages, promoVideos,
      addTrack, updateTrack, deleteTrack, addPlaylist, updatePlaylist, deletePlaylist, addTrackToPlaylist, removeTrackFromPlaylist,
      addClient, updateClient, deleteClient, updateProfile, addShareLink, getShareContent, addActivity, analyzeTrack, sendMessage, addPromoVideo, deletePromoVideo, incrementShareLinkAccess,
      uploadFile,
      toasts, addToast, removeToast, connected
    }}>
      {children}
    </MediaStoreContext.Provider>
  );
}

export function useMediaStore() {
  const context = useContext(MediaStoreContext);
  if (!context) throw new Error('useMediaStore must be used within MediaStoreProvider');
  return context;
}
