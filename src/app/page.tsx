import { Suspense } from 'react';
import MemeEditor from '@/components/MemeEditor';

export default function Home() {
  return (
    <div className="flex-1 w-full max-w-4xl flex flex-col items-center">
      <Suspense fallback={<div>Loading editor...</div>}>
        <MemeEditor />
      </Suspense>
    </div>
  );
}
