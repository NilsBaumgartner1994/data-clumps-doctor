import { Timer } from './Timer';

export interface ProjectInfo {
  project_url: string | null;
  project_name: string;
  timer: Timer;
}
