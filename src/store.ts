import { create } from 'zustand';
import { GameState, Machine, Worker, Order, MaterialType, ProductionStage, MachineStatus } from './types';

const initialWorkers: Worker[] = [
  { id: 'w1', name: 'Иваныч (Токарь)', grade: 4, specialty: 'TURNER', assignedMachineId: null },
  { id: 'w2', name: 'Петрович (Слесарь)', grade: 2, specialty: 'FITTER', assignedMachineId: null },
  { id: 'w3', name: 'Света (Фрезеровщик)', grade: 3, specialty: 'MILLER', assignedMachineId: null },
];

const initialMachines: Machine[] = [
  { id: 'm1', name: 'Токарный станок', type: 'LATHE', status: 'IDLE', assignedWorkerId: null, currentStageId: null, progress: 0 },
  { id: 'm2', name: 'Фрезерный станок', type: 'MILLING', status: 'IDLE', assignedWorkerId: null, currentStageId: null, progress: 0 },
  { id: 'm3', name: 'Слесарный стол 1', type: 'FITTING', status: 'IDLE', assignedWorkerId: null, currentStageId: null, progress: 0 },
  { id: 'm4', name: 'Слесарный стол 2', type: 'FITTING', status: 'IDLE', assignedWorkerId: null, currentStageId: null, progress: 0 },
];

// Полный заказ из 3 изделий
const initialOrders: Order[] = [
  {
    id: 'o1',
    name: 'Смена №1: Комплект деталей',
    deadline: 180, // 3 минуты
    stages: [
      // Изделие 1: Токарная -> Слесарная
      { id: 's1', orderId: 'o1', name: 'Изд.1: Токарная', requiredMachineType: 'LATHE', requiredGrade: 3, duration: 15, requiredMaterials: { STEEL_BAR: 1 }, status: 'PENDING', dependsOn: [] },
      { id: 's2', orderId: 'o1', name: 'Изд.1: Слесарная', requiredMachineType: 'FITTING', requiredGrade: 1, duration: 10, requiredMaterials: {}, status: 'PENDING', dependsOn: ['s1'] },

      // Изделие 2: (Токарная -> Слесарная) + (Фрезерная -> Слесарная) -> Сборка
      { id: 's3', orderId: 'o1', name: 'Изд.2 (ПФ1): Токарная', requiredMachineType: 'LATHE', requiredGrade: 3, duration: 15, requiredMaterials: { STEEL_BAR: 1 }, status: 'PENDING', dependsOn: [] },
      { id: 's4', orderId: 'o1', name: 'Изд.2 (ПФ1): Слесарная', requiredMachineType: 'FITTING', requiredGrade: 2, duration: 10, requiredMaterials: {}, status: 'PENDING', dependsOn: ['s3'] },
      
      { id: 's5', orderId: 'o1', name: 'Изд.2 (ПФ2): Фрезерная', requiredMachineType: 'MILLING', requiredGrade: 3, duration: 20, requiredMaterials: { FLANGE: 1 }, status: 'PENDING', dependsOn: [] },
      { id: 's6', orderId: 'o1', name: 'Изд.2 (ПФ2): Слесарная', requiredMachineType: 'FITTING', requiredGrade: 2, duration: 10, requiredMaterials: {}, status: 'PENDING', dependsOn: ['s5'] },
      
      { id: 's7', orderId: 'o1', name: 'Изд.2: Финальная сборка', requiredMachineType: 'FITTING', requiredGrade: 3, duration: 15, requiredMaterials: { BOLT: 2 }, status: 'PENDING', dependsOn: ['s4', 's6'] },

      // Изделие 3: Одна токарная
      { id: 's8', orderId: 'o1', name: 'Изд.3: Токарная', requiredMachineType: 'LATHE', requiredGrade: 2, duration: 10, requiredMaterials: { STEEL_BAR: 1 }, status: 'PENDING', dependsOn: [] },
    ]
  }
];

// Функция расчета начального склада (База + 15%)
const calculateInitialInventory = (orders: Order[]): Record<MaterialType, number> => {
  const base: Record<MaterialType, number> = { STEEL_BAR: 0, FLANGE: 0, BOLT: 0 };
  orders.forEach(o => o.stages.forEach(s => {
    Object.entries(s.requiredMaterials).forEach(([mat, count]) => {
      base[mat as MaterialType] += count || 0;
    });
  }));
  
  return {
    STEEL_BAR: Math.ceil(base.STEEL_BAR * 1.15),
    FLANGE: Math.ceil(base.FLANGE * 1.15),
    BOLT: Math.ceil(base.BOLT * 1.15),
  };
};

interface GameActions {
  tick: () => void;
  assignWorkerToMachine: (workerId: string, machineId: string) => void;
  assignStageToMachine: (stageId: string, machineId: string) => boolean; // Возвращает успех
  addLog: (msg: string) => void;
}

