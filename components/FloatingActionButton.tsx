import Link from "next/link";

export default function FloatingActionButton() {
  return (
    <Link href="/forms/create">
      <button
        aria-label="Create new form"
        className="fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl w-16 h-16 flex items-center justify-center transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300"
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </Link>
  );
}