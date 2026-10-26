import { useEffect } from 'react';
import { useGameStore } from './store';
import { DndContext, DragEndEvent, useDraggable, useDroppable } from '@dnd-kit/core';
import { Worker, Machine, ProductionStage } from './types';

// Компонент для перетаскиваемого Рабочего
function DraggableWorker({ worker }: { worker: Worker }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `worker-${worker.id}`,
    data: { type: 'worker', workerId: worker.id }
  });

  const style = transform ? {
    transform: `translate(${transform.x}px, ${transform.y}px)`,
  } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`p-2 bg-blue-700 rounded cursor-grab active:cursor-grabbing border border-blue-500 ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="font-bold text-sm">{worker.name}</div>
      <div className="text-xs text-blue-200">Р: {worker.grade} | {worker.specialty}</div>
    </div>
  );
}

// Компонент для перетаскиваемого Этапа заказа
function DraggableStage({ stage }: { stage: ProductionStage }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `stage-${stage.id}`,
    data: { type: 'stage', stageId: stage.id }
  });

  const style = transform ? {
    transform: `translate(${transform.x}px, ${transform.y}px)`,
  } : undefined;

  const statusColors = {
    PENDING: 'bg-gray-700 border-gray-600',
    IN_PROGRESS: 'bg-yellow-900/50 border-yellow-700',
    DONE: 'bg-green-900/50 border-green-700',
    REWORK: 'bg-red-900/50 border-red-700'
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`p-2 rounded cursor-grab active:cursor-grabbing border ${statusColors[stage.status]} ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="flex justify-between items-start">
        <span className="font-bold text-sm">{stage.name}</span>
        <span className="text-xs text-gray-400">Р:{stage.requiredGrade}</span>
      </div>
      <div className="text-xs text-gray-400 mt-1">
        {stage.status === 'PENDING' ? 'Готов к работе' : stage.status}
      </div>
    </div>
  );
}

// Компонент для Станка (принимает дроп)
function DroppableMachine({ machine, workers, currentStage }: { 
  machine: Machine; 
  workers: Worker[];
  currentStage: ProductionStage | null;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `machine-${machine.id}`,
  });

  const assignedWorker = workers.find(w => w.id === machine.assignedWorkerId);

  return (
    <div
      ref={setNodeRef}
      className={`p-3 rounded border-2 transition-colors ${
        isOver ? 'border-green-500 bg-green-900/20' : 'border-gray-600 bg-gray-700'
      }`}
    >
      <div className="font-bold text-sm mb-2">{machine.name}</div>
      
      {/* Слот для рабочего */}
      <div className="mb-2 p-2 bg-gray-800 rounded min-h-[50px]">
        {assignedWorker ? (
          <div className="text-xs">
            <div className="font-bold text-blue-300">👷 {assignedWorker.name}</div>
            <div className="text-gray-400">Р: {assignedWorker.grade}</div>
          </div>
        ) : (
          <div className="text-xs text-gray-500 italic">Перетащи рабочего сюда</div>
        )}
      </div>

      {/* Слот для задачи */}
      <div className="p-2 bg-gray-800 rounded min-h-[60px]">
        {currentStage ? (
          <div>
            <div className="text-xs font-bold text-yellow-300">{currentStage.name}</div>
            <div className="w-full bg-gray-600 rounded-full h-2 mt-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all" 
                style={{ width: `${machine.progress}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-400 mt-1">{machine.progress}%</div>
          </div>
        ) : (
          <div className="text-xs text-gray-500 italic">Перетащи этап заказа сюда</div>
        )}
      </div>
    </div>
  );
}

function App() {
  const { 
    workers, machines, orders, inventory, gameTime, log, 
    tick, assignWorkerToMachine, assignStageToMachine 
  } = useGameStore();

  useEffect(() => {
    const interval = setInterval(() => tick(), 1000);
    return () => clearInterval(interval);
  }, [tick]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;

    const draggedData = active.data.current;
    const overId = over.id as string;

    // Проверяем, что дропнули на станок
    if (!overId.startsWith('machine-')) return;
    
    const machineId = overId.replace('machine-', '');

    // Если перетащили Рабочего
    if (draggedData?.type === 'worker') {
      const workerId = draggedData.workerId;
      assignWorkerToMachine(workerId, machineId);
    }
    
    // Если перетащили Этап заказа
    else if (draggedData?.type === 'stage') {
      const stageId = draggedData.stageId;
      assignStageToMachine(stageId, machineId);
    }
  };

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="min-h-screen bg-gray-900 text-gray-100 p-4 font-mono text-sm">
        <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
          <h1 className="text-xl font-bold text-green-400">Цех: Смена №1</h1>
          <div className="text-yellow-400">
            Время: {gameTime}с | Дедлайн: {orders[0].deadline - gameTime}с
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4">
          
          {/* ЛЕВАЯ КОЛОНКА: Заказы и Этапы */}
          <div className="col-span-4 bg-gray-800 p-3 rounded">
            <h2 className="text-lg mb-2 text-blue-400">Заказ: {orders[0].name}</h2>
            <div className="space-y-2">
              {orders[0].stages.map(stage => (
                <DraggableStage key={stage.id} stage={stage} />
              ))}
            </div>
          </div>

          {/* ЦЕНТРАЛЬНАЯ КОЛОНКА: Станки */}
          <div className="col-span-5 space-y-4">
            <div className="bg-gray-800 p-3 rounded">
              <h2 className="text-lg mb-2 text-purple-400">Участок</h2>
              <div className="grid grid-cols-2 gap-3">
                {machines.map(machine => {
                  const currentStage = orders
                    .flatMap(o => o.stages)
                    .find(s => s.id === machine.currentStageId);
                  
                  return (
                    <DroppableMachine
                      key={machine.id}
                      machine={machine}
                      workers={workers}
                      currentStage={currentStage || null}
                    />
                  );
                })}
              </div>
            </div>

            {/* СКЛАД */}
            <div className="bg-gray-800 p-3 rounded">
              <h2 className="text-lg mb-2 text-orange-400">Склад</h2>
              <div className="flex gap-4">
                {Object.entries(inventory).map(([type, count]) => (
                  <div key={type} className="bg-gray-700 px-3 py-1 rounded">
                    <span className="text-gray-400 text-xs">{type}</span>
                    <span className="font-bold ml-2">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ПРАВАЯ КОЛОНКА: Рабочие и Лог */}
          <div className="col-span-3 space-y-4">
            <div className="bg-gray-800 p-3 rounded">
              <h2 className="text-lg mb-2 text-cyan-400">Бригада</h2>
              <div className="space-y-2">
                {workers.map(worker => (
                  <DraggableWorker key={worker.id} worker={worker} />
                ))}
              </div>
            </div>

            <div className="bg-gray-800 p-3 rounded">
              <h2 className="text-lg mb-2 text-red-400">Журнал цеха</h2>
              <div className="space-y-1 text-xs h-[400px] overflow-y-auto">
                {log.map((msg, i) => (
                  <div 
                    key={i} 
                    className={`p-1 rounded ${
                      msg.includes('❌') ? 'text-red-400' : 
                      msg.includes('✅') ? 'text-green-400' : 
                      'text-gray-300'
                    }`}
                  >
                    {msg}
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </DndContext>
  );
}

export default App;