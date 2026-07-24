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
