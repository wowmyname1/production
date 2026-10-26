export type MaterialType = 'STEEL_BAR' | 'FLANGE' | 'BOLT';
export type MachineType = 'LATHE' | 'MILLING' | 'FITTING';
export type WorkerSpecialty = 'TURNER' | 'MILLER' | 'FITTER';

export type StageStatus = 'PENDING' | 'IN_PROGRESS' | 'DONE' | 'REWORK';
export type MachineStatus = 'IDLE' | 'WORKING';

export interface Worker {
  id: string;
  name: string;
  grade: number; 
  specialty: WorkerSpecialty;
  assignedMachineId: string | null;
}

export interface Machine {
  id: string;
  name: string;
  type: MachineType;
  status: MachineStatus;
  assignedWorkerId: string | null;
  currentStageId: string | null;
  progress: number; 
}

export interface ProductionStage {
  id: string;
  orderId: string;
  name: string;
  requiredMachineType: MachineType;
  requiredGrade: number;
  duration: number; 
  requiredMaterials: Partial<Record<MaterialType, number>>;
  status: StageStatus;
  dependsOn: string[]; 
  isRework?: boolean; // Флаг для исправимого брака
}

export interface Order {
  id: string;
  name: string;
  deadline: number; 
  stages: ProductionStage[];
}

export interface GameState {
  workers: Worker[];
  machines: Machine[];
  orders: Order[];
  inventory: Record<MaterialType, number>;
  gameTime: number; 
  isRunning: boolean;
  log: string[]; // Лог событий для дебага и атмосферы
}