export const useGameStore = create<GameState & GameActions>((set, get) => ({
  workers: initialWorkers,
  machines: initialMachines,
  orders: initialOrders,
  inventory: calculateInitialInventory(initialOrders),
  gameTime: 0,
  isRunning: true,
  log: ['Смена началась. Удачи!'],

  addLog: (msg) => set((s) => ({ log: [`[${s.gameTime}с] ${msg}`, ...s.log].slice(0, 20) })),

  tick: () => {
    const state = get();
    if (!state.isRunning) return;

    set((s) => ({ gameTime: s.gameTime + 1 }));
    
    // Обновляем станы
    const updatedMachines = state.machines.map(machine => {
      if (machine.status !== 'WORKING' || !machine.currentStageId || !machine.assignedWorkerId) return machine;

      const worker = state.workers.find(w => w.id === machine.assignedWorkerId);
      const stage = state.orders.flatMap(o => o.stages).find(s => s.id === machine.currentStageId);
      if (!worker || !stage) return machine;

      // Прогресс зависит от разряда рабочего (базово 10% + бонус за разряд)
      const progressIncrement = 10 + (worker.grade * 2); 
      let newProgress = machine.progress + progressIncrement;
      
      let newMachineStatus: MachineStatus = machine.status;
      let newCurrentStageId: string | null = machine.currentStageId;
      if (newProgress >= 100) {
        newProgress = 0;
        newMachineStatus = 'IDLE';
        newCurrentStageId = null;

        // Проверка на брак
        const gradeDiff = stage.requiredGrade - worker.grade;
        const defectChance = gradeDiff > 0 ? gradeDiff * 0.45 : 0;
        const isDefect = Math.random() < defectChance;

        if (isDefect) {
          const isFixable = Math.random() < 0.5;
          if (isFixable) {
            get().addLog(`⚠️ БРАК (Исправимый) на ${machine.name} (${stage.name}). Требуется доработка.`);
            // Создаем этап на доработку
            const reworkStage: ProductionStage = {
              ...stage,
              id: `rework_${Date.now()}`,
              name: `Доработка: ${stage.name}`,
              status: 'PENDING',
              dependsOn: [], // Доработку можно делать сразу
              requiredMaterials: {}, // Материалы не нужны
              isRework: true,
              duration: Math.floor(stage.duration / 2) // Доработка быстрее
            };
            // Добавляем этап в заказ
            set(s => ({
              orders: s.orders.map(o => o.id === stage.orderId ? { ...o, stages: [...o.stages, reworkStage] } : o)
            }));
          } else {
            get().addLog(`❌ БРАК (Неисправимый) на ${machine.name} (${stage.name}). Деталь в мусор, материал потерян.`);
            // Сбрасываем этап в PENDING, чтобы его можно было назначить снова (материал уже списан, но это штраф)
            set(s => ({
              orders: s.orders.map(o => ({
                ...o,
                stages: o.stages.map(st => st.id === stage.id ? { ...st, status: 'PENDING' } : st)
              }))
            }));
          }
        } else {
          get().addLog(`✅ Выполнено: ${stage.name} на ${machine.name}`);
          set(s => ({
            orders: s.orders.map(o => ({
              ...o,
              stages: o.stages.map(st => st.id === stage.id ? { ...st, status: 'DONE' } : st)
            }))
          }));
        }
      }

      return { ...machine, progress: newProgress, status: newMachineStatus, currentStageId: newCurrentStageId };
    });

    set({ machines: updatedMachines });
  },

  assignWorkerToMachine: (workerId, machineId) => {
    set((state) => {
      // Снимаем рабочего со старого места, если он там был
      const newWorkers = state.workers.map(w => {
        if (w.id === workerId) return { ...w, assignedMachineId: machineId };
        if (w.assignedMachineId === machineId) return { ...w, assignedMachineId: null }; // Если на это место сажаем другого
        return w;
      });
      
      // Снимаем старого рабочего с станка, если он там был
      const newMachines = state.machines.map(m => {
        if (m.id === machineId) return { ...m, assignedWorkerId: workerId };
        if (m.assignedWorkerId === workerId) return { ...m, assignedWorkerId: null };
        return m;
      });

      return { workers: newWorkers, machines: newMachines };
    });
  },

  assignStageToMachine: (stageId, machineId) => {
    const state = get();
    const machine = state.machines.find(m => m.id === machineId);
    const stage = state.orders.flatMap(o => o.stages).find(s => s.id === stageId);

    if (!machine || !stage) return false;

    // 1. Проверка: Станок свободен?
    if (machine.status !== 'IDLE') {
      get().addLog(`❌ ${machine.name} занят!`);
      return false;
    }

    // 2. Проверка: Этап еще не сделан и не в работе?
    if (stage.status !== 'PENDING') {
      get().addLog(`❌ Этап "${stage.name}" уже в работе или сделан.`);
      return false;
    }

    // 3. Проверка: Зависимости выполнены?
    const allStages = state.orders.flatMap(o => o.stages);
    const unmetDeps = stage.dependsOn.filter(depId => {
      const depStage = allStages.find(s => s.id === depId);
      return !depStage || depStage.status !== 'DONE';
    });
    if (unmetDeps.length > 0) {
      get().addLog(`❌ Для "${stage.name}" не выполнены предыдущие этапы.`);
      return false;
    }

    // 4. Проверка: Хватает ли материалов?
    const newInventory = { ...state.inventory };
    for (const [mat, count] of Object.entries(stage.requiredMaterials)) {
      const matKey = mat as MaterialType;
      if ((newInventory[matKey] || 0) < (count || 0)) {
        get().addLog(`❌ Не хватает материала ${matKey} для "${stage.name}".`);
        return false;
      }
      newInventory[matKey] -= count || 0;
    }

    // Если все проверки пройдены — назначаем
    set({
      inventory: newInventory,
      machines: state.machines.map(m => 
        m.id === machineId ? { ...m, status: 'WORKING', currentStageId: stageId, progress: 0 } : m
      ),
      orders: state.orders.map(o => ({
        ...o,
        stages: o.stages.map(s => s.id === stageId ? { ...s, status: 'IN_PROGRESS' } : s)
      }))
    });
    
    get().addLog(`🚀 Назначено: "${stage.name}" на ${machine.name}`);
    return true;
  },
}));