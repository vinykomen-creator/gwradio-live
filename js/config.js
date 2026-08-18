'use strict';

const STATION_ID    = 's0cc043163';
const RADIOCO_API   = `https://public.radio.co/api/v2/${STATION_ID}`;
const RADIOCO_TRACK = `${RADIOCO_API}/track/current`;
const RADIOCO_STATUS = `https://public.radio.co/stations/${STATION_ID}/status`;
const STREAM_URL    = 'https://s5.radio.co/s0cc043163/listen';
const API_BASE      = 'https://gwradio-live.onrender.com/api';

const GWR = {
  audio: null,
  isPlaying: false,
  miniVisible: false,
  isLive: true,
  pauseAutoHideTimer: null,
  nowPlaying: {
    title:   'Global Worship Radio',
    artist:  'Global Street Team',
    artwork: null,
  },
  history: [],
  nowPlayingInterval: null,
};

let EVENTS_CACHE = [];
let EVENTS_LOADED = false;

// Canonical list of SPA page ids — drives nav rendering, titles, and routing.
const GWR_PAGES = ['home', 'prayers', 'events', 'giveaways', 'resources', 'contact'];

const SUPABASE_URL      = 'https://dieunopidtcxjsvjxpbs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpZXVub3BpZHRjeGpzdmp4cGJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1MjYxMzgsImV4cCI6MjA5NTEwMjEzOH0.LatWVvrUraIYeI8tAa9fMgiW12SIKO74KRrhx5GdBW0';

const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyCgRk52ZZLudWNlCkq52fWAnyFSVy36lOU',
  authDomain: 'global-worship-radio.firebaseapp.com',
  projectId: 'global-worship-radio',
  storageBucket: 'global-worship-radio.firebasestorage.app',
  messagingSenderId: '761701244864',
  appId: '1:761701244864:web:b8decb589f2054f2847225',
};

let supabaseClient = null;
try {
  supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} catch (err) {
  console.error('Supabase client init failed — check SUPABASE_URL / SUPABASE_ANON_KEY in config.js:', err.message);
}