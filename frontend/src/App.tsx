import { SnapshotProvider } from './context/SnapshotContext';
import { Header } from './components/Header';

export function App() {
  return (
    <SnapshotProvider>
      <div className="flex flex-col h-screen bg-gray-900 text-white min-w-[1280px]">
        <Header />
        <div className="flex-1 flex items-center justify-center text-gray-600">
          Components loading…
        </div>
      </div>
    </SnapshotProvider>
  );
}
