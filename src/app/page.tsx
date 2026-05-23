import MemeEditor from '@/components/MemeEditor';

export const runtime = 'edge';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-4 md:p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
        <h1 className="text-4xl font-bold text-center w-full mb-8">Memegern</h1>
      </div>
      
      <div className="flex-1 w-full max-w-4xl flex flex-col items-center">
        <MemeEditor />
      </div>
    </main>
  );
}
