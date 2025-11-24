import data from './game-data.json';

export type Location = {
  id: string;
  name: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  imageId: string;
};

export const locations: Location[] = data.locations;
