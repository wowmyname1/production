import { useEffect } from 'react';
import { useGameStore } from './store';

function App() {
  const { workers, machines, orders, inventory, gameTime, log, tick, assignWorkerToMachine, assignStageToMachine } = useGameStore();

  useEffect(() => {
    const interval = setInterval(() => tick(), 1000);
    return () => clearInterval(interval);
  }, [tick]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 font-mono text-sm">
      <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
        <h1 className="text-xl font-bold text-green-400">Цех: Смена №1</h1>
        <div className="text-yellow-400">Время: {gameTime}с | Дедлайн: {orders[0].deadline - gameTime}с</div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        
        {/* ЛЕВАЯ КОЛОНКА: Заказы и Этапы */}
        <div className="col-span-4 bg-gray-800 p-3 rounded">
          <h2 className="text-lg mb-2 text-blue-400">Заказ: {orders[0].name}</h2>
          <div className="space-y-2">
            {orders[0].stages.map(stage => (
              <div key={stage.id} className={`p-2 rounded border ${
                stage.status === 'DONE' ? 'bg-green-900/30 border-green-700' : 
                stage.status === 'IN_PROGRESS' ? 'bg-yellow-900/30 border-yellow-700' : 
                'bg-gray-700 border-gray-600'
              }`}>
                <div className="flex justify-between">
                  <span className="font-bold">{stage.name}</span>
                  <span className="text-xs text-gray-400">[Р: {stage.requiredGrade}]</span>
                </div>
                <div className="text-xs text-gray-400 mb-1">
                  Статус: {stage.status} | Нужно: {JSON.stringify(stage.requiredMaterials)}
                </div>
                {/* Кнопки для назначения на станки (ВРЕМЕННО, пока нет DnD) */}
                {stage.status === 'PENDING' && (
                  <div className="flex gap-1 mt-1">
                    {machines.filter(m => m.type === stage.requiredMachineType).map(m => (
                      <button 
                        key={m.id}
                        onClick={() => assignStageToMachine(stage.id, m.id)}
                        className="px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs"
                      >
                        На {m.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ЦЕНТРАЛЬНАЯ КОЛОНКА: Станки и Рабочие */}
        <div className="col-span-5 space-y-4">
          <div className="bg-gray-800 p-3 rounded">
            <h2 className="text-lg mb-2 text-purple-400">Участок</h2>
            <div className="grid grid-cols-2 gap-2">
              {machines.map(machine => {
                const worker = workers.find(w => w.id === machine.assignedWorkerId);
                const stage = orders.flatMap(o => o.stages).find(s => s.id === machine.currentStageId);
                
                return (
                  <div key={machine.id} className="p-2 bg-gray-700 rounded border border-gray-600">
                    <div className="font-bold text-sm">{machine.name}</div>
                    <div className="text-xs text-gray-400">
                      {worker ? `👷 ${worker.name} (Р:${worker.grade})` : '⚠️ Нет рабочего'}
                    </div>
                    {stage && (
                      <div className="mt-1">
                        <div className="text-xs text-blue-300 truncate">{stage.name}</div>
                        <div className="w-full bg-gray-600 rounded-full h-2 mt-1">
                          <div className="bg-green-500 h-2 rounded-full" style={{ width: `${machine.progress}%` }}></div>
                        </div>
                      </div>
                    )}
                    
                    {/* Кнопки назначения рабочих */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {workers.map(w => (
                        <button 
                          key={w.id}
                          onClick={() => assignWorkerToMachine(w.id, machine.id)}
                          className={`px-1 py-0.5 rounded text-xs ${worker?.id === w.id ? 'bg-green-600' : 'bg-gray-600 hover:bg-gray-500'}`}
                        >
                          {w.name.split(' ')[0]}
                        </button>
                      ))}
                    </div>
                  </div>
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

        {/* ПРАВАЯ КОЛОНКА: Лог событий */}
        <div className="col-span-3 bg-gray-800 p-3 rounded">
          <h2 className="text-lg mb-2 text-red-400">Журнал цеха</h2>
          <div className="space-y-1 text-xs h-[500px] overflow-y-auto">
            {log.map((msg, i) => (
              <div key={i} className={`p-1 rounded ${msg.includes('❌') ? 'text-red-400' : msg.includes('✅') ? 'text-green-400' : 'text-gray-300'}`}>
                {msg}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;