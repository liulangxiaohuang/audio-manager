export interface AudioFile {
  _id: string;
  name: string;
  filename: string;
  format: string;
  folder: string;
  path: string;
  url: string;
  duration: number;
  waveform: number[];
  tags: string[];
  isFavorite: boolean;
  favoriteFolders: string[];
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FolderItem {
  name: string;
  type: 'folder' | 'audio';
  path: string;
  items?: FolderItem[];
}

export interface FavoriteFolder {
  id: string;
  name: string;
  count: number;
}