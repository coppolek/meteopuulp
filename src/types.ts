export interface City {
  id: string;
  name: string;
  country: string;
  lat: number;
  lon: number;
  imageUrl: string;
}

export interface WindyWebcam {
  webcamId: number;
  title: string;
  player?: {
    live?: string;
    day?: string;
  };
  location?: {
    city?: string;
    country?: string;
  };
  images?: {
    current?: {
      thumbnail?: string;
      preview?: string;
    }
  };
}

export interface WeatherData {
  main: {
    temp: number;
    feels_like: number;
    humidity: number;
    pressure: number;
  };
  weather: Array<{
    main: string;
    description: string;
    icon: string;
  }>;
  wind: {
    speed: number;
    deg: number;
  };
  name: string;
  timezone: number;
}

export interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  linkUrl?: string;
  htmlCode?: string;
  position: 'header' | 'under_player' | 'sidebar';
  active: boolean;
  type?: 'image' | 'text' | 'html';
  createdAt?: string;
}

export interface UserProfile {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  role: 'admin' | 'user';
  plan: 'free' | 'pro' | 'vip';
  status: 'active' | 'suspended' | 'canceled';
  updatedAt?: string;
}

export interface CustomWebcam {
  id: string;
  title: string;
  cityName: string;
  country?: string;
  lat?: number;
  lon?: number;
  streamUrl: string;
  thumbnailUrl?: string;
  provider?: string;
  active: boolean;
  createdAt?: string;
}

export interface AppSettings {
  announcementText?: string;
  announcementActive?: boolean;
  announcementType?: 'info' | 'warning' | 'success';
  requireLoginForCams?: boolean;
  windyApiKey?: string;
  openWeatherApiKey?: string;
  geminiApiKey?: string;
  openWebcamDbApiKey?: string;
  enableOpenWebcamDb?: boolean;
  enableWindy?: boolean;
  enablePublicDirectory?: boolean;
  adsTxtContent?: string;
}

