import MemeEditor from '@/components/MemeEditor';

export const runtime = 'edge';

export default function Home() {
  return (
    <div className="flex-1 w-full max-w-4xl flex flex-col items-center">
      <MemeEditor />
    </div>
  );
}